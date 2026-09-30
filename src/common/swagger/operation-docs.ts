import { ERRORS, errorBody, validationFailed } from './error-bodies';
import {
  paginated,
  sampleAdminLocation,
  sampleAdminRole,
  sampleBill,
  sampleBusiness,
  sampleComment,
  sampleDelivery,
  sampleInventoryItem,
  sampleNotification,
  sampleOrderDetail,
  sampleOrderLine,
  sampleOrderListItem,
  samplePost,
  sampleProduct,
  sampleReceiving,
  sampleTokens,
  sampleUser,
} from './samples';

export type NamedExample = { summary: string; value: unknown };

export type StatusDoc = {
  description: string;
  examples?: Record<string, NamedExample>;
  empty?: boolean;
  contentType?: string;
};

export type OperationDoc = Record<string, StatusDoc>;

function ok(value: unknown, description = 'Success'): StatusDoc {
  return {
    description,
    examples: { success: { summary: 'Success', value } },
  };
}

function created(value: unknown): StatusDoc {
  return ok(value, 'Created');
}

function errors(
  description: string,
  entries: Record<string, { summary: string; value: unknown }>,
): StatusDoc {
  return { description, examples: entries };
}

const AT = '2026-09-29T07:22:15.000Z';

const sampleBillLine = {
  id: '',
  productId: '',
  productName: '',
  quantity: 1,
  unitPrice: 0,
  total: 0,
};

const sampleReceivingLine = {
  id: '',
  productId: '',
  productName: '',
  quantity: 1,
  unitPrice: 0,
};

const samplePayment = {
  id: '',
  amount: 0,
  paidAt: AT,
  recordedBy: '',
  recordedByName: '',
};

