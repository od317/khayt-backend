import { MediaType, PostType } from '@prisma/client';
import {
  IsBooleanString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryPostsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsEnum(MediaType)
  media?: MediaType;

  @IsOptional()
  @IsBooleanString()
  active?: string;

  @IsOptional()
  @IsIn(['me'])
  savedBy?: 'me';
}
