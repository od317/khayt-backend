import { MediaType, PostType } from '@prisma/client';
import {
  IsArray,
  IsBooleanString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { Transform } from 'class-transformer';

function toArray({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
}

export class QueryPostsDto extends PaginationDto {
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(PostType, { each: true })
  type?: PostType[];



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

  @IsOptional()
  @IsBooleanString()
  forMe?: string;

}
