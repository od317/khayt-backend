# Admin & dashboard staff API

Request/response reference for the dashboard and staff tools.

- **Base URL:** `/api`
- **Auth:** `Authorization: Bearer <accessToken>` unless marked **Public**
- **No envelope:** bodies are returned as shown (Nest may wrap errors as `{ error, message, fields?, statusCode }`)
- **Pagination:** `page` (default 1), `limit` (default 20, max 100) → `{ items, total, page, limit }`

### Who can call what

| Surface | Roles |
| --- | --- |
| `/admin/*` | `admin`, `super_admin` |
| `/auth/admin/*` login | Public; accounts: `admin`, `super_admin`, `inventory` |
| Bills / receiving / inventory | `inventory`, `admin`, `super_admin` |
| Products (write + names) | `inventory`, `admin`, `super_admin` |
| Supply | `inventory`, `admin`, `super_admin`, `workshop` (own business only) |
| Deliveries / drivers | `delivery`, `admin`, `super_admin` |

### Shared: `UserResponse`

```json
{
  "id": "uuid",
  "role": "employee",
  "name": "string|null",
  "phone": "string|null",
  "email": "string|null",
  "location": "string|null",
  "locationId": "string|null",
  "deliveryBorder": { "centerLat": 33.51, "centerLng": 36.27, "radiusKm": 18 },
  "deliveryAddress": "string|null",
  "deliveryLat": "number|null",
  "deliveryLng": "number|null",
  "bio": "string|null",
  "avatarUrl": "string",
  "availableForWork": true,
  "verified": false,
  "onboardingCompleted": true,
  "canOrder": false
}
```

`deliveryBorder` is `null` when the user’s city has no circle. `avatarUrl` always resolves to a URL.

---

## 1. Auth (dashboard)

### `POST /auth/admin/login` — Public

**Request**

```json
{ "email": "admin@example.com", "password": "••••••••••••" }
```

**Response `200`**

```json
{ "requiresTwoFactor": true, "challengeToken": "…" }
```

### `POST /auth/admin/verify-2fa` — Public

Sets httpOnly `refreshToken` cookie (`path=/api/auth`).

**Request**

```json
{ "challengeToken": "…", "code": "123456" }
```

**Response `200`**

```json
{
  "accessToken": "…",
  "refreshToken": "…",
  "accessTokenExpiresAt": "ISO-8601",
  "user": { /* UserResponse */ }
}
```

---

## 2. Users & employees — `/admin`

Auth: `admin` | `super_admin`

### `GET /admin/users`

**Query:** `page`, `limit`, `role?`, `verified?` (`true`|`false`), `suspended?`, `q?`

**Response `200`:** `Paginated<UserResponse>` (app-facing roles)

### `PATCH /admin/users/:id`

**Request**

```json
{
  "verified": true,
  "suspended": false,
  "role": "employee"
}
```

All fields optional. `role` must be an app-selectable role.

**Response `200`:** `{ "user": { /* UserResponse */ } }`

### `GET /admin/employees`

**Query:** same as users

**Response `200`:** `Paginated<UserResponse>` (staff / non-app roles)

### `POST /admin/employees`

**Request**

```json
{
  "name": "أحمد",
  "role": "inventory",
  "email": "inv@example.com",
  "password": "at-least-12-chars",
  "phone": "+9639…"
}
```

- `name`, `role` required  
- Email+password required for most staff; `delivery` is phone-oriented

**Response `201`:** `{ "user": { /* UserResponse */ } }`

### `PATCH /admin/employees/:id`

**Request** (all optional)

```json
{
  "name": "…",
  "role": "admin",
  "email": "…",
  "password": "…",
  "phone": null,
  "verified": true,
  "suspended": false,
  "bio": null,
  "avatarUrl": null,
  "locationId": null
}
```

**Response `200`:** `{ "user": { /* UserResponse */ } }`

---

## 3. Roles — `/admin/roles`

Auth: `admin` | `super_admin`

### Role shapes

**AdminRoleResponse**

```json
{
  "id": "role-employee",
  "value": "employee",
  "label": "موظف",
  "description": "…",
  "iconUrl": "https://…",
  "visibleInApp": true,
  "system": true,
  "sortOrder": 10
}
```

### `GET /admin/roles`

**Response `200`:** `{ "items": [ /* AdminRoleResponse */ ] }`

