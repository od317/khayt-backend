import { BadRequestException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter';

const createFilter = () => {
  const reply = vi.fn();
  const filter = new AllExceptionsFilter({
    httpAdapter: { reply },
  } as unknown as HttpAdapterHost);

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({}),
      getRequest: () => ({}),
    }),
  };

  return { filter, reply, host };
};

describe('AllExceptionsFilter', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('does not include a stack on validation errors in development', () => {
    process.env.NODE_ENV = 'development';
    const { filter, reply, host } = createFilter();

    filter.catch(
      new BadRequestException({
        error: 'validation_failed',
        fields: {
          phone:
            'must be an international phone number in E.164 form (+countrycode…)',
        },
      }),
      host as never,
    );

    expect(reply).toHaveBeenCalledWith(
      {},
      expect.not.objectContaining({ stack: expect.any(String) }),
      HttpStatus.BAD_REQUEST,
    );
  });

  it('includes a stack on 500 errors in development only', () => {
    process.env.NODE_ENV = 'development';
    const { filter, reply, host } = createFilter();

    filter.catch(new Error('db down'), host as never);

    const body = reply.mock.calls[0]?.[1] as { stack?: string; error: string };
    expect(body.error).toBe('internal_error');
    expect(body.stack).toEqual(expect.stringContaining('Error: db down'));
  });

  it('never includes a stack in production', () => {
    process.env.NODE_ENV = 'production';
    const { filter, reply, host } = createFilter();

    filter.catch(new Error('db down'), host as never);

    const body = reply.mock.calls[0]?.[1] as { stack?: string };
    expect(body.stack).toBeUndefined();
  });
});
