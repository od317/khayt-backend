import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { diskStorage } from 'multer';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { AppConfig } from '../../config/configuration';
import type { BusinessResponse, UserResponse } from './auth.mapper';
import { AuthService } from './auth.service';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { RequestCodeDto } from './dto/request-code.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { VerifyDto } from './dto/verify.dto';

const businessImageStorage = diskStorage({
  destination: './uploads/businesses',
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname) || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  },
});

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
    return this.auth.requestCode(dto.phone, dto.name);
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Body() dto: VerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verify(dto.phone, dto.code, dto.fcmToken);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RefreshResponseDto })
  refresh(@Body() dto: RefreshDto): Promise<RefreshResponseDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LogoutResponseDto })
  async logout(
    @RequireUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponseDto> {
    const header = req.headers.authorization;
    const accessToken = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length)
      : '';
    const result = await this.auth.logout(user.id, accessToken);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return result;
  }

  @Get('me')
  me(@RequireUser() user: AuthenticatedUser) {
    return this.auth.getMe(user.id);
  }

  @Patch('me')
  updateMe(@RequireUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(user, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LogoutResponseDto })
  async deleteAccount(
    @RequireUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponseDto> {
    const header = req.headers.authorization;
    const accessToken = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length)
      : '';
    const result = await this.auth.deleteAccount(user.id, accessToken);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return result;
  }

  @Post('onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ type: OnboardingDto })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: businessImageStorage,
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  onboarding(
    @RequireUser() user: AuthenticatedUser,
    @Body() dto: OnboardingDto,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<{ user: UserResponse; business: BusinessResponse | null }> {
    return this.auth.onboarding(user, dto, image);
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
