import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category, CategoryApplies, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

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

const BUSINESS_CATEGORY_SCOPES: CategoryApplies[] = [
  CategoryApplies.business,
  CategoryApplies.workshop,
  CategoryApplies.institute,
  CategoryApplies.store,
];

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) { }



  async list(
    query: QueryCategoriesDto,
  ): Promise<{ items: CategoryResponse[] }> {
    const where: Prisma.CategoryWhereInput = {};

    if (query.appliesTo && query.appliesTo.length > 0) {
      // Explicit filter — return exactly what was asked for.
      where.appliesTo = { in: query.appliesTo };
    } else {
      // No filter — hide all business-scoped categories by default.
      where.appliesTo = { notIn: BUSINESS_CATEGORY_SCOPES };
    }

    const rows = await this.prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return { items: rows.map(toCategoryResponse) };
  }

  async create(
    dto: CreateCategoryDto,
  ): Promise<{ category: CategoryResponse }> {
    try {
      const category = await this.prisma.category.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          appliesTo: dto.appliesTo,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      return { category: toCategoryResponse(category) };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          error: 'conflict',
          message: 'A category with this slug already exists',
        });
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<{ category: CategoryResponse }> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Category not found',
      });
    }

    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.appliesTo !== undefined) data.appliesTo = dto.appliesTo;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    try {
      const category = await this.prisma.category.update({ where: { id }, data });
      return { category: toCategoryResponse(category) };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          error: 'conflict',
          message: 'A category with this slug already exists',
        });
      }
      throw error;
    }
  }

  async remove(id: string): Promise<{ success: true }> {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } } },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Category not found',
      });
    }

    if (existing._count.posts > 0) {
      throw new ConflictException({
        error: 'conflict',
        message: 'Category is assigned to one or more posts',
      });
    }

    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }
}
