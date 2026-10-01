import { OrderStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export function parseActiveQueryFlag(active: unknown): boolean | undefined {
  const value = Array.isArray(active) ? active[0] : active;
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === false) {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }
  return undefined;
}

export class QueryOrdersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'true (default) = hide delivered/cancelled/failed. false = only those completed orders.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseActiveQueryFlag(value))
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
