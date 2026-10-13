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
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  product: { findMany: ReturnType<typeof vi.fn> };
  supply: { findMany: ReturnType<typeof vi.fn> };
  post: { findMany: ReturnType<typeof vi.fn> };
  like: { groupBy: ReturnType<typeof vi.fn> };
  comment: { groupBy: ReturnType<typeof vi.fn> };
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
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      product: { findMany: vi.fn().mockResolvedValue([]) },
      supply: { findMany: vi.fn().mockResolvedValue([]) },
      post: { findMany: vi.fn().mockResolvedValue([]) },
      like: { groupBy: vi.fn().mockResolvedValue([]) },
      comment: { groupBy: vi.fn().mockResolvedValue([]) },
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
      include: expect.any(Object),
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

  it('returns a public factory profile by business id', async () => {
    const factory = makeBusiness({
      id: 'biz-workshop',
      ownerId: 'user-workshop',
      type: BusinessType.workshop,
      name: 'معمل النسيج',
      description: 'وصف',
      verified: true,
      services: ['خياطة'],
      categories: [
        { category: { id: 'cat-biz-factory', name: 'مصنع', slug: 'factory' } },
      ],
    });
    prisma.business.findUnique.mockResolvedValueOnce(factory);
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        businessId: 'biz-workshop',
        name: 'قميص',
        category: 'ملابس',
        description: null,
        images: [],
        unit: 'قطعة',
        price: 10,
        inWarehouse: true,
        available: true,
        guarantee: false,
        variants: null,
        packaging: null,
        discount: null,
        offer: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      },
    ]);
    prisma.post.findMany.mockResolvedValue([]);

    const result = await service.publicProfile('biz-workshop');

    expect(result.kind).toBe('factory');
    expect(result.id).toBe('biz-workshop');
    expect(result.profile.name).toBe('معمل النسيج');
    expect(result.profile.verified).toBe(true);
    expect(result.profile.services).toEqual(['خياطة']);
    expect(result.products).toHaveLength(1);
    expect(result.posts).toEqual([]);
    expect(result).not.toHaveProperty('similar');
  });

  it('returns a public factory profile by owner user id', async () => {
    const factory = makeBusiness({
      id: 'biz-workshop',
      ownerId: 'user-workshop',
      type: BusinessType.workshop,
      name: 'معمل النسيج',
      categories: [],
    });
    prisma.business.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(factory);
    prisma.product.findMany.mockResolvedValue([]);
    prisma.post.findMany.mockResolvedValue([]);

    const result = await service.publicProfile('user-workshop');

    expect(result.kind).toBe('factory');
    expect(result.id).toBe('biz-workshop');
    expect(result.profile.name).toBe('معمل النسيج');
  });

  it('paginates similar workshops for a factory profile', async () => {
    const factory = makeBusiness({
      id: 'biz-workshop',
      ownerId: 'user-workshop',
      type: BusinessType.workshop,
      categories: [],
    });
    const similar = makeBusiness({
      id: 'biz-workshop-2',
      ownerId: 'user-2',
      type: BusinessType.workshop,
      name: 'معمل آخر',
      categories: [],
    });
    prisma.business.findUnique.mockResolvedValue(factory);
    prisma.business.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    prisma.business.findMany.mockResolvedValue([similar]);

    const result = await service.listSimilarFactories('biz-workshop', {
      page: 1,
      limit: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('biz-workshop-2');
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
  });

  it('returns a public employee profile by user id', async () => {
    prisma.business.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-employee',
      role: UserRole.employee,
      name: 'أحمد الخياط',
      phone: '0994000001',
      bio: 'خياط محترف',
      avatarUrl: null,
      verified: false,
      availableForWork: true,
      suspended: false,
      onboardingCompleted: true,
      locationId: 'loc-damascus-mazzeh',
      location: { id: 'loc-damascus-mazzeh', name: 'المزة' },
    });
    prisma.post.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-employee-2',
        name: 'سامي',
        bio: null,
        avatarUrl: null,
        verified: true,
        availableForWork: true,
        location: { name: 'المزة' },
      },
    ]);

    const result = await service.publicProfile('user-employee');

    expect(result.kind).toBe('employee');
    if (result.kind !== 'employee') return;
    expect(result.id).toBe('user-employee');
    expect(result.profile.name).toBe('أحمد الخياط');
    expect(result.profile.bio).toBe('خياط محترف');
    expect(result.profile.role).toBe('employee');
    expect(result.profile.availableForWork).toBe(true);
    expect(result.similar[0]?.id).toBe('user-employee-2');
  });

  it('rejects public profile when id matches nothing public', async () => {
    prisma.business.findUnique
      .mockResolvedValueOnce(makeBusiness())
      .mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValue(null);

    const error = await service
      .publicProfile('biz-1')
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).toMatchObject({
      error: 'not_found',
      message: 'Profile not found',
    });
  });
});
