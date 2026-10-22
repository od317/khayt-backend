import { ApiPropertyOptional } from '@nestjs/swagger';
import { PostApprovalStatus, PostType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
    IsBooleanString,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

function toArray({ value }: { value: unknown }): unknown {
    if (value === undefined || value === null || value === '') return undefined;
    const raw = Array.isArray(value) ? value : [value];
    return raw
        .flatMap((v) => String(v).split(','))
        .map((v) => v.trim())
        .filter(Boolean);
}

export class AdminQueryPostsDto extends PaginationDto {
    @ApiPropertyOptional({ enum: PostType, isArray: true })
    @IsOptional()
    @Transform(toArray)
    @IsEnum(PostType, { each: true })
    type?: PostType[];

    @ApiPropertyOptional({ example: 'user-workshop' })
    @IsOptional()
    @IsString()
    authorId?: string;

    @ApiPropertyOptional({ example: 'biz-workshop' })
    @IsOptional()
    @IsString()
    businessId?: string;

    @ApiPropertyOptional({ example: 'دمشق' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    location?: string;

    @ApiPropertyOptional({ example: 'قمصان' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    q?: string;

    @ApiPropertyOptional({ enum: ['true', 'false'] })
    @IsOptional()
    @IsBooleanString()
    active?: string;

    @ApiPropertyOptional({
        enum: PostApprovalStatus,
        description: 'Filter by moderation status (pending / approved / rejected).',
    })
    @IsOptional()
    @IsEnum(PostApprovalStatus)
    approvalStatus?: PostApprovalStatus;

    @ApiPropertyOptional({
        enum: ['true', 'false'],
        description: 'Include soft-deleted posts. Defaults to false.',
    })
    @IsOptional()
    @IsBooleanString()
    includeDeleted?: string;
}