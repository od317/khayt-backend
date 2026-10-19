import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Order,
  OrderStatus,
  Prisma,
  StockMovementType,
  User,
  UserRole,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { ORDER_STATUS_LABELS, orderStatusColor } from '../../common/order-status-labels';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto, parseActiveQueryFlag } from './dto/query-orders.dto';
import { UpdateOrderLineDto } from './dto/update-order-line.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { resolveOrderDropoff } from './order-location';
import {
  canActorAdvance,
  canActorCancel,
  canActorTransition,
  isInternal,
  INTERNAL_ROLES,
  ACTIVE_ORDER_STATUSES,
  COMPLETED_ORDER_STATUSES,
  nextForcedStatus,
} from './order-status';
import {
  OrderDetailResponse,
  OrderLineResponse,
  OrderListItemResponse,
  toOrderDetailResponse,
  toOrderLineResponse,
  toOrderListItem,
} from './orders.mapper';
import { RedisService } from '../../common/redis/redis.service';
import { AppConfig } from '../../config/configuration';
import {
  ORDER_CHANNEL,
  ORDERS_FEED_CHANNEL,
  ORDERS_STORE_CHANNEL,
} from '../notifications/notifications.pubsub';

type OrderWithStore = Order & { store: User };

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) { }

  async list(
    query: QueryOrdersDto,
    actor: AuthenticatedUser,
  ): Promise<Paginated<OrderListItemResponse>> {
    const where: Prisma.OrderWhereInput = {};

    if (
      actor.role === UserRole.store ||
      actor.role === UserRole.workshop
    ) {
      where.storeId = actor.id;
    } else if (isInternal(actor.role)) {
      if (query.storeId) where.storeId = query.storeId;
    } else {
      return paginate([], 0, query.page, query.limit);
    }

    if (query.status) {
      where.status = query.status;
    } else {
      const active = parseActiveQueryFlag(query.active);
      if (active === false) {
        where.status = { in: [...COMPLETED_ORDER_STATUSES] };
      } else {
        where.status = { in: [...ACTIVE_ORDER_STATUSES] };
      }
    }

    if (query.q) {
      where.OR = [{ number: { contains: query.q, mode: 'insensitive' } }];
    }

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { store: true, lines: { select: { quantity: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(rows.map(toOrderListItem), total, query.page, query.limit);
  }

  async detail(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<OrderDetailResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!order) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'الطلب غير موجود',
      });
    }

    this.assertCanRead(order, actor);

    const lines = await this.prisma.orderLine.findMany({
      where: { orderId: id },
      include: {
        product: { select: { name: true, images: true } },
      },
      orderBy: { id: 'asc' },
    });

    const deliveryOrder = await this.prisma.deliveryOrder.findUnique({
      where: { orderId: id },
      include: {
        delivery: {
          include: { driver: true },
        },
      },
    });

    const delivery = deliveryOrder
      ? {
        id: deliveryOrder.delivery.id,
        number: deliveryOrder.delivery.number,
        status: deliveryOrder.delivery.status,
        driver: deliveryOrder.delivery.driver
          ? {
            id: deliveryOrder.delivery.driver.id,
            name: deliveryOrder.delivery.driver.name,
            phone: deliveryOrder.delivery.driver.phone,
          }
          : null,
      }
      : null;

    const allLinesPicked = lines.every((l) => l.picked);
    const ctx = {
      order: { status: order.status, storeId: order.storeId },
      actor,
      allLinesPicked,
    };

    return toOrderDetailResponse(
      order,
      lines,
      {
        canCancel: canActorCancel(ctx),
        canAdvance: canActorAdvance(ctx),
      },
      delivery,
      this.supportContacts(),
    );
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateOrderDto,
  ): Promise<OrderDetailResponse> {
    if (
      actor.role !== UserRole.store &&
      actor.role !== UserRole.workshop
    ) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'فقط المتجر والورشة يمكنهما تقديم الطلبات',
      });
    }

    const productIds = Array.from(
      new Set(dto.lines.map((l) => l.productId)),
    ).sort();

    const order = await this.prisma.$transaction(async (tx) => {
      const storeUser = await tx.user.findUnique({
        where: { id: actor.id },
        select: {
          deliveryAddress: true,
          deliveryLat: true,
          deliveryLng: true,
        },
      });
      if (!storeUser) {
        throw new NotFoundException({
          error: 'not_found',
          message: 'المستخدم غير موجود',
        });
      }

      // First order: accept address/lat/lng from the body and persist them.
      // Later orders: reuse saved pin when the body omits location.
      const { dropoff, persist } = resolveOrderDropoff(dto, storeUser);

      const products = await tx.product.findMany({
        where: { id: { in: productIds }, deletedAt: null },
      });

      const productById = new Map(products.map((p) => [p.id, p]));

      for (const line of dto.lines) {
        const product = productById.get(line.productId);
        if (!product) {
          throw new NotFoundException({
            error: 'not_found',
            message: `المنتج ${line.productId} غير موجود`,
          });
        }
        if (!product.inWarehouse) {
          throw new HttpException(
            {
              error: 'not_in_warehouse',
              message: 'المنتج غير متاح للطلب',
              productId: line.productId,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      await tx.$queryRaw`
        SELECT id FROM "Supply"
        WHERE "productId" = ANY(${productIds}::text[])
        ORDER BY "productId"
        FOR UPDATE
      `;

      const requestedByProduct = new Map<string, number>();
      for (const line of dto.lines) {
        const current = requestedByProduct.get(line.productId) ?? 0;
        requestedByProduct.set(line.productId, current + line.quantity);
      }

      for (const [productId, requested] of requestedByProduct) {
        const product = productById.get(productId);
        if (!product) continue;

        const supply = await tx.supply.findUnique({
          where: { productId },
          select: { remaining: true },
        });

        const remaining = supply?.remaining ?? 0;

        const openReserved = await tx.orderLine.aggregate({
          where: {
            productId,
            order: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
          },
          _sum: { quantity: true },
        });

        const reserved = openReserved._sum.quantity ?? 0;
        const available = remaining - reserved;

        if (requested > available) {
          throw new HttpException(
            {
              error: 'insufficient_stock',
              message: 'المخزون غير كافٍ',
              productId,
              available,
            },
            HttpStatus.CONFLICT,
          );
        }
      }

      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('order_number_seq') AS nextval
      `;
      const number = `ORD-${nextval.toString()}`;

      if (persist) {
        await tx.user.update({
          where: { id: actor.id },
          data: {
            deliveryAddress: dropoff.address,
            deliveryLat: dropoff.lat,
            deliveryLng: dropoff.lng,
          },
        });
      }

      let total = 0;
      let pieces = 0;
      for (const line of dto.lines) {
        const product = productById.get(line.productId);
        if (!product) continue;
        total += product.price * line.quantity;
        pieces += line.quantity;
      }

      const created = await tx.order.create({
        data: {
          number,
          storeId: actor.id,
          status: OrderStatus.review,
          total,
          pieces,
          address: dropoff.address,
          lat: dropoff.lat,
          lng: dropoff.lng,
          lines: {
            create: dto.lines.map((line) => {
              const product = productById.get(line.productId);
              if (!product) {
                throw new NotFoundException({
                  error: 'not_found',
                  message: `المنتج ${line.productId} غير موجود`,
                });
              }
              return {
                productId: line.productId,
                quantity: line.quantity,
                unitPrice: product.price,
                variant: line.variant ?? Prisma.JsonNull,
              };
            }),
          },
        },
        include: { store: true },
      });

      return created;
    });

    // Build the response first — detail() can throw. Notifying before
    // it would send notifications about an order the caller can't read.
    const response = await this.detail(order.id, actor);

    // Notify dashboard staff (admin, inventory, delivery, super_admin).
    const staff = await this.prisma.user.findMany({
      where: {
        role: { in: [...INTERNAL_ROLES] },
        suspended: false,
      },
      select: { id: true },
    });

    for (const user of staff) {
      await this.notifications.notify({
        userId: user.id,
        type: NotificationType.order_placed,
        title: 'طلب جديد',
        body: `طلب جديد ${order.number} من ${order.store.name}`,
        linkTo: `/orders/${order.id}`,
      });
    }

    await this.publishOrderLive(order);
    return response;
  }

  async updateStatus(
    id: string,
    actor: AuthenticatedUser,
    dto: UpdateOrderStatusDto,
  ): Promise<{ order: OrderListItemResponse }> {
    const existing = await this.prisma.order.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'الطلب غير موجود',
      });
    }

    const lines = await this.prisma.orderLine.findMany({
      where: { orderId: id },
      select: { picked: true },
    });
    const allLinesPicked = lines.every((l) => l.picked);

    const allowed = canActorTransition(
      {
        order: { status: existing.status, storeId: existing.storeId },
        actor,
        allLinesPicked,
      },
      dto.status,
    );

    if (!allowed) {
      throw new HttpException(
        {
          error: 'invalid_transition',
          message: 'الانتقال غير مسموح',
          from: existing.status,
          to: dto.status,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.commitStatusChange(existing, dto.status);
  }

  async forceAdvance(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ order: OrderListItemResponse; from: OrderStatus; to: OrderStatus }> {
    if (!isInternal(actor.role)) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'فقط الموظفون يمكنهم تقديم الطلب قسرياً',
      });
    }

    const existing = await this.prisma.order.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'الطلب غير موجود',
      });
    }

    const to = nextForcedStatus(existing.status);
    if (!to) {
      throw new HttpException(
        {
          error: 'invalid_transition',
          message: 'الطلب في حالة نهائية',
          from: existing.status,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.commitStatusChange(existing, to);
    return { ...result, from: existing.status, to };
  }

  private async commitStatusChange(
    existing: OrderWithStore,
    status: OrderStatus,
  ): Promise<{ order: OrderListItemResponse }> {
    await this.prisma.$transaction(async (tx) => {
      if (status === OrderStatus.delivered) {
        await this.decrementStockForOrder(tx, existing.id, existing.number);
      }

      if (status === OrderStatus.cancelled) {
        await tx.deliveryOrder.deleteMany({ where: { orderId: existing.id } });
      }

      await tx.order.update({
        where: { id: existing.id },
        data: { status },
      });
    });

    const updated = await this.prisma.order.findUnique({
      where: { id: existing.id },
      include: { store: true },
    });

    if (!updated) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'الطلب غير موجود',
      });
    }

    if (status === OrderStatus.cancelled) {
      await this.notifications.notify({
        userId: updated.storeId,
        type: NotificationType.order_cancelled,
        title: 'تم إلغاء الطلب',
        body: `تم إلغاء الطلب ${updated.number}`,
        linkTo: `/orders/${updated.id}`,
      });
    } else if (status !== OrderStatus.in_transit) {
      await this.notifications.notify({
        userId: updated.storeId,
        type: NotificationType.order_status,
        title: 'تحديث حالة الطلب',
        body: `طلبك ${updated.number} أصبح ${ORDER_STATUS_LABELS[status]}`,
        linkTo: `/orders/${updated.id}`,
      });
    }
    await this.publishOrderLive(updated);
    return { order: toOrderListItem(updated) };
  }

  async updateLine(
    orderId: string,
    lineId: string,
    actor: AuthenticatedUser,
    dto: UpdateOrderLineDto,
  ): Promise<{ line: OrderLineResponse }> {
    if (
      actor.role !== UserRole.inventory &&
      actor.role !== UserRole.admin &&
      actor.role !== UserRole.super_admin
    ) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'فقط موظفو المخزون يحدّثون البنود',
      });
    }

    const line = await this.prisma.orderLine.findFirst({
      where: { id: lineId, orderId },
      include: {
        product: { select: { name: true, images: true } },
        order: true,
      },
    });

    if (!line) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'بند الطلب غير موجود',
      });
    }

    if (line.order.status !== OrderStatus.preparing) {
      throw new HttpException(
        {
          error: 'invalid_state',
          message: 'البنود تُجهَّز فقط أثناء التحضير',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.prisma.orderLine.update({
      where: { id: lineId },
      data: { picked: dto.picked },
      include: {
        product: { select: { name: true, images: true } },
      },
    });

    return { line: toOrderLineResponse(updated) };
  }

  async cascadeOrderStatus(
    tx: Prisma.TransactionClient,
    orderId: string,
    newStatus: OrderStatus,
  ): Promise<void> {
    if (newStatus === OrderStatus.delivered) {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { number: true },
      });
      if (!order) {
        throw new NotFoundException({
          error: 'not_found',
          message: 'الطلب غير موجود',
        });
      }
      await this.decrementStockForOrder(tx, orderId, order.number);
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });
  }

  private async decrementStockForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    reference: string,
  ): Promise<void> {
    const orderLines = await tx.orderLine.findMany({
      where: { orderId },
      select: { productId: true, quantity: true },
    });

    const supplyIds: string[] = [];

    for (const line of orderLines) {
      const supply = await tx.supply.update({
        where: { productId: line.productId },
        data: { remaining: { decrement: line.quantity } },
        select: { id: true },
      });
      supplyIds.push(supply.id);
    }

    await tx.stockMovement.createMany({
      data: orderLines.map((line, i) => ({
        supplyId: supplyIds[i]!,
        type: StockMovementType.out,
        quantity: line.quantity,
        reference,
      })),
    });
  }

  ordersFeedChannel(actor: AuthenticatedUser): string | null {
    if (
      actor.role === UserRole.store ||
      actor.role === UserRole.workshop
    ) {
      return ORDERS_STORE_CHANNEL(actor.id);
    }
    if (isInternal(actor.role)) {
      return ORDERS_FEED_CHANNEL;
    }
    return null;
  }

  async assertCanReadById(id: string, actor: AuthenticatedUser): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!order) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'الطلب غير موجود',
      });
    }

    this.assertCanRead(order, actor);
  }

  private assertCanRead(
    order: Order & { store: User },
    actor: AuthenticatedUser,
  ): void {
    if (isInternal(actor.role)) return;
    if (
      (actor.role === UserRole.store || actor.role === UserRole.workshop) &&
      order.storeId === actor.id
    ) {
      return;
    }
    throw new NotFoundException({
      error: 'order_not_accessible',
      message: 'الطلب غير موجود',
    });
  }

  private supportContacts(): { whatsapp: string; phone: string } {
    return this.config.get('orderSupport', { infer: true });
  }

  private async publishOrderLive(
    order: Pick<Order, 'id' | 'storeId' | 'status' | 'pieces' | 'updatedAt'>,
  ): Promise<void> {
    const payload = JSON.stringify({
      id: order.id,
      status: order.status,
      statusColor: orderStatusColor(order.status),
      pieces: order.pieces,
      updatedAt: order.updatedAt.toISOString(),
    });
    await Promise.all([
      this.redis.publish(ORDER_CHANNEL(order.id), payload),
      this.redis.publish(ORDERS_STORE_CHANNEL(order.storeId), payload),
      this.redis.publish(ORDERS_FEED_CHANNEL, payload),
    ]);
  }
}
