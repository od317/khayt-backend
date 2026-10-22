import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessType, Prisma, Product } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponse, toProductResponse } from './products.mapper';
import { applyVariantImageFiles, galleryPaths } from './product-uploads';
import {
  assertSaleRuleMatchesVariants,
  assertVariantColorSizePacks,
  parseSaleRuleStored,
} from './sale-rule';

export type ProductDetailResponse = {
  product: ProductResponse;
  availableQuantity?: number;
};

// DTO instances are structurally valid JSON, but class instances lack the
// index signature Prisma's InputJsonValue requires. A round-trip through
// JSON produces a plain object Prisma accepts, and normalizes nested DTO
// instances inside arrays (e.g. variants.options[]).
function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertWorkshopSupplier(businessId: string): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, type: true },
    });
    if (!business) {
      throw new NotFoundException({
        error: 'not_found',
        resource: 'business',
        message: 'نشاط المورد غير موجود',
      });
    }
    if (business.type !== BusinessType.workshop) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'المورد يجب أن يكون ورشة',
        fields: { supplierBusinessId: 'يجب أن تكون ورشة' },
      });
    }
  }

  async list(query: QueryProductsDto): Promise<Paginated<ProductResponse>> {
    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (query.category) where.category = query.category;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.inWarehouse !== undefined) {
      where.inWarehouse = query.inWarehouse === 'true';
    }

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(
      rows.map((p) => toProductResponse(p)),
      total,
      query.page,
      query.limit,
    );
  }

  async names(
    _actor: AuthenticatedUser,
  ): Promise<{ items: { id: string; name: string }[] }> {
    const rows = await this.prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    return { items: rows };
  }

  async detail(id: string): Promise<ProductDetailResponse> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'المنتج غير موجود',
      });
    }

    const response: ProductDetailResponse = {
      product: toProductResponse(product),
    };

    if (product.inWarehouse) {
      const supply = await this.prisma.supply.findUnique({
        where: { productId: product.id },
        select: { remaining: true },
      });
      response.availableQuantity = supply?.remaining ?? 0;
    }

    return response;
  }

  /**
   * Similar products for a product detail page.
   * Prefers same category, then fills with other available products.
   */
  async listSimilar(
    id: string,
    query: PaginationDto,
  ): Promise<Paginated<ProductResponse>> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, category: true },
    });
    if (!product) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'المنتج غير موجود',
      });
    }

    const orderBy = [{ createdAt: 'desc' as const }];

    const baseWhere: Prisma.ProductWhereInput = {
      deletedAt: null,
      available: true,
      id: { not: product.id },
    };

    const preferredWhere: Prisma.ProductWhereInput = {
      ...baseWhere,
      category: { equals: product.category, mode: 'insensitive' },
    };
    const fillerWhere: Prisma.ProductWhereInput = {
      ...baseWhere,
      NOT: {
        category: { equals: product.category, mode: 'insensitive' },
      },
    };

    const [preferredTotal, fillerTotal] = await Promise.all([
      this.prisma.product.count({ where: preferredWhere }),
      this.prisma.product.count({ where: fillerWhere }),
    ]);
    const total = preferredTotal + fillerTotal;
    const { skip, take } = skipTake(query.page, query.limit);

    if (total === 0 || skip >= total) {
      return paginate([], total, query.page, query.limit);
    }

    let rows: Product[] = [];

    if (skip + take <= preferredTotal) {
      rows = await this.prisma.product.findMany({
        where: preferredWhere,
        orderBy,
        skip,
        take,
      });
    } else if (skip >= preferredTotal) {
      rows = await this.prisma.product.findMany({
        where: fillerWhere,
        orderBy,
        skip: skip - preferredTotal,
        take,
      });
    } else {
      const preferredTake = preferredTotal - skip;
      const [preferred, fillers] = await Promise.all([
        this.prisma.product.findMany({
          where: preferredWhere,
          orderBy,
          skip,
          take: preferredTake,
        }),
        this.prisma.product.findMany({
          where: fillerWhere,
          orderBy,
          skip: 0,
          take: take - preferredTake,
        }),
      ]);
      rows = [...preferred, ...fillers];
    }

    return paginate(
      rows.map((row) => toProductResponse(row)),
      total,
      query.page,
      query.limit,
    );
  }

  async create(
    _actor: AuthenticatedUser,
    dto: CreateProductDto,
    files?: Express.Multer.File[],
  ): Promise<{ product: ProductResponse }> {
    if (dto.supplierBusinessId) {
      await this.assertWorkshopSupplier(dto.supplierBusinessId);
    }

    const uploaded = galleryPaths(files ?? []);
    const variants = applyVariantImageFiles(dto.variants, files ?? []);

    if (variants) {
      assertVariantColorSizePacks(variants);
    }
    if (dto.saleRule) {
      assertSaleRuleMatchesVariants(dto.saleRule, variants);
    }
    const storedSaleRule = dto.saleRule
      ? parseSaleRuleStored(dto.saleRule)
      : null;

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        category: dto.category,
        description: dto.description ?? null,
        unit: dto.unit,
        price: dto.price,
        images: uploaded,
        inWarehouse: false,
        guarantee: dto.guarantee ?? false,
        supplierBusinessId: dto.supplierBusinessId ?? null,
        variants: variants ? toJson(variants) : Prisma.JsonNull,
        packaging: dto.packaging ? toJson(dto.packaging) : Prisma.JsonNull,
        discount: dto.discount ? toJson(dto.discount) : Prisma.JsonNull,
        offer: dto.offer ?? null,
        saleRule: storedSaleRule ? toJson(storedSaleRule) : Prisma.JsonNull,
      },
    });

    return { product: toProductResponse(product) };
  }

  async update(
    id: string,
    _actor: AuthenticatedUser,
    dto: UpdateProductDto,
    files?: Express.Multer.File[],
  ): Promise<{ product: ProductResponse }> {
    const existing = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, variants: true, saleRule: true },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'المنتج غير موجود',
      });
    }

    const uploaded = galleryPaths(files ?? []);
    const variants = applyVariantImageFiles(
      dto.variants,
      files ?? [],
      existing.variants,
    );

    if (dto.supplierBusinessId) {
      await this.assertWorkshopSupplier(dto.supplierBusinessId);
    }

    const effectiveVariants =
      dto.variants !== undefined ? variants : existing.variants;
    const effectiveSaleRule =
      dto.saleRule !== undefined
        ? dto.saleRule === null
          ? null
          : parseSaleRuleStored(dto.saleRule)
        : parseSaleRuleStored(existing.saleRule);

    if (effectiveVariants) {
      assertVariantColorSizePacks(effectiveVariants);
    }
    if (dto.saleRule !== undefined && dto.saleRule !== null) {
      assertSaleRuleMatchesVariants(dto.saleRule, effectiveVariants);
    } else if (effectiveSaleRule) {
      assertSaleRuleMatchesVariants(effectiveSaleRule, effectiveVariants);
    }

    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.price !== undefined) data.price = dto.price;
    if (uploaded.length > 0) data.images = uploaded;
    if (dto.variants !== undefined) data.variants = toJson(variants);
    if (dto.packaging !== undefined) data.packaging = toJson(dto.packaging);
    if (dto.discount !== undefined) data.discount = toJson(dto.discount);
    if (dto.offer !== undefined) data.offer = dto.offer;
    if (dto.guarantee !== undefined) data.guarantee = dto.guarantee;
    if (dto.saleRule !== undefined) {
      if (dto.saleRule === null) {
        data.saleRule = Prisma.JsonNull;
      } else {
        const stored = parseSaleRuleStored(dto.saleRule);
        data.saleRule = stored ? toJson(stored) : Prisma.JsonNull;
      }
    }
    if (dto.supplierBusinessId !== undefined) {
      data.supplier =
        dto.supplierBusinessId === null
          ? { disconnect: true }
          : { connect: { id: dto.supplierBusinessId } };
    }

    const product = await this.prisma.product.update({
      where: { id },
      data,
    });

    return { product: toProductResponse(product) };
  }

  async remove(
    id: string,
    _actor: AuthenticatedUser,
  ): Promise<{ product: ProductResponse; softDeleted: true }> {
    const existing = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'المنتج غير موجود',
      });
    }

    const orderLineCount = await this.prisma.orderLine.count({
      where: { productId: id },
    });

    if (orderLineCount > 0) {
      throw new ConflictException({
        error: 'product_has_orders',
        message: 'المنتج مُطلَب ولا يمكن حذفه',
      });
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { product: toProductResponse(product), softDeleted: true };
  }
}
