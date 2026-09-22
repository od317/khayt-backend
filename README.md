# خيط — API

## Requirements
Node 20, Docker

## Setup
cp .env.example .env
npm install
npm run db:up
npm run prisma:generate
npm run prisma:migrate
npm run dev

## API
http://localhost:3000/api/health

## Docs
See the `docs/` folder for the full specification.
