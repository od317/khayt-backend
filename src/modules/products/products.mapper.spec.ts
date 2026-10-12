import { describe, expect, it } from 'vitest';
import { toColorImages } from './products.mapper';

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
