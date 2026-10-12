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
import { NotificationsService } from '../notifications/notifications.service';

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
  specialty: 'إنتاج/صناعة',
  skills: ['خياطة'],
  workType: ['كامل'],
  experience: null,
  salary: null,
  salaryType: 'حسب الاتفاق',
  pricing: null,
  servicePlace: null,
  sellMethod: null,
  priceMethod: null,
  condition: null,
  price: null,
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  author: makeAuthor(),
  business: null,
  categories: [],
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
  category: { findMany: ReturnType<typeof vi.fn> };
  like: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
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
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  postCategory: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
  user: { findUnique: ReturnType<typeof vi.fn> };
};

describe('PostsService', () => {
  let prisma: PrismaMock;
  let service: PostsService;

  beforeEach(() => {
    prisma = {
      post: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      business: { findUnique: vi.fn() },
      category: { findMany: vi.fn().mockImplementation(async (args: { where?: { id?: { in?: string[] } } }) => {
        const ids = args.where?.id?.in ?? [];
        return ids.map((id) => ({ id, appliesTo: 'both' }));
      }) },
      like: {
        upsert: vi.fn().mockResolvedValue(undefined),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
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
        update: vi.fn(),
        delete: vi.fn().mockResolvedValue(undefined),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      postCategory: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      user: { findUnique: vi.fn().mockResolvedValue({ name: 'أحمد' }) },
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

    const notifications = {
      notify: vi.fn().mockResolvedValue(undefined),
      notifyLike: vi.fn().mockResolvedValue(undefined),
    };
    service = new PostsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      {
        validateSelections: vi.fn().mockResolvedValue({}),
      } as never,
    );
  });

  describe('listMine', () => {
    it('lists the current user’s posts with pagination', async () => {
      const mine = makePost({ authorId: actor.id });
      prisma.post.findMany.mockResolvedValue([mine]);
      prisma.post.count.mockResolvedValue(1);

      const result = await service.listMine(actor, { page: 1, limit: 10 });

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, authorId: actor.id },
          skip: 0,
          take: 10,
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
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
        specialty: 'إنتاج/صناعة',
        skills: ['خياطة'],
        workType: ['كامل'],
        salaryType: 'حسب الاتفاق',
      });

      expect(result.post.id).toBe('post-1');
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authorId: actor.id,
          type: PostType.job_offering,
          specialty: 'إنتاج/صناعة',
          salaryType: 'حسب الاتفاق',
        }),
        include: expect.objectContaining({
          author: { include: { location: true } },
          business: true,
        }),
      });
      expect(prisma.post.create.mock.calls[0]?.[0]?.data).not.toHaveProperty(
        'categories',
      );
    });

    it('stores uploaded images and sets media to image', async () => {
      prisma.post.create.mockResolvedValue(
        makePost({
          media: MediaType.image,
          imageUrls: ['/uploads/posts/a.jpg'],
        }),
      );

      await service.create(
        actor,
        {
          type: PostType.job_offering,
          title: 'مطلوب خياط',
          body: 'نبحث عن خياط ماهر',
          location: 'دمشق',
          specialty: 'إنتاج/صناعة',
          skills: ['خياطة'],
          workType: ['كامل'],
          salaryType: 'حسب الاتفاق',
        },
        [
          {
            fieldname: 'images',
            filename: 'a.jpg',
          } as Express.Multer.File,
        ],
      );

      expect(prisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          media: MediaType.image,
          imageUrls: ['/uploads/posts/a.jpg'],
        }),
        include: expect.any(Object),
      });
    });

    it('stores an uploaded reel video', async () => {
      prisma.post.create.mockResolvedValue(
        makePost({
          type: PostType.reel,
          media: MediaType.video,
          videoUrl: '/uploads/posts/r.mp4',
        }),
      );

      await service.create(
        actor,
        {
          type: PostType.reel,
          title: 'تشكيلة صيفية',
          body: 'جولة في المشغل',
          location: 'دمشق',
        },
        [
          {
            fieldname: 'video',
            filename: 'r.mp4',
          } as Express.Multer.File,
        ],
      );

      expect(prisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: PostType.reel,
          media: MediaType.video,
          videoUrl: '/uploads/posts/r.mp4',
        }),
        include: expect.any(Object),
      });
    });

    it('creates a post without categories', async () => {
      prisma.post.create.mockResolvedValue(makePost());

      await service.create(actor, {
        type: PostType.job_offering,
        title: 'مطلوب خياط',
        body: 'نبحث عن خياط ماهر',
        location: 'دمشق',
        specialty: 'إنتاج/صناعة',
        skills: ['خياطة'],
        workType: ['كامل'],
        salaryType: 'حسب الاتفاق',
      });

      expect(prisma.post.create).toHaveBeenCalled();
      expect(prisma.category.findMany).not.toHaveBeenCalled();
    });

    it('creates a reel with video', async () => {
      prisma.post.create.mockResolvedValue(
        makePost({
          type: PostType.reel,
          media: MediaType.video,
          videoUrl: '/uploads/reels/a.mp4',
        }),
      );

      await service.create(actor, {
        type: PostType.reel,
        title: 'تشكيلة صيفية',
        body: 'جولة في المشغل',
        location: 'دمشق',
        videoUrl: '/uploads/reels/a.mp4',
      });

      expect(prisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: PostType.reel,
          media: MediaType.video,
          videoUrl: '/uploads/reels/a.mp4',
        }),
        include: expect.anything(),
      });
    });

    it('rejects a reel without videoUrl', async () => {
      const error = await service
        .create(actor, {
          type: PostType.reel,
          title: 'تشكيلة صيفية',
          body: 'جولة في المشغل',
          location: 'دمشق',
          categoryIds: ['cat-1'],
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        fields: { videoUrl: expect.any(String) },
      });
    });

    it('rejects a job_offering without specialty', async () => {
      const error = await service
        .create(actor, {
          type: PostType.job_offering,
          title: 'مطلوب خياط',
          body: 'نبحث عن خياط ماهر',
          location: 'دمشق',
          skills: ['خياطة'],
          workType: ['كامل'],
          salaryType: 'حسب الاتفاق',
          categoryIds: ['cat-1'],
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
          specialty: 'إنتاج/صناعة',
          skills: ['خياطة'],
          salaryType: 'حسب الاتفاق',
          categoryIds: ['cat-1'],
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: { workType: expect.any(String) },
      });
    });

    it('rejects a job_offering without skills or salaryType', async () => {
      const error = await service
        .create(actor, {
          type: PostType.job_offering,
          title: 'مطلوب خياط',
          body: 'نبحث عن خياط ماهر',
          location: 'دمشق',
          specialty: 'إنتاج/صناعة',
          workType: ['كامل'],
          categoryIds: ['cat-1'],
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: {
          skills: expect.any(String),
          salaryType: expect.any(String),
        },
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
          categoryIds: ['cat-1'],
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: { condition: expect.any(String) },
      });
    });

    it('rejects a product_offering without sell/price methods', async () => {
      const error = await service
        .create(actor, {
          type: PostType.product_offering,
          title: 'منتج للبيع',
          body: 'قميص',
          location: 'دمشق',
          specialty: 'ألبسة رجالية',
          categoryIds: ['cat-1'],
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: {
          sellMethod: expect.any(String),
          priceMethod: expect.any(String),
        },
      });
    });

    it('rejects a service_offering without servicePlace or pricing', async () => {
      const error = await service
        .create(actor, {
          type: PostType.service_offering,
          title: 'خدمة خياطة',
          body: 'أقدم خدمة خياطة',
          location: 'دمشق',
          specialty: 'خياطة',
          categoryIds: ['cat-1'],
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: {
          servicePlace: expect.any(String),
          pricing: expect.any(String),
        },
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
          servicePlace: 'في المشغل',
          pricing: 'بالقطعة',
          media: MediaType.image,
          categoryIds: ['cat-1'],
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
          servicePlace: 'في المشغل',
          pricing: 'بالقطعة',
          media: MediaType.video,
          categoryIds: ['cat-1'],
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
          specialty: 'إنتاج/صناعة',
          skills: ['خياطة'],
          workType: ['كامل'],
          salaryType: 'حسب الاتفاق',
          businessId: 'biz-1',
          categoryIds: ['cat-1'],
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
        include: expect.objectContaining({
          author: { include: { location: true } },
          business: true,
        }),
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

    it('the comment author can update their comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: actor.id,
      });
      prisma.comment.update.mockResolvedValue({
        id: 'comment-1',
        body: 'تعليق محدّث',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        author: {
          id: actor.id,
          name: 'أحمد',
          avatarUrl: null,
        },
      });

      const result = await service.updateComment('comment-1', actor, {
        body: 'تعليق محدّث',
      });

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { body: 'تعليق محدّث' },
        include: { author: true },
      });
      expect(result.comment.body).toBe('تعليق محدّث');
    });

    it('a stranger cannot update someone else’s comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: other.id,
      });

      const error = await service
        .updateComment('comment-1', actor, { body: 'اختراق' })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(prisma.comment.update).not.toHaveBeenCalled();
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
