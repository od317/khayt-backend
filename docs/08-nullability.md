# خيط — API Nullability

> For each request: which response fields can be `null`, and which request
> fields may be omitted (optional) or sent as `null`.
>
> Source of truth: response mappers (`*mapper.ts`) and DTOs (`@IsOptional`).
> Global prefix: `/api`.
>
> **Defaults:** some image fields are never `null` in JSON — the API fills a
> placeholder URL when the DB value is missing (see notes under each shape).

---

## How to read this

- **Response can be null** — Flutter must treat as nullable (`T?`).
- **Request optional** — field may be omitted; empty string is often transformed to omitted.
- **Request nullable** — field may be sent as JSON `null` on purpose (e.g. clear a link).
- `(none)` — no nullable / optional fields beyond auth headers.
- Shared shapes are defined once, then referenced by endpoint.

---

## Shared response shapes

### DeliveryBorder

| Field | Can be null |
|-------|-------------|
| `centerLat`, `centerLng`, `radiusKm` | no (all required when the object is present) |

When the whole `deliveryBorder` is `null`, there is no geo circle (e.g. خارج سوريا / عمل عن بعد, or location not set).

### UserResponse

| Field | Can be null |
|-------|-------------|
| `name` | yes |
| `phone` | yes |
| `email` | yes |
| `location` | yes (display name string) |
| `locationId` | yes |
| `deliveryBorder` | yes (whole object) |
| `deliveryAddress` | yes |
| `deliveryLat` | yes |
| `deliveryLng` | yes |
| `bio` | yes |
| `avatarUrl` | **no** — API always returns a URL (person placeholder if missing) |
| `id`, `role`, `availableForWork`, `verified`, `onboardingCompleted`, `canOrder` | no |

### BusinessResponse

| Field | Can be null |
|-------|-------------|
| `description` | yes |
| `phone` | yes |
| `capacity` | yes |
| `equipment` | yes |
| `minOrder` | yes |
| `experience` | yes |
| `duration` | yes |
| `imageUrl` | **no** — API always returns a URL (building placeholder if missing) |
| `id`, `type`, `name`, `location`, `verified`, `services[]`, `topics[]`, `categories[]`, `createdAt` | no |

### PublicEmployeeCard (marketers list / profile similar)

| Field | Can be null |
|-------|-------------|
| `name` | yes |
| `bio` | yes |
| `location` | yes |
| `avatarUrl` | **no** — API always returns a URL (person placeholder if missing) |
| `id`, `verified`, `availableForWork` | no |

### ProductResponse

| Field | Can be null |
|-------|-------------|
| `description` | yes |
| `supplierBusinessId` | yes |
| `offer` | yes |
| `colorImages[].hex` | yes |
| `id`, `name`, `category`, `images[]`, `unit`, `price`, `inWarehouse`, `available`, `guarantee`, `variants`, `colorImages[]`, `packaging`, `discount`, `createdAt` | no |
| **`saleRule`** | **yes** — `null` when the product is sold with normal per-option picking; otherwise `{ lockedAxis, label, options[], optionCount }` |

### PostResponse

| Field | Can be null |
|-------|-------------|
| `type` | yes |
| `title` | yes |
| `videoUrl` | yes |
| `thumbnailUrl` | yes |
| `location` | yes |
| `specialty` | yes |
| `experience` | yes |
| `salary` | yes |
| `salaryType` | yes |
| `pricing` | yes |
| `servicePlace` | yes |
| `sellMethod` | yes |
| `priceMethod` | yes |
| `condition` | yes |
| `price` | yes |
| `currency` | yes |
| `business` | yes (whole object) |
| `product` | yes (whole object) |
| `author.name` | yes |
| `author.location` | yes |
| `author.avatarUrl` | yes (raw DB; **no** placeholder applied here) |
| `id`, `body`, `media`, `imageUrls[]`, `active`, `createdAt`, `updatedAt`, `skills[]`, `workType[]`, `categories[]`, `likes`, `comments`, `likedByMe`, `savedByMe` | no |

### CommentResponse

| Field | Can be null |
|-------|-------------|
| `parentId` | yes |
| `author.name` | yes |
| `author.avatarUrl` | yes (raw DB; **no** placeholder applied here) |
| `replies[]` | same shape (recursive) |

### CartItemResponse

| Field | Can be null |
|-------|-------------|
| `variant` | yes |
| `unavailableReason` | yes |
| `product.variantImage` | yes |

### OrderListItemResponse

