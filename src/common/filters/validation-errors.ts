import { ValidationError } from 'class-validator';

export function flattenValidationErrors(
  errors: ValidationError[],
): Record<string, string> {
  const fields: Record<string, string> = {};

  const walk = (errs: ValidationError[], parent?: string): void => {
    for (const error of errs) {
      const path = parent ? `${parent}.${error.property}` : error.property;

      if (error.constraints) {
        const [first] = Object.values(error.constraints);
        if (first) {
          fields[path] = first;
        }
      }

      if (error.children && error.children.length > 0) {
        walk(error.children, path);
      }
    }
  };

  walk(errors);
  return fields;
}
