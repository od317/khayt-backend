import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  assertCartVariantAllowsSaleRule,
  assertCartVariantForSaleMode,
  assertSaleRuleMatchesVariants,
  buildPackBreakdown,
  collectAxisOptions,
  parseSaleRuleStored,
  pieceUnitPrice,
  resolveProductSaleCase,
  toSaleRuleResponse,
  unitsPerPack,
} from './sale-rule';

const colorSizeTree = {
  axes: [
    { key: 'color', label: 'لون' },
    { key: 'size', label: 'قياس' },
  ],
  options: [
    {
      name: 'أحمر',
      discountPercent: 10,
      children: [{ name: 'M' }, { name: 'L' }, { name: 'XL' }],
    },
    {
      name: 'أزرق',
      children: [{ name: 'M' }, { name: 'S' }, { name: 'XL' }],
    },
    {
      name: 'أسود',
      children: [{ name: 'M' }, { name: 'L' }, { name: 'XL' }],
    },
  ],
};

describe('sale-rule', () => {
  it('collects top-level color names when color is locked', () => {
    expect(collectAxisOptions(colorSizeTree, 'color')).toEqual({
      label: 'لون',
      options: ['أحمر', 'أزرق', 'أسود'],
    });
  });

  it('collects unique child size names when size is locked', () => {
    expect(collectAxisOptions(colorSizeTree, 'size')).toEqual({
      label: 'قياس',
      options: ['M', 'L', 'XL', 'S'],
    });
  });

  it('parses legacy lockedAxis as locked_axis mode', () => {
    expect(parseSaleRuleStored({ lockedAxis: 'color' })).toEqual({
      mode: 'locked_axis',
      lockedAxis: 'color',
    });
  });

  it('builds a public saleRule response for locked_axis', () => {
    expect(
      toSaleRuleResponse({ lockedAxis: 'color' }, colorSizeTree),
    ).toEqual({
      mode: 'locked_axis',
      lockedAxis: 'color',
      label: 'لون',
      options: ['أحمر', 'أزرق', 'أسود'],
      optionCount: 3,
    });
  });

  it('builds pack mode responses with unitsPerPack and packPrice', () => {
    expect(
      toSaleRuleResponse(
        {
          mode: 'color_size_pack',
          sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 1 },
        },
        colorSizeTree,
        45000,
      ),
    ).toEqual({
      mode: 'color_size_pack',
      sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 1 },
      unitsPerPack: 3,
      packPrice: 135000,
    });

    expect(
      unitsPerPack({
        mode: 'color_pair_pack',
        sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 5 },
        pairWith: {},
        legacyAllowedPairColors: ['أسود'],
      }),
    ).toBe(30);

    expect(
      toSaleRuleResponse(
        {
          mode: 'color_pair_pack',
          sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 5 },
          pairWith: { أحمر: ['أسود'], أزرق: ['أسود'] },
        },
        colorSizeTree,
        45000,
      ),
    ).toEqual({
      mode: 'color_pair_pack',
      sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 5 },
      pairWith: { أحمر: ['أسود'], أزرق: ['أسود'] },
      allowedPairColors: ['أسود'],
      unitsPerPack: 30,
      packPrice: 1350000,
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

  it('validates color_size_pack cart variant', () => {
    const rule = {
      mode: 'color_size_pack',
      sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 1 },
    };
    expect(() =>
      assertCartVariantForSaleMode(rule, colorSizeTree, { color: 'أحمر' }),
    ).not.toThrow();
    expect(() =>
      assertCartVariantForSaleMode(rule, colorSizeTree, {
        color: 'أحمر',
        size: 'M',
      }),
    ).toThrow(HttpException);
  });

  it('allows mixed per-color free vs pack on the same product', () => {
    const mixed = {
      axes: colorSizeTree.axes,
      options: [
        {
          name: 'أحمر',
          children: [{ name: 'M' }, { name: 'L' }, { name: 'XL' }],
        },
        {
          name: 'أسود',
          sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 1 },
          children: [{ name: 'M' }, { name: 'L' }, { name: 'XL' }],
        },
      ],
    };
    expect(() =>
      assertCartVariantForSaleMode(null, mixed, {
        color: 'أحمر',
        size: 'M',
      }),
    ).not.toThrow();
    expect(() =>
      assertCartVariantForSaleMode(null, mixed, { color: 'أحمر' }),
    ).toThrow(HttpException);
    expect(() =>
      assertCartVariantForSaleMode(null, mixed, { color: 'أسود' }),
    ).not.toThrow();
    expect(() =>
      assertCartVariantForSaleMode(null, mixed, {
        color: 'أسود',
        size: 'M',
      }),
    ).toThrow(HttpException);
  });

  it('validates color_pair_pack cart variant with pairWith', () => {
    const rule = {
      mode: 'color_pair_pack',
      sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 5 },
      pairWith: { أحمر: ['أسود', 'أزرق'], أزرق: ['أسود'] },
    };
    expect(() =>
      assertCartVariantForSaleMode(rule, colorSizeTree, {
        color: 'أحمر',
        pairColor: 'أسود',
      }),
    ).not.toThrow();
    expect(() =>
      assertCartVariantForSaleMode(rule, colorSizeTree, {
        color: 'أحمر',
        pairColor: 'أزرق',
      }),
    ).not.toThrow();
    expect(() =>
      assertCartVariantForSaleMode(rule, colorSizeTree, {
        color: 'أحمر',
        pairColor: 'وردي',
      }),
    ).toThrow(HttpException);
    expect(() =>
      assertCartVariantForSaleMode(rule, colorSizeTree, {
        color: 'أسود',
        pairColor: 'أحمر',
      }),
    ).toThrow(HttpException);
  });

  it('expands legacy allowedPairColors into pairWith', () => {
    const rule = parseSaleRuleStored({
      mode: 'color_pair_pack',
      sizePack: { sizes: ['M', 'L'], qtyPerSize: 1 },
      allowedPairColors: ['أسود'],
    });
    expect(rule).toMatchObject({
      mode: 'color_pair_pack',
      legacyAllowedPairColors: ['أسود'],
    });
    expect(() =>
      assertCartVariantForSaleMode(rule, colorSizeTree, {
        color: 'أحمر',
        pairColor: 'أسود',
      }),
    ).not.toThrow();
  });

  it('builds pack breakdown for color_pair_pack', () => {
    const rule = parseSaleRuleStored({
      mode: 'color_pair_pack',
      sizePack: { sizes: ['M', 'XL'], qtyPerSize: 5 },
      pairWith: { أحمر: ['أسود'] },
    });
    expect(
      buildPackBreakdown(rule, { color: 'أحمر', pairColor: 'أسود' }, 1),
    ).toEqual([
      { color: 'أحمر', size: 'M', qty: 5 },
      { color: 'أحمر', size: 'XL', qty: 5 },
      { color: 'أسود', size: 'M', qty: 5 },
      { color: 'أسود', size: 'XL', qty: 5 },
    ]);
  });

  it('applies color discountPercent only in free mode', () => {
    expect(
      pieceUnitPrice(10000, colorSizeTree, { color: 'أحمر', size: 'M' }, null),
    ).toBe(9000);
    expect(
      pieceUnitPrice(
        10000,
        colorSizeTree,
        { color: 'أحمر' },
        { mode: 'color_size_pack', sizePack: { sizes: ['M'], qtyPerSize: 1 } },
      ),
    ).toBe(10000);
  });

  it('resolves product saleCase for the FE', () => {
    expect(resolveProductSaleCase(null, colorSizeTree)).toBe('free');
    expect(
      resolveProductSaleCase({ lockedAxis: 'color' }, colorSizeTree),
    ).toBe('locked_axis');
    expect(
      resolveProductSaleCase(
        {
          mode: 'color_pair_pack',
          sizePack: { sizes: ['M'], qtyPerSize: 1 },
          pairWith: { أحمر: ['أسود'] },
        },
        colorSizeTree,
      ),
    ).toBe('color_pair_pack');

    const mixed = {
      axes: colorSizeTree.axes,
      options: [
        { name: 'أحمر', children: [{ name: 'M' }] },
        {
          name: 'أسود',
          sizePack: { sizes: ['M', 'L'], qtyPerSize: 1 },
          children: [{ name: 'M' }, { name: 'L' }],
        },
      ],
    };
    expect(resolveProductSaleCase(null, mixed)).toBe('mixed');
  });
});
