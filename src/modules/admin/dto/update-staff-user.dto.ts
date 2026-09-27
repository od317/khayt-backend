import { UserRole } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsOptional } from 'class-validator';

const INTERNAL_ROLES = [
  UserRole.admin,
  UserRole.inventory,
  UserRole.delivery,
  UserRole.super_admin,
] as const;

export class UpdateStaffUserDto {
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsBoolean()
  suspended?: boolean;

  @IsOptional()
  @IsIn(INTERNAL_ROLES)
  role?: UserRole;
}
