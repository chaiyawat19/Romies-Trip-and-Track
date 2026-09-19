import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { JoinTripDto } from './dto/join-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

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
  private async resolveProvinceIds(dto: CreateTripDto | UpdateTripDto): Promise<number[]> {
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

  /**
   * เข้าร่วมทริปด้วยรหัสเชิญ (Invite Code) หรือ Trip ID
   */
  async join(userId: string, dto: JoinTripDto) {
    if (!dto.inviteCode && !dto.tripId) {
      throw new BadRequestException('กรุณาระบุรหัสเชิญ (inviteCode) หรือรหัสทริป (tripId)');
    }

    const whereCondition = dto.inviteCode
      ? { inviteCode: dto.inviteCode }
      : { id: dto.tripId };

    const trip = await this.prisma.trip.findUnique({
      where: whereCondition,
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
      throw new NotFoundException(
        dto.inviteCode
          ? `ไม่พบทริปที่ตรงกับรหัสเชิญ ${dto.inviteCode}`
          : `ไม่พบทริป ID: ${dto.tripId}`,
      );
    }

    if (trip.status === 'CANCELLED') {
      throw new BadRequestException('ไม่สามารถเข้าร่วมทริปนี้ได้เนื่องจากทริปถูกยกเลิกแล้ว');
    }

    // ตรวจสอบว่าเข้าร่วมแล้วหรือไม่
    const existingMember = trip.members.find((m) => m.userId === userId);
    if (existingMember) {
      return {
        message: 'คุณเป็นสมาชิกของทริปนี้อยู่แล้ว',
        isAlreadyMember: true,
        trip,
        member: existingMember,
      };
    }

    // สร้างข้อมูลสมาชิกใหม่ในทริป
    const newMember = await this.prisma.tripMember.create({
      data: {
        tripId: trip.id,
        userId,
        role: 'MEMBER',
        nickname: dto.nickname || null,
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
      message: 'เข้าร่วมทริปสำเร็จ',
      isAlreadyMember: false,
      trip: {
        ...trip,
        members: [...trip.members, newMember],
      },
      member: newMember,
    };
  }

  /**
   * แก้ไขข้อมูลทริป (เฉพาะ OWNER หรือ EDITOR)
   */
  async update(tripId: string, currentUserId: string, dto: UpdateTripDto, coverImageUrl?: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: true,
      },
    });

    if (!trip) {
      throw new NotFoundException(`ไม่พบข้อมูลทริป ID: ${tripId}`);
    }

    const member = trip.members.find((m) => m.userId === currentUserId);
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      throw new ForbiddenException(
        'เฉพาะเจ้าของทริป (OWNER) หรือผู้ดูแล (ADMIN) เท่านั้นที่แก้ไขทริปได้',
      );
    }

    const hasProvinceUpdate =
      dto.provinceIds !== undefined || dto.provinces !== undefined || dto.province !== undefined;

    let provinceIds: number[] = [];
    if (hasProvinceUpdate) {
      provinceIds = await this.resolveProvinceIds(dto);
    }

    const updatedTrip = await this.prisma.$transaction(async (tx) => {
      if (hasProvinceUpdate) {
        await tx.tripProvince.deleteMany({
          where: { tripId },
        });

        if (provinceIds.length > 0) {
          await tx.tripProvince.createMany({
            data: provinceIds.map((pid, idx) => ({
              tripId,
              provinceId: pid,
              order: idx,
            })),
          });
        }
      }

      return tx.trip.update({
        where: { id: tripId },
        data: {
          title: dto.title !== undefined ? dto.title : trip.title,
          province: dto.province !== undefined ? dto.province : trip.province,
          startDate:
            dto.startDate !== undefined
              ? dto.startDate
                ? new Date(dto.startDate)
                : null
              : trip.startDate,
          budgetAmount:
            dto.budgetAmount !== undefined
              ? dto.budgetAmount !== null
                ? new Prisma.Decimal(dto.budgetAmount)
                : null
              : trip.budgetAmount,
          budgetType: dto.budgetType !== undefined ? dto.budgetType : trip.budgetType,
          promptPayNumber:
            dto.promptPayNumber !== undefined ? dto.promptPayNumber : trip.promptPayNumber,
          coverImage: coverImageUrl || (dto.coverImage !== undefined ? dto.coverImage : trip.coverImage),
        },
        include: {
          provinces: {
            include: { province: true },
            orderBy: { order: 'asc' },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
        },
      });
    });

    return {
      message: 'แก้ไขข้อมูลทริปสำเร็จ',
      trip: updatedTrip,
    };
  }

  /**
   * นำสมาชิกออกจากทริป หรือ สมาชิกออกจากทริปด้วยตนเอง
   */
  async removeMember(tripId: string, currentUserId: string, targetUserId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: true,
      },
    });

    if (!trip) {
      throw new NotFoundException(`ไม่พบข้อมูลทริป ID: ${tripId}`);
    }

    const currentMember = trip.members.find((m) => m.userId === currentUserId);
    if (!currentMember) {
      throw new ForbiddenException('คุณไม่ได้เป็นสมาชิกในทริปนี้');
    }

    const targetMember = trip.members.find((m) => m.userId === targetUserId);
    if (!targetMember) {
      throw new NotFoundException('ไม่พบสมาชิกรายนี้ในทริป');
    }

    const isSelfLeaving = currentUserId === targetUserId;

    if (isSelfLeaving) {
      if (targetMember.role === 'OWNER') {
        throw new BadRequestException(
          'เจ้าของทริป (OWNER) ไม่สามารถออกจากทริปได้ หากต้องการยุติทริปกรุณาเลือกลบทริป',
        );
      }
    } else {
      if (currentMember.role !== 'OWNER') {
        throw new ForbiddenException('เฉพาะเจ้าของทริปเท่านั้นที่สามารถลบสมาชิกออกจากทริปได้');
      }
      if (targetMember.role === 'OWNER') {
        throw new BadRequestException('ไม่สามารถลบเจ้าของทริปได้');
      }
    }

    await this.prisma.tripMember.delete({
      where: {
        id: targetMember.id,
      },
    });

    return {
      message: isSelfLeaving ? 'คุณได้ออกจากทริปเรียบร้อยแล้ว' : 'ลบสมาชิกออกจากทริปเรียบร้อยแล้ว',
      removedUserId: targetUserId,
    };
  }

  /**
   * ลบทริป (เฉพาะ OWNER)
   */
  async remove(tripId: string, currentUserId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: true,
      },
    });

    if (!trip) {
      throw new NotFoundException(`ไม่พบข้อมูลทริป ID: ${tripId}`);
    }

    const isOwner = trip.members.some((m) => m.userId === currentUserId && m.role === 'OWNER');
    if (!isOwner) {
      throw new ForbiddenException('เฉพาะเจ้าของทริป (OWNER) เท่านั้นที่สามารถลบทริปได้');
    }

    await this.prisma.trip.delete({
      where: { id: tripId },
    });

    return {
      message: 'ลบทริปสำเร็จ',
      deletedTripId: tripId,
    };
  }
}
