import {
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AppConfig } from '../../config/configuration';
import { ADMIN_CHALLENGE_PURPOSE, admin2faKey } from './admin-constants';
import { AdminAuthService } from './admin-auth.service';
import { EmailService } from './email.service';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn().mockResolvedValue('$2b$12$hashed'),
}));

const EMAIL = 'admin@example.com';

const makeUser = (
  overrides: Partial<User & { location: null }> = {},
): User & { location: null } => ({
  id: 'user-1',
  role: UserRole.admin,
  name: 'Admin',
  phone: null,
  email: EMAIL,
  passwordHash: '$2b$12$abcdefghijklmnopqrstuv',
  bio: null,
  avatarUrl: null,
  availableForWork: true,
  verified: true,
  suspended: false,
  onboardingCompleted: true,
  locationId: null,
  location: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('AdminAuthService', () => {
  let redis: {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    increment: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
  };
  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
  };
  let email: { send: ReturnType<typeof vi.fn> };
  let jwt: {
    signAsync: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  let service: AdminAuthService;

  beforeEach(() => {
    redis = {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      del: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(),
      increment: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(undefined),
    };

    prisma = {
      user: { findUnique: vi.fn() },
    };

    email = { send: vi.fn().mockResolvedValue(undefined) };

    jwt = {
      signAsync: vi
        .fn()
        .mockImplementation(
          async (payload: { tokenId?: string; purpose?: string }) => {
            if (payload.purpose === ADMIN_CHALLENGE_PURPOSE)
              return 'challenge-token';
            return payload.tokenId ? 'refresh-token' : 'access-token';
          },
        ),
      verifyAsync: vi.fn(),
    };

    const config = {
      get: vi.fn((key: string) => {
        if (key === 'jwt.accessExpires') return '15m';
        if (key === 'jwt.refreshExpires') return '30d';
        if (key === 'nodeEnv') return 'test';
        return undefined;
      }),
    };

    service = new AdminAuthService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      jwt as unknown as JwtService,
      email as unknown as EmailService,
      config as unknown as ConfigService<AppConfig, true>,
    );
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const error = await service
        .login(EMAIL, 'password')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        error: 'invalid_credentials',
      });
    });

    it('rejects a user with no passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ passwordHash: null }),
      );

      const error = await service
        .login(EMAIL, 'password')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const error = await service
        .login(EMAIL, 'wrong')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
    });
    it('rejects a suspended user', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ suspended: true }));

      const error = await service
        .login(EMAIL, 'password')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
    });

    it('rejects a role that cannot use email login', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ role: UserRole.delivery }),
      );

      const error = await service
        .login(EMAIL, 'password')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        error: 'forbidden',
      });
    });

    it('returns a challenge for an admin', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.login(EMAIL, 'password');

      expect(result).toMatchObject({
        requiresTwoFactor: true,
        challengeToken: 'challenge-token',
      });
      expect(redis.set).toHaveBeenCalledWith(
        admin2faKey('user-1'),
        expect.stringMatching(/^\d{6}$/),
        300,
      );
      expect(email.send).toHaveBeenCalledTimes(1);
      expect(email.send.mock.calls[0]?.[0]).toMatchObject({ to: EMAIL });
    });

    it('returns a challenge for inventory too (2FA applies to all dashboard users)', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ role: UserRole.inventory }),
      );
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.login(EMAIL, 'password');

      expect(result).toMatchObject({
        requiresTwoFactor: true,
        challengeToken: 'challenge-token',
      });
      expect(email.send).toHaveBeenCalledTimes(1);
      expect(email.send.mock.calls[0]?.[0]).toMatchObject({ to: EMAIL });
    });
  });

  describe('verify2fa', () => {
    it('rejects an invalid challenge token', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('bad token'));

      const error = await service
        .verify2fa('bad', '123456')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        error: 'invalid_challenge',
      });
    });

    it('rejects an expired code', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        purpose: ADMIN_CHALLENGE_PURPOSE,
      });
      redis.get.mockResolvedValue(null);

      const error = await service
        .verify2fa('token', '123456')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        error: 'code_expired',
      });
    });

    it('rejects a wrong code', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        purpose: ADMIN_CHALLENGE_PURPOSE,
      });
      redis.get.mockResolvedValue('123456');
      redis.increment.mockResolvedValue(1);

      const error = await service
        .verify2fa('token', '000000')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        error: 'invalid_code',
      });
    });

    it('returns tokens on a correct code', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        purpose: ADMIN_CHALLENGE_PURPOSE,
      });
      redis.get.mockResolvedValue('123456');
      prisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.verify2fa('token', '123456');

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.id).toBe('user-1');
    });
  });
});
