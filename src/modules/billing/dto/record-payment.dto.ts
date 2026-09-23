import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class RecordPaymentDto {
  @Type(() => Number)
  @IsInt()
  amount!: number;
}
