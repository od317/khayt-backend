import { Injectable } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueryCategoriesDto } from './dto/query-categories.dto';

export type CategoryResponse = {
  id: string;
  name: string;
  slug: string;
  appliesTo: string;
  sortOrder: number;
};

export function toCategoryResponse(category: Category): CategoryResponse {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    appliesTo: category.appliesTo,
    sortOrder: category.sortOrder,
  };
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: QueryCategoriesDto,
  ): Promise<{ items: CategoryResponse[] }> {
    const where: Prisma.CategoryWhereInput = {};

    if (query.appliesTo) {
      where.appliesTo = query.appliesTo;
    }

    const rows = await this.prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return { items: rows.map(toCategoryResponse) };
  }
}
