export function normalizePhone(phone: string): string {
  // Strip whitespace, hyphens, and invisible bidi/zero-width controls
  // that appear when pasting phone numbers from RTL text.
  return phone.replace(
    /[\s\-\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,
    '',
  );
}

export const SYRIAN_PHONE_PATTERN = /^09\d{8}$/;
