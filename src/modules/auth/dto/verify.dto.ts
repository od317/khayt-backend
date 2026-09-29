import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { normalizePhone, SYRIAN_PHONE_PATTERN } from '../phone';

export class VerifyDto {
  @ApiProperty({ example: '', description: 'Syrian phone number (09xxxxxxxx)' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @IsString()
  @Matches(SYRIAN_PHONE_PATTERN, {
    message: 'must be a Syrian phone number (09xxxxxxxx)',
  })
  phone!: string;

  @ApiProperty({ example: '', description: '6-digit verification code' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'must be a 6-digit code' })
  code!: string;
}
