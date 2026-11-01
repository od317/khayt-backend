import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AppConfig } from '../../config/configuration';
import { activeSessionKey } from './auth.constants';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy active session', () => {
  const createStrategy = (activeSession: string | null) => {
    const redis = {
      exists: vi.fn().mockResolvedValue(false),
      get: vi.fn().mockResolvedValue(activeSession),
    };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          role: UserRole.store,
          phone: '+963955123456',
          suspended: false,
        }),
      },
    };
    const config = {
      get: vi.fn().mockReturnValue('test-secret'),
    };
    const strategy = new JwtStrategy(
      config as unknown as ConfigService<AppConfig, true>,
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );

    return { strategy, redis };
  };

  const request = {
    headers: { authorization: 'Bearer access-token' },
  } as Express.Request;

  it('rejects an access token after another login replaces its session', async () => {
    const { strategy, redis } = createStrategy('new-session');

    await expect(
      strategy.validate(request, {
        sub: 'user-1',
        role: UserRole.store,
        tokenId: 'old-session',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(redis.get).toHaveBeenCalledWith(activeSessionKey('user-1'));
  });

  it('rejects access tokens issued before session tracking', async () => {
    const { strategy } = createStrategy(null);

    await expect(
      strategy.validate(request, {
        sub: 'user-1',
        role: UserRole.store,
        tokenId: '',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts an access token from the active session', async () => {
    const { strategy } = createStrategy('active-session');

    await expect(
      strategy.validate(request, {
        sub: 'user-1',
        role: UserRole.store,
        tokenId: 'active-session',
      }),
    ).resolves.toMatchObject({
      id: 'user-1',
      role: UserRole.store,
    });
  });
});
