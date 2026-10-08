import { Module } from '@nestjs/common';
import { ShippingCompaniesController } from './shipping-companies.controller';
import { AdminShippingCompaniesController } from './admin-shipping-companies.controller';
import { ShippingCompaniesService } from './shipping-companies.service';

@Module({
  controllers: [
    ShippingCompaniesController,
    AdminShippingCompaniesController,
  ],
  providers: [ShippingCompaniesService],
  exports: [ShippingCompaniesService],
})
export class ShippingCompaniesModule {}