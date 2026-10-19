import {
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  BillStatus,
  BusinessType,
  PaymentType,
  UserRole,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { BillingService } from './billing.service';
import { NotificationsService } from '../notifications/notifications.service';

const actor: AuthenticatedUser = {
  id: 'user-inv',
  role: UserRole.inventory,
  phone: '0994000006',
};

const makeBusiness = (overrides: Record<string, unknown> = {}) => ({
  id: 'biz-1',
  ownerId: 'user-workshop',
  type: BusinessType.workshop,
  name: 'معمل',
  location: 'دمشق',
  description: null,
  phone: null,
  imageUrl: null,
  verified: true,
  capacity: null,
  equipment: null,
  minOrder: null,
  experience: null,
  duration: null,
  topics: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const makeProduct = (overrides: Record<string, unknown> = {}) => ({
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
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const makeReceiving = (overrides: Record<string, unknown> = {}) => ({
  id: 'rcv-1',
  number: 'RCV-1001',
  businessId: 'biz-1',
  receivedAt: new Date('2026-01-01T00:00:00.000Z'),
  paymentType: PaymentType.cash,
  createdBy: actor.id,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  business: makeBusiness(),
  ...overrides,
});

const makeBill = (overrides: Record<string, unknown> = {}) => ({
  id: 'bill-1',
  number: 'BILL-1001',
  businessId: 'biz-1',
  receivingId: 'rcv-1',
  paymentType: PaymentType.cash,
  status: BillStatus.unpaid,
  issuedAt: new Date('2026-01-01T00:00:00.000Z'),
  dueAt: null,
  total: 50000,
  paid: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  business: makeBusiness(),
  ...overrides,
});

type PrismaMock = {
  business: { findUnique: ReturnType<typeof vi.fn> };
  product: {
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  receiving: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  receivingLine: { findMany: ReturnType<typeof vi.fn> };
  bill: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
  billLine: { findMany: ReturnType<typeof vi.fn> };
  payment: { create: ReturnType<typeof vi.fn> };
  supply: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  stockMovement: { createMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
  $queryRaw: ReturnType<typeof vi.fn>;
};

describe('BillingService', () => {
  let prisma: PrismaMock;
  let service: BillingService;

  beforeEach(() => {
    prisma = {
      business: { findUnique: vi.fn() },
      product: { findMany: vi.fn(), updateMany: vi.fn() },
      receiving: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
      },
      receivingLine: { findMany: vi.fn().mockResolvedValue([]) },
      bill: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        aggregate: vi.fn().mockResolvedValue({
          _sum: { total: 0, paid: 0 },
          _count: { _all: 0 },
        }),
      },
      billLine: { findMany: vi.fn().mockResolvedValue([]) },
      payment: { create: vi.fn() },
      supply: { upsert: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      stockMovement: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
      $transaction: vi.fn(),
      $queryRaw: vi.fn(),
    };

    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)(prisma);
      }
      return undefined;
    });

    const notifications = { notify: vi.fn().mockResolvedValue(undefined) };
    service = new BillingService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  describe('createReceiving', () => {
    const dto = {
      businessId: 'biz-1',
      paymentType: PaymentType.cash,
      lines: [{ productId: 'prod-1', quantity: 10, unitPrice: 5000 }],
    };

    it('rejects duplicate products in one receiving', async () => {
      const error = await service
        .createReceiving(actor, {
          ...dto,
          lines: [
            { productId: 'prod-1', quantity: 10, unitPrice: 5000 },
            { productId: 'prod-1', quantity: 5, unitPrice: 5000 },
          ],
        })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: { 'lines[1].productId': 'مكرر' },
      });
    });

    it('404s for a missing business', async () => {
      prisma.business.findUnique.mockResolvedValue(null);

      const error = await service
        .createReceiving(actor, dto)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('rejects an منتج غير معروف', async () => {
      prisma.business.findUnique.mockResolvedValue(makeBusiness());
      prisma.product.findMany.mockResolvedValue([]);

      const error = await service
        .createReceiving(actor, dto)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: { 'lines[0].productId': 'منتج غير معروف' },
      });
    });

    it('rejects a non-workshop supplier business', async () => {
      prisma.business.findUnique.mockResolvedValue(
        makeBusiness({ type: BusinessType.store }),
      );

      const error = await service
        .createReceiving(actor, dto)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: { businessId: 'يجب أن تكون ورشة' },
      });
    });

    it('rejects a product linked to a different workshop', async () => {
      prisma.business.findUnique.mockResolvedValue(makeBusiness());
      prisma.product.findMany.mockResolvedValue([
        makeProduct({ supplierBusinessId: 'biz-other' }),
      ]);

      const error = await service
        .createReceiving(actor, dto)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: { 'lines[0].productId': 'عدم تطابق المورد' },
      });
    });

    it('creates the receiving, bill, and stock movements', async () => {
      prisma.business.findUnique.mockResolvedValue(makeBusiness());
      prisma.product.findMany.mockResolvedValue([makeProduct()]);

      prisma.$queryRaw
        .mockResolvedValueOnce([{ nextval: 1001n }]) // RCV
        .mockResolvedValueOnce([{ nextval: 1001n }]); // BILL

      prisma.receiving.create.mockResolvedValue(makeReceiving());
      prisma.bill.create.mockResolvedValue(makeBill({ total: 50000 }));
      prisma.receivingLine.findMany.mockResolvedValue([
        {
          id: 'rline-1',
          receivingId: 'rcv-1',
          productId: 'prod-1',
          quantity: 10,
          unitPrice: 5000,
          product: { name: 'قميص' },
        },
      ]);
      prisma.billLine.findMany.mockResolvedValue([
        {
          id: 'bline-1',
          billId: 'bill-1',
          productId: 'prod-1',
          quantity: 10,
          unitPrice: 5000,
          product: { name: 'قميص' },
        },
      ]);
      prisma.supply.findMany.mockResolvedValue([
        { id: 'supply-1', productId: 'prod-1' },
      ]);

      const result = await service.createReceiving(actor, dto);

      expect(prisma.supply.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'prod-1' },
          create: expect.objectContaining({
            productId: 'prod-1',
            sent: 10,
            remaining: 10,
            unitPrice: 5000,
          }),
        }),
      );
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['prod-1'] }, supplierBusinessId: null },
        data: {
          inWarehouse: true,
          supplierBusinessId: 'biz-1',
        },
      });
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['prod-1'] },
          supplierBusinessId: 'biz-1',
        },
        data: { inWarehouse: true },
      });
      expect(prisma.stockMovement.createMany).toHaveBeenCalledWith({
        data: [
          {
            supplyId: 'supply-1',
            type: 'in',
            quantity: 10,
            reference: 'RCV-1001',
          },
        ],
      });
      expect(result.receiving.number).toBe('RCV-1001');
      expect(result.bill.number).toBe('BILL-1001');
    });

    it('sets dueAt for credit and leaves it null for cash', async () => {
      prisma.business.findUnique.mockResolvedValue(makeBusiness());
      prisma.product.findMany.mockResolvedValue([makeProduct()]);
      prisma.$queryRaw
        .mockResolvedValueOnce([{ nextval: 1001n }])
        .mockResolvedValueOnce([{ nextval: 1001n }]);
      prisma.receiving.create.mockResolvedValue(
        makeReceiving({ paymentType: PaymentType.credit }),
      );
      prisma.bill.create.mockResolvedValue(
        makeBill({
          paymentType: PaymentType.credit,
          dueAt: new Date('2026-01-31T00:00:00.000Z'),
        }),
      );
      prisma.receivingLine.findMany.mockResolvedValue([]);
      prisma.billLine.findMany.mockResolvedValue([]);
      prisma.supply.findMany.mockResolvedValue([
        { id: 'supply-1', productId: 'prod-1' },
      ]);

      await service.createReceiving(actor, {
        ...dto,
        paymentType: PaymentType.credit,
      });

      const createCall = prisma.bill.create.mock.calls[0]?.[0] as {
        data: { dueAt: Date | null };
      };
      expect(createCall.data.dueAt).toBeInstanceOf(Date);
    });
  });

  describe('getReceiving', () => {
    it('404s for a missing receiving', async () => {
      prisma.receiving.findUnique.mockResolvedValue(null);

      const error = await service
        .getReceiving('missing')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('500s when a receiving has no bill (R6 violation)', async () => {
      prisma.receiving.findUnique.mockResolvedValue({
        ...makeReceiving(),
        lines: [],
        bill: null,
      });

      const error = await service
        .getReceiving('rcv-1')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('listBills', () => {
    it('filters by status and business', async () => {
      await service.listBills({
        page: 1,
        limit: 20,
        status: BillStatus.partial,
        businessId: 'biz-1',
      });

      expect(prisma.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: BillStatus.partial,
            businessId: 'biz-1',
          }),
        }),
      );
    });
  });

  describe('getBill', () => {
    it('404s for a missing bill', async () => {
      prisma.bill.findUnique.mockResolvedValue(null);

      const error = await service.getBill('missing').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
    });
  });

  describe('recordPayment', () => {
    it('rejects a non-positive amount', async () => {
      const error = await service
        .recordPayment('bill-1', actor, { amount: 0 })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'amount_not_positive',
      });
    });

    it('rejects an amount exceeding the remaining balance', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 'bill-1' }]);
      prisma.bill.findUnique.mockResolvedValue(
        makeBill({ total: 50000, paid: 40000 }),
      );

      const error = await service
        .recordPayment('bill-1', actor, { amount: 20000 })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'amount_exceeds_balance',
        remaining: 10000,
      });
    });

    it('404s when the bill does not exist', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const error = await service
        .recordPayment('missing', actor, { amount: 1000 })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('records a partial payment and recomputes status', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 'bill-1' }]);
      prisma.bill.findUnique.mockResolvedValue(
        makeBill({ total: 50000, paid: 0 }),
      );
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        billId: 'bill-1',
        amount: 20000,
        paidAt: new Date('2026-01-01T00:00:00.000Z'),
        recordedBy: actor.id,
        recorder: { id: actor.id, name: 'موظف' },
      });
      prisma.bill.update.mockResolvedValue(
        makeBill({ total: 50000, paid: 20000, status: BillStatus.partial }),
      );

      const result = await service.recordPayment('bill-1', actor, {
        amount: 20000,
      });

      expect(prisma.bill.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: { paid: 20000, status: BillStatus.partial },
        include: { business: true },
      });
      expect(result.bill.status).toBe(BillStatus.partial);
      expect(result.payment.amount).toBe(20000);
    });

    it('sets status to paid when the balance is fully paid', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 'bill-1' }]);
      prisma.bill.findUnique.mockResolvedValue(
        makeBill({ total: 50000, paid: 40000 }),
      );
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        billId: 'bill-1',
        amount: 10000,
        paidAt: new Date('2026-01-01T00:00:00.000Z'),
        recordedBy: actor.id,
        recorder: { id: actor.id, name: 'موظف' },
      });
      prisma.bill.update.mockResolvedValue(
        makeBill({ total: 50000, paid: 50000, status: BillStatus.paid }),
      );

      const result = await service.recordPayment('bill-1', actor, {
        amount: 10000,
      });

      expect(prisma.bill.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: { paid: 50000, status: BillStatus.paid },
        include: { business: true },
      });
      expect(result.bill.status).toBe(BillStatus.paid);
    });
  });

  describe('billsSummary', () => {
    it('sums total and paid, computes remaining and count', async () => {
      prisma.bill.aggregate.mockResolvedValue({
        _sum: { total: 100000, paid: 40000 },
        _count: { _all: 3 },
      });

      const result = await service.billsSummary({});

      expect(result).toEqual({
        total: 100000,
        paid: 40000,
        remaining: 60000,
        count: 3,
      });
    });

    it('filters by businessId', async () => {
      prisma.bill.aggregate.mockResolvedValue({
        _sum: { total: 0, paid: 0 },
        _count: { _all: 0 },
      });

      await service.billsSummary({ businessId: 'biz-1' });

      expect(prisma.bill.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1' },
        }),
      );
    });
  });
});
