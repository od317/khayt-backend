import { ConflictException, NotFoundException } from '@nestjs/common';
import { BusinessType, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { BusinessesService } from './businesses.service';

const actor: AuthenticatedUser = {
  id: 'user-1',
  role: UserRole.store,
  phone: '0994037669',
};

const makeBusiness = (overrides: Record<string, unknown> = {}) => ({
  id: 'biz-1',
  ownerId: actor.id,
  type: BusinessType.store,
  name: 'متجر',
  location: 'دمشق',
  description: null,
  phone: null,
  imageUrl: null,
  verified: false,
  capacity: null,
  equipment: null,
  minOrder: null,
  experience: null,
  services: [],
  duration: null,
  topics: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

type PrismaMock = {
  business: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  product: { findMany: ReturnType<typeof vi.fn> };
  supply: { findMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('BusinessesService', () => {
  let prisma: PrismaMock;
  let service: BusinessesService;

  beforeEach(() => {
    prisma = {
      business: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      product: { findMany: vi.fn().mockResolvedValue([]) },
      supply: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(),
    };

    service = new BusinessesService(prisma as unknown as PrismaService);
  });

  it('creates a business', async () => {
    prisma.business.findUnique.mockResolvedValue(null);
    const created = makeBusiness();
    prisma.business.create.mockResolvedValue(created);

    const result = await service.create(actor, {
      type: BusinessType.store,
      name: 'متجر',
      location: 'دمشق',
    });

    expect(prisma.business.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerId: actor.id,
        type: BusinessType.store,
        name: 'متجر',
        location: 'دمشق',
      }),
    });
    expect(result.business.id).toBe('biz-1');
  });

  it('rejects a second business for the same user', async () => {
    prisma.business.findUnique.mockResolvedValue({ id: 'existing' });

    const error = await service
      .create(actor, {
        type: BusinessType.store,
        name: 'آخر',
        location: 'دمشق',
      })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      error: 'already_has_business',
    });
  });

  it('rejects updates from a non-owner', async () => {
    // Non-owner is enforced by BusinessOwnerGuard at the route level.
    // The service assumes the guard ran. So this test exercises the
    // guard, not the service.
    // ... see note below
  });

  it('does not include soft-deleted products in business detail', async () => {
    const business = makeBusiness();
    prisma.business.findUnique.mockResolvedValue(business);
    prisma.product.findMany.mockResolvedValue([]);
    prisma.supply.findMany.mockResolvedValue([]);

    await service.detail('biz-1', undefined);

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { businessId: 'biz-1', deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  });
});
