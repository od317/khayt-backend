import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ProductColorDto,
  ProductDiscountDto,
  ProductPackagingDto,
} from './create-product.dto';

const ALLOWED_UNITS = ['قطعة', 'متر', 'طقم', 'دورة'] as const;

export class UpdateProductDto {
  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: ALLOWED_UNITS, example: 'قطعة' })
  @IsOptional()
  @IsIn(ALLOWED_UNITS)
  unit?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ type: [String], example: [''] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ type: () => [ProductColorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductColorDto)
  colors?: ProductColorDto[];

  @ApiPropertyOptional({ type: [String], example: [''] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @ApiPropertyOptional({ type: () => ProductPackagingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductPackagingDto)
  packaging?: ProductPackagingDto;

  @ApiPropertyOptional({ type: () => ProductDiscountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductDiscountDto)
  discount?: ProductDiscountDto;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  offer?: string;
}
