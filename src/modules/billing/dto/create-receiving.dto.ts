import { PaymentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateReceivingLineDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice!: number;
}

export class CreateReceivingDto {
  @IsString()
  businessId!: string;

  @IsEnum(PaymentType)
  paymentType!: PaymentType;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateReceivingLineDto)
  lines!: CreateReceivingLineDto[];
}
