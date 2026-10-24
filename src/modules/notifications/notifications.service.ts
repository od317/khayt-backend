import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Notification, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import {
  NotificationResponse,
  toNotificationResponse,
} from './notifications.mapper';
import { NOTIFY_USER_CHANNEL } from './notifications.pubsub';
import { FcmService } from './fcm.service';

export type NotificationsListResponse = Paginated<NotificationResponse> & {
  unreadCount: number;
};

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkTo?: string;
  actorId?: string;
};

function isNonEmptyId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly fcm: FcmService,
  ) {}

  /**
   * Fire-and-forget notification write. Never throws.
   * Callers use this AFTER their own transaction commits.
   * After the DB write succeeds, publishes to the user's SSE channel.
   */
  async notify(input: NotifyInput): Promise<void> {
    if (!isNonEmptyId(input?.userId)) {
      this.logger.warn(
        'Skipping notification write: recipient userId is missing',
      );
      return;
    }

    try {
      const recipient = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!recipient) {
        this.logger.warn(
          `Skipping notification write: recipient user ${input.userId} does not exist`,
        );
        return;
      }

      const data: Prisma.NotificationCreateInput = {
        user: { connect: { id: recipient.id } },
        type: input.type,
        title: input.title,
        body: input.body,
        linkTo: input.linkTo ?? null,
        actorId: isNonEmptyId(input.actorId) ? input.actorId : null,
      };

      const created = await this.prisma.notification.create({ data });
      if (!created) {
        this.logger.warn(
          `Notification create returned empty result for user ${input.userId}`,
        );
        return;
      }
      await this.publishNotification(created);
    } catch (error: unknown) {
      this.logWriteFailure('notification', input.userId, error);
    }
  }

  /**
   * Like-notification with one-hour batching. Never throws.
   * Publishes on both the create and the increment branch.
   */
  async notifyLike(input: {
    userId: string;
    actorId: string;
    actorName: string;
    postId: string;
  }): Promise<void> {
    if (!isNonEmptyId(input?.userId) || !isNonEmptyId(input?.postId)) {
      this.logger.warn(
        'Skipping like notification: post author or postId is missing',
      );
      return;
    }

    try {
      const recipient = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!recipient) {
        this.logger.warn(
          `Skipping like notification: post author ${input.userId} does not exist`,
        );
        return;
      }

      const linkTo = `/posts/${input.postId}`;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: recipient.id,
          type: NotificationType.new_like,
          linkTo,
          read: false,
          createdAt: { gte: oneHourAgo },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing?.id) {
        const match = existing.body.match(/^(\d+)/);
        const count = match ? parseInt(match[1]!, 10) + 1 : 2;
        const updated = await this.prisma.notification.update({
          where: { id: existing.id },
          data: { body: `${count} أشخاص أعجبوا بمنشورك` },
        });
        if (updated) {
          await this.publishNotification(updated);
        }
        return;
      }

      await this.notify({
        userId: recipient.id,
        type: NotificationType.new_like,
        title: 'إعجاب جديد',
        body: `${input.actorName ?? 'مستخدم'} أعجب بمنشورك`,
        linkTo,
        actorId: isNonEmptyId(input.actorId) ? input.actorId : undefined,
      });
    } catch (error: unknown) {
      this.logWriteFailure('like notification', input.userId, error);
    }
  }

  private logWriteFailure(
    kind: string,
    userId: string | undefined,
    error: unknown,
  ): void {
    const message = error instanceof Error ? error.message : 'unknown error';
    const isFk =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003';
    const prefix = `Failed to write ${kind} for user ${userId ?? 'unknown'}: ${message}`;
    if (isFk) {
      this.logger.warn(prefix);
      return;
    }
    this.logger.error(prefix);
  }

  async list(
    query: QueryNotificationsDto,
    actor: AuthenticatedUser,
  ): Promise<NotificationsListResponse> {
    const baseWhere: Prisma.NotificationWhereInput = { userId: actor.id };

    const where: Prisma.NotificationWhereInput = { ...baseWhere };
    if (query.unreadOnly === 'true') {
      where.read = false;
    }

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { ...baseWhere, read: false },
      }),
    ]);

    return {
      ...paginate(
        rows.map(toNotificationResponse),
        total,
        query.page,
        query.limit,
      ),
      unreadCount,
    };
  }

  async markRead(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ notification: NotificationResponse }> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId: actor.id },
    });

    if (!notification) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'الإشعار غير موجود',
      });
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return { notification: toNotificationResponse(updated) };
  }

  async markAllRead(actor: AuthenticatedUser): Promise<{ updated: boolean }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId: actor.id, read: false },
      data: { read: true },
    });

    return { updated: result.count > 0 };
  }

  async remove(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ deleted: true }> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId: actor.id },
    });

    if (!notification) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'الإشعار غير موجود',
      });
    }

    await this.prisma.notification.delete({ where: { id } });
    return { deleted: true };
  }

  async removeAll(actor: AuthenticatedUser): Promise<{ deleted: boolean }> {
    const result = await this.prisma.notification.deleteMany({
      where: { userId: actor.id },
    });

    return { deleted: result.count > 0 };
  }

  private async publishNotification(notification: Notification): Promise<void> {
    if (!notification?.id || !isNonEmptyId(notification.userId)) {
      this.logger.warn('Skipping notification publish: notification is incomplete');
      return;
    }

    const payload: NotificationResponse = toNotificationResponse(notification);
    await this.redis.publish(
      NOTIFY_USER_CHANNEL(notification.userId),
      JSON.stringify(payload),
    );
    await this.fcm.sendToUser(notification.userId, {
      title: notification.title,
      body: notification.body,
      type: notification.type,
      linkTo: notification.linkTo,
    });
  }
}
