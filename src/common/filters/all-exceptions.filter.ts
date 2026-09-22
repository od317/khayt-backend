import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

type ErrorBody = {
  error: string;
  message: string;
  fields?: Record<string, string>;
  [key: string]: unknown;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const { status, body } = this.normalize(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    httpAdapter.reply(ctx.getResponse(), body, status);
  }

  private normalize(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          status,
          body: {
            error: this.codeFromStatus(status),
            message: response,
          },
        };
      }

      const payload = response as Record<string, unknown>;

      if (
        typeof payload['error'] === 'string' &&
        payload['error'] !== 'Bad Request'
      ) {
        return {
          status,
          body: {
            ...payload,
            error: payload['error'],
            message:
              typeof payload['message'] === 'string'
                ? payload['message']
                : exception.message,
          },
        };
      }

      const message = payload['message'];
      const formattedMessage = Array.isArray(message)
        ? message.map(String).join(', ')
        : typeof message === 'string'
          ? message
          : exception.message;

      return {
        status,
        body: {
          error: this.codeFromStatus(status),
          message: formattedMessage,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: 'internal_error',
        message: 'An unexpected error occurred',
      },
    };
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'bad_request';
      case HttpStatus.UNAUTHORIZED:
        return 'unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'forbidden';
      case HttpStatus.NOT_FOUND:
        return 'not_found';
      case HttpStatus.CONFLICT:
        return 'conflict';
      default:
        return 'error';
    }
  }
}