| Field | Can be null |
|-------|-------------|
| `lat` | yes |
| `lng` | yes |
| `store.name` | yes |

### OrderDetailResponse

| Field | Can be null |
|-------|-------------|
| `order.lat` | yes |
| `order.lng` | yes |
| `store.name` | yes |
| `store.phone` | yes |
| `lines[].productImage` | yes |
| `lines[].variant` | yes |
| `delivery` | yes (whole object) |
| `delivery.driver` | yes (when `delivery` present) |
| `delivery.driver.name` | yes |
| `delivery.driver.phone` | yes |

### NotificationResponse

| Field | Can be null |
|-------|-------------|
| `linkTo` | yes |

### DeliveryResponse

| Field | Can be null |
|-------|-------------|
| `driverId` | yes |
| `driverName` | yes |
| `deliveredAt` | yes |

### DriverResponse

| Field | Can be null |
|-------|-------------|
| `name` | yes |
| `phone` | yes |
| `lat` | yes |
| `lng` | yes |

### InventoryMovementResponse

| Field | Can be null |
|-------|-------------|
| `reference` | yes |

### BillResponse

| Field | Can be null |
|-------|-------------|
| `dueAt` | yes |

### PaymentResponse

| Field | Can be null |
|-------|-------------|
| `recordedByName` | yes |

### ShippingCompanyResponse

| Field | Can be null |
|-------|-------------|
| `pricing` | yes |
| `fleet` | yes |
| `imageUrl` | **no** — API always returns a URL (building placeholder if missing) |
| `id`, `name`, `location`, `verified`, `coverage[]`, `deliveryTime`, `phone`, `createdAt` | no |

### CityResponse / CityFlatResponse (locations)

| Field | Can be null |
|-------|-------------|
| `deliveryBorder` | yes (whole object) |
| `id`, `name` | no |
| `areas[]` (CityResponse only) | no (may be empty) |

### PostOptionItem

| Field | Can be null |
|-------|-------------|
| `parentId` | yes |

---

## Auth — `/api/auth`

### POST `/api/auth/request-code`

- **Response can be null:** (none)
- **Request optional:** (none) — `phone` required

### POST `/api/auth/verify`

- **Response can be null:** `user` → UserResponse nullables
- **Request optional:** `fcmToken`

### POST `/api/auth/refresh`

- **Response can be null:** (none)
- **Request optional:** (none)

### POST `/api/auth/logout`

- **Response can be null:** (none)
- **Request optional:** (none)

### GET `/api/auth/me`

- **Response can be null:**
  - `user` → UserResponse nullables (`locationId`, `deliveryBorder`, profile scalars)
  - **`business`** (whole object — null when user has no business)
  - when `business` present → BusinessResponse nullables
- **Request optional:** (none)

### PATCH `/api/auth/me`

- **Response can be null:** `user` → UserResponse nullables; `business` (null if user has no business)
- **Request optional:** `name`, `bio`, `availableForWork`, `avatarUrl`, `image` (multipart file), `locationId`, `deliveryAddress`, `deliveryLat`, `deliveryLng`, `description`, `services`
  Empty `deliveryAddress` / null coords are treated as omitted.
  Uploaded `image` sets `user.avatarUrl` and syncs `business.imageUrl` for workshop/store/institute.

### PATCH `/api/auth/me/available-for-work`

- **Response can be null:** `user` → UserResponse nullables
- **Request optional:** (none) — `availableForWork` required

### DELETE `/api/auth/me`

- **Response can be null:** (none)
- **Request optional:** (none)

### POST `/api/auth/onboarding`

- **Response can be null:**
  - `user` → UserResponse nullables
  - **`business`** (null for roles without a business, e.g. employee / marketer)
- **Request optional:** `name`, `businessName`, `description`, `services`, `experienceYears`, `image`
- **When role is workshop/store/institute:** `businessName`, `description`, `experienceYears` are **required**; `services` and `image` are **optional** (can be filled later via `PATCH /auth/me`). `name` sets the user display name when provided.

---

## Products — `/api/products`

### GET `/api/products/names`

- **Response can be null:** (none)
- **Request optional:** (none)

### GET `/api/products`

- **Response can be null:** `items[]` → ProductResponse nullables
- **Request optional:** `page`, `limit`, `category`, `inWarehouse`, `q`

### GET `/api/products/:id`

- **Response can be null:** `product` → ProductResponse nullables  
  `availableQuantity` is **omitted** (not null) when product is not in warehouse
