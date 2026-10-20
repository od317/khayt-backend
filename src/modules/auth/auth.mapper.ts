import { Location, User, UserRole } from '@prisma/client';
import {
  BusinessResponse,
  toBusinessResponse,
} from '../businesses/businesses.mapper';
import { withDefaultImage } from '../../common/defaults/images';
import {
  DeliveryBorder,
  LocationWithParent,
  resolveDeliveryBorder,
} from '../locations/location-border';

export type { BusinessResponse };
export { toBusinessResponse };

/** Roles allowed to place warehouse orders (cart / checkout). */
export const ORDERING_ROLES: readonly UserRole[] = [
  UserRole.store,
  UserRole.workshop,
] as const;

/** Prisma include so area locations resolve parent-city delivery borders. */
export const userLocationInclude = {
  location: { include: { parent: true } },
} as const;

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
  locationId: string | null;
  deliveryBorder: DeliveryBorder | null;
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
  user: User & { location: LocationWithParent | Location | null },
): UserResponse {
  const role = user.role as UserRole;
  const location = user.location as LocationWithParent | null;
  return {
    id: user.id,
    role,
    name: user.name,
    phone: user.phone,
    email: user.email,
    location: location?.name ?? null,
    locationId: user.locationId,
    deliveryBorder: resolveDeliveryBorder(location),
    deliveryAddress: user.deliveryAddress,
    deliveryLat: user.deliveryLat,
    deliveryLng: user.deliveryLng,
    bio: user.bio,
    avatarUrl: withDefaultImage(user.avatarUrl),
    availableForWork: user.availableForWork,
    verified: user.verified,
    onboardingCompleted: user.onboardingCompleted,
    canOrder: canOrder(role, user.onboardingCompleted),
  };
}
