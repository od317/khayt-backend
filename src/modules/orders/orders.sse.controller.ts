// NOTE: In production this runs behind Nginx (Hostinger VPS).
// Nginx buffers responses by default, which breaks SSE.
// The vhost needs, for this location:
//   proxy_buffering off;
//   proxy_cache off;
//   proxy_http_version 1.1;
//   proxy_set_header Connection '';
//   proxy_read_timeout 24h;
//   chunked_transfer_encoding off;
// This is a config concern, not a code concern.
// See 06-stack.md for the deployment section.
//
// Client contract:
//   - Messages with `type: "status"` carry { status, updatedAt } in `data`.
//   - Messages with `type: "ping"` are heartbeats; ignore them.

import { Controller, MessageEvent, Param, Sse } from '@nestjs/common';
import { interval, map, merge, Observable } from 'rxjs';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import {
  ORDER_CHANNEL,
  NotificationsPubSub,
} from '../notifications/notifications.pubsub';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersSseController {
  constructor(
    private readonly pubsub: NotificationsPubSub,
    private readonly orders: OrdersService,
  ) {}

  @Sse(':id/stream')
  async stream(
    @Param('id') id: string,
    @RequireUser() user: AuthenticatedUser,
  ): Promise<Observable<MessageEvent>> {
    // Access check runs before the stream opens — if the user can't
    // see the order, the request 404s.
    await this.orders.assertCanReadById(id, user);

    const channel = ORDER_CHANNEL(id);

    const events$ = this.pubsub.streamChannel(channel).pipe(
      map((raw): MessageEvent => {
        let data: string | object;
        try {
          data = JSON.parse(raw) as object;
        } catch {
          data = { parseError: true };
        }
        return {
          type: 'status',
          data,
        };
      }),
    );

    const heartbeat$ = interval(30000).pipe(
      map((): MessageEvent => ({
        type: 'ping',
        data: 'ping',
      })),
    );

    return merge(events$, heartbeat$);
  }
}
