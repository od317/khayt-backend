import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { withDefaultAvatar } from '../../common/defaults/images';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { refreshKeysPattern } from '../auth/auth.constants';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

export type RoleResponse = {
  value: string;
  label: string;
  description: string;
  /** Always a URL (placeholder if empty in DB). */
  iconUrl: string;
};

export type AdminRoleResponse = RoleResponse & {
  id: string;
  visibleInApp: boolean;
  system: boolean;
  sortOrder: number;
};

export function toPublicRole(role: Role): RoleResponse {
  return {
    value: role.value,
    label: role.label,
    description: role.description ?? '',
    iconUrl: withDefaultAvatar(role.iconUrl),
  };
}

export function toAdminRole(role: Role): AdminRoleResponse {
  return {
    ...toPublicRole(role),
    id: role.id,
    visibleInApp: role.selectable,
    system: role.system,
    sortOrder: role.sortOrder,
  };
}

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async list(): Promise<{ items: RoleResponse[] }> {
    const rows = await this.prisma.role.findMany({
      where: { selectable: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return { items: rows.map(toPublicRole) };
  }

  async listAll(): Promise<{ items: AdminRoleResponse[] }> {
    const rows = await this.prisma.role.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return { items: rows.map(toAdminRole) };
  }

  async create(dto: CreateRoleDto): Promise<{ role: AdminRoleResponse }> {
    try {
      const role = await this.prisma.role.create({
        data: {
          value: dto.value,
          label: dto.label,
          description: dto.description ?? '',
          iconUrl: dto.iconUrl?.trim() ?? '',
          selectable: dto.visibleInApp,
          sortOrder: dto.sortOrder ?? 50,
          system: false,
        },
      });
      return { role: toAdminRole(role) };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          error: 'conflict',
          message: 'دور بهذه القيمة موجود',
        });
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
  ): Promise<{ role: AdminRoleResponse }> {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'الدور غير موجود',
      });
    }

    const data: Prisma.RoleUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.iconUrl !== undefined) data.iconUrl = dto.iconUrl.trim();
    if (dto.visibleInApp !== undefined) data.selectable = dto.visibleInApp;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const role = await this.prisma.role.update({ where: { id }, data });
    return { role: toAdminRole(role) };
  }

  /**
   * Hard-deletes the Role row and soft-deletes every User that held it.
   *
   * Guards (in order):
   *   1. Role must exist.
   *   2. System roles cannot be deleted.
   *   3. Users with financial history (orders, bills, payments,
   *      deliveries, or products supplied by their business that appear
   *      on order lines) block the delete — this preserves the audit
   *      trail.
   *
   * After soft-delete:
   *   - `role` value on each user is preserved so the account can be
   *     restored if the same role is recreated later (it will not
   *     auto-reactivate; `suspended` stays true).
   *   - `deliveryAddress/Lat/Lng` are preserved because in-flight
   *     deliveries still need them.
   *   - Redis refresh sessions are revoked so no session survives the
   *     suspension.
   */
  async remove(id: string): Promise<{ success: true }> {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'الدور غير موجود',
      });
    }

    if (existing.system) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'لا يمكن حذف أدوار النظام',
      });
    }

    const users = await this.prisma.user.findMany({
      where: { role: existing.value },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    // ---- Financial-history guard ----
    if (userIds.length > 0) {
      const [
        orderCount,
        billCount,
        paymentCount,
        deliveryCount,
        suppliedOrderLineCount,
        bizBillCount,
        receivingCount,
      ] = await this.prisma.$transaction([
        this.prisma.order.count({ where: { storeId: { in: userIds } } }),
        this.prisma.bill.count({
          where: { receiving: { createdBy: { in: userIds } } },
        }),
        this.prisma.payment.count({ where: { recordedBy: { in: userIds } } }),
        this.prisma.delivery.count({ where: { driverId: { in: userIds } } }),
        // "Business has order lines" ≈ a product this business supplied
        // appears on an order. Relation on Product is `supplier`.
        this.prisma.orderLine.count({
          where: {
            product: { supplier: { ownerId: { in: userIds } } },
          },
        }),
        this.prisma.bill.count({
          where: { business: { ownerId: { in: userIds } } },
        }),
        this.prisma.receiving.count({
          where: { business: { ownerId: { in: userIds } } },
        }),
      ]);

      if (
        orderCount +
          billCount +
          paymentCount +
          deliveryCount +
          suppliedOrderLineCount +
          bizBillCount +
          receivingCount >
        0
      ) {
        throw new ConflictException({
          error: 'conflict',
          message:
            'الدور مرتبط بمستخدمين لديهم سجلات مالية أو توصيل. لا يمكن حذفه.',
        });
      }
    }

    // ---- Soft-delete users (batched) + hard-delete role ----
    await this.prisma.$transaction(async (tx) => {
      if (userIds.length > 0) {
        await tx.post.updateMany({
          where: { authorId: { in: userIds }, deletedAt: null },
          data: { deletedAt: new Date(), active: false },
        });

        await tx.cartItem.deleteMany({ where: { userId: { in: userIds } } });
        await tx.like.deleteMany({ where: { userId: { in: userIds } } });
        await tx.savedPost.deleteMany({ where: { userId: { in: userIds } } });
        await tx.savedBusiness.deleteMany({
          where: { userId: { in: userIds } },
        });
        await tx.savedMarketer.deleteMany({
          where: { userId: { in: userIds } },
        });
        await tx.deviceToken.deleteMany({ where: { userId: { in: userIds } } });
        await tx.notification.deleteMany({
          where: { userId: { in: userIds } },
        });

        // NOTE: `role` is intentionally preserved so a recreated role can
        // later be associated back to these users. `suspended: true`
        // means they stay logged out regardless.
        // NOTE: deliveryAddress/Lat/Lng preserved — in-flight deliveries
        // still need them.
        await tx.user.updateMany({
          where: { id: { in: userIds } },
          data: {
            suspended: true,
            phone: null,
            email: null,
            passwordHash: null,
            name: 'حساب محذوف',
            bio: null,
            avatarUrl: null,
            availableForWork: false,
          },
        });
      }

      await tx.role.delete({ where: { id } });
    });

    // ---- Revoke refresh sessions (post-commit; failures are non-fatal) ----
    for (const userId of userIds) {
      try {
        await this.redis.deleteByPattern(refreshKeysPattern(userId));
      } catch {
        // Suspended users are blocked at verify()/refresh() anyway, so a
        // Redis failure here does not compromise the suspension.
      }
    }

    return { success: true };
  }
}
