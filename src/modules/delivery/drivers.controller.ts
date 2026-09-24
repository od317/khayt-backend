import { Controller, Get } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeliveryService } from './delivery.service';
import { DriverResponse } from './delivery.mapper';

const DRIVER_ROLES = [
  UserRole.delivery,
  UserRole.admin,
  UserRole.super_admin,
] as const;

@Controller('drivers')
export class DriversController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get()
  @Roles(...DRIVER_ROLES)
  list(): Promise<{ items: DriverResponse[] }> {
    return this.delivery.listDrivers();
  }
}
