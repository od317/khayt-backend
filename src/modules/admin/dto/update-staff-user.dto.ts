import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

const INTERNAL_ROLES = [
  UserRole.admin,
  UserRole.inventory,
  UserRole.delivery,
  UserRole.super_admin,
] as const;

export class UpdateStaffUserDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  suspended?: boolean;

  @ApiPropertyOptional({ enum: INTERNAL_ROLES, example: UserRole.admin })
  @IsOptional()
  @IsIn(INTERNAL_ROLES)
  role?: UserRole;
}
