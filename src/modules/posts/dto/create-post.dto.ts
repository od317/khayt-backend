import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType, PostType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export function parseJsonIfString({ value }: { value: unknown }): unknown {
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

export class CreatePostDto {
  @ApiProperty({ enum: PostType, example: PostType.job_seeking })
  @IsEnum(PostType)
  type!: PostType;

  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location!: string;

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
    description: 'Post photos. Repeat this field, up to 8 files.',
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
    description: 'Video file for a reel (field name: video).',
  })
  @IsOptional()
  video?: unknown;

  @ApiProperty({ type: [String], example: [''] })
  @Transform(parseJsonIfString)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  categoryIds!: string[];

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  businessId?: string;

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
}
