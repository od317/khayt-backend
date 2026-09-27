import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AppConfig } from '../../config/configuration';
import { AdminAuthService, AdminLoginResponse } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminVerify2faDto } from './dto/admin-verify-2fa.dto';

@Controller('auth/admin')
export class AdminAuthController {
  constructor(
    private readonly adminAuth: AdminAuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto): Promise<AdminLoginResponse> {
    return this.adminAuth.login(dto.email, dto.password);
  }

  @Public()
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  async verify2fa(
    @Body() dto: AdminVerify2faDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminAuth.verify2fa(dto.challengeToken, dto.code);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const secure = this.config.get('nodeEnv', { infer: true }) === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });
  }
}
