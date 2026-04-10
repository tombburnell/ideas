# Yellow Sub

Multi-tenant subscription, billing middleware, and entitlements platform (NestJS + Prisma + Postgres + Redis). Headless REST API for product apps; internal admin UI at `/admin`.

## Layout

- `api/` — NestJS application (`/api/v1/public/...`, `/api/v1/admin/...`, `/api/v1/webhooks/...`)
- `admin-web/` — Vite + React + Tailwind (built static assets served by API in production)
- `packages/sdk/` — TypeScript client for product apps
- `docker-compose.yml` — Postgres + Redis for local development

## Configuration

Central config is loaded from environment variables (see `api/.env.example`).

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default `4000` dev, `3000` in Docker) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis for BullMQ workers |
| `CREDENTIALS_ENCRYPTION_KEY` | 64 hex chars (32 bytes) — encrypts provider `credentialsEncrypted` / webhook secrets |
| `PUBLIC_BASE_URL` | Public URL for redirects and docs |
| `ADMIN_EMAIL_ALLOWLIST` | Comma-separated emails allowed for admin API (Firebase) |
| `FIREBASE_PROJECT_ID` | Firebase project (also used to redirect `/__/auth/handler` if OAuth hits your custom domain) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service account JSON string for Firebase Admin |
| `ADMIN_DIST_PATH` | Relative path from `api/` cwd to admin `dist` (Docker: `../admin-web/dist`) |
| `DISABLE_WORKERS` | Set `true` to skip BullMQ registration |
| `LOG_HTTP` | Log each HTTP request (method, path, status, duration); default `true` |

## Local development

1. Start databases: `docker compose up -d` (Postgres on `5433`, Redis on `6380`).
2. `cd api && cp .env.example .env` — set `DATABASE_URL`, `CREDENTIALS_ENCRYPTION_KEY` (`openssl rand -hex 32`), and optional Firebase vars.
3. `npx prisma migrate deploy` then `npm run prisma:seed` (from `api/`).
4. API: `npm run dev -w @yellow-sub/api`
5. Admin (optional): `npm run dev -w @yellow-sub/admin-web` — configure `admin-web/.env` from `.env.example`.

OpenAPI: `http://localhost:4000/api/docs`

### Debugging admin (Firebase) sign-in

- **Google sign-in runs entirely in the browser** until you load data. The API does **not** log `AdminFirebaseGuard` until a request hits `/api/v1/admin/*` with a Bearer token.
- **Browser:** open DevTools → Console and filter for **`[YellowSub auth]`** (redirect result, `onAuthStateChanged`, errors).
- **Server:** `GET https://<your-host>/auth/debug` returns whether `firebaseProjectId` is set. For `GET /__/auth/handler`, the server returns a **small HTML page** that redirects in the **browser** to `*.firebaseapp.com/__/auth/handler` including **query and hash** (a 302 would drop the OAuth tokens in the URL fragment).

## Integration API

All public routes require header `X-Api-Key` for the tenant. Create keys via admin API (`POST /api/v1/admin/tenants/:tenantId/api-keys`).

Seed tenant slug: `demo-app` — see seed output for the development API key.

## Webhooks (Lemon Squeezy)

`POST /api/v1/webhooks/lemon/:providerAccountId` — raw JSON body must be preserved for HMAC (`X-Signature`). Point Lemon’s webhook URL at this path. Use Caddy or another proxy to expose only webhook routes publicly if desired.

## Docker / production

Build from this directory:

```bash
docker build -t yellow-sub .
```

Run with `DATABASE_URL`, `REDIS_URL`, secrets, and `ADMIN_DIST_PATH=../admin-web/dist` (already default in image). Migrations run on container start via `docker/entrypoint.sh`.

## Fly.io

`fly.toml` uses app name `yellow-sub`. Set secrets: `DATABASE_URL`, `REDIS_URL`, `CREDENTIALS_ENCRYPTION_KEY`, Firebase, etc.

## Caddy (example)

Expose admin and webhooks while keeping integration API internal:

- Route `/admin` and `/api/v1/webhooks/*` to the service
- Do not route `/api/v1/public/*` to the public internet; allow only from internal networks or VPN

Adjust paths to match your deployment.
