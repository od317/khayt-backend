import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<AppConfig, true>) {
    const isDevelopment =
      config.get('nodeEnv', { infer: true }) === 'development';

    super({
      log: isDevelopment
        ? (['query', 'info', 'warn', 'error'] as Prisma.LogLevel[])
        : (['warn', 'error'] as Prisma.LogLevel[]),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
