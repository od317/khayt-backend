import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { AppConfig } from '../../config/configuration';
import {
  OTP_RATE_WINDOW_SECONDS,
  OTP_TTL_SECONDS,
  otpAttemptsKey,
  otpKey,
  otpLimitKey,
} from './auth.constants';
import { AuthService } from './auth.service';
import { SmsService } from './sms.service';

const PHONE = '0955123456';

const actor: AuthenticatedUser = {
  id: 'user-1',
  role: UserRole.employee,
  phone: PHONE,
};

const makeUser = (
  overrides: Partial<User & { location: null }> = {},
): User & { location: null } => ({
  id: 'user-1',
  role: UserRole.employee,
  name: PHONE,
  phone: PHONE,
  bio: null,
  avatarUrl: null,
  availableForWork: true,
  verified: false,
  suspended: false,
  onboardingCompleted: false,
  locationId: null,
  location: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

type RedisMock = {
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
  increment: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
};

describe('AuthService', () => {
  let redis: RedisMock;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    business: { findUnique: ReturnType<typeof vi.fn> };
    notification: { count: ReturnType<typeof vi.fn> };
    location: { findFirst: ReturnType<typeof vi.fn> };
    role: { findFirst: ReturnType<typeof vi.fn> };
  };
  let sms: { send: ReturnType<typeof vi.fn> };
  let jwt: {
    signAsync: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  let service: AuthService;

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
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      business: { findUnique: vi.fn() },
      notification: { count: vi.fn() },
      location: { findFirst: vi.fn() },
      role: { findFirst: vi.fn() },
    };

    sms = { send: vi.fn().mockResolvedValue(undefined) };

    jwt = {
      signAsync: vi
        .fn()
        .mockImplementation(async (payload: { tokenId?: string }) => {
          return payload.tokenId ? 'refresh-token' : 'access-token';
        }),
      verifyAsync: vi.fn(),
    };

    const config = {
      get: vi.fn((key: string) => {
        if (key === 'jwt.accessExpires') {
          return '15m';
        }
        if (key === 'jwt.refreshExpires') {
          return '30d';
        }
        if (key === 'nodeEnv') {
          return 'test';
        }
        return undefined;
      }),
    };

    service = new AuthService(
      redis as unknown as RedisService,
      prisma as unknown as PrismaService,
      sms as unknown as SmsService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService<AppConfig, true>,
    );
  });

  it('generates a 6-digit code', async () => {
    await service.requestCode(PHONE);

    const stored = redis.set.mock.calls.find(
      (call) => call[0] === otpKey(PHONE),
    );
    expect(stored).toBeDefined();
    expect(stored?.[1]).toMatch(/^\d{6}$/);
  });

  it('stores the code in Redis with a TTL', async () => {
    await service.requestCode(PHONE);

    expect(redis.set).toHaveBeenCalledWith(
      otpKey(PHONE),
      expect.stringMatching(/^\d{6}$/),
      OTP_TTL_SECONDS,
    );
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(sms.send.mock.calls[0]?.[0]).toBe(PHONE);
    expect(sms.send.mock.calls[0]?.[1]).toMatch(/رمز التحقق الخاص بك هو \d{6}/);
  });

  it('rejects an expired code', async () => {
    redis.get.mockResolvedValue(null);

    const error = await service
      .verify(PHONE, '123456')
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      error: 'code_expired',
    });
  });

  it('rejects a wrong code', async () => {
    redis.get.mockResolvedValue('123456');
    redis.increment.mockResolvedValue(1);

    const error = await service
      .verify(PHONE, '000000')
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      error: 'invalid_code',
    });
    expect(redis.increment).toHaveBeenCalledWith(otpAttemptsKey(PHONE));
  });

  it('rate limits after 3 requests', async () => {
    redis.increment
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);

    await service.requestCode(PHONE);
    await service.requestCode(PHONE);
    await service.requestCode(PHONE);

    const error = await service.requestCode(PHONE).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect((error as HttpException).getResponse()).toMatchObject({
      error: 'too_many_requests',
    });
    expect(sms.send).toHaveBeenCalledTimes(3);
    expect(redis.expire).toHaveBeenCalledWith(
      otpLimitKey(PHONE),
      OTP_RATE_WINDOW_SECONDS,
    );
  });

  it('does not rate limit code requests in development', async () => {
    const config = {
      get: vi.fn((key: string) => {
        if (key === 'jwt.accessExpires') {
          return '15m';
        }
        if (key === 'jwt.refreshExpires') {
          return '30d';
        }
        if (key === 'nodeEnv') {
          return 'development';
        }
        return undefined;
      }),
    };

    const devService = new AuthService(
      redis as unknown as RedisService,
      prisma as unknown as PrismaService,
      sms as unknown as SmsService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService<AppConfig, true>,
    );

    await devService.requestCode(PHONE);
    await devService.requestCode(PHONE);
    await devService.requestCode(PHONE);
    await devService.requestCode(PHONE);

    expect(sms.send).toHaveBeenCalledTimes(4);
    expect(redis.increment).not.toHaveBeenCalled();
  });

  it('creates a user on first verify', async () => {
    redis.get.mockResolvedValue('123456');
    prisma.user.findUnique.mockResolvedValue(null);
    const created = makeUser();
    prisma.user.create.mockResolvedValue(created);

    const result = await service.verify(PHONE, '123456');

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        phone: PHONE,
        name: PHONE,
        role: UserRole.employee,
      },
      include: { location: true },
    });
    expect(result.user.id).toBe(created.id);
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('returns the existing user on second verify', async () => {
    const existing = makeUser({ id: 'existing-user', name: 'أحمد' });
    redis.get.mockResolvedValue('123456');
    prisma.user.findUnique.mockResolvedValue(existing);

    const result = await service.verify(PHONE, '123456');

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(result.user.id).toBe('existing-user');
    expect(result.user.name).toBe('أحمد');
  });

  it('rejects a suspended user', async () => {
    redis.get.mockResolvedValue('123456');
    prisma.user.findUnique.mockResolvedValue(makeUser({ suspended: true }));

    const error = await service
      .verify(PHONE, '123456')
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      error: 'account_suspended',
    });
  });

  describe('onboarding', () => {
    const LOCATION_ID = 'loc-damascus';

    it('sets role, locationId, and the flag', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        onboardingCompleted: false,
      });
      prisma.location.findFirst.mockResolvedValue({ id: LOCATION_ID });
      prisma.role.findFirst.mockResolvedValue({ value: UserRole.store });
      const updated = makeUser({
        role: UserRole.store,
        locationId: LOCATION_ID,
        onboardingCompleted: true,
      });
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.onboarding(actor, {
        role: UserRole.store,
        locationId: LOCATION_ID,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: actor.id },
        data: {
          role: UserRole.store,
          location: { connect: { id: LOCATION_ID } },
          onboardingCompleted: true,
        },
        include: { location: true },
      });
      expect(result.user.onboardingCompleted).toBe(true);
      expect(result.user.role).toBe(UserRole.store);
    });

    it('rejects an unknown locationId', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        onboardingCompleted: false,
      });
      prisma.location.findFirst.mockResolvedValue(null);

      const error = await service
        .onboarding(actor, {
          role: UserRole.employee,
          locationId: 'does-not-exist',
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects an inactive locationId', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        onboardingCompleted: false,
      });
      prisma.location.findFirst.mockResolvedValue(null);

      const error = await service
        .onboarding(actor, {
          role: UserRole.employee,
          locationId: 'loc-inactive',
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('returns 409 when already onboarded', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        onboardingCompleted: true,
      });

      const error = await service
        .onboarding(actor, {
          role: UserRole.store,
          locationId: LOCATION_ID,
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        error: 'already_onboarded',
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
