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
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

describe('toColorImages', () => {
  it('builds colorImages from a color-first variant tree', () => {
    const result = toColorImages({
      axes: [
        { key: 'color', label: 'لون' },
        { key: 'size', label: 'قياس' },
      ],
      options: [
        {
          name: 'أبيض',
          hex: '#FFFFFF',
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
    });

    expect(result).toEqual([
      {
        name: 'أبيض',
        hex: '#FFFFFF',
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
        images: ['/uploads/products/blue.jpg'],
      },
    ]);
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
    });
    expect(result).not.toHaveProperty('businessId');
    expect(result).not.toHaveProperty('business');
  });
});
