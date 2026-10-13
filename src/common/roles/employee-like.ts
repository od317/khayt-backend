import { UserRole } from '@prisma/client';

/**
 * Public individual roles that behave like `employee`:
 * onboarding without business, availability toggle, same forMe feed types,
 * and public profile cards.
 */
export const EMPLOYEE_LIKE_ROLES = [
  UserRole.employee,
  UserRole.marketer,
  UserRole.shipping_company,
] as const;

export type EmployeeLikeRole = (typeof EMPLOYEE_LIKE_ROLES)[number];

export function isEmployeeLikeRole(role: string): role is EmployeeLikeRole {
  return (EMPLOYEE_LIKE_ROLES as readonly string[]).includes(role);
}

export function toEmployeeLikeRole(role: string): EmployeeLikeRole {
  if (!isEmployeeLikeRole(role)) {
    throw new Error(`Expected employee-like role, got ${role}`);
  }
  return role;
}
