import { CategoryApplies } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryCategoriesDto {
  @IsOptional()
  @IsEnum(CategoryApplies)
  appliesTo?: CategoryApplies;
}
