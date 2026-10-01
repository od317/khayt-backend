import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { RedisService } from '../../common/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from './orders.service';

const store: AuthenticatedUser = {
  id: 'user-store',
  role: UserRole.store,
  phone: '0994000004',
};

const inventory: AuthenticatedUser = {
  id: 'user-inv',
  role: UserRole.inventory,
  phone: '0994000006',
};

const otherStore: AuthenticatedUser = {
  id: 'user-store-2',
  role: UserRole.store,
  phone: '0994000007',
};

const makeOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 'order-1',
  number: 'ORD-1001',
  storeId: store.id,
  status: OrderStatus.review,
  total: 0,
  pieces: 0,
  address: 'شارع بغداد',
  lat: 33.5138,
  lng: 36.2765,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  store: {
    id: store.id,
    name: 'متجر',
    phone: '0994000004',
    role: UserRole.store,
    bio: null,
    avatarUrl: null,
    availableForWork: true,
    verified: false,
    suspended: false,
    onboardingCompleted: true,
    locationId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  ...overrides,
});

const makeLine = (overrides: Record<string, unknown> = {}) => ({
  id: 'line-1',
  orderId: 'order-1',
  productId: 'prod-1',
  businessId: 'biz-1',
  quantity: 2,
  unitPrice: 5000,
  picked: false,
  product: { id: 'prod-1', name: 'قميص', businessId: 'biz-1' },
  business: { id: 'biz-1', name: 'معمل' },
  ...overrides,
});

