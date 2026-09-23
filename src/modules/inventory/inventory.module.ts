import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { SupplyController } from './supply.controller';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [InventoryController, SupplyController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
