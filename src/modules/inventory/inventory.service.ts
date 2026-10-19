import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { skipTake } from '../../common/utils/pagination';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { QuerySupplyDto } from './dto/query-supply.dto';
import {
  InventoryItemResponse,
  InventoryMovementResponse,
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

/** Full supply list — no pagination. */
export type SupplyListResponse = {
  items: InventoryItemResponse[];
  totals: InventoryTotals;
  total: number;
};

export type InventoryDetailResponse = {
  item: InventoryItemResponse;
  movements: InventoryMovementResponse[];
};

type SupplyQueryFilters = {
  q?: string;
  category?: string;
  lowStock?: string;
  /** When set, only products linked to this supplier workshop. */
  supplierBusinessId?: string;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadSupplyItems(
    query: SupplyQueryFilters,
  ): Promise<{ items: InventoryItemResponse[]; totals: InventoryTotals }> {
    const where: Prisma.SupplyWhereInput = {};

    const productWhere: Prisma.ProductWhereInput = {};
    if (query.q) {
      productWhere.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.category) {
      productWhere.category = query.category;
    }
    if (query.supplierBusinessId) {
      productWhere.supplierBusinessId = query.supplierBusinessId;
    }
    if (Object.keys(productWhere).length > 0) {
      where.product = productWhere;
    }

    const billWhere: Prisma.BillWhereInput = query.supplierBusinessId
      ? { businessId: query.supplierBusinessId }
      : {};

    const [rows, billAgg] = await this.prisma.$transaction([
      this.prisma.supply.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          product: {
            select: { name: true, unit: true },
          },
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
    const { items, totals } = await this.loadSupplyItems(query);
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
        product: {
          select: { name: true, unit: true },
        },
      },
    });

    if (!supply) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'عنصر المخزون غير موجود',
      });
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: { supplyId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      item: toInventoryItemResponse(supply),
      movements: movements.map(toInventoryMovementResponse),
    };
  }

  async listSupply(
    query: QuerySupplyDto,
    actor: AuthenticatedUser,
  ): Promise<SupplyListResponse> {
    let supplierBusinessId: string | undefined;

    if (this.isInternal(actor)) {
      supplierBusinessId = undefined;
    } else if (actor.role === UserRole.workshop) {
      const business = await this.prisma.business.findUnique({
        where: { ownerId: actor.id },
        select: { id: true, type: true },
      });
      if (!business || business.type !== BusinessType.workshop) {
        throw new ForbiddenException({
          error: 'forbidden',
          message: 'ملف ورشة مطلوب',
        });
      }
      supplierBusinessId = business.id;
    } else {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'صلاحيات غير كافية',
      });
    }

    const { items, totals } = await this.loadSupplyItems({
      ...query,
      supplierBusinessId,
    });
    return {
      items,
      totals,
      total: items.length,
    };
  }

  private isInternal(actor: AuthenticatedUser): boolean {
    return INTERNAL_ROLES.includes(actor.role as InternalRole);
  }

  private assertInternal(actor: AuthenticatedUser): void {
    if (!this.isInternal(actor)) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'صلاحيات غير كافية',
      });
    }
  }
}
