import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EXPENSE_CATEGORIES } from './data/expense-categories.data';
import { CreateEqualExpenseDto } from './dto/create-equal-expense.dto';
import { CreateItemizedExpenseDto } from './dto/create-itemized-expense.dto';
import { CreateHybridExpenseDto } from './dto/create-hybrid-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

export interface TransferSuggestion {
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string | null;
  toUserId: string;
  toUserName: string;
  toUserAvatar: string | null;
  amount: number;
}

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
          splitType: dto.splitType || 'EQUAL',
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
   * 2. จ่ายตามที่กินจริง (Itemized / Individual Split)
   * แต่ละคนสั่งอะไร กินอะไร ก็จ่ายตามนั้น พร้อมเฉลี่ย VAT และ Service Charge ตามสัดส่วน
   */
  async createItemizedSplit(tripId: string, currentUserId: string, dto: CreateItemizedExpenseDto) {
    const trip = await this.ensureTripAndMembership(tripId, currentUserId);

    const paidById = dto.paidById || currentUserId;
    const tripMemberMap = new Map(trip.members.map((m) => [m.userId, m.user]));
    if (!tripMemberMap.has(paidById)) {
      throw new BadRequestException('ผู้จ่ายเงิน (paidById) ต้องเป็นสมาชิกในทริปนี้');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('ต้องระบุรายการอาหาร/สิ่งของอย่างน้อย 1 รายการ');
    }

    // ตรวจสอบ assignedUserIds ของทุก item ว่าเป็นสมาชิกในทริปหรือไม่
    for (const item of dto.items) {
      if (!item.assignedUserIds || item.assignedUserIds.length === 0) {
        throw new BadRequestException(`รายการ "${item.name}" ต้องระบุผู้รับผิดชอบอย่างน้อย 1 คน`);
      }
      for (const uid of item.assignedUserIds) {
        if (!tripMemberMap.has(uid)) {
          throw new BadRequestException(
            `ผู้ใช้ ID: ${uid} ในรายการ "${item.name}" ไม่ได้เป็นสมาชิกในทริปนี้`,
          );
        }
      }
    }

    // 1. คำนวณ Subtotal รวม
    const itemsCalculated = dto.items.map((item, index) => {
      const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
      const price = Number(item.price);
      const itemSubtotal = Number((price * quantity).toFixed(2));
      return {
        ...item,
        quantity,
        price,
        itemSubtotal,
        order: index,
        isShared: item.assignedUserIds.length > 1,
      };
    });

    const subtotalAmount = Number(
      itemsCalculated.reduce((sum, it) => sum + it.itemSubtotal, 0).toFixed(2),
    );

    if (subtotalAmount <= 0) {
      throw new BadRequestException('ยอดรวมราคาสินค้าต้องมากกว่า 0');
    }

    // 2. คำนวณส่วนลด, Service Charge, และ VAT
    const discountAmount = dto.discountAmount
      ? Math.min(subtotalAmount, Number(dto.discountAmount))
      : 0;
    const discountedSubtotal = Math.max(0, subtotalAmount - discountAmount);

    const serviceChargePercentage = dto.serviceChargePercentage
      ? Number(dto.serviceChargePercentage)
      : 0;
    const serviceChargeAmount = Number(
      ((discountedSubtotal * serviceChargePercentage) / 100).toFixed(2),
    );

    const vatPercentage = dto.vatPercentage ? Number(dto.vatPercentage) : 0;
    const vatBase = discountedSubtotal + serviceChargeAmount;
    const vatAmount = Number(((vatBase * vatPercentage) / 100).toFixed(2));

    const totalAmount = Number((vatBase + vatAmount).toFixed(2));

    // 3. Prorate Factor: ตัวคูณสำหรับกระจายส่วนลด + Service Charge + VAT ไปยังแต่ละรายการ
    const prorateFactor = subtotalAmount > 0 ? totalAmount / subtotalAmount : 1;

    // เตรียม split entries สำหรับแต่ละ item
    interface SplitTarget {
      itemIndex: number;
      userId: string;
      rawPortion: number;
      exactAmount: number;
      floorAmount: number;
      remainder: number;
      finalAmount: number;
    }

    const splitTargets: SplitTarget[] = [];

    itemsCalculated.forEach((it, idx) => {
      const numUsers = it.assignedUserIds.length;
      const rawPortion = it.itemSubtotal / numUsers;
      const exactAmount = (it.itemSubtotal * prorateFactor) / numUsers;
      const floorAmount = Math.floor(exactAmount * 100) / 100;
      const remainder = exactAmount - floorAmount;

      for (const uid of it.assignedUserIds) {
        splitTargets.push({
          itemIndex: idx,
          userId: uid,
          rawPortion,
          exactAmount,
          floorAmount,
          remainder,
          finalAmount: floorAmount,
        });
      }
    });

    // แจกจ่ายเศษสตางค์ (Remaining Cents) ด้วย Largest Remainder Method
    const currentSum = splitTargets.reduce((sum, s) => sum + s.floorAmount, 0);
    let centsToDistribute = Math.round((totalAmount - currentSum) * 100);

    const sortedIndices = splitTargets
      .map((item, index) => ({ index, remainder: item.remainder }))
      .sort((a, b) => b.remainder - a.remainder);

    let distIdx = 0;
    while (centsToDistribute > 0 && distIdx < sortedIndices.length) {
      const targetIdx = sortedIndices[distIdx].index;
      splitTargets[targetIdx].finalAmount = Number(
        (splitTargets[targetIdx].finalAmount + 0.01).toFixed(2),
      );
      centsToDistribute--;
      distIdx++;
    }

    // 4. บันทึกลง Database ด้วย Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          tripId,
          paidById,
          title: dto.title,
          totalAmount: new Prisma.Decimal(totalAmount),
          subtotalAmount: new Prisma.Decimal(subtotalAmount),
          discountAmount: new Prisma.Decimal(discountAmount),
          serviceChargePercentage: new Prisma.Decimal(serviceChargePercentage),
          serviceChargeAmount: new Prisma.Decimal(serviceChargeAmount),
          vatPercentage: new Prisma.Decimal(vatPercentage),
          vatAmount: new Prisma.Decimal(vatAmount),
          category: dto.category || 'FOOD',
          splitType: 'ITEMIZED',
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
          receiptUrl: dto.receiptUrl || null,
          notes: dto.notes || null,
        },
      });

      // บันทึกแต่ละ item
      for (let idx = 0; idx < itemsCalculated.length; idx++) {
        const it = itemsCalculated[idx];
        const createdItem = await tx.expenseItem.create({
          data: {
            expenseId: expense.id,
            name: it.name,
            price: new Prisma.Decimal(it.price),
            quantity: it.quantity,
            amount: new Prisma.Decimal(it.itemSubtotal),
            isShared: it.isShared,
            order: it.order,
          },
        });

        // สร้าง splits ที่ผูกกับ itemId นี้
        const itemSplits = splitTargets.filter((s) => s.itemIndex === idx);
        for (const s of itemSplits) {
          await tx.expenseSplit.create({
            data: {
              expenseId: expense.id,
              itemId: createdItem.id,
              userId: s.userId,
              amount: new Prisma.Decimal(s.finalAmount),
              isSettled: false,
            },
          });
        }
      }

      // ดึงข้อมูลสมบูรณ์กลับมาแสดง
      return tx.expense.findUnique({
        where: { id: expense.id },
        include: {
          paidBy: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          items: {
            orderBy: { order: 'asc' },
            include: {
              splits: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
          splits: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
    });

    // สร้าง User Breakdown Summary เพื่อให้ Client / Mobile อ่านง่าย
    const userSummaryMap = new Map<
      string,
      {
        userId: string;
        name: string;
        avatarUrl: string | null;
        rawSubtotal: number;
        finalTotal: number;
        items: Array<{ itemName: string; rawPrice: number; portionPrice: number; finalAmount: number }>;
      }
    >();

    for (const target of splitTargets) {
      const it = itemsCalculated[target.itemIndex];
      const user = tripMemberMap.get(target.userId)!;

      if (!userSummaryMap.has(target.userId)) {
        userSummaryMap.set(target.userId, {
          userId: target.userId,
          name: user.name || user.email || 'สมาชิกในทริป',
          avatarUrl: user.avatarUrl,
          rawSubtotal: 0,
          finalTotal: 0,
          items: [],
        });
      }

      const entry = userSummaryMap.get(target.userId)!;
      entry.rawSubtotal = Number((entry.rawSubtotal + target.rawPortion).toFixed(2));
      entry.finalTotal = Number((entry.finalTotal + target.finalAmount).toFixed(2));
      entry.items.push({
        itemName: it.name,
        rawPrice: it.itemSubtotal,
        portionPrice: Number(target.rawPortion.toFixed(2)),
        finalAmount: target.finalAmount,
      });
    }

    return {
      message: 'บันทึกค่าใช้จ่ายแบบจ่ายตามที่กินจริง (Itemized Split) สำเร็จ',
      splitSummary: {
        splitType: 'ITEMIZED',
        itemCount: itemsCalculated.length,
        subtotalAmount,
        discountAmount,
        serviceChargePercentage,
        serviceChargeAmount,
        vatPercentage,
        vatAmount,
        totalAmount,
        userBreakdown: Array.from(userSummaryMap.values()),
      },
      expense: result,
    };
  }

  /**
   * 3. หารส่วนกลาง + แยกจ่ายส่วนตัว (Hybrid / Shared Dishes)
   * แยกจานหลักส่วนตัวของแต่ละคน และกับข้าวตรงกลางหารเท่ากันเฉพาะคนที่ร่วมทาน
   * พร้อมเฉลี่ยส่วนลด, Service Charge และ VAT ตามสัดส่วน
   */
  async createHybridSplit(tripId: string, currentUserId: string, dto: CreateHybridExpenseDto) {
    const trip = await this.ensureTripAndMembership(tripId, currentUserId);

    const paidById = dto.paidById || currentUserId;
    const tripMemberMap = new Map(trip.members.map((m) => [m.userId, m.user]));
    if (!tripMemberMap.has(paidById)) {
      throw new BadRequestException('ผู้จ่ายเงิน (paidById) ต้องเป็นสมาชิกในทริปนี้');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('ต้องระบุรายการอาหาร/สิ่งของอย่างน้อย 1 รายการ');
    }

    // กำหนดรายชื่อผู้ร่วมแชร์กับข้าวตรงกลางเริ่มต้น (Default: ทุกคนในทริป)
    let defaultSharedUserIds = trip.members.map((m) => m.userId);
    if (dto.sharedParticipantIds && dto.sharedParticipantIds.length > 0) {
      for (const uid of dto.sharedParticipantIds) {
        if (!tripMemberMap.has(uid)) {
          throw new BadRequestException(
            `ผู้ใช้ ID: ${uid} ใน sharedParticipantIds ไม่ได้เป็นสมาชิกในทริปนี้`,
          );
        }
      }
      defaultSharedUserIds = dto.sharedParticipantIds;
    }

    // ประมวลผลและตรวจสอบแต่ละ item
    const itemsProcessed = dto.items.map((item, index) => {
      const isShared = Boolean(item.isShared);
      let assignedUserIds: string[] = [];

      if (isShared) {
        // กับข้าวตรงกลาง: หากระบุคนให้หารตามนั้น หากไม่ระบุให้ดึงผู้ร่วมแชร์ส่วนกลางทั้งหมด
        if (item.assignedUserIds && item.assignedUserIds.length > 0) {
          for (const uid of item.assignedUserIds) {
            if (!tripMemberMap.has(uid)) {
              throw new BadRequestException(
                `ผู้ใช้ ID: ${uid} ในรายการ "${item.name}" ไม่ได้เป็นสมาชิกในทริปนี้`,
              );
            }
          }
          assignedUserIds = item.assignedUserIds;
        } else {
          assignedUserIds = defaultSharedUserIds;
        }
      } else {
        // จานหลักส่วนตัว: ต้องระบุผู้ทานอย่างน้อย 1 คน
        if (!item.assignedUserIds || item.assignedUserIds.length === 0) {
          throw new BadRequestException(
            `รายการ "${item.name}" เป็นจานหลักส่วนตัว กรุณาระบุผู้รับผิดชอบอย่างน้อย 1 คน`,
          );
        }
        for (const uid of item.assignedUserIds) {
          if (!tripMemberMap.has(uid)) {
            throw new BadRequestException(
              `ผู้ใช้ ID: ${uid} ในรายการ "${item.name}" ไม่ได้เป็นสมาชิกในทริปนี้`,
            );
          }
        }
        assignedUserIds = item.assignedUserIds;
      }

      const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
      const price = Number(item.price);
      const itemSubtotal = Number((price * quantity).toFixed(2));

      return {
        ...item,
        quantity,
        price,
        itemSubtotal,
        isShared,
        assignedUserIds,
        order: index,
      };
    });

    // 1. คำนวณ Subtotals
    const sharedSubtotal = Number(
      itemsProcessed
        .filter((it) => it.isShared)
        .reduce((sum, it) => sum + it.itemSubtotal, 0)
        .toFixed(2),
    );

    const personalSubtotal = Number(
      itemsProcessed
        .filter((it) => !it.isShared)
        .reduce((sum, it) => sum + it.itemSubtotal, 0)
        .toFixed(2),
    );

    const subtotalAmount = Number((sharedSubtotal + personalSubtotal).toFixed(2));

    if (subtotalAmount <= 0) {
      throw new BadRequestException('ยอดรวมราคาสินค้าต้องมากกว่า 0');
    }

    // 2. คำนวณส่วนลด, Service Charge, และ VAT
    const discountAmount = dto.discountAmount
      ? Math.min(subtotalAmount, Number(dto.discountAmount))
      : 0;
    const discountedSubtotal = Math.max(0, subtotalAmount - discountAmount);

    const serviceChargePercentage = dto.serviceChargePercentage
      ? Number(dto.serviceChargePercentage)
      : 0;
    const serviceChargeAmount = Number(
      ((discountedSubtotal * serviceChargePercentage) / 100).toFixed(2),
    );

    const vatPercentage = dto.vatPercentage ? Number(dto.vatPercentage) : 0;
    const vatBase = discountedSubtotal + serviceChargeAmount;
    const vatAmount = Number(((vatBase * vatPercentage) / 100).toFixed(2));

    const totalAmount = Number((vatBase + vatAmount).toFixed(2));

    // 3. Prorate Factor
    const prorateFactor = subtotalAmount > 0 ? totalAmount / subtotalAmount : 1;

    // เตรียม split targets
    interface SplitTarget {
      itemIndex: number;
      userId: string;
      isShared: boolean;
      rawPortion: number;
      exactAmount: number;
      floorAmount: number;
      remainder: number;
      finalAmount: number;
    }

    const splitTargets: SplitTarget[] = [];

    itemsProcessed.forEach((it, idx) => {
      const numUsers = it.assignedUserIds.length;
      const rawPortion = it.itemSubtotal / numUsers;
      const exactAmount = (it.itemSubtotal * prorateFactor) / numUsers;
      const floorAmount = Math.floor(exactAmount * 100) / 100;
      const remainder = exactAmount - floorAmount;

      for (const uid of it.assignedUserIds) {
        splitTargets.push({
          itemIndex: idx,
          userId: uid,
          isShared: it.isShared,
          rawPortion,
          exactAmount,
          floorAmount,
          remainder,
          finalAmount: floorAmount,
        });
      }
    });

    // แจกจ่ายเศษสตางค์ (Largest Remainder Method)
    const currentSum = splitTargets.reduce((sum, s) => sum + s.floorAmount, 0);
    let centsToDistribute = Math.round((totalAmount - currentSum) * 100);

    const sortedIndices = splitTargets
      .map((item, index) => ({ index, remainder: item.remainder }))
      .sort((a, b) => b.remainder - a.remainder);

    let distIdx = 0;
    while (centsToDistribute > 0 && distIdx < sortedIndices.length) {
      const targetIdx = sortedIndices[distIdx].index;
      splitTargets[targetIdx].finalAmount = Number(
        (splitTargets[targetIdx].finalAmount + 0.01).toFixed(2),
      );
      centsToDistribute--;
      distIdx++;
    }

    // 4. บันทึกลง Database ด้วย Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          tripId,
          paidById,
          title: dto.title,
          totalAmount: new Prisma.Decimal(totalAmount),
          subtotalAmount: new Prisma.Decimal(subtotalAmount),
          discountAmount: new Prisma.Decimal(discountAmount),
          serviceChargePercentage: new Prisma.Decimal(serviceChargePercentage),
          serviceChargeAmount: new Prisma.Decimal(serviceChargeAmount),
          vatPercentage: new Prisma.Decimal(vatPercentage),
          vatAmount: new Prisma.Decimal(vatAmount),
          category: dto.category || 'FOOD',
          splitType: 'HYBRID',
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
          receiptUrl: dto.receiptUrl || null,
          notes: dto.notes || null,
        },
      });

      for (let idx = 0; idx < itemsProcessed.length; idx++) {
        const it = itemsProcessed[idx];
        const createdItem = await tx.expenseItem.create({
          data: {
            expenseId: expense.id,
            name: it.name,
            price: new Prisma.Decimal(it.price),
            quantity: it.quantity,
            amount: new Prisma.Decimal(it.itemSubtotal),
            isShared: it.isShared,
            order: it.order,
          },
        });

        const itemSplits = splitTargets.filter((s) => s.itemIndex === idx);
        for (const s of itemSplits) {
          await tx.expenseSplit.create({
            data: {
              expenseId: expense.id,
              itemId: createdItem.id,
              userId: s.userId,
              amount: new Prisma.Decimal(s.finalAmount),
              isSettled: false,
            },
          });
        }
      }

      return tx.expense.findUnique({
        where: { id: expense.id },
        include: {
          paidBy: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          items: {
            orderBy: { order: 'asc' },
            include: {
              splits: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
          splits: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
    });

    // 5. สรุป User Breakdown เพื่อให้ Mobile/Web แสดงผลแบ่งส่วนกลาง vs ส่วนตัวได้ชัดเจน
    const userSummaryMap = new Map<
      string,
      {
        userId: string;
        name: string;
        avatarUrl: string | null;
        personalSubtotal: number;
        sharedPortionSubtotal: number;
        rawSubtotal: number;
        finalTotal: number;
        personalDishes: Array<{ itemName: string; price: number; quantity: number; amount: number }>;
        sharedDishes: Array<{ itemName: string; totalAmount: number; participantCount: number; myShare: number }>;
      }
    >();

    for (const target of splitTargets) {
      const it = itemsProcessed[target.itemIndex];
      const user = tripMemberMap.get(target.userId)!;

      if (!userSummaryMap.has(target.userId)) {
        userSummaryMap.set(target.userId, {
          userId: target.userId,
          name: user.name || user.email || 'สมาชิกในทริป',
          avatarUrl: user.avatarUrl,
          personalSubtotal: 0,
          sharedPortionSubtotal: 0,
          rawSubtotal: 0,
          finalTotal: 0,
          personalDishes: [],
          sharedDishes: [],
        });
      }

      const entry = userSummaryMap.get(target.userId)!;
      entry.rawSubtotal = Number((entry.rawSubtotal + target.rawPortion).toFixed(2));
      entry.finalTotal = Number((entry.finalTotal + target.finalAmount).toFixed(2));

      if (it.isShared) {
        entry.sharedPortionSubtotal = Number(
          (entry.sharedPortionSubtotal + target.rawPortion).toFixed(2),
        );
        entry.sharedDishes.push({
          itemName: it.name,
          totalAmount: it.itemSubtotal,
          participantCount: it.assignedUserIds.length,
          myShare: Number(target.rawPortion.toFixed(2)),
        });
      } else {
        entry.personalSubtotal = Number(
          (entry.personalSubtotal + target.rawPortion).toFixed(2),
        );
        entry.personalDishes.push({
          itemName: it.name,
          price: it.price,
          quantity: it.quantity,
          amount: it.itemSubtotal,
        });
      }
    }

    const sharedDishesOverview = itemsProcessed
      .filter((it) => it.isShared)
      .map((it) => ({
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        totalAmount: it.itemSubtotal,
        participantsCount: it.assignedUserIds.length,
      }));

    return {
      message: 'บันทึกค่าใช้จ่ายแบบหารส่วนกลาง + แยกจ่ายส่วนตัว (Hybrid Split) สำเร็จ',
      splitSummary: {
        splitType: 'HYBRID',
        subtotalAmount,
        sharedSubtotal,
        personalSubtotal,
        discountAmount,
        serviceChargePercentage,
        serviceChargeAmount,
        vatPercentage,
        vatAmount,
        totalAmount,
        sharedDishesCount: sharedDishesOverview.length,
        personalDishesCount: itemsProcessed.length - sharedDishesOverview.length,
        sharedDishesOverview,
        userBreakdown: Array.from(userSummaryMap.values()),
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
        items: {
          orderBy: { order: 'asc' },
          include: {
            splits: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
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
        items: {
          orderBy: { order: 'asc' },
          include: {
            splits: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException(`ไม่พบรายการค่าใช้จ่าย ID: ${id}`);
    }

    return expense;
  }

  /**
   * คำนวณสรุปยอดหนี้คงค้างในทริป และรายการโอนหนี้ที่สั้นที่สุด (Debt Simplification)
   */
  async getTripBalances(tripId: string, currentUserId: string) {
    try {
      const trip = await this.ensureTripAndMembership(tripId, currentUserId);

    // 1. ดึงบิลค่าใช้จ่ายและส่วนแบ่งทั้งหมด
    const expenses = await this.prisma.expense.findMany({
      where: { tripId },
      include: {
        splits: true,
      },
    });

    // 2. ดึงการเคลียร์เงินที่ CONFIRMED แล้วทั้งหมด
    const settlements = await this.prisma.settlement.findMany({
      where: { tripId, status: SettlementStatus.CONFIRMED },
    });

    // 3. รวบรวมข้อมูลสมาชิกทั้งหมด
    const memberMap = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        avatarUrl: string | null;
        totalPaid: number;
        totalShare: number;
        settlementPaid: number;
        settlementReceived: number;
        netBalance: number;
        status: 'CREDITOR' | 'DEBTOR' | 'SETTLED';
      }
    >();

    for (const m of trip.members) {
      memberMap.set(m.userId, {
        userId: m.userId,
        name: m.user.name || m.user.email || 'สมาชิกในทริป',
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        totalPaid: 0,
        totalShare: 0,
        settlementPaid: 0,
        settlementReceived: 0,
        netBalance: 0,
        status: 'SETTLED',
      });
    }

    // รวมยอดที่จ่าย (Payer) และยอดที่เป็นส่วนแบ่ง (Split)
    let totalExpensesAmount = 0;
    for (const exp of expenses) {
      const expTotal = Number(exp.totalAmount);
      totalExpensesAmount += expTotal;

      if (memberMap.has(exp.paidById)) {
        memberMap.get(exp.paidById)!.totalPaid += expTotal;
      }

      for (const split of exp.splits) {
        if (memberMap.has(split.userId)) {
          memberMap.get(split.userId)!.totalShare += Number(split.amount);
        }
      }
    }

    // รวมยอดการเคลียร์เงินที่ผ่านแล้ว
    let totalSettledAmount = 0;
    for (const set of settlements) {
      const setAmount = Number(set.amount);
      totalSettledAmount += setAmount;

      if (memberMap.has(set.payerId)) {
        memberMap.get(set.payerId)!.settlementPaid += setAmount;
      }
      if (memberMap.has(set.payeeId)) {
        memberMap.get(set.payeeId)!.settlementReceived += setAmount;
      }
    }

    // คำนวณ Net Balance และกำหนดสถานะ
    for (const entry of memberMap.values()) {
      entry.totalPaid = Number(entry.totalPaid.toFixed(2));
      entry.totalShare = Number(entry.totalShare.toFixed(2));
      entry.settlementPaid = Number(entry.settlementPaid.toFixed(2));
      entry.settlementReceived = Number(entry.settlementReceived.toFixed(2));

      // Net = (จ่ายบิล - ส่วนแบ่งบิล) + (โอนเคลียร์เงินให้คนอื่น - ได้รับเงินโอนเคลียร์)
      const net = (entry.totalPaid - entry.totalShare) + (entry.settlementPaid - entry.settlementReceived);
      entry.netBalance = Number(net.toFixed(2));

      if (entry.netBalance > 0.009) {
        entry.status = 'CREDITOR';
      } else if (entry.netBalance < -0.009) {
        entry.status = 'DEBTOR';
      } else {
        entry.status = 'SETTLED';
        entry.netBalance = 0;
      }
    }

    // 4. Greedy Min-Cash-Flow Algorithm สำหรับหารายการโอนที่สั้นและน้อยที่สุด
    interface DebtPerson {
      userId: string;
      name: string;
      avatarUrl: string | null;
      amount: number;
    }

    const creditors: DebtPerson[] = [];
    const debtors: DebtPerson[] = [];

    for (const entry of memberMap.values()) {
      if (entry.netBalance > 0.009) {
        creditors.push({
          userId: entry.userId,
          name: entry.name,
          avatarUrl: entry.avatarUrl,
          amount: entry.netBalance,
        });
      } else if (entry.netBalance < -0.009) {
        debtors.push({
          userId: entry.userId,
          name: entry.name,
          avatarUrl: entry.avatarUrl,
          amount: Math.abs(entry.netBalance),
        });
      }
    }

    // จัดเรียงยอดมากไปน้อย
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const suggestedTransfers: TransferSuggestion[] = [];

    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];

      const transferAmount = Math.min(creditor.amount, debtor.amount);
      const roundedAmount = Number(transferAmount.toFixed(2));

      if (roundedAmount > 0) {
        suggestedTransfers.push({
          fromUserId: debtor.userId,
          fromUserName: debtor.name,
          fromUserAvatar: debtor.avatarUrl,
          toUserId: creditor.userId,
          toUserName: creditor.name,
          toUserAvatar: creditor.avatarUrl,
          amount: roundedAmount,
        });
      }

      creditor.amount = Number((creditor.amount - roundedAmount).toFixed(2));
      debtor.amount = Number((debtor.amount - roundedAmount).toFixed(2));

      if (creditor.amount <= 0.009) cIdx++;
      if (debtor.amount <= 0.009) dIdx++;
    }

      return {
        tripId,
        totalExpensesAmount: Number(totalExpensesAmount.toFixed(2)),
        totalSettledAmount: Number(totalSettledAmount.toFixed(2)),
        userBalances: Array.from(memberMap.values()),
        suggestedTransfers,
      };
    } catch (err) {
      console.error('getTripBalances error:', err);
      throw err;
    }
  }

  /**
   * แก้ไขข้อมูลบิลค่าใช้จ่าย
   */
  async update(tripId: string, expenseId: string, currentUserId: string, dto: UpdateExpenseDto) {
    const trip = await this.ensureTripAndMembership(tripId, currentUserId);

    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, tripId },
    });

    if (!expense) {
      throw new NotFoundException(`ไม่พบรายการค่าใช้จ่าย ID: ${expenseId}`);
    }

    // ตรวจสอบสิทธิ์: ต้องเป็นผู้จ่ายเงิน หรือเป็นเจ้าของทริป
    const isOwner = trip.members.some((m) => m.userId === currentUserId && m.role === 'OWNER');
    const isPayer = expense.paidById === currentUserId;
    if (!isOwner && !isPayer) {
      throw new ForbiddenException('เฉพาะผู้จ่ายเงินหรือเจ้าของทริปเท่านั้นที่สามารถแก้ไขข้อมูลบิลนี้ได้');
    }

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        title: dto.title !== undefined ? dto.title : expense.title,
        category: dto.category !== undefined ? dto.category : expense.category,
        notes: dto.notes !== undefined ? dto.notes : expense.notes,
        receiptUrl: dto.receiptUrl !== undefined ? dto.receiptUrl : expense.receiptUrl,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : expense.expenseDate,
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
        items: true,
        splits: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return {
      message: 'แก้ไขข้อมูลค่าใช้จ่ายสำเร็จ',
      expense: updated,
    };
  }

  /**
   * ลบบิลค่าใช้จ่าย (Cascade ลบ Items และ Splits ทั้งหมด)
   */
  async remove(tripId: string, expenseId: string, currentUserId: string) {
    const trip = await this.ensureTripAndMembership(tripId, currentUserId);

    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, tripId },
    });

    if (!expense) {
      throw new NotFoundException(`ไม่พบรายการค่าใช้จ่าย ID: ${expenseId}`);
    }

    // ตรวจสอบสิทธิ์: ต้องเป็นผู้จ่ายเงิน หรือเป็นเจ้าของทริป
    const isOwner = trip.members.some((m) => m.userId === currentUserId && m.role === 'OWNER');
    const isPayer = expense.paidById === currentUserId;
    if (!isOwner && !isPayer) {
      throw new ForbiddenException('เฉพาะผู้จ่ายเงินหรือเจ้าของทริปเท่านั้นที่สามารถลบบิลนี้ได้');
    }

    await this.prisma.expense.delete({
      where: { id: expenseId },
    });

    return {
      message: 'ลบรายการค่าใช้จ่ายสำเร็จ',
      deletedId: expenseId,
    };
  }
}
