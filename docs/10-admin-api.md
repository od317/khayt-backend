# Admin & dashboard staff API

Request/response reference for the dashboard and staff tools.

- **Base URL:** `/api`
- **Auth:** `Authorization: Bearer <accessToken>` unless marked **Public**
- **No envelope:** bodies are returned as shown (Nest may wrap errors as `{ error, message, fields?, statusCode }`)
- **Pagination:** `page` (default 1), `limit` (default 20, max 100) → `{ items, total, page, limit }`

### Possible errors (any authenticated route)

| Status | Body shape | When |
| --- | --- | --- |
| `401` | `{ "error": "unauthorized", "message": "…" }` | Missing/invalid token |
| `403` | `{ "error": "forbidden", "message": "…" }` | Wrong role |
| `404` | `{ "error": "not_found", "message": "…" }` | Unknown id |
| `400` | `{ "error": "validation_failed", "message": "…", "fields": { … } }` | Bad body/query |
| `409` | `{ "error": "…", "message": "…" }` | Conflict (e.g. duplicate role value) |

### Who can call what

| Surface | Roles |
| --- | --- |
| `/admin/*` | `admin`, `super_admin` |
| `/auth/admin/*` login | Public; accounts: `admin`, `super_admin`, `inventory` |
| Bills / receiving / inventory | `inventory`, `admin`, `super_admin` |
| Products (write + names) | `inventory`, `admin`, `super_admin` |
| Orders (list / status / pick lines) | staff see all; `store`/`workshop` see own; create = `store`/`workshop` only |
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

**Possible:** `400`, `401` (bad credentials)

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

**Possible:** `400`, `401` (invalid/expired challenge or code)

### Creating a dashboard admin

On the production VPS, run the command in the API container:

```sh
docker compose -f docker-compose.prod.yml exec api npm run admin:create
```

Enter the admin email and password when prompted. The password is not echoed
or passed in the shell command. This creates an account with the `admin` role
only; it refuses to modify an account that already uses that email. Login also
requires working SMTP configuration so the 2FA code can be delivered.

---

## 2. Users & employees — `/admin`

Auth: `admin` | `super_admin`

### App user creation (not under `/admin`)

There is **no** `POST /admin/users`. End-user accounts are created via phone OTP (any role that registers through the app):

| Step | Endpoint | Request | Response |
| --- | --- | --- | --- |
| 1. Send code | `POST /auth/request-code` — Public | `{ "phone": "+9639…" }` | `{ "sent": true }` |
| 2. Verify | `POST /auth/verify` — Public | `{ "phone": "+9639…", "code": "000000", "fcmToken?" }` | `{ "accessToken", "refreshToken", "accessTokenExpiresAt", "user", "isNewUser" }` |
| 3. Onboarding | `POST /auth/onboarding` — Bearer | role + profile fields (see app docs) | `{ "user", "business?" }` |

Admin can then **list / verify / suspend / change role** of those users with the endpoints below. Staff dashboard accounts are created with `POST /admin/employees`.

### `GET /admin/users`

**Query:** `page`, `limit`, `role?`, `verified?` (`true`|`false`), `suspended?`, `q?`

**Response `200`**

```json
{
  "items": [{ /* UserResponse — app roles */ }],
  "total": 120,
  "page": 1,
  "limit": 20
}
```

**Possible:** `401`, `403`

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

**Response `200`**

```json
{ "user": { /* UserResponse */ } }
```

**Possible:** `400`, `401`, `403`, `404`

### `GET /admin/employees`

**Query:** same as users

**Response `200`**

```json
{
  "items": [{ /* UserResponse — staff roles */ }],
  "total": 8,
  "page": 1,
  "limit": 20
}
```

**Possible:** `401`, `403`

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

**Response `201`**

```json
{ "user": { /* UserResponse */ } }
```

**Possible:** `400`, `401`, `403`, `409`

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

**Response `200`**

```json
{ "user": { /* UserResponse */ } }
```

**Possible:** `400`, `401`, `403`, `404` (cannot demote/suspend `super_admin`)

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

### PostResponse

Same shape as public post endpoints. Uploaded media paths are relative (e.g. `/uploads/posts/….mp4`); prefix the API host to open them.

