import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FcmService } from './fcm.service';

describe('FcmService', () => {
  it('upserts a device token for the user', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const service = new FcmService(
      { get: vi.fn().mockReturnValue(null) } as never,
      { deviceToken: { upsert } } as unknown as PrismaService,
    );

    await service.registerToken('user-1', '  token-abc  ');

    expect(upsert).toHaveBeenCalledWith({
      where: { token: 'token-abc' },
      create: { userId: 'user-1', token: 'token-abc' },
      update: { userId: 'user-1' },
    });
  });

  it('skips sending when Firebase is not configured', async () => {
    const findMany = vi.fn();
    const service = new FcmService(
      { get: vi.fn().mockReturnValue(null) } as never,
      { deviceToken: { findMany } } as unknown as PrismaService,
    );

    await service.sendToUser('user-1', {
      title: 't',
      body: 'b',
      type: 'order_placed',
      linkTo: '/orders',
    });

    expect(findMany).not.toHaveBeenCalled();
  });
});
