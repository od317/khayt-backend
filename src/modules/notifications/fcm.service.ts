import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  App,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import {
  getMessaging,
  Messaging,
  MulticastMessage,
} from 'firebase-admin/messaging';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfig } from '../../config/configuration';

export type FcmPayload = {
  title: string;
  body: string;
  type: string;
  linkTo: string | null;
};

const STALE_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private messaging: Messaging | null = null;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    const firebase = this.config.get('firebase', { infer: true });
    if (!firebase) {
      this.logger.warn(
        'Firebase is not configured; push notifications are disabled',
      );
      return;
    }

    const app: App =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: firebase.projectId,
          clientEmail: firebase.clientEmail,
          privateKey: firebase.privateKey,
        }),
      });

    this.messaging = getMessaging(app);
  }

  async registerToken(userId: string, rawToken: string): Promise<void> {
    const token = rawToken.trim();
    if (!token) {
      return;
    }

    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token },
      update: { userId },
    });
  }

  async sendToUser(userId: string, payload: FcmPayload): Promise<void> {
    if (!this.messaging) {
      return;
    }

    const devices = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (devices.length === 0) {
      return;
    }

    const tokens = devices.map((device) => device.token);
    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        type: payload.type,
        linkTo: payload.linkTo ?? '',
      },
      android: {
        priority: 'high',
      },
    };

    try {
      const result = await this.messaging.sendEachForMulticast(message);
      const stale = tokens.filter((token, index) => {
        const response = result.responses[index];
        if (!response || response.success) {
          return false;
        }
        const code = response.error?.code;
        return typeof code === 'string' && STALE_CODES.has(code);
      });
      if (stale.length > 0) {
        await this.prisma.deviceToken.deleteMany({
          where: { token: { in: stale } },
        });
      }
    } catch (error: unknown) {
      const messageText =
        error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Failed to send FCM to user ${userId}: ${messageText}`);
    }
  }
}
