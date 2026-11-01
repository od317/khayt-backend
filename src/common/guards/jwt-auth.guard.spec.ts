import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard on public routes', () => {
  const context = {
    getHandler: vi.fn(),
    getClass: vi.fn(),
  } as unknown as ExecutionContext;
  const createGuard = () =>
    new JwtAuthGuard({
      getAllAndOverride: vi.fn().mockReturnValue(true),
    } as unknown as Reflector);

  it('rejects a revoked session instead of treating it as anonymous', () => {
    const guard = createGuard();
    const error = new UnauthorizedException({
      error: 'session_revoked',
      message: 'Session revoked',
    });

    expect(() => guard.handleRequest(error, false, undefined, context)).toThrow(
      error,
    );
  });

  it('still allows other invalid tokens to access public routes anonymously', () => {
    const guard = createGuard();
    const error = new UnauthorizedException({
      error: 'unauthorized',
      message: 'Invalid token',
    });

    expect(
      guard.handleRequest(error, false, undefined, context),
    ).toBeUndefined();
  });
});
