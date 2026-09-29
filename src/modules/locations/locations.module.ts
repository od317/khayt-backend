import { Module } from '@nestjs/common';
import { AdminLocationsController } from './admin-locations.controller';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [LocationsController, AdminLocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
