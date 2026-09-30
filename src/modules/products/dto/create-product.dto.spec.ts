import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateProductDto } from './create-product.dto';

const valid = (overrides: Record<string, unknown> = {}) => ({
  businessId: 'biz-1',
  name: 'قميص',
  category: 'قمصان',
  unit: 'قطعة',
  price: 5000,
  images: [],
  ...overrides,
});

const collect = (errors: ValidationError[]): string[] => {
  const out: string[] = [];
  for (const error of errors) {
    if (error.constraints) {
      out.push(...Object.values(error.constraints));
    }
    if (error.children && error.children.length > 0) {
      out.push(...collect(error.children));
    }
  }
  return out;
};

const run = async (input: Record<string, unknown>) => {
  const dto = plainToInstance(CreateProductDto, input);
  const errors = await validate(dto);
  return collect(errors);
};

describe('CreateProductDto', () => {
  it('accepts a valid product', async () => {
    const messages = await run(valid());
    expect(messages).toEqual([]);
  });

  it('rejects a negative price', async () => {
    const messages = await run(valid({ price: -1 }));
    expect(messages).toContain('price must not be less than 0');
  });

  it('rejects an invalid unit', async () => {
    const messages = await run(valid({ unit: 'كيلو' }));
    expect(messages.length).toBeGreaterThan(0);
  });

  it('rejects more than 8 images', async () => {
    const messages = await run(
      valid({ images: Array.from({ length: 9 }, (_, i) => `img-${i}`) }),
    );
    expect(messages.length).toBeGreaterThan(0);
  });

  it('rejects a malformed variants tree', async () => {
    const messages = await run(
      valid({
        variants: {
          axes: [{ key: 'color', label: 'لون' }],
          options: [{ name: 'أحمر' }],
        },
      }),
    );
    expect(messages.length).toBeGreaterThan(0);
  });

  it('rejects packaging with unitsPerPackage < 1', async () => {
    const messages = await run(valid({ packaging: { unitsPerPackage: 0 } }));
    expect(messages.length).toBeGreaterThan(0);
  });
});
