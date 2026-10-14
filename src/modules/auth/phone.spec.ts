import { describe, expect, it } from 'vitest';
import { normalizePhone, PHONE_PATTERN } from './phone';

describe('normalizePhone', () => {
  it('keeps E.164 numbers', () => {
    expect(normalizePhone('+12025550123')).toBe('+12025550123');
  });

  it('converts Syrian local mobiles to E.164', () => {
    expect(normalizePhone('0994000001')).toBe('+963994000001');
  });

  it('converts leading 00 to +', () => {
    expect(normalizePhone('00447911123456')).toBe('+447911123456');
  });

  it('strips spaces and dashes', () => {
    expect(normalizePhone('+1 (202) 555-0123')).toBe('+12025550123');
  });
});

describe('PHONE_PATTERN', () => {
  it.each(['+963994000001', '+12025550123', '+447911123456'])(
    'accepts %s',
    (phone) => {
      expect(PHONE_PATTERN.test(phone)).toBe(true);
    },
  );

  it.each(['0994000001', '+0123', 'abc', '+'])('rejects %s', (phone) => {
    expect(PHONE_PATTERN.test(phone)).toBe(false);
  });
});
