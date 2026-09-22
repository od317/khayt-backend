# `docs/06-stack.md`

```markdown
# خيط — Technology Stack

> The decisions, and why. Written to be read in a year when someone asks
> "why did we pick this?"

---

## 1. The shape of the system

Three deployable pieces:

| Piece | What it is | Who uses it |
|---|---|---|
| **API** | The backend. All business logic, all data access. | The app and the dashboard |
| **App** | Next.js frontend, phone-first | External users |
| **Dashboard** | Next.js frontend, desktop | Internal staff |

Plus two managed services:

| Service | What it holds |
|---|---|
| **PostgreSQL** | All persistent data |
| **Redis** | Real-time pub/sub, sessions, rate limiting |

The API is the only thing that touches the database. Neither frontend
connects to Postgres directly.

---

## 2. Decisions

### Language: TypeScript

**Chosen:** TypeScript everywhere — API, app, dashboard.

**Why:** one language across three codebases means shared types. A
`Product` is defined once and imported everywhere. When a field changes,
the compiler catches every place that breaks.

**Alternative considered:** Python for the API. Rejected because it
duplicates the type definitions and loses the compile-time safety net.

---

### API framework: NestJS

**Chosen:** NestJS.

**Why:** the domain has clear boundaries — auth, businesses, products,
posts, orders, inventory, receiving, bills, delivery. NestJS's module
system maps directly onto those boundaries. Each module owns its
controllers, services, and data access.

Two features matter most:

**Guards** — role-based access is declared, not scattered.

```typescript
@Roles('inventory', 'admin')
@Post('receiving')
create(@Body() dto: CreateReceivingDto) { ... }
```

**Pipes** — validation happens before the handler runs, based on the DTO.

```typescript
export class CreateReceivingDto {
  @IsUUID() businessId: string;
  @IsEnum(PaymentType) paymentType: PaymentType;
  @ValidateNested({ each: true }) @Type(() => LineDto)
  lines: LineDto[];
}
```

**Alternative considered:** Express. Rejected because every one of the
above would be hand-written, and by the fifth module it would be
inconsistent.

---

### Database: PostgreSQL

**Chosen:** PostgreSQL.

**Why:** the data is relational, the rules are constraints, and money
needs exact arithmetic.

Three specific reasons:

**Money.** `NUMERIC(12,2)` is exact. Floating point is not. A bill that's
off by 0.01 is a bill that doesn't reconcile.

**Constraints.** Rules R5, R7, and R8 from the domain doc are enforceable
in the database:
- `CHECK (paid >= 0 AND paid <= total)`
- `CHECK (remaining >= 0)`
- Foreign keys that make orphans impossible

**Transactions.** `POST /receiving` writes to five tables. If the fourth
fails, the first three must roll back. Postgres does this natively.

**Alternative considered:** MySQL. Would work. Postgres is chosen for
`jsonb` (used for product colors and packaging), better constraint
support, and because we're not on shared hosting.

**Alternative considered:** MongoDB. Rejected. The data has relationships,
money, and rules. A document store would push referential integrity into
application code, which means bugs.

---

### ORM: Prisma

**Chosen:** Prisma.

**Why:** the schema is the source of truth, and it generates TypeScript
types from it.

```prisma
model Bill {
  id          String   @id @default(uuid())
  total       Int
  paid        Int      @default(0)
  status      BillStatus
  payments    Payment[]
}
```

Running `prisma generate` produces a `Bill` type that the rest of the
codebase imports. No hand-written types that drift from the database.

**Migrations** are versioned files. `prisma migrate dev` in development,
`prisma migrate deploy` in production.

**The escape hatch:** for the complex queries — the dashboard's computed
columns, the reports — Prisma has `$queryRaw`. Use it when the ORM gets
in the way. Don't fight it.

**Alternative considered:** TypeORM. Rejected — decorator-based, more
verbose, and the migration story is weaker.

**Alternative considered:** raw SQL. Rejected for the bulk of the work,
but kept available for reports.

---

### Real-time: SSE first, Socket.io later

**Chosen:** Server-Sent Events for order status and notifications.
Socket.io only when driver tracking is built.

**Why SSE first:** the real-time needs in this system are one-directional.
A store watches their order status. A user watches for notifications. The
server pushes; the client listens. SSE does this natively, over plain HTTP,
with automatic reconnection. No extra dependency, no Redis adapter.

**Why Socket.io later:** driver location is bidirectional. The driver's
phone *sends* coordinates. That needs WebSockets.

**When Socket.io is added:**

```typescript
@WebSocketGateway({ namespace: 'tracking' })
export class TrackingGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('location')
  handleLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deliveryId: string; lat: number; lng: number },
  ) {
    this.server.to(`delivery:${data.deliveryId}`).emit('moved', data);
  }
}
```

Rooms are the useful part. `client.join('delivery:123')` means only the
people watching that delivery get the updates.

**The scaling requirement:** once there is more than one API instance,
Socket.io needs the Redis adapter. Without it, a message sent to a client
on instance A never reaches a client on instance B.

```typescript
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
app.useWebSocketAdapter(new RedisIoAdapter(app, pubClient, subClient));
```

**SSE does not need this.** That's another reason to start there.

---

### Auth: JWT with phone + SMS code

**Chosen:** phone number + one-time code, exchanged for a JWT.

**Why not passwords:** Syrian users are on phones. Phone numbers are the
identity people actually have. Passwords are a support burden.

**Flow:**

```
1. POST /auth/request-code  { phone }
   → generate 6-digit code, store in Redis with a 5-minute TTL
   → send via SMS provider

2. POST /auth/verify  { phone, code }
   → validate against Redis
   → create the user if new
   → return access token (15 min) + refresh token (30 days)
