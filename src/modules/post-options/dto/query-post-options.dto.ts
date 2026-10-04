import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostOptionKind, PostType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryPostOptionsDto {
  @ApiProperty({ enum: PostType, example: PostType.job_offering })
  @IsEnum(PostType)
  type!: PostType;
}

export class QueryAdminPostOptionsDto {
  @ApiPropertyOptional({ enum: PostOptionKind })
  @IsOptional()
  @IsEnum(PostOptionKind)
  kind?: PostOptionKind;

  @ApiPropertyOptional({ enum: PostType })
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;
}
