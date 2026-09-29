import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ example: '' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice!: number;
}

export class CreateReceivingDto {
  @ApiProperty({ example: '' })
  @IsString()
  businessId!: string;

  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  paymentType!: PaymentType;

  @ApiProperty({ type: () => [CreateReceivingLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateReceivingLineDto)
  lines!: CreateReceivingLineDto[];
}
