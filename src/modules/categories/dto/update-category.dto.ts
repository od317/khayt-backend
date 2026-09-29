import { ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryApplies } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'قمصان' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'qumsan' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z][a-z0-9-]*$/, {
    message: 'must be a lowercase slug (letters, numbers, hyphen)',
  })
  @MaxLength(80)
  slug?: string;

  @ApiPropertyOptional({ enum: CategoryApplies, example: CategoryApplies.both })
  @IsOptional()
  @IsEnum(CategoryApplies)
  appliesTo?: CategoryApplies;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
