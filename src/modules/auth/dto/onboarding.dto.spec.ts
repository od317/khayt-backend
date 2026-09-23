import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { OnboardingDto } from './onboarding.dto';

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
  const dto = plainToInstance(OnboardingDto, input);
  const errors = await validate(dto);
  return collect(errors);
};

describe('OnboardingDto', () => {
  it('accepts employee', async () => {
    expect(await run({ role: 'employee', locationId: 'loc-damascus' })).toEqual(
      [],
    );
  });

  it('accepts workshop', async () => {
    expect(await run({ role: 'workshop', locationId: 'loc-damascus' })).toEqual(
      [],
    );
  });

  it('accepts institute', async () => {
    expect(
      await run({ role: 'institute', locationId: 'loc-damascus' }),
    ).toEqual([]);
  });

  it('accepts store', async () => {
    expect(await run({ role: 'store', locationId: 'loc-damascus' })).toEqual(
      [],
    );
  });

  it('rejects admin', async () => {
    expect(
      (await run({ role: 'admin', locationId: 'loc-damascus' })).length,
    ).toBeGreaterThan(0);
  });

  it('rejects super_admin', async () => {
    expect(
      (await run({ role: 'super_admin', locationId: 'loc-damascus' })).length,
    ).toBeGreaterThan(0);
  });

  it('rejects inventory', async () => {
    expect(
      (await run({ role: 'inventory', locationId: 'loc-damascus' })).length,
    ).toBeGreaterThan(0);
  });

  it('rejects delivery', async () => {
    expect(
      (await run({ role: 'delivery', locationId: 'loc-damascus' })).length,
    ).toBeGreaterThan(0);
  });

  it('rejects a missing role', async () => {
    expect((await run({ locationId: 'loc-damascus' })).length).toBeGreaterThan(
      0,
    );
  });

  it('rejects a missing locationId', async () => {
    expect((await run({ role: 'employee' })).length).toBeGreaterThan(0);
  });
});
