import { User, UserRole } from '@prisma/client';
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
};

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
    location: user.location,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    availableForWork: user.availableForWork,
    verified: user.verified,
  };
}