```json
{
  "id": "uuid-or-seed-id",
  "type": "reel",
  "title": "string|null",
  "body": "string",
  "media": "none|image|video",
  "imageUrls": ["/uploads/posts/a.jpg"],
  "videoUrl": "/uploads/posts/5a8aa068-….mp4",
  "thumbnailUrl": "/uploads/posts/5a8aa068-….thumb.jpg",
  "location": "string|null",
  "active": true,
  "approvalStatus": "pending",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "specialty": "string|null",
  "skills": [],
  "workType": [],
  "experience": "string|null",
  "salary": "string|null",
  "salaryType": "string|null",
  "pricing": "string|null",
  "servicePlace": "string|null",
  "sellMethod": "string|null",
  "priceMethod": "string|null",
  "condition": "string|null",
  "price": "string|null",
  "currency": "string|null",
  "categories": [{ "id": "…", "name": "…", "slug": "…" }],
  "author": {
    "id": "user-id",
    "name": "أحمد الصالح",
    "phone": "+963992966711",
    "role": "employee",
    "location": "دمشق",
    "avatarUrl": null
  },
  "business": {
    "id": "biz-id",
    "name": "…",
    "type": "workshop",
    "location": "…",
    "verified": true
  },
  "product": null,
  "likes": 0,
  "comments": 0,
  "likedByMe": false,
  "savedByMe": false
}
```

| Field | Notes |
| --- | --- |
| `type` | `job_seeking` \| `job_offering` \| `service_offering` \| `service_requesting` \| `product_offering` \| `material_offering` \| `material_requesting` \| `reel` (nullable in DB but normally set) |
| `approvalStatus` | `pending` \| `approved` \| `rejected` |
| `author.phone` | E.164 string or `null` (e.g. email-only superadmin) |
| `author.name` / `author.location` / `author.avatarUrl` | nullable |
| `business` / `product` | nullable whole objects |
| `videoUrl` / `thumbnailUrl` | nullable; may be absolute external URLs (seed) or `/uploads/…` paths |

**Moderation:** create/update by authors sets `approvalStatus: pending`. Public feed is `active` + `approved` only. Use `GET /admin/posts?approvalStatus=pending` for the moderation queue.

### `GET /admin/posts`

**Query:** `page`, `limit`, `type?` (one or many / comma-separated), `authorId?`, `businessId?`, `location?`, `q?`, `active?` (`true`\|`false`), `approvalStatus?` (`pending`\|`approved`\|`rejected`), `includeDeleted?` (default `false`)

**Response `200`**

```json
{
  "items": [{ /* PostResponse */ }],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

Pending queue: `GET /admin/posts?approvalStatus=pending`

**Possible:** `401`, `403`

### `PATCH /admin/posts/:id/approve`

**Request:** none (empty body)

**Response `200`**

```json
{ "post": { /* PostResponse */, "approvalStatus": "approved" } }
```

Author gets `post_moderated` notification. Public when also `active: true`.

**Possible:** `401`, `403`, `404`

### `PATCH /admin/posts/:id/reject`

**Request:** none

**Response `200`**

```json
{ "post": { /* PostResponse */, "approvalStatus": "rejected" } }
```

Author notified. Author edit resets status to `pending`.

**Possible:** `401`, `403`, `404`

### `DELETE /admin/posts/:id`

**Response `200`**

```json
{ "post": { /* PostResponse */ }, "deleted": true }
```

Soft-delete (`deletedAt`); author notified.

**Possible:** `401`, `403`, `404`

### `PATCH /admin/posts/:id/deactivate`

**Response `200`**

```json
{ "post": { /* PostResponse */, "active": false } }
```

Author notified. Hidden from public listings.

**Possible:** `401`, `403`, `404`

### `PATCH /admin/posts/:id/activate`

**Response `200`**

```json
{ "post": { /* PostResponse */, "active": true } }
```

Public only if `approvalStatus` is also `approved`.

**Possible:** `401`, `403`, `404`

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
    "mode": "locked_axis",
    "lockedAxis": "color",
    "label": "لون",
    "options": ["أحمر", "أزرق", "أبيض"],
    "optionCount": 3
  },
  "createdAt": "ISO-8601"
}
```

Units: `قطعة` | `متر` | `طقم` | `دورة`

**`saleCase` (always on product list/detail):** FE should switch UI on this enum:

