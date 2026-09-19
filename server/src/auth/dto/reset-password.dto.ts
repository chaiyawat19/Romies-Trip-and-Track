import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Token ต้องเป็นตัวอักษร' })
  @IsNotEmpty({ message: 'Token ต้องไม่เป็นค่าว่าง' })
  token: string;

  @IsString({ message: 'รหัสผ่านใหม่ต้องเป็นตัวอักษร' })
  @MinLength(6, { message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
  @IsNotEmpty({ message: 'รหัสผ่านใหม่ต้องไม่เป็นค่าว่าง' })
  newPassword: string;
}
