import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { AppConfig } from '../../config/configuration';
import type { UserResponse } from './auth.mapper';
import { AuthService } from './auth.service';
import { LogoutDto } from './dto/logout.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RequestCodeDto } from './dto/request-code.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { VerifyDto } from './dto/verify.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Public()
  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  requestCode(@Body() dto: RequestCodeDto): Promise<{ sent: true }> {
    return this.auth.requestCode(dto.phone);
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Body() dto: VerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verify(dto.phone, dto.code);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<{ accessToken: string }> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    const refreshToken =
      dto.refreshToken ??
      (req.cookies?.['refreshToken'] as string | undefined);

    if (!refreshToken) {
      throw new UnauthorizedException({
        error: 'invalid_token',
        message: 'No refresh token provided',
      });
    }

    await this.auth.logoutByToken(refreshToken);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return { success: true };
  }

  @Get('me')
  me(@RequireUser() user: AuthenticatedUser) {
    return this.auth.getMe(user.id);
  }

  @Patch('me')
  updateMe(@RequireUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(user, dto);
  }

  @Post('onboarding')
  @HttpCode(HttpStatus.OK)
  onboarding(
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: OnboardingDto,
  ): Promise<{ user: UserResponse }> {
    return this.auth.onboarding(user, dto);
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const secure = this.config.get('nodeEnv', { infer: true }) === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: this.auth.refreshTtlMs,
      path: '/api/auth',
    });
  }
}
