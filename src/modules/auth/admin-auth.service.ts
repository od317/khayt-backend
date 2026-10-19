import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AppConfig } from '../../config/configuration';
import { durationToSeconds } from '../../common/utils/duration';
import { toUserResponse, UserResponse } from './auth.mapper';
import { refreshKey } from './auth.constants';
import {
  ADMIN_2FA_MAX_ATTEMPTS,
  ADMIN_2FA_TTL_SECONDS,
  ADMIN_CHALLENGE_PURPOSE,
  ADMIN_CHALLENGE_TTL_SECONDS,
  admin2faAttemptsKey,
  admin2faKey,
} from './admin-constants';
import { EmailService } from './email.service';

type ChallengePayload = {
  sub: string;
  purpose: string;
};

export type AdminLoginResponse = {
  requiresTwoFactor: true;
  challengeToken: string;
};

export type AdminVerify2faResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: UserResponse;
};

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  private readonly accessExpiresIn: number;
  private readonly refreshExpiresIn: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.accessExpiresIn = durationToSeconds(
      config.get('jwt.accessExpires', { infer: true }),
    );
    this.refreshExpiresIn = durationToSeconds(
      config.get('jwt.refreshExpires', { infer: true }),
    );
  }

  async login(email: string, password: string): Promise<AdminLoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { location: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({
        error: 'invalid_credentials',
        message: 'البريد أو كلمة المرور غير صحيحة',
      });
    }

    if (!this.isEmailAuthRole(user.role)) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'هذا الحساب لا يدعم الدخول بالبريد',
      });
    }

    if (user.suspended) {
      throw new ForbiddenException({
        error: 'account_suspended',
        message: 'تم إيقاف هذا الحساب',
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        error: 'invalid_credentials',
        message: 'البريد أو كلمة المرور غير صحيحة',
      });
    }

    const code = String(randomInt(100000, 1000000));
    await this.redis.set(admin2faKey(user.id), code, ADMIN_2FA_TTL_SECONDS);
    await this.redis.del(admin2faAttemptsKey(user.id));

    await this.email.send({
      to: user.email!,
      subject: 'رمز التحقق لتسجيل الدخول',
      text: `رمز التحقق الخاص بك هو ${code}`,
    });

    const challengeToken = await this.jwt.signAsync(
      { sub: user.id, purpose: ADMIN_CHALLENGE_PURPOSE },
      { expiresIn: ADMIN_CHALLENGE_TTL_SECONDS },
    );

    return { requiresTwoFactor: true, challengeToken };
  }

  async verify2fa(
    challengeToken: string,
    code: string,
  ): Promise<AdminVerify2faResponse> {
    let payload: ChallengePayload;
    try {
      payload = await this.jwt.verifyAsync<ChallengePayload>(challengeToken);
    } catch {
      throw new UnauthorizedException({
        error: 'invalid_challenge',
        message: 'رمز التحدي غير صالح أو منتهٍ',
      });
    }

    if (payload.purpose !== ADMIN_CHALLENGE_PURPOSE || !payload.sub) {
      throw new UnauthorizedException({
        error: 'invalid_challenge',
        message: 'رمز التحدي غير صالح أو منتهٍ',
      });
    }

    const stored = await this.redis.get(admin2faKey(payload.sub));
    if (!stored) {
      throw new UnauthorizedException({
        error: 'code_expired',
        message: 'رمز التحقق مفقود أو منتهٍ',
      });
    }

    if (!this.codesMatch(stored, code)) {
      const attempts = await this.redis.increment(
        admin2faAttemptsKey(payload.sub),
      );
      if (attempts === 1) {
        await this.redis.expire(
          admin2faAttemptsKey(payload.sub),
          ADMIN_2FA_TTL_SECONDS,
        );
      }
      if (attempts >= ADMIN_2FA_MAX_ATTEMPTS) {
        await this.redis.del(admin2faKey(payload.sub));
        await this.redis.del(admin2faAttemptsKey(payload.sub));
        throw new HttpException(
          {
            error: 'too_many_attempts',
            message: 'محاولات خاطئة كثيرة. سجّل الدخول مجدداً.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException({
        error: 'invalid_code',
        message: 'رمز التحقق غير صحيح',
      });
    }

    await this.redis.del(admin2faKey(payload.sub));
    await this.redis.del(admin2faAttemptsKey(payload.sub));

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { location: true },
    });
    if (!user) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'المستخدم غير موجود',
      });
    }
    if (user.suspended) {
      throw new ForbiddenException({
        error: 'account_suspended',
        message: 'تم إيقاف هذا الحساب',
      });
    }

    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: toUserResponse(user),
    };
  }

  private isEmailAuthRole(role: string): boolean {
    return (
      role === UserRole.admin ||
      role === UserRole.super_admin ||
      role === UserRole.inventory
    );
  }

  private async issueTokens(
    user: User,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
  }> {
    const tokenId = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: user.id, role: user.role },
        { expiresIn: this.accessExpiresIn },
      ),
      this.jwt.signAsync(
        { sub: user.id, tokenId },
        { expiresIn: this.refreshExpiresIn },
      ),
    ]);

    await this.redis.set(
      refreshKey(user.id, tokenId),
      '1',
      this.refreshExpiresIn,
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: this.accessTokenExpiresAt(accessToken),
    };
  }

  private accessTokenExpiresAt(accessToken: string): string {
    const payload = this.jwt.decode(accessToken);
    if (
      payload &&
      typeof payload === 'object' &&
      typeof payload.exp === 'number'
    ) {
      return new Date(payload.exp * 1000).toISOString();
    }
    return new Date(Date.now() + this.accessExpiresIn * 1000).toISOString();
  }

  private codesMatch(stored: string, provided: string): boolean {
    const a = Buffer.from(stored);
    const b = Buffer.from(provided);
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }
}
