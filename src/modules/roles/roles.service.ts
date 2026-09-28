import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export type RoleResponse = {
  value: UserRole;
  label: string;
};

/**
 * The roles a new user can pick during onboarding.
 * Not the full UserRole enum — internal roles (super_admin, admin,
 * inventory, delivery) and institute are excluded.
 */
const SELF_SELECTABLE_ROLES: readonly RoleResponse[] = [
  { value: UserRole.employee, label: 'موظف' },
  { value: UserRole.workshop, label: 'مشغل / معمل' },
  { value: UserRole.store, label: 'متجر' },
];

@Injectable()
export class RolesService {
  list(): { items: RoleResponse[] } {
    return { items: [...SELF_SELECTABLE_ROLES] };
  }
}
