import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * สุ่มสร้าง Invite Code เป็นตัวเลข 6 หลักที่ไม่ซ้ำ
   */
  private async generateUniqueInviteCode(): Promise<string> {
    let code = '';
    let exists = true;

    while (exists) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const trip = await this.prisma.trip.findUnique({
        where: { inviteCode: code },
      });
      if (!trip) {
        exists = false;
      }
    }

    return code;
  }

  /**
   * แปลงข้อมูลจังหวัดจาก DTO (provinceIds, provinces, หรือ province) เป็น Province ID Array พร้อมรักษาลำดับ
   */
  private async resolveProvinceIds(dto: CreateTripDto): Promise<number[]> {
    const ids: number[] = [];

    if (dto.provinceIds && dto.provinceIds.length > 0) {
      const existing = await this.prisma.province.findMany({
        where: { id: { in: dto.provinceIds } },
        select: { id: true },
      });
      const existingSet = new Set(existing.map((p) => p.id));
      for (const id of dto.provinceIds) {
        if (existingSet.has(id) && !ids.includes(id)) {
          ids.push(id);
        }
      }
    } else if (dto.provinces && dto.provinces.length > 0) {
      for (const name of dto.provinces) {
        const p = await this.prisma.province.findFirst({
          where: {
            OR: [
              { nameTh: { equals: name, mode: 'insensitive' } },
              { nameEn: { equals: name, mode: 'insensitive' } },
            ],
          },
        });
        if (p && !ids.includes(p.id)) {
          ids.push(p.id);
        }
      }
    } else if (dto.province) {
      // รองรับกรณีส่งชื่อจังหวัดเดี่ยว หรือส่งมาเป็น comma separated "เชียงใหม่,เชียงราย"
      const names = dto.province.split(',').map((s) => s.trim()).filter(Boolean);
      for (const name of names) {
        const p = await this.prisma.province.findFirst({
          where: {
            OR: [
              { nameTh: { equals: name, mode: 'insensitive' } },
              { nameEn: { equals: name, mode: 'insensitive' } },
            ],
          },
        });
        if (p && !ids.includes(p.id)) {
          ids.push(p.id);
        }
      }
    }

    return ids;
  }

  async create(userId: string, dto: CreateTripDto, coverImageUrl?: string) {
    const inviteCode = await this.generateUniqueInviteCode();

    const image = coverImageUrl || dto.coverImage || null;
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const budgetAmount = dto.budgetAmount !== undefined && dto.budgetAmount !== null
      ? new Prisma.Decimal(dto.budgetAmount)
      : null;

    const resolvedProvinceIds = await this.resolveProvinceIds(dto);

    // กำหนด primaryProvince สำหรับเก็บเป็น string ย่อในฟิลด์ province
    let primaryProvince = dto.province || null;
    if (!primaryProvince && resolvedProvinceIds.length > 0) {
      const firstP = await this.prisma.province.findUnique({
        where: { id: resolvedProvinceIds[0] },
        select: { nameTh: true },
      });
      primaryProvince = firstP?.nameTh || null;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          title: dto.title,
          province: primaryProvince,
          coverImage: image,
          startDate,
          budgetAmount,
          budgetType: dto.budgetType || null,
          promptPayNumber: dto.promptPayNumber || null,
          inviteCode,
          provinces: {
            create: resolvedProvinceIds.map((provinceId, index) => ({
              provinceId,
              order: index,
            })),
          },
        },
        include: {
          provinces: {
            include: {
              province: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      const member = await tx.tripMember.create({
        data: {
          tripId: trip.id,
          userId,
          role: 'OWNER',
        },
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
      });

      return {
        ...trip,
        members: [member],
      };
    });

    return {
      message: 'สร้างทริปสำเร็จ',
      trip: result,
    };
  }

  async findAll(userId?: string) {
    const whereCondition = userId
      ? {
          members: {
            some: {
              userId,
            },
          },
        }
      : {};

    return this.prisma.trip.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        provinces: {
          include: {
            province: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        members: {
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
        _count: {
          select: {
            members: true,
            expenses: true,
            todos: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        provinces: {
          include: {
            province: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        members: {
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
        _count: {
          select: {
            members: true,
            expenses: true,
            todos: true,
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException(`ไม่พบข้อมูลทริป ID: ${id}`);
    }

    return trip;
  }

  async findByInviteCode(inviteCode: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { inviteCode },
      include: {
        provinces: {
          include: {
            province: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        members: {
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

    if (!trip) {
      throw new NotFoundException(`ไม่พบทริปที่ตรงกับรหัสเชิญ ${inviteCode}`);
    }

    return trip;
  }
}
