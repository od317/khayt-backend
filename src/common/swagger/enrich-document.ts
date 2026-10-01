import type { OpenAPIObject } from '@nestjs/swagger';
import { ERRORS, validationFailed } from './error-bodies';
import { OPERATION_DOCS, type StatusDoc } from './operation-docs';

const METHODS = ['get', 'put', 'post', 'patch', 'delete'] as const;

type Operation = {
  responses?: Record<string, unknown>;
  requestBody?: unknown;
  security?: unknown[];
  'x-public'?: boolean;
  'x-roles'?: unknown;
  [key: string]: unknown;
};

type PathItem = {
  [method: string]: unknown;
  'x-public'?: boolean;
  'x-roles'?: unknown;
};

export function operationKey(method: string, path: string): string {
  const normalized = path.replace(/^\/api(?=\/|$)/, '') || '/';
  return `${method.toLowerCase()} ${normalized}`;
}

function jsonContent(doc: StatusDoc): Record<string, unknown> {
  if (doc.empty) {
    return { description: doc.description };
  }

  const contentType = doc.contentType ?? 'application/json';
  const examples = doc.examples ?? {};

  return {
    description: doc.description,
    content: {
      [contentType]: {
        examples,
        example: Object.values(examples)[0]?.value,
      },
    },
  };
}

function asExamples(
  description: string,
  entries: Record<string, { summary: string; value: unknown }>,
): StatusDoc {
  return { description, examples: entries };
}

function defaultErrors(opts: {
  isPublic: boolean;
  hasRoles: boolean;
  hasBody: boolean;
  hasPathParam: boolean;
  hasParameters: boolean;
}): Record<string, StatusDoc> {
  const errors: Record<string, StatusDoc> = {};

  if (opts.hasBody || opts.hasParameters) {
    errors['400'] = asExamples('Validation failed', {
      validation_failed: {
        summary: 'Request body or query failed validation',
        value: validationFailed({ field: 'invalid' }),
      },
    });
  }

  if (!opts.isPublic) {
    errors['401'] = asExamples('Unauthorized', {
      unauthorized: {
        summary: 'Missing, invalid, or expired access token',
        value: ERRORS.unauthorized,
      },
    });
  }

  if (opts.hasRoles) {
    errors['403'] = asExamples('Forbidden', {
      forbidden: {
        summary: 'Authenticated but role is not allowed',
        value: ERRORS.forbidden,
      },
    });
  }

  if (opts.hasPathParam) {
    errors['404'] = asExamples('Not found', {
      not_found: {
        summary: 'The requested record does not exist',
        value: ERRORS.notFound,
      },
    });
  }

  return errors;
}

function mergeStatus(
  base: StatusDoc | undefined,
  override: StatusDoc | undefined,
): StatusDoc | undefined {
  if (!base) return override;
  if (!override) return base;
  return {
    description: override.description || base.description,
    empty: override.empty ?? base.empty,
    contentType: override.contentType ?? base.contentType,
    examples: { ...(base.examples ?? {}), ...(override.examples ?? {}) },
  };
}

export function enrichOpenApiDocument(document: OpenAPIObject): OpenAPIObject {
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    const item = pathItem as PathItem;

    for (const method of METHODS) {
      const op = item[method] as Operation | undefined;
      if (!op || typeof op !== 'object') continue;

      const isPublic =
        op['x-public'] === true ||
        item['x-public'] === true ||
        path === '/health' ||
        path === '/api/health';
      const hasRoles =
        Boolean(op['x-roles'] ?? item['x-roles']) ||
        /^\/(admin|bills|receiving|deliveries|drivers|inventory)(\/|$)/.test(
          path.replace(/^\/api(?=\/|$)/, ''),
        );
      const hasBody = Boolean(op.requestBody);
      const hasPathParam = path.includes('{');
      const hasParameters = Array.isArray(op.parameters) && op.parameters.length > 0;
      const key = operationKey(method, path);
      const documented = OPERATION_DOCS[key] ?? {};

      if (isPublic) {
        op.security = [];
      }

      const defaults = defaultErrors({
        isPublic,
        hasRoles,
        hasBody,
        hasPathParam,
        hasParameters,
      });

      const statuses = new Set([
        ...Object.keys(defaults),
        ...Object.keys(documented),
      ]);

      const existing = (op.responses ?? {}) as Record<string, unknown>;
      const successCodes = ['200', '201', '204'].filter((code) => existing[code]);
      if (successCodes.length === 0 && !documented['200'] && !documented['201'] && !documented['204']) {
        statuses.add('200');
      } else {
        for (const code of successCodes) statuses.add(code);
      }

      const responses: Record<string, unknown> = { ...existing };

      for (const status of statuses) {
        const merged = mergeStatus(defaults[status], documented[status]);
        if (!merged) continue;
        if (!merged.examples && !merged.empty && status === '200' && !documented[status]) {
          continue;
        }
        responses[status] = jsonContent(merged);
      }

      const catalogSuccess = ['200', '201', '204'].filter(
        (code) => documented[code],
      );
      if (catalogSuccess.length > 0) {
        for (const code of ['200', '201', '204']) {
          if (!documented[code]) {
            delete responses[code];
          }
        }
      }

      op.responses = responses;
    }
  }

  return document;
}
