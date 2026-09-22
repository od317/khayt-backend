import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.config.get('nodeEnv', { infer: true }) !== 'development') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    response.on('finish', () => {
      const duration = Date.now() - startedAt;
      this.logger.log(
        `${request.method} ${request.path} ${response.statusCode} ${duration}ms`,
      );
    });

    return next.handle();
  }
}
