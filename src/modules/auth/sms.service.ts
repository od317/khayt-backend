// TODO: integrate a Syrian SMS provider before production.
// This is a placeholder so the auth flow can be built and tested.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async send(phone: string, message: string): Promise<void> {
    // TEMPORARY: no SMS provider wired. Log in every environment so the
    // fixed OTP flow doesn't break on production.
    // TODO: replace with a real provider before public launch.
    this.logger.warn(`[SMS-STUB] to ${phone}: ${message}`);
  }
}
