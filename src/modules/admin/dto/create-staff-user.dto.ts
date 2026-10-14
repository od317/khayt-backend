import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  normalizePhone,
  PHONE_PATTERN,
  PHONE_VALIDATION_MESSAGE,
} from '../../auth/phone';

export class CreateStaffUserDto {
  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'inventory',
    description:
      'Must be a role that is hidden from the app (visibleInApp false), e.g. admin, inventory, delivery.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  role!: string;

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

  @ApiPropertyOptional({ example: '+963994000009' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: PHONE_VALIDATION_MESSAGE,
  })
  phone?: string;
}
