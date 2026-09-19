import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExpenseCategory, SplitType } from '@prisma/client';

export class CreateExpenseItemDto {
  @IsString({ message: 'ชื่อรายการต้องเป็นตัวอักษร' })
  @IsNotEmpty({ message: 'กรุณาระบุชื่อรายการ' })
  @MaxLength(255, { message: 'ชื่อรายการต้องไม่เกิน 255 ตัวอักษร' })
  name: string;

  @IsNumber({}, { message: 'ราคาต่อหน่วยต้องเป็นตัวเลข' })
  @Min(0, { message: 'ราคาต้องไม่ติดลบ' })
  price: number;

  @IsInt({ message: 'จำนวนต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'จำนวนต้องอย่างน้อย 1' })
  @IsOptional()
  quantity?: number = 1;

  @IsArray({ message: 'assignedUserIds ต้องเป็น Array ของ User ID' })
  @ArrayMinSize(1, { message: 'ต้องระบุผู้รับผิดชอบรายการนี้อย่างน้อย 1 คน' })
  @IsUUID('all', { each: true, message: 'User ID ของผู้รับผิดชอบไม่ถูกต้อง' })
  assignedUserIds: string[];
}

export class CreateItemizedExpenseDto {
  @IsString({ message: 'ชื่อบิล/ค่าใช้จ่ายต้องเป็นตัวอักษร' })
  @IsNotEmpty({ message: 'กรุณาระบุชื่อบิลค่าใช้จ่าย' })
  @MaxLength(255, { message: 'ชื่อบิลค่าใช้จ่ายต้องไม่เกิน 255 ตัวอักษร' })
  title: string;

  @IsEnum(SplitType, { message: 'ประเภทการหารต้องเป็น ITEMIZED' })
  @IsOptional()
  splitType?: SplitType = SplitType.ITEMIZED;

  @IsEnum(ExpenseCategory, { message: 'ประเภทค่าใช้จ่ายไม่ถูกต้อง' })
  @IsOptional()
  category?: ExpenseCategory = ExpenseCategory.FOOD;

  @IsUUID('all', { message: 'paidById ต้องเป็น UUID ที่ถูกต้อง' })
  @IsOptional()
  paidById?: string;

  @IsDateString({}, { message: 'expenseDate ต้องเป็นรูปแบบวันที่ ISO8601' })
  @IsOptional()
  expenseDate?: string;

  @IsString({ message: 'receiptUrl ต้องเป็นตัวอักษร' })
  @IsOptional()
  receiptUrl?: string;

  @IsString({ message: 'notes ต้องเป็นตัวอักษร' })
  @IsOptional()
  notes?: string;

  @IsNumber({}, { message: 'vatPercentage ต้องเป็นตัวเลข' })
  @Min(0, { message: 'vatPercentage ต้องไม่ติดลบ' })
  @IsOptional()
  vatPercentage?: number;

  @IsNumber({}, { message: 'serviceChargePercentage ต้องเป็นตัวเลข' })
  @Min(0, { message: 'serviceChargePercentage ต้องไม่ติดลบ' })
  @IsOptional()
  serviceChargePercentage?: number;

  @IsNumber({}, { message: 'discountAmount ต้องเป็นตัวเลข' })
  @Min(0, { message: 'discountAmount ต้องไม่ติดลบ' })
  @IsOptional()
  discountAmount?: number;

  @IsArray({ message: 'items ต้องเป็น Array ของรายการอาหาร/สิ่งของ' })
  @ArrayMinSize(1, { message: 'ต้องมีรายการอาหาร/สิ่งของอย่างน้อย 1 รายการ' })
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseItemDto)
  items: CreateExpenseItemDto[];
}
