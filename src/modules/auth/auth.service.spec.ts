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
  AVAILABILITY_RATE_LIMIT_MAX,
  AVAILABILITY_RATE_WINDOW_SECONDS,
  OTP_RATE_WINDOW_SECONDS,
  OTP_TTL_SECONDS,
  availabilityLimitKey,
  otpAttemptsKey,
  otpKey,
  otpLimitKey,
} from './auth.constants';
import { AuthService } from './auth.service';
import { SmsService } from './sms.service';

const PHONE = '+963955123456';

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
  email: null,
  passwordHash: null,
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
  deleteByPattern: ReturnType<typeof vi.fn>;
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
    business: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    notification: {
      count: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    location: { findFirst: ReturnType<typeof vi.fn> };
    role: { findFirst: ReturnType<typeof vi.fn> };
    deviceToken: { deleteMany: ReturnType<typeof vi.fn> };
    like: { deleteMany: ReturnType<typeof vi.fn> };
    savedPost: { deleteMany: ReturnType<typeof vi.fn> };
    savedBusiness: { deleteMany: ReturnType<typeof vi.fn> };
    savedMarketer: { deleteMany: ReturnType<typeof vi.fn> };
    post: { updateMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let sms: { send: ReturnType<typeof vi.fn> };
  let jwt: {
    signAsync: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
    decode: ReturnType<typeof vi.fn>;
  };
  let fcm: { registerToken: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    redis = {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      del: vi.fn().mockResolvedValue(undefined),
      deleteByPattern: vi.fn().mockResolvedValue(undefined),
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
      business: {
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      notification: { count: vi.fn(), deleteMany: vi.fn() },
      location: { findFirst: vi.fn() },
      role: { findFirst: vi.fn() },
      deviceToken: { deleteMany: vi.fn() },
      like: { deleteMany: vi.fn() },
      savedPost: { deleteMany: vi.fn() },
      savedBusiness: { deleteMany: vi.fn() },
      savedMarketer: { deleteMany: vi.fn() },
      post: { updateMany: vi.fn() },
      $transaction: vi.fn(),
    };

    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)(prisma);
      }
      return undefined;
    });

    sms = { send: vi.fn().mockResolvedValue(undefined) };

    jwt = {
      signAsync: vi
        .fn()
        .mockImplementation(async (payload: { tokenId?: string }) => {
          return payload.tokenId ? 'refresh-token' : 'access-token';
        }),
      verifyAsync: vi.fn(),
      decode: vi.fn().mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 900,
      }),
    };

    fcm = { registerToken: vi.fn().mockResolvedValue(undefined) };

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
      { registerToken: fcm.registerToken } as never,
    );
  });

  const NAME = 'أحمد';

  const mockOtp = (code = '123456') => {
    redis.get.mockImplementation(async (key: string) => {
      if (key === otpKey(PHONE)) return code;
      return null;
    });
  };

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
    mockOtp();
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
      { registerToken: fcm.registerToken } as never,
    );

    await devService.requestCode(PHONE);
    await devService.requestCode(PHONE);
    await devService.requestCode(PHONE);
    await devService.requestCode(PHONE);

    expect(sms.send).toHaveBeenCalledTimes(4);
    expect(redis.increment).not.toHaveBeenCalled();
  });

  it('creates a user on first verify without a name', async () => {
    mockOtp();
    prisma.user.findUnique.mockResolvedValue(null);
    const created = makeUser({ name: null });
    prisma.user.create.mockResolvedValue(created);

    const result = await service.verify(PHONE, '123456');

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        phone: PHONE,
        role: UserRole.employee,
      },
      include: { location: true },
    });
    expect(result.user.id).toBe(created.id);
    expect(result.user.name).toBeNull();
    expect(result.user.canOrder).toBe(false);
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.accessTokenExpiresAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('returns canOrder true on verify for an onboarded store', async () => {
    const existing = makeUser({
      id: 'store-1',
      name: NAME,
      role: UserRole.store,
      onboardingCompleted: true,
    });
    mockOtp();
    prisma.user.findUnique.mockResolvedValue(existing);

    const result = await service.verify(PHONE, '123456');

    expect(result.user.canOrder).toBe(true);
  });

  it('returns the existing user on second verify', async () => {
    const existing = makeUser({ id: 'existing-user', name: NAME });
    mockOtp();
    prisma.user.findUnique.mockResolvedValue(existing);

    const result = await service.verify(PHONE, '123456');

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(result.user.id).toBe('existing-user');
    expect(result.user.name).toBe(NAME);
  });

  it('stores an FCM token when verify includes fcmToken', async () => {
    const existing = makeUser({
      name: NAME,
      onboardingCompleted: true,
    });
    mockOtp();
    prisma.user.findUnique.mockResolvedValue(existing);

    await service.verify(PHONE, '123456', 'sample-fcm-token');

    expect(fcm.registerToken).toHaveBeenCalledWith(
      existing.id,
      'sample-fcm-token',
    );
  });

  it('rejects a suspended user', async () => {
    mockOtp();
    prisma.user.findUnique.mockResolvedValue(
      makeUser({
        name: NAME,
        onboardingCompleted: true,
        suspended: true,
      }),
    );

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

    it('sets role, locationId, and the flag for employee', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        onboardingCompleted: false,
      });
      prisma.location.findFirst.mockResolvedValue({
        id: LOCATION_ID,
        name: 'دمشق',
      });
      prisma.role.findFirst.mockResolvedValue({ value: UserRole.employee });
      const updated = makeUser({
        role: UserRole.employee,
        locationId: LOCATION_ID,
        onboardingCompleted: true,
      });
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.onboarding(actor, {
        role: UserRole.employee,
        locationId: LOCATION_ID,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: actor.id },
        data: {
          role: UserRole.employee,
          location: { connect: { id: LOCATION_ID } },
          onboardingCompleted: true,
        },
        include: { location: true },
      });
      expect(result.user.onboardingCompleted).toBe(true);
      expect(result.user.role).toBe(UserRole.employee);
      expect(result.user.canOrder).toBe(false);
      expect(result.business).toBeNull();
      expect(prisma.business.create).not.toHaveBeenCalled();
    });

    it('sets canOrder true after store/workshop onboarding', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        onboardingCompleted: false,
      });
      prisma.location.findFirst.mockResolvedValue({
        id: LOCATION_ID,
        name: 'دمشق',
      });
      prisma.role.findFirst.mockResolvedValue({ value: UserRole.store });
      const updated = makeUser({
        role: UserRole.store,
        locationId: LOCATION_ID,
        onboardingCompleted: true,
      });
      prisma.user.update.mockResolvedValue(updated);
      prisma.business.create.mockResolvedValue({
        id: 'biz-1',
        ownerId: actor.id,
        type: 'store',
        name: 'متجر',
        location: 'دمشق',
        description: null,
        phone: null,
        imageUrl: null,
        verified: false,
        capacity: null,
        equipment: null,
        minOrder: null,
        experience: null,
        services: [],
        duration: null,
        topics: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        categories: [],
      });

      const result = await service.onboarding(
        actor,
        {
          role: UserRole.store,
          locationId: LOCATION_ID,
          businessName: 'متجر',
          description: 'وصف',
          services: ['بيع'],
          experienceYears: 1,
        },
        { filename: 'store.jpg' } as Express.Multer.File,
      );

      expect(result.user.canOrder).toBe(true);
      expect(result.user.role).toBe(UserRole.store);
    });

    it('creates a business profile for store/workshop', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        onboardingCompleted: false,
      });
      prisma.location.findFirst.mockResolvedValue({
        id: LOCATION_ID,
        name: 'دمشق',
      });
      prisma.role.findFirst.mockResolvedValue({ value: UserRole.workshop });
      const updated = makeUser({
        role: UserRole.workshop,
        locationId: LOCATION_ID,
        onboardingCompleted: true,
      });
      prisma.user.update.mockResolvedValue(updated);
      prisma.business.create.mockResolvedValue({
        id: 'biz-1',
        ownerId: actor.id,
        type: 'workshop',
        name: 'معمل النسيج',
        location: 'دمشق',
        description: 'وصف',
        phone: null,
        imageUrl: '/uploads/businesses/a.jpg',
        verified: false,
        capacity: null,
        equipment: null,
        minOrder: null,
        experience: '5',
        services: ['خياطة'],
        duration: null,
        topics: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.onboarding(
        actor,
        {
          role: UserRole.workshop,
          locationId: LOCATION_ID,
          businessName: 'معمل النسيج',
          description: 'وصف',
          services: ['خياطة'],
          experienceYears: 5,
        },
        { filename: 'a.jpg' } as Express.Multer.File,
      );

      expect(prisma.business.create).toHaveBeenCalled();
      expect(result.business?.name).toBe('معمل النسيج');
      expect(result.business?.services).toEqual(['خياطة']);
    });

    it('rejects store onboarding without business fields', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        onboardingCompleted: false,
      });
      prisma.location.findFirst.mockResolvedValue({
        id: LOCATION_ID,
        name: 'دمشق',
      });
      prisma.role.findFirst.mockResolvedValue({ value: UserRole.store });

      const error = await service
        .onboarding(actor, {
          role: UserRole.store,
          locationId: LOCATION_ID,
        })
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
        fields: expect.objectContaining({
          businessName: expect.any(String),
          image: expect.any(String),
        }),
      });
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

  describe('deleteAccount', () => {
    it('anonymizes the user, hides posts, and revokes tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.role.findFirst.mockResolvedValue({ value: UserRole.employee });

      const result = await service.deleteAccount(actor.id, 'access-token');

      expect(result.success).toBe(true);
      expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: actor.id },
      });
      expect(prisma.post.updateMany).toHaveBeenCalledWith({
        where: { authorId: actor.id, deletedAt: null },
        data: expect.objectContaining({ active: false }),
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: actor.id },
        data: expect.objectContaining({
          name: 'حساب محذوف',
          phone: null,
          suspended: true,
        }),
      });
      expect(redis.deleteByPattern).toHaveBeenCalled();
    });

    it('rejects staff accounts', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ role: UserRole.admin }),
      );
      prisma.role.findFirst.mockResolvedValue(null);

      const error = await service
        .deleteAccount(actor.id, 'access-token')
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        error: 'cannot_delete_account',
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('setAvailableForWork', () => {
    it('sets availableForWork for an employee', async () => {
      redis.increment.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue(
        makeUser({ availableForWork: false }),
      );

      const result = await service.setAvailableForWork(actor, false);

      expect(redis.increment).toHaveBeenCalledWith(
        availabilityLimitKey(actor.id),
      );
      expect(redis.expire).toHaveBeenCalledWith(
        availabilityLimitKey(actor.id),
        AVAILABILITY_RATE_WINDOW_SECONDS,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: actor.id },
        data: { availableForWork: false },
        include: { location: true },
      });
      expect(result.user.availableForWork).toBe(false);
    });

    it('rejects non employee-like roles', async () => {
      const storeActor: AuthenticatedUser = {
        ...actor,
        role: UserRole.store,
      };

      const error = await service
        .setAvailableForWork(storeActor, true)
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(redis.increment).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('allows marketer to set availability', async () => {
      redis.increment.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue(
        makeUser({ role: UserRole.marketer, availableForWork: true }),
      );

      const marketerActor: AuthenticatedUser = {
        ...actor,
        role: UserRole.marketer,
      };

      const result = await service.setAvailableForWork(marketerActor, true);

      expect(result.user.availableForWork).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it(`rate limits after ${AVAILABILITY_RATE_LIMIT_MAX} toggles in 5 minutes`, async () => {
      redis.increment.mockResolvedValue(AVAILABILITY_RATE_LIMIT_MAX + 1);

      const error = await service
        .setAvailableForWork(actor, true)
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'too_many_requests',
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('updateMe', () => {
    it('updates workshop business description and services', async () => {
      const workshopActor: AuthenticatedUser = {
        id: 'user-workshop',
        role: UserRole.workshop,
        phone: '+963994037669',
      };
      prisma.user.update.mockResolvedValue(
        makeUser({ id: workshopActor.id, role: UserRole.workshop }),
      );

      await service.updateMe(workshopActor, {
        name: 'معمل النسيج الدمشقي',
        bio: 'وصف قصير',
        availableForWork: true,
        avatarUrl: 'https://example.com/avatar.jpg',
        description: 'معمل متخصص',
        services: ['خياطة قمصان', 'تطريز آلي'],
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            availableForWork: expect.anything(),
          }),
        }),
      );
      expect(prisma.business.updateMany).toHaveBeenCalledWith({
        where: { ownerId: workshopActor.id },
        data: {
          name: 'معمل النسيج الدمشقي',
          description: 'معمل متخصص',
          services: ['خياطة قمصان', 'تطريز آلي'],
          imageUrl: 'https://example.com/avatar.jpg',
        },
      });
    });

    it('rejects description for non-business roles', async () => {
      const error = await service
        .updateMe(actor, { description: 'وصف' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        error: 'validation_failed',
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
