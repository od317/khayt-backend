import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRolesController } from './admin-roles.controller';
import { RolesService } from './roles.service';

describe('AdminRolesController', () => {
  let roles: { update: ReturnType<typeof vi.fn> };
  let controller: AdminRolesController;

  beforeEach(() => {
    roles = { update: vi.fn() };
    controller = new AdminRolesController(roles as unknown as RolesService);
  });

  it('updates the role icon URL to the uploaded file path', async () => {
    const result = { role: { id: 'role-employee' } };
    roles.update.mockResolvedValue(result);

    await expect(
      controller.uploadIcon('role-employee', {
        filename: 'icon.png',
      } as Express.Multer.File),
    ).resolves.toBe(result);
    expect(roles.update).toHaveBeenCalledWith('role-employee', {
      iconUrl: '/uploads/role-icons/icon.png',
    });
  });

  it('rejects requests without an accepted image file', () => {
    expect(() => controller.uploadIcon('role-employee')).toThrow(
      BadRequestException,
    );
    expect(roles.update).not.toHaveBeenCalled();
  });
});
