---
title: Getting Started
description: Set up samduke-cms and make your first API call in under 5 minutes.
order: 1
---

A quick guide to getting samduke-cms running and fetching your first piece of content.

## What is samduke-cms?

samduke-cms is a Git-backed content management system that runs on Cloudflare Workers. It stores your content as markdown files in GitHub repositories and exposes a REST API for reading and writing content. It works with any static site generator — Astro, Next.js, Jekyll, Hugo, Eleventy, or anything that can make HTTP requests at build time.

## Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- A [GitHub account](https://github.com)
- [Node.js](https://nodejs.org) 18+ and npm
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)

## 1. Create a GitHub App

samduke-cms authenticates via a GitHub App (not a personal access token).

1. Go to **Settings → Developer settings → GitHub Apps → New GitHub App**
2. Set the callback URL to `https://your-cms.workers.dev/auth/callback` (or `http://localhost:8787/auth/callback` for local dev)
3. Under **Permissions**, grant:
   - **Repository → Contents**: Read and write
   - **Repository → Metadata**: Read-only
4. Save the **Client ID** and generate a **Client Secret**

## 2. Clone and deploy

```bash
git clone https://github.com/samducker/samduke-cms.git
cd samduke-cms
npm install --legacy-peer-deps
```

Set the required secrets:

```bash
wrangler secret put GITHUB_APP_CLIENT_ID
wrangler secret put GITHUB_APP_CLIENT_SECRET
wrangler secret put ENCRYPTION_KEY       # any 32+ character random string
wrangler secret put API_TOKEN_SECRET     # any 32+ character random string
```

Create the KV namespaces:

```bash
wrangler kv namespace create SESSIONS
wrangler kv namespace create CMS_DATA
```

Update `wrangler.jsonc` with the KV namespace IDs from the output, then deploy:

```bash
npm run deploy
```

## 3. Add cms.config.json to your repo

In the GitHub repository you want to manage, create a `cms.config.json` file at the root:

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

## 4. Connect your repo

1. Visit your CMS at `https://your-cms.workers.dev/app`
2. Sign in with GitHub
3. Click **Add Repository** and select your repo

The CMS validates that `cms.config.json` exists before connecting.

## 5. Create an API token

Go to **Settings → API Tokens** in the CMS app and create a new token:

- **Name**: `build-token`
- **Repos**: Select your repository (or `*` for all)
- **Permissions**: `content:read`, `config:read`

Copy the token — it's only shown once. It looks like `cms_a1b2c3...`.

## 6. Make your first API call

```bash
curl -H "Authorization: Bearer cms_your_token_here" \
  https://your-cms.workers.dev/api/repos/owner%2Frepo-name/content/blog
```

Response:

```json
[
  {
    "slug": "hello-world",
    "path": "src/content/blog/hello-world.md",
    "sha": "abc123...",
    "frontmatter": {
      "title": "Hello World",
      "date": "2025-01-15",
      "tags": ["intro"]
    }
  }
]
```

## Next steps

- [Configuration](/docs/configuration) — full `cms.config.json` reference
- [Authentication](/docs/authentication) — API tokens, permissions, device code flow
- [API Reference](/docs/api-reference) — complete endpoint documentation
- [Integration guides](/docs/integrations/astro) — connect to your SSG
