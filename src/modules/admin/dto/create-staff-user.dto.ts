import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const CREATABLE_ROLES = [
  UserRole.admin,
  UserRole.inventory,
  UserRole.delivery,
] as const;

export class CreateStaffUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsIn(CREATABLE_ROLES)
  role!: UserRole;

  // For role = admin: required.
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(200)
  password?: string;

  // For role = inventory | delivery: required.
  @IsOptional()
  @IsString()
  @Matches(/^09\d{8}$/, {
    message: 'must be a Syrian phone number (09xxxxxxxx)',
  })
  phone?: string;
}
