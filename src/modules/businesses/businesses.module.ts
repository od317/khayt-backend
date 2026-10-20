import { Module } from '@nestjs/common';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { BusinessOwnerGuard } from '../../common/guards/business-owner.guard';
import { MarketersController } from './marketers.controller';
import { ProfilesController } from './profiles.controller';

@Module({
  controllers: [
    BusinessesController,
    ProfilesController,
    MarketersController,
  ],
  providers: [BusinessesService, BusinessOwnerGuard],
  exports: [BusinessesService],
})
export class BusinessesModule {}
