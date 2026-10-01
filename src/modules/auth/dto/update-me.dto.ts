// TODO: admin-only role change endpoint. Role is set only by
// POST /auth/onboarding today; admins will need a way to change it later.

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
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
      'Drop-off address for stores. Delivery staff may omit this and send only lat/lng.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  deliveryAddress?: string;

  @ApiPropertyOptional({ example: 33.5138 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  deliveryLat?: number;

  @ApiPropertyOptional({ example: 36.2765 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  deliveryLng?: number;
}
