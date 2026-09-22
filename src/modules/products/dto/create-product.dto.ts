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
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  hex!: string;

  @IsString()
  @IsNotEmpty()
  image!: string;

  @IsArray()
  @IsString({ each: true })
  sizes!: string[];
}

export class ProductPackagingDto {
  @IsOptional()
  @IsBoolean()
  onlyPackage?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  unitsPerPackage?: number;

  @IsOptional()
  @IsString()
  label?: string;
}

export class ProductDiscountDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  percent!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  originalPrice!: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsIn(ALLOWED_UNITS)
  unit!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductColorDto)
  colors?: ProductColorDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductPackagingDto)
  packaging?: ProductPackagingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductDiscountDto)
  discount?: ProductDiscountDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  offer?: string;
}
