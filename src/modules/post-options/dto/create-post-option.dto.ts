import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostOptionKind, PostType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePostOptionDto {
  @ApiProperty({ enum: PostOptionKind, example: PostOptionKind.specialty })
  @IsEnum(PostOptionKind)
  kind!: PostOptionKind;

  @ApiProperty({
    enum: PostType,
    isArray: true,
    example: [PostType.job_offering],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(PostType, { each: true })
  postTypes!: PostType[];

  @ApiProperty({ example: 'خياطة' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  label!: string;

  @ApiPropertyOptional({
    example: '',
    description: 'Required for skills — must be a specialty option id.',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

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
