import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'กรุณากรอกอีเมลให้ถูกต้อง' })
  @IsNotEmpty({ message: 'อีเมลต้องไม่เป็นค่าว่าง' })
  email: string;
}
