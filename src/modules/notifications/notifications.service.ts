import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import {
  NotificationResponse,
  toNotificationResponse,
} from './notifications.mapper';

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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget notification write. Never throws.
   * Callers use this AFTER their own transaction commits — a notification
   * failure must never roll back or block the business operation.
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

      await this.prisma.notification.create({ data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(
        `Failed to write notification for user ${input.userId}: ${message}`,
      );
    }
  }

  /**
   * Like-notification with one-hour batching.
   * If an unread like-notification for the same post exists within the
   * last hour, increment its count. Otherwise create a new one.
   *
   * Never throws.
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
        await this.prisma.notification.update({
          where: { id: existing.id },
          data: { body: `${count} أشخاص أعجبوا بمنشورك` },
        });
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

  async markAllRead(actor: AuthenticatedUser): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId: actor.id, read: false },
      data: { read: true },
    });

    return { updated: result.count };
  }
}
