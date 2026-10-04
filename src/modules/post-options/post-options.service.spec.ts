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
        id: 'w1',
        kind: PostOptionKind.work_type,
        label: 'كامل',
        parentId: null,
        sortOrder: 0,
        postTypes: [PostType.job_offering],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await service.listForType({ type: PostType.job_offering });

    expect(result.type).toBe(PostType.job_offering);
    expect(result.fields.specialty).toEqual([
      expect.objectContaining({ id: 's1', label: 'إنتاج/صناعة' }),
    ]);
    expect(result.fields.workType).toEqual([
      expect.objectContaining({ label: 'كامل' }),
    ]);
    expect(result.fields.skills).toEqual([]);
    expect(result.fields.salaryType).toEqual([]);
    expect(result.fields).not.toHaveProperty('experience');
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
