import { DeliveryStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryDeliveriesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
