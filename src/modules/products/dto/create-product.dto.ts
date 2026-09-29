import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const ALLOWED_UNITS = ['قطعة', 'متر', 'طقم', 'دورة'] as const;

export class ProductColorDto {
  @ApiProperty({ example: '' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @IsNotEmpty()
  hex!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @IsNotEmpty()
  image!: string;

  @ApiProperty({ type: [String], example: [''] })
  @IsArray()
  @IsString({ each: true })
  sizes!: string[];
}

export class ProductPackagingDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  onlyPackage?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  unitsPerPackage?: number;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class ProductDiscountDto {
  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  percent!: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  originalPrice!: number;
}

export class CreateProductDto {
  @ApiProperty({ example: '' })
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: '' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: ALLOWED_UNITS, example: 'قطعة' })
  @IsIn(ALLOWED_UNITS)
  unit!: string;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;

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
