import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateAvailabilityDto } from './create-availability.dto';

export class SetAvailabilitiesDto {
  @IsArray({ message: 'ranges ต้องเป็น Array ของช่วงวันว่าง' })
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityDto)
  ranges: CreateAvailabilityDto[];
}
