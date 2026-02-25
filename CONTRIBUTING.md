# Contributing to gitzen

## Getting started

```bash
git clone https://github.com/samjohnduke/gitzen.git
cd gitzen
npm install --legacy-peer-deps
```

Create a `.dev.vars` file with your GitHub App credentials (see [Self-Hosting](https://gitzen.dev/docs/self-hosting) for setup):

```
GITHUB_APP_CLIENT_ID=your_id
GITHUB_APP_CLIENT_SECRET=your_secret
ENCRYPTION_KEY=any-32-char-string-for-local-dev
API_TOKEN_SECRET=any-32-char-string-for-local-dev
```

```bash
npm run dev    # Start dev server at localhost:5173
```

## Project structure

```
worker/          Backend — Cloudflare Workers with Hono
  index.ts       App entry point, middleware stack, CSP
  routes/        API route handlers (auth, content, pulls, tokens, repos)
  middleware/     Auth resolution, permission enforcement, request logging
  lib/           GitHub API client, AES-256-GCM crypto, KV helpers, Axiom logger

src/             Frontend — React SPA
  components/    UI components (editor, reviews, settings, layout)
  hooks/         React hooks (all DOM-free for portability)
  api/           Typed fetch wrapper for the backend API

shared/          Shared between worker and frontend
  types.ts       TypeScript type definitions
  frontmatter.ts YAML frontmatter parsing/serialization
  branch.ts      Branch naming and preview URL generation

docs/content/    User-facing documentation (markdown with frontmatter)
```

## Conventions

- **File naming**: kebab-case for everything (`content-editor.tsx`, `use-config.ts`)
- **Hooks**: Must be DOM-free — no `document`, `window`, or DOM component imports
- **Frontmatter**: Use `js-yaml`, not `gray-matter` (edge runtime compatible)
- **Dates**: `YYYY-MM-DD` strings, not ISO timestamps
- **Repo format**: `owner/repo-name`, URL-encoded as `owner%2Frepo-name` in API paths

## Running tests

```bash
npm test             # Run once
npm run test:watch   # Watch mode
npm run typecheck    # TypeScript check
```

Tests run via `@cloudflare/vitest-pool-workers` — they execute in a Worker-like environment with real KV namespaces. The typical pattern is:

```typescript
import { env } from "cloudflare:test";

it("does something", async () => {
  const res = await app.request("/api/...", { method: "GET" }, env);
  expect(res.status).toBe(200);
});
```

## Architecture notes

### Single Worker, dual purpose

One Cloudflare Worker serves both the API and the SPA. API routes are under `/api/*` and `/auth/*`. All other routes serve the React app's `index.html` for client-side routing.

### Authentication

The auth middleware (`worker/middleware/auth.ts`) resolves two auth types from a single request:

1. **Session cookie** (`cms_session`) — full access, bypasses permission checks
2. **API token** (`Authorization: Bearer cms_...`) — subject to permission and repo scope enforcement

### Storage

All data lives in Cloudflare KV (no external databases):

- **SESSIONS** — browser session records (30-day TTL)
- **CMS_DATA** — user records, API tokens, repo lists, preferences

GitHub tokens are encrypted at rest with AES-256-GCM. API tokens are signed with HMAC-SHA256.

### Content operations

Content CRUD goes through `worker/lib/github.ts`, which wraps the GitHub Contents API. The CMS doesn't store content — it reads from and writes to GitHub on every request.

### Middleware stack

Requests pass through middleware in this order:

1. `bindingsMiddleware` — attach KV stores and config
2. `corsMiddleware` — CORS headers
3. Security headers — CSP (with per-request nonce), HSTS, etc.
4. `requestLoggerMiddleware` — request ID, logger, Axiom flush
5. `authMiddleware` — resolve session or API token
6. `requirePermission(...)` — enforce specific permissions
7. `requireRepoAccess()` — enforce repo scope
8. `requireSession()` — session-only endpoints (token management)

## CI/CD

GitHub Actions runs on every push and PR:

- **check** job: typecheck + tests
- **deploy** job (main only): build with Sentry env vars, create Sentry release with source maps, deploy to Cloudflare Workers
