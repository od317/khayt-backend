import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsNotIn, IsString } from 'class-validator';

const INTERNAL_ROLES = [
  UserRole.super_admin,
  UserRole.admin,
  UserRole.inventory,
  UserRole.delivery,
] as const;

export class OnboardingDto {
  @ApiProperty({ example: 'employee' })
  @IsString()
  @IsNotIn(INTERNAL_ROLES, {
    message: 'must be a self-selectable role',
  })
  role!: string;

  @ApiProperty({ example: '' })
  @IsString()
  locationId!: string;
}
