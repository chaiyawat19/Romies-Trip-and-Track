import { Transform, Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BudgetType } from '@prisma/client';

export class CreateTripDto {
  @IsString({ message: 'ชื่อทริปต้องเป็นตัวอักษร' })
  @IsNotEmpty({ message: 'กรุณาระบุชื่อทริป' })
  title: string;

  /**
   * รองรับการส่ง provinceIds เป็น Array ของ Province ID เช่น [23, 24]
   * หรือส่งเป็น string ใน multipart/form-data เช่น "23,24" หรือ "[23, 24]"
   */
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

  /**
   * รองรับการส่ง provinces เป็น Array ของชื่อจังหวัด เช่น ["เชียงใหม่", "เชียงราย"]
   * หรือส่งเป็น string ใน multipart/form-data เช่น "เชียงใหม่,เชียงราย"
   */
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

  /**
   * รองรับการส่งชื่อจังหวัดเดี่ยว (Backward compatible) เช่น "เชียงใหม่"
   */
  @IsString({ message: 'จังหวัดต้องเป็นตัวอักษร' })
  @IsOptional()
  province?: string;

  @IsDateString({}, { message: 'รูปแบบวันที่ไม่ถูกต้อง (ตัวอย่าง: 2026-10-15)' })
  @IsOptional()
  startDate?: string;

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
