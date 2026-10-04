import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ProductResponse,
  toProductResponse,
  withBusiness,
} from './products.mapper';
import {
  applyVariantImageFiles,
  galleryPaths,
} from './product-uploads';

export type ProductDetailResponse = {
  product: ProductResponse;
  business: {
    id: string;
    type: string;
    name: string;
    location: string;
    description: string | null;
    phone: string | null;
    imageUrl: string | null;
    verified: boolean;
  };
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

  async list(query: QueryProductsDto): Promise<Paginated<ProductResponse>> {
    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (query.businessId) where.businessId = query.businessId;
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
    if (query.location) {
      where.business = {
        location: { contains: query.location, mode: 'insensitive' },
      };
    }

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { business: { select: { name: true, location: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(
      rows.map((p) => withBusiness(p, p.business.name, p.business.location)),
      total,
      query.page,
      query.limit,
    );
  }

  async detail(id: string): Promise<ProductDetailResponse> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { business: true },
    });

    if (!product) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Product not found',
      });
    }

    const response: ProductDetailResponse = {
      product: toProductResponse(product),
      business: {
        id: product.business.id,
        type: product.business.type,
        name: product.business.name,
        location: product.business.location,
        description: product.business.description,
        phone: product.business.phone,
        imageUrl: product.business.imageUrl,
        verified: product.business.verified,
      },
    };

    if (product.inWarehouse) {
      const supply = await this.prisma.supply.findUnique({
        where: {
          businessId_productId: {
            businessId: product.businessId,
            productId: product.id,
          },
        },
        select: { remaining: true },
      });
      response.availableQuantity = supply?.remaining ?? 0;
    }

    return response;
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateProductDto,
    files?: Express.Multer.File[],
  ): Promise<{ product: ProductResponse }> {
    await this.assertCanManageBusiness(actor, dto.businessId);

    const uploaded = galleryPaths(files ?? []);
    const variants = applyVariantImageFiles(dto.variants, files ?? []);

    const product = await this.prisma.product.create({
      data: {
        businessId: dto.businessId,
        name: dto.name,
        category: dto.category,
        description: dto.description ?? null,
        unit: dto.unit,
        price: dto.price,
        images: uploaded,
        inWarehouse: false,
        guarantee: dto.guarantee ?? false,
        variants: variants ? toJson(variants) : Prisma.JsonNull,
        packaging: dto.packaging ? toJson(dto.packaging) : Prisma.JsonNull,
        discount: dto.discount ? toJson(dto.discount) : Prisma.JsonNull,
        offer: dto.offer ?? null,
      },
    });

    return { product: toProductResponse(product) };
  }

  async update(
    id: string,
    actor: AuthenticatedUser,
    dto: UpdateProductDto,
    files?: Express.Multer.File[],
  ): Promise<{ product: ProductResponse }> {
    const existing = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: { businessId: true, variants: true },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Product not found',
      });
    }
    await this.assertCanManageBusiness(actor, existing.businessId);

    const uploaded = galleryPaths(files ?? []);
    const variants = applyVariantImageFiles(
      dto.variants,
      files ?? [],
      existing.variants,
    );

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

    const product = await this.prisma.product.update({
      where: { id },
      data,
    });

    return { product: toProductResponse(product) };
  }

  async remove(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ product: ProductResponse; softDeleted: true }> {
    const existing = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: { businessId: true },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Product not found',
      });
    }
    await this.assertCanManageBusiness(actor, existing.businessId);

    const orderLineCount = await this.prisma.orderLine.count({
      where: { productId: id },
    });

    if (orderLineCount > 0) {
      throw new ConflictException({
        error: 'product_has_orders',
        message: 'Product has been ordered and cannot be deleted',
      });
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { product: toProductResponse(product), softDeleted: true };
  }

  private async assertCanManageBusiness(
    actor: AuthenticatedUser,
    businessId: string,
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Business not found',
      });
    }

    if (
      actor.role === UserRole.admin ||
      actor.role === UserRole.super_admin
    ) {
      return;
    }

    if (business.ownerId !== actor.id) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Not the owner of this business',
      });
    }
  }
}
