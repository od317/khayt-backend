import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { Public } from '../../common/decorators/public.decorator';
import { RedisService } from '../../common/redis/redis.service';
import { AppConfig } from '../../config/configuration';
import { accessDenyKey } from '../auth/auth.constants';

type AuthenticatedPayload = {
  sub: string;
  role: string;
  exp?: number;
};

@Controller('debug')
export class DebugController {
  private readonly logger = new Logger(DebugController.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Post('expire-token')
  @HttpCode(HttpStatus.OK)
  async expireToken(
    @Req() req: Request,
  ): Promise<{ expired: true; accessToken: string }> {
    if (!this.isEnabled()) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Not found',
      });
    }

    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Authentication required',
      });
    }

    const token = header.slice('Bearer '.length);
    let payload: AuthenticatedPayload;
    try {
      payload = await this.jwt.verifyAsync<AuthenticatedPayload>(token);
    } catch {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Invalid or expired access token',
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = Math.max(1, (payload.exp ?? now + 60) - now);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.redis.set(accessDenyKey(tokenHash), '1', ttlSeconds);

    this.logger.warn(
      `[DEBUG] expire-token revoked access token user=${payload.sub} role=${payload.role}`,
    );

    return { expired: true, accessToken: token };
  }

  private isEnabled(): boolean {
    const nodeEnv = this.config.get('nodeEnv', { infer: true });
    if (nodeEnv === 'development' || nodeEnv === 'test') {
      return true;
    }
    return this.config.get('debugAllowInProduction', { infer: true }) === true;
  }
}
