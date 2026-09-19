import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SignInDto {
  @IsEmail({}, { message: 'กรุณากรอกอีเมลให้ถูกต้อง' })
  @IsNotEmpty({ message: 'อีเมลต้องไม่เป็นค่าว่าง' })
  email: string;

  @IsString({ message: 'รหัสผ่านต้องเป็นตัวอักษร' })
  @IsNotEmpty({ message: 'รหัสผ่านต้องไม่เป็นค่าว่าง' })
  password: string;
}
