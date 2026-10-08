import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class AddCartItemDto {
    @ApiProperty({ example: 'prod-qamis-abyad' })
    @IsString()
    productId!: string;

    @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 10000 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10000)
    quantity?: number;

    @ApiPropertyOptional({
        example: { color: 'أبيض', size: 'L' },
        description:
            'Selected variant options for the product. Keys match the product variant axes.',
    })
    @IsOptional()
    @IsObject()
    variant?: Record<string, string>;
}