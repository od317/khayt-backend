import { describe, expect, it } from 'vitest';
import { parseActiveQueryFlag } from './query-orders.dto';

describe('parseActiveQueryFlag', () => {
  it('treats true and "true" as active', () => {
    expect(parseActiveQueryFlag(true)).toBe(true);
    expect(parseActiveQueryFlag('true')).toBe(true);
    expect(parseActiveQueryFlag('TRUE')).toBe(true);
  });

  it('treats false and "false" as completed', () => {
    expect(parseActiveQueryFlag(false)).toBe(false);
    expect(parseActiveQueryFlag('false')).toBe(false);
  });

  it('treats omitted as unset so the list can default to hiding completed', () => {
    expect(parseActiveQueryFlag(undefined)).toBeUndefined();
  });
});
