import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProvincesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string, region?: string) {
    const whereCondition: any = {};

    if (region) {
      whereCondition.region = region;
    }

    if (search) {
      whereCondition.OR = [
        { nameTh: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.province.findMany({
      where: whereCondition,
      orderBy: {
        id: 'asc',
      },
    });
  }

  async getRegions() {
    const provinces = await this.prisma.province.findMany({
      select: { region: true },
      distinct: ['region'],
    });
    return provinces.map((p) => p.region);
  }
}
