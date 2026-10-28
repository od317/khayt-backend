import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BusinessType, Product, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { ProductsService } from './products.service';

const actor: AuthenticatedUser = {
  id: 'user-1',
  role: UserRole.inventory,
  phone: '0994037669',
};

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  name: 'قميص',
  category: 'قمصان',
  description: null,
  images: [],
  unit: 'قطعة',
  price: 5000,
  inWarehouse: false,
  available: true,
  guarantee: false,
  supplierBusinessId: null,
  variants: null,
  packaging: null,
  discount: null,
  offer: null,
  saleRule: null,
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

type PrismaMock = {
  product: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
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
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
      },
      business: { findUnique: vi.fn() },
      supply: { findUnique: vi.fn() },
      orderLine: { count: vi.fn() },
    };

    service = new ProductsService(prisma as unknown as PrismaService);
  });

  it('creates a product with inWarehouse true', async () => {
    prisma.product.create.mockResolvedValue(makeProduct({ inWarehouse: true }));

    const result = await service.create(actor, {
      name: 'قميص',
      category: 'قمصان',
      unit: 'قطعة',
      price: 5000,
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'قميص',
        inWarehouse: true,
        supplierBusinessId: null,
      }),
    });
    expect(result.product.inWarehouse).toBe(true);
  });

  it('rejects a non-workshop supplierBusinessId', async () => {
    prisma.business.findUnique.mockResolvedValue({
      id: 'biz-store',
      type: BusinessType.store,
    });

    const error = await service
      .create(actor, {
        name: 'قميص',
        category: 'قمصان',
        unit: 'قطعة',
        price: 5000,
        supplierBusinessId: 'biz-store',
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('links a workshop supplier on create', async () => {
    prisma.business.findUnique.mockResolvedValue({
      id: 'biz-workshop',
      type: BusinessType.workshop,
    });
    prisma.product.create.mockResolvedValue(
      makeProduct({ supplierBusinessId: 'biz-workshop' }),
    );

    const result = await service.create(actor, {
      name: 'قميص',
      category: 'قمصان',
      unit: 'قطعة',
      price: 5000,
      supplierBusinessId: 'biz-workshop',
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supplierBusinessId: 'biz-workshop',
      }),
    });
    expect(result.product.supplierBusinessId).toBe('biz-workshop');
  });

  it('stores uploaded variant images instead of URLs', async () => {
    prisma.product.create.mockResolvedValue(makeProduct());

    await service.create(
      actor,
      {
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
          options: [
            {
              name: 'أحمر',
              image: '/uploads/products/red.jpg',
              images: ['/uploads/products/red.jpg'],
            },
          ],
        },
      }),
    });
  });

  it('soft-deletes a product that has not been ordered', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
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
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
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
      where: { productId: 'prod-1' },
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
    prisma.product.findFirst.mockResolvedValue(null);

    const error = await service.detail('prod-1').catch((err: unknown) => err);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(prisma.supply.findUnique).not.toHaveBeenCalled();
  });

  it('queries detail with deletedAt: null and no business embed', async () => {
    prisma.product.findFirst.mockResolvedValue(makeProduct());

    await service.detail('prod-1');

    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod-1', deletedAt: null },
    });
  });

  it('returns paginated similar products', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'prod-qamis-abyad',
      category: 'قمصان',
    });
    prisma.product.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    prisma.product.findMany
      .mockResolvedValueOnce([
        makeProduct({ id: 'prod-qamis-kaki', name: 'قميص كاكي' }),
      ])
      .mockResolvedValueOnce([]);

    const result = await service.listSimilar('prod-qamis-abyad', {
      page: 1,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('prod-qamis-kaki');
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('rejects similar products for an unknown product', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    const error = await service
      .listSimilar('missing', { page: 1, limit: 10 })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(NotFoundException);
  });
});
