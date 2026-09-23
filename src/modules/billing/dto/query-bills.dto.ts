import { BillStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryBillsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
