import { ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryApplies } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryCategoriesDto {
  @ApiPropertyOptional({ enum: CategoryApplies, example: CategoryApplies.both })
  @IsOptional()
  @IsEnum(CategoryApplies)
  appliesTo?: CategoryApplies;
}
