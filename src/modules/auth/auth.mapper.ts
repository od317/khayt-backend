import { Location, User, UserRole } from '@prisma/client';
import {
  BusinessResponse,
  toBusinessResponse,
} from '../businesses/businesses.mapper';

export type { BusinessResponse };
export { toBusinessResponse };

/** Roles allowed to place warehouse orders (cart / checkout). */
export const ORDERING_ROLES: readonly UserRole[] = [
  UserRole.store,
  UserRole.workshop,
] as const;

export function canOrder(
  role: string,
  onboardingCompleted: boolean,
): boolean {
  return (
    onboardingCompleted &&
    (ORDERING_ROLES as readonly string[]).includes(role)
  );
}

export type UserResponse = {
  id: string;
  role: UserRole;
  name: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  deliveryAddress: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  bio: string | null;
  avatarUrl: string | null;
  availableForWork: boolean;
  verified: boolean;
  onboardingCompleted: boolean;
  /** True when onboarding is done and role is store or workshop. */
  canOrder: boolean;
};

export function toUserResponse(
  user: User & { location: Location | null },
): UserResponse {
  const role = user.role as UserRole;
  return {
    id: user.id,
    role,
    name: user.name,
    phone: user.phone,
    email: user.email,
    location: user.location?.name ?? null,
    deliveryAddress: user.deliveryAddress,
    deliveryLat: user.deliveryLat,
    deliveryLng: user.deliveryLng,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    availableForWork: user.availableForWork,
    verified: user.verified,
    onboardingCompleted: user.onboardingCompleted,
    canOrder: canOrder(role, user.onboardingCompleted),
  };
}
