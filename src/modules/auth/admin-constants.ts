export const ADMIN_2FA_TTL_SECONDS = 300;
export const ADMIN_2FA_MAX_ATTEMPTS = 5;
export const ADMIN_CHALLENGE_TTL_SECONDS = 300;

export const admin2faKey = (userId: string): string => `admin:2fa:${userId}`;
export const admin2faAttemptsKey = (userId: string): string =>
  `admin:2fa:attempts:${userId}`;

export const ADMIN_CHALLENGE_PURPOSE = 'admin-2fa';
