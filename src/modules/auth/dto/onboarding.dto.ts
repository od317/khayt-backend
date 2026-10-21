import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotIn,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const INTERNAL_ROLES = [
  UserRole.super_admin,
  UserRole.admin,
  UserRole.inventory,
  UserRole.delivery,
] as const;

function parseJsonIfString({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return JSON.parse(trimmed) as unknown;
  }
  return value;
}

export class OnboardingDto {
  @ApiProperty({ example: 'employee' })
  @IsString()
  @IsNotIn(INTERNAL_ROLES, {
    message: 'يجب أن يكون دوراً متاحاً للاختيار',
  })
  role!: string;

  @ApiProperty({ example: '' })
  @IsString()
  locationId!: string;

  @ApiPropertyOptional({
    example: 'أحمد',
    description:
      'Display name for the user account. Recommended for workshop, store, and institute.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'معمل النسيج',
    description:
      'Required when role is workshop, store, or institute. Business display name.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  businessName?: string;

  @ApiPropertyOptional({
    example: 'نصنع ألبسة رجالية',
    description: 'Required when role is workshop, store, or institute.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['خياطة', 'قص'],
    description:
      'Optional for workshop/store/institute. Enter services one by one (JSON array in multipart).',
  })
  @IsOptional()
  @Transform(parseJsonIfString)
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @ApiPropertyOptional({
    example: 5,
    description:
      'Required when role is workshop, store, or institute. Years of experience.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  experienceYears?: number;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Optional business image for workshop, store, or institute.',
  })
  @IsOptional()
  image?: unknown;
}
