import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RequestCodeDto } from './request-code.dto';

const validateBody = async (body: { phone?: unknown }) => {
  const dto = plainToInstance(RequestCodeDto, body);
  const errors = await validate(dto);
  return {
    phone: dto.phone,
    valid: errors.length === 0,
    messages: errors.flatMap((error) => Object.values(error.constraints ?? {})),
  };
};

describe('RequestCodeDto', () => {
  it.each([
    ['0994037669', true, '+963994037669'],
    ['0994 037 669', true, '+963994037669'],
    ['0994-037-669', true, '+963994037669'],
    ['+963994037669', true, '+963994037669'],
    ['00963994037669', true, '+963994037669'],
    ['+12025550123', true, '+12025550123'],
    ['+447911123456', true, '+447911123456'],
    ['09940376', false, '09940376'],
    ['0894037669', false, '0894037669'],
    ['+0123', false, '+0123'],
    ['not-a-phone', false, 'not-a-phone'],
  ])('phone %j accepted=%s → %j', async (phone, accepted, normalized) => {
    const result = await validateBody({ phone });
    expect(result.valid).toBe(accepted);
    if (accepted) {
      expect(result.phone).toBe(normalized);
    }
  });

  it('strips hidden copy-paste marks around a valid number', async () => {
    const result = await validateBody({
      phone: '\u200e0994037669\u200f',
    });
    expect(result.valid).toBe(true);
    expect(result.phone).toBe('+963994037669');
  });
});
