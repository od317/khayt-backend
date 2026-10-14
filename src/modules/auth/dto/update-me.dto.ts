// TODO: admin-only role change endpoint. Role is set only by
// POST /auth/onboarding today; admins will need a way to change it later.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}

function parseJsonIfString({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
      return JSON.parse(trimmed) as unknown;
    }
    return [trimmed];
  }
  return value;
}

export class UpdateMeDto {
  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  availableForWork?: boolean;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({
    example: 'شارع بغداد، بناء 12',
    description:
      'Drop-off address for stores. Delivery staff may omit this and send only lat/lng. Empty string is ignored.',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  deliveryAddress?: string;

  @ApiPropertyOptional({ example: 33.5138 })
  @IsOptional()
  @Transform(emptyToUndefined)
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  deliveryLat?: number;

  @ApiPropertyOptional({ example: 36.2765 })
  @IsOptional()
  @Transform(emptyToUndefined)
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  deliveryLng?: number;

  @ApiPropertyOptional({
    example: 'نصنع ألبسة رجالية',
    description: 'Workshop/store business description.',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['خياطة', 'قص'],
    description: 'Workshop/store services list.',
  })
  @IsOptional()
  @Transform(parseJsonIfString)
  @IsArray()
  @IsString({ each: true })
  services?: string[];
}
