import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @IsEmail({}, { message: 'กรุณากรอกอีเมลให้ถูกต้อง' })
  @IsNotEmpty({ message: 'อีเมลต้องไม่เป็นค่าว่าง' })
  email: string;

  @IsString({ message: 'รหัสผ่านต้องเป็นตัวอักษร' })
  @MinLength(6, { message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
  @IsNotEmpty({ message: 'รหัสผ่านต้องไม่เป็นค่าว่าง' })
  password: string;

  @IsString({ message: 'ชื่อต้องเป็นตัวอักษร' })
  @IsNotEmpty({ message: 'ชื่อต้องไม่เป็นค่าว่าง' })
  name: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
