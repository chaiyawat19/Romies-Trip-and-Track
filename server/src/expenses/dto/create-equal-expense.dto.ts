import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ExpenseCategory, SplitType } from '@prisma/client';

export class CreateEqualExpenseDto {
  @IsString({ message: 'ชื่อรายการต้องเป็นตัวอักษร' })
  @IsNotEmpty({ message: 'กรุณาระบุชื่อรายการค่าใช้จ่าย' })
  @MaxLength(255, { message: 'ชื่อรายการต้องไม่เกิน 255 ตัวอักษร' })
  title: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'ยอดเงินรวมต้องเป็นตัวเลข' })
  @Min(0.01, { message: 'ยอดเงินต้องมากกว่า 0' })
  totalAmount: number;

  @IsEnum(SplitType, { message: 'ประเภทการหารต้องเป็น EQUAL, ITEMIZED หรือ HYBRID' })
  @IsOptional()
  splitType?: SplitType = SplitType.EQUAL;

  @IsEnum(ExpenseCategory, { message: 'ประเภทค่าใช้จ่ายไม่ถูกต้อง' })
  @IsOptional()
  category?: ExpenseCategory = ExpenseCategory.FOOD;

  @IsUUID('4', { message: 'paidById ต้องเป็น UUID ที่ถูกต้อง' })
  @IsOptional()
  paidById?: string;

  @IsDateString({}, { message: 'รูปแบบวันที่ไม่ถูกต้อง (ตัวอย่าง: 2026-11-20)' })
  @IsOptional()
  expenseDate?: string;

  @IsString({ message: 'URL ใบเสร็จต้องเป็นตัวอักษร' })
  @IsOptional()
  receiptUrl?: string;

  @IsString({ message: 'โน้ตเพิ่มเติมต้องเป็นตัวอักษร' })
  @IsOptional()
  @MaxLength(1000, { message: 'โน้ตต้องไม่เกิน 1,000 ตัวอักษร' })
  notes?: string;

  /**
   * รายชื่อคนที่ร่วมหารบิลนี้ (UUIDs)
   * หากเว้นว่างไว้ ระบบจะดึงสมาชิกทุกคนในทริปมาร่วมหารเท่ากันโดยอัตโนมัติ
   */
  @IsArray({ message: 'participantIds ต้องเป็น Array ของ User UUID' })
  @IsUUID('4', { each: true, message: 'participantId ต้องเป็น UUID ที่ถูกต้อง' })
  @IsOptional()
  participantIds?: string[];
}
