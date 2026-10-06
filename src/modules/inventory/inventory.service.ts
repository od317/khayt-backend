import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { paginate, Paginated, skipTake } from '../../common/utils/pagination';
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

export type InventoryTotals = {
  productCount: number;
  sent: number;
  remaining: number;
  sold: number;
};

export type InventoryListResponse = {
  items: InventoryItemResponse[];
  totals: InventoryTotals;
  total: number;
  page: number;
  limit: number;
};

export type InventoryDetailResponse = {
  item: InventoryItemResponse;
  business: BusinessSummaryResponse;
  movements: InventoryMovementResponse[];
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) { }

  private async queryItems(
    query: QueryInventoryDto,
    scope: { type: 'all' } | { type: 'business'; id: string },
  ): Promise<InventoryListResponse> {
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

    const { skip, take } = skipTake(query.page, query.limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supply.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          product: { select: { name: true, unit: true } },
          business: { select: { name: true } },
        },
      }),
      this.prisma.supply.count({ where }),
    ]);

    let mapped = rows.map(toInventoryItemResponse);

    if (query.lowStock === 'true') {
      mapped = mapped.filter((item) => item.isLowStock);
    } else if (query.lowStock === 'false') {
      mapped = mapped.filter((item) => !item.isLowStock);
    }

    const totals: InventoryTotals = {
      productCount: mapped.length,
      sent: mapped.reduce((sum, item) => sum + item.sent, 0),
      remaining: mapped.reduce((sum, item) => sum + item.remaining, 0),
      sold: mapped.reduce((sum, item) => sum + item.sold, 0),
    };

    const paged = mapped.slice(skip, skip + take);

    return {
      items: paged,
      totals,
      total: mapped.length,
      page: query.page,
      limit: query.limit,
    };
  }

  async listInventory(
    query: QueryInventoryDto,
    actor: AuthenticatedUser,
  ): Promise<InventoryListResponse> {
    this.assertInternal(actor);
    return this.queryItems(query, { type: 'all' });
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
  ): Promise<InventoryListResponse> {
    if (this.isInternal(actor)) {
      return this.queryItems(query, { type: 'all' });
    }

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

    if (query.businessId && query.businessId !== ownedBusiness.id) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You can only view your own supply',
      });
    }

    return this.queryItems(query, { type: 'business', id: ownedBusiness.id });
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