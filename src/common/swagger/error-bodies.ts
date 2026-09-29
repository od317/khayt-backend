export type ErrorBody = {
  error: string;
  message: string;
  statusCode: number;
  fields?: Record<string, string>;
  [key: string]: unknown;
};

export function errorBody(
  statusCode: number,
  error: string,
  message: string,
  extra: Record<string, unknown> = {},
): ErrorBody {
  return { error, message, statusCode, ...extra };
}

export const validationFailed = (
  fields: Record<string, string>,
  message = 'Validation failed',
): ErrorBody => errorBody(400, 'validation_failed', message, { fields });

export const ERRORS = {
  unauthorized: errorBody(401, 'unauthorized', 'Invalid or expired token'),
  authRequired: errorBody(401, 'unauthorized', 'Authentication required'),
  forbidden: errorBody(403, 'forbidden', 'Insufficient role'),
  notFound: errorBody(404, 'not_found', 'Record not found'),
  conflict: errorBody(409, 'conflict', 'A record with this value already exists'),
};
