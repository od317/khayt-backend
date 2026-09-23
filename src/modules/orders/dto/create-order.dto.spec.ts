import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateOrderDto } from './create-order.dto';

const collect = (errors: ValidationError[]): string[] => {
  const out: string[] = [];
  for (const error of errors) {
    if (error.constraints) out.push(...Object.values(error.constraints));
    if (error.children && error.children.length > 0) {
      out.push(...collect(error.children));
    }
  }
  return out;
};

const run = async (input: Record<string, unknown>) => {
  const dto = plainToInstance(CreateOrderDto, input);
  const errors = await validate(dto);
  return collect(errors);
};

describe('CreateOrderDto', () => {
  it('accepts a single line', async () => {
    expect(
      await run({ lines: [{ productId: 'prod-1', quantity: 2 }] }),
    ).toEqual([]);
  });

  it('rejects an empty lines array', async () => {
    expect((await run({ lines: [] })).length).toBeGreaterThan(0);
  });

  it('rejects a missing lines array', async () => {
    expect((await run({})).length).toBeGreaterThan(0);
  });

  it('rejects quantity 0', async () => {
    expect(
      (await run({ lines: [{ productId: 'prod-1', quantity: 0 }] })).length,
    ).toBeGreaterThan(0);
  });

  it('rejects negative quantity', async () => {
    expect(
      (await run({ lines: [{ productId: 'prod-1', quantity: -1 }] })).length,
    ).toBeGreaterThan(0);
  });

  it('rejects a non-integer quantity', async () => {
    expect(
      (await run({ lines: [{ productId: 'prod-1', quantity: 1.5 }] })).length,
    ).toBeGreaterThan(0);
  });

  it('rejects a missing productId', async () => {
    expect((await run({ lines: [{ quantity: 1 }] })).length).toBeGreaterThan(0);
  });
});
