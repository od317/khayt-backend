import { Module } from '@nestjs/common';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { BusinessOwnerGuard } from '../../common/guards/business-owner.guard';
import { ProfilesController } from './profiles.controller';

@Module({
  controllers: [BusinessesController, ProfilesController],
  providers: [BusinessesService, BusinessOwnerGuard],
  exports: [BusinessesService],
})
export class BusinessesModule {}
