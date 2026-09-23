import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RecordPaymentDto } from './record-payment.dto';

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
  const dto = plainToInstance(RecordPaymentDto, input);
  const errors = await validate(dto);
  return collect(errors);
};

describe('RecordPaymentDto', () => {
  it('accepts a positive integer', async () => {
    expect(await run({ amount: 1000 })).toEqual([]);
  });

  it('rejects a non-integer', async () => {
    expect((await run({ amount: 1.5 })).length).toBeGreaterThan(0);
  });

  it('rejects a missing amount', async () => {
    expect((await run({})).length).toBeGreaterThan(0);
  });
});
