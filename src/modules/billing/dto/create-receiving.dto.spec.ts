import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateReceivingDto } from './create-receiving.dto';

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
  const dto = plainToInstance(CreateReceivingDto, input);
  const errors = await validate(dto);
  return collect(errors);
};

describe('CreateReceivingDto', () => {
  const valid = {
    businessId: 'biz-1',
    paymentType: 'cash',
    lines: [{ productId: 'prod-1', quantity: 10, unitPrice: 5000 }],
  };

  it('accepts a valid body', async () => {
    expect(await run(valid)).toEqual([]);
  });

  it('rejects an empty lines array', async () => {
    expect((await run({ ...valid, lines: [] })).length).toBeGreaterThan(0);
  });

  it('rejects a missing businessId', async () => {
    const { businessId, ...rest } = valid;
    void businessId;
    expect((await run(rest)).length).toBeGreaterThan(0);
  });

  it('rejects an invalid paymentType', async () => {
    expect(
      (await run({ ...valid, paymentType: 'barter' })).length,
    ).toBeGreaterThan(0);
  });

  it('rejects quantity 0', async () => {
    expect(
      (
        await run({
          ...valid,
          lines: [{ productId: 'prod-1', quantity: 0, unitPrice: 5000 }],
        })
      ).length,
    ).toBeGreaterThan(0);
  });

  it('rejects a negative unitPrice', async () => {
    expect(
      (
        await run({
          ...valid,
          lines: [{ productId: 'prod-1', quantity: 10, unitPrice: -1 }],
        })
      ).length,
    ).toBeGreaterThan(0);
  });

  it('rejects a non-integer quantity', async () => {
    expect(
      (
        await run({
          ...valid,
          lines: [{ productId: 'prod-1', quantity: 1.5, unitPrice: 5000 }],
        })
      ).length,
    ).toBeGreaterThan(0);
  });
});
