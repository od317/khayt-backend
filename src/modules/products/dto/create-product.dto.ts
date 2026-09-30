import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const ALLOWED_UNITS = ['قطعة', 'متر', 'طقم', 'دورة'] as const;

export class ProductVariantLeafDto {
  @ApiProperty({ example: 'M' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '/uploads/products/size-m.jpg' })
  @IsString()
  @IsNotEmpty()
  image!: string;

  @ApiPropertyOptional({ example: '#FFFFFF' })
  @IsOptional()
  @IsString()
  hex?: string;
}

export class ProductVariantOptionDto {
  @ApiProperty({ example: 'أحمر' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '/uploads/products/red.jpg' })
  @IsString()
  @IsNotEmpty()
  image!: string;

  @ApiPropertyOptional({ example: '#FF0000' })
  @IsOptional()
  @IsString()
  hex?: string;

  @ApiPropertyOptional({ type: () => [ProductVariantLeafDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantLeafDto)
  children?: ProductVariantLeafDto[];
}

export class ProductVariantAxisDto {
  @ApiProperty({ example: 'color', description: 'color, flavor, size, …' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ example: 'لون' })
  @IsString()
  @IsNotEmpty()
  label!: string;
}

@ValidatorConstraint({ name: 'productVariantsTree', async: false })
export class ProductVariantsTreeConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as ProductVariantsDto;
    const axisCount = dto.axes?.length ?? 0;
    const options = dto.options ?? [];
    if (axisCount === 1) {
      return options.every((o) => !o.children || o.children.length === 0);
    }
    if (axisCount === 2) {
      return options.every(
        (o) => Array.isArray(o.children) && o.children.length > 0,
      );
    }
    return false;
  }

  defaultMessage(): string {
    return 'variants.options must match axes (1 level: no children; 2 levels: every option has children)';
  }
}

export class ProductVariantsDto {
  @ApiProperty({ type: () => [ProductVariantAxisDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantAxisDto)
  axes!: ProductVariantAxisDto[];

  @ApiProperty({ type: () => [ProductVariantOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantOptionDto)
  @Validate(ProductVariantsTreeConstraint)
  options!: ProductVariantOptionDto[];
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

  @ApiPropertyOptional({ type: () => ProductVariantsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductVariantsDto)
  variants?: ProductVariantsDto;

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
