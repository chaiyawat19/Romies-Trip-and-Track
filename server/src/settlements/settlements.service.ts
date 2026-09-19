import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private async ensureTripAndMembership(tripId: string, userId?: string) {
    if (!SettlementsService.UUID_REGEX.test(tripId)) {
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
        throw new ForbiddenException('คุณไม่ได้เป็นสมาชิกในทริปนี้ กรุณาเข้าร่วมทริปก่อนทำรายการ');
      }
    }

    return trip;
  }

  /**
   * บันทึกการโอนเงินเคลียร์หนี้
   */
  async create(
    tripId: string,
    currentUserId: string,
    dto: CreateSettlementDto,
    proofUrl?: string,
  ) {
    const trip = await this.ensureTripAndMembership(tripId, currentUserId);

    if (dto.payeeId === currentUserId) {
      throw new BadRequestException('ไม่สามารถโอนเงินเคลียร์หนี้ให้ตัวเองได้');
    }

    const isPayeeMember = trip.members.some((m) => m.userId === dto.payeeId);
    if (!isPayeeMember) {
      throw new BadRequestException('ผู้รับเงิน (payeeId) ไม่ได้เป็นสมาชิกในทริปนี้');
    }

    const finalProofUrl = proofUrl || dto.proofUrl || null;

    const settlement = await this.prisma.settlement.create({
      data: {
        tripId,
        payerId: currentUserId,
        payeeId: dto.payeeId,
        amount: new Prisma.Decimal(Number(dto.amount.toFixed(2))),
        currency: dto.currency || 'THB',
        proofUrl: finalProofUrl,
        status: SettlementStatus.PENDING,
      },
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        payee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      message: 'บันทึกการโอนเงินเคลียร์หนี้เรียบร้อย รอผู้รับกดยืนยัน',
      settlement,
    };
  }

  /**
   * ดึงประวัติการเคลียร์หนี้ทั้งหมดในทริป
   */
  async findAll(tripId: string, currentUserId: string) {
    await this.ensureTripAndMembership(tripId, currentUserId);

    const settlements = await this.prisma.settlement.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        payee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    const totalSettledAmount = settlements
      .filter((s) => s.status === SettlementStatus.CONFIRMED)
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const totalPendingAmount = settlements
      .filter((s) => s.status === SettlementStatus.PENDING)
      .reduce((sum, s) => sum + Number(s.amount), 0);

    return {
      tripId,
      settlementsCount: settlements.length,
      totalSettledAmount: Number(totalSettledAmount.toFixed(2)),
      totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
      settlements,
    };
  }

  /**
   * ยืนยันการรับเงินเคลียร์หนี้ (เฉพาะผู้รับเงิน หรือ เจ้าของทริป)
   */
  async confirm(tripId: string, settlementId: string, currentUserId: string) {
    const trip = await this.ensureTripAndMembership(tripId, currentUserId);

    const settlement = await this.prisma.settlement.findFirst({
      where: { id: settlementId, tripId },
    });

    if (!settlement) {
      throw new NotFoundException(`ไม่พบรายการเคลียร์เงิน ID: ${settlementId}`);
    }

    const isPayee = settlement.payeeId === currentUserId;
    const isOwner = trip.members.some((m) => m.userId === currentUserId && m.role === 'OWNER');
    if (!isPayee && !isOwner) {
      throw new ForbiddenException('เฉพาะผู้รับเงินหรือเจ้าของทริปเท่านั้นที่สามารถกดยืนยันการรับเงินได้');
    }

    if (settlement.status === SettlementStatus.CONFIRMED) {
      throw new BadRequestException('รายการนี้ได้รับการยืนยันเรียบร้อยแล้ว');
    }

    const updated = await this.prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.CONFIRMED,
        settledAt: new Date(),
      },
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        payee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      message: 'ยืนยันการรับเงินเคลียร์หนี้สำเร็จ',
      settlement: updated,
    };
  }

  /**
   * ปฏิเสธ/ยกเลิกรายการเคลียร์เงิน (เฉพาะผู้โอน, ผู้รับ, หรือ เจ้าของทริป)
   */
  async cancel(tripId: string, settlementId: string, currentUserId: string) {
    const trip = await this.ensureTripAndMembership(tripId, currentUserId);

    const settlement = await this.prisma.settlement.findFirst({
      where: { id: settlementId, tripId },
    });

    if (!settlement) {
      throw new NotFoundException(`ไม่พบรายการเคลียร์เงิน ID: ${settlementId}`);
    }

    const isPayer = settlement.payerId === currentUserId;
    const isPayee = settlement.payeeId === currentUserId;
    const isOwner = trip.members.some((m) => m.userId === currentUserId && m.role === 'OWNER');
    if (!isPayer && !isPayee && !isOwner) {
      throw new ForbiddenException('เฉพาะผู้โอนเงิน, ผู้รับเงิน หรือเจ้าของทริปเท่านั้นที่สามารถยกเลิกรายการนี้ได้');
    }

    if (settlement.status === SettlementStatus.CONFIRMED) {
      throw new BadRequestException('ไม่สามารถยกเลิกรายการที่ยืนยันการรับเงินแล้วได้');
    }

    const updated = await this.prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.REJECTED,
      },
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        payee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      message: 'ยกเลิกรายการเคลียร์หนี้สำเร็จ',
      settlement: updated,
    };
  }
}
