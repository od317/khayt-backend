import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessOwnerGuard } from './business-owner.guard';

const actor = {
  id: 'user-1',
  role: UserRole.workshop,
  phone: '0994037669',
};

const makeContext = (
  params: Record<string, string>,
  user: unknown,
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ params, user }),
    }),
  }) as unknown as ExecutionContext;

describe('BusinessOwnerGuard', () => {
  let prisma: { business: { findUnique: ReturnType<typeof vi.fn> } };
  let guard: BusinessOwnerGuard;

  beforeEach(() => {
    prisma = { business: { findUnique: vi.fn() } };
    guard = new BusinessOwnerGuard(prisma as unknown as PrismaService);
  });

  it('allows the owner', async () => {
    prisma.business.findUnique.mockResolvedValue({ ownerId: actor.id });

    const result = await guard.canActivate(makeContext({ id: 'biz-1' }, actor));

    expect(result).toBe(true);
    expect(prisma.business.findUnique).toHaveBeenCalledWith({
      where: { id: 'biz-1' },
      select: { ownerId: true },
    });
  });

  it('rejects a non-owner', async () => {
    prisma.business.findUnique.mockResolvedValue({ ownerId: 'someone-else' });

    const error = await guard
      .canActivate(makeContext({ id: 'biz-1' }, actor))
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      error: 'forbidden',
      message: 'Not the owner of this business',
    });
  });

  it('404s when the business does not exist', async () => {
    prisma.business.findUnique.mockResolvedValue(null);

    const error = await guard
      .canActivate(makeContext({ id: 'missing' }, actor))
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(NotFoundException);
  });
});
