import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProductNamesQueryDto {
    @ApiPropertyOptional({
        example: 'biz-workshop',
        description:
            'Restrict to a specific business. Must be owned by the current user (or any, for admins).',
    })
    @IsOptional()
    @IsString()
    businessId?: string;
}