import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RequestCodeDto } from './request-code.dto';

const validatePhone = async (phone: unknown) => {
  const dto = plainToInstance(RequestCodeDto, { phone });
  const errors = await validate(dto);
  return {
    phone: dto.phone,
    valid: errors.length === 0,
    messages: errors.flatMap((error) => Object.values(error.constraints ?? {})),
  };
};

describe('RequestCodeDto phone', () => {
  it.each([
    ['0994037669', true],
    ['0994307669', true],
    ['0994 037 669', true],
    ['0994-037-669', true],
    [' 0994037669 ', true],
    ['09940376', false],
    ['0894037669', false],
    ['+963994037669', false],
  ])('phone %j accepted=%s', async (phone, accepted) => {
    const result = await validatePhone(phone);
    expect(result.valid).toBe(accepted);
  });

  it('strips hidden copy-paste marks around a valid number', async () => {
    const result = await validatePhone('\u200e0994037669\u200f');
    expect(result.valid).toBe(true);
    expect(result.phone).toBe('0994037669');
  });
});
