# gitzen

A web-based markdown editor for static sites. Every save is a real git commit — your SSG reads files from disk as always.

**[gitzen.dev](https://gitzen.dev)**

## What is this?

gitzen gives you a visual editor for the markdown files your static site already uses. It connects to your GitHub repos and commits content changes directly. Blog posts, docs, changelogs, project pages — anything with YAML frontmatter.

It is **not a traditional CMS**. There's no content database and your site doesn't fetch from an API at build time. Your static site generator (Astro, Hugo, Next.js, Jekyll, Eleventy, etc.) keeps working exactly as it does today.

### Key features

- **Rich editor** — TipTap-based WYSIWYG with markdown shortcuts, bubble menu formatting, and frontmatter field editing
- **Git-native** — every save is a real commit, no sync layer or content database
- **PR workflow** — save as draft to a branch, auto-create PRs, preview deployments, structured diff review
- **Multi-repo** — connect and switch between multiple GitHub repositories
- **API tokens** — fine-grained permissions and repo scoping for programmatic access
- **Self-hostable** — runs on Cloudflare Workers (free tier works)

## Quick start

### 1. Add `cms.config.json` to your repo

```json
{
  "name": "My Blog",
  "collections": {
    "blog": {
      "label": "Blog Posts",
      "directory": "src/content/blog",
      "fields": [
        { "name": "title", "type": "string", "label": "Title", "required": true },
        { "name": "date", "type": "date", "label": "Date", "required": true },
        { "name": "description", "type": "string", "label": "Description" },
        { "name": "tags", "type": "string[]", "label": "Tags" },
        { "name": "draft", "type": "boolean", "label": "Draft", "default": false }
      ]
    }
  }
}
```

### 2. Install the GitHub App

Go to [github.com/apps/git-zen-cms](https://github.com/apps/git-zen-cms) and install it on your repositories.

### 3. Sign in

Visit [gitzen.dev/app](https://gitzen.dev/app), sign in with GitHub, and connect your repo. Your existing content appears in the sidebar — click to edit, or create new items.

## Content workflow

gitzen supports two save modes per collection:

| Mode | What happens |
|------|-------------|
| **Direct** | Committed to the default branch immediately |
| **PR (draft)** | Committed to a `cms/{collection}/{slug}` branch with an auto-created PR |

Draft PRs get Cloudflare Pages preview deployments automatically. The Reviews page shows structured diffs, conflict detection, and merge/rebase controls.

Configure per collection:

```json
{
  "workflow": {
    "default": "pr",
    "locked": false
  }
}
```

## Authentication

| Method | Use case |
|--------|----------|
| **Browser session** | Web editor (GitHub OAuth, 30-day sessions) |
| **API tokens** | Automations, CI/CD (fine-grained permissions, repo scoping) |
| **Device code flow** | CLI tools and native apps |

API tokens support six permissions: `content:read`, `content:write`, `content:delete`, `content:publish`, `config:read`, `repos:read`.

## API

gitzen exposes a REST API for programmatic access. All endpoints are under `/api/`.

```bash
# List content in a collection
curl -H "Authorization: Bearer cms_your_token" \
  https://gitzen.dev/api/repos/owner%2Frepo/content/blog

# Create or update a content item
curl -X PUT -H "Authorization: Bearer cms_your_token" \
  -H "Content-Type: application/json" \
  -d '{"frontmatter": {"title": "Hello"}, "body": "# Hello\n\nWorld."}' \
  https://gitzen.dev/api/repos/owner%2Frepo/content/blog/hello-world
```

See the full [API reference](https://gitzen.dev/docs/api-reference) for all endpoints.

## Self-hosting

gitzen is open source and designed to run on your own Cloudflare Workers instance.

```bash
git clone https://github.com/samjohnduke/gitzen.git
cd gitzen
npm install --legacy-peer-deps

# Create KV namespaces
wrangler kv namespace create SESSIONS
wrangler kv namespace create CMS_DATA

# Set secrets
wrangler secret put GITHUB_APP_CLIENT_ID
wrangler secret put GITHUB_APP_CLIENT_SECRET
wrangler secret put ENCRYPTION_KEY          # openssl rand -base64 32
wrangler secret put API_TOKEN_SECRET         # openssl rand -base64 32

# Deploy
npm run deploy
```

You'll need to [create a GitHub App](https://gitzen.dev/docs/self-hosting) first. The full self-hosting guide covers GitHub App setup, KV namespaces, secrets, custom domains, and local development.

## Architecture

```
gitzen/
├── worker/          # Cloudflare Workers backend (Hono)
│   ├── index.ts     # App entry point, CSP, Sentry
│   ├── routes/      # API route handlers
│   ├── middleware/   # Auth, permissions, logging
│   └── lib/         # GitHub client, crypto, KV
├── src/             # React SPA frontend
│   ├── components/  # Editor, reviews, settings UI
│   ├── hooks/       # Data fetching, auth, themes
│   └── api/         # Typed API client
├── shared/          # Types, frontmatter parsing
└── docs/            # Documentation content
```

A single Cloudflare Worker serves both the API (`/api/*`, `/auth/*`) and the SPA (all other routes). Storage is Cloudflare KV — no external databases.

### Security

- GitHub tokens encrypted at rest (AES-256-GCM)
- API tokens signed with HMAC-SHA256 (constant-time comparison)
- HKDF key derivation for cryptographic operations
- Content Security Policy with per-request nonces
- HttpOnly, SameSite, Secure session cookies

## Development

```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run preview      # Preview with wrangler
npm test             # Run tests
npm run test:watch   # Watch mode
npm run typecheck    # TypeScript check
```

Create a `.dev.vars` file for local secrets:

```
GITHUB_APP_CLIENT_ID=your_id
GITHUB_APP_CLIENT_SECRET=your_secret
ENCRYPTION_KEY=any-32-char-string-for-local-dev
API_TOKEN_SECRET=any-32-char-string-for-local-dev
```

## Documentation

- [Getting Started](https://gitzen.dev/docs/getting-started) — setup in 3 steps
- [Configuration](https://gitzen.dev/docs/configuration) — `cms.config.json` reference
- [Content Workflow](https://gitzen.dev/docs/workflow) — PR drafts, previews, conflict resolution
- [Authentication](https://gitzen.dev/docs/authentication) — sessions, API tokens, device flow
- [API Reference](https://gitzen.dev/docs/api-reference) — REST API endpoints
- [Self-Hosting](https://gitzen.dev/docs/self-hosting) — deploy your own instance

### SSG integration guides

- [Astro](https://gitzen.dev/docs/integrations/astro)
- [Hugo](https://gitzen.dev/docs/integrations/hugo)
- [Next.js](https://gitzen.dev/docs/integrations/nextjs)
- [Jekyll](https://gitzen.dev/docs/integrations/jekyll)
- [Eleventy](https://gitzen.dev/docs/integrations/eleventy)

## License

MIT
