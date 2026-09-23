import {
  Business,
  BusinessType,
  Location,
  User,
  UserRole,
} from '@prisma/client';
import {
  BusinessResponse,
  toBusinessResponse,
} from '../businesses/businesses.mapper';

export type { BusinessResponse };
export { toBusinessResponse };

export type UserResponse = {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  location: string | null;
  bio: string | null;
  avatarUrl: string | null;
  availableForWork: boolean;
  verified: boolean;
  onboardingCompleted: boolean;
};

export function toUserResponse(
  user: User & { location: Location | null },
): UserResponse {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
    location: user.location?.name ?? null,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    availableForWork: user.availableForWork,
    verified: user.verified,
    onboardingCompleted: user.onboardingCompleted,
  };
}
