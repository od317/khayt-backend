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

export type InventoryDetailResponse = {
  item: InventoryItemResponse;
  business: BusinessSummaryResponse;
  movements: InventoryMovementResponse[];
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Shared query for both /inventory and /supply.
   *
   * The `scope` argument is what differs between the two endpoints:
   *   { type: 'all' }             — internal, no restriction
   *   { type: 'business', id }    — restricted to a single business
   *
   * Any additional filters (q, category, lowStock) are applied on top.
   */
  private async queryItems(
    query: QueryInventoryDto,
    scope: { type: 'all' } | { type: 'business'; id: string },
  ): Promise<Paginated<InventoryItemResponse>> {
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

    // lowStock is applied after the query because it depends on a
    // constant, not a column. At our scale this is fine; if the
    // threshold ever moves to a column, this becomes a where clause.
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

    // Pagination with post-filter: we took `take` rows from the DB but
    // then filtered in memory, so the page slice is applied here.
    // For an unfiltered query this is identical to the DB-level slice.
    // For a filtered query the page may contain fewer items than `take`
    // — acceptable at this scale.
    const paged = mapped.slice(0, take);

    return paginate(
      paged,
      query.lowStock ? mapped.length : total,
      query.page,
      query.limit,
    );
  }

  async listInventory(
    query: QueryInventoryDto,
    actor: AuthenticatedUser,
  ): Promise<Paginated<InventoryItemResponse>> {
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
  ): Promise<Paginated<InventoryItemResponse>> {
    if (this.isInternal(actor)) {
      // Internal staff see all, optionally filtered by businessId.
      return this.queryItems(query, { type: 'all' });
    }

    // External actor: must be a business owner. Find their business.
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

    // If they passed a businessId, it must be their own.
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
