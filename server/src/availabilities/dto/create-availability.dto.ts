import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AvailabilityStatus } from '@prisma/client';

export class CreateAvailabilityDto {
  @IsDateString({}, { message: 'รูปแบบวันเริ่มต้นไม่ถูกต้อง (ตัวอย่าง: 2026-11-20)' })
  @IsNotEmpty({ message: 'กรุณาระบุวันเริ่มต้นที่ว่าง' })
  startDate: string;

  @IsDateString({}, { message: 'รูปแบบวันสิ้นสุดไม่ถูกต้อง (ตัวอย่าง: 2026-11-25)' })
  @IsNotEmpty({ message: 'กรุณาระบุวันสิ้นสุดที่ว่าง' })
  endDate: string;

  @IsEnum(AvailabilityStatus, { message: 'สถานะต้องเป็น AVAILABLE, BUSY หรือ PREFERRED' })
  @IsOptional()
  status?: AvailabilityStatus;

  @IsString({ message: 'โน้ตต้องเป็นตัวอักษร' })
  @IsOptional()
  @MaxLength(255, { message: 'โน้ตต้องไม่เกิน 255 ตัวอักษร' })
  note?: string;
}
