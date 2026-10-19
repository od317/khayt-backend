import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateLocationDto {
  @ApiPropertyOptional({ example: 'دمشق' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description:
      'Set to null to make this a city. Set to a city id to make this an area.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    example: 33.5138,
    nullable: true,
    description: 'Delivery circle center latitude (cities only).',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLat?: number | null;

  @ApiPropertyOptional({
    example: 36.2765,
    nullable: true,
    description: 'Delivery circle center longitude (cities only).',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLng?: number | null;

  @ApiPropertyOptional({
    example: 18,
    nullable: true,
    description: 'Delivery circle radius in kilometers (cities only).',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  radiusKm?: number | null;
}
