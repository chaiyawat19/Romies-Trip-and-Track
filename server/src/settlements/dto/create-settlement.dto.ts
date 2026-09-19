import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateSettlementDto {
  @IsUUID('all', { message: 'payeeId ต้องเป็น UUID ที่ถูกต้อง' })
  @IsNotEmpty({ message: 'กรุณาระบุผู้รับเงิน (payeeId)' })
  payeeId: string;

  @IsNumber({}, { message: 'ยอดเงินต้องเป็นตัวเลข' })
  @Min(0.01, { message: 'ยอดเงินต้องมากกว่า 0' })
  amount: number;

  @IsString({ message: 'currency ต้องเป็นตัวอักษร' })
  @IsOptional()
  currency?: string = 'THB';

  @IsString({ message: 'notes ต้องเป็นตัวอักษร' })
  @IsOptional()
  notes?: string;

  @IsString({ message: 'proofUrl ต้องเป็นตัวอักษร' })
  @IsOptional()
  proofUrl?: string;
}
