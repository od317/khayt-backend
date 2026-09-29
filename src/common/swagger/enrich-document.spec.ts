import { describe, expect, it } from 'vitest';
import type { OpenAPIObject } from '@nestjs/swagger';
import { enrichOpenApiDocument, operationKey } from './enrich-document';
import { OPERATION_DOCS } from './operation-docs';

describe('enrichOpenApiDocument', () => {
  it('builds operation keys without the global /api prefix', () => {
    expect(operationKey('POST', '/api/auth/refresh')).toBe(
      'post /auth/refresh',
    );
    expect(operationKey('get', '/auth/me')).toBe('get /auth/me');
  });

  it('adds success and error examples for a public auth route', () => {
    const document = {
      openapi: '3.0.0',
      info: { title: 'test', version: '0' },
      paths: {
        '/auth/verify': {
          post: {
            'x-public': true,
            requestBody: { content: {} },
            responses: { '200': { description: '' } },
          },
        },
      },
    } as unknown as OpenAPIObject;

    enrichOpenApiDocument(document);

    const op = document.paths?.['/auth/verify']?.post as {
      security: unknown[];
      responses: Record<string, { content?: { 'application/json': { examples: Record<string, unknown> } } }>;
    };

    expect(op.security).toEqual([]);
    expect(op.responses['200']?.content?.['application/json']?.examples.success).toBeTruthy();
    expect(op.responses['401']?.content?.['application/json']?.examples.invalid_code).toBeTruthy();
    expect(op.responses['429']?.content?.['application/json']?.examples.too_many_attempts).toBeTruthy();
  });

  it('adds 401 to protected routes', () => {
    const document = {
      openapi: '3.0.0',
      info: { title: 'test', version: '0' },
      paths: {
        '/auth/logout': {
          post: {
            responses: { '200': { description: '' } },
          },
        },
      },
    } as unknown as OpenAPIObject;

    enrichOpenApiDocument(document);
    const op = document.paths?.['/auth/logout']?.post as {
      responses: Record<string, { content?: { 'application/json': { examples: Record<string, unknown> } } }>;
    };
    expect(op.responses['401']?.content?.['application/json']?.examples.unauthorized).toBeTruthy();
    expect(op.responses['200']?.content?.['application/json']?.examples.success).toBeTruthy();
  });

  it('covers every documented operation key', () => {
    expect(Object.keys(OPERATION_DOCS).length).toBeGreaterThan(40);
  });
});
