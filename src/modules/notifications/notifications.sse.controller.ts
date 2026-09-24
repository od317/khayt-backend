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
//   - Messages with `type: "notification"` carry a NotificationResponse in `data`.
//   - Messages with `type: "ping"` are heartbeats; ignore them.

import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { interval, map, merge, Observable } from 'rxjs';
import { RequireUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/auth';
import {
  NOTIFY_USER_CHANNEL,
  NotificationsPubSub,
} from './notifications.pubsub';

@Controller('notifications')
export class NotificationsSseController {
  constructor(private readonly pubsub: NotificationsPubSub) {}

  @Sse('stream')
  stream(@RequireUser() user: AuthenticatedUser): Observable<MessageEvent> {
    const channel = NOTIFY_USER_CHANNEL(user.id);

    const events$ = this.pubsub.streamChannel(channel).pipe(
      map((raw): MessageEvent => {
        let data: string | object;
        try {
          data = JSON.parse(raw) as object;
        } catch {
          data = { parseError: true };
        }
        return {
          type: 'notification',
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