type PrismaMock = {
  order: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  orderLine: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  product: { findMany: ReturnType<typeof vi.fn> };
  supply: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  stockMovement: {
    createMany: ReturnType<typeof vi.fn>;
  };
  deliveryOrder: {
    findUnique: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  user: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
  $queryRaw: ReturnType<typeof vi.fn>;
};

type RedisMock = {
  publish: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
  increment: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
};

describe('OrdersService', () => {
  let prisma: PrismaMock;
  let redis: RedisMock;
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      orderLine: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: 0 } }),
        update: vi.fn(),
        create: vi.fn(),
      },
      product: { findMany: vi.fn().mockResolvedValue([]) },
      supply: {
        findUnique: vi.fn().mockResolvedValue({ remaining: 100 }),
        update: vi.fn().mockResolvedValue({ id: 'supply-1' }),
      },
      stockMovement: {
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      deliveryOrder: {
        findUnique: vi.fn().mockResolvedValue(null),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue({
          deliveryAddress: 'شارع بغداد',
          deliveryLat: 33.5138,
          deliveryLng: 36.2765,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn(),
      $queryRaw: vi.fn().mockResolvedValue([{ nextval: 1001n }]),
    };

    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)(prisma);
      }
      return undefined;
    });

    const notifications = {
      notify: vi.fn().mockResolvedValue(undefined),
      notifyLike: vi.fn().mockResolvedValue(undefined),
    };

    redis = {
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      increment: vi.fn(),
      expire: vi.fn(),
    };

    service = new OrdersService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      redis as unknown as RedisService,
    );
  });

  describe('list', () => {
    it('returns every order when active is omitted', async () => {
      await service.list({ page: 1, limit: 20 }, inventory);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('limits to in-progress orders when active=true', async () => {
      await service.list({ page: 1, limit: 20, active: true }, inventory);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: {
              in: [
                OrderStatus.review,
                OrderStatus.preparing,
                OrderStatus.ready,
                OrderStatus.in_transit,
              ],
            },
          },
        }),
      );
    });

    it('limits to completed orders when active=false', async () => {
      await service.list({ page: 1, limit: 20, active: false }, inventory);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: {
              in: [
                OrderStatus.delivered,
                OrderStatus.cancelled,
                OrderStatus.failed,
              ],
            },
          },
        }),
      );
    });

    it('hides completed orders for a store when active=true', async () => {
      await service.list({ page: 1, limit: 20, active: true }, store);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            storeId: store.id,
            status: {
              in: [
                OrderStatus.review,
                OrderStatus.preparing,
                OrderStatus.ready,
                OrderStatus.in_transit,
              ],
            },
          },
        }),
      );
    });
  });

  describe('create', () => {
    const dto = {
      lines: [{ productId: 'prod-1', quantity: 2 }],
    };

    it('creates an order with unitPrice from Product.price and status review', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'قميص',
          businessId: 'biz-1',
          price: 5000,
          inWarehouse: true,
          deletedAt: null,
        },
      ]);
      prisma.supply.findUnique.mockResolvedValue({ remaining: 10 });
      prisma.orderLine.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ nextval: 1001n }]);
      const created = makeOrder({ total: 10000, pieces: 2 });
      prisma.order.create.mockResolvedValue(created);
      prisma.order.findUnique.mockResolvedValue(created);
      prisma.orderLine.findMany.mockResolvedValue([makeLine()]);

      const result = await service.create(store, dto);

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            number: 'ORD-1001',
            storeId: store.id,
            status: OrderStatus.review,
            total: 10000,
            pieces: 2,
          }),
        }),
      );
      expect(result.order.number).toBe('ORD-1001');
    });

    it('saves the map pin on the first order and on the store', async () => {
      prisma.user.findUnique.mockResolvedValue({
        deliveryAddress: null,
        deliveryLat: null,
        deliveryLng: null,
      });
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'قميص',
          businessId: 'biz-1',
          price: 5000,
          inWarehouse: true,
          deletedAt: null,
        },
      ]);
      prisma.supply.findUnique.mockResolvedValue({ remaining: 10 });
      prisma.orderLine.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ nextval: 1001n }]);
      prisma.order.create.mockResolvedValue(
        makeOrder({ total: 10000, pieces: 2 }),
      );
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ total: 10000, pieces: 2 }),
      );
      prisma.orderLine.findMany.mockResolvedValue([makeLine()]);

      await service.create(store, {
        ...dto,
        address: 'شارع بغداد، بناء 12',
        lat: 33.51,
        lng: 36.27,
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            deliveryAddress: 'شارع بغداد، بناء 12',
            deliveryLat: 33.51,
            deliveryLng: 36.27,
          },
        }),
      );
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            address: 'شارع بغداد، بناء 12',
            lat: 33.51,
            lng: 36.27,
          }),
        }),
      );
    });

    it('rejects the first order without a map pin', async () => {
      prisma.user.findUnique.mockResolvedValue({
        deliveryAddress: null,
        deliveryLat: null,
        deliveryLng: null,
      });

      const error = await service.create(store, dto).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: {
          address: 'required',
          lat: 'required',
          lng: 'required',
        },
      });
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('rejects a product not in the warehouse', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          businessId: 'biz-1',
          price: 5000,
          inWarehouse: false,
          deletedAt: null,
        },
      ]);

      const error = await service.create(store, dto).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'not_in_warehouse',
        productId: 'prod-1',
      });
    });

    it('rejects insufficient stock', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          businessId: 'biz-1',
          price: 5000,
          inWarehouse: true,
          deletedAt: null,
        },
      ]);
      prisma.supply.findUnique.mockResolvedValue({ remaining: 1 });
      prisma.orderLine.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
      prisma.$queryRaw.mockResolvedValueOnce([]);

      const error = await service.create(store, dto).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.CONFLICT);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'insufficient_stock',
        productId: 'prod-1',
        available: 1,
      });
    });

    it('rejects a product that does not exist', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      const error = await service.create(store, dto).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
    });
  });

  describe('detail', () => {
    it('404s for an order the store does not own', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());

      const error = await service
        .detail('order-1', otherStore)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getResponse()).toMatchObject({
        error: 'order_not_accessible',
      });
    });

    it('returns the detail with canCancel true for the store at review', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());
      prisma.orderLine.findMany.mockResolvedValue([makeLine()]);

      const result = await service.detail('order-1', store);

      expect(result.order.canCancel).toBe(true);
    });

    it('returns canAdvance true for inventory at review', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());
      prisma.orderLine.findMany.mockResolvedValue([makeLine()]);

      const result = await service.detail('order-1', inventory);

      expect(result.order.canAdvance).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('allows review → preparing for inventory', async () => {
      const existing = makeOrder();
      prisma.order.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, status: OrderStatus.preparing });
      prisma.orderLine.findMany.mockResolvedValue([]);
      prisma.order.update.mockResolvedValue({
        ...existing,
        status: OrderStatus.preparing,
      });

      const result = await service.updateStatus('order-1', inventory, {
        status: OrderStatus.preparing,
      });

      expect(result.order.status).toBe(OrderStatus.preparing);
    });

    it('rejects review → preparing for a store', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());
      prisma.orderLine.findMany.mockResolvedValue([]);

      const error = await service
        .updateStatus('order-1', store, { status: OrderStatus.preparing })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'invalid_transition',
        from: OrderStatus.review,
        to: OrderStatus.preparing,
      });
    });

    it('allows review → cancelled for the store', async () => {
      const existing = makeOrder();
      prisma.order.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, status: OrderStatus.cancelled });
      prisma.orderLine.findMany.mockResolvedValue([]);
      prisma.order.update.mockResolvedValue({
        ...existing,
        status: OrderStatus.cancelled,
      });

      const result = await service.updateStatus('order-1', store, {
        status: OrderStatus.cancelled,
      });

      expect(result.order.status).toBe(OrderStatus.cancelled);
    });

    it('allows preparing → cancelled for the store that owns the order', async () => {
      const existing = makeOrder({ status: OrderStatus.preparing });
      prisma.order.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, status: OrderStatus.cancelled });
      prisma.orderLine.findMany.mockResolvedValue([]);
      prisma.order.update.mockResolvedValue({
        ...existing,
        status: OrderStatus.cancelled,
      });

      const result = await service.updateStatus('order-1', store, {
        status: OrderStatus.cancelled,
      });

      expect(result.order.status).toBe(OrderStatus.cancelled);
    });

    it('rejects cancellation by a different store', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: OrderStatus.review }),
      );
      prisma.orderLine.findMany.mockResolvedValue([]);

      const error = await service
        .updateStatus('order-1', otherStore, { status: OrderStatus.cancelled })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'invalid_transition',
      });
    });

    it('allows ready → in_transit for inventory', async () => {
      const existing = makeOrder({ status: OrderStatus.ready });
      prisma.order.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, status: OrderStatus.in_transit });
      prisma.orderLine.findMany.mockResolvedValue([{ picked: true }]);
      prisma.order.update.mockResolvedValue({
        ...existing,
        status: OrderStatus.in_transit,
      });

      const result = await service.updateStatus('order-1', inventory, {
        status: OrderStatus.in_transit,
      });

      expect(result.order.status).toBe(OrderStatus.in_transit);
    });

    it('allows ready → delivered for inventory', async () => {
      const existing = makeOrder({ status: OrderStatus.ready });
      prisma.order.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, status: OrderStatus.delivered });
      prisma.orderLine.findMany.mockResolvedValue([
        { productId: 'prod-1', businessId: 'biz-1', quantity: 2, picked: true },
      ]);
      prisma.order.update.mockResolvedValue({
        ...existing,
        status: OrderStatus.delivered,
      });

      const result = await service.updateStatus('order-1', inventory, {
        status: OrderStatus.delivered,
      });

      expect(result.order.status).toBe(OrderStatus.delivered);
    });

    it('rejects preparing → ready when a line is unpicked', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: OrderStatus.preparing }),
      );
      prisma.orderLine.findMany.mockResolvedValue([
        { picked: true },
        { picked: false },
      ]);

      const error = await service
        .updateStatus('order-1', inventory, { status: OrderStatus.ready })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'invalid_transition',
      });
    });

    it('rejects in_transit → cancelled for anyone', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: OrderStatus.in_transit }),
      );
      prisma.orderLine.findMany.mockResolvedValue([]);

      const error = await service
        .updateStatus('order-1', inventory, { status: OrderStatus.cancelled })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'invalid_transition',
      });
    });

    it('decrements Supply.remaining and writes a StockMovement on delivered', async () => {
      const existing = makeOrder({ status: OrderStatus.in_transit });
      prisma.order.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, status: OrderStatus.delivered });
      prisma.orderLine.findMany.mockResolvedValue([
        { productId: 'prod-1', businessId: 'biz-1', quantity: 2, picked: true },
      ]);
      prisma.supply.update.mockResolvedValue({ id: 'supply-1' });
      prisma.stockMovement.createMany.mockResolvedValue({ count: 1 });
      prisma.order.update.mockResolvedValue({
        ...existing,
        status: OrderStatus.delivered,
      });

      const deliveryActor: AuthenticatedUser = {
        id: 'user-delivery',
        role: UserRole.delivery,
        phone: '0994000008',
      };

      await service.updateStatus('order-1', deliveryActor, {
        status: OrderStatus.delivered,
      });

      expect(prisma.supply.update).toHaveBeenCalledWith({
        where: {
          businessId_productId: {
            businessId: 'biz-1',
            productId: 'prod-1',
          },
        },
        data: { remaining: { decrement: 2 } },
        select: { id: true },
      });

      expect(prisma.stockMovement.createMany).toHaveBeenCalledWith({
        data: [
          {
            supplyId: 'supply-1',
            type: 'out',
            quantity: 2,
            reference: 'ORD-1001',
          },
        ],
      });

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.delivered },
      });
    });

    it('publishes to the order channel after a status change', async () => {
      const existing = makeOrder();
      prisma.order.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({
          ...existing,
          status: OrderStatus.preparing,
        });
      prisma.orderLine.findMany.mockResolvedValue([]);
      prisma.order.update.mockResolvedValue({
        ...existing,
        status: OrderStatus.preparing,
      });

      await service.updateStatus('order-1', inventory, {
        status: OrderStatus.preparing,
      });

      const payload = expect.stringContaining('"status":"preparing"');
      expect(redis.publish).toHaveBeenCalledWith('order:order-1', payload);
      expect(redis.publish).toHaveBeenCalledWith(
        'orders:store:user-store',
        payload,
      );
      expect(redis.publish).toHaveBeenCalledWith('orders:feed', payload);
    });
  });

  describe('forceAdvance', () => {
    it('moves preparing → ready even when a line is unpicked', async () => {
      const existing = makeOrder({ status: OrderStatus.preparing });
      prisma.order.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, status: OrderStatus.ready });
      prisma.order.update.mockResolvedValue({
        ...existing,
        status: OrderStatus.ready,
      });

      const result = await service.forceAdvance('order-1', inventory);

      expect(result.from).toBe(OrderStatus.preparing);
      expect(result.to).toBe(OrderStatus.ready);
      expect(result.order.status).toBe(OrderStatus.ready);
      expect(redis.publish).toHaveBeenCalledWith(
        'order:order-1',
        expect.stringContaining('"status":"ready"'),
      );
    });

    it('rejects a store caller', async () => {
      const error = await service
        .forceAdvance('order-1', store)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('updateLine', () => {
    it('rejects a store trying to pick a line', async () => {
      const error = await service
        .updateLine('order-1', 'line-1', store, { picked: true })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
    });

    it('rejects toggling a line when the order is not preparing', async () => {
      prisma.orderLine.findFirst.mockResolvedValue({
        ...makeLine(),
        order: { status: OrderStatus.review },
      });

      const error = await service
        .updateLine('order-1', 'line-1', inventory, { picked: true })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'invalid_state',
      });
    });

    it('allows inventory to pick a line while preparing', async () => {
      prisma.orderLine.findFirst.mockResolvedValue({
        ...makeLine(),
        order: { status: OrderStatus.preparing },
      });
      const updated = makeLine({ picked: true });
      prisma.orderLine.update.mockResolvedValue(updated);

      const result = await service.updateLine('order-1', 'line-1', inventory, {
        picked: true,
      });

      expect(result.line.picked).toBe(true);
    });
  });
});
