import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { RedisService } from '../../common/redis/redis.service';

/**
 * Bridges Redis pub/sub to RxJS Observables for SSE streams.
 *
 * Two channels:
 *   notify:user:${userId}  — notifications for one user
 *   order:${orderId}       — status changes for one order
 */

export const NOTIFY_USER_CHANNEL = (userId: string): string =>
  `notify:user:${userId}`;

export const ORDER_CHANNEL = (orderId: string): string => `order:${orderId}`;

@Injectable()
export class NotificationsPubSub {
  constructor(private readonly redis: RedisService) {}

  /**
   * Streams raw JSON payloads for a channel. Each subscriber to the
   * returned Observable gets its own Subject, which is torn down when
   * the subscriber unsubscribes.
   */
  streamChannel(channel: string): Observable<string> {
    return new Observable<string>((subscriber) => {
      const subject = new Subject<string>();
      const inner = subject.subscribe(subscriber);
      let unsubscribe: (() => Promise<void>) | null = null;
      let closed = false;

      this.redis
        .subscribe(channel, (message) => {
          subject.next(message);
        })
        .then((fn) => {
          if (closed) {
            void fn();
            return;
          }
          unsubscribe = fn;
        })
        .catch(() => {
          // If we can't subscribe, complete the stream. The controller
          // will have already returned a response, so the client sees
          // an empty stream rather than an error.
          subject.complete();
        });

      return () => {
        closed = true;
        inner.unsubscribe();
        if (unsubscribe) {
          void unsubscribe();
        }
      };
    });
  }
}
