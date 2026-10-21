# خيط (Khayt) — Project Details

> Single reference for what this backend is, how it is structured, and how
> the main features work today. Deeper design notes live under `docs/`.

**Repo:** `https://github.com/od317/khayt-backend`  
**Package name:** `khayt-api`  
**API prefix:** `/api`  
**Swagger:** `/docs` (dev by default; prod when `SWAGGER_ENABLED=true`)

---

## 1. What the product is

خيط serves the Syrian clothing industry in two connected ways:

1. **Marketplace** — factories/workshops, institutes, stores, and workers
   publish posts and products; contact happens on-platform; many deals
   close offline.
2. **Warehouse** — factories place stock with خيط; stores order that stock;
   inventory/delivery staff fulfill; factories are billed for the service.

Both paths share the same users, businesses, products, and notifications.

---

## 2. Stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js ≥ 20 |
| Framework | NestJS 12 + TypeScript |
| ORM / DB | Prisma 6 + PostgreSQL 16 |
| Cache / OTP / pub-sub | Redis 7 (ioredis) |
| Auth | JWT (access + refresh), Passport |
| Phone login | OTP via Redis (fixed `123456` temporarily for testing) |
| Admin login | Email/password + 2FA (SMTP) |
| Push | Firebase Cloud Messaging (`firebase-admin`) |
| Realtime | SSE (`/orders/stream`, notifications stream) |
| Uploads | Multer → local `/uploads` |
| Docs | Swagger (`@nestjs/swagger`) + `OPERATION_DOCS` enricher |
| Tests | Vitest |
| Prod edge | Nginx → API container |

---

## 3. Repository layout

```
backend/
├── prisma/
│   ├── schema.prisma          # source of truth for DB
│   ├── migrations/            # applied with prisma migrate deploy
│   ├── seed.ts                # full demo seed
│   └── seed-post-options.sql  # VPS-safe post-options catalog only
├── src/
│   ├── main.ts / swagger.ts
│   ├── app.module.ts
│   ├── common/                # prisma, guards, swagger, status labels…
│   └── modules/               # feature modules (see §5)
├── docs/                      # product/design specs (01–06)
├── infra/nginx/               # prod nginx config
├── docker-compose.yml         # local postgres + redis
├── docker-compose.prod.yml    # postgres + redis + api + nginx
└── PROJECT.md                 # this file
```

---

## 4. Actors & roles

### App roles (`UserRole`)

| Role | Arabic | Notes |
| --- | --- | --- |
| `employee` | موظف | Job seek / services / tools |
| `marketer` | مسوق | Same permissions as employee |
| `shipping_company` | شركة شحن | Same permissions as employee |
| `workshop` | مشغل / مصنع / معمل | Business owner (factory) |
| `institute` | معهد | Business owner |
| `store` | متجر | Orders warehouse stock |

### Internal / dashboard roles

| Role | Notes |
| --- | --- |
| `super_admin` | Full access |
| `admin` | Most admin ops |
| `inventory` | Warehouse picking / receiving / bills |
| `delivery` | Deliveries & order transit |

### Core ownership rules

- One user → at most **one** `Business` (`Business.ownerId` unique).
- Stores and workshops place `Order`s against platform `Product` / `Supply`
  (staff-managed catalog). `user.canOrder` reflects that after onboarding.
- Onboarding: employee finishes with role + location; workshop/store/institute
  must also submit business profile (`businessName`, description, experience;
  services/image optional) and may set user `name`.

---

## 5. Nest modules (API surface)

All routes are under `/api/...`.

