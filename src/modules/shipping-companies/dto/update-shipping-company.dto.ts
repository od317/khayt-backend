import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function toStringArray({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
      return JSON.parse(trimmed) as unknown;
    }
    return trimmed
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return value;
}

function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

export class UpdateShippingCompanyDto {
  @ApiPropertyOptional({ example: 'شركة الشام للشحن' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'دمشق - المزة' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['دمشق', 'حمص'] })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  coverage?: string[];

  @ApiPropertyOptional({ example: '48 ساعة' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deliveryTime?: string;

  @ApiPropertyOptional({ example: 'يبدأ من 3000 ل.س' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pricing?: string;

  @ApiPropertyOptional({ example: '3 شاحنات' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fleet?: string;

  @ApiPropertyOptional({ example: '0994123456' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/company.jpg',
    nullable: true,
    description: 'Public image URL for the company card.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;
}