import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsSseController } from './notifications.sse.controller';
import { NotificationsPubSub } from './notifications.pubsub';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController, NotificationsSseController],
  providers: [NotificationsService, NotificationsPubSub],
  exports: [NotificationsService, NotificationsPubSub],
})
export class NotificationsModule {}
