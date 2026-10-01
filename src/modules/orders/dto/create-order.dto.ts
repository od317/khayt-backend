import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateOrderLineDto {
  @ApiProperty({ example: '' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: () => [CreateOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lines!: CreateOrderLineDto[];

  @ApiPropertyOptional({
    example: 'شارع بغداد، بناء 12',
    description:
      'Street address for drop-off. Required on the first order; later orders reuse the saved pin.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    example: 33.5138,
    description: 'Map latitude. Required with address and lng on the first order.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    example: 36.2765,
    description: 'Map longitude. Required with address and lat on the first order.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}
