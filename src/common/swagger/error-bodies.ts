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
  message = 'فشل التحقق من البيانات',
): ErrorBody => errorBody(400, 'validation_failed', message, { fields });

export const ERRORS = {
  unauthorized: errorBody(401, 'unauthorized', 'الرمز غير صالح أو منتهٍ'),
  authRequired: errorBody(401, 'unauthorized', 'يلزم تسجيل الدخول'),
  forbidden: errorBody(403, 'forbidden', 'صلاحيات غير كافية'),
  notFound: errorBody(404, 'not_found', 'السجل غير موجود'),
  conflict: errorBody(409, 'conflict', 'سجل بهذه القيمة موجود مسبقاً'),
};
