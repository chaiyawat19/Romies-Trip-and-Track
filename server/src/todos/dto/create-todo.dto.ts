import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTodoDto {
  @IsString({ message: 'ชื่อ Todo ต้องเป็นตัวอักษร' })
  @IsNotEmpty({ message: 'กรุณาระบุชื่อ Todo' })
  @MaxLength(255, { message: 'ชื่อ Todo ต้องไม่เกิน 255 ตัวอักษร' })
  title: string;

  @IsString({ message: 'รายละเอียดต้องเป็นตัวอักษร' })
  @IsOptional()
  @MaxLength(1000, { message: 'รายละเอียดต้องไม่เกิน 1,000 ตัวอักษร' })
  description?: string;

  @IsString({ message: 'สติ๊กเกอร์ต้องเป็นตัวอักษร' })
  @IsOptional()
  @MaxLength(100, { message: 'สติ๊กเกอร์ต้องไม่เกิน 100 ตัวอักษร' })
  sticker?: string;
}
