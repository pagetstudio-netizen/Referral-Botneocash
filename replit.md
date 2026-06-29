# Moon Crypto Bot — Admin Dashboard

Telegram crypto gains & referral system with an Express API + bot backend and a React/Vite admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server + Telegram bot (port 8080)
- `pnpm --filter @workspace/admin-dashboard run dev` — run the admin dashboard (port 22133)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `BOT_TOKEN` — Telegram bot token, `ADMIN_EMAIL` / `ADMIN_PASSWORD` — admin login creds

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Telegraf (Telegram bot)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, wouter, TanStack Query

## Where things live

- `artifacts/api-server/src/` — Express API server (routes, middlewares, lib)
- `artifacts/api-server/bot/` — Telegram bot (legacy JS)
- `artifacts/admin-dashboard/src/` — React admin dashboard
- `lib/db/` — Drizzle schema + migrations
- `lib/api-spec/` — OpenAPI spec (source of truth for API contracts)
- `lib/api-zod/` — Generated Zod schemas
- `lib/api-client-react/` — Generated TanStack Query hooks

## Architecture decisions

- Admin routes live in `artifacts/api-server/src/routes/admin.ts`; the bot's Postgres DB is accessed via `bot/database/db.js`
- Auth token stored in localStorage as `moon_crypto_token`; set via `setAuthTokenGetter` in App.tsx
- pino + pino-pretty for structured logging (dev mode pretty-prints, production outputs JSON)
- Dashboard uses `wouter` with `BASE_URL` base path for Replit proxy compatibility

## Product

- Telegram bot that rewards users for subscribing to crypto channels, with referral bonuses
- Admin dashboard for managing users, withdrawals, channels, settings, and broadcasts

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `pino-pretty` must be in `dependencies` (not devDependencies) — pino loads it at runtime as a worker thread
- `@types/express` and `@types/pg` are NOT in the pnpm catalog — use explicit semver strings in package.json
- `@types/node` and `tsx` ARE in the catalog — use `catalog:` for those

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
