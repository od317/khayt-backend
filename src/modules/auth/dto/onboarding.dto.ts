import { UserRole } from '@prisma/client';
import { IsIn, IsString } from 'class-validator';

const SELF_SELECTABLE_ROLES = [
  UserRole.employee,
  UserRole.workshop,
  UserRole.institute,
  UserRole.store,
] as const;

export class OnboardingDto {
  @IsIn(SELF_SELECTABLE_ROLES, {
    message: 'must be one of employee, workshop, institute, store',
  })
  role!: UserRole;

  @IsString()
  locationId!: string;
}
