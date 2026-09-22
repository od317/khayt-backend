import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { normalizePhone, SYRIAN_PHONE_PATTERN } from '../phone';

export class VerifyDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @IsString()
  @Matches(SYRIAN_PHONE_PATTERN, {
    message: 'must be a Syrian phone number (09xxxxxxxx)',
  })
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'must be a 6-digit code' })
  code!: string;
}
