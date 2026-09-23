import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { ReceivingController } from './receiving.controller';
import { BillsController } from './bills.controller';

@Module({
  controllers: [ReceivingController, BillsController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
