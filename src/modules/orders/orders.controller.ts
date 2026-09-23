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
import { RequireUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { Paginated } from '../../common/utils/pagination';
import { UserRole } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderLineDto } from './dto/update-order-line.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  OrderDetailResponse,
  OrderLineResponse,
  OrderListItemResponse,
} from './orders.mapper';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(
    @Query() query: QueryOrdersDto,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<Paginated<OrderListItemResponse>> {
    return this.orders.list(query, user);
  }

  @Get(':id')
  detail(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<OrderDetailResponse> {
    return this.orders.detail(id, user);
  }

  @Post()
  @Roles(UserRole.store)
  @HttpCode(HttpStatus.CREATED)
  create(
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderDetailResponse> {
    return this.orders.create(user, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<{ order: OrderListItemResponse }> {
    return this.orders.updateStatus(id, user, dto);
  }

  @Patch(':id/lines/:lineId')
  @HttpCode(HttpStatus.OK)
  updateLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrderLineDto,
  ): Promise<{ line: OrderLineResponse }> {
    return this.orders.updateLine(id, lineId, user, dto);
  }
}
