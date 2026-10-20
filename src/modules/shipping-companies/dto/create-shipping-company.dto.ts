import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
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

export class CreateShippingCompanyDto {
  @ApiProperty({ example: 'شركة الشام للشحن' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'دمشق - المزة' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location!: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  verified?: boolean;

  @ApiProperty({
    type: [String],
    example: ['دمشق', 'ريف دمشق', 'حمص'],
    description: 'Areas this company covers.',
  })
  @Transform(toStringArray)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  coverage!: string[];

  @ApiProperty({ example: '24 ساعة' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deliveryTime!: string;

  @ApiPropertyOptional({ example: 'يبدأ من 5000 ل.س' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pricing?: string;

  @ApiPropertyOptional({ example: '5 شاحنات + 2 فان' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fleet?: string;

  @ApiProperty({ example: '0994123456' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/company.jpg',
    description: 'Public image URL for the company card.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}