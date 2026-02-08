# samduke-cms

Custom Git-backed CMS for managing markdown content across multiple GitHub repos.

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
- `worker/middleware/auth.ts` — Session verification
- `worker/lib/github.ts` — GitHub API client
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
```

## Environment

- KV namespaces: `SESSIONS` (session storage), `CMS_DATA` (repo list, prefs)
- Secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