```

**Why Redis for the code:** it expires automatically. A database row would
need a cleanup job.

**Token storage:** refresh token in an httpOnly cookie. Access token in
memory. Never in localStorage.

**Why not a provider (Auth0, Clerk):** they assume email, charge per user,
and don't reliably deliver SMS to Syrian numbers.

---

### File storage: S3-compatible

**Chosen:** Cloudflare R2.

**Why:** S3 API, no egress fees, cheap.

**How it works:** the client asks the API for a signed URL, uploads
directly to R2, then tells the API the file key. The API never handles
the bytes.

```
1. POST /uploads/sign  { contentType, purpose }
   → { uploadUrl, fileKey }

2. Client PUTs the file to uploadUrl

3. Client sends fileKey when creating the product or post
```

**Why not local disk:** Render's filesystem is ephemeral. Files written to
disk disappear on redeploy.

**Alternative:** Cloudinary. Simpler, includes image resizing. More
expensive at scale. R2 plus a resizing library is cheaper.

---

### Hosting: Render

**Chosen:** Render.

**Why:** Docker support, managed PostgreSQL, managed Redis (Valkey),
predictable pricing, no server administration.

**What runs where:**

| Service | Render product | Plan |
|---|---|---|
| API | Web Service (Docker) | Starter, $7/mo |
| App | Web Service (Node) | Starter, $7/mo |
| Dashboard | Static Site or Web Service | Starter, $7/mo |
| Database | Render Postgres | Basic, $6/mo |
| Redis | Render Key Value | Starter, $10/mo |

**Production total: ~$30/month.** Add the app's static hosting and it's
roughly $37.

**Free tier for development:**

| Service | Limitation |
|---|---|
| Web Service | Spins down after 15 min idle |
| PostgreSQL | **Expires after 30 days** |
| Redis | 25 MB, in-memory only |

The free PostgreSQL expiring is the important one. Development on the free
tier is fine for a month. Production needs the paid tiers.

**Alternative considered:** Hostinger. Rejected because shared hosting
doesn't support Docker or PostgreSQL, and a VPS means managing the server.

**Alternative considered:** Railway. Comparable. Render chosen for its
free PostgreSQL tier and clearer pricing.

**Alternative considered:** A raw VPS (Hetzner, ~€8/mo). Cheaper, but
you manage Docker, the reverse proxy, backups, and monitoring yourself.
Revisit when the bill matters.

---

### Docker

**Chosen:** yes, for the API only.

**Why just the API:** it's the piece with the most dependencies and the
most complex build. Frontends deploy fine from source on Render.

**The Dockerfile:**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Multi-stage** so the final image has no build tools.

**Local development uses Docker Compose** for Postgres and Redis only.
The API runs on the host with `npm run start:dev` for fast reloads.

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: dev
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7
    ports: ["6379:6379"]

volumes:
  pgdata:
```

`docker compose up -d` and both services are running. The API connects to
`localhost:5432` and `localhost:6379`.

---

## 3. Development approach

### Build in slices

Nine slices, in this order:

| # | Slice | Depends on |
|---|---|---|
| 1 | Auth + Users | — |
| 2 | Businesses + Products | 1 |
| 3 | Posts + Categories + Comments + Likes | 1, 2 |
| 4 | Orders | 1, 2 |
| 5 | Inventory + Supply | 2, 4 |
| 6 | Receiving + Bills + Payments | 5 |
| 7 | Delivery | 4 |
| 8 | Notifications | 3, 4, 6 |
| 9 | Admin | 1 |

Each slice is: **schema → migration → endpoints → tests → connect the
frontend.** Then move on.

**Ship slice 1 before starting slice 2.** Don't build nine modules and
then wire them together.

---

### Testing

| Type | Tool | What it covers |
|---|---|---|
| Unit | Vitest | Services, pure logic, rule validation |
| Integration | Vitest + Testcontainers | Endpoints against a real Postgres |
| E2E | Playwright | Critical flows in the dashboard |

**What must be tested:** the fifteen rules in `02-domain.md`. Each rule
gets at least one test that proves it's enforced. Rule R1 — warehouse
gating — gets three: a warehouse product orders, a non-warehouse product
doesn't, and a product switched to non-warehouse mid-flight behaves
correctly.

---

### Environments

| Environment | Database | Redis | Purpose |
|---|---|---|---|
| Local | Docker Compose | Docker Compose | Development |
| Staging | Render Postgres | Render Key Value | Pre-production checks |
| Production | Render Postgres | Render Key Value | Live |

**Staging exists** so migrations can be run against real data before
production. Skipping it is how you lose a table.

---

### Migrations

Prisma migrations, versioned in git.

**The rules:**

1. Never edit a migration that has run in production
2. Every migration is reversible, or has a documented rollback plan
3. Destructive changes (drop column, drop table) are two migrations:
   first stop using it, then remove it

---

## 4. What's not decided

Recorded so they're not forgotten.

| Decision | When it matters |
|---|---|
| SMS provider for Syria | Before slice 1 ships |
| Error tracking (Sentry or equivalent) | Before staging |
| Log aggregation | Before production |
| Backup schedule and retention | Before production |
| CDN for images | When traffic justifies it |
| Search (Postgres full-text vs. Meilisearch) | When search feels slow |
| Payment integration | Out of scope — money moves offline |

---

## 5. The cost, at each stage

| Stage | Monthly |
|---|---|
| Development (free tiers) | $0 |
| First deployment (API + DB) | $13 |
| With Redis | $23 |
| Full production (API + DB + Redis + app + dashboard) | ~$37 |
| Adding staging | ~$60 |

**The first real cost is $13/month.** Everything before that is free.
```