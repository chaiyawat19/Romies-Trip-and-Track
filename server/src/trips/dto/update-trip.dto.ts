import { Transform, Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BudgetType } from '@prisma/client';

export class UpdateTripDto {
  @IsString({ message: 'ชื่อทริปต้องเป็นตัวอักษร' })
  @IsOptional()
  title?: string;

  @IsString({ message: 'รายละเอียดทริปต้องเป็นตัวอักษร' })
  @IsOptional()
  description?: string;

  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.map((v) => Number(v)).filter((v) => !isNaN(v));
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map((v) => Number(v)).filter((v) => !isNaN(v));
      } catch {
        return value.split(',').map((v) => Number(v.trim())).filter((v) => !isNaN(v));
      }
    }
    return undefined;
  })
  @IsArray({ message: 'provinceIds ต้องเป็น Array' })
  @IsOptional()
  provinceIds?: number[];

  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value.split(',').map((v) => v.trim()).filter(Boolean);
      }
    }
    return undefined;
  })
  @IsArray({ message: 'provinces ต้องเป็น Array' })
  @IsOptional()
  provinces?: string[];

  @IsString({ message: 'จังหวัดต้องเป็นตัวอักษร' })
  @IsOptional()
  province?: string;

  @IsDateString({}, { message: 'รูปแบบวันที่ไม่ถูกต้อง (ตัวอย่าง: 2026-10-15)' })
  @IsOptional()
  startDate?: string;

  @IsDateString({}, { message: 'รูปแบบวันที่ไม่ถูกต้อง (ตัวอย่าง: 2026-10-20)' })
  @IsOptional()
  endDate?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'งบประมาณต้องเป็นตัวเลข' })
  @Min(0, { message: 'งบประมาณต้องมากกว่าหรือเท่ากับ 0' })
  @IsOptional()
  budgetAmount?: number;

  @IsEnum(BudgetType, { message: 'ประเภทงบประมาณต้องเป็น TOTAL หรือ PER_PERSON' })
  @IsOptional()
  budgetType?: BudgetType;

  @IsString({ message: 'เลขพร้อมเพย์ต้องเป็นตัวอักษรหรือตัวเลข' })
  @IsOptional()
  promptPayNumber?: string;

  @IsString({ message: 'URL รูปภาพต้องเป็นตัวอักษร' })
  @IsOptional()
  coverImage?: string;
}
