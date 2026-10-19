import {
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OrderStatus, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { Public } from '../../common/decorators/public.decorator';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { RedisService } from '../../common/redis/redis.service';
import { AppConfig } from '../../config/configuration';
import { accessDenyKey } from '../auth/auth.constants';
import { OrderListItemResponse } from '../orders/orders.mapper';
import { OrdersService } from '../orders/orders.service';

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
    private readonly orders: OrdersService,
  ) {}

  @Post('orders/:id/advance')
  @Roles(
    UserRole.super_admin,
    UserRole.admin,
    UserRole.inventory,
    UserRole.delivery,
  )
  @HttpCode(HttpStatus.OK)
  advanceOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<{
    order: OrderListItemResponse;
    from: OrderStatus;
    to: OrderStatus;
  }> {
    this.logger.warn(`[DEBUG] force-advance order=${id} by=${user.id}`);
    return this.orders.forceAdvance(id, user);
  }

  @Public()
  @Post('expire-token')
  @HttpCode(HttpStatus.OK)
  async expireToken(
    @Req() req: Request,
  ): Promise<{ expired: true; accessToken: string }> {
    if (!this.isEnabled()) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'غير موجود',
      });
    }

    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'يلزم تسجيل الدخول',
      });
    }

    const token = header.slice('Bearer '.length);
    let payload: AuthenticatedPayload;
    try {
      payload = await this.jwt.verifyAsync<AuthenticatedPayload>(token);
    } catch {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'رمز الوصول غير صالح أو منتهٍ',
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
