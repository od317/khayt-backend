import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class RecordPaymentDto {
  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  amount!: number;
}