| Module | Controllers | Purpose |
| --- | --- | --- |
| `auth` | `/auth`, `/auth/admin` | OTP login, refresh, me, onboarding, admin 2FA |
| `roles` | `/roles`, `/admin/roles` | Selectable roles catalog |
| `locations` | `/locations`, `/admin/locations` | City/area catalog |
| `categories` | `/categories`, `/admin/categories` | Post/product categories |
| `post-options` | `/post-options`, `/admin/post-options` | Publish-form chip catalogs |
| `posts` | `/posts` | Feed, create/update, likes, saves, media |
| `comments` | `/comments` | Comments on posts |
| `businesses` | `/businesses` | Business profiles |
| `products` | `/products` | Platform catalog (staff CRUD), uploads, variants |
| `orders` | `/orders`, `/orders/stream` | Store orders, status, SSE |
| `delivery` | `/deliveries`, `/drivers` | Delivery batches & drivers |
| `inventory` | `/inventory`, `/supply` | Warehouse stock |
| `billing` | `/receiving`, `/bills` | Receiving → bills → payments |
| `notifications` | `/notifications` | In-app + FCM + SSE |
| `admin` | `/admin` | Users/staff moderation |
| `debug` | `/debug` | Dev helpers (gated) |

---

## 6. Auth model

### Mobile

1. `POST /api/auth/request-code` `{ phone }` → OTP in Redis  
   (`phone` is E.164 international; Syrian `09xxxxxxxx` is normalized to `+9639…`)  
2. `POST /api/auth/verify` `{ phone, code, fcmToken? }` → JWT + user  
   (new users are created without a display name; `user.canOrder` is true only
   when `onboardingCompleted` and role is `store` or `workshop`)  
3. If `onboardingCompleted === false` → `POST /api/auth/onboarding`  
   - Employee-like roles: `role` + `locationId` only  
   - Factory (`workshop`) / store: extra multipart fields — `businessName`,
     `description`, `services[]`, `experienceYears`, `image` file  
   - Response includes `user.canOrder` after first-time onboarding  
4. `GET /api/auth/me` → user + optional business + unread count  
5. Refresh via refresh token endpoint  

**Deferred profile fields:** name is collected via `PATCH /api/auth/me`.  
Post / like / comment without a name → `403` `{ error: 'profile_incomplete', completedData: false, fields: { name: 'required' } }`.  
Order create without saved `deliveryLat`/`deliveryLng` → same shape with coordinate fields.

### Dashboard

- `POST /api/auth/admin/login` → email/password → 2FA challenge  
- Staff roles enforced with `@Roles(...)`

---

## 7. Domain highlights

### Products

- Platform-owned (no workshop `businessId`). Create/update/delete: `admin`,
  `super_admin`, `inventory` only. Public list/detail/similar.
- `Supply` is 1:1 with product (warehouse stock).
- Cart is a flat list (not grouped by workshop). Checkout requires saved
  store `deliveryLat` / `deliveryLng`.
- `images: string[]` (general gallery), optional variants/packaging/discount JSON.
- Color variants: first axis `key: "color"`; each option has `image` + `images[]`.
  Product responses also expose `colorImages` for the FE to switch gallery by color.
  Upload color photos as `variant_0`, `variant_0_img_1`, … (sizes: `variant_0_child_0`).
- `inWarehouse` gates warehouse ordering.
- `guarantee: boolean` (default `false`) — whether the product has guarantee.
- Soft-delete via `deletedAt`.

### Orders (warehouse)

Statuses and UI colors (`statusColor` on list/detail):

| Status | Color |
| --- | --- |
| `review` | `#F59E0B` |
| `preparing` | `#3B82F6` |
| `ready` | `#10B981` |
| `in_transit` | `#8B5CF6` |
| `delivered` | `#16A34A` |
| `cancelled` | `#9CA3AF` |
| `failed` | `#DC2626` |

Other behaviors:

- Default list hides `delivered` (active statuses only; completed via filter).
- First order can pin store drop-off (`lat`/`lng`/`address`) on user + order.
- Order detail includes fixed support contacts from env:
  - `ORDER_WHATSAPP`, `ORDER_PHONE`
- Order lines expose `productImage` (first product image).
- `in_transit` does **not** send a push (by design).
- New orders notify dashboard staff (`order_placed`).

### Posts

Types: `job_seeking`, `job_offering`, `service_offering`,
`service_requesting`, `product_offering`, `material_offering`,
`material_requesting`, `reel`.

Multipart image/video upload supported. Required type-specific fields are
validated against the **PostOption** catalog (labels must exist & be active).

### Post options (admin-managed chips)

Public:

- `GET /api/post-options?type=job_offering`

