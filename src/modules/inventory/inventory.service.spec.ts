import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BusinessType, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { InventoryService } from './inventory.service';

const internal: AuthenticatedUser = {
  id: 'user-inv',
  role: UserRole.inventory,
  phone: '0994000006',
};

const owner: AuthenticatedUser = {
  id: 'user-workshop',
  role: UserRole.workshop,
  phone: '0994000002',
};

const other: AuthenticatedUser = {
  id: 'user-other',
  role: UserRole.workshop,
  phone: '0994000009',
};

const makeSupply = (overrides: Record<string, unknown> = {}) => ({
  id: 'supply-1',
  businessId: 'biz-1',
  productId: 'prod-1',
  sent: 100,
  remaining: 40,
  unitPrice: 5000,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  product: { name: 'قميص', unit: 'قطعة' },
  business: { name: 'معمل' },
  ...overrides,
});

type PrismaMock = {
  supply: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  bill: { aggregate: ReturnType<typeof vi.fn> };
  stockMovement: { findMany: ReturnType<typeof vi.fn> };
  business: { findUnique: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('InventoryService', () => {
  let prisma: PrismaMock;
  let service: InventoryService;

  beforeEach(() => {
    prisma = {
      supply: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn(),
      },
      bill: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { paid: 0 } }),
      },
      stockMovement: { findMany: vi.fn().mockResolvedValue([]) },
      business: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)(prisma);
      }
      return undefined;
    });

    service = new InventoryService(prisma as unknown as PrismaService);
  });

  describe('listInventory', () => {
    it('rejects a non-internal actor', async () => {
      const error = await service
        .listInventory({ page: 1, limit: 20 }, owner)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
    });

    it('returns items with computed sold and isLowStock', async () => {
      prisma.supply.findMany.mockResolvedValue([
        makeSupply({ sent: 100, remaining: 10 }), // low
        makeSupply({ id: 'supply-2', sent: 100, remaining: 50 }), // not low
      ]);
      prisma.supply.count.mockResolvedValue(2);

      const result = await service.listInventory(
        { page: 1, limit: 20 },
        internal,
      );

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.sold).toBe(90);
      expect(result.items[0]?.isLowStock).toBe(true);
      expect(result.items[1]?.isLowStock).toBe(false);
    });

    it('returns quantity totals and money totals', async () => {
      prisma.supply.findMany.mockResolvedValue([
        makeSupply({ sent: 100, remaining: 40, unitPrice: 5000 }),
        makeSupply({
          id: 'supply-2',
          sent: 50,
          remaining: 20,
          unitPrice: 2000,
        }),
      ]);
      prisma.supply.count.mockResolvedValue(2);
      prisma.bill.aggregate.mockResolvedValue({ _sum: { paid: 150000 } });

      const result = await service.listInventory(
        { page: 1, limit: 20 },
        internal,
      );

      // quantities
      expect(result.totals.productCount).toBe(2);
      expect(result.totals.sent).toBe(150);
      expect(result.totals.remaining).toBe(60);
      expect(result.totals.sold).toBe(90);
      // money: اجمالي المرسل / المدفوع / المتبقي
      expect(result.totals.money.sent).toBe(100 * 5000 + 50 * 2000); // 600000
      expect(result.totals.money.paid).toBe(150000);
      expect(result.totals.money.remaining).toBe(450000);
    });

    it('filters lowStock=true', async () => {
      prisma.supply.findMany.mockResolvedValue([
        makeSupply({ sent: 100, remaining: 10 }),
        makeSupply({ id: 'supply-2', sent: 100, remaining: 50 }),
      ]);

      const result = await service.listInventory(
        { page: 1, limit: 20, lowStock: 'true' },
        internal,
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.isLowStock).toBe(true);
    });

    it('filters lowStock=false', async () => {
      prisma.supply.findMany.mockResolvedValue([
        makeSupply({ sent: 100, remaining: 10 }),
        makeSupply({ id: 'supply-2', sent: 100, remaining: 50 }),
      ]);

      const result = await service.listInventory(
        { page: 1, limit: 20, lowStock: 'false' },
        internal,
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.isLowStock).toBe(false);
    });
  });

  describe('detail', () => {
    it('404s for a missing supply', async () => {
      prisma.supply.findUnique.mockResolvedValue(null);

      const error = await service
        .detail('missing', internal)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('returns the item, business, and movements', async () => {
      prisma.supply.findUnique.mockResolvedValue({
        ...makeSupply(),
        business: {
          id: 'biz-1',
          name: 'معمل',
          type: BusinessType.workshop,
          location: 'دمشق',
          verified: true,
        },
      });
      prisma.stockMovement.findMany.mockResolvedValue([
        {
          id: 'mv-1',
          type: 'out',
          quantity: 5,
          reference: 'ORD-1001',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      const result = await service.detail('supply-1', internal);

      expect(result.item.id).toBe('supply-1');
      expect(result.business.id).toBe('biz-1');
      expect(result.movements).toHaveLength(1);
      expect(result.movements[0]?.type).toBe('out');
    });
  });

  describe('listSupply', () => {
    it('rejects an external actor who owns no business', async () => {
      prisma.business.findUnique.mockResolvedValue(null);

      const error = await service
        .listSupply({}, other)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
    });

    it('rejects an external actor asking for another business', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'biz-1' });

      const error = await service
        .listSupply({ businessId: 'biz-other' }, owner)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
    });

    it('scopes to the owned business when no businessId is given', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'biz-1' });
      prisma.supply.findMany.mockResolvedValue([]);

      await service.listSupply({}, owner);

      expect(prisma.supply.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ businessId: 'biz-1' }),
        }),
      );
    });

    it('lets internal staff see all supply', async () => {
      prisma.supply.findMany.mockResolvedValue([]);

      await service.listSupply({}, internal);

      expect(prisma.business.findUnique).not.toHaveBeenCalled();
      expect(prisma.supply.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('returns every item without pagination', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'biz-1' });
      prisma.supply.findMany.mockResolvedValue(
        Array.from({ length: 25 }, (_, i) =>
          makeSupply({ id: `supply-${i}`, sent: 10, remaining: 5 }),
        ),
      );

      const result = await service.listSupply({}, owner);

      expect(result.items).toHaveLength(25);
      expect(result.total).toBe(25);
      expect(result).not.toHaveProperty('page');
      expect(result).not.toHaveProperty('limit');
    });
  });
});
