import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private subscriber: Redis | null = null;
  private readonly subscriptions = new Map<
    string,
    Set<(message: string) => void>
  >();

  constructor(config: ConfigService<AppConfig, true>) {
    this.client = new Redis(config.get('redisUrl', { infer: true }), {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `Redis connection failed: ${message}. Auth codes and sessions will not work until Redis is available.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }

    if (this.subscriber) {
      try {
        await this.subscriber.quit();
      } catch {
        this.subscriber.disconnect();
      }
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.client.set(key, value, 'EX', ttlSeconds);
      return;
    }

    await this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count === 1;
  }

  async increment(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  /**
   * Publish a message on a channel. Fire-and-forget-safe: errors are
   * logged and swallowed so a publish failure never breaks the caller.
   */
  async publish(channel: string, message: string): Promise<void> {
    try {
      await this.client.publish(channel, message);
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Redis publish failed on ${channel}: ${text}`);
    }
  }

  /**
   * Subscribe to a channel. The callback fires for every message.
   * Returns an unsubscribe function that removes this callback and
   * unsubscribes from the channel when the last callback is removed.
   *
   * A dedicated subscriber connection is created lazily via duplicate(),
   * because a subscribed ioredis client cannot issue normal commands.
   */
  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<() => Promise<void>> {
    if (!this.subscriber) {
      this.subscriber = this.client.duplicate({
        lazyConnect: true,
      });
      this.subscriber.on('error', (error: Error) => {
        this.logger.warn(`Redis subscriber error: ${error.message}`);
      });
      this.subscriber.on('message', (ch: string, message: string) => {
        const callbacks = this.subscriptions.get(ch);
        if (!callbacks) return;
        for (const cb of callbacks) {
          try {
            cb(message);
          } catch (error: unknown) {
            const text = error instanceof Error ? error.message : 'unknown';
            this.logger.warn(
              `Redis subscriber callback failed on ${ch}: ${text}`,
            );
          }
        }
      });

      try {
        await this.subscriber.connect();
      } catch (error: unknown) {
        const text = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(
          `Redis subscriber connection failed: ${text}. Real-time streams will not deliver until Redis is available.`,
        );
        this.subscriber = null;
        throw new Error(`Redis subscriber unavailable: ${text}`);
      }
    }

    const callbacks = this.subscriptions.get(channel) ?? new Set();
    callbacks.add(callback);
    const isFirst = this.subscriptions.get(channel) === undefined;
    this.subscriptions.set(channel, callbacks);

    if (isFirst) {
      try {
        await this.subscriber.subscribe(channel);
      } catch (error: unknown) {
        const text = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`Redis subscribe failed on ${channel}: ${text}`);
      }
    }

    return async (): Promise<void> => {
      const set = this.subscriptions.get(channel);
      if (!set) return;
      set.delete(callback);
      if (set.size === 0) {
        this.subscriptions.delete(channel);
        try {
          await this.subscriber?.unsubscribe(channel);
        } catch (error: unknown) {
          const text = error instanceof Error ? error.message : 'unknown error';
          this.logger.warn(`Redis unsubscribe failed on ${channel}: ${text}`);
        }
      }
    };
  }
}