Admin CRUD (`admin` / `super_admin`):

- `GET /api/admin/post-options`
- `POST /api/admin/post-options`
- `PATCH /api/admin/post-options/:id`
- `DELETE /api/admin/post-options/:id`

Public catalog kinds (no workType / salaryType / experience chips):
`specialty`, `skill`, `service_place`, `pricing`, `sell_method`,
`price_method`, `condition`.

Still accepted on create as **free text** (not from catalog):
`workType`, `salaryType`, `experience`.

Required on create:

| Post type | Required fields |
| --- | --- |
| `job_offering` | specialty, skills, workType, salaryType |
| `service_offering` | specialty, servicePlace, pricing |
| `product_offering` | specialty, sellMethod, priceMethod |
| `material_offering` | specialty, condition |

Skills may mix catalog labels (parented to specialty) and optional free-text
values stored only on the post.

Default catalog SQL (safe re-run, keeps custom rows):

- File: `prisma/seed-post-options.sql`

### Notifications

- Persisted rows + Redis pub/sub for SSE.
- Optional FCM device tokens on verify / register.
- Types include likes, comments, order status (except in_transit push), etc.

### Billing / receiving

- Receiving stock creates/updates supply and can open bills.
- Payments recorded against bills.

---

## 8. Local development

```bash
npm install
docker compose up -d
cp .env.example .env   # fill DATABASE_URL, REDIS_URL, JWT_SECRET
npx prisma migrate dev
npm run db:seed        # optional
npm run dev
```

Useful scripts: `npm test`, `npm run lint`, `npm run prisma:studio`.

---

## 9. Production (VPS)

Compose file: `docker-compose.prod.yml`  
Services: `postgres` (container `khayt-db-prod`), `redis`, `api`, `nginx`.

Typical deploy (no `cd` needed):

```bash
git -C ~/khayt-backend pull
docker compose -f ~/khayt-backend/docker-compose.prod.yml up -d --build
docker compose -f ~/khayt-backend/docker-compose.prod.yml exec api npx prisma migrate deploy
```

Seed post-option chips only:

```bash
cat ~/khayt-backend/prisma/seed-post-options.sql \
  | docker compose -f ~/khayt-backend/docker-compose.prod.yml exec -T postgres psql -U khayt -d khayt
```

Inspect DB:

```bash
docker compose -f ~/khayt-backend/docker-compose.prod.yml exec -T postgres \
  psql -U khayt -d khayt -c 'SELECT kind, COUNT(*) FROM "PostOption" GROUP BY kind ORDER BY kind;'
```

**Do not** reset the production DB unless explicitly requested.

Env highlights (`.env.production` / `.env.example`):

- `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- `FIREBASE_*` (required in production for push)
- `ORDER_WHATSAPP`, `ORDER_PHONE`
- `SWAGGER_ENABLED`

Never commit Firebase JSON or `.env*`.

---

## 10. Design docs map

| File | Contents |
| --- | --- |
| `docs/01-overview.md` | Purpose, actors, capabilities |
| `docs/02-domain.md` | Entities, relationships, invariants |
| `docs/03-flows.md` | Order, hiring, contact flows |
| `docs/04-api.md` | Older API sketch (prefer Swagger for current) |
| `docs/05-screens.md` | App + dashboard screens |
| `docs/06-stack.md` | Stack rationale |
| `docs/07-schema.prisma` | Historical schema snapshot — **live schema is `prisma/schema.prisma`** |

When docs and code disagree, **prefer the running code + Prisma schema**,
then update docs.

---

## 11. Testing & quality

- Unit/service tests with Vitest under `src/modules/**/*.spec.ts`.
- Prisma client regenerated via `npx prisma generate`.
- Do not commit `tsconfig.build.tsbuildinfo`.

---

## 12. Known gaps / next product notes

- OTP is temporarily fixed for testing; real SMS still TODO.
- Directory-only actors (shipping companies, marketers) are admin-managed
  listings rather than full login accounts.

---

*Last updated: 2026-10-04 — includes post-options catalog, product guarantee,
order status colors, and product images on order lines.*
