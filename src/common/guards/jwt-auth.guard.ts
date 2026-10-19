import {
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../types/auth';

const isSwaggerRequest = (req: Request): boolean => {
  const path = (req.originalUrl ?? req.url).split('?')[0];
  return (
    path === '/api/docs' ||
    path.startsWith('/api/docs/') ||
    path === '/api/docs-json' ||
    path === '/api/docs-yaml'
  );
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (isSwaggerRequest(request)) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const authHeader = request.headers.authorization;
    const hasToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ');

    // Public + no token → skip auth entirely, allow anonymously.
    if (isPublic && !hasToken) {
      return true;
    }

    // From here: either the route requires auth, or the client sent a
    // token on a public route and we want to try to authenticate them.

    try {
      // super.canActivate() runs passport-jwt. It either sets req.user
      // and returns true, or throws (which we catch below).
      const result = await (super.canActivate(context) as Promise<boolean>);
      return result;
    } catch (error) {
      // On public routes, an invalid token must NOT block the request.
      // Just leave req.user undefined and let the request through.
      if (isPublic) {
        return true;
      }
      throw error;
    }
  }

  override handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // On public routes, we never want handleRequest to throw — return
    // whatever we got (which may be `false`) and let the request proceed.
    if (isPublic) {
      return (user || undefined) as TUser;
    }

    if (err instanceof HttpException) {
      throw err;
    }

    if (err || !user) {
      const message =
        err instanceof Error
          ? err.message
          : info instanceof Error
            ? info.message
            : 'الرمز غير صالح أو منتهٍ';

      throw new UnauthorizedException({
        error: 'unauthorized',
        message,
      });
    }

    return user;
  }
}