import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import multer from 'multer';

type ErrorBody = {
  error: string;
  message: string;
  statusCode: number;
  fields?: Record<string, string>;
  stack?: string;
  [key: string]: unknown;
};

/**
 * Extra top-level keys we allow through from an HttpException's response
 * payload, in addition to the standard { error, message, statusCode }.
 * Everything else a thrown payload carries is stripped, so a route can't
 * accidentally leak internals.
 */
const ALLOWED_EXTRA = new Set([
  'productId',
  'available',
  'from',
  'to',
  'field',
  'fields',
  'code',
  'completedData',
]);

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const isDevelopment = process.env.NODE_ENV === 'development';

    const { status, body } = this.normalize(exception, isDevelopment);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    httpAdapter.reply(ctx.getResponse(), body, status);
  }

  private normalize(
    exception: unknown,
    isDevelopment: boolean,
  ): { status: number; body: ErrorBody } {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return this.withStack(
          {
            status: HttpStatus.CONFLICT,
            body: {
              error: 'duplicate',
              message: 'A record with this value already exists',
              statusCode: HttpStatus.CONFLICT,
            },
          },
          exception,
          isDevelopment,
        );
      }

      if (exception.code === 'P2025') {
        return this.withStack(
          {
            status: HttpStatus.NOT_FOUND,
            body: {
              error: 'not_found',
              message: 'Record not found',
              statusCode: HttpStatus.NOT_FOUND,
            },
          },
          exception,
          isDevelopment,
        );
      }
    }

    if (exception instanceof multer.MulterError) {
      return this.withStack(
        {
          status: HttpStatus.BAD_REQUEST,
          body: {
            error: 'invalid_multipart',
            message: exception.message,
            statusCode: HttpStatus.BAD_REQUEST,
          },
        },
        exception,
        isDevelopment,
      );
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return this.withStack(
          {
            status,
            body: {
              error: this.codeFromStatus(status),
              message: response,
              statusCode: status,
            },
          },
          exception,
          isDevelopment,
        );
      }

      const payload = response as Record<string, unknown>;
      const fields = this.readFields(payload['fields']);
      const errorCode =
        typeof payload['error'] === 'string' &&
        payload['error'] !== 'Bad Request'
          ? payload['error']
          : this.codeFromStatus(status);

      const message = payload['message'];
      const formattedMessage = Array.isArray(message)
        ? message.map(String).join(', ')
        : typeof message === 'string'
          ? message
          : exception.message;

      const body: ErrorBody = {
        error: errorCode,
        message: formattedMessage,
        statusCode: status,
        ...(fields ? { fields } : {}),
      };

      // Pass through any allowed extra context keys the caller set.
      for (const [key, value] of Object.entries(payload)) {
        if (ALLOWED_EXTRA.has(key) && key !== 'fields') {
          body[key] = value;
        }
      }

      return this.withStack({ status, body }, exception, isDevelopment);
    }

    const message =
      isDevelopment && exception instanceof Error
        ? exception.message
        : 'An unexpected error occurred';

    return this.withStack(
      {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          error: 'internal_error',
          message,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        },
      },
      exception,
      isDevelopment,
    );
  }

  private withStack(
    result: { status: number; body: ErrorBody },
    exception: unknown,
    isDevelopment: boolean,
  ): { status: number; body: ErrorBody } {
    if (
      isDevelopment &&
      result.status >= HttpStatus.INTERNAL_SERVER_ERROR &&
      exception instanceof Error &&
      exception.stack
    ) {
      return {
        status: result.status,
        body: { ...result.body, stack: exception.stack },
      };
    }
    return result;
  }

  private readFields(value: unknown): Record<string, string> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    const fields: Record<string, string> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry === 'string') {
        fields[key] = entry;
      }
    }
    return Object.keys(fields).length > 0 ? fields : undefined;
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
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'too_many_requests';
      default:
        return 'error';
    }
  }
}
