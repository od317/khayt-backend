import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Pass-through interceptor.
 * Response bodies follow docs/04-api.md as returned by controllers — no envelope.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, T> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    return next.handle();
  }
}
