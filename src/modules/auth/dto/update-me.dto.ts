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
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  availableForWork?: boolean;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/photos/me.jpg',
    description:
      'Either a remote URL (string) or a multipart file under the same field name `avatarUrl`. File wins over URL. Also accepted as multipart field `image`.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Multipart file for `avatarUrl` is handled by multer; ignore non-strings here.
    if (value === null || value === undefined) return undefined;
    if (typeof value !== 'string') return undefined;
    if (value.trim() === '') return undefined;
    return value;
  })
  @IsString()
  @MaxLength(2000)
  avatarUrl?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description:
      'Profile photo file (multipart). Field name: `image` or `avatarUrl`. JPG/PNG/WebP, max 8MB → /uploads/avatars/.',
  })
  @IsOptional()
  image?: never;

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
