import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BillingService } from './billing.service';
import { ReceivingController } from './receiving.controller';
import { BillsController } from './bills.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [ReceivingController, BillsController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
