export const OTP_TTL_SECONDS = 300;
export const OTP_RATE_LIMIT_MAX = 3;
export const OTP_RATE_WINDOW_SECONDS = 15 * 60;
export const OTP_MAX_ATTEMPTS = 5;

/** PATCH /auth/me/available-for-work — 3 toggles per 5 minutes */
export const AVAILABILITY_RATE_LIMIT_MAX = 3;
export const AVAILABILITY_RATE_WINDOW_SECONDS = 5 * 60;

export const otpKey = (phone: string): string => `otp:${phone}`;
export const otpLimitKey = (phone: string): string => `otp:limit:${phone}`;
export const otpAttemptsKey = (phone: string): string =>
  `otp:attempts:${phone}`;
export const availabilityLimitKey = (userId: string): string =>
  `availability:limit:${userId}`;
export const refreshKey = (userId: string, tokenId: string): string =>
  `refresh:${userId}:${tokenId}`;

export const refreshKeysPattern = (userId: string): string =>
  `refresh:${userId}:*`;

export const accessDenyKey = (tokenHash: string): string =>
  `access:deny:${tokenHash}`;
