import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDeliveryDto {
  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  driverId?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  area?: string;
}