export const OPERATION_DOCS: Record<string, OperationDoc> = {
  'get /health': {
    '200': ok({ status: 'ok', timestamp: AT, uptime: 0 }),
  },

  'post /debug/expire-token': {
    '200': ok({ expired: true, accessToken: '' }),
    '401': errors('Unauthorized', {
      missing: {
        summary: 'No Bearer token',
        value: ERRORS.authRequired,
      },
      invalid: {
        summary: 'Invalid or expired access token',
        value: errorBody(401, 'unauthorized', 'Invalid or expired access token'),
      },
    }),
    '404': errors('Disabled', {
      not_found: {
        summary: 'Debug routes are not enabled',
        value: errorBody(404, 'not_found', 'Not found'),
      },
    }),
  },

  'post /auth/request-code': {
    '200': ok({ sent: true }),
    '400': errors('Validation failed', {
      validation_failed: {
        summary: 'Invalid phone',
        value: validationFailed({
          phone: 'must be a Syrian phone number (09xxxxxxxx)',
        }),
      },
    }),
    '429': errors('Too many requests', {
      too_many_requests: {
        summary: 'OTP send rate limit',
        value: errorBody(
          429,
          'too_many_requests',
          'Too many code requests. Try again later.',
        ),
      },
    }),
  },

  'post /auth/verify': {
    '200': ok({ ...sampleTokens, user: sampleUser }),
    '400': errors('Validation failed', {
      validation_failed: {
        summary: 'Invalid phone or code',
        value: validationFailed({
          phone: 'must be a Syrian phone number (09xxxxxxxx)',
          code: 'must be a 6-digit code',
        }),
      },
    }),
    '401': errors('Unauthorized', {
      invalid_code: {
        summary: 'Wrong code',
        value: errorBody(401, 'invalid_code', 'Invalid verification code'),
      },
      code_expired: {
        summary: 'Code missing or expired',
        value: errorBody(
          401,
          'code_expired',
          'Verification code is missing or expired',
        ),
      },
    }),
    '403': errors('Forbidden', {
      account_suspended: {
        summary: 'Account is suspended',
        value: errorBody(
          403,
          'account_suspended',
          'This account has been suspended',
        ),
      },
    }),
    '429': errors('Too many attempts', {
      too_many_attempts: {
        summary: 'Too many incorrect codes',
        value: errorBody(
          429,
          'too_many_attempts',
          'Too many incorrect codes. Request a new one.',
        ),
      },
    }),
  },

  'post /auth/refresh': {
    '200': ok({
      accessToken: '',
      accessTokenExpiresAt: AT,
    }),
    '400': errors('Validation failed', {
      validation_failed: {
        summary: 'Missing refresh token',
        value: validationFailed({ refreshToken: 'must be a string' }),
      },
    }),
    '401': errors('Unauthorized', {
      invalid_token: {
        summary: 'Refresh token revoked or invalid',
        value: errorBody(401, 'invalid_token', 'Refresh token has been revoked'),
      },
      unauthorized: {
        summary: 'User no longer exists',
        value: errorBody(401, 'unauthorized', 'User not found'),
      },
    }),
    '403': errors('Forbidden', {
      account_suspended: {
        summary: 'Account is suspended',
        value: errorBody(
          403,
          'account_suspended',
          'This account has been suspended',
        ),
      },
    }),
  },

  'post /auth/logout': {
    '200': ok({ success: true }),
    '401': errors('Unauthorized', {
      unauthorized: {
        summary: 'Missing or expired access token',
        value: ERRORS.unauthorized,
      },
    }),
  },

  'get /auth/me': {
    '200': ok({
      user: sampleUser,
      business: sampleBusiness,
      unreadNotifications: 0,
    }),
    '401': errors('Unauthorized', {
      unauthorized: {
        summary: 'Invalid token or user missing',
        value: ERRORS.unauthorized,
      },
    }),
  },

  'patch /auth/me': {
    '200': ok({ user: sampleUser }),
    '400': errors('Validation failed', {
      availableForWork: {
        summary: 'availableForWork is employee-only',
        value: validationFailed(
          { availableForWork: 'only allowed if role is employee' },
          'availableForWork is only allowed for employees',
        ),
      },
      locationId: {
        summary: 'Unknown location',
        value: validationFailed(
          { locationId: 'must reference an active location' },
          'Location does not exist or is inactive',
        ),
      },
    }),
  },

  'post /auth/onboarding': {
    '200': ok({ user: sampleUser }),
    '400': errors('Validation failed', {
      validation_failed: {
        summary: 'Invalid role or fields',
        value: validationFailed({ role: 'is not a selectable role' }),
      },
    }),
    '409': errors('Conflict', {
      already_onboarded: {
        summary: 'Onboarding already completed',
        value: errorBody(
          409,
          'already_onboarded',
          'Onboarding has already been completed',
        ),
      },
    }),
  },

  'post /auth/admin/login': {
    '200': ok({ requiresTwoFactor: true, challengeToken: '' }),
    '400': errors('Validation failed', {
      validation_failed: {
        summary: 'Missing email or password',
        value: validationFailed({ email: 'must be an email' }),
      },
    }),
    '401': errors('Unauthorized', {
      invalid_credentials: {
        summary: 'Wrong email or password',
        value: errorBody(401, 'invalid_credentials', 'Invalid email or password'),
      },
    }),
    '403': errors('Forbidden', {
      forbidden: {
        summary: 'Not a dashboard user',
        value: ERRORS.forbidden,
      },
    }),
  },

  'post /auth/admin/verify-2fa': {
    '200': ok({ ...sampleTokens, user: { ...sampleUser, role: 'admin' } }),
    '400': errors('Validation failed', {
      validation_failed: {
        summary: 'Missing challenge or code',
        value: validationFailed({ code: 'must be a 6-digit code' }),
      },
    }),
    '401': errors('Unauthorized', {
      invalid_challenge: {
        summary: 'Challenge token is invalid',
        value: errorBody(401, 'invalid_challenge', 'Invalid challenge token'),
      },
      code_expired: {
        summary: '2FA code expired',
        value: errorBody(401, 'code_expired', 'Verification code is missing or expired'),
      },
      invalid_code: {
        summary: 'Wrong 2FA code',
        value: errorBody(401, 'invalid_code', 'Invalid verification code'),
      },
    }),
  },

  'get /roles': {
    '200': ok({
      items: [{ value: 'employee', label: '', description: '' }],
    }),
  },

  'get /admin/roles': {
    '200': ok({ items: [sampleAdminRole] }),
  },
  'post /admin/roles': {
    '201': created({ role: sampleAdminRole }),
    '409': errors('Conflict', {
      conflict: {
        summary: 'Role value already exists',
        value: ERRORS.conflict,
      },
    }),
  },
  'patch /admin/roles/{id}': {
    '200': ok({ role: sampleAdminRole }),
  },
  'delete /admin/roles/{id}': {
    '200': ok({ success: true }),
    '409': errors('Conflict', {
      conflict: {
        summary: 'System role or role still in use',
        value: errorBody(409, 'conflict', 'Cannot delete this role'),
      },
    }),
  },

  'get /locations': {
    '200': ok({
      items: [{ id: '', name: 'دمشق', areas: [{ id: '', name: '' }] }],
    }),
  },
  'get /locations/cities': {
    '200': ok({ items: [{ id: '', name: 'دمشق' }] }),
  },
  'get /admin/locations': {
    '200': ok({ items: [sampleAdminLocation] }),
  },
  'post /admin/locations': {
    '201': created({ location: sampleAdminLocation }),
    '400': errors('Validation failed', {
      parentId: {
        summary: 'Parent must be an existing city',
        value: validationFailed(
          { parentId: 'must reference an existing city' },
          'Parent location does not exist',
        ),
      },
    }),
  },
  'patch /admin/locations/{id}': {
    '200': ok({ location: sampleAdminLocation }),
    '400': errors('Validation failed', {
      parentId: {
        summary: 'Cannot nest an area under an area',
        value: validationFailed(
          { parentId: 'must be a city, not an area' },
          'Areas can only be nested under a city',
        ),
      },
    }),
  },
  'delete /admin/locations/{id}': {
    '200': ok({ success: true }),
    '409': errors('Conflict', {
      children: {
        summary: 'City still has areas',
        value: errorBody(409, 'conflict', 'Delete or move child areas first'),
      },
      users: {
        summary: 'Location assigned to users',
        value: errorBody(
          409,
          'conflict',
          'Location is assigned to one or more users',
        ),
      },
    }),
  },

  'get /categories': {
    '200': ok({
      items: [
        { id: '', name: '', slug: '', appliesTo: 'product', sortOrder: 0 },
      ],
    }),
  },
  'get /admin/categories': {
    '200': ok({
      items: [
        { id: '', name: '', slug: '', appliesTo: 'both', sortOrder: 0 },
      ],
    }),
  },
  'post /admin/categories': {
    '201': created({
      category: {
        id: '',
        name: '',
        slug: '',
        appliesTo: 'both',
        sortOrder: 0,
      },
    }),
    '409': errors('Conflict', {
      conflict: {
        summary: 'Slug already exists',
        value: errorBody(
          409,
          'conflict',
          'A category with this slug already exists',
        ),
      },
    }),
  },
  'patch /admin/categories/{id}': {
    '200': ok({
      category: {
        id: '',
        name: '',
        slug: '',
        appliesTo: 'both',
        sortOrder: 0,
      },
    }),
    '409': errors('Conflict', {
      conflict: {
        summary: 'Slug already exists',
        value: errorBody(
          409,
          'conflict',
          'A category with this slug already exists',
        ),
      },
    }),
  },
  'delete /admin/categories/{id}': {
    '200': ok({ success: true }),
    '409': errors('Conflict', {
      conflict: {
        summary: 'Category is still used on posts',
        value: errorBody(
          409,
          'conflict',
          'Category is assigned to one or more posts',
        ),
      },
    }),
  },

  'get /businesses': {
    '200': ok(paginated(sampleBusiness)),
  },
  'get /businesses/{id}': {
    '200': ok({
      business: sampleBusiness,
      products: [sampleProduct],
      supply: [
        {
          productId: '',
          productName: '',
          sent: 0,
          remaining: 0,
          sold: 0,
          unit: 'قطعة',
          unitPrice: 0,
        },
      ],
      isOwner: false,
    }),
  },
  'post /businesses': {
    '201': created({ business: sampleBusiness }),
    '409': errors('Conflict', {
      already_has_business: {
        summary: 'User already owns a business',
        value: errorBody(
          409,
          'already_has_business',
          'You already have a business',
        ),
      },
    }),
  },
  'patch /businesses/{id}': {
    '200': ok({ business: sampleBusiness }),
    '403': errors('Forbidden', {
      forbidden: {
        summary: 'Not the business owner',
        value: errorBody(403, 'forbidden', 'Not the owner of this business'),
      },
    }),
  },

  'get /products': {
    '200': ok(paginated(sampleProduct)),
  },
  'get /products/{id}': {
    '200': ok({
      product: sampleProduct,
      business: {
        id: '',
        type: 'workshop',
        name: '',
        location: '',
        description: null,
        phone: null,
        imageUrl: null,
        verified: false,
      },
      availableQuantity: 0,
    }),
  },
  'post /products': {
    '201': created({ product: sampleProduct }),
  },
  'patch /products/{id}': {
    '200': ok({ product: sampleProduct }),
  },
  'delete /products/{id}': {
    '200': ok({ product: sampleProduct, softDeleted: true }),
    '409': errors('Conflict', {
      product_has_orders: {
        summary: 'Product appears on orders',
        value: errorBody(409, 'product_has_orders', 'Product has been ordered'),
      },
    }),
  },

  'get /posts': {
    '200': ok(paginated(samplePost)),
  },
  'get /posts/{id}': {
    '200': ok({ post: samplePost }),
  },
  'post /posts': {
    '201': created({ post: samplePost }),
  },
  'patch /posts/{id}': {
    '200': ok({ post: samplePost }),
  },
  'delete /posts/{id}': {
    '200': ok({ post: samplePost, deleted: true }),
  },
  'post /posts/{id}/like': {
    '200': ok({ liked: true, likes: 1 }),
  },
  'delete /posts/{id}/like': {
    '200': ok({ liked: false, likes: 0 }),
  },
  'post /posts/{id}/save': {
    '200': ok({ saved: true }),
  },
  'delete /posts/{id}/save': {
    '200': ok({ saved: false }),
  },
  'get /posts/{id}/comments': {
    '200': ok(paginated(sampleComment)),
  },
  'post /posts/{id}/comments': {
    '201': created({ comment: sampleComment }),
  },
  'delete /comments/{id}': {
    '204': { description: 'Comment deleted', empty: true },
  },

  'get /orders': {
    '200': ok(paginated(sampleOrderListItem)),
  },
  'get /orders/{id}': {
    '200': ok(sampleOrderDetail),
    '404': errors('Not found', {
      not_found: { summary: 'Unknown order', value: ERRORS.notFound },
      order_not_accessible: {
        summary: 'Caller cannot see this order',
        value: errorBody(404, 'order_not_accessible', 'Order not found'),
      },
    }),
  },
  'post /orders': {
    '201': created(sampleOrderDetail),
    '400': errors('Validation failed', {
      not_in_warehouse: {
        summary: 'Product is not in the warehouse',
        value: errorBody(400, 'not_in_warehouse', 'Product is not in the warehouse'),
      },
      insufficient_stock: {
        summary: 'Not enough remaining stock',
        value: errorBody(400, 'insufficient_stock', 'Insufficient stock'),
      },
    }),
  },
  'patch /orders/{id}/status': {
    '200': ok({ order: sampleOrderListItem }),
    '400': errors('Invalid transition', {
      invalid_transition: {
        summary: 'Status cannot move that way',
        value: errorBody(400, 'invalid_transition', 'Invalid status transition'),
      },
    }),
    '403': errors('Forbidden', {
      forbidden: {
        summary: 'Role cannot change this status',
        value: ERRORS.forbidden,
      },
    }),
  },
  'patch /orders/{id}/lines/{lineId}': {
    '200': ok({ line: sampleOrderLine }),
    '400': errors('Invalid state', {
      invalid_state: {
        summary: 'Line cannot be updated in this order status',
        value: errorBody(400, 'invalid_state', 'Order is not in a pickable state'),
      },
    }),
  },
  'get /orders/{id}/stream': {
    '200': {
      description: 'Server-sent order status events',
      contentType: 'text/event-stream',
      examples: {
        status: {
          summary: 'Status event',
          value: 'event: status\ndata: {"status":"review","updatedAt":"' + AT + '"}\n\n',
        },
        ping: {
          summary: 'Heartbeat',
          value: 'event: ping\ndata: ping\n\n',
        },
      },
    },
  },

  'get /notifications': {
    '200': ok({ ...paginated(sampleNotification), unreadCount: 1 }),
  },
  'patch /notifications/read-all': {
    '200': ok({ updated: true }),
  },
  'patch /notifications/{id}/read': {
    '200': ok({ notification: { ...sampleNotification, read: true } }),
  },
  'get /notifications/stream': {
    '200': {
      description: 'Server-sent notification events',
      contentType: 'text/event-stream',
      examples: {
        notification: {
          summary: 'Notification event',
          value:
            'event: notification\ndata: ' +
            JSON.stringify(sampleNotification) +
            '\n\n',
        },
        ping: {
          summary: 'Heartbeat',
          value: 'event: ping\ndata: ping\n\n',
        },
      },
    },
  },

  'get /inventory': {
    '200': ok(paginated(sampleInventoryItem)),
  },
  'get /inventory/{id}': {
    '200': ok({
      item: sampleInventoryItem,
      business: {
        id: '',
        name: '',
        type: 'workshop',
        location: '',
        verified: false,
      },
      movements: [
        { id: '', type: 'in', quantity: 0, reference: null, createdAt: AT },
      ],
    }),
  },
  'get /supply': {
    '200': ok(paginated(sampleInventoryItem)),
  },

  'get /bills/summary': {
    '200': ok({ total: 0, paid: 0, remaining: 0, count: 0 }),
  },
  'get /bills': {
    '200': ok(paginated(sampleBill)),
  },
  'get /bills/{id}': {
    '200': ok({
      bill: sampleBill,
      lines: [sampleBillLine],
      payments: [samplePayment],
      business: {
        id: '',
        name: '',
        type: 'workshop',
        location: '',
        verified: false,
      },
      receiving: { id: '', number: '', receivedAt: AT },
    }),
  },
  'post /bills/{id}/payments': {
    '201': created({ payment: samplePayment, bill: sampleBill }),
    '400': errors('Validation failed', {
      amount_not_positive: {
        summary: 'Amount must be greater than zero',
        value: errorBody(400, 'amount_not_positive', 'Amount must be greater than zero'),
      },
      amount_exceeds_balance: {
        summary: 'Amount exceeds remaining balance',
        value: errorBody(
          400,
          'amount_exceeds_balance',
          'Amount exceeds remaining balance',
        ),
      },
    }),
  },

  'get /receiving': {
    '200': ok(paginated(sampleReceiving)),
  },
  'get /receiving/{id}': {
    '200': ok({
      receiving: sampleReceiving,
      lines: [sampleReceivingLine],
      bill: sampleBill,
    }),
  },
  'post /receiving': {
    '201': created({
      receiving: { ...sampleReceiving, lines: [sampleReceivingLine] },
      bill: { ...sampleBill, lines: [sampleBillLine] },
    }),
  },

  'get /deliveries': {
    '200': ok(paginated(sampleDelivery)),
  },
  'get /deliveries/{id}': {
    '200': ok({
      delivery: sampleDelivery,
      orders: [
        {
          id: '',
          number: '',
          status: 'review',
          storeName: '',
          pieces: 0,
          total: 0,
        },
      ],
      driver: null,
    }),
  },
  'post /deliveries': {
    '201': created({ delivery: sampleDelivery }),
    '409': errors('Conflict', {
      order_already_assigned: {
        summary: 'An order is already on another delivery',
        value: errorBody(
          409,
          'order_already_assigned',
          'Order is already assigned to a delivery',
        ),
      },
    }),
  },
  'patch /deliveries/{id}': {
    '200': ok({ delivery: sampleDelivery }),
  },
  'patch /deliveries/{id}/status': {
    '200': ok({ delivery: sampleDelivery }),
    '400': errors('Invalid status change', {
      no_driver_assigned: {
        summary: 'Cannot complete without a driver',
        value: errorBody(400, 'no_driver_assigned', 'No driver assigned'),
      },
      invalid_transition: {
        summary: 'Status cannot move that way',
        value: errorBody(400, 'invalid_transition', 'Invalid status transition'),
      },
    }),
  },
  'get /drivers': {
    '200': ok({ items: [{ id: '', name: '', phone: null }] }),
  },

  'post /admin/employees': {
    '201': created({ user: { ...sampleUser, role: 'admin', phone: null } }),
  },
  'get /admin/employees': {
    '200': ok(paginated({ ...sampleUser, role: 'admin', phone: null })),
  },
  'patch /admin/employees/{id}': {
    '200': ok({ user: { ...sampleUser, role: 'inventory', phone: null } }),
  },
  'get /admin/users': {
    '200': ok(paginated(sampleUser)),
  },
  'patch /admin/users/{id}': {
    '200': ok({ user: sampleUser }),
  },
};