- **Request optional:** (none)

### GET `/api/products/:id/similar`

- **Response can be null:** `items[]` → ProductResponse nullables
- **Request optional:** `page`, `limit`

### POST `/api/products`

- **Response can be null:** `product` → ProductResponse nullables
- **Request optional:** `description`, `variants`, `packaging`, `saleRule`, `discount`, `offer`, `guarantee`, `supplierBusinessId`

### PATCH `/api/products/:id`

- **Response can be null:** `product` → ProductResponse nullables
- **Request optional:** all product fields  
- **Request nullable:** `supplierBusinessId` (`null` clears the workshop link); `saleRule` (`null` clears the locked-axis rule)

### DELETE `/api/products/:id`

- **Response can be null:** `product` → ProductResponse nullables
- **Request optional:** (none)

---

## Posts — `/api/posts`

### GET `/api/posts`

- **Response can be null:** `items[]` → PostResponse nullables
- **Request optional:** `page`, `limit`, `type`, `categoryId`, `authorId`, `businessId`, `location`, `q`, `media`, `active`, `savedBy`, `forMe`

### GET `/api/posts/mine`

- **Response can be null:** `items[]` → PostResponse nullables (reels excluded)
- **Request optional:** `page`, `limit`

### GET `/api/posts/mine/reels`

- **Response can be null:** `items[]` → PostResponse nullables (reels only)
- **Request optional:** `page`, `limit`

### GET `/api/posts/liked`

- **Response can be null:** `items[]` → PostResponse nullables
- **Request optional:** `page`, `limit`
- Auth required. Ordered by newest like first.

### GET `/api/posts/saved`

- **Response can be null:** `items[]` → PostResponse nullables
- **Request optional:** `page`, `limit`
- Auth required. Ordered by newest save first. (Also available as `GET /posts?savedBy=me`.)

### GET `/api/posts/:id`

- **Response can be null:** `post` → PostResponse nullables
- **Request optional:** (none)

### POST `/api/posts`

- **Response can be null:** `post` → PostResponse nullables
- **Request optional:** everything except `body` (type, title, media, images, video, categories, job/service/sale fields, …)

### PATCH `/api/posts/:id`

- **Response can be null:** `post` → PostResponse nullables
- **Request optional:** all fields  
- **Request nullable:** `productId` (`null` / empty unlinks product)

### DELETE `/api/posts/:id`

- **Response can be null:** `post` → PostResponse nullables
- **Request optional:** (none)

### POST `/api/posts/:id/like` · DELETE `/api/posts/:id/like`

- **Response can be null:** (none)
- **Request optional:** (none)

### POST `/api/posts/:id/save/toggle`

- **Response can be null:** (none)
- **Request optional:** (none)
- Auth required. Flips save state → `{ saved: boolean }`.

### POST `/api/posts/:id/save` · DELETE `/api/posts/:id/save`

- **Response can be null:** (none)
- **Request optional:** (none)

### GET `/api/posts/:id/comments`

- **Response can be null:** `items[]` → CommentResponse nullables
- **Request optional:** `page`, `limit`

### POST `/api/posts/:id/comments`

- **Response can be null:** `comment` → CommentResponse nullables
- **Request optional:** (none) — `body` required

---

## Post options — `/api/post-options`

### GET `/api/post-options`

- **Response can be null:** each item → `parentId`
- **Request optional:** `type`

---

## Businesses — `/api/businesses`

### GET `/api/businesses`

- **Response can be null:** `items[]` → BusinessResponse nullables
- **Request optional:** `page`, `limit`, `type`, `location`, `q`, `categoryId`, `verified`, `ownerId`

### GET `/api/businesses/:id`

- **Response can be null:** `business` → BusinessResponse nullables
- **Request optional:** (none)

### POST `/api/businesses`

- **Response can be null:** `business` → BusinessResponse nullables
- **Request optional:** `description`, `phone`, `capacity`, `equipment`, `minOrder`, `experience`, `services`, `duration`, `topics`, `categoryIds`

### PATCH `/api/businesses/:id`

- **Response can be null:** `business` → BusinessResponse nullables
- **Request optional:** all update fields

---

## Marketers — `/api/marketers`

### GET `/api/marketers`

- **Response can be null:** `items[]` → PublicEmployeeCard nullables (`name`, `bio`, `location`; **`avatarUrl` is never null**)
- **Request optional:** `page`, `limit`, `q`, `location`, `verified`, `availableForWork`

