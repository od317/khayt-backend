import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryStatus,
  NotificationType,
  OrderStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from '../orders/orders.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import {
  DeliveryResponse,
  DriverResponse,
  OrderSummary,
  toDeliveryResponse,
  toDriverResponse,
  toOrderSummary,
} from './delivery.mapper';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    query: QueryDeliveriesDto,
    actor: AuthenticatedUser,
  ): Promise<Paginated<DeliveryResponse>> {
    const where: Prisma.DeliveryWhereInput = {};

    if (actor.role === UserRole.delivery) {
      where.driverId = actor.id;
    } else if (query.driverId) {
      where.driverId = query.driverId;
    }

    if (query.status) where.status = query.status;
    if (query.area) {
      where.area = { contains: query.area, mode: 'insensitive' };
    }
    if (query.q) {
      where.number = { contains: query.q, mode: 'insensitive' };
    }

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.delivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          driver: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return paginate(
      rows.map(toDeliveryResponse),
      total,
      query.page,
      query.limit,
    );
  }

  async detail(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{
    delivery: DeliveryResponse;
    orders: OrderSummary[];
    driver: DriverResponse | null;
  }> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        driver: true,
        orders: {
          include: {
            order: {
              include: { store: true },
            },
          },
        },
        _count: { select: { orders: true } },
      },
    });

    if (!delivery) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Delivery not found',
      });
    }

    if (actor.role === UserRole.delivery && delivery.driverId !== actor.id) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Delivery not found',
      });
    }

    return {
      delivery: toDeliveryResponse(delivery),
      orders: delivery.orders.map((o) => toOrderSummary(o.order)),
      driver: delivery.driver ? toDriverResponse(delivery.driver) : null,
    };
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateDeliveryDto,
  ): Promise<{ delivery: DeliveryResponse }> {
    const uniqueOrderIds = Array.from(new Set(dto.orderIds));

    const orders = await this.prisma.order.findMany({
      where: { id: { in: uniqueOrderIds } },
      select: {
        id: true,
        number: true,
        status: true,
        address: true,
        lat: true,
        lng: true,
      },
    });

    const foundIds = new Set(orders.map((o) => o.id));
    for (const id of uniqueOrderIds) {
      if (!foundIds.has(id)) {
        throw new NotFoundException({
          error: 'not_found',
          message: 'Order not found',
        });
      }
    }

    for (const order of orders) {
      if (order.status !== OrderStatus.ready) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: `Order ${order.number} is not ready`,
            fields: {
              orderIds: `order ${order.number} is not ready`,
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const assigned = await this.prisma.deliveryOrder.findFirst({
      where: { orderId: { in: uniqueOrderIds } },
    });
    if (assigned) {
      throw new ConflictException({
        error: 'order_already_assigned',
        message: 'One or more orders are already assigned to a delivery',
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('delivery_number_seq') AS nextval
      `;
      const number = `DLV-${nextval.toString()}`;

      const area = Array.from(
        new Set(
          orders
            .map((order) => order.address.trim())
            .filter((address) => address.length > 0),
        ),
      ).join(' · ');

      const delivery = await tx.delivery.create({
        data: {
          number,
          area: area || '—',
          status: DeliveryStatus.unassigned,
          orders: {
            create: uniqueOrderIds.map((orderId) => ({ orderId })),
          },
        },
        include: {
          driver: true,
          _count: { select: { orders: true } },
        },
      });

      return delivery;
    });

    return { delivery: toDeliveryResponse(created) };
  }

  async update(
    id: string,
    actor: AuthenticatedUser,
    dto: UpdateDeliveryDto,
  ): Promise<{ delivery: DeliveryResponse }> {
    const existing = await this.prisma.delivery.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Delivery not found',
      });
    }

    if (dto.driverId) {
      const driver = await this.prisma.user.findUnique({
        where: { id: dto.driverId },
        select: { role: true, suspended: true },
      });
      if (!driver || driver.role !== UserRole.delivery || driver.suspended) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: 'driverId must reference an active delivery user',
            fields: { driverId: 'must reference an active delivery user' },
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const data: Prisma.DeliveryUpdateInput = {};
    if (dto.driverId !== undefined) {
      data.driver = { connect: { id: dto.driverId } };
    }
    if (dto.area !== undefined) {
      data.area = dto.area;
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data,
      include: {
        driver: true,
        _count: { select: { orders: true } },
      },
    });

    return { delivery: toDeliveryResponse(updated) };
  }

  async updateStatus(
    id: string,
    actor: AuthenticatedUser,
    dto: UpdateDeliveryStatusDto,
  ): Promise<{ delivery: DeliveryResponse }> {
    const existing = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        orders: { select: { orderId: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Delivery not found',
      });
    }

    if (dto.status === DeliveryStatus.in_transit && !existing.driverId) {
      throw new HttpException(
        {
          error: 'no_driver_assigned',
          message: 'A delivery cannot move to in_transit without a driver',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!this.isLegalTransition(existing.status, dto.status)) {
      throw new HttpException(
        {
          error: 'invalid_transition',
          message: 'Transition not allowed',
          from: existing.status,
          to: dto.status,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const orderIds = existing.orders.map((o) => o.orderId);

    const result = await this.prisma.$transaction(async (tx) => {
      let cascadeTo: OrderStatus | null = null;
      if (dto.status === DeliveryStatus.in_transit) {
        cascadeTo = OrderStatus.in_transit;
      } else if (dto.status === DeliveryStatus.delivered) {
        cascadeTo = OrderStatus.delivered;
      } else if (dto.status === DeliveryStatus.failed) {
        cascadeTo = OrderStatus.failed;
      }

      if (cascadeTo) {
        for (const orderId of orderIds) {
          await this.orders.cascadeOrderStatus(tx, orderId, cascadeTo);
        }
      }

      const data: Prisma.DeliveryUpdateInput = { status: dto.status };
      if (dto.status === DeliveryStatus.delivered) {
        data.deliveredAt = new Date();
      }

      const updated = await tx.delivery.update({
        where: { id },
        data,
        include: {
          driver: true,
          _count: { select: { orders: true } },
        },
      });

      return updated;
    });

    // Notifications — after the transaction commits.
    // Re-read the orders we cascaded so we have their numbers, storeIds,
    // and (for delivered) the distinct supplier business ids.
    if (orderIds.length > 0) {
      const orderRows = await this.prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, number: true, storeId: true },
      });

      if (dto.status === DeliveryStatus.delivered) {
        // Notify each store.
        for (const order of orderRows) {
          await this.notifications.notify({
            userId: order.storeId,
            type: NotificationType.order_delivered,
            title: 'تم التسليم',
            body: `تم تسليم طلبك ${order.number}`,
            linkTo: `/orders/${order.id}`,
          });
        }

      }
    }

    return { delivery: toDeliveryResponse(result) };
  }

  async listDrivers(): Promise<{ items: DriverResponse[] }> {
    const drivers = await this.prisma.user.findMany({
      where: {
        role: UserRole.delivery,
        suspended: false,
      },
      orderBy: { name: 'asc' },
    });

    return { items: drivers.map(toDriverResponse) };
  }

  private isLegalTransition(from: DeliveryStatus, to: DeliveryStatus): boolean {
    if (
      from === DeliveryStatus.unassigned &&
      to === DeliveryStatus.in_transit
    ) {
      return true;
    }
    if (from === DeliveryStatus.in_transit && to === DeliveryStatus.delivered) {
      return true;
    }
    if (from === DeliveryStatus.in_transit && to === DeliveryStatus.failed) {
      return true;
    }
    return false;
  }
}