| `saleCase` | Meaning |
|------------|---------|
| `free` | Every color: pick color + size |
| `mixed` | Some colors free size, some colors admin `sizePack` |
| `color_size_pack` | Size pack for all colors (product rule or every color has `sizePack`) |
| `color_pair_pack` | Pick color + one or more seconds (`pairColor` / `pairColors[]`); sizes forced |
| `locked_axis` | Locked set on one axis; pick the other only |

**Per-color size rules (same product):** on each `variants.options[]` color, optional `sizePack: { sizes, qtyPerSize }`.  
- No `sizePack` → buyer picks `{ color, size }` (optional `discountPercent` on that color).  
- With `sizePack` → buyer sends `{ color }` only; qty = packs.  
`colorImages[]` exposes `sizeMode` (`free`|`pack`), `sizePack`, `unitsPerPack`, `packPrice`, `originalPrice`, `price`.

**`packPrice`:** product-level when `saleCase` is `color_size_pack` / `color_pair_pack` (`price × unitsPerPack`); null for free/mixed/locked. For `mixed`, use each color’s `colorImages[].packPrice`.

**Product `saleRule`:** `null` for `free`/`mixed`. Product-wide modes:

| mode | Admin sets | Buyer cart variant | Cart quantity |
|------|------------|--------------------|---------------|
| `locked_axis` | `{ "mode":"locked_axis", "lockedAxis":"color"\|"size" }` | unlocked axis only | pieces |
| `color_size_pack` | + `sizePack` | `{ color }` | packs |
| `color_pair_pack` | + `sizePack` + `pairWith` (or legacy `allowedPairColors`) | `{ color, pairColor }` or `{ color, pairColors: [...] }` → one cart line per second | packs |

There is **no** `/admin/products` — use `/products` with staff roles. `saleCase` is computed; do not send it.

### `GET /products/names`

**Response `200`**

```json
{ "items": [{ "id": "prod-sale-pair", "name": "طقم لونين" }] }
```

**Possible:** `401`, `403`

### `POST /products` — `multipart/form-data`

**Common fields:** `name`, `category`, `unit`, `price` (required); `description?`, `variants?` (JSON **string**), `saleRule?` (JSON **string**), `packaging?`, `discount?`, `offer?`, `guarantee?`, `supplierBusinessId?`  
**Files:** `images` (≤8), plus variant file fields

**Response `201` (all cases)**

```json
{ "product": { /* ProductResponse — includes saleCase, packPrice, colorImages, saleRule */ } }
```

**Possible:** `400` (validation / bad saleRule), `401`, `403`

#### Case A — `free` (`saleRule` omitted)

`variants` JSON:

```json
{
  "axes": [
    { "key": "color", "label": "لون" },
    { "key": "size", "label": "قياس" }
  ],
  "options": [
    {
      "name": "أحمر",
      "hex": "#DC2626",
      "discountPercent": 10,
      "children": [{ "name": "M" }, { "name": "L" }, { "name": "XL" }]
    },
    {
      "name": "أزرق",
      "hex": "#2563EB",
      "children": [{ "name": "M" }, { "name": "L" }, { "name": "XL" }]
    }
  ]
}
```

**Resulting product:** `"saleCase": "free"`, `"saleRule": null`, `"packPrice": null`

#### Case B — `mixed` (no product `saleRule`; pack on some colors)

```json
{
  "axes": [
    { "key": "color", "label": "لون" },
    { "key": "size", "label": "قياس" }
  ],
  "options": [
    {
      "name": "أحمر",
      "discountPercent": 10,
      "children": [{ "name": "M" }, { "name": "L" }, { "name": "XL" }]
    },
    {
      "name": "أسود",
      "sizePack": { "sizes": ["M", "L", "XL"], "qtyPerSize": 5 },
      "children": [{ "name": "M" }, { "name": "L" }, { "name": "XL" }]
    }
  ]
}
```

**Resulting product:** `"saleCase": "mixed"`; pack color has `colorImages[].sizeMode: "pack"`

#### Case C — `color_size_pack`

`saleRule`:

```json
{
  "mode": "color_size_pack",
  "sizePack": { "sizes": ["M", "L", "XL"], "qtyPerSize": 5 }
}
```

Plus `variants` with color options (as in free).

**Resulting product:** `"saleCase": "color_size_pack"`, product-level `packPrice`

#### Case D — `color_pair_pack`

`saleRule`:

