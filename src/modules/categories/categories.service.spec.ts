import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoryApplies, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CategoriesService } from './categories.service';

const row = {
  id: 'cat-qumsan',
  name: 'قمصان',
  slug: 'qumsan',
  appliesTo: CategoryApplies.both,
  sortOrder: 10,
};

describe('CategoriesService', () => {
  let prisma: {
    category: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };
  let service: CategoriesService;

  beforeEach(() => {
    prisma = {
      category: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  it('lists categories ordered by sortOrder then name', async () => {
    prisma.category.findMany.mockResolvedValue([row]);

    const result = await service.list({});

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    );
    expect(result.items[0]).toEqual({
      id: 'cat-qumsan',
      name: 'قمصان',
      slug: 'qumsan',
      appliesTo: 'both',
      sortOrder: 10,
    });
  });

  it('creates a category', async () => {
    prisma.category.create.mockResolvedValue(row);

    const result = await service.create({
      name: 'قمصان',
      slug: 'qumsan',
      appliesTo: CategoryApplies.both,
      sortOrder: 10,
    });

    expect(prisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'قمصان',
          slug: 'qumsan',
          appliesTo: CategoryApplies.both,
          sortOrder: 10,
        }),
      }),
    );
    expect(result.category.slug).toBe('qumsan');
  });

  it('rejects a duplicate slug', async () => {
    prisma.category.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const error = await service
      .create({
        name: 'قمصان',
        slug: 'qumsan',
        appliesTo: CategoryApplies.both,
      })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ConflictException);
  });

  it('refuses to delete a category used by posts', async () => {
    prisma.category.findUnique.mockResolvedValue({
      ...row,
      _count: { posts: 2 },
    });

    const error = await service.remove(row.id).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ConflictException);
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('returns not found when updating a missing category', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    const error = await service
      .update('missing', { name: 'x' })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(NotFoundException);
  });
});
