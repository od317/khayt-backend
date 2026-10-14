# خيط — API

Backend for **خيط**: marketplace + warehouse for the Syrian clothing industry.

Full product/domain reference: [PROJECT.md](./PROJECT.md). Design notes: [`docs/`](./docs/).

## Stack

| Piece | Choice |
| --- | --- |
| Runtime | Node.js ≥ 20 |
| API | NestJS 12 + TypeScript |
| DB | PostgreSQL 16 (Prisma 6) |
| Cache / OTP / pub-sub | Redis 7 |
| Auth | JWT + OTP (phone) / email+2FA (admin) |
| Push | Firebase Cloud Messaging |
| Docs | Swagger at `/api/docs` |
| Tests | Vitest |

## Quick start

Postgres and Redis run in Docker; the API runs on the host.

```bash
npm install
docker compose up -d                 # postgres (:5433) + redis (:6379)
cp .env.example .env                 # defaults work for local Docker
npx prisma migrate dev
npm run db:seed                      # demo users, posts, products, …
npm run dev                          # http://localhost:3000
```

- **API base:** `http://localhost:3000/api`
- **Swagger:** `http://localhost:3000/api/docs`
- **Dev OTP:** always `000000` (any phone after `request-code`)

### Useful scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Nest watch mode |
| `npm run build` / `npm start` | Production build + run |
| `npm run db:seed` | Reseed demo data |
| `npm run db:reset` | Migrate reset + seed |
| `npm run db:up` / `db:down` | Start/stop Docker DB+Redis |
| `npm test` | Vitest |
| `npm run lint` | ESLint |

## Auth (mobile)

```http
POST /api/auth/request-code   { "phone": "+963994000001" }
POST /api/auth/verify         { "phone": "+963994000001", "code": "000000" }
```

Phones are international (E.164, e.g. `+12025550123`). Legacy Syrian `09xxxxxxxx` is still accepted and stored as `+9639…`.

Display name is optional at signup — set it later with `PATCH /api/auth/me`. Post / like / comment require a name (`completedData: false` if missing). Creating an order requires saved `deliveryLat` / `deliveryLng` on the store profile (same gate).

Seeded demo phones (after `db:seed`):

| Phone | Role | Name |
| --- | --- | --- |
| `+963994000001` | employee | أحمد الخياط |
| `+963994000002` | workshop | معمل النسيج الدمشقي |
| `+963994000003` | institute | معهد الخياطة |
| `+963994000004` | store | متجر الأزياء |
| `+963994000022` | marketer | سامر المسوق |
| `+963994000023` | shipping_company | شركة الشام للشحن |

## Env

See [`.env.example`](./.env.example). Important locals:

```env
PORT=3000
DATABASE_URL=postgresql://khayt:khayt_dev@localhost:5433/khayt
REDIS_URL=redis://localhost:6379
JWT_SECRET=change_me_in_production
```

Optional: Firebase (`FIREBASE_*`), SMTP, `ORDER_WHATSAPP` / `ORDER_PHONE`, `SWAGGER_ENABLED=true` in production.

## Production

`docker-compose.prod.yml` runs postgres + redis + api + nginx. Details and VPS notes are in [PROJECT.md](./PROJECT.md).
