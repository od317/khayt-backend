import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { normalizePhone, SYRIAN_PHONE_PATTERN } from '../phone';

export class RequestCodeDto {
  @ApiProperty({ example: '', description: 'Syrian phone number (09xxxxxxxx)' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @IsString()
  @Matches(SYRIAN_PHONE_PATTERN, {
    message: 'must be a Syrian phone number (09xxxxxxxx)',
  })
  phone!: string;

  @ApiProperty({
    example: 'أحمد',
    description:
      'Required with the phone. New phones register this name; existing phones must send the same name as before.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;
}
