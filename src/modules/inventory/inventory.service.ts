import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { skipTake } from '../../common/utils/pagination';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { QuerySupplyDto } from './dto/query-supply.dto';
import {
  InventoryItemResponse,
  InventoryMovementResponse,
  BusinessSummaryResponse,
  toBusinessSummaryResponse,
  toInventoryItemResponse,
  toInventoryMovementResponse,
} from './inventory.mapper';

const INTERNAL_ROLES = ['inventory', 'admin', 'super_admin'] as const;

type InternalRole = (typeof INTERNAL_ROLES)[number];

/** Quantity totals (units), not money. */
export type InventoryQuantityTotals = {
  productCount: number;
  sent: number;
  remaining: number;
  sold: number;
};

/**
 * Money totals (same currency unit as `unitPrice`).
 * - sent → اجمالي المرسل
 * - paid → المدفوع
 * - remaining → المتبقي
 */
export type InventoryMoneyTotals = {
  sent: number;
  paid: number;
  remaining: number;
};

export type InventoryTotals = InventoryQuantityTotals & {
  money: InventoryMoneyTotals;
};

export type InventoryListResponse = {
  items: InventoryItemResponse[];
  totals: InventoryTotals;
  total: number;
  page: number;
  limit: number;
};

/** Full supply list — no pagination (for now). */
export type SupplyListResponse = {
  items: InventoryItemResponse[];
  totals: InventoryTotals;
  total: number;
};

export type InventoryDetailResponse = {
  item: InventoryItemResponse;
  business: BusinessSummaryResponse;
  movements: InventoryMovementResponse[];
};

type SupplyQueryScope = { type: 'all' } | { type: 'business'; id: string };

type SupplyQueryFilters = {
  businessId?: string;
  q?: string;
  category?: string;
  lowStock?: string;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) { }

  private async loadSupplyItems(
    query: SupplyQueryFilters,
    scope: SupplyQueryScope,
  ): Promise<{ items: InventoryItemResponse[]; totals: InventoryTotals }> {
    const where: Prisma.SupplyWhereInput = {};

    if (scope.type === 'business') {
      where.businessId = scope.id;
    } else if (query.businessId) {
      where.businessId = query.businessId;
    }

    if (query.q) {
      where.product = {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
        ],
      };
    }

    if (query.category) {
      where.product = {
        ...(where.product as Prisma.ProductWhereInput | undefined),
        category: query.category,
      };
    }

    const billWhere: Prisma.BillWhereInput = {};
    if (typeof where.businessId === 'string') {
      billWhere.businessId = where.businessId;
    }

    const [rows, billAgg] = await this.prisma.$transaction([
      this.prisma.supply.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          product: { select: { name: true, unit: true } },
          business: { select: { name: true } },
        },
      }),
      this.prisma.bill.aggregate({
        where: billWhere,
        _sum: { paid: true },
      }),
    ]);

    let items = rows.map(toInventoryItemResponse);

    if (query.lowStock === 'true') {
      items = items.filter((item) => item.isLowStock);
    } else if (query.lowStock === 'false') {
      items = items.filter((item) => !item.isLowStock);
    }

    const sentQty = items.reduce((sum, item) => sum + item.sent, 0);
    const remainingQty = items.reduce((sum, item) => sum + item.remaining, 0);
    const soldQty = items.reduce((sum, item) => sum + item.sold, 0);
    const sentMoney = items.reduce(
      (sum, item) => sum + item.sent * item.unitPrice,
      0,
    );
    const paidMoney = billAgg._sum.paid ?? 0;
    const remainingMoney = Math.max(0, sentMoney - paidMoney);

    return {
      items,
      totals: {
        productCount: items.length,
        sent: sentQty,
        remaining: remainingQty,
        sold: soldQty,
        money: {
          sent: sentMoney,
          paid: paidMoney,
          remaining: remainingMoney,
        },
      },
    };
  }

  async listInventory(
    query: QueryInventoryDto,
    actor: AuthenticatedUser,
  ): Promise<InventoryListResponse> {
    this.assertInternal(actor);
    const { items, totals } = await this.loadSupplyItems(query, {
      type: 'all',
    });
    const { skip, take } = skipTake(query.page, query.limit);
    return {
      items: items.slice(skip, skip + take),
      totals,
      total: items.length,
      page: query.page,
      limit: query.limit,
    };
  }

  async detail(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<InventoryDetailResponse> {
    this.assertInternal(actor);

    const supply = await this.prisma.supply.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, unit: true } },
        business: true,
      },
    });

    if (!supply) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Inventory item not found',
      });
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: { supplyId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      item: toInventoryItemResponse(supply),
      business: toBusinessSummaryResponse(supply.business),
      movements: movements.map(toInventoryMovementResponse),
    };
  }

  async listSupply(
    query: QuerySupplyDto,
    actor: AuthenticatedUser,
  ): Promise<SupplyListResponse> {
    const scope: SupplyQueryScope = this.isInternal(actor)
      ? { type: 'all' }
      : await this.ownedBusinessScope(actor, query.businessId);

    const { items, totals } = await this.loadSupplyItems(query, scope);
    return {
      items,
      totals,
      total: items.length,
    };
  }

  private async ownedBusinessScope(
    actor: AuthenticatedUser,
    businessId?: string,
  ): Promise<{ type: 'business'; id: string }> {
    const ownedBusiness = await this.prisma.business.findUnique({
      where: { ownerId: actor.id },
      select: { id: true },
    });

    if (!ownedBusiness) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You do not own a business',
      });
    }

    if (businessId && businessId !== ownedBusiness.id) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You can only view your own supply',
      });
    }

    return { type: 'business', id: ownedBusiness.id };
  }

  private isInternal(actor: AuthenticatedUser): boolean {
    return INTERNAL_ROLES.includes(actor.role as InternalRole);
  }

  private assertInternal(actor: AuthenticatedUser): void {
    if (!this.isInternal(actor)) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Insufficient role',
      });
    }
  }
}