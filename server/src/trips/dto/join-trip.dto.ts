import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class JoinTripDto {
  /**
   * รหัสเชิญ 6 หลัก (Invite Code) ที่ได้จากการแชร์หรือสแกน QR Code
   */
  @IsString({ message: 'รหัสเชิญต้องเป็นตัวอักษรหรือตัวเลข' })
  @Length(6, 6, { message: 'รหัสเชิญต้องมี 6 หลัก' })
  @IsOptional()
  inviteCode?: string;

  /**
   * รหัสทริป (UUID) กรณีเข้าร่วมด้วย Trip ID โดยตรง
   */
  @IsString({ message: 'Trip ID ต้องเป็นตัวอักษร' })
  @IsOptional()
  tripId?: string;

  /**
   * ชื่อเล่นในทริปนี้ (ตัวเลือกเสริม)
   */
  @IsString({ message: 'ชื่อเล่นต้องเป็นตัวอักษร' })
  @MaxLength(100, { message: 'ชื่อเล่นต้องไม่เกิน 100 ตัวอักษร' })
  @IsOptional()
  nickname?: string;
}
