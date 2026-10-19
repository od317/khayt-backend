import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
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
} from '../phone';

export class VerifyDto {
  @ApiProperty({
    example: '+963994037669',
    description:
      'International phone in E.164 (`+countrycode…`). Syrian mobiles may still be sent as `09xxxxxxxx` and are normalized to `+9639…`.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: PHONE_VALIDATION_MESSAGE,
  })
  phone!: string;

  @ApiProperty({ example: '', description: '6-digit verification code' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'يجب أن يكون رمزاً من 6 أرقام' })
  code!: string;

  @ApiPropertyOptional({
    example: '',
    description: 'Firebase Cloud Messaging device token from the Android app',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  fcmToken?: string;
}
