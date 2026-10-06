import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Business, CategoryApplies, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import {
  BusinessResponse,
  SupplyLineResponse,
  toBusinessResponse,
  toSupplyLineResponse,
} from './businesses.mapper';
import { CreateBusinessDto } from './dto/create-business.dto';
import { QueryBusinessesDto } from './dto/query-businesses.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import {
  ProductResponse,
  toProductResponse,
} from '../products/products.mapper';

export type BusinessDetailResponse = {
  business: BusinessResponse;
  products: ProductResponse[];
  supply?: SupplyLineResponse[];
  isOwner: boolean;
};

const BUSINESS_INCLUDE = {
  categories: {
    include: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
} as const;

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) { }

  async list(query: QueryBusinessesDto): Promise<Paginated<BusinessResponse>> {
    const where: Prisma.BusinessWhereInput = {};

    if (query.type) where.type = query.type;

    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // 👇 NEW filters
    if (query.categoryId && query.categoryId.length > 0) {
      where.categories = {
        some: { categoryId: { in: query.categoryId } },
      };
    }

    if (query.verified === 'true') where.verified = true;
    if (query.verified === 'false') where.verified = false;

    if (query.ownerId) where.ownerId = query.ownerId;

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: BUSINESS_INCLUDE,
      }),
      this.prisma.business.count({ where }),
    ]);

    return paginate(
      rows.map(toBusinessResponse),
      total,
      query.page,
      query.limit,
    );
  }

  async detail(
    id: string,
    actor: AuthenticatedUser | undefined,
  ): Promise<BusinessDetailResponse> {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: BUSINESS_INCLUDE,
    });
    if (!business) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Business not found',
      });
    }

    const products = await this.prisma.product.findMany({
      where: { businessId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const supplies = await this.prisma.supply.findMany({
      where: { businessId: id },
      include: {
        product: { select: { name: true, unit: true, deletedAt: true } },
      },
    });

    const visibleSupplies = supplies.filter(
      (s) => s.product.deletedAt === null,
    );

    const isOwner = actor !== undefined && actor.id === business.ownerId;

    const response: BusinessDetailResponse = {
      business: toBusinessResponse(business),
      products: products.map(toProductResponse),
      isOwner,
    };

    if (visibleSupplies.length > 0) {
      response.supply = visibleSupplies.map((s) =>
        toSupplyLineResponse(s, s.product.name, s.product.unit),
      );
    }

    return response;
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateBusinessDto,
  ): Promise<{ business: BusinessResponse }> {
    const existing = await this.prisma.business.findUnique({
      where: { ownerId: actor.id },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException({
        error: 'already_has_business',
        message: 'You already own a business',
      });
    }

    const categoryIds = [...new Set(dto.categoryIds ?? [])];
    if (categoryIds.length > 0) {
      await this.assertBusinessCategories(categoryIds);
    }

    const business = await this.prisma.business.create({
      data: {
        ownerId: actor.id,
        type: dto.type,
        name: dto.name,
        location: dto.location,
        description: dto.description ?? null,
        phone: dto.phone ?? null,
        capacity: dto.capacity ?? null,
        equipment: dto.equipment ?? null,
        minOrder: dto.minOrder ?? null,
        experience: dto.experience ?? null,
        services: dto.services ?? [],
        duration: dto.duration ?? null,
        topics: dto.topics ?? [],
        ...(categoryIds.length > 0
          ? {
            categories: {
              create: categoryIds.map((categoryId) => ({ categoryId })),
            },
          }
          : {}),
      },
      include: BUSINESS_INCLUDE,
    });

    return { business: toBusinessResponse(business) };
  }

  async update(
    id: string,
    dto: UpdateBusinessDto,
  ): Promise<{ business: BusinessResponse }> {
    if (dto.categoryIds !== undefined) {
      await this.assertBusinessCategories(dto.categoryIds);
    }

    const business = await this.prisma.$transaction(
      async (tx): Promise<Business & { categories: any[] }> => {
        const data: Prisma.BusinessUpdateInput = {};
        if (dto.type !== undefined) data.type = dto.type;
        if (dto.name !== undefined) data.name = dto.name;
        if (dto.location !== undefined) data.location = dto.location;
        if (dto.description !== undefined) data.description = dto.description;
        if (dto.phone !== undefined) data.phone = dto.phone;
        if (dto.capacity !== undefined) data.capacity = dto.capacity;
        if (dto.equipment !== undefined) data.equipment = dto.equipment;
        if (dto.minOrder !== undefined) data.minOrder = dto.minOrder;
        if (dto.experience !== undefined) data.experience = dto.experience;
        if (dto.services !== undefined) data.services = dto.services;
        if (dto.duration !== undefined) data.duration = dto.duration;
        if (dto.topics !== undefined) data.topics = dto.topics;

        if (dto.categoryIds !== undefined) {
          await tx.businessCategory.deleteMany({ where: { businessId: id } });
          if (dto.categoryIds.length > 0) {
            await tx.businessCategory.createMany({
              data: [...new Set(dto.categoryIds)].map((categoryId) => ({
                businessId: id,
                categoryId,
              })),
            });
          }
        }

        return tx.business.update({
          where: { id },
          data,
          include: BUSINESS_INCLUDE,
        });
      },
    );

    return { business: toBusinessResponse(business) };
  }

  private async assertBusinessCategories(ids: string[]): Promise<void> {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (unique.length === 0) return;

    const rows = await this.prisma.category.findMany({
      where: { id: { in: unique } },
      select: { id: true, appliesTo: true },
    });

    if (rows.length !== unique.length) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'One or more categories do not exist',
          fields: { categoryIds: 'contains an unknown id' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const nonBusiness = rows.filter(
      (row) => row.appliesTo !== CategoryApplies.business,
    );
    if (nonBusiness.length > 0) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'One or more categories are not business categories',
          fields: { categoryIds: 'must have appliesTo="business"' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}