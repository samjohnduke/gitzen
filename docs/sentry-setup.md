# Sentry Setup

## Packages

| Package | Purpose |
|---|---|
| `@sentry/cloudflare` | Worker error tracking via `Sentry.withSentry()` |
| `@sentry/react` | Frontend error tracking, browser tracing, session replay |

## Worker (`worker/index.ts`)

- `Sentry.withSentry((env) => ({ dsn, tracesSampleRate }), handler)` wraps the exported fetch handler
- `Sentry.captureException(err)` in the global `app.onError()` handler
- Gracefully skips Sentry when `SENTRY_DSN` is not set

## Frontend (`src/main.tsx`)

- `Sentry.init()` with browser tracing, replay, and release version
- `Sentry.ErrorBoundary` wraps the app in `src/components/error-boundary.tsx`
- `VITE_SENTRY_DSN` and `VITE_SENTRY_RELEASE` are baked in at build time via Vite env vars

## Content Security Policy

The CSP in `worker/index.ts` includes:

- `connect-src https://*.ingest.sentry.io` — allows error/session reporting
- `worker-src 'self' blob:` — required for the Sentry replay web worker

## CI/CD (`.github/workflows/ci.yml`)

The deploy job:

1. Builds with `VITE_SENTRY_DSN` and `VITE_SENTRY_RELEASE` (git SHA) so the frontend client initializes with the correct DSN and release version
2. Creates a Sentry release via `getsentry/action-release@v3`, which associates commits, uploads source maps from `./dist`, and marks the `production` environment
3. Deploys to Cloudflare Workers

Checkout uses `fetch-depth: 0` so Sentry can associate commits with the release.

## Secrets

### GitHub Actions

| Secret | Description |
|---|---|
| `VITE_SENTRY_DSN` | Sentry DSN, embedded in the frontend build |
| `SENTRY_AUTH_TOKEN` | Org-level auth token with `org:ci` and `project:releases` scopes |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |

### Cloudflare Workers

| Secret | Description |
|---|---|
| `SENTRY_DSN` | Sentry DSN for the worker (set via `wrangler secret put SENTRY_DSN`) |

## Getting the Values

- **DSN**: Sentry → Settings → Projects → Client Keys (DSN)
- **Auth Token**: Sentry → Settings → Auth Tokens → Create with `org:ci` + `project:releases` scopes
- **Org Slug**: From your Sentry URL: `https://sentry.io/organizations/{org-slug}/`
- **Project Slug**: Sentry → Settings → Projects → project name shown in the list

## Release Health

Release health (crash-free sessions, adoption rate) works automatically once:

1. `Sentry.init()` is called with a `release` value
2. The same release version is used in the `getsentry/action-release` step
3. Both are set to `github.sha` in CI
