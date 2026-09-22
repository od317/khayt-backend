import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../types/auth';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
    info: unknown,
  ): TUser {
    if (err || !user) {
      const message =
        err instanceof Error
          ? err.message
          : info instanceof Error
            ? info.message
            : 'Invalid or expired token';

      throw new UnauthorizedException({
        error: 'unauthorized',
        message,
      });
    }

    return user;
  }
}
