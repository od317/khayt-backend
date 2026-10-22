import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  nestedJson,
  ProductDiscountDto,
  ProductPackagingDto,
  ProductSaleRuleDto,
  ProductVariantsDto,
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
    nullable: true,
    description:
      'Lock color or size as a full set. Pass null to clear. Must match variants.axes.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === 'null') return null;
    return nestedJson(ProductSaleRuleDto)({ value });
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @ValidateNested()
  @Type(() => ProductSaleRuleDto)
  saleRule?: ProductSaleRuleDto | null;

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
    example: true,
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
      'Workshop business that supplies this product (platform still owns it). Pass null to clear.',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  supplierBusinessId?: string | null;
}
