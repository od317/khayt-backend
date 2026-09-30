import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Location, Prisma, User, UserRole } from '@prisma/client';
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuthenticatedUser } from '../../common/types/auth';
import { AppConfig } from '../../config/configuration';
import { durationToSeconds } from '../../common/utils/duration';
import {
  OTP_MAX_ATTEMPTS,
  OTP_RATE_LIMIT_MAX,
  OTP_RATE_WINDOW_SECONDS,
  OTP_TTL_SECONDS,
  accessDenyKey,
  otpAttemptsKey,
  otpKey,
  otpLimitKey,
  refreshKey,
  refreshKeysPattern,
} from './auth.constants';
import {
  BusinessResponse,
  toBusinessResponse,
  toUserResponse,
  UserResponse,
} from './auth.mapper';
import { OnboardingDto } from './dto/onboarding.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { normalizePhone } from './phone';
import { SmsService } from './sms.service';
import { FcmService } from '../notifications/fcm.service';

const DEV_CODE = '000000';

type RefreshTokenPayload = {
  sub: string;
  tokenId: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
};

export type VerifyResponse = AuthTokens & {
  user: UserResponse;
};

export type MeResponse = {
  user: UserResponse;
  business: BusinessResponse | null;
  unreadNotifications: number;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  readonly refreshTtlSeconds: number;
  readonly refreshTtlMs: number;
  private readonly accessExpiresIn: number;
  private readonly refreshExpiresIn: number;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly fcm: FcmService,
  ) {
    this.accessExpiresIn = durationToSeconds(
      config.get('jwt.accessExpires', { infer: true }),
    );
    this.refreshExpiresIn = durationToSeconds(
      config.get('jwt.refreshExpires', { infer: true }),
    );
    this.refreshTtlSeconds = this.refreshExpiresIn;
    this.refreshTtlMs = this.refreshTtlSeconds * 1000;
  }

  async requestCode(rawPhone: string): Promise<{ sent: true }> {
    const phone = normalizePhone(rawPhone);
    const isDevelopment =
      this.config.get('nodeEnv', { infer: true }) === 'development';

    if (!isDevelopment) {
      const attempts = await this.redis.increment(otpLimitKey(phone));
      if (attempts === 1) {
        await this.redis.expire(otpLimitKey(phone), OTP_RATE_WINDOW_SECONDS);
      }
      if (attempts > OTP_RATE_LIMIT_MAX) {
        throw new HttpException(
          {
            error: 'too_many_requests',
            message: 'Too many code requests. Try again later.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const code = this.generateCode();
    if (isDevelopment) {
      this.logger.log(`[DEV] Using fixed OTP ${DEV_CODE} for ${phone}`);
    }

    await this.redis.set(otpKey(phone), code, OTP_TTL_SECONDS);
    await this.redis.del(otpAttemptsKey(phone));
    await this.sms.send(phone, `رمز التحقق الخاص بك هو ${code}`);

    return { sent: true };
  }

  async verify(
    rawPhone: string,
    code: string,
    fcmToken?: string,
  ): Promise<VerifyResponse> {
    const phone = normalizePhone(rawPhone);
    const stored = await this.redis.get(otpKey(phone));

    if (!stored) {
      throw new UnauthorizedException({
        error: 'code_expired',
        message: 'Verification code is missing or expired',
      });
    }

    if (!this.codesMatch(stored, code)) {
      const failedAttempts = await this.redis.increment(otpAttemptsKey(phone));
      if (failedAttempts === 1) {
        await this.redis.expire(otpAttemptsKey(phone), OTP_TTL_SECONDS);
      }
      if (failedAttempts >= OTP_MAX_ATTEMPTS) {
        await this.redis.del(otpKey(phone));
        await this.redis.del(otpAttemptsKey(phone));
        throw new HttpException(
          {
            error: 'too_many_attempts',
            message: 'Too many incorrect codes. Request a new one.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new UnauthorizedException({
        error: 'invalid_code',
        message: 'Invalid verification code',
      });
    }

    await this.redis.del(otpKey(phone));
    await this.redis.del(otpAttemptsKey(phone));

    const user = await this.findOrCreateUser(phone);
    if (user.suspended) {
      throw new ForbiddenException({
        error: 'account_suspended',
        message: 'This account has been suspended',
      });
    }

    const tokens = await this.issueTokens(user);
    if (fcmToken) {
      await this.fcm.registerToken(user.id, fcmToken);
    }
    return {
      ...tokens,
      user: toUserResponse(user),
    };
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; accessTokenExpiresAt: string }> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const exists = await this.redis.exists(
      refreshKey(payload.sub, payload.tokenId),
    );
    if (!exists) {
      throw new UnauthorizedException({
        error: 'invalid_token',
        message: 'Refresh token has been revoked',
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
      throw new ForbiddenException({
        error: 'account_suspended',
        message: 'This account has been suspended',
      });
    }

    const accessToken = await this.signAccessToken(user);
    return {
      accessToken,
      accessTokenExpiresAt: this.accessTokenExpiresAt(accessToken),
    };
  }

  async logout(userId: string, accessToken: string): Promise<{ success: true }> {
    await this.redis.deleteByPattern(refreshKeysPattern(userId));

    const payload = this.jwt.decode(accessToken);
    const now = Math.floor(Date.now() / 1000);
    const exp =
      payload && typeof payload === 'object' && typeof payload.exp === 'number'
        ? payload.exp
        : now + this.accessExpiresIn;
    const ttlSeconds = Math.max(1, exp - now);
    const tokenHash = createHash('sha256').update(accessToken).digest('hex');
    await this.redis.set(accessDenyKey(tokenHash), '1', ttlSeconds);

    return { success: true };
  }

  async deleteAccount(
    userId: string,
    accessToken: string,
  ): Promise<{ success: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'User not found',
      });
    }

    const appRole = await this.prisma.role.findFirst({
      where: { value: user.role, selectable: true },
    });
    if (!appRole) {
      throw new ForbiddenException({
        error: 'cannot_delete_account',
        message: 'Staff accounts cannot be deleted from the app',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.deviceToken.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.like.deleteMany({ where: { userId } });
      await tx.savedPost.deleteMany({ where: { userId } });
      await tx.savedBusiness.deleteMany({ where: { userId } });
      await tx.savedMarketer.deleteMany({ where: { userId } });
      await tx.post.updateMany({
        where: { authorId: userId, deletedAt: null },
        data: { deletedAt: new Date(), active: false },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          name: 'حساب محذوف',
          phone: null,
          email: null,
          passwordHash: null,
          bio: null,
          avatarUrl: null,
          suspended: true,
          availableForWork: false,
        },
      });
    });

    await this.logout(userId, accessToken);
    return { success: true };
  }

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { location: true },
    });
    if (!user) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'User not found',
      });
    }

    const [business, unreadNotifications] = await Promise.all([
      this.prisma.business.findUnique({
        where: { ownerId: userId },
      }),
      this.prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return {
      user: toUserResponse(user),
      business: business ? toBusinessResponse(business) : null,
      unreadNotifications,
    };
  }

  async updateMe(
    actor: AuthenticatedUser,
    dto: UpdateMeDto,
  ): Promise<{ user: UserResponse }> {
    if (
      dto.availableForWork !== undefined &&
      actor.role !== UserRole.employee
    ) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'availableForWork is only allowed for employees',
          fields: {
            availableForWork: 'only allowed if role is employee',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.bio !== undefined) {
      data.bio = dto.bio;
    }
    if (dto.avatarUrl !== undefined) {
      data.avatarUrl = dto.avatarUrl;
    }
    if (dto.availableForWork !== undefined) {
      data.availableForWork = dto.availableForWork;
    }

    if (dto.locationId !== undefined) {
      const location = await this.prisma.location.findFirst({
        where: { id: dto.locationId, active: true },
        select: { id: true },
      });

      if (!location) {
        throw new HttpException(
          {
            error: 'validation_failed',
            message: 'Location does not exist or is inactive',
            fields: { locationId: 'must reference an active location' },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      data.location = { connect: { id: dto.locationId } };
    }

    const user = await this.prisma.user.update({
      where: { id: actor.id },
      data,
      include: { location: true },
    });

    return { user: toUserResponse(user) };
  }

  async onboarding(
    actor: AuthenticatedUser,
    dto: OnboardingDto,
  ): Promise<{ user: UserResponse }> {
    const existing = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { onboardingCompleted: true },
    });

    if (!existing) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'User not found',
      });
    }

    if (existing.onboardingCompleted) {
      throw new ConflictException({
        error: 'already_onboarded',
        message: 'Onboarding has already been completed',
      });
    }

    const location = await this.prisma.location.findFirst({
      where: { id: dto.locationId, active: true },
      select: { id: true },
    });

    if (!location) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Location does not exist or is inactive',
          fields: { locationId: 'must reference an active location' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const role = await this.prisma.role.findFirst({
      where: { value: dto.role, selectable: true },
      select: { value: true },
    });

    if (!role) {
      throw new HttpException(
        {
          error: 'validation_failed',
          message: 'Role is not available for onboarding',
          fields: { role: 'must be a selectable role' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.prisma.user.update({
      where: { id: actor.id },
      data: {
        role: role.value,
        location: { connect: { id: dto.locationId } },
        onboardingCompleted: true,
      },
      include: { location: true },
    });

    return { user: toUserResponse(user) };
  }

  private generateCode(): string {
    // TEMPORARY: fixed OTP in every environment so the app is testable
    // before an SMS provider is wired.
    // TODO: restore the environment check before public launch.
    //   return this.config.get('nodeEnv', { infer: true }) === 'development'
    //     ? DEV_CODE
    //     : String(randomInt(100000, 1000000));
    return DEV_CODE;
  }

  private async findOrCreateUser(
    phone: string,
  ): Promise<User & { location: Location | null }> {
    const existing = await this.prisma.user.findUnique({
      where: { phone },
      include: { location: true },
    });
    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.user.create({
        data: {
          phone,
          name: phone,
          role: UserRole.employee,
        },
        include: { location: true },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await this.prisma.user.findUnique({
          where: { phone },
          include: { location: true },
        });
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const tokenId = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.jwt.signAsync(
        { sub: user.id, tokenId },
        { expiresIn: this.refreshExpiresIn },
      ),
    ]);

    await this.redis.set(
      refreshKey(user.id, tokenId),
      '1',
      this.refreshTtlSeconds,
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: this.accessTokenExpiresAt(accessToken),
    };
  }

  private signAccessToken(user: Pick<User, 'id' | 'role'>): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { expiresIn: this.accessExpiresIn },
    );
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

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<RefreshTokenPayload> {
    try {
      const payload =
        await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken);
      if (!payload.sub || !payload.tokenId) {
        throw new UnauthorizedException({
          error: 'invalid_token',
          message: 'Invalid refresh token',
        });
      }
      return payload;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException({
        error: 'invalid_token',
        message: 'Invalid or expired refresh token',
      });
    }
  }

  private codesMatch(stored: string, provided: string): boolean {
    const storedBuffer = Buffer.from(stored);
    const providedBuffer = Buffer.from(provided);
    if (storedBuffer.length !== providedBuffer.length) {
      return false;
    }
    return timingSafeEqual(storedBuffer, providedBuffer);
  }
}
