import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../types/auth';

type RequestWithUser = {
  user?: AuthenticatedUser;
};

/**
 * Returns the authenticated user, or undefined when there is none.
 * Use on @Public() routes where a user may or may not be present.
 * For routes that require a user, use @RequireUser() instead.
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ):
    | AuthenticatedUser
    | AuthenticatedUser[keyof AuthenticatedUser]
    | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);

/**
 * Returns the authenticated user, or throws 401 when there is none.
 * Use on routes where JwtAuthGuard has already run.
 */
export const RequireUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'يلزم تسجيل الدخول',
      });
    }

    return data ? user[data] : user;
  },
);