### `POST /admin/roles`

**Request**

```json
{
  "value": "partner",
  "label": "شريك",
  "visibleInApp": true,
  "description": "…",
  "iconUrl": "https://…",
  "sortOrder": 50
}
```

- Required: `value` (`^[a-z][a-z0-9_]*$`), `label`, `visibleInApp`  
- Optional: `description`, `iconUrl`, `sortOrder`

**Response `201`:** `{ "role": { /* AdminRoleResponse */ } }`

### `PATCH /admin/roles/:id`

**Request** (all optional): `label`, `description`, `iconUrl`, `visibleInApp`, `sortOrder`

**Response `200`:** `{ "role": { /* AdminRoleResponse */ } }`

### `DELETE /admin/roles/:id`

**Response `200`:** `{ "success": true }`  
Fails for system roles or roles still in use.

---

## 4. Locations — `/admin/locations`

Auth: `admin` | `super_admin`

### AdminLocationResponse

```json
{
  "id": "loc-damascus",
  "name": "دمشق",
  "parentId": null,
  "sortOrder": 1,
  "active": true,
  "centerLat": 33.5138,
  "centerLng": 36.2765,
  "radiusKm": 18,
  "areas": [
    {
      "id": "loc-damascus-mazzeh",
      "name": "المزة",
      "parentId": "loc-damascus",
      "sortOrder": 1,
      "active": true,
      "centerLat": null,
      "centerLng": null,
      "radiusKm": null,
      "areas": []
    }
  ]
}
```

Delivery circle fields (`centerLat` / `centerLng` / `radiusKm`) apply to **cities** (`parentId: null`) only.

### `GET /admin/locations`

**Response `200`:** `{ "items": [ /* cities with nested areas */ ] }`

### `POST /admin/locations`

**Request**

```json
{
  "name": "حمص",
  "parentId": null,
  "sortOrder": 4,
  "active": true
}
```

`parentId` omitted/null = city; set to a city id = area.

**Response `201`:** `{ "location": { /* AdminLocationResponse */ } }`

### `PATCH /admin/locations/:id`

**Request** (all optional)

```json
{
  "name": "دمشق",
  "parentId": null,
  "sortOrder": 1,
  "active": true,
  "centerLat": 33.5138,
  "centerLng": 36.2765,
  "radiusKm": 18
}
```

**Response `200`:** `{ "location": { /* AdminLocationResponse */ } }`

### `DELETE /admin/locations/:id`

**Response `200`:** `{ "success": true }`

---

## 5. Categories — `/admin/categories`

Auth: `admin` | `super_admin`

`appliesTo`: `post` | `product` | `business` | `workshop` | `institute` | `store` | `workshop_institute` | `both`

### CategoryResponse

```json
{
  "id": "…",
  "name": "قمصان",
  "slug": "qumsan",
  "appliesTo": "both",
  "sortOrder": 10
}
```

### `GET /admin/categories`

**Query:** `appliesTo?` (filter)

**Response `200`:** `{ "items": [ /* CategoryResponse */ ] }`

### `POST /admin/categories`

**Request**

```json
{
  "name": "قمصان",
  "slug": "qumsan",
  "appliesTo": "both",
  "sortOrder": 10
}
```

Required: `name`, `slug` (`^[a-z][a-z0-9-]*$`), `appliesTo`

**Response `201`:** `{ "category": { /* CategoryResponse */ } }`

### `PATCH /admin/categories/:id`

**Request** (all optional): `name`, `slug`, `appliesTo`, `sortOrder`

**Response `200`:** `{ "category": { /* CategoryResponse */ } }`

### `DELETE /admin/categories/:id`

**Response `200`:** `{ "success": true }`

---

## 6. Post options — `/admin/post-options`

Auth: `admin` | `super_admin`

**Kinds:** `specialty` | `skill` | `work_type` | `salary_type` | `service_place` | `pricing` | `sell_method` | `price_method` | `condition` | `currency`  

**Post types:** `job_seeking` | `job_offering` | `service_offering` | `service_requesting` | `product_offering` | `material_offering` | `material_requesting` | `reel`

### PostOptionAdminItem

