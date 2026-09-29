import {
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AdminService } from './admin.service';

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  role: UserRole.admin,
  name: 'New Admin',
  phone: null,
  email: 'new@example.com',
  passwordHash: '$2b$12$abc',
  bio: null,
  avatarUrl: null,
  availableForWork: true,
  verified: true,
  suspended: false,
  onboardingCompleted: true,
  locationId: null,
  location: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const appRole = (value: string) => ({
  value,
  selectable: true,
});

const staffRole = (value: string) => ({
  value,
  selectable: false,
});

type PrismaMock = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  role: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('AdminService', () => {
  let prisma: PrismaMock;
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      role: {
        findMany: vi.fn().mockResolvedValue([
          appRole('employee'),
          appRole('workshop'),
          appRole('store'),
        ]),
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)(prisma);
      }
      return undefined;
    });

    service = new AdminService(prisma as unknown as PrismaService);
  });

  describe('listAppUsers', () => {
    it('filters to roles that appear in the app', async () => {
      prisma.user.findMany.mockResolvedValue([
        makeUser({ role: UserRole.employee, email: null }),
      ]);
      prisma.user.count.mockResolvedValue(1);

      await service.listAppUsers({ page: 1, limit: 20 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { in: ['employee', 'workshop', 'store'] },
          }),
        }),
      );
    });
  });

  describe('listEmployees', () => {
    it('excludes app-visible roles', async () => {
      await service.listEmployees({ page: 1, limit: 20 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { notIn: ['employee', 'workshop', 'store'] },
          }),
        }),
      );
    });
  });

  describe('createEmployee', () => {
    it('rejects an app-visible role', async () => {
      prisma.role.findUnique.mockResolvedValue(appRole('employee'));

      const error = await service
        .createEmployee({
          name: 'x',
          role: 'employee',
        })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
      });
    });

    it('requires email and password for admin', async () => {
      prisma.role.findUnique.mockResolvedValue(staffRole(UserRole.admin));

      const error = await service
        .createEmployee({
          name: 'x',
          role: UserRole.admin,
        })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
      });
    });

    it('creates an admin user', async () => {
      prisma.role.findUnique.mockResolvedValue(staffRole(UserRole.admin));
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeUser());

      const result = await service.createEmployee({
        name: 'New Admin',
        role: UserRole.admin,
        email: 'new@example.com',
        password: 'password1234',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            role: UserRole.admin,
          }),
        }),
      );
      expect(result.user.email).toBe('new@example.com');
    });

    it('creates an inventory user', async () => {
      prisma.role.findUnique.mockResolvedValue(staffRole(UserRole.inventory));
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(
        makeUser({ role: UserRole.inventory }),
      );

      const result = await service.createEmployee({
        name: 'Warehouse',
        role: UserRole.inventory,
        email: 'warehouse@example.com',
        password: 'password1234',
      });

      expect(result.user.role).toBe(UserRole.inventory);
    });

    it('requires phone for delivery', async () => {
      prisma.role.findUnique.mockResolvedValue(staffRole(UserRole.delivery));

      const error = await service
        .createEmployee({
          name: 'Driver',
          role: UserRole.delivery,
        })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: expect.objectContaining({ phone: expect.any(String) }),
      });
    });

    it('creates a delivery user with only a phone', async () => {
      prisma.role.findUnique.mockResolvedValue(staffRole(UserRole.delivery));
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(
        makeUser({ role: UserRole.delivery, phone: '0994000009', email: null }),
      );

      const result = await service.createEmployee({
        name: 'Driver',
        role: UserRole.delivery,
        phone: '0994000009',
      });

      expect(result.user.role).toBe(UserRole.delivery);
      expect(result.user.phone).toBe('0994000009');
    });

    it('rejects a duplicate email', async () => {
      prisma.role.findUnique.mockResolvedValue(staffRole(UserRole.admin));
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      const error = await service
        .createEmployee({
          name: 'x',
          role: UserRole.admin,
          email: 'dup@example.com',
          password: 'password1234',
        })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
    });
  });

  describe('updateAppUser', () => {
    it('404s for a staff account', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: UserRole.admin,
      });

      const error = await service
        .updateAppUser('user-1', { verified: true })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('updates an app user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: UserRole.employee,
      });
      prisma.user.update.mockResolvedValue(
        makeUser({ role: UserRole.employee, verified: false, email: null }),
      );

      const result = await service.updateAppUser('user-1', {
        verified: false,
      });

      expect(result.user.id).toBe('user-1');
    });
  });

  describe('updateEmployee', () => {
    it('404s for a missing user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const error = await service
        .updateEmployee('missing', { verified: true })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundException);
    });

    it('rejects changing a superadmin role', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'super-1',
        role: UserRole.super_admin,
      });

      const error = await service
        .updateEmployee('super-1', { role: UserRole.admin })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
    });

    it('rejects suspending a superadmin', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'super-1',
        role: UserRole.super_admin,
      });

      const error = await service
        .updateEmployee('super-1', { suspended: true })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
    });

    it('updates an employee', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: UserRole.admin,
      });
      prisma.user.update.mockResolvedValue(makeUser({ verified: false }));

      const result = await service.updateEmployee('user-1', {
        verified: false,
      });

      expect(result.user.id).toBe('user-1');
    });
  });
});
