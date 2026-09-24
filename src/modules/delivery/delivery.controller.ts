import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { Paginated } from '../../common/utils/pagination';
import {
  DeliveryResponse,
  DriverResponse,
  OrderSummary,
} from './delivery.mapper';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

const DELIVERY_ROLES = [
  UserRole.delivery,
  UserRole.admin,
  UserRole.super_admin,
] as const;

@Controller('deliveries')
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get()
  @Roles(...DELIVERY_ROLES)
  list(
    @Query() query: QueryDeliveriesDto,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<Paginated<DeliveryResponse>> {
    return this.delivery.list(query, user);
  }

  @Get(':id')
  @Roles(...DELIVERY_ROLES)
  detail(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{
    delivery: DeliveryResponse;
    orders: OrderSummary[];
    driver: DriverResponse | null;
  }> {
    return this.delivery.detail(id, user);
  }

  @Post()
  @Roles(...DELIVERY_ROLES)
  @HttpCode(HttpStatus.CREATED)
  create(
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: CreateDeliveryDto,
  ): Promise<{ delivery: DeliveryResponse }> {
    return this.delivery.create(user, dto);
  }

  @Patch(':id')
  @Roles(...DELIVERY_ROLES)
  update(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: UpdateDeliveryDto,
  ): Promise<{ delivery: DeliveryResponse }> {
    return this.delivery.update(id, user, dto);
  }

  @Patch(':id/status')
  @Roles(...DELIVERY_ROLES)
  updateStatus(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: UpdateDeliveryStatusDto,
  ): Promise<{ delivery: DeliveryResponse }> {
    return this.delivery.updateStatus(id, user, dto);
  }
}
