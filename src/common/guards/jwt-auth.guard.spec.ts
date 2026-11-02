import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard on public routes', () => {
  const context = {
    getHandler: vi.fn(),
    getClass: vi.fn(),
  } as unknown as ExecutionContext;
  const createGuard = (isPublic = true) =>
    new JwtAuthGuard({
      getAllAndOverride: vi.fn().mockReturnValue(isPublic),
    } as unknown as Reflector);

  it('allows a revoked session to access public routes anonymously', () => {
    const guard = createGuard();
    const error = new UnauthorizedException({
      error: 'session_revoked',
      message: 'Session revoked',
    });

    expect(
      guard.handleRequest(error, false, undefined, context),
    ).toBeUndefined();
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

  it('still rejects revoked sessions on protected routes', () => {
    const guard = createGuard(false);
    const error = new UnauthorizedException({
      error: 'session_revoked',
      message: 'Session revoked',
    });

    expect(() =>
      guard.handleRequest(error, false, undefined, context),
    ).toThrow(error);
  });
});
