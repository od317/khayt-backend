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

  @ApiPropertyOptional({
    example: 'prod-qamis-abyad',
    description:
      'Optional. Set to null or empty string to unlink the current product.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  productId?: string | null;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description:
      'Optional new cover image for a reel. If omitted, the existing thumbnail is kept.',
  })
  @IsOptional()
  thumbnail?: unknown;

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

  @ApiPropertyOptional({
    example: 'إنتاج/صناعة',
    description:
      'Optional free-text. Catalog labels from GET /post-options are suggested but not required.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
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

  @ApiPropertyOptional({
    example: '3 سنوات',
    description:
      'Free-form experience text from the client (any format, e.g. "3", "3 سنوات", "1-2 years").',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value);
  })
  @IsString()
  @MaxLength(200)
  experience?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  salary?: string;

  @ApiPropertyOptional({ example: 'شهري' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  salaryType?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pricing?: string;

  @ApiPropertyOptional({ example: 'في المشغل' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  servicePlace?: string;

  @ApiPropertyOptional({ example: 'جملة' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sellMethod?: string;

  @ApiPropertyOptional({ example: 'سعر ثابت' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  priceMethod?: string;

  @ApiPropertyOptional({
    example: 'ليرة سورية',
    description:
      'Currency chip for priced posts (from post-options kind `currency`).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  currency?: string;

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
