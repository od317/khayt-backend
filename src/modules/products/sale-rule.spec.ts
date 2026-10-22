import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  assertCartVariantAllowsSaleRule,
  assertSaleRuleMatchesVariants,
  collectAxisOptions,
  toSaleRuleResponse,
} from './sale-rule';

const colorSizeTree = {
  axes: [
    { key: 'color', label: 'لون' },
    { key: 'size', label: 'قياس' },
  ],
  options: [
    { name: 'أحمر', children: [{ name: 'M' }, { name: 'L' }] },
    { name: 'أزرق', children: [{ name: 'M' }, { name: 'S' }] },
  ],
};

describe('sale-rule', () => {
  it('collects top-level color names when color is locked', () => {
    expect(collectAxisOptions(colorSizeTree, 'color')).toEqual({
      label: 'لون',
      options: ['أحمر', 'أزرق'],
    });
  });

  it('collects unique child size names when size is locked', () => {
    expect(collectAxisOptions(colorSizeTree, 'size')).toEqual({
      label: 'قياس',
      options: ['M', 'L', 'S'],
    });
  });

  it('builds a public saleRule response', () => {
    expect(
      toSaleRuleResponse({ lockedAxis: 'color' }, colorSizeTree),
    ).toEqual({
      lockedAxis: 'color',
      label: 'لون',
      options: ['أحمر', 'أزرق'],
      optionCount: 2,
    });
  });

  it('rejects saleRule when the axis is missing from variants', () => {
    expect(() =>
      assertSaleRuleMatchesVariants(
        { lockedAxis: 'size' },
        { axes: [{ key: 'color', label: 'لون' }], options: [{ name: 'أحمر' }] },
      ),
    ).toThrow(HttpException);
  });

  it('rejects cart variant that picks a locked axis', () => {
    expect(() =>
      assertCartVariantAllowsSaleRule(
        { lockedAxis: 'color' },
        { color: 'أحمر', size: 'M' },
      ),
    ).toThrow(HttpException);
  });

  it('allows cart variant that only picks the unlocked axis', () => {
    expect(() =>
      assertCartVariantAllowsSaleRule(
        { lockedAxis: 'color' },
        { size: 'M' },
      ),
    ).not.toThrow();
  });
});
