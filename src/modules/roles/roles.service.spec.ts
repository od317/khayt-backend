import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  const prisma = {
    role: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    order: { count: vi.fn() },
    bill: { count: vi.fn() },
    payment: { count: vi.fn() },
    delivery: { count: vi.fn() },
    orderLine: { count: vi.fn() },
    receiving: { count: vi.fn() },
    post: { updateMany: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    like: { deleteMany: vi.fn() },
    savedPost: { deleteMany: vi.fn() },
    savedBusiness: { deleteMany: vi.fn() },
    savedMarketer: { deleteMany: vi.fn() },
    deviceToken: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };

  const redis = { deleteByPattern: vi.fn() };

  const employeeRole = {
    id: 'role-employee',
    value: 'employee',
    label: 'موظف',
    description: 'ابحث عن فرص عمل',
    iconUrl: '/icons/employee.png',
    selectable: true,
    system: true,
    sortOrder: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const customRole = {
    ...employeeRole,
    id: 'role-partner',
    value: 'partner',
    system: false,
  };

  let service: RolesService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Interactive tx callback: execute it with the same prisma mock so
    // all tx.* calls land on the same spies. Array form: resolve all.
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prisma) => unknown)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });

    service = new RolesService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );
  });

  it('lists selectable roles with description and iconUrl', async () => {
    prisma.role.findMany.mockResolvedValue([employeeRole]);
    const result = await service.list();
    expect(result.items).toEqual([
      {
        value: 'employee',
        label: 'موظف',
        description: 'ابحث عن فرص عمل',
        iconUrl: employeeRole.iconUrl,
      },
    ]);
  });

  it('rejects deleting a non-existent role', async () => {
    prisma.role.findUnique.mockResolvedValue(null);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.role.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete a system role', async () => {
    prisma.role.findUnique.mockResolvedValue(employeeRole);
    await expect(service.remove(employeeRole.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.role.delete).not.toHaveBeenCalled();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('refuses to delete a role whose users have orders', async () => {
    prisma.role.findUnique.mockResolvedValue(customRole);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
    prisma.order.count.mockResolvedValue(1);
    prisma.bill.count.mockResolvedValue(0);
    prisma.payment.count.mockResolvedValue(0);
    prisma.delivery.count.mockResolvedValue(0);
    prisma.orderLine.count.mockResolvedValue(0);
    prisma.receiving.count.mockResolvedValue(0);

    await expect(service.remove(customRole.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.role.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete when supplied order lines exist', async () => {
    prisma.role.findUnique.mockResolvedValue(customRole);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
    prisma.order.count.mockResolvedValue(0);
    prisma.bill.count.mockResolvedValue(0);
    prisma.payment.count.mockResolvedValue(0);
    prisma.delivery.count.mockResolvedValue(0);
    prisma.orderLine.count.mockResolvedValue(3);
    prisma.receiving.count.mockResolvedValue(0);

    await expect(service.remove(customRole.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('soft-deletes users in batch and hard-deletes the role', async () => {
    prisma.role.findUnique.mockResolvedValue(customRole);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    prisma.order.count.mockResolvedValue(0);
    prisma.bill.count.mockResolvedValue(0);
    prisma.payment.count.mockResolvedValue(0);
    prisma.delivery.count.mockResolvedValue(0);
    prisma.orderLine.count.mockResolvedValue(0);
    prisma.receiving.count.mockResolvedValue(0);
    prisma.post.updateMany.mockResolvedValue({ count: 2 });
    prisma.cartItem.deleteMany.mockResolvedValue({ count: 0 });
    prisma.like.deleteMany.mockResolvedValue({ count: 0 });
    prisma.savedPost.deleteMany.mockResolvedValue({ count: 0 });
    prisma.savedBusiness.deleteMany.mockResolvedValue({ count: 0 });
    prisma.savedMarketer.deleteMany.mockResolvedValue({ count: 0 });
    prisma.deviceToken.deleteMany.mockResolvedValue({ count: 0 });
    prisma.notification.deleteMany.mockResolvedValue({ count: 0 });
    prisma.user.updateMany.mockResolvedValue({ count: 2 });
    prisma.role.delete.mockResolvedValue(customRole);
    redis.deleteByPattern.mockResolvedValue(undefined);

    const result = await service.remove(customRole.id);

    expect(result).toEqual({ success: true });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u2'] } },
      data: expect.objectContaining({
        suspended: true,
        name: 'حساب محذوف',
        phone: null,
        email: null,
        passwordHash: null,
        bio: null,
        avatarUrl: null,
        availableForWork: false,
      }),
    });
    const updatePayload = prisma.user.updateMany.mock.calls[0][0];
    // Preserve delivery + role (D6/D7)
    expect(updatePayload.data).not.toHaveProperty('deliveryAddress');
    expect(updatePayload.data).not.toHaveProperty('deliveryLat');
    expect(updatePayload.data).not.toHaveProperty('deliveryLng');
    expect(updatePayload.data).not.toHaveProperty('role');

    expect(prisma.role.delete).toHaveBeenCalledWith({
      where: { id: customRole.id },
    });
    expect(redis.deleteByPattern).toHaveBeenCalledTimes(2);
  });

  it('deletes a role that has no users without touching user tables', async () => {
    prisma.role.findUnique.mockResolvedValue(customRole);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.role.delete.mockResolvedValue(customRole);

    await expect(service.remove(customRole.id)).resolves.toEqual({
      success: true,
    });

    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(prisma.post.updateMany).not.toHaveBeenCalled();
    expect(prisma.role.delete).toHaveBeenCalledWith({
      where: { id: customRole.id },
    });
    expect(redis.deleteByPattern).not.toHaveBeenCalled();
  });

  it('revocation failure does not fail the delete', async () => {
    prisma.role.findUnique.mockResolvedValue(customRole);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
    prisma.order.count.mockResolvedValue(0);
    prisma.bill.count.mockResolvedValue(0);
    prisma.payment.count.mockResolvedValue(0);
    prisma.delivery.count.mockResolvedValue(0);
    prisma.orderLine.count.mockResolvedValue(0);
    prisma.receiving.count.mockResolvedValue(0);
    prisma.post.updateMany.mockResolvedValue({ count: 0 });
    prisma.cartItem.deleteMany.mockResolvedValue({ count: 0 });
    prisma.like.deleteMany.mockResolvedValue({ count: 0 });
    prisma.savedPost.deleteMany.mockResolvedValue({ count: 0 });
    prisma.savedBusiness.deleteMany.mockResolvedValue({ count: 0 });
    prisma.savedMarketer.deleteMany.mockResolvedValue({ count: 0 });
    prisma.deviceToken.deleteMany.mockResolvedValue({ count: 0 });
    prisma.notification.deleteMany.mockResolvedValue({ count: 0 });
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    prisma.role.delete.mockResolvedValue(customRole);
    redis.deleteByPattern.mockRejectedValue(new Error('redis down'));

    await expect(service.remove(customRole.id)).resolves.toEqual({
      success: true,
    });
  });
});
