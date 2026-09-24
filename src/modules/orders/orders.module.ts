import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersController } from './orders.controller';
import { OrdersSseController } from './orders.sse.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [NotificationsModule],
  controllers: [OrdersController, OrdersSseController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
