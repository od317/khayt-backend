import { ValidationError } from 'class-validator';

/** Map class-validator constraint keys → Arabic field messages. */
const CONSTRAINT_AR: Record<string, string> = {
  isNotEmpty: 'مطلوب',
  isDefined: 'مطلوب',
  isString: 'يجب أن يكون نصاً',
  isNumber: 'يجب أن يكون رقماً',
  isInt: 'يجب أن يكون عدداً صحيحاً',
  isBoolean: 'يجب أن يكون منطقيًا (صحيح/خطأ)',
  isEnum: 'قيمة غير صالحة',
  isArray: 'يجب أن يكون مصفوفة',
  isEmail: 'بريد إلكتروني غير صالح',
  isUuid: 'معرّف غير صالح',
  isUrl: 'رابط غير صالح',
  isDate: 'تاريخ غير صالح',
  isPhoneNumber: 'رقم هاتف غير صالح',
  minLength: 'أقصر من الحد المسموح',
  maxLength: 'أطول من الحد المسموح',
  min: 'أقل من الحد المسموح',
  max: 'أكبر من الحد المسموح',
  arrayMinSize: 'عدد العناصر أقل من المطلوب',
  arrayMaxSize: 'عدد العناصر أكثر من المسموح',
  arrayUnique: 'العناصر يجب أن تكون فريدة',
  matches: 'تنسيق غير صالح',
  isIn: 'قيمة غير مسموحة',
  isNumberString: 'يجب أن يكون رقماً',
  isPositive: 'يجب أن يكون موجباً',
  isNegative: 'يجب أن يكون سالباً',
  isLatitude: 'خط عرض غير صالح',
  isLongitude: 'خط طول غير صالح',
  whitelistValidation: 'حقل غير مسموح',
  forbidNonWhitelisted: 'حقل غير مسموح',
  nestedValidation: 'بيانات غير صالحة',
};

function translateConstraint(
  constraintKey: string,
  englishMessage: string,
): string {
  // Custom DTO messages are authored in Arabic and pass through.
  if (/[\u0600-\u06FF]/.test(englishMessage)) {
    return englishMessage;
  }
  return CONSTRAINT_AR[constraintKey] ?? 'قيمة غير صالحة';
}

export function flattenValidationErrors(
  errors: ValidationError[],
): Record<string, string> {
  const fields: Record<string, string> = {};

  const walk = (errs: ValidationError[], parent?: string): void => {
    for (const error of errs) {
      const path = parent ? `${parent}.${error.property}` : error.property;

      if (error.constraints) {
        const [key] = Object.keys(error.constraints);
        const [first] = Object.values(error.constraints);
        if (key && first) {
          fields[path] = translateConstraint(key, first);
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
