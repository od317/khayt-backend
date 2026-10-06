import { ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryApplies } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';

/** Accepts a single value, an array, or comma-separated values → always array. */
function toArray({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
}

export class QueryCategoriesDto {
  @ApiPropertyOptional({
    enum: CategoryApplies,
    isArray: true,
    example: [CategoryApplies.workshop, CategoryApplies.institute],
    description:
      'Filter by scope. Repeat the query (?appliesTo=workshop&appliesTo=institute) or send comma-separated (?appliesTo=workshop,institute). Omit to hide business-scoped categories.',
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(CategoryApplies, { each: true })
  appliesTo?: CategoryApplies[];
}