```json
{
  "id": "…",
  "kind": "specialty",
  "postTypes": ["job_offering", "job_seeking"],
  "label": "إنتاج/صناعة",
  "parentId": null,
  "sortOrder": 0,
  "active": true,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### `GET /admin/post-options`

**Query:** `kind?`, `type?`

**Response `200`:** `{ "items": [ /* PostOptionAdminItem */ ] }`

### `POST /admin/post-options`

**Request**

```json
{
  "kind": "skill",
  "postTypes": ["job_offering"],
  "label": "خياطة",
  "parentId": "opt-job-specialty-production",
  "sortOrder": 0,
  "active": true
}
```

Required: `kind`, `postTypes` (≥1), `label`. `parentId` required for skills.

**Response `201`:** `{ "option": { /* PostOptionAdminItem */ } }`

### `PATCH /admin/post-options/:id`

**Request** (all optional): `kind`, `postTypes`, `label`, `parentId`, `sortOrder`, `active`

**Response `200`:** `{ "option": { /* PostOptionAdminItem */ } }`

### `DELETE /admin/post-options/:id`

**Response `200`:** `{ "success": true }`

---

## 7. Posts — `/admin/posts`

Auth: `admin` | `super_admin`

### `GET /admin/posts`

**Query:** `page`, `limit`, `type?`, `authorId?`, `businessId?`, `location?`, `q?`, `active?` (`true`|`false`), `includeDeleted?` (default `false`)

**Response `200`:** `Paginated<PostResponse>`

`PostResponse` (main fields): `id`, `type`, `title`, `body`, `media`, `imageUrls`, `videoUrl`, `thumbnailUrl`, `location`, `active`, `createdAt`, `updatedAt`, option chips (`specialty`, `skills`, …), `categories`, `author`, `business`, `product`, `likes`, `comments`, `likedByMe`, `savedByMe`.

### `DELETE /admin/posts/:id`

**Response `200`:** `{ "post": { /* PostResponse */ }, "deleted": true }`  
Soft-delete; author is notified.

### `PATCH /admin/posts/:id/deactivate`

**Response `200`:** `{ "post": { /* active: false */ } }`

### `PATCH /admin/posts/:id/activate`

**Response `200`:** `{ "post": { /* active: true */ } }`

---

## 8. Shipping companies — `/admin/shipping-companies`

Auth: `admin` | `super_admin`

### ShippingCompanyResponse

```json
{
  "id": "…",
  "name": "شركة شحن",
  "location": "دمشق",
  "verified": false,
  "coverage": ["دمشق", "ريف دمشق"],
  "deliveryTime": "1-2 يوم",
  "pricing": "حسب الوزن",
  "fleet": "فان",
  "phone": "+9639…",
  "imageUrl": "https://…",
  "createdAt": "ISO-8601"
}
```

`imageUrl` always resolves to a URL (placeholder if empty).

### `GET /admin/shipping-companies`

**Query:** `page`, `limit`, `q?`, `location?`, `verified?`

**Response `200`:** `Paginated<ShippingCompanyResponse>`

### `GET /admin/shipping-companies/:id`

**Response `200`:** `{ "company": { /* ShippingCompanyResponse */ } }`

### `POST /admin/shipping-companies`

**Request**

```json
{
  "name": "…",
  "location": "دمشق",
  "coverage": ["دمشق"],
  "deliveryTime": "1-2 يوم",
  "phone": "+9639…",
  "verified": false,
  "pricing": "…",
  "fleet": "…",
  "imageUrl": "https://…"
}
```

Required: `name`, `location`, `coverage`, `deliveryTime`, `phone`

**Response `201`:** `{ "company": { /* … */ } }`

### `PATCH /admin/shipping-companies/:id`

**Request:** same fields, all optional (`imageUrl` may be `null`)

**Response `200`:** `{ "company": { /* … */ } }`

### `DELETE /admin/shipping-companies/:id`

**Response `200`:** `{ "success": true }`

---

## 9. Bills — `/bills` (staff)

Auth: `inventory` | `admin` | `super_admin`

### BillResponse

```json
{
  "id": "…",
  "number": "B-1001",
  "businessId": "…",
  "businessName": "…",
  "receivingId": "…",
  "paymentType": "cash",
  "status": "unpaid",
  "issuedAt": "ISO-8601",
  "dueAt": null,
  "total": 0,
  "paid": 0,
  "remaining": 0,
  "createdAt": "ISO-8601"
}
```

`status`: `paid` | `unpaid` | `partial` · `paymentType`: `cash` | `credit`

### `GET /bills/summary`

**Query:** `businessId?`

**Response `200`:** `{ "total", "paid", "remaining", "count" }`

### `GET /bills`

**Query:** `page`, `limit`, `businessId?`, `status?`, `q?`

**Response `200`:** `Paginated<BillResponse>`

### `GET /bills/:id`

**Response `200`**

```json
{
  "bill": { /* BillResponse */ },
  "lines": [{ "id", "productId", "productName", "quantity", "unitPrice", "total" }],
  "payments": [{ "id", "amount", "paidAt", "recordedBy", "recordedByName" }],
  "business": { "id", "name", "type", "location", "verified" },
  "receiving": { "id", "number", "receivedAt" }
}
```

### `POST /bills/:id/payments`

**Request**

```json
{ "amount": 50000 }
```

**Response `201`:** `{ "payment": { /* … */ }, "bill": { /* BillResponse */ } }`

---

## 10. Receiving — `/receiving` (staff)

Auth: `inventory` | `admin` | `super_admin`

### ReceivingResponse

```json
{
  "id": "…",
  "number": "R-1001",
  "businessId": "…",
  "businessName": "…",
  "receivedAt": "ISO-8601",
  "paymentType": "cash",
  "total": 0,
  "createdAt": "ISO-8601"
}
```

### `GET /receiving`

**Query:** `page`, `limit`, `businessId?`

**Response `200`:** `Paginated<ReceivingResponse>`

### `GET /receiving/:id`

**Response `200`:** `{ "receiving", "lines": [{ "id", "productId", "productName", "quantity", "unitPrice" }], "bill" }`

### `POST /receiving`

**Request**

```json
{
  "businessId": "…",
  "paymentType": "cash",
  "lines": [
    { "productId": "…", "quantity": 10, "unitPrice": 45000 }
  ]
}
```

- `lines`: 1–100 items, `quantity ≥ 1`, `unitPrice ≥ 0`  
- Creates receiving + bill and updates stock

**Response `201`:** `{ "receiving": { /* + lines */ }, "bill": { /* + lines */ } }`

---

## 11. Inventory — `/inventory` (staff)

Auth: `inventory` | `admin` | `super_admin`

### InventoryItemResponse

```json
{
  "id": "…",
  "productId": "…",
  "productName": "…",
  "productUnit": "قطعة",
  "sent": 0,
  "remaining": 0,
  "sold": 0,
  "unitPrice": 0,
  "isLowStock": false,
  "updatedAt": "ISO-8601"
}
```

### `GET /inventory`

**Query:** `page`, `limit`, `category?`, `q?`, `lowStock?`

**Response `200`**

```json
{
  "items": [ /* InventoryItemResponse */ ],
  "totals": {
    "productCount": 0,
    "sent": 0,
    "remaining": 0,
    "sold": 0,
    "money": { "sent": 0, "paid": 0, "remaining": 0 }
  },
  "total": 0,
  "page": 1,
  "limit": 20
}
```

### `GET /inventory/:id`

**Response `200`:** `{ "item", "movements": [{ "id", "type", "quantity", "reference", "createdAt" }] }`

---

## 12. Supply — `/supply` (staff + workshop)

Auth: `inventory` | `admin` | `super_admin` | `workshop` (scoped)

### `GET /supply`

**Query:** `q?`, `category?`, `lowStock?`

**Response `200`:** `{ "items", "totals", "total" }` (no pagination; same item/totals shape as inventory)

---

## 13. Deliveries — `/deliveries` · Drivers — `/drivers`

Auth: `delivery` | `admin` | `super_admin`

### DeliveryResponse

```json
{
  "id": "…",
  "number": "D-1001",
  "status": "unassigned",
  "area": "دمشق",
  "driverId": null,
  "driverName": null,
  "orderCount": 0,
  "createdAt": "ISO-8601",
  "deliveredAt": null
}
```

`status`: `unassigned` | `in_transit` | `delivered` | `failed`

### `GET /deliveries`

**Query:** `page`, `limit`, `status?`, `driverId?`, `area?`, `q?`

**Response `200`:** `Paginated<DeliveryResponse>`

### `GET /deliveries/:id`

**Response `200`**

```json
{
  "delivery": { /* DeliveryResponse */ },
  "orders": [
    {
      "id": "…",
      "number": "…",
      "status": "review",
      "statusColor": "#F59E0B",
      "storeName": "…",
      "pieces": 0,
      "total": 0,
      "address": "…",
      "lat": 33.51,
      "lng": 36.27
    }
  ],
  "driver": { "id", "name", "phone", "lat", "lng" }
}
```

`driver` may be `null`.

### `POST /deliveries`

**Request**

```json
{ "orderIds": ["…", "…"] }
```

1–100 order ids.

**Response `201`:** `{ "delivery": { /* DeliveryResponse */ } }`

### `PATCH /deliveries/:id`

**Request**

```json
{ "driverId": "…", "area": "المزة" }
```

**Response `200`:** `{ "delivery": { /* … */ } }`

### `PATCH /deliveries/:id/status`

**Request**

```json
{ "status": "in_transit" }
```

**Response `200`:** `{ "delivery": { /* … */ } }`

### `GET /drivers`

**Response `200`:** `{ "items": [{ "id", "name", "phone", "lat", "lng" }] }`

---

## 14. Products (staff writes) — `/products`

Auth for write + names: `inventory` | `admin` | `super_admin`  
Public browse endpoints (`GET /products`, `GET /products/:id`, similar) are **not** listed here.

### ProductResponse (main fields)

```json
{
  "id": "…",
  "name": "…",
  "category": "…",
  "description": null,
  "images": ["/uploads/products/…"],
  "unit": "قطعة",
  "price": 45000,
  "inWarehouse": true,
  "available": true,
  "guarantee": false,
  "supplierBusinessId": null,
  "variants": { "axes": [], "options": [] },
  "colorImages": [],
  "packaging": null,
  "discount": null,
  "offer": null,
  "saleRule": {
    "lockedAxis": "color",
    "label": "لون",
    "options": ["أحمر", "أزرق", "أبيض"],
    "optionCount": 3
  },
  "createdAt": "ISO-8601"
}
```

Units: `قطعة` | `متر` | `طقم` | `دورة`

**`saleRule`:** `null` for normal picking. When set, qty **1** buys **every** option of `lockedAxis` (`color` or `size`); the app must **not** let the user pick that axis. The other axis (if any) stays selectable. Admin sets it as `{ "lockedAxis": "color" }` (or `"size"`); the API expands `label` / `options` / `optionCount` from `variants`.

### `GET /products/names`

**Response `200`:** `{ "items": [{ "id", "name" }] }`

### `POST /products` — `multipart/form-data`

**Fields:** `name`, `category`, `unit`, `price` (required); `description?`, `variants?` (JSON string), `packaging?`, `saleRule?` (JSON `{ "lockedAxis": "color"|"size" }`), `discount?`, `offer?`, `guarantee?`, `supplierBusinessId?`  
**Files:** `images` (≤8), plus variant file fields (`variant_<i>`, …)

**Response:** `{ "product": { /* ProductResponse */ } }`

### `PATCH /products/:id` — `multipart/form-data`

Same fields as create, all optional. Pass `saleRule: null` to clear the rule.

**Response:** `{ "product": { /* ProductResponse */ } }`

### `DELETE /products/:id`

**Response:** `{ "product": { /* … */ }, "softDeleted": true }`

---

## Quick index

| Method | Path |
| --- | --- |
| POST | `/auth/admin/login` |
| POST | `/auth/admin/verify-2fa` |
| GET/PATCH | `/admin/users`, `/admin/users/:id` |
| GET/POST/PATCH | `/admin/employees`, `/admin/employees/:id` |
| GET/POST/PATCH/DELETE | `/admin/roles` |
| GET/POST/PATCH/DELETE | `/admin/locations` |
| GET/POST/PATCH/DELETE | `/admin/categories` |
| GET/POST/PATCH/DELETE | `/admin/post-options` |
| GET/DELETE/PATCH | `/admin/posts`, `…/deactivate`, `…/activate` |
| CRUD | `/admin/shipping-companies` |
| GET/POST | `/bills`, `/bills/summary`, `/bills/:id/payments` |
| GET/POST | `/receiving` |
| GET | `/inventory`, `/inventory/:id`, `/supply` |
| CRUD-ish | `/deliveries`, `/drivers` |
| GET/POST/PATCH/DELETE | `/products/names`, `/products` (staff) |

Live OpenAPI: `/api/docs` (when `SWAGGER_ENABLED=true`).
