import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform, plainToInstance } from 'class-transformer';
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
  IsUUID,
  MaxLength,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const ALLOWED_UNITS = ['قطعة', 'متر', 'طقم', 'دورة'] as const;

export function parseJsonIfString({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  return JSON.parse(trimmed) as unknown;
}

export function nestedJson<T extends object>(cls: new () => T) {
  return ({ value }: { value: unknown }): T | undefined => {
    const parsed = parseJsonIfString({ value });
    if (parsed === undefined || parsed === null) {
      return undefined;
    }
    return plainToInstance(cls, parsed);
  };
}

export class ProductVariantLeafDto {
  @ApiProperty({ example: 'M' })
  @IsString()
  @IsNotEmpty()
  name!: string;

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

  @ApiPropertyOptional({ example: '#FF0000' })
  @IsOptional()
  @IsString()
  hex?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Optional. Prefer uploading files as variant_0, variant_0_img_1, … — stored as images[] on the color option.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

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

/**
 * When set, quantity 1 buys every option of this axis (e.g. all 3 colors).
 * The buyer cannot pick that axis in the cart.
 */
export class ProductSaleRuleDto {
  @ApiProperty({
    enum: ['color', 'size'],
    example: 'color',
    description:
      'Axis sold as a full set. `color` = all colors together; `size` = all sizes together. Must exist on `variants.axes`.',
  })
  @IsIn(['color', 'size'])
  lockedAxis!: 'color' | 'size';
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

  @ApiPropertyOptional({ type: () => ProductVariantsDto })
  @IsOptional()
  @Transform(nestedJson(ProductVariantsDto))
  @ValidateNested()
  @Type(() => ProductVariantsDto)
  variants?: ProductVariantsDto;

  @ApiPropertyOptional({ type: () => ProductPackagingDto })
  @IsOptional()
  @Transform(nestedJson(ProductPackagingDto))
  @ValidateNested()
  @Type(() => ProductPackagingDto)
  packaging?: ProductPackagingDto;

  @ApiPropertyOptional({
    type: () => ProductSaleRuleDto,
    description:
      'Optional. Lock color or size so qty 1 includes every option of that axis; buyer cannot pick it.',
  })
  @IsOptional()
  @Transform(nestedJson(ProductSaleRuleDto))
  @ValidateNested()
  @Type(() => ProductSaleRuleDto)
  saleRule?: ProductSaleRuleDto;

  @ApiPropertyOptional({ type: () => ProductDiscountDto })
  @IsOptional()
  @Transform(nestedJson(ProductDiscountDto))
  @ValidateNested()
  @Type(() => ProductDiscountDto)
  discount?: ProductDiscountDto;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  offer?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the product includes a guarantee.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  guarantee?: boolean;

  @ApiPropertyOptional({
    example: 'biz-workshop-uuid',
    description:
      'Workshop business that supplies this product (platform still owns it).',
  })
  @IsOptional()
  @IsUUID()
  supplierBusinessId?: string;
}
