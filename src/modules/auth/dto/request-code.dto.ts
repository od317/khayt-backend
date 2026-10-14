import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import {
  normalizePhone,
  PHONE_PATTERN,
  PHONE_VALIDATION_MESSAGE,
} from '../phone';

export class RequestCodeDto {
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
}
