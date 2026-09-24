import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { DeliveryController } from './delivery.controller';
import { DriversController } from './drivers.controller';
import { DeliveryService } from './delivery.service';

@Module({
  imports: [OrdersModule],
  controllers: [DeliveryController, DriversController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
