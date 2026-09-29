import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateOrderLineDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  picked!: boolean;
}
