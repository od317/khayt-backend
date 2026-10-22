import { ERRORS, errorBody, validationFailed } from './error-bodies';
import {
  paginated,
  sampleAdminLocation,
  sampleAdminRole,
  sampleBill,
  sampleBusiness,
  sampleCart,
  sampleCartItem,
  sampleCityLocation,
  sampleComment,
  sampleDelivery,
  inventoryListSample,
  sampleInventoryItem,
  supplyListSample,
  sampleMarketer,
  sampleNotification,
  sampleOrderDetail,
  sampleOrderLine,
  sampleOrderListItem,
  samplePost,
  sampleProduct,
  sampleProductNamesResponse,
  sampleReceiving,
  sampleRole,
  sampleShippingCompany,
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

  'post /debug/orders/{id}/advance': {
    '200': ok({
      order: sampleOrderListItem,
      from: 'ready',
      to: 'in_transit',
    }),
    '400': errors('Already terminal', {
      invalid_transition: {
        summary: 'Order cannot advance further',
        value: errorBody(
          400,
          'invalid_transition',
          'الطلب في حالة نهائية',
        ),
      },
    }),
  },
  'post /debug/expire-token': {
    '200': ok({ expired: true, accessToken: '' }),
    '401': errors('Unauthorized', {
      missing: {
        summary: 'No Bearer token',
        value: ERRORS.authRequired,
      },
      invalid: {
        summary: 'رمز الوصول غير صالح أو منتهٍ',
        value: errorBody(401, 'unauthorized', 'رمز الوصول غير صالح أو منتهٍ'),
      },
    }),
    '404': errors('Disabled', {
      not_found: {
        summary: 'Debug routes are not enabled',
        value: errorBody(404, 'not_found', 'غير موجود'),
      },
    }),
  },

  'post /auth/request-code': {
    '200': ok({ sent: true }),
    '400': errors('Validation failed', {
      validation_failed: {
        summary: 'Invalid phone',
        value: validationFailed({
          phone:
            'يجب أن يكون رقم هاتف دولي بصيغة E.164 (+رمز الدولة…)',
        }),
      },
    }),
    '429': errors('Too many requests', {
      too_many_requests: {
        summary: 'OTP send rate limit',
        value: errorBody(
          429,
          'too_many_requests',
          'طلبات كثيرة للرمز. حاول لاحقاً.',
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
          phone:
            'يجب أن يكون رقم هاتف دولي بصيغة E.164 (+رمز الدولة…)',
          code: 'يجب أن يكون رمزاً من 6 أرقام',
        }),
      },
    }),
    '401': errors('Unauthorized', {
      invalid_code: {
        summary: 'Wrong code',
        value: errorBody(401, 'invalid_code', 'رمز التحقق غير صحيح'),
      },
      code_expired: {
        summary: 'Code missing or expired',
        value: errorBody(
          401,
          'code_expired',
          'رمز التحقق مفقود أو منتهٍ',
        ),
      },
    }),
    '403': errors('Forbidden', {
      account_suspended: {
        summary: 'Account is suspended',
        value: errorBody(
          403,
          'account_suspended',
          'تم إيقاف هذا الحساب',
        ),
      },
    }),
    '429': errors('Too many attempts', {
      too_many_attempts: {
        summary: 'Too many incorrect codes',
        value: errorBody(
          429,
          'too_many_attempts',
          'محاولات خاطئة كثيرة. اطلب رمزاً جديداً.',
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
        value: validationFailed({ refreshToken: 'يجب أن يكون نصاً' }),
      },
    }),
    '401': errors('Unauthorized', {
      invalid_token: {
        summary: 'Refresh token revoked or invalid',
        value: errorBody(401, 'invalid_token', 'تم إلغاء رمز التحديث'),
      },
      unauthorized: {
        summary: 'User no longer exists',
        value: errorBody(401, 'unauthorized', 'المستخدم غير موجود'),
      },
    }),
    '403': errors('Forbidden', {
      account_suspended: {
        summary: 'Account is suspended',
        value: errorBody(
          403,
          'account_suspended',
          'تم إيقاف هذا الحساب',
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

  'delete /auth/me': {
    '200': ok({ success: true }),
    '403': errors('Forbidden', {
      cannot_delete_account: {
        summary: 'Staff cannot delete from the app',
        value: errorBody(
          403,
          'cannot_delete_account',
          'لا يمكن حذف حسابات الموظفين من التطبيق',
        ),
      },
    }),
  },

  'patch /auth/me': {
    '200': ok({ user: sampleUser, business: sampleBusiness }),
    '400': errors('Validation failed', {
      availableForWork: {
        summary: 'availableForWork is employee-like only',
        value: validationFailed(
          {
            availableForWork:
              'only allowed for employee, marketer, or shipping_company',
          },
          'availableForWork is only allowed for employee-like roles',
        ),
      },
      locationId: {
        summary: 'Unknown location',
        value: validationFailed(
          { locationId: 'يجب أن يشير إلى موقع نشط' },
          'الموقع غير موجود أو غير نشط',
        ),
      },
      delivery_location: {
        summary: 'Store drop-off pin is incomplete',
        value: validationFailed(
          {
            deliveryAddress: 'مطلوب',
            deliveryLat: 'مطلوب',
            deliveryLng: 'مطلوب',
          },
          'موقع الخريطة والعنوان مطلوبان معاً',
        ),
      },
    }),
  },

  'patch /auth/me/available-for-work': {
    '200': ok({ user: { ...sampleUser, availableForWork: true } }),
    '403': errors('Forbidden', {
      not_employee: {
        summary: 'Only employee-like roles can toggle availability',
        value: errorBody(
          403,
          'forbidden',
          'فقط الموظف أو المسوق أو شركة الشحن يمكنه تغيير التوفر',
        ),
      },
    }),
    '400': errors('Validation failed', {
      availableForWork: {
        summary: 'Boolean required',
        value: validationFailed(
          { availableForWork: 'يجب أن يكون منطقيًا (صحيح/خطأ)' },
          'Validation failed',
        ),
      },
    }),
    '429': errors('Too many requests', {
      too_many_requests: {
        summary: 'Max 3 toggles per 5 minutes',
        value: errorBody(
          429,
          'too_many_requests',
          'تغييرات كثيرة للتوفر. حاول بعد دقائق.',
        ),
      },
    }),
  },

  'post /auth/onboarding': {
    '200': ok({
      user: { ...sampleUser, role: 'workshop', canOrder: true },
      business: sampleBusiness,
    }),
    '400': errors('Validation failed', {
      validation_failed: {
        summary: 'Invalid role or missing business fields',
        value: validationFailed({
          role: 'يجب أن يكون دوراً قابلاً للاختيار',
          businessName: 'مطلوب للورشة/المتجر/المعهد',
        }),
      },
    }),
    '409': errors('Conflict', {
      already_onboarded: {
        summary: 'Onboarding already completed',
        value: errorBody(
          409,
          'already_onboarded',
          'اكتمل التسجيل الأول مسبقاً',
        ),
      },
    }),
  },

  'post /auth/admin/login': {
    '200': ok({ requiresTwoFactor: true, challengeToken: '' }),
    '400': errors('Validation failed', {
      validation_failed: {
        summary: 'Missing email or password',
        value: validationFailed({ email: 'بريد إلكتروني غير صالح' }),
      },
    }),
    '401': errors('Unauthorized', {
      invalid_credentials: {
        summary: 'Wrong email or password',
        value: errorBody(401, 'invalid_credentials', 'البريد أو كلمة المرور غير صحيحة'),
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
        value: validationFailed({ code: 'يجب أن يكون رمزاً من 6 أرقام' }),
      },
    }),
    '401': errors('Unauthorized', {
      invalid_challenge: {
        summary: 'Challenge token is invalid',
        value: errorBody(401, 'invalid_challenge', 'رمز التحدي غير صالح أو منتهٍ'),
      },
      code_expired: {
        summary: '2FA code expired',
        value: errorBody(401, 'code_expired', 'رمز التحقق مفقود أو منتهٍ'),
      },
      invalid_code: {
        summary: 'Wrong 2FA code',
        value: errorBody(401, 'invalid_code', 'رمز التحقق غير صحيح'),
      },
    }),
  },

  'get /roles': {
    '200': ok({
      items: [
        sampleRole,
        {
          ...sampleRole,
          value: 'workshop',
          label: 'مشغل / معمل',
          description:
            'اعرض منتجاتك وخدماتك، وظّف عمالاً، واطلب من مستودع خيط أو استقبل طلبات المتاجر.',
          iconUrl:
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNO36XKY6a7gCZq0CK5bQrqrMjc-VhMWm9QQVwp4TNoQ&s=10',
        },
        {
          ...sampleRole,
          value: 'institute',
          label: 'معهد',
          description:
            'انشر الدورات التدريبية في الخياطة والتصميم واجذب الطلاب والمتدربين.',
          iconUrl:
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKFSey5bgsBA3-2Z7f27pym50-ySDrxPZWoIJ1bOCQ9pQVdvEun88f-iPX&s=10',
        },
      ],
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
        value: errorBody(409, 'conflict', 'لا يمكن حذف هذا الدور'),
      },
    }),
  },

  'get /locations': {
    '200': ok({
      items: [sampleCityLocation],
    }),
  },
  'get /locations/cities': {
    '200': ok({
      items: [
        {
          id: sampleCityLocation.id,
          name: sampleCityLocation.name,
          deliveryBorder: sampleCityLocation.deliveryBorder,
        },
      ],
    }),
  },
  'get /locations/{id}/areas': {
    '200': ok({
      items: [{ id: 'loc-damascus-mazzeh', name: 'المزة' }],
    }),
    '404': errors('غير موجود', {
      not_found: {
        summary: 'City location missing',
        value: errorBody(404, 'not_found', 'الموقع غير موجود'),
      },
    }),
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
          { parentId: 'يجب أن يشير إلى مدينة موجودة' },
          'الموقع الأب غير موجود',
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
          { parentId: 'يجب أن تكون مدينة وليس منطقة' },
          'المناطق تُنشأ فقط تحت مدينة',
        ),
      },
    }),
  },
  'delete /admin/locations/{id}': {
    '200': ok({ success: true }),
    '409': errors('Conflict', {
      children: {
        summary: 'City still has areas',
        value: errorBody(409, 'conflict', 'احذف أو انقل المناطق الفرعية أولاً'),
      },
      users: {
        summary: 'Location assigned to users',
        value: errorBody(
          409,
          'conflict',
          'الموقع مرتبط بمستخدمين',
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
  'get /post-options': {
    '200': ok({
      byType: {
        job_offering: {
          fields: {
            specialty: [{ id: '', label: '', parentId: null, sortOrder: 0 }],
            skills: [{ id: '', label: '', parentId: '', sortOrder: 0 }],
            currency: [
              { id: 'opt-currency-syp', label: 'ليرة سورية', parentId: null, sortOrder: 0 },
              { id: 'opt-currency-usd', label: 'دولار', parentId: null, sortOrder: 1 },
            ],
          },
        },
        service_offering: {
          fields: {
            specialty: [],
            servicePlace: [],
            pricing: [],
            currency: [],
          },
        },
        product_offering: {
          fields: {
            specialty: [],
            sellMethod: [],
            priceMethod: [],
            currency: [],
          },
        },
        material_offering: {
          fields: {
            specialty: [],
            condition: [],
            currency: [],
          },
        },
      },
    }),
  },
  'get /admin/post-options': {
    '200': ok({
      items: [
        {
          id: '',
          kind: 'specialty',
          label: '',
          parentId: null,
          sortOrder: 0,
          postTypes: ['job_offering'],
          active: true,
        },
      ],
    }),
  },
  'post /admin/post-options': {
    '201': created({
      option: {
        id: '',
        kind: 'specialty',
        label: '',
        parentId: null,
        sortOrder: 0,
        postTypes: ['job_offering'],
        active: true,
      },
    }),
  },
  'patch /admin/post-options/{id}': {
    '200': ok({
      option: {
        id: '',
        kind: 'specialty',
        label: '',
        parentId: null,
        sortOrder: 0,
        postTypes: ['job_offering'],
        active: true,
      },
    }),
  },
  'delete /admin/post-options/{id}': {
    '200': ok({ ok: true }),
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
          'فئة بهذا المعرف موجودة',
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
          'فئة بهذا المعرف موجودة',
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
          'الفئة مرتبطة بمنشورات',
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
      isOwner: false,
    }),
  },
  'get /profiles/{id}/similar': {
    '200': ok(paginated(sampleBusiness)),
    '404': errors('غير موجود', {
      not_found: {
        summary: 'Factory profile missing',
        value: errorBody(404, 'not_found', 'ملف المصنع غير موجود'),
      },
    }),
  },
  'get /profiles/{id}': {
    '200': {
      description: 'Public profile (factory or employee)',
      examples: {
        factory: {
          summary: 'Factory',
          value: {
            kind: 'factory',
            id: 'biz-workshop',
            profile: {
              name: sampleBusiness.name,
              description: sampleBusiness.description,
              verified: sampleBusiness.verified,
              services: sampleBusiness.services,
              imageUrl: sampleBusiness.imageUrl,
              location: sampleBusiness.location,
              phone: sampleBusiness.phone,
              experience: sampleBusiness.experience,
              categories: [] as { id: string; name: string; slug: string }[],
            },
            posts: [samplePost],
          },
        },
        employee: {
          summary: 'Employee',
          value: {
            kind: 'employee',
            id: 'user-employee',
            profile: {
              id: 'user-employee',
              name: 'أحمد الخياط',
              bio: 'خياط محترف',
              avatarUrl: null,
              verified: false,
              availableForWork: true,
              location: 'المزة',
              phone: '0994000001',
            },
            posts: [samplePost],
            similar: [
              {
                id: 'user-employee-2',
                name: 'سامي',
                bio: null,
                avatarUrl: null,
                verified: true,
                availableForWork: true,
                location: 'المزة',
              },
            ],
          },
        },
      },
    },
    '404': errors('غير موجود', {
      not_found: {
        summary: 'No public profile for this business/user id',
        value: errorBody(404, 'not_found', 'الملف غير موجود'),
      },
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
        value: errorBody(403, 'forbidden', 'لست مالك هذا النشاط'),
      },
    }),
  },

  'get /products': {
    '200': ok(paginated(sampleProduct)),
  },
  'get /products/{id}/similar': {
    '200': ok(paginated(sampleProduct)),
    '404': errors('غير موجود', {
      not_found: {
        summary: 'Product missing',
        value: errorBody(404, 'not_found', 'المنتج غير موجود'),
      },
    }),
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
        value: errorBody(409, 'product_has_orders', 'المنتج مُطلَب ولا يمكن حذفه'),
      },
    }),
  },

  'get /posts': {
    '200': ok(paginated(samplePost)),
  },
  'get /posts/mine': {
    '200': ok(paginated(samplePost)),
    '401': errors('Unauthorized', {
      unauthorized: {
        summary: 'Missing or invalid token',
        value: errorBody(401, 'unauthorized', 'غير مصرح'),
      },
    }),
  },
  'get /posts/mine/reels': {
    '200': ok(paginated(samplePost)),
    '401': errors('Unauthorized', {
      unauthorized: {
        summary: 'Missing or invalid token',
        value: errorBody(401, 'unauthorized', 'غير مصرح'),
      },
    }),
  },
  'get /posts/liked': {
    '200': ok(paginated({ ...samplePost, likedByMe: true })),
  },
  'get /posts/saved': {
    '200': ok(paginated({ ...samplePost, savedByMe: true })),
  },
  'get /posts/{id}': {
    '200': ok({ post: samplePost }),
  },
  'post /posts': {
    '201': created({ post: samplePost }),
    '403': errors('Forbidden', {
      profile_incomplete: {
        summary: 'Display name required before posting',
        value: errorBody(
          403,
          'profile_incomplete',
          'أدخل اسمك للمتابعة',
          { completedData: false, fields: { name: 'مطلوب' } },
        ),
      },
    }),
  },
  'patch /posts/{id}': {
    '200': ok({ post: samplePost }),
  },
  'delete /posts/{id}': {
    '200': ok({ post: samplePost, deleted: true }),
  },
  'post /posts/{id}/like': {
    '200': ok({ liked: true, likes: 1 }),
    '403': errors('Forbidden', {
      profile_incomplete: {
        summary: 'Display name required before liking',
        value: errorBody(
          403,
          'profile_incomplete',
          'أدخل اسمك للمتابعة',
          { completedData: false, fields: { name: 'مطلوب' } },
        ),
      },
    }),
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
    '403': errors('Forbidden', {
      profile_incomplete: {
        summary: 'Display name required before commenting',
        value: errorBody(
          403,
          'profile_incomplete',
          'أدخل اسمك للمتابعة',
          { completedData: false, fields: { name: 'مطلوب' } },
        ),
      },
    }),
  },
  'get /comments/{id}/reply': {
    '200': ok({
      items: [{ ...sampleComment, replies: [sampleComment] }],
    }),
    '404': errors('غير موجود', {
      not_found: {
        summary: 'Parent comment missing',
        value: errorBody(404, 'not_found', 'التعليق غير موجود'),
      },
    }),
  },
  'post /comments/{id}/reply': {
    '201': created({ comment: sampleComment }),
    '403': errors('Forbidden', {
      profile_incomplete: {
        summary: 'Display name required before replying',
        value: errorBody(
          403,
          'profile_incomplete',
          'أدخل اسمك للمتابعة',
          { completedData: false, fields: { name: 'مطلوب' } },
        ),
      },
    }),
    '404': errors('غير موجود', {
      not_found: {
        summary: 'Parent comment missing',
        value: errorBody(404, 'not_found', 'التعليق غير موجود'),
      },
    }),
  },
  'patch /comments/{id}': {
    '200': ok({ comment: sampleComment }),
    '403': errors('Forbidden', {
      forbidden: {
        summary: 'Not the comment author',
        value: errorBody(403, 'forbidden', 'لست كاتب هذا التعليق'),
      },
    }),
    '404': errors('غير موجود', {
      not_found: {
        summary: 'Comment missing',
        value: errorBody(404, 'not_found', 'التعليق غير موجود'),
      },
    }),
  },
  'delete /comments/{id}': {
    '204': { description: 'Comment deleted (nested replies cascade)', empty: true },
  },

  'get /orders': {
    '200': ok(paginated(sampleOrderListItem)),
    '401': errors('Unauthorized', {
      unauthorized: {
        summary: 'Missing or expired access token',
        value: ERRORS.unauthorized,
      },
    }),
  },
  'get /orders/{id}': {
    '200': ok(sampleOrderDetail),
    '404': errors('غير موجود', {
      not_found: { summary: 'Unknown order', value: ERRORS.notFound },
      order_not_accessible: {
        summary: 'Caller cannot see this order',
        value: errorBody(404, 'order_not_accessible', 'الطلب غير موجود'),
      },
    }),
  },
  'post /orders': {
    '201': created(sampleOrderDetail),
    '400': errors('Validation failed', {
      first_order_location: {
        summary: 'First order needs a map pin and address',
        value: validationFailed(
          {
            address: 'مطلوب',
            lat: 'مطلوب',
            lng: 'مطلوب',
          },
          'حدّد موقع التوصيل على الخريطة لأول طلب',
        ),
      },
      map_pin_incomplete: {
        summary: 'Address, lat, and lng must be sent together',
        value: validationFailed(
          {
            address: 'مطلوب',
            lat: 'مطلوب',
            lng: 'مطلوب',
          },
          'موقع الخريطة والعنوان مطلوبان معاً',
        ),
      },
      not_in_warehouse: {
        summary: 'Product is not in the warehouse',
        value: errorBody(
          400,
          'not_in_warehouse',
          'المنتج غير متاح for ordering',
          { productId: '' },
        ),
      },
    }),
    '403': errors('Forbidden', {
      profile_incomplete: {
        summary: 'Saved delivery coordinates required before ordering',
        value: errorBody(
          403,
          'profile_incomplete',
          'أدخل موقع التوصيل للمتابعة',
          {
            completedData: false,
            fields: {
              deliveryLat: 'مطلوب',
              deliveryLng: 'مطلوب',
            },
          },
        ),
      },
      forbidden: {
        summary: 'فقط المتجر والورشة يمكنهما تقديم الطلبات',
        value: errorBody(
          403,
          'forbidden',
          'فقط المتجر والورشة يمكنهما تقديم الطلبات',
        ),
      },
    }),
    '404': errors('غير موجود', {
      not_found: {
        summary: 'منتج غير معروف',
        value: errorBody(404, 'not_found', 'المنتج غير موجود'),
      },
    }),
    '409': errors('Conflict', {
      insufficient_stock: {
        summary: 'Not enough remaining stock',
        value: errorBody(
          409,
          'insufficient_stock',
          'المخزون غير كافٍ',
          { productId: '', available: 0 },
        ),
      },
    }),
  },
  'patch /orders/{id}/status': {
    '200': ok({ order: sampleOrderListItem }),
    '400': errors('Invalid transition', {
      invalid_transition: {
        summary: 'Status cannot move that way',
        value: errorBody(400, 'invalid_transition', 'انتقال الحالة غير مسموح'),
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
        value: errorBody(400, 'invalid_state', 'الطلب ليس في حالة قابلة للتجهيز'),
      },
    }),
  },
  'get /orders/stream': {
    '200': {
      description:
        'Server-sent status events for every order this caller can list',
      contentType: 'text/event-stream',
      examples: {
        status: {
          summary: 'Status event',
          value:
            'event: status\ndata: {"id":"73ea3750-0add-4839-85f2-b902099ddaa9","status":"review","pieces":4,"updatedAt":"' +
            AT +
            '"}\n\n',
        },
        ping: {
          summary: 'Heartbeat',
          value: 'event: ping\ndata: ping\n\n',
        },
      },
    },
  },
  'get /orders/{id}/stream': {
    '200': {
      description: 'Server-sent order status events',
      contentType: 'text/event-stream',
      examples: {
        status: {
          summary: 'Status event',
          value:
            'event: status\ndata: {"id":"73ea3750-0add-4839-85f2-b902099ddaa9","status":"review","pieces":4,"updatedAt":"' +
            AT +
            '"}\n\n',
        },
        ping: {
          summary: 'Heartbeat',
          value: 'event: ping\ndata: ping\n\n',
        },
      },
    },
  },

  'get /notifications': {
    '200': ok({
      ...paginated(sampleNotification),
      unreadCount: 1,
    }),
  },
  'patch /notifications/read-all': {
    '200': ok({ updated: true }),
  },
  'patch /notifications/{id}/read': {
    '200': ok({ notification: { ...sampleNotification, read: true } }),
  },
  'delete /notifications/all': {
    '200': ok({ deleted: true }),
  },
  'delete /notifications/{id}': {
    '200': ok({ deleted: true }),
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
    '200': ok(inventoryListSample()),
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
    '200': ok(
      supplyListSample(),
      'Staff see all warehouse supply. Workshops see only products linked to their business (supplierBusinessId).',
    ),
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
        value: errorBody(400, 'amount_not_positive', 'المبلغ يجب أن يكون أكبر من صفر'),
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
          statusColor: '#F59E0B',
          storeName: '',
          pieces: 0,
          total: 0,
          address: '',
          lat: 33.5138,
          lng: 36.2765,
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
        value: errorBody(400, 'no_driver_assigned', 'لم يُعيَّن موصل'),
      },
      invalid_transition: {
        summary: 'Status cannot move that way',
        value: errorBody(400, 'invalid_transition', 'انتقال الحالة غير مسموح'),
      },
    }),
  },
  'get /drivers': {
    '200': ok({ items: [{ id: '', name: '', phone: null, lat: null, lng: null }] }),
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

  'get /marketers': {
    '200': ok(paginated(sampleMarketer)),
  },

  'get /shipping-companies': {
    '200': ok(paginated(sampleShippingCompany)),
  },
  'get /shipping-companies/{id}': {
    '200': ok({ company: sampleShippingCompany }),
  },
  'get /admin/shipping-companies': {
    '200': ok(paginated(sampleShippingCompany)),
  },
  'get /admin/shipping-companies/{id}': {
    '200': ok({ company: sampleShippingCompany }),
  },
  'post /admin/shipping-companies': {
    '201': created({ company: sampleShippingCompany }),
  },
  'patch /admin/shipping-companies/{id}': {
    '200': ok({ company: sampleShippingCompany }),
  },
  'delete /admin/shipping-companies/{id}': {
    '200': ok({ success: true }),
  },

  'get /cart': {
    '200': ok(sampleCart),
  },
  'post /cart/items': {
    '201': created(sampleCartItem),
  },
  'patch /cart/items/{id}': {
    '200': ok(sampleCartItem),
  },
  'delete /cart/items/{id}': {
    '200': ok({ removed: true }),
  },
  'delete /cart': {
    '200': ok({ cleared: true }),
  },
  'post /cart/checkout': {
    '201': created({ order: sampleOrderDetail.order }),
  },

  'get /admin/posts': {
    '200': ok(paginated(samplePost)),
  },
  'delete /admin/posts/{id}': {
    '200': ok({ post: samplePost, deleted: true }),
  },
  'patch /admin/posts/{id}/deactivate': {
    '200': ok({ post: { ...samplePost, active: false } }),
  },
  'patch /admin/posts/{id}/activate': {
    '200': ok({ post: { ...samplePost, active: true } }),
  },

  'get /products/names': {
    '200': ok(sampleProductNamesResponse),
  },
};
