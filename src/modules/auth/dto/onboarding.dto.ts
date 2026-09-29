import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsIn, IsString } from 'class-validator';

const SELF_SELECTABLE_ROLES = [
  UserRole.employee,
  UserRole.workshop,
  UserRole.institute,
  UserRole.store,
] as const;

export class OnboardingDto {
  @ApiProperty({ enum: SELF_SELECTABLE_ROLES, example: UserRole.employee })
  @IsIn(SELF_SELECTABLE_ROLES, {
    message: 'must be one of employee, workshop, institute, store',
  })
  role!: UserRole;

  @ApiProperty({ example: '' })
  @IsString()
  locationId!: string;
}
