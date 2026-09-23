import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
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

const OPEN_STATUSES: readonly OrderStatus[] = [
  OrderStatus.review,
  OrderStatus.preparing,
  OrderStatus.ready,
  OrderStatus.in_transit,
];

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: QueryOrdersDto,
    actor: AuthenticatedUser,
  ): Promise<Paginated<OrderListItemResponse>> {
    const where: Prisma.OrderWhereInput = {};

    // Stores only see their own orders. Internal staff see all.
    if (actor.role === 'store') {
      where.storeId = actor.id;
    } else if (isInternal(actor.role)) {
      if (query.storeId) where.storeId = query.storeId;
    } else {
      // Other external roles (employee, workshop, institute) have no orders.
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
        include: { store: true },
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
      include: { product: true, business: true },
      orderBy: { id: 'asc' },
    });

    const allLinesPicked = lines.every((l) => l.picked);
    const ctx = {
      order: { status: order.status, storeId: order.storeId },
      actor,
      allLinesPicked,
    };

    return toOrderDetailResponse(order, lines, {
      canCancel: canActorCancel(ctx),
      canAdvance: canActorAdvance(ctx),
    });
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
    // Dedupe product ids for the lock query.
    const productIds = Array.from(
      new Set(dto.lines.map((l) => l.productId)),
    ).sort();

    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Load the products we're ordering. Verify all exist and are
      //    in the warehouse (R1 + R10).
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

      // 2. Lock the Supply rows for these products, in a stable order.
      //    This serializes concurrent orders for the same products.
      await tx.$queryRaw`
        SELECT id FROM "Supply"
        WHERE "productId" = ANY(${productIds}::text[])
        ORDER BY "productId"
        FOR UPDATE
      `;

      // 3. For each line, compute available = remaining − open reservations.
      //    Aggregate requested quantity per product (a client could send
      //    the same product twice).
      const requestedByProduct = new Map<string, number>();
      for (const line of dto.lines) {
        const current = requestedByProduct.get(line.productId) ?? 0;
        requestedByProduct.set(line.productId, current + line.quantity);
      }

      for (const [productId, requested] of requestedByProduct) {
        const product = productById.get(productId);
        if (!product) continue; // already checked above

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
          throw new ConflictException({
            error: 'insufficient_stock',
            message: 'Not enough stock available',
            productId,
            available,
          });
        }
      }

      // 4. Get a fresh order number.
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('order_number_seq') AS nextval
      `;
      const number = `ORD-${nextval.toString()}`;

      // 5. Compute total and pieces.
      let total = 0;
      let pieces = 0;
      for (const line of dto.lines) {
        const product = productById.get(line.productId);
        if (!product) continue;
        total += product.price * line.quantity;
        pieces += line.quantity;
      }

      // 6. Insert the order + lines.
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

    return this.detail(order.id, actor);
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
      // Decrement Supply.remaining on delivery (R9).
      if (dto.status === OrderStatus.delivered) {
        const orderLines = await tx.orderLine.findMany({
          where: { orderId: id },
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
            reference: existing.number,
          })),
        });
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

    return { order: toOrderListItem(updated) };
  }

  async updateLine(
    orderId: string,
    lineId: string,
    actor: AuthenticatedUser,
    dto: UpdateOrderLineDto,
  ): Promise<{ line: OrderLineResponse }> {
    // Inventory or admin only.
    if (
      actor.role !== 'inventory' &&
      actor.role !== 'admin' &&
      actor.role !== 'super_admin'
    ) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only inventory staff can update lines',
      });
    }

    const line = await this.prisma.orderLine.findFirst({
      where: { id: lineId, orderId },
      include: { product: true, business: true, order: true },
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
      include: { product: true, business: true },
    });

    return { line: toOrderLineResponse(updated) };
  }

  private assertCanRead(
    order: Order & { store: User },
    actor: AuthenticatedUser,
  ): void {
    if (isInternal(actor.role)) return;
    if (actor.role === 'store' && order.storeId === actor.id) return;
    throw new NotFoundException({
      error: 'order_not_accessible',
      message: 'Order not found',
    });
  }
}
