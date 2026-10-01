import { ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { parseJsonIfString } from './create-post.dto';

export class UpdatePostDto {
  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ enum: MediaType })
  @IsOptional()
  @IsEnum(MediaType)
  media?: MediaType;

  @ApiPropertyOptional({
    type: [String],
    deprecated: true,
    description:
      'Use the images file field instead. Ignored when files are uploaded.',
  })
  @IsOptional()
  @Transform(parseJsonIfString)
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Replace gallery photos. Repeat this field, up to 8 files.',
  })
  @IsOptional()
  images?: unknown;

  @ApiPropertyOptional({
    example: '',
    deprecated: true,
    description:
      'Use the video file field instead. Ignored when a video file is uploaded.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Replace the reel video (field name: video).',
  })
  @IsOptional()
  video?: unknown;

  @ApiPropertyOptional({ type: [String], example: [''] })
  @IsOptional()
  @Transform(parseJsonIfString)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialty?: string;

  @ApiPropertyOptional({ type: [String], example: [''] })
  @IsOptional()
  @Transform(parseJsonIfString)
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ type: [String], example: [''] })
  @IsOptional()
  @Transform(parseJsonIfString)
  @IsArray()
  @IsString({ each: true })
  workType?: string[];

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  experience?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  salary?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pricing?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  condition?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  price?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
