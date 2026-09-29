import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { AppConfig } from '../../config/configuration';
import { accessDenyKey } from './auth.constants';

type AccessTokenPayload = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: config.get('jwt.secret', { infer: true }),
    });
  }

  async validate(
    req: Request,
    payload: AccessTokenPayload,
  ): Promise<AuthenticatedUser> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (token) {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      if (await this.redis.exists(accessDenyKey(tokenHash))) {
        throw new UnauthorizedException({
          error: 'unauthorized',
          message: 'Invalid or expired token',
        });
      }
    }

    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Invalid access token',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'User not found',
      });
    }

    if (user.suspended) {
      throw new UnauthorizedException({
        error: 'account_suspended',
        message: 'This account has been suspended',
      });
    }

    return {
      id: user.id,
      role: user.role,
      phone: user.phone,
    };
  }
}
