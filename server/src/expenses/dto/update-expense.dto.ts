import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class UpdateExpenseDto {
  @IsString({ message: 'ชื่อบิล/ค่าใช้จ่ายต้องเป็นตัวอักษร' })
  @MaxLength(255, { message: 'ชื่อบิลค่าใช้จ่ายต้องไม่เกิน 255 ตัวอักษร' })
  @IsOptional()
  title?: string;

  @IsEnum(ExpenseCategory, { message: 'ประเภทค่าใช้จ่ายไม่ถูกต้อง' })
  @IsOptional()
  category?: ExpenseCategory;

  @IsDateString({}, { message: 'expenseDate ต้องเป็นรูปแบบวันที่ ISO8601' })
  @IsOptional()
  expenseDate?: string;

  @IsString({ message: 'receiptUrl ต้องเป็นตัวอักษร' })
  @IsOptional()
  receiptUrl?: string;

  @IsString({ message: 'notes ต้องเป็นตัวอักษร' })
  @IsOptional()
  notes?: string;
}
