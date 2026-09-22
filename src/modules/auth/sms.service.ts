// TODO: integrate a Syrian SMS provider before production.
// This is a placeholder so the auth flow can be built and tested.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) { }

  async send(phone: string, message: string): Promise<void> {
    const nodeEnv = this.config.get('nodeEnv', { infer: true });

    if (nodeEnv === 'production' || nodeEnv === 'staging') {
      throw new Error('SMS provider not configured');
    }

    this.logger.log(`[SMS] to ${phone}: ${message}`);
  }
}