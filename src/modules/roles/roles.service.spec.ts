import { ConflictException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let prisma: {
    role: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    user: { count: ReturnType<typeof vi.fn> };
  };
  let service: RolesService;

  const employee = {
    id: 'role-employee',
    value: 'employee',
    label: 'موظف',
    description: '',
    selectable: true,
    system: true,
    sortOrder: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      role: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: { count: vi.fn() },
    };
    service = new RolesService(prisma as unknown as PrismaService);
  });

  it('lists selectable roles with description', async () => {
    prisma.role.findMany.mockResolvedValue([employee]);
    const result = await service.list();
    expect(result.items).toEqual([
      { value: 'employee', label: 'موظف', description: '' },
    ]);
  });

  it('refuses to delete a system role', async () => {
    prisma.role.findUnique.mockResolvedValue(employee);
    const error = await service.remove(employee.id).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(prisma.role.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete a role that is in use', async () => {
    prisma.role.findUnique.mockResolvedValue({ ...employee, system: false });
    prisma.user.count.mockResolvedValue(2);
    const error = await service.remove(employee.id).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ConflictException);
    expect(prisma.role.delete).not.toHaveBeenCalled();
  });
});
