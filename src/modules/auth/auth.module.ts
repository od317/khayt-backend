import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { JwtStrategy } from './jwt.strategy';
import { SmsService } from './sms.service';
import { FcmModule } from '../notifications/fcm.module';

@Module({
  imports: [FcmModule],
  controllers: [AuthController, AdminAuthController],
  providers: [
    AuthService,
    AdminAuthService,
    EmailService,
    SmsService,
    JwtStrategy,
  ],
  exports: [AuthService, AdminAuthService],
})
export class AuthModule {}