---

## Profiles — `/api/profiles`

### GET `/api/profiles/:id`

- **Response can be null (workshop/store factory card):** `profile.description`, `profile.phone`, `profile.experience`; `posts[]` → PostResponse  
  **`profile.imageUrl` is never null** (building placeholder if missing)
- **Response can be null (employee / marketer / shipping_company card):** `profile.name`, `profile.bio`, `profile.location`, `profile.phone`; `posts[]` → PostResponse; `similar[]` card nullables  
  **`profile.avatarUrl` / `similar[].avatarUrl` are never null** (person placeholder if missing)
- **Request optional:** (none)

### GET `/api/profiles/:id/similar`

- **Response can be null:** `items[]` → BusinessResponse nullables
- **Request optional:** `page`, `limit`

---

## Cart — `/api/cart`

### GET `/api/cart`

- **Response can be null:** `items[]` → CartItemResponse nullables
- **Request optional:** (none)

### POST `/api/cart/items`

- **Response can be null:** CartItemResponse nullables
- **Request optional:** `quantity`, `variant`

### PATCH `/api/cart/items/:id`

- **Response can be null:** CartItemResponse nullables
- **Request optional:** (none) — `quantity` required

### DELETE `/api/cart/items/:id` · DELETE `/api/cart`

- **Response can be null:** (none)
- **Request optional:** (none)

### POST `/api/cart/checkout`

- **Response can be null:** OrderDetailResponse nullables
- **Request optional:** `address`, `lat`, `lng`

---

## Orders — `/api/orders`

### GET `/api/orders`

- **Response can be null:** `items[]` → OrderListItemResponse nullables
- **Request optional:** `page`, `limit`, `status`, `active`, `storeId`, `q`

### GET `/api/orders/:id`

- **Response can be null:** OrderDetailResponse nullables
- **Request optional:** (none)

### POST `/api/orders`

- **Response can be null:** OrderDetailResponse nullables
- **Request optional:** `lines[].variant`, `address`, `lat`, `lng`  
  Drop-off pin is required on first order (or when changing pin). If the user has a governorate `deliveryBorder`, lat/lng outside the circle → `400 validation_failed` on `lat`/`lng`.

### PATCH `/api/orders/:id/status`

- **Response can be null:** `order` → OrderListItemResponse nullables
- **Request optional:** (none) — `status` required

### PATCH `/api/orders/:id/lines/:lineId`

- **Response can be null:** `line.productImage`, `line.variant`
- **Request optional:** (none) — `picked` required

### SSE `/api/orders/stream` · SSE `/api/orders/:id/stream`

- **Response can be null:** event payloads are loosely typed; treat nested user/store fields as nullable
- **Request optional:** (none)

---

## Notifications — `/api/notifications`

### GET `/api/notifications`

- **Response can be null:** `items[]` → `linkTo`
- **Request optional:** `page`, `limit`, `unreadOnly`

### PATCH `/api/notifications/:id/read`

- **Response can be null:** `notification.linkTo`
- **Request optional:** (none)

### PATCH `/api/notifications/read-all` · DELETE `/api/notifications/:id` · DELETE `/api/notifications/all`

- **Response can be null:** (none)
- **Request optional:** (none)

### SSE `/api/notifications/stream`

- **Response can be null:** notification events → `linkTo`
- **Request optional:** (none)

---

## Categories — `/api/categories`

### GET `/api/categories`

- **Response can be null:** (none)
- **Request optional:** `appliesTo`

---

## Locations — `/api/locations`

### GET `/api/locations`

- **Response can be null:** `items[].deliveryBorder` (whole object)
- **Request optional:** (none)

### GET `/api/locations/cities`

- **Response can be null:** `items[].deliveryBorder` (whole object)
- **Request optional:** (none)

### GET `/api/locations/:id/areas`

- **Response can be null:** (none)
- **Request optional:** (none)

---

## Delivery — `/api/deliveries` · `/api/drivers`

### GET `/api/deliveries`

- **Response can be null:** `items[]` → DeliveryResponse nullables
- **Request optional:** `page`, `limit`, `status`, `driverId`, `area`, `q`

### GET `/api/deliveries/:id`

- **Response can be null:**
  - `delivery` → DeliveryResponse nullables
  - **`driver`** (whole object)
  - `orders[].storeName`, `orders[].lat`, `orders[].lng`
- **Request optional:** (none)

### POST `/api/deliveries`

