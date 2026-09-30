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

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkTo?: string;
  actorId?: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Fire-and-forget notification write. Never throws.
   * Callers use this AFTER their own transaction commits.
   * After the DB write succeeds, publishes to the user's SSE channel.
   */
  async notify(input: NotifyInput): Promise<void> {
    try {
      const data: Prisma.NotificationCreateInput = {
        user: { connect: { id: input.userId } },
        type: input.type,
        title: input.title,
        body: input.body,
        linkTo: input.linkTo ?? null,
        actorId: input.actorId ?? null,
      };

      const created = await this.prisma.notification.create({ data });
      await this.publishNotification(created);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(
        `Failed to write notification for user ${input.userId}: ${message}`,
      );
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
    try {
      const linkTo = `/posts/${input.postId}`;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: input.userId,
          type: NotificationType.new_like,
          linkTo,
          read: false,
          createdAt: { gte: oneHourAgo },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        const match = existing.body.match(/^(\d+)/);
        const count = match ? parseInt(match[1]!, 10) + 1 : 2;
        const updated = await this.prisma.notification.update({
          where: { id: existing.id },
          data: { body: `${count} أشخاص أعجبوا بمنشورك` },
        });
        await this.publishNotification(updated);
        return;
      }

      await this.notify({
        userId: input.userId,
        type: NotificationType.new_like,
        title: 'إعجاب جديد',
        body: `${input.actorName} أعجب بمنشورك`,
        linkTo,
        actorId: input.actorId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(
        `Failed to write like notification for user ${input.userId}: ${message}`,
      );
    }
  }

  async list(
    query: QueryNotificationsDto,
    actor: AuthenticatedUser,
  ): Promise<Paginated<NotificationResponse> & { unreadCount: number }> {
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

    const page = paginate(
      rows.map(toNotificationResponse),
      total,
      query.page,
      query.limit,
    );

    return { ...page, unreadCount };
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
        message: 'Notification not found',
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

  private async publishNotification(notification: Notification): Promise<void> {
    const payload: NotificationResponse = toNotificationResponse(notification);
    await this.redis.publish(
      NOTIFY_USER_CHANNEL(notification.userId),
      JSON.stringify(payload),
    );
  }
}
