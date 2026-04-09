# Yellow Sub architecture

## Monolith

Single NestJS process exposes REST, OpenAPI at `/api/docs`, static admin at `/admin`, and webhooks. Product apps call the integration API with per-tenant API keys; operators use Firebase ID tokens plus an email allowlist and `AdminScope` rows.

## Data

- **Plan** is the internal commercial concept; **PlanPrice** links to provider-specific IDs (e.g. Lemon variant).
- **Subscription** caches provider state; entitlements are derived from plan features/quotas plus **ManualEntitlementOverride**.
- Provider secrets are stored as **AES-256-GCM** ciphertext in `credentialsEncrypted` / `webhookSecretEncrypted`, using `CREDENTIALS_ENCRYPTION_KEY`.

## Providers

`BillingProviderRegistry` selects **Lemon** (implemented), **Stripe**, **PayPal** (stubs). Adapters receive decrypted credentials only when invoking provider APIs.

## Async

BullMQ on Redis runs jobs such as subscription resync (`DISABLE_WORKERS=true` skips workers in dev).

## Proxy

Use a single HTTP port in the app; restrict paths at Caddy (or similar) — see README.
