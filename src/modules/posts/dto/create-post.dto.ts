import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType, PostType } from '@prisma/client';
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

  @ApiPropertyOptional({ type: [String], example: [''] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  @ApiProperty({ type: [String], example: [''] })
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
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ type: [String], example: [''] })
  @IsOptional()
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
