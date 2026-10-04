import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import {
  AreaResponse,
  CityFlatResponse,
  CityResponse,
  LocationsService,
} from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Public()
  @Get()
  list(): Promise<{ items: CityResponse[] }> {
    return this.locations.list();
  }

  @Public()
  @Get('cities')
  listCities(): Promise<{ items: CityFlatResponse[] }> {
    return this.locations.listCities();
  }

  @Public()
  @Get(':id/areas')
  listAreas(@Param('id') id: string): Promise<{ items: AreaResponse[] }> {
    return this.locations.listAreas(id);
  }
}
