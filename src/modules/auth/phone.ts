/**
 * Strip formatting noise from pasted / typed phone numbers.
 * Converts legacy Syrian mobiles `09xxxxxxxx` → E.164 `+9639xxxxxxxx`.
 * Converts leading `00` international prefix → `+`.
 */
export function normalizePhone(phone: string): string {
  let value = phone.replace(
    /[\s\-\(\)\.\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,
    '',
  );

  if (value.startsWith('00')) {
    value = `+${value.slice(2)}`;
  }

  // Legacy Syrian local mobile (still used by seed / older clients).
  if (/^09\d{8}$/.test(value)) {
    value = `+963${value.slice(1)}`;
  }

  return value;
}

/** E.164: + and 7–15 digits total (country code + subscriber). */
export const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;

/** @deprecated Use PHONE_PATTERN — kept for older imports. */
export const SYRIAN_PHONE_PATTERN = PHONE_PATTERN;

export const PHONE_VALIDATION_MESSAGE =
  'يجب أن يكون رقم هاتف دولي بصيغة E.164 (+رمز الدولة…)';
