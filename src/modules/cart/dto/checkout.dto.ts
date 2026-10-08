import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CheckoutDto {
    @ApiPropertyOptional({
        example: 'دمشق - المزة - شارع الجلاء',
        description:
            'Delivery address. Required on the first order; afterwards the saved address is reused.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

    @ApiPropertyOptional({ example: 33.5138 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    lat?: number;

    @ApiPropertyOptional({ example: 36.2765 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    lng?: number;
}