import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { interval, map, merge, Observable } from 'rxjs';
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
import {
  ORDER_CHANNEL,
  NotificationsPubSub,
} from '../notifications/notifications.pubsub';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly pubsub: NotificationsPubSub,
  ) {}

  @Get()
  list(
    @Query() query: QueryOrdersDto,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<Paginated<OrderListItemResponse>> {
    return this.orders.list(query, user);
  }

  @Sse(':id/stream')
  async streamOne(
    @Param('id', ParseUUIDPipe) id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<Observable<MessageEvent>> {
    await this.orders.assertCanReadById(id, user);
    return this.mergeWithHeartbeat(this.statusEvents(ORDER_CHANNEL(id)));
  }

  @Get(':id')
  detail(
    @Param('id', ParseUUIDPipe) id: string,
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
    @Param('id', ParseUUIDPipe) id: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<{ order: OrderListItemResponse }> {
    return this.orders.updateStatus(id, user, dto);
  }

  @Patch(':id/lines/:lineId')
  @HttpCode(HttpStatus.OK)
  updateLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrderLineDto,
  ): Promise<{ line: OrderLineResponse }> {
    return this.orders.updateLine(id, lineId, user, dto);
  }

  private statusEvents(channel: string): Observable<MessageEvent> {
    return this.pubsub.streamChannel(channel).pipe(
      map((raw): MessageEvent => {
        let data: string | object;
        try {
          data = JSON.parse(raw) as object;
        } catch {
          data = { parseError: true };
        }
        return {
          type: 'status',
          data,
        };
      }),
    );
  }

  private mergeWithHeartbeat(
    events$: Observable<MessageEvent>,
  ): Observable<MessageEvent> {
    const heartbeat$ = interval(30000).pipe(
      map((): MessageEvent => ({
        type: 'ping',
        data: 'ping',
      })),
    );
    return merge(events$, heartbeat$);
  }
}
