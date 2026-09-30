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
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
import { ORDER_STATUS_LABELS } from '../../common/order-status-labels';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderLineDto } from './dto/update-order-line.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  canActorAdvance,
  canActorCancel,
  canActorTransition,
  isInternal,
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
import {
  ORDER_CHANNEL,
  ORDERS_FEED_CHANNEL,
  ORDERS_STORE_CHANNEL,
} from '../notifications/notifications.pubsub';

const OPEN_STATUSES: readonly OrderStatus[] = [
  OrderStatus.review,
  OrderStatus.preparing,
  OrderStatus.ready,
  OrderStatus.in_transit,
];

type OrderWithStore = Order & { store: User };

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly redis: RedisService,
  ) {}

  async list(
    query: QueryOrdersDto,
    actor: AuthenticatedUser,
  ): Promise<Paginated<OrderListItemResponse>> {
    const where: Prisma.OrderWhereInput = {};

    if (actor.role === UserRole.store) {
      where.storeId = actor.id;
    } else if (isInternal(actor.role)) {
      if (query.storeId) where.storeId = query.storeId;
    } else {
      return paginate([], 0, query.page, query.limit);
    }

    if (query.status) where.status = query.status;

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
        message: 'Order not found',
      });
    }

    this.assertCanRead(order, actor);

    const lines = await this.prisma.orderLine.findMany({
      where: { orderId: id },
      include: {
        product: { select: { name: true } },
        business: { select: { name: true } },
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
    );
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateOrderDto,
  ): Promise<OrderDetailResponse> {
    if (actor.role !== UserRole.store) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only stores can place orders',
      });
    }

    const productIds = Array.from(
      new Set(dto.lines.map((l) => l.productId)),
    ).sort();

    const order = await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, deletedAt: null },
      });

      const productById = new Map(products.map((p) => [p.id, p]));

      for (const line of dto.lines) {
        const product = productById.get(line.productId);
        if (!product) {
          throw new NotFoundException({
            error: 'not_found',
            message: `Product ${line.productId} not found`,
          });
        }
        if (!product.inWarehouse) {
          throw new HttpException(
            {
              error: 'not_in_warehouse',
              message: 'Product is not available for ordering',
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
          where: {
            businessId_productId: {
              businessId: product.businessId,
              productId,
            },
          },
          select: { remaining: true },
        });

        const remaining = supply?.remaining ?? 0;

        const openReserved = await tx.orderLine.aggregate({
          where: {
            productId,
            order: { status: { in: [...OPEN_STATUSES] } },
          },
          _sum: { quantity: true },
        });

        const reserved = openReserved._sum.quantity ?? 0;
        const available = remaining - reserved;

        if (requested > available) {
          throw new HttpException(
            {
              error: 'insufficient_stock',
              message: 'Not enough stock available',
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
          lines: {
            create: dto.lines.map((line) => {
              const product = productById.get(line.productId);
              if (!product) {
                throw new NotFoundException({
                  error: 'not_found',
                  message: `Product ${line.productId} not found`,
                });
              }
              return {
                productId: line.productId,
                businessId: product.businessId,
                quantity: line.quantity,
                unitPrice: product.price,
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

    // Notify every inventory user — after the transaction commits.
    const inventoryUsers = await this.prisma.user.findMany({
      where: { role: UserRole.inventory, suspended: false },
      select: { id: true },
    });

    for (const inv of inventoryUsers) {
      await this.notifications.notify({
        userId: inv.id,
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
        message: 'Order not found',
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
          message: 'Transition not allowed',
          from: existing.status,
          to: dto.status,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.status === OrderStatus.delivered) {
        await this.decrementStockForOrder(tx, id, existing.number);
      }

      if (dto.status === OrderStatus.cancelled) {
        await tx.deliveryOrder.deleteMany({ where: { orderId: id } });
      }

      await tx.order.update({
        where: { id },
        data: { status: dto.status },
      });
    });

    const updated = await this.prisma.order.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!updated) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Order not found',
      });
    }

    // Notify the store — after the transaction commits.
    if (dto.status === OrderStatus.cancelled) {
      await this.notifications.notify({
        userId: updated.storeId,
        type: NotificationType.order_cancelled,
        title: 'تم إلغاء الطلب',
        body: `تم إلغاء الطلب ${updated.number}`,
        linkTo: `/orders/${updated.id}`,
      });
    } else {
      await this.notifications.notify({
        userId: updated.storeId,
        type: NotificationType.order_status,
        title: 'تحديث حالة الطلب',
        body: `طلبك ${updated.number} أصبح ${ORDER_STATUS_LABELS[dto.status]}`,
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
        message: 'Only inventory staff can update lines',
      });
    }

    const line = await this.prisma.orderLine.findFirst({
      where: { id: lineId, orderId },
      include: {
        product: { select: { name: true } },
        business: { select: { name: true } },
        order: true,
      },
    });

    if (!line) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Order line not found',
      });
    }

    if (line.order.status !== OrderStatus.preparing) {
      throw new HttpException(
        {
          error: 'invalid_state',
          message: 'Lines can only be picked while the order is preparing',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.prisma.orderLine.update({
      where: { id: lineId },
      data: { picked: dto.picked },
      include: {
        product: { select: { name: true } },
        business: { select: { name: true } },
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
          message: 'Order not found',
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
      select: { productId: true, businessId: true, quantity: true },
    });

    const supplyIds: string[] = [];

    for (const line of orderLines) {
      const supply = await tx.supply.update({
        where: {
          businessId_productId: {
            businessId: line.businessId,
            productId: line.productId,
          },
        },
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
    if (actor.role === UserRole.store) {
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
        message: 'Order not found',
      });
    }

    this.assertCanRead(order, actor);
  }

  private assertCanRead(
    order: Order & { store: User },
    actor: AuthenticatedUser,
  ): void {
    if (isInternal(actor.role)) return;
    if (actor.role === UserRole.store && order.storeId === actor.id) return;
    throw new NotFoundException({
      error: 'order_not_accessible',
      message: 'Order not found',
    });
  }

  private async publishOrderLive(
    order: Pick<Order, 'id' | 'storeId' | 'status' | 'pieces' | 'updatedAt'>,
  ): Promise<void> {
    const payload = JSON.stringify({
      id: order.id,
      status: order.status,
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
