import {
  ConflictException,
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
  iconUrl: string;
  needsOnboarding: boolean;
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
    needsOnboarding: role.value === 'store' || role.value === 'workshop',
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
   * System roles CAN be deleted, but:
   *   - Only super_admin may call this for system roles (enforced in
   *     the controller via `@Roles(UserRole.super_admin)`).
   *   - A system role cannot be the *last* selectable role in the DB —
   *     that would brick onboarding, since `findOrCreateUser` creates
   *     users with `role: UserRole.employee` and the app picker reads
   *     selectable roles.
   *   - Users with financial history block deletion (audit trail).
   *
   * WARNING: deleting a system role whose `value` matches a
   * `UserRole` enum member (employee, workshop, store, institute,
   * marketer, shipping_company, delivery) will break:
   *   - `AuthService.onboarding` (role lookup returns null)
   *   - `AuthService.deleteAccount` for those users
   *   - the app's role picker (no selectable option for that role)
   * This is accepted as intentional operator action; do not delete
   * a system role without a migration/regeneration plan.
   */
  async remove(id: string): Promise<{ success: true }> {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'الدور غير موجود',
      });
    }

    // If deleting a *system* role, protect onboarding: there must be
    // at least one other selectable role left.
    if (existing.system) {
      const otherSelectable = await this.prisma.role.count({
        where: { selectable: true, id: { not: id } },
      });
      if (otherSelectable === 0) {
        throw new ConflictException({
          error: 'conflict',
          message:
            'لا يمكن حذف آخر دور نظام متاح — سيؤدي ذلك إلى تعطيل التسجيل الأول.',
        });
      }
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
        // Relation on Product is `supplier`, not `supplierBusiness`.
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
        // Suspended users are blocked at verify()/refresh() anyway.
      }
    }

    return { success: true };
  }
}
