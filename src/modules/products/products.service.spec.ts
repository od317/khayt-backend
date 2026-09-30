import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BusinessType, Product, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { ProductsService } from './products.service';

const actor: AuthenticatedUser = {
  id: 'user-1',
  role: UserRole.workshop,
  phone: '0994037669',
};

const makeBusiness = () => ({
  id: 'biz-1',
  ownerId: actor.id,
  type: BusinessType.workshop,
  name: 'معمل',
  location: 'دمشق',
  description: null,
  phone: null,
  imageUrl: null,
  verified: false,
  capacity: null,
  equipment: null,
  minOrder: null,
  experience: null,
  duration: null,
  topics: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

const makeProduct = (
  overrides: Partial<Product> = {},
): Product & { business: ReturnType<typeof makeBusiness> } => ({
  id: 'prod-1',
  businessId: 'biz-1',
  name: 'قميص',
  category: 'قمصان',
  description: null,
  images: [],
  unit: 'قطعة',
  price: 5000,
  inWarehouse: false,
  available: true,
  variants: null,
  packaging: null,
  discount: null,
  offer: null,
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
  business: makeBusiness(),
});

type PrismaMock = {
  product: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  business: { findUnique: ReturnType<typeof vi.fn> };
  supply: { findUnique: ReturnType<typeof vi.fn> };
  orderLine: { count: ReturnType<typeof vi.fn> };
};

describe('ProductsService', () => {
  let prisma: PrismaMock;
  let service: ProductsService;

  beforeEach(() => {
    prisma = {
      product: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      business: { findUnique: vi.fn() },
      supply: { findUnique: vi.fn() },
      orderLine: { count: vi.fn() },
    };

    service = new ProductsService(prisma as unknown as PrismaService);
  });

  it('creates a product with inWarehouse false', async () => {
    prisma.business.findUnique.mockResolvedValue({ ownerId: actor.id });
    prisma.product.create.mockResolvedValue(makeProduct());

    const result = await service.create(actor, {
      businessId: 'biz-1',
      name: 'قميص',
      category: 'قمصان',
      unit: 'قطعة',
      price: 5000,
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: 'biz-1',
        inWarehouse: false,
      }),
    });
    expect(result.product.inWarehouse).toBe(false);
  });

  it('stores uploaded variant images instead of URLs', async () => {
    prisma.business.findUnique.mockResolvedValue({ ownerId: actor.id });
    prisma.product.create.mockResolvedValue(makeProduct());

    await service.create(
      actor,
      {
        businessId: 'biz-1',
        name: 'قميص',
        category: 'قمصان',
        unit: 'قطعة',
        price: 5000,
        variants: {
          axes: [{ key: 'color', label: 'لون' }],
          options: [{ name: 'أحمر' }],
        },
      },
      [
        {
          fieldname: 'images',
          filename: 'gallery.jpg',
        } as Express.Multer.File,
        {
          fieldname: 'variant_0',
          filename: 'red.jpg',
        } as Express.Multer.File,
      ],
    );

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        images: ['/uploads/products/gallery.jpg'],
        variants: {
          axes: [{ key: 'color', label: 'لون' }],
          options: [{ name: 'أحمر', image: '/uploads/products/red.jpg' }],
        },
      }),
    });
  });

  it('rejects creation by a non-owner', async () => {
    prisma.business.findUnique.mockResolvedValue({ ownerId: 'someone-else' });

    const error = await service
      .create(actor, {
        businessId: 'biz-1',
        name: 'قميص',
        category: 'قمصان',
        unit: 'قطعة',
        price: 5000,
      })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('lets an admin create a product for any business', async () => {
    const admin: AuthenticatedUser = {
      id: 'admin-1',
      role: UserRole.admin,
      phone: '0994000001',
    };
    prisma.business.findUnique.mockResolvedValue({ ownerId: 'someone-else' });
    prisma.product.create.mockResolvedValue(makeProduct());

    await service.create(admin, {
      businessId: 'biz-1',
      name: 'قميص',
      category: 'قمصان',
      unit: 'قطعة',
      price: 5000,
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ businessId: 'biz-1' }),
    });
  });

  it('soft-deletes a product that has not been ordered', async () => {
    const existing = makeProduct();
    prisma.product.findFirst.mockResolvedValue(existing);
    prisma.business.findUnique.mockResolvedValue({ ownerId: actor.id });
    prisma.orderLine.count.mockResolvedValue(0);
    const softDeleted = makeProduct({ deletedAt: new Date() });
    prisma.product.update.mockResolvedValue(softDeleted);

    const result = await service.remove('prod-1', actor);

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result.softDeleted).toBe(true);
    expect(result.product.id).toBe('prod-1');
  });

  it('rejects deletion when the product has orders', async () => {
    prisma.product.findFirst.mockResolvedValue(makeProduct());
    prisma.business.findUnique.mockResolvedValue({ ownerId: actor.id });
    prisma.orderLine.count.mockResolvedValue(3);

    const error = await service
      .remove('prod-1', actor)
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      error: 'product_has_orders',
    });
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('returns availableQuantity from Supply when inWarehouse is true', async () => {
    prisma.product.findFirst.mockResolvedValue(
      makeProduct({ inWarehouse: true }),
    );
    prisma.supply.findUnique.mockResolvedValue({ remaining: 42 });

    const result = await service.detail('prod-1');

    expect(result.availableQuantity).toBe(42);
    expect(prisma.supply.findUnique).toHaveBeenCalledWith({
      where: {
        businessId_productId: {
          businessId: 'biz-1',
          productId: 'prod-1',
        },
      },
      select: { remaining: true },
    });
  });

  it('omits availableQuantity when inWarehouse is false', async () => {
    prisma.product.findFirst.mockResolvedValue(
      makeProduct({ inWarehouse: false }),
    );

    const result = await service.detail('prod-1');

    expect(result.availableQuantity).toBeUndefined();
    expect(prisma.supply.findUnique).not.toHaveBeenCalled();
  });

  it('suppresses a soft-deleted product on detail (404)', async () => {
    // detail() filters deletedAt: null, so a soft-deleted product is
    // not found. availableQuantity is never computed.
    prisma.product.findFirst.mockResolvedValue(null);

    const error = await service.detail('prod-1').catch((err: unknown) => err);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(prisma.supply.findUnique).not.toHaveBeenCalled();
  });

  it('queries detail with deletedAt: null', async () => {
    prisma.product.findFirst.mockResolvedValue(makeProduct());

    await service.detail('prod-1');

    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod-1', deletedAt: null },
      include: { business: true },
    });
  });
});
