import { ApiPropertyOptional } from '@nestjs/swagger';
import { PostOptionKind, PostType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdatePostOptionDto {
  @ApiPropertyOptional({ enum: PostOptionKind })
  @IsOptional()
  @IsEnum(PostOptionKind)
  kind?: PostOptionKind;

  @ApiPropertyOptional({ enum: PostType, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(PostType, { each: true })
  postTypes?: PostType[];

  @ApiPropertyOptional({ example: 'خياطة' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({
    example: null,
    description: 'Set to null to detach from a parent specialty.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
