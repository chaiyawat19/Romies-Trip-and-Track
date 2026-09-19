import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { SetAvailabilitiesDto } from './dto/set-availabilities.dto';

@Injectable()
export class AvailabilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * ตรวจสอบว่าทริปมีอยู่จริง และตรวจสอบว่าผู้ใช้เป็นสมาชิกในทริปหรือไม่
   */
  private async ensureTripAndMembership(tripId: string, userId?: string) {
    if (!AvailabilitiesService.UUID_REGEX.test(tripId)) {
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
        throw new ForbiddenException('คุณไม่ได้เป็นสมาชิกในทริปนี้ กรุณาเข้าร่วมทริปก่อนใส่วันว่าง');
      }
    }

    return trip;
  }

  /**
   * บันทึกช่วงวันว่างใหม่
   */
  async create(tripId: string, userId: string, dto: CreateAvailabilityDto) {
    await this.ensureTripAndMembership(tripId, userId);

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (start > end) {
      throw new BadRequestException('วันเริ่มต้นต้องไม่เกินวันสิ้นสุด');
    }

    const availability = await this.prisma.availability.create({
      data: {
        tripId,
        userId,
        startDate: start,
        endDate: end,
        status: dto.status || 'AVAILABLE',
        note: dto.note || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      message: 'บันทึกวันว่างสำเร็จ',
      availability,
    };
  }

  /**
   * กำหนดช่วงวันว่างของตัวเองทั้งหมดในคราวเดียว (แทนที่ของเดิม)
   */
  async setMyAvailabilities(tripId: string, userId: string, dto: SetAvailabilitiesDto) {
    await this.ensureTripAndMembership(tripId, userId);

    for (const range of dto.ranges) {
      if (new Date(range.startDate) > new Date(range.endDate)) {
        throw new BadRequestException(`ช่วงวันที่ ${range.startDate} ถึง ${range.endDate} ไม่ถูกต้อง (วันเริ่มต้นเกินวันสิ้นสุด)`);
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // ลบช่วงวันว่างเดิมของตัวเองในทริปนี้
      await tx.availability.deleteMany({
        where: { tripId, userId },
      });

      // สร้างช่วงวันว่างใหม่
      if (dto.ranges.length > 0) {
        await tx.availability.createMany({
          data: dto.ranges.map((r) => ({
            tripId,
            userId,
            startDate: new Date(r.startDate),
            endDate: new Date(r.endDate),
            status: r.status || 'AVAILABLE',
            note: r.note || null,
          })),
        });
      }

      return tx.availability.findMany({
        where: { tripId, userId },
        orderBy: { startDate: 'asc' },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });
    });

    return {
      message: 'อัปเดตวันว่างของคุณสำเร็จ',
      availabilities: result,
    };
  }

  /**
   * ดึงรายการวันว่างทั้งหมดในทริป
   */
  async findAll(tripId: string) {
    const trip = await this.ensureTripAndMembership(tripId);

    const availabilities = await this.prisma.availability.findMany({
      where: { tripId },
      orderBy: [{ startDate: 'asc' }, { userId: 'asc' }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      tripId,
      tripTitle: trip.title,
      tripStartDate: trip.startDate,
      members: trip.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
      })),
      availabilities,
    };
  }

  /**
   * คำนวณหาวันว่างที่ตรงกันของสมาชิกทุกคนในทริป (Matching / Overlapping Dates)
   * โดยถ้าทริปมี startDate จะเริ่มนับตั้งแต่วันนั้นเป็นต้นไป
   */
  async findMatchingDates(tripId: string) {
    const trip = await this.ensureTripAndMembership(tripId);

    const allMembers = trip.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
    }));

    const totalMembers = allMembers.length;
    if (totalMembers === 0) {
      return {
        tripId,
        tripTitle: trip.title,
        tripStartDate: trip.startDate,
        totalMembers: 0,
        perfectMatchRanges: [],
        bestMatchRanges: [],
        dailyMatches: [],
      };
    }

    // ดึงวันว่างทั้งหมดในทริป ที่สถานะ AVAILABLE หรือ PREFERRED
    const availabilities = await this.prisma.availability.findMany({
      where: {
        tripId,
        status: { in: ['AVAILABLE', 'PREFERRED'] },
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    if (availabilities.length === 0) {
      return {
        tripId,
        tripTitle: trip.title,
        tripStartDate: trip.startDate,
        totalMembers,
        message: 'ยังไม่มีสมาชิกใส่วันว่างในทริปนี้',
        perfectMatchRanges: [],
        bestMatchRanges: [],
        dailyMatches: [],
      };
    }

    // กำหนดวันเริ่มต้น: ถ้าทริปมี startDate ให้เริ่มจากวันนั้นเลย ถ้าไม่มี ให้เริ่มจากวันแรกสุดที่มีคนระบุว่าง
    let startBoundary: Date;
    if (trip.startDate) {
      startBoundary = new Date(trip.startDate);
    } else {
      const minAvailDate = availabilities.reduce((min, a) => (a.startDate < min ? a.startDate : min), availabilities[0].startDate);
      startBoundary = new Date(minAvailDate);
    }

    // กำหนดวันสิ้นสุด: หาวันสิ้นสุดมากสุดที่มีคนระบุว่าง
    const maxAvailDate = availabilities.reduce((max, a) => (a.endDate > max ? a.endDate : max), availabilities[0].endDate);
    const endBoundary = new Date(maxAvailDate);

    // ปรับเวลาให้เป็น 00:00:00 เพื่อเปรียบเทียบเฉพาะวัน
    startBoundary.setUTCHours(0, 0, 0, 0);
    endBoundary.setUTCHours(0, 0, 0, 0);

    // หากวันเริ่มต้นของทริปอยู่หลังวันว่างทั้งหมด
    if (startBoundary > endBoundary) {
      return {
        tripId,
        tripTitle: trip.title,
        tripStartDate: trip.startDate,
        totalMembers,
        message: 'วันว่างที่สมาชิกระบุ อยู่ก่อนวัน startDate ของทริป',
        perfectMatchRanges: [],
        bestMatchRanges: [],
        dailyMatches: [],
      };
    }

    const dailyMatches: Array<{
      date: string;
      availableCount: number;
      totalMembers: number;
      matchPercentage: number;
      isAllAvailable: boolean;
      availableMembers: typeof allMembers;
      busyMembers: typeof allMembers;
    }> = [];

    // วนลูปตรวจสอบทีละวัน
    const current = new Date(startBoundary);
    let maxAvailableCount = 0;

    while (current <= endBoundary) {
      const currentDateStr = current.toISOString().slice(0, 10);
      const dayTime = current.getTime();

      // หาสมาชิกที่ว่างในวันนี้
      const availableUserIds = new Set<string>();
      for (const a of availabilities) {
        const aStart = new Date(a.startDate);
        aStart.setUTCHours(0, 0, 0, 0);
        const aEnd = new Date(a.endDate);
        aEnd.setUTCHours(0, 0, 0, 0);

        if (dayTime >= aStart.getTime() && dayTime <= aEnd.getTime()) {
          availableUserIds.add(a.userId);
        }
      }

      const availableMembers = allMembers.filter((m) => availableUserIds.has(m.id));
      const busyMembers = allMembers.filter((m) => !availableUserIds.has(m.id));
      const availableCount = availableMembers.length;
      const isAllAvailable = availableCount === totalMembers;
      const matchPercentage = Math.round((availableCount / totalMembers) * 100);

      if (availableCount > maxAvailableCount) {
        maxAvailableCount = availableCount;
      }

      dailyMatches.push({
        date: currentDateStr,
        availableCount,
        totalMembers,
        matchPercentage,
        isAllAvailable,
        availableMembers,
        busyMembers,
      });

      current.setUTCDate(current.getUTCDate() + 1);
    }

    // รวมช่วงวันที่มีคนว่างตรงกันทุกคน (Perfect Match Ranges)
    const perfectMatchRanges = this.extractConsecutiveRanges(
      dailyMatches.filter((d) => d.isAllAvailable).map((d) => d.date),
    );

    // รวมช่วงวันที่มีคนว่างเยอะที่สุด (Best Match Ranges)
    const bestMatchRanges =
      maxAvailableCount > 0
        ? this.extractConsecutiveRanges(
            dailyMatches.filter((d) => d.availableCount === maxAvailableCount).map((d) => d.date),
          )
        : [];

    return {
      tripId,
      tripTitle: trip.title,
      tripStartDate: trip.startDate ? trip.startDate.toISOString().slice(0, 10) : null,
      totalMembers,
      maxAvailableCount,
      perfectMatchRanges,
      bestMatchRanges,
      dailyMatches,
    };
  }

  /**
   * จัดกลุ่มวันที่ติดกันให้เป็นช่วง (Consecutive Date Ranges) เช่น ["2026-11-20", "2026-11-21"] -> { from, to, days: 2 }
   */
  private extractConsecutiveRanges(dateStrings: string[]) {
    if (dateStrings.length === 0) return [];

    const ranges: Array<{ from: string; to: string; days: number }> = [];
    let start = dateStrings[0];
    let prev = new Date(start);
    let count = 1;

    for (let i = 1; i < dateStrings.length; i++) {
      const curr = new Date(dateStrings[i]);
      const diffTime = curr.getTime() - prev.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        count++;
        prev = curr;
      } else {
        ranges.push({
          from: start,
          to: dateStrings[i - 1],
          days: count,
        });
        start = dateStrings[i];
        prev = curr;
        count = 1;
      }
    }

    ranges.push({
      from: start,
      to: dateStrings[dateStrings.length - 1],
      days: count,
    });

    return ranges;
  }

  /**
   * ลบช่วงวันว่าง
   */
  async remove(tripId: string, id: string, userId: string) {
    await this.ensureTripAndMembership(tripId, userId);

    const availability = await this.prisma.availability.findFirst({
      where: { id, tripId, userId },
    });

    if (!availability) {
      throw new NotFoundException(`ไม่พบรายการวันว่าง ID: ${id}`);
    }

    await this.prisma.availability.delete({
      where: { id },
    });

    return {
      message: 'ลบรายการวันว่างสำเร็จ',
      id,
    };
  }
}
