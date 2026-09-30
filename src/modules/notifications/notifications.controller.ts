import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
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
  ): Promise<{
    items: NotificationResponse[];
    totalCount: number;
    skipCount: number;
    maxResultCount: number;
    unreadCount: number;
  }> {
    return this.notifications.list(query, user);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ updated: boolean }> {
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

  @Delete('all')
  @HttpCode(HttpStatus.OK)
  removeAll(
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ deleted: boolean }> {
    return this.notifications.removeAll(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{ deleted: true }> {
    return this.notifications.remove(id, user);
  }
}
