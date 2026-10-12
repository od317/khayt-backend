import { describe, expect, it } from 'vitest';
import { applyVariantImageFiles } from './product-uploads';

const file = (fieldname: string, filename: string): Express.Multer.File =>
  ({ fieldname, filename }) as Express.Multer.File;

describe('applyVariantImageFiles', () => {
  it('maps uploaded files onto the variant tree', () => {
    const variants = applyVariantImageFiles(
      {
        axes: [
          { key: 'color', label: 'لون' },
          { key: 'size', label: 'قياس' },
        ],
        options: [
          {
            name: 'أحمر',
            children: [{ name: 'M' }, { name: 'L' }],
          },
        ],
      } as never,
      [
        file('variant_0', 'red.jpg'),
        file('variant_0_child_1', 'red-l.jpg'),
      ],
    );

    expect(variants?.options[0]?.image).toBe('/uploads/products/red.jpg');
    expect(variants?.options[0]?.images).toEqual(['/uploads/products/red.jpg']);
    expect(variants?.options[0]?.children?.[0]?.image).toBe(
      '/uploads/products/red.jpg',
    );
    expect(variants?.options[0]?.children?.[1]?.image).toBe(
      '/uploads/products/red-l.jpg',
    );
  });

  it('maps multiple images for one color', () => {
    const variants = applyVariantImageFiles(
      {
        axes: [{ key: 'color', label: 'لون' }],
        options: [{ name: 'أحمر' }],
      },
      [
        file('variant_0', 'red-1.jpg'),
        file('variant_0_img_1', 'red-2.jpg'),
        file('variant_0_img_2', 'red-3.jpg'),
      ],
    );

    expect(variants?.options[0]?.image).toBe('/uploads/products/red-1.jpg');
    expect(variants?.options[0]?.images).toEqual([
      '/uploads/products/red-1.jpg',
      '/uploads/products/red-2.jpg',
      '/uploads/products/red-3.jpg',
    ]);
  });

  it('rejects a variant option with no uploaded image', () => {
    expect(() =>
      applyVariantImageFiles(
        {
          axes: [{ key: 'color', label: 'لون' }],
          options: [{ name: 'أحمر', image: 'https://cdn.example/red.jpg' }],
        },
        [],
      ),
    ).toThrow(/Each variant option needs at least one uploaded image/);
  });

  it('keeps stored variant images when no new file is uploaded', () => {
    const variants = applyVariantImageFiles(
      {
        axes: [{ key: 'color', label: 'لون' }],
        options: [{ name: 'أحمر' }],
      },
      [],
      {
        axes: [{ key: 'color', label: 'لون' }],
        options: [
          {
            name: 'أحمر',
            image: '/uploads/products/red.jpg',
            images: [
              '/uploads/products/red.jpg',
              '/uploads/products/red-2.jpg',
            ],
          },
        ],
      },
    );

    expect(variants?.options[0]?.image).toBe('/uploads/products/red.jpg');
    expect(variants?.options[0]?.images).toEqual([
      '/uploads/products/red.jpg',
      '/uploads/products/red-2.jpg',
    ]);
  });
});
