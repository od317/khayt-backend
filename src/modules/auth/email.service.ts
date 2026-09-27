import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    this.fromAddress = this.config.get('smtp.from', { infer: true });
    this.transporter = nodemailer.createTransport({
      host: this.config.get('smtp.host', { infer: true }),
      port: this.config.get('smtp.port', { infer: true }),
      secure: false, // port 587 uses STARTTLS
      auth: {
        user: this.config.get('smtp.user', { infer: true }),
        pass: this.config.get('smtp.pass', { infer: true }),
      },
    });
  }

  async send(input: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.to,
        subject: input.subject,
        text: input.text,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Failed to send email to ${input.to}: ${message}`);
      throw error;
    }
  }
}
