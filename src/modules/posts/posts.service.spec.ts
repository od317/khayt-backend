import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MediaType, PostType, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { PostsService } from './posts.service';

const actor: AuthenticatedUser = {
  id: 'user-1',
  role: UserRole.employee,
  phone: '0994037669',
};

const other: AuthenticatedUser = {
  id: 'user-2',
  role: UserRole.store,
  phone: '0994037670',
};

const makeAuthor = (overrides: Record<string, unknown> = {}) => ({
  id: actor.id,
  role: UserRole.employee,
  phone: actor.phone,
  name: 'أحمد',
  bio: null,
  avatarUrl: null,
  availableForWork: true,
  verified: false,
  suspended: false,
  onboardingCompleted: false,
  locationId: null,
  location: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const makePost = (overrides: Record<string, unknown> = {}) => ({
  id: 'post-1',
  authorId: actor.id,
  businessId: null,
  type: PostType.job_offering,
  title: 'مطلوب خياط',
  body: 'نبحث عن خياط ماهر',
  media: MediaType.none,
  imageUrls: [],
  videoUrl: null,
  location: 'دمشق',
  active: true,
  specialty: 'خياطة',
  skills: [],
  workType: ['دوام كامل'],
  experience: null,
  salary: null,
  pricing: null,
  condition: null,
  price: null,
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  author: makeAuthor(),
  business: null,
  ...overrides,
});

type PrismaMock = {
  post: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  business: { findUnique: ReturnType<typeof vi.fn> };
  category: { count: ReturnType<typeof vi.fn> };
  like: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  savedPost: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  comment: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  postCategory: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('PostsService', () => {
  let prisma: PrismaMock;
  let service: PostsService;

  beforeEach(() => {
    prisma = {
      post: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      business: { findUnique: vi.fn() },
      category: { count: vi.fn().mockResolvedValue(0) },
      like: {
        upsert: vi.fn().mockResolvedValue(undefined),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      savedPost: {
        upsert: vi.fn().mockResolvedValue(undefined),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      comment: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn().mockResolvedValue(undefined),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      postCategory: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
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

    service = new PostsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a post', async () => {
      const created = makePost();
      prisma.post.create.mockResolvedValue(created);

      const result = await service.create(actor, {
        type: PostType.job_offering,
        title: 'مطلوب خياط',
        body: 'نبحث عن خياط ماهر',
        location: 'دمشق',
        specialty: 'خياطة',
        workType: ['دوام كامل'],
      });

      expect(result.post.id).toBe('post-1');
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authorId: actor.id,
          type: PostType.job_offering,
          specialty: 'خياطة',
        }),
        include: {
          author: { include: { location: true } },
          business: true,
        },
      });
    });

    it('rejects a job_offering without specialty', async () => {
      const error = await service
        .create(actor, {
          type: PostType.job_offering,
          title: 'مطلوب خياط',
          body: 'نبحث عن خياط ماهر',
          location: 'دمشق',
          workType: ['دوام كامل'],
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: { specialty: expect.any(String) },
      });
      expect(prisma.post.create).not.toHaveBeenCalled();
    });

    it('rejects a job_offering without workType', async () => {
      const error = await service
        .create(actor, {
          type: PostType.job_offering,
          title: 'مطلوب خياط',
          body: 'نبحث عن خياط ماهر',
          location: 'دمشق',
          specialty: 'خياطة',
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: { workType: expect.any(String) },
      });
    });

    it('rejects a material_offering without condition', async () => {
      const error = await service
        .create(actor, {
          type: PostType.material_offering,
          title: 'قماش للبيع',
          body: 'قماش قطن',
          location: 'دمشق',
          specialty: 'أقمشة',
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: { condition: expect.any(String) },
      });
    });

    it('rejects a product_offering without price', async () => {
      const error = await service
        .create(actor, {
          type: PostType.product_offering,
          title: 'منتج للبيع',
          body: 'قميص',
          location: 'دمشق',
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: { price: expect.any(String) },
      });
    });

    it('rejects an image post without imageUrls', async () => {
      const error = await service
        .create(actor, {
          type: PostType.service_offering,
          title: 'خدمة خياطة',
          body: 'أقدم خدمة خياطة',
          location: 'دمشق',
          specialty: 'خياطة',
          media: MediaType.image,
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: { imageUrls: expect.any(String) },
      });
    });

    it('rejects a video post without videoUrl', async () => {
      const error = await service
        .create(actor, {
          type: PostType.service_offering,
          title: 'خدمة خياطة',
          body: 'أقدم خدمة خياطة',
          location: 'دمشق',
          specialty: 'خياطة',
          media: MediaType.video,
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: { videoUrl: expect.any(String) },
      });
    });

    it('rejects a businessId the user does not own', async () => {
      prisma.business.findUnique.mockResolvedValue({ ownerId: 'someone-else' });

      const error = await service
        .create(actor, {
          type: PostType.job_offering,
          title: 'مطلوب خياط',
          body: 'نبحث',
          location: 'دمشق',
          specialty: 'خياطة',
          workType: ['دوام كامل'],
          businessId: 'biz-1',
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ForbiddenException);
    });
  });

  describe('detail', () => {
    it('returns 404 for a soft-deleted post', async () => {
      prisma.post.findFirst.mockResolvedValue(null);

      const error = await service
        .detail('post-1', actor)
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('404s an inactive post for a stranger', async () => {
      prisma.post.findFirst.mockResolvedValue(makePost({ active: false }));

      const error = await service
        .detail('post-1', other)
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('returns an inactive post for its author', async () => {
      prisma.post.findFirst.mockResolvedValue(makePost({ active: false }));

      const result = await service.detail('post-1', actor);

      expect(result.post.id).toBe('post-1');
      expect(result.post.active).toBe(false);
    });
  });

  describe('remove', () => {
    it('soft-deletes a post', async () => {
      prisma.post.findFirst.mockResolvedValue({
        authorId: actor.id,
      });
      prisma.post.update.mockResolvedValue(makePost({ deletedAt: new Date() }));

      const result = await service.remove('post-1', actor);

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { deletedAt: expect.any(Date) },
        include: {
          author: { include: { location: true } },
          business: true,
        },
      });
      expect(result.deleted).toBe(true);
    });

    it('rejects deletion by a non-author', async () => {
      prisma.post.findFirst.mockResolvedValue({ authorId: actor.id });

      const error = await service
        .remove('post-1', other)
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(prisma.post.update).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('a deleted post does not appear', async () => {
      await service.list({ page: 1, limit: 20 }, actor);

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });

    it('defaults to active: true', async () => {
      await service.list({ page: 1, limit: 20 }, actor);

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        }),
      );
    });

    it('a stranger cannot see another user’s inactive posts', async () => {
      // Requester is `actor`. The target author is `other`.
      // The service must ignore any authorId the caller passes and
      // force authorId = actor.id.
      await service.list(
        { page: 1, limit: 20, active: 'false', authorId: other.id },
        actor,
      );

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: false,
            authorId: actor.id,
          }),
        }),
      );
    });

    it('rejects active=false for unauthenticated callers', async () => {
      const error = await service
        .list({ page: 1, limit: 20, active: 'false' }, undefined)
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(prisma.post.findMany).not.toHaveBeenCalled();
    });

    it('filters to the current user’s saved posts when savedBy=me', async () => {
      await service.list({ page: 1, limit: 20, savedBy: 'me' }, actor);

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            savedBy: { some: { userId: actor.id } },
          }),
        }),
      );
    });

    it('rejects savedBy=me for unauthenticated callers', async () => {
      const error = await service
        .list({ page: 1, limit: 20, savedBy: 'me' }, undefined)
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(prisma.post.findMany).not.toHaveBeenCalled();
    });
  });

  describe('likes', () => {
    it('liking twice returns the same count', async () => {
      prisma.post.findFirst.mockResolvedValue({ active: true });
      prisma.like.count.mockResolvedValue(1);

      const first = await service.like('post-1', actor);
      const second = await service.like('post-1', actor);

      expect(first.likes).toBe(1);
      expect(second.likes).toBe(1);
      expect(prisma.like.upsert).toHaveBeenCalledTimes(2);
    });

    it('unliking a post that was never liked is a no-op', async () => {
      prisma.like.deleteMany.mockResolvedValue({ count: 0 });
      prisma.like.count.mockResolvedValue(0);

      const result = await service.unlike('post-1', actor);

      expect(result.liked).toBe(false);
      expect(result.likes).toBe(0);
    });
  });

  describe('comments', () => {
    it('cannot comment on a deleted post', async () => {
      prisma.post.findFirst.mockResolvedValue(null);

      const error = await service
        .createComment('post-1', actor, { body: 'تعليق' })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(prisma.comment.create).not.toHaveBeenCalled();
    });

    it('cannot comment on an inactive post', async () => {
      prisma.post.findFirst.mockResolvedValue({ active: false });

      const error = await service
        .createComment('post-1', actor, { body: 'تعليق' })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('the post author can delete any comment on their post', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: other.id,
        post: { authorId: actor.id },
      });

      await service.deleteComment('comment-1', actor);

      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
    });

    it('a stranger cannot delete someone else’s comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: 'user-3',
        post: { authorId: 'user-4' },
      });

      const error = await service
        .deleteComment('comment-1', actor)
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });
  });
});
