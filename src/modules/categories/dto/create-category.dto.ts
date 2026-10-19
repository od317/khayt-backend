import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateCategoryDto {
  @ApiProperty({ example: 'قمصان' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'qumsan' })
  @IsString()
  @Matches(/^[a-z][a-z0-9-]*$/, {
    message: 'يجب أن يكون معرفاً بأحرف صغيرة (حروف، أرقام، شرطة)',
  })
  @MaxLength(80)
  slug!: string;

  @ApiProperty({ enum: CategoryApplies, example: CategoryApplies.both })
  @IsEnum(CategoryApplies)
  appliesTo!: CategoryApplies;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
