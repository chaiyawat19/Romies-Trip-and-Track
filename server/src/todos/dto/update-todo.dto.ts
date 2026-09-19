import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateTodoDto {
  @IsString({ message: 'ชื่อ Todo ต้องเป็นตัวอักษร' })
  @IsOptional()
  @MaxLength(255, { message: 'ชื่อ Todo ต้องไม่เกิน 255 ตัวอักษร' })
  title?: string;

  @IsString({ message: 'รายละเอียดต้องเป็นตัวอักษร' })
  @IsOptional()
  @MaxLength(1000, { message: 'รายละเอียดต้องไม่เกิน 1,000 ตัวอักษร' })
  description?: string;

  @IsString({ message: 'สติ๊กเกอร์ต้องเป็นตัวอักษร' })
  @IsOptional()
  @MaxLength(100, { message: 'สติ๊กเกอร์ต้องไม่เกิน 100 ตัวอักษร' })
  sticker?: string;

  @IsInt({ message: 'ลำดับต้องเป็นตัวเลขจำนวนเต็ม' })
  @Min(0, { message: 'ลำดับต้องมากกว่าหรือเท่ากับ 0' })
  @IsOptional()
  orderIndex?: number;
}
