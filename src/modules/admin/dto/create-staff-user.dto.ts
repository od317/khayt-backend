import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: CREATABLE_ROLES, example: UserRole.admin })
  @IsIn(CREATABLE_ROLES)
  role!: UserRole;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(200)
  password?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  @Matches(/^09\d{8}$/, {
    message: 'must be a Syrian phone number (09xxxxxxxx)',
  })
  phone?: string;
}
