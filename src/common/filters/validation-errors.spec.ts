import { describe, expect, it } from 'vitest';
import { ValidationError } from 'class-validator';
import { flattenValidationErrors } from './validation-errors';

describe('flattenValidationErrors', () => {
  it('maps known constraints to Arabic', () => {
    const errors: ValidationError[] = [
      {
        property: 'body',
        constraints: { isNotEmpty: 'body should not be empty' },
        children: [],
      },
      {
        property: 'type',
        constraints: { isEnum: 'type must be a valid enum value' },
        children: [],
      },
      {
        property: 'extra',
        constraints: { whitelistValidation: 'property extra should not exist' },
        children: [],
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual({
      body: 'مطلوب',
      type: 'قيمة غير صالحة',
      extra: 'حقل غير مسموح',
    });
  });

  it('keeps custom Arabic DTO messages', () => {
    const errors: ValidationError[] = [
      {
        property: 'code',
        constraints: { matches: 'يجب أن يكون رمزاً من 6 أرقام' },
        children: [],
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual({
      code: 'يجب أن يكون رمزاً من 6 أرقام',
    });
  });
});
