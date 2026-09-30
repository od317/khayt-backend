import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { EMPTY, interval, map, merge, Observable } from 'rxjs';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import { NotificationsPubSub } from '../notifications/notifications.pubsub';
import { OrdersService } from './orders.service';

@Controller('orders/stream')
export class OrdersFeedSseController {
  constructor(
    private readonly pubsub: NotificationsPubSub,
    private readonly orders: OrdersService,
  ) {}

  @Sse()
  streamAll(
    @RequireUser() user: AuthenticatedUser,
  ): Observable<MessageEvent> {
    const channel = this.orders.ordersFeedChannel(user);
    const events$ = channel
      ? this.pubsub.streamChannel(channel).pipe(
          map((raw): MessageEvent => {
            let data: string | object;
            try {
              data = JSON.parse(raw) as object;
            } catch {
              data = { parseError: true };
            }
            return { type: 'status', data };
          }),
        )
      : EMPTY;

    const heartbeat$ = interval(30000).pipe(
      map((): MessageEvent => ({ type: 'ping', data: 'ping' })),
    );

    return merge(events$, heartbeat$);
  }
}
