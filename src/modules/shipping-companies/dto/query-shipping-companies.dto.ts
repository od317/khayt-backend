import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBooleanString,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryShippingCompaniesDto extends PaginationDto {
    @ApiPropertyOptional({ example: 'الشام' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    q?: string;

    @ApiPropertyOptional({ example: 'دمشق' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    location?: string;

    @ApiPropertyOptional({ enum: ['true', 'false'] })
    @IsOptional()
    @IsBooleanString()
    verified?: string;
}