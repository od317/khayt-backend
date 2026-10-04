# خيط — API

Backend API for خيط: a warehouse and marketplace platform for the
Syrian clothing industry.

Full project reference: [PROJECT.md](./PROJECT.md). Deeper design notes: [`docs/`](./docs/).

## Stack

- NestJS + TypeScript
- PostgreSQL (via Prisma)
- Redis (sessions, rate limiting, pub/sub)
- Nginx in front (production only)

## Local development

Postgres and Redis run in Docker; the API runs on the host.

```bash
npm install
docker compose up -d          # starts postgres + redis only
cp .env.example .env          # then fill in DATABASE_URL, REDIS_URL, JWT_SECRET
npx prisma migrate dev
npm run db:seed               # optional: dummy data
npm run dev
```
