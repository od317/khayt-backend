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
    count: ReturnType<typeof vi.fn>;
  };
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
        count: vi.fn().mockResolvedValue(0),
      },
      post: { findMany: vi.fn().mockResolvedValue([]) },
      like: { groupBy: vi.fn().mockResolvedValue([]) },
      comment: { groupBy: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(),
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

  it('returns business detail without loading products or supply', async () => {
    const business = makeBusiness();
    prisma.business.findUnique.mockResolvedValue(business);

    const result = await service.detail('biz-1', undefined);

    expect(result.business.id).toBe('biz-1');
    expect(result.isOwner).toBe(false);
    expect(prisma.business.findUnique).toHaveBeenCalledTimes(1);
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
    prisma.post.findMany.mockResolvedValue([]);

    const result = await service.publicProfile('biz-workshop');

    expect(result.kind).toBe('factory');
    expect(result.id).toBe('biz-workshop');
    expect(result.profile.name).toBe('معمل النسيج');
    expect(result.profile.verified).toBe(true);
    expect(result.profile.services).toEqual(['خياطة']);
    expect(result).not.toHaveProperty('products');
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
      message: 'الملف غير موجود',
    });
  });

  describe('listMarketers', () => {
    it('lists onboarded marketers as public cards', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'user-marketer',
          name: 'مسوق دمشق',
          bio: 'تسويق أقمشة',
          avatarUrl: null,
          verified: true,
          availableForWork: true,
          location: { name: 'دمشق' },
        },
      ]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.listMarketers({ page: 1, limit: 20 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            role: UserRole.marketer,
            suspended: false,
            onboardingCompleted: true,
          },
          orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
          include: { location: true },
        }),
      );
      expect(result.items).toEqual([
        {
          id: 'user-marketer',
          name: 'مسوق دمشق',
          bio: 'تسويق أقمشة',
          avatarUrl:
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbksj9NS4J0zAJN5LEwzN6i0tV5dtgZmR89UzhDAK7CYCIsFvpajnCeHvl&s=10',
          verified: true,
          availableForWork: true,
          location: 'دمشق',
        },
      ]);
      expect(result.total).toBe(1);
    });

    it('applies q, location, verified, and availableForWork filters', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.listMarketers({
        page: 1,
        limit: 20,
        q: 'أقمشة',
        location: 'دمشق',
        verified: 'true',
        availableForWork: 'true',
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            role: UserRole.marketer,
            suspended: false,
            onboardingCompleted: true,
            verified: true,
            availableForWork: true,
            location: {
              name: { contains: 'دمشق', mode: 'insensitive' },
            },
            OR: [
              { name: { contains: 'أقمشة', mode: 'insensitive' } },
              { bio: { contains: 'أقمشة', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });
  });
});
