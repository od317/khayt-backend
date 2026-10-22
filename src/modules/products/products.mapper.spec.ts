import { describe, expect, it } from 'vitest';
import { Product } from '@prisma/client';
import { toColorImages, toProductResponse } from './products.mapper';

const baseProduct = (): Product => ({
  id: 'prod-1',
  name: 'قميص',
  category: 'قمصان',
  description: null,
  images: [],
  unit: 'قطعة',
  price: 5000,
  inWarehouse: false,
  available: true,
  guarantee: false,
  supplierBusinessId: null,
  variants: null,
  packaging: null,
  discount: null,
  offer: null,
  saleRule: null,
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

describe('toColorImages', () => {
  it('builds colorImages from a color-first variant tree', () => {
    const result = toColorImages(
      {
        axes: [
          { key: 'color', label: 'لون' },
          { key: 'size', label: 'قياس' },
        ],
        options: [
          {
            name: 'أبيض',
            hex: '#FFFFFF',
            discountPercent: 10,
            image: '/uploads/products/white-1.jpg',
            images: [
              '/uploads/products/white-1.jpg',
              '/uploads/products/white-2.jpg',
            ],
          },
          {
            name: 'أزرق',
            hex: '#1E3A8A',
            image: '/uploads/products/blue.jpg',
          },
        ],
      },
      10000,
    );

    expect(result).toEqual([
      {
        name: 'أبيض',
        hex: '#FFFFFF',
        image: '/uploads/products/white-1.jpg',
        images: [
          '/uploads/products/white-1.jpg',
          '/uploads/products/white-2.jpg',
        ],
        originalPrice: 10000,
        price: 9000,
        discountPercent: 10,
        sizeMode: 'free',
        sizePack: null,
        unitsPerPack: null,
        packPrice: null,
      },
      {
        name: 'أزرق',
        hex: '#1E3A8A',
        image: '/uploads/products/blue.jpg',
        images: ['/uploads/products/blue.jpg'],
        originalPrice: 10000,
        price: 10000,
        discountPercent: null,
        sizeMode: 'free',
        sizePack: null,
        unitsPerPack: null,
        packPrice: null,
      },
    ]);
  });

  it('marks a color as pack when sizePack is set on the option', () => {
    const result = toColorImages(
      {
        axes: [
          { key: 'color', label: 'لون' },
          { key: 'size', label: 'قياس' },
        ],
        options: [
          {
            name: 'أحمر',
            image: '/red.jpg',
            sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 1 },
            children: [{ name: 'M' }, { name: 'L' }, { name: 'XL' }],
          },
          {
            name: 'أزرق',
            image: '/blue.jpg',
            discountPercent: 10,
            children: [{ name: 'M' }, { name: 'L' }],
          },
        ],
      },
      10000,
    );

    expect(result[0]).toMatchObject({
      name: 'أحمر',
      sizeMode: 'pack',
      sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 1 },
      unitsPerPack: 3,
      packPrice: 30000,
      discountPercent: null,
      price: 10000,
    });
    expect(result[1]).toMatchObject({
      name: 'أزرق',
      sizeMode: 'free',
      sizePack: null,
      unitsPerPack: null,
      packPrice: null,
      discountPercent: 10,
      price: 9000,
    });
  });

  it('returns empty when there is no color axis', () => {
    expect(
      toColorImages({
        axes: [{ key: 'size', label: 'قياس' }],
        options: [{ name: 'M', image: '/uploads/products/m.jpg' }],
      }),
    ).toEqual([]);
  });
});

describe('toProductResponse', () => {
  it('maps a platform-owned product with optional supplier link', () => {
    const result = toProductResponse(baseProduct());

    expect(result).toMatchObject({
      id: 'prod-1',
      name: 'قميص',
      category: 'قمصان',
      price: 5000,
      supplierBusinessId: null,
      saleCase: 'free',
      packPrice: null,
      saleRule: null,
    });
    expect(result).not.toHaveProperty('businessId');
    expect(result).not.toHaveProperty('business');
  });

  it('exposes saleRule with locked color options for the frontend', () => {
    const result = toProductResponse({
      ...baseProduct(),
      saleRule: { lockedAxis: 'color' },
      variants: {
        axes: [
          { key: 'color', label: 'لون' },
          { key: 'size', label: 'قياس' },
        ],
        options: [
          {
            name: 'أحمر',
            children: [{ name: 'M' }, { name: 'L' }],
          },
          {
            name: 'أزرق',
            children: [{ name: 'M' }, { name: 'L' }],
          },
          {
            name: 'أبيض',
            children: [{ name: 'M' }, { name: 'L' }],
          },
        ],
      },
    });

    expect(result.saleCase).toBe('locked_axis');
    expect(result.packPrice).toBeNull();
    expect(result.saleRule).toEqual({
      mode: 'locked_axis',
      lockedAxis: 'color',
      label: 'لون',
      options: ['أحمر', 'أزرق', 'أبيض'],
      optionCount: 3,
    });
  });

  it('exposes product packPrice and pairWith for color_pair_pack', () => {
    const result = toProductResponse({
      ...baseProduct(),
      price: 45000,
      saleRule: {
        mode: 'color_pair_pack',
        sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 5 },
        pairWith: { أحمر: ['أسود'], أزرق: ['أسود'] },
      },
      variants: {
        axes: [
          { key: 'color', label: 'لون' },
          { key: 'size', label: 'قياس' },
        ],
        options: [
          {
            name: 'أحمر',
            children: [{ name: 'M' }, { name: 'L' }, { name: 'XL' }],
          },
          {
            name: 'أزرق',
            children: [{ name: 'M' }, { name: 'L' }, { name: 'XL' }],
          },
          {
            name: 'أسود',
            children: [{ name: 'M' }, { name: 'L' }, { name: 'XL' }],
          },
        ],
      },
    });

    expect(result.saleCase).toBe('color_pair_pack');
    expect(result.packPrice).toBe(1350000);
    expect(result.saleRule).toEqual({
      mode: 'color_pair_pack',
      sizePack: { sizes: ['M', 'L', 'XL'], qtyPerSize: 5 },
      pairWith: { أحمر: ['أسود'], أزرق: ['أسود'] },
      allowedPairColors: ['أسود'],
      unitsPerPack: 30,
      packPrice: 1350000,
    });
  });
});
