import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  normalizePhone,
  PHONE_PATTERN,
  PHONE_VALIDATION_MESSAGE,
} from '../../auth/phone';

export const UPDATE_EMPLOYEE_EXAMPLE = {
  name: '',
  role: 'inventory',
  email: '',
  password: '',
  phone: '+963994000009',
  verified: true,
  suspended: false,
  bio: '',
  avatarUrl: '',
  locationId: '',
};

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: UPDATE_EMPLOYEE_EXAMPLE.name })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: UPDATE_EMPLOYEE_EXAMPLE.role })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  role?: string;

  @ApiPropertyOptional({
    example: UPDATE_EMPLOYEE_EXAMPLE.email,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ example: UPDATE_EMPLOYEE_EXAMPLE.password })
  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(200)
  password?: string;

  @ApiPropertyOptional({
    example: UPDATE_EMPLOYEE_EXAMPLE.phone,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: PHONE_VALIDATION_MESSAGE,
  })
  phone?: string | null;

  @ApiPropertyOptional({ example: UPDATE_EMPLOYEE_EXAMPLE.verified })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ example: UPDATE_EMPLOYEE_EXAMPLE.suspended })
  @IsOptional()
  @IsBoolean()
  suspended?: boolean;

  @ApiPropertyOptional({
    example: UPDATE_EMPLOYEE_EXAMPLE.bio,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(200)
  bio?: string | null;

  @ApiPropertyOptional({
    example: UPDATE_EMPLOYEE_EXAMPLE.avatarUrl,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    example: UPDATE_EMPLOYEE_EXAMPLE.locationId,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  locationId?: string | null;
}
