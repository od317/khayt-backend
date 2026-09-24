import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { NotificationsService } from './notifications.service';

const actor: AuthenticatedUser = {
  id: 'user-1',
  role: 'employee' as never,
  phone: '0994000001',
};

const makeNotification = (overrides: Record<string, unknown> = {}) => ({
  id: 'notif-1',
  userId: actor.id,
  actorId: null,
  type: NotificationType.order_status,
  title: 'طلبك في الطريق',
  body: 'طلبك ORD-1001 في الطريق إليك',
  linkTo: '/orders/order-1',
  read: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

type PrismaMock = {
  notification: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('NotificationsService', () => {
  let prisma: PrismaMock;
  let service: NotificationsService;

  beforeEach(() => {
    prisma = {
      notification: {
        create: vi.fn().mockResolvedValue(makeNotification()),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: vi.fn(),
    };

    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)(prisma);
      }
      return undefined;
    });

    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  describe('notify', () => {
    it('writes a notification', async () => {
      await service.notify({
        userId: 'user-2',
        type: NotificationType.order_placed,
        title: 'طلب جديد',
        body: 'طلب جديد ORD-1001',
        linkTo: '/orders/order-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.order_placed,
          title: 'طلب جديد',
          linkTo: '/orders/order-1',
        }),
      });
    });

    it('swallows errors — never throws', async () => {
      prisma.notification.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.notify({
          userId: 'user-2',
          type: NotificationType.order_status,
          title: 't',
          body: 'b',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('notifyLike', () => {
    it('creates a new like notification when none exists', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await service.notifyLike({
        userId: 'post-author',
        actorId: 'liker',
        actorName: 'أحمد',
        postId: 'post-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.new_like,
          body: 'أحمد أعجب بمنشورك',
          linkTo: '/posts/post-1',
        }),
      });
    });

    it('increments the count when a recent unread like-notification exists', async () => {
      prisma.notification.findFirst.mockResolvedValue(
        makeNotification({
          type: NotificationType.new_like,
          body: '1 أشخاص أعجبوا بمنشورك',
          linkTo: '/posts/post-1',
        }),
      );

      await service.notifyLike({
        userId: 'post-author',
        actorId: 'liker',
        actorName: 'أحمد',
        postId: 'post-1',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { body: '2 أشخاص أعجبوا بمنشورك' },
      });
    });

    it('swallows errors — never throws', async () => {
      prisma.notification.findFirst.mockRejectedValue(new Error('db down'));

      await expect(
        service.notifyLike({
          userId: 'post-author',
          actorId: 'liker',
          actorName: 'أحمد',
          postId: 'post-1',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('markRead', () => {
    it('404s for a notification the user does not own', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      const error = await service
        .markRead('notif-1', actor)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('marks the notification read', async () => {
      prisma.notification.findFirst.mockResolvedValue(makeNotification());
      prisma.notification.update.mockResolvedValue(
        makeNotification({ read: true }),
      );

      const result = await service.markRead('notif-1', actor);

      expect(result.notification.read).toBe(true);
    });
  });

  describe('markAllRead', () => {
    it('marks all unread notifications read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllRead(actor);

      expect(result.updated).toBe(3);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: actor.id, read: false },
        data: { read: true },
      });
    });
  });
});