- **Response can be null:** `delivery` → DeliveryResponse nullables
- **Request optional:** (none) — `orderIds` required

### PATCH `/api/deliveries/:id`

- **Response can be null:** `delivery` → DeliveryResponse nullables
- **Request optional:** `driverId`, `area`

### PATCH `/api/deliveries/:id/status`

- **Response can be null:** `delivery` → DeliveryResponse nullables
- **Request optional:** (none) — `status` required

### GET `/api/drivers`

- **Response can be null:** `items[]` → DriverResponse nullables
- **Request optional:** (none)

---

## Supply / Inventory — `/api/supply` · `/api/inventory`

### GET `/api/supply`

- **Response can be null:** (none)
- **Request optional:** `q`, `category`, `lowStock`

### GET `/api/inventory`

- **Response can be null:** (none)
- **Request optional:** `page`, `limit`, `category`, `q`, `lowStock`

### GET `/api/inventory/:id`

- **Response can be null:** `movements[].reference`
- **Request optional:** (none)

---

## Billing — `/api/bills` · `/api/receiving`

### GET `/api/bills/summary`

- **Response can be null:** (none)
- **Request optional:** `businessId`

### GET `/api/bills`

- **Response can be null:** `items[].dueAt`
- **Request optional:** `page`, `limit`, `businessId`, `status`, `q`

### GET `/api/bills/:id`

- **Response can be null:** `bill.dueAt`; `payments[].recordedByName`
- **Request optional:** (none)

### POST `/api/bills/:id/payments`

- **Response can be null:** `payment.recordedByName`; `bill.dueAt`
- **Request optional:** (none) — `amount` required

### GET `/api/receiving`

- **Response can be null:** (none) on list item scalars
- **Request optional:** `page`, `limit`, `businessId`

### GET `/api/receiving/:id`

- **Response can be null:** nested `bill.dueAt`
- **Request optional:** (none)

### POST `/api/receiving`

- **Response can be null:** nested `bill.dueAt`
- **Request optional:** (none) — create fields required

---

## Comments — `/api/comments`

### GET `/api/comments/:id/reply`

- **Response can be null:** `items[]` → CommentResponse nullables
- **Request optional:** (none)

### POST `/api/comments/:id/reply`

- **Response can be null:** `comment` → CommentResponse nullables
- **Request optional:** (none) — `body` required

### PATCH `/api/comments/:id`

- **Response can be null:** `comment` → CommentResponse nullables
- **Request optional:** (none) — `body` required

### DELETE `/api/comments/:id`

- **Response can be null:** (none) — empty `204`
- **Request optional:** (none)

---

## Shipping companies — `/api/shipping-companies`

### GET `/api/shipping-companies`

- **Response can be null:** `items[]` → `pricing`, `fleet`  
  **`imageUrl` is never null**
- **Request optional:** `page`, `limit`, `q`, `location`, `verified`

### GET `/api/shipping-companies/:id`

- **Response can be null:** `company.pricing`, `company.fleet`  
  **`company.imageUrl` is never null**
- **Request optional:** (none)

---

## Roles — `/api/roles`

### GET `/api/roles`

- **Response can be null:** (none) — `description` is always a string (`''` if missing in DB); `iconUrl` is always a URL (placeholder if empty in DB)
- **Request optional:** (none)

---

## Quick cheat sheet (Flutter)

| You call… | Watch for null |
|-----------|----------------|
| `GET /auth/me` | `user.locationId`, `user.deliveryBorder`, profile scalars; **`business`**; `avatarUrl` / business `imageUrl` always URLs |
| `PATCH /auth/me` | same as me |
| `POST /auth/onboarding` | workshop/store: `services` + `image` optional; name/description/experience required |
| `GET /marketers` | `name`/`bio`/`location`; `avatarUrl` always URL |
| `GET /locations` · `/cities` | `deliveryBorder` |
| Posts feed/detail | many post scalars; **`business`**, **`product`**; author avatar/name (author avatar **can** be null) |
| Products | `description`, `offer`, `supplierBusinessId`, `colorImages[].hex` |
| Cart | `variant`, `variantImage`, `unavailableReason` |
| Orders | `lat`/`lng`, **`delivery`**, **`delivery.driver`**, line images; border geo validation on create |
| Deliveries | `driverId`/`driverName`/`deliveredAt`; detail **`driver`** |
| Shipping companies | `pricing`, `fleet`; `imageUrl` always URL |
| Notifications | `linkTo` |
| Bills | `dueAt`, `recordedByName` |
