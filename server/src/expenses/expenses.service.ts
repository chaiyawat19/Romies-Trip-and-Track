import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EXPENSE_CATEGORIES } from './data/expense-categories.data';
import { CreateEqualExpenseDto } from './dto/create-equal-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * ดึงประเภทค่าใช้จ่ายทั้งหมด 11 ประเภท (พร้อมชื่อไทยและไอคอน)
   */
  getCategories() {
    return EXPENSE_CATEGORIES;
  }

  /**
   * ตรวจสอบว่าทริปมีอยู่จริง และตรวจสอบว่าผู้ใช้เป็นสมาชิกในทริปหรือไม่
   */
  private async ensureTripAndMembership(tripId: string, userId?: string) {
    if (!ExpensesService.UUID_REGEX.test(tripId)) {
      throw new NotFoundException(`ไม่พบข้อมูลทริป ID: ${tripId}`);
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException(`ไม่พบข้อมูลทริป ID: ${tripId}`);
    }

    if (userId) {
      const isMember = trip.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('คุณไม่ได้เป็นสมาชิกในทริปนี้ กรุณาเข้าร่วมทริปก่อนทำรายการค่าใช้จ่าย');
      }
    }

    return trip;
  }

  /**
   * 1. หารเท่ากันทุกคน (Equal Split)
   * รวมยอดบิลทั้งหมดแล้วหารด้วยจำนวนคนทั้งหมดที่มากินด้วยกัน
   */
  async createEqualSplit(tripId: string, currentUserId: string, dto: CreateEqualExpenseDto) {
    const trip = await this.ensureTripAndMembership(tripId, currentUserId);

    const paidById = dto.paidById || currentUserId;
    const isPayerMember = trip.members.some((m) => m.userId === paidById);
    if (!isPayerMember) {
      throw new BadRequestException('ผู้จ่ายเงิน (paidById) ต้องเป็นสมาชิกในทริปนี้');
    }

    // กำหนดรายชื่อผู้ร่วมหารบิลนี้
    let participantIds: string[] = [];
    if (dto.participantIds && dto.participantIds.length > 0) {
      const tripMemberIds = new Set(trip.members.map((m) => m.userId));
      for (const id of dto.participantIds) {
        if (!tripMemberIds.has(id)) {
          throw new BadRequestException(`ผู้ใช้ ID: ${id} ไม่ได้เป็นสมาชิกในทริปนี้`);
        }
      }
      participantIds = Array.from(new Set(dto.participantIds));
    } else {
      // หากไม่ระบุ ให้หารเท่ากันทุกคนในทริป
      participantIds = trip.members.map((m) => m.userId);
    }

    if (participantIds.length === 0) {
      throw new BadRequestException('ต้องมีผู้ร่วมหารบิลอย่างน้อย 1 คน');
    }

    const total = Number(dto.totalAmount);
    const count = participantIds.length;

    // คำนวณยอดเงินเฉลี่ยต่อคน พร้อมจัดการเศษสตางค์ให้ผลรวมตรงกับ total 100%
    const perPersonBase = Math.floor((total / count) * 100) / 100;
    const totalBase = perPersonBase * count;
    const remainderCents = Math.round((total - totalBase) * 100);

    const result = await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          tripId,
          paidById,
          title: dto.title,
          totalAmount: new Prisma.Decimal(total),
          subtotalAmount: new Prisma.Decimal(total),
          category: dto.category || 'FOOD',
          splitType: 'EQUAL',
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
          receiptUrl: dto.receiptUrl || null,
          notes: dto.notes || null,
          splits: {
            create: participantIds.map((userId, index) => {
              const extraCent = index < remainderCents ? 0.01 : 0;
              const personAmount = Number((perPersonBase + extraCent).toFixed(2));
              return {
                userId,
                amount: new Prisma.Decimal(personAmount),
                isSettled: false,
              };
            }),
          },
        },
        include: {
          paidBy: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          splits: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      return expense;
    });

    const perPersonEstimated = Number((total / count).toFixed(2));

    return {
      message: 'บันทึกค่าใช้จ่ายแบบหารเท่ากัน (Equal Split) สำเร็จ',
      splitSummary: {
        splitType: 'EQUAL',
        totalAmount: total,
        participantCount: count,
        perPersonApprox: perPersonEstimated,
      },
      expense: result,
    };
  }

  /**
   * ดึงรายการค่าใช้จ่ายทั้งหมดในทริป
   */
  async findAll(tripId: string) {
    await this.ensureTripAndMembership(tripId);

    const expenses = await this.prisma.expense.findMany({
      where: { tripId },
      orderBy: { expenseDate: 'desc' },
      include: {
        paidBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        items: true,
      },
    });

    const totalSum = expenses.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

    return {
      tripId,
      totalExpensesCount: expenses.length,
      totalExpensesAmount: totalSum,
      expenses,
    };
  }

  /**
   * ดึงรายละเอียดค่าใช้จ่ายเดี่ยว
   */
  async findOne(tripId: string, id: string) {
    await this.ensureTripAndMembership(tripId);

    const expense = await this.prisma.expense.findFirst({
      where: { id, tripId },
      include: {
        paidBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        items: true,
      },
    });

    if (!expense) {
      throw new NotFoundException(`ไม่พบรายการค่าใช้จ่าย ID: ${id}`);
    }

    return expense;
  }
}
