import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProductNamesQueryDto {
    @ApiPropertyOptional({
        example: 'biz-workshop',
        description:
            'Restrict to a specific business. Must be owned by the current user.',
    })
    @IsOptional()
    @IsString()
    businessId?: string;
}