```json
{
  "mode": "color_pair_pack",
  "sizePack": { "sizes": ["M", "L", "XL"], "qtyPerSize": 5 },
  "pairWith": {
    "أحمر": ["أزرق", "أسود"],
    "أزرق": ["أحمر", "أسود"],
    "أسود": ["أحمر", "أزرق"]
  }
}
```

**Resulting product:** `"saleCase": "color_pair_pack"`, `packPrice` for two-color pack  
Buyer cart: `POST /cart/items` with `pairColor` or `pairColors[]` → `{ "items": [ … ] }` (see `docs/11-sale-cases-ui.md`)

#### Case E — `locked_axis`

`saleRule`: `{ "mode": "locked_axis", "lockedAxis": "color" }`

**Resulting product:** `"saleCase": "locked_axis"`

### `PATCH /products/:id` — `multipart/form-data`

Same fields as create, all optional. Pass `saleRule` empty/`null` to clear (back to free/mixed from variants).

**Response `200`**

```json
{ "product": { /* ProductResponse */ } }
```

**Possible:** `400`, `401`, `403`, `404`

### `DELETE /products/:id`

**Response `200`**

```json
{ "product": { /* ProductResponse */ }, "softDeleted": true }
```

**Possible:** `401`, `403`, `404`

---

## 15. Orders — `/orders`

Orders are shared between the app and the dashboard (not under `/admin/orders`).

| Who | What they can do |
| --- | --- |
| `admin`, `super_admin`, `inventory`, `delivery` | List **all** orders, open detail, change status (per transition rules), SSE feeds |
| `inventory`, `admin`, `super_admin` | Mark lines `picked` while status is `preparing` |
| `store`, `workshop` | List/detail **own** orders; **create** orders; cancel when allowed |

Statuses: `review` → `preparing` → `ready` → `in_transit` → `delivered` (also `cancelled` / `failed`).

### OrderListItemResponse

```json
{
  "id": "uuid",
  "number": "ORD-1001",
  "status": "review",
  "statusColor": "#F59E0B",
  "total": 1350000,
  "pieces": 30,
  "address": "دمشق…",
  "lat": 33.5138,
  "lng": 36.2765,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "store": { "id": "…", "name": "…" }
}
```

### OrderDetailResponse

```json
{
  "order": {
    "id": "uuid",
    "number": "ORD-1001",
    "status": "review",
    "statusColor": "#F59E0B",
    "total": 1350000,
    "pieces": 30,
    "address": "…",
    "lat": 33.5138,
    "lng": 36.2765,
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601",
    "canCancel": true,
    "canAdvance": true
  },
  "store": { "id": "…", "name": "…", "phone": "+9639…" },
  "lines": [
    {
      "id": "uuid",
      "productId": "prod-sale-pair",
      "productName": "طقم لونين",
      "productImage": "/uploads/products/…",
      "quantity": 1,
      "unitPrice": 45000,
      "picked": false,
      "variant": { "color": "أحمر", "pairColor": "أزرق" }
    }
  ],
  "delivery": null,
  "whatsapp": "…",
  "phone": "…"
}
```

### `GET /orders`

**Query:** `page`, `limit`, `status?`, `active?` (default hides delivered/cancelled/failed; `false` = only those), `storeId?`, `q?`

**Response `200`**

```json
{
  "items": [{ /* OrderListItemResponse */ }],
  "total": 40,
  "page": 1,
  "limit": 20
}
```

**Possible:** `401`, `403`

### `GET /orders/:id`

**Response `200`:** OrderDetailResponse (as above)

**Possible:** `401`, `403`, `404`

### `POST /orders` — `store` | `workshop` only

Creates an order directly (cart checkout is `POST /cart/checkout` — preferred for sale-mode packs).

**Request**

```json
{
  "lines": [
    {
      "productId": "prod-sale-pair",
      "quantity": 1,
      "variant": { "color": "أحمر", "pairColor": "أزرق" }
    }
  ],
  "address": "شارع بغداد، بناء 12",
  "lat": 33.5138,
  "lng": 36.2765
}
```

`address` / `lat` / `lng` required on first order (or when changing pin). Outside city `deliveryBorder` → `400` on `lat`/`lng`.

**Response `201`:** OrderDetailResponse  
Staff (`admin` / `inventory` / …) are notified (`order_placed`).

**Possible:** `400`, `401`, `403`

### `PATCH /orders/:id/status`

**Request**

```json
{ "status": "preparing" }
```

