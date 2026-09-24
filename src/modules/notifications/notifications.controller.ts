import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { Paginated } from '../../common/utils/pagination';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationResponse } from './notifications.mapper';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @Query() query: QueryNotificationsDto,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<Paginated<NotificationResponse> & { unreadCount: number }> {
    return this.notifications.list(query, user);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ updated: number }> {
    return this.notifications.markAllRead(user);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ notification: NotificationResponse }> {
    return this.notifications.markRead(id, user);
  }
}
