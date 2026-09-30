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
    expect(variants?.options[0]?.children?.[0]?.image).toBe(
      '/uploads/products/red.jpg',
    );
    expect(variants?.options[0]?.children?.[1]?.image).toBe(
      '/uploads/products/red-l.jpg',
    );
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
    ).toThrow(/Each variant option needs an uploaded image/);
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
        options: [{ name: 'أحمر', image: '/uploads/products/red.jpg' }],
      },
    );

    expect(variants?.options[0]?.image).toBe('/uploads/products/red.jpg');
  });
});