**Response `200`**

```json
{ "order": { /* OrderListItemResponse */ } }
```

Store is notified (`order_status` / `order_cancelled`), except `in_transit` (no status push).

**Possible:** `400` (`invalid_transition`), `401`, `403`, `404`

### `PATCH /orders/:id/lines/:lineId` — pick line

Auth: `inventory` | `admin` | `super_admin`. Order must be `preparing`.

**Request**

```json
{ "picked": true }
```

**Response `200`**

```json
{
  "line": {
    "id": "…",
    "productId": "…",
    "productName": "…",
    "productImage": null,
    "quantity": 1,
    "unitPrice": 45000,
    "picked": true,
    "variant": { "color": "أحمر", "pairColor": "أزرق" }
  }
}
```

**Possible:** `400` (`invalid_state`), `401`, `403`, `404`

### `GET /orders/stream` — SSE (staff feed)

Live status events for the dashboard feed.  
Events: `type: "status"` (payload) · `type: "ping"` heartbeat.

**Possible:** `401`

### `GET /orders/:id/stream` — SSE (one order)

Same event types; requires read access to that order.

**Possible:** `401`, `403`, `404`

---

## 16. Notifications — `/notifications`

Auth: any logged-in user (including `admin` / `super_admin`). Inbox is **per authenticated user** — there is no separate admin-only notifications API. Moderating a post creates a `post_moderated` row for the **author**. New orders notify staff; status changes notify the store.

### NotificationResponse

```json
{
  "id": "notif-1",
  "type": "post_moderated",
  "title": "تمت الموافقة على منشورك",
  "body": "…",
  "linkTo": "/posts/post-1",
  "read": false,
  "createdAt": "ISO-8601"
}
```

**`type` values:** `order_placed` | `order_status` | `order_delivered` | `order_cancelled` | `new_comment` | `new_like` | `receiving_confirmed` | `post_moderated`

### `GET /notifications`

**Query:** `page`, `limit`, `unreadOnly?` (`true`|`false`)

**Response `200`**

```json
{
  "items": [{ /* NotificationResponse */ }],
  "total": 12,
  "page": 1,
  "limit": 20,
  "unreadCount": 3
}
```

**Possible:** `401`

### `PATCH /notifications/:id/read`

**Request:** none

**Response `200`**

```json
{ "notification": { /* NotificationResponse */, "read": true } }
```

**Possible:** `401`, `404` (not owned / missing)

### `PATCH /notifications/read-all`

**Request:** none

**Response `200`**

```json
{ "updated": true }
```

(`updated: false` if nothing was unread)

**Possible:** `401`

### `DELETE /notifications/:id`

**Response `200`**

```json
{ "deleted": true }
```

**Possible:** `401`, `404`

### `DELETE /notifications/all`

**Response `200`**

```json
{ "deleted": true }
```

(`deleted: false` if inbox already empty)

**Possible:** `401`

### `GET /notifications/stream` — SSE

**Auth:** Bearer token (same as other routes).  
**Response:** `text/event-stream`

- Event `type: "notification"` → `data` is a `NotificationResponse` object  
- Event `type: "ping"` → heartbeat every ~30s (ignore)

Nginx must disable buffering for this path (see stack notes).

**Possible:** `401` (stream closes)

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
| GET/DELETE/PATCH | `/admin/posts`, `…/approve`, `…/reject`, `…/deactivate`, `…/activate` |
| CRUD | `/admin/shipping-companies` |
| GET/POST | `/bills`, `/bills/summary`, `/bills/:id/payments` |
| GET/POST | `/receiving` |
| GET | `/inventory`, `/inventory/:id`, `/supply` |
| CRUD-ish | `/deliveries`, `/drivers` |
| GET/POST/PATCH/DELETE | `/products/names`, `/products` (staff — all sale cases) |
| GET/POST/PATCH | `/orders`, `/orders/:id`, `/orders/:id/status`, `/orders/:id/lines/:lineId` |
| GET (SSE) | `/orders/stream`, `/orders/:id/stream` |
| POST (app users) | `/auth/request-code`, `/auth/verify`, `/auth/onboarding` |
| GET/PATCH/DELETE | `/notifications`, `…/read`, `…/read-all`, `…/all` |
| GET (SSE) | `/notifications/stream` |

Live OpenAPI: `/api/docs` (when `SWAGGER_ENABLED=true`).
