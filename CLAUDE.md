# samduke-cms

Web-based markdown editor for static sites. Edits commit directly to GitHub repos — your SSG reads files from disk as always.

## Architecture

- **Backend**: Hono on Cloudflare Workers (`worker/`)
- **Frontend**: React SPA (`src/`)
- **Shared**: Types and frontmatter parsing (`shared/`)
- Single Worker serves both the API (`/api/*`, `/auth/*`) and the SPA (all other routes)

## Conventions

- **File naming**: kebab-case for all files (e.g., `content-editor.tsx`, `use-config.ts`)
- **Hooks**: Must be DOM-free (no `document`, `window`, or DOM component imports) for future portability
- **Frontmatter**: Use `js-yaml` (not `gray-matter`) — edge runtime compatible
- **Dates**: `YYYY-MM-DD` strings, not ISO timestamps
- **Repo format**: `owner/repo-name`, URL-encoded as `owner%2Frepo-name` in API paths

## Key Paths

- `worker/index.ts` — Hono app entry point
- `worker/routes/` — API route handlers
- `worker/middleware/auth.ts` — Dual-mode auth (session + API token)
- `worker/middleware/require-permission.ts` — Permission enforcement middleware
- `worker/lib/github.ts` — GitHub API client
- `worker/lib/crypto.ts` — AES-256-GCM encryption + HMAC-SHA256 signing
- `worker/routes/tokens.ts` — API token CRUD
- `worker/routes/device-auth.ts` — Device code auth flow for native apps
- `shared/frontmatter.ts` — Parse/serialize frontmatter
- `shared/types.ts` — Shared type definitions
- `src/api/client.ts` — Typed fetch wrapper
- `src/components/` — React components
- `src/hooks/` — React hooks

## Dev Commands

```bash
npm run dev      # Vite dev server
npm run build    # Build for production
npm run preview  # Preview with wrangler
npm run deploy   # Deploy to Cloudflare Workers
npm test         # Run Vitest tests
npm run test:watch  # Watch mode
```

## Environment

- KV namespaces: `SESSIONS` (session storage), `CMS_DATA` (user records, tokens, repo list, prefs)
- Secrets:
  - `GITHUB_APP_CLIENT_ID` — GitHub App client ID
  - `GITHUB_APP_CLIENT_SECRET` — GitHub App client secret
  - `ENCRYPTION_KEY` — AES-256-GCM key for encrypting GitHub tokens at rest
  - `API_TOKEN_SECRET` — HMAC-SHA256 key for signing CMS API tokens
