import { HttpException } from '@nestjs/common';
import { PostOptionKind, PostType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PostOptionsService } from './post-options.service';

describe('PostOptionsService', () => {
  let prisma: {
    postOption: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };
  let service: PostOptionsService;

  beforeEach(() => {
    prisma = {
      postOption: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new PostOptionsService(prisma as unknown as PrismaService);
  });

  it('groups active options by field for a post type', async () => {
    prisma.postOption.findMany.mockResolvedValue([
      {
        id: 's1',
        kind: PostOptionKind.specialty,
        label: 'إنتاج/صناعة',
        parentId: null,
        sortOrder: 0,
        postTypes: [PostType.job_offering],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sk1',
        kind: PostOptionKind.skill,
        label: 'خياطة',
        parentId: 's1',
        sortOrder: 0,
        postTypes: [PostType.job_offering],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await service.list({ type: PostType.job_offering });

    expect(result).toMatchObject({ type: PostType.job_offering });
    if (!('fields' in result)) throw new Error('expected typed response');
    expect(result.fields.specialty).toEqual([
      expect.objectContaining({ id: 's1', label: 'إنتاج/صناعة' }),
    ]);
    expect(result.fields.skills).toEqual([
      expect.objectContaining({ id: 'sk1', label: 'خياطة' }),
    ]);
    expect(result.fields).not.toHaveProperty('salaryType');
    expect(result.fields).not.toHaveProperty('workType');
    expect(result.fields).not.toHaveProperty('experience');
  });

  it('returns every post type under byType when type is omitted', async () => {
    prisma.postOption.findMany.mockResolvedValue([
      {
        id: 's1',
        kind: PostOptionKind.specialty,
        label: 'إنتاج/صناعة',
        parentId: null,
        sortOrder: 0,
        postTypes: [PostType.job_offering, PostType.job_seeking],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'c1',
        kind: PostOptionKind.condition,
        label: 'جديدة',
        parentId: null,
        sortOrder: 0,
        postTypes: [PostType.material_offering],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await service.list({});

    expect(result).toHaveProperty('byType');
    if (!('byType' in result)) throw new Error('expected catalog response');
    expect(result.byType.job_offering.fields.specialty).toEqual([
      expect.objectContaining({ id: 's1' }),
    ]);
    expect(result.byType.job_seeking.fields.specialty).toEqual([
      expect.objectContaining({ id: 's1' }),
    ]);
    expect(result.byType.material_offering.fields.condition).toEqual([
      expect.objectContaining({ label: 'جديدة' }),
    ]);
    expect(result.byType.product_offering.fields.specialty).toEqual([]);
    expect(result.byType.reel.fields).toEqual({});
  });

  it('requires parentId when creating a skill', async () => {
    const error = await service
      .create({
        kind: PostOptionKind.skill,
        postTypes: [PostType.job_offering],
        label: 'خياطة',
      })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getResponse()).toMatchObject({
      error: 'validation_failed',
      fields: { parentId: 'required for skill options' },
    });
  });
});
