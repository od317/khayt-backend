import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType, PostType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
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

  /** Legacy URL list — prefer uploading `images` files. Hidden from Swagger. */
  @ApiHideProperty()
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

  /** Legacy URL — prefer uploading `video` file. Hidden from Swagger. */
  @ApiHideProperty()
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

  @ApiPropertyOptional({
    type: [String],
    example: [],
    description: 'Optional. Omit or send [] if the post has no categories.',
  })
  @IsOptional()
  @Transform(parseJsonIfString)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialty?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['خياطة', 'مهارة مخصصة'],
    description:
      'Mix of catalog skills and optional free-text skills. Custom values are stored on the post only (not in post-options).',
  })
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

  @ApiPropertyOptional({
    example: 'شهري',
    description: 'Salary type chip for job_offering (from post-options).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  salaryType?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pricing?: string;

  @ApiPropertyOptional({
    example: 'في المشغل',
    description: 'Where the service is done (from post-options).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  servicePlace?: string;

  @ApiPropertyOptional({
    example: 'جملة',
    description: 'Sell method for product_offering (from post-options).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sellMethod?: string;

  @ApiPropertyOptional({
    example: 'سعر ثابت',
    description: 'Price method for product_offering (from post-options).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  priceMethod?: string;

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
