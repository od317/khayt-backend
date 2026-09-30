import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { DebugController } from './debug.controller';

@Module({
  imports: [OrdersModule],
  controllers: [DebugController],
})
export class DebugModule {}
