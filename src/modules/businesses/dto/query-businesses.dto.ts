import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBooleanString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

function toArray({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  return Array.isArray(value) ? value : [value];
}

export class QueryBusinessesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: BusinessType })
  @IsOptional()
  @IsEnum(BusinessType)
  type?: BusinessType;

  @ApiPropertyOptional({ example: 'دمشق' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'معمل' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  // 👇 NEW: filter by business category IDs (repeatable)
  @ApiPropertyOptional({
    type: [String],
    example: ['cat-biz-workshop'],
    description: 'Filter by one or more business category IDs.',
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  categoryId?: string[];

  // 👇 NEW: filter by verified flag
  @ApiPropertyOptional({ example: 'true', enum: ['true', 'false'] })
  @IsOptional()
  @IsBooleanString()
  verified?: string;

  // 👇 NEW: filter to businesses owned by a specific user
  @ApiPropertyOptional({ example: 'user-1' })
  @IsOptional()
  @IsString()
  ownerId?: string;
}