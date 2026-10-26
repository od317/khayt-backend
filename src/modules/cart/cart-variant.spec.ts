import { describe, expect, it } from 'vitest';
import { expandCartVariants } from './cart-variant';

describe('expandCartVariants', () => {
  it('returns null for missing variant', () => {
    expect(expandCartVariants(undefined)).toEqual([null]);
    expect(expandCartVariants(null)).toEqual([null]);
  });

  it('keeps a free-size variant as a single line', () => {
    expect(
      expandCartVariants({ color: 'أحمر', size: 'M' }),
    ).toEqual([{ color: 'أحمر', size: 'M' }]);
  });

  it('accepts a single pairColor', () => {
    expect(
      expandCartVariants({ color: 'أحمر', pairColor: 'أزرق' }),
    ).toEqual([{ color: 'أحمر', pairColor: 'أزرق' }]);
  });

  it('expands pairColors into one variant per second color', () => {
    expect(
      expandCartVariants({
        color: 'أحمر',
        pairColors: ['أزرق', 'أسود'],
      }),
    ).toEqual([
      { color: 'أحمر', pairColor: 'أزرق' },
      { color: 'أحمر', pairColor: 'أسود' },
    ]);
  });

  it('merges pairColor + pairColors and de-duplicates', () => {
    expect(
      expandCartVariants({
        color: 'أحمر',
        pairColor: 'أزرق',
        pairColors: ['أزرق', 'أسود'],
      }),
    ).toEqual([
      { color: 'أحمر', pairColor: 'أزرق' },
      { color: 'أحمر', pairColor: 'أسود' },
    ]);
  });
});
