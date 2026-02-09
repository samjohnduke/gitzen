---
title: Self-Hosting
description: Deploy your own gitzen instance on Cloudflare Workers.
order: 6
---

gitzen is open source and designed to be self-hosted. This guide walks through deploying your own instance on Cloudflare Workers.

## Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- A [GitHub account](https://github.com)
- [Node.js](https://nodejs.org) 18+ and npm
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)

## 1. Create a GitHub App

Your gitzen instance authenticates users via a GitHub App that you own.

1. Go to **Settings → Developer settings → GitHub Apps → New GitHub App**
2. Fill in the app details:
   - **App name**: Whatever you'd like (e.g., "My gitzen")
   - **Homepage URL**: Your worker URL (e.g., `https://my-gitzen.workers.dev`)
   - **Callback URL**: `https://my-gitzen.workers.dev/auth/callback`
3. Under **Permissions**, grant:
   - **Repository → Contents**: Read and write
   - **Repository → Pull requests**: Read and write
   - **Repository → Metadata**: Read-only
4. Under **Where can this GitHub App be installed?**, choose based on your needs:
   - **Only on this account** for personal use
   - **Any account** if others will install it
5. Create the app, then:
   - Note the **Client ID**
   - Generate a **Client Secret** and save it somewhere safe

## 2. Clone and build

```bash
git clone https://github.com/samducker/samduke-cms.git
cd samduke-cms
npm install --legacy-peer-deps
```

## 3. Create KV namespaces

gitzen uses two Cloudflare KV namespaces for storage:

```bash
wrangler kv namespace create SESSIONS
wrangler kv namespace create CMS_DATA
```

Each command outputs an ID. Update `wrangler.jsonc` with these IDs:

```jsonc
{
  "kv_namespaces": [
    { "binding": "SESSIONS", "id": "your-sessions-id-here" },
    { "binding": "CMS_DATA", "id": "your-cms-data-id-here" }
  ]
}
```

## 4. Set secrets

```bash
wrangler secret put GITHUB_APP_CLIENT_ID      # from step 1
wrangler secret put GITHUB_APP_CLIENT_SECRET   # from step 1
wrangler secret put ENCRYPTION_KEY             # any 32+ character random string
wrangler secret put API_TOKEN_SECRET           # any 32+ character random string
```

`ENCRYPTION_KEY` is used to encrypt GitHub tokens at rest (AES-256-GCM). `API_TOKEN_SECRET` signs API tokens (HMAC-SHA256). Generate both with something like `openssl rand -base64 32`.

## 5. Deploy

```bash
npm run deploy
```

Your instance is now live at `https://your-worker-name.workers.dev`.

## 6. Install the GitHub App

Before you can connect repos, install your GitHub App on the repositories you want to edit:

1. Go to your GitHub App's public page (Settings → Developer settings → GitHub Apps → your app)
2. Click **Install App** and select the repositories

## 7. Configure your repos

Add a `cms.config.json` to each repository you want to edit. See [Getting Started](/docs/getting-started) for the config format and [Configuration](/docs/configuration) for the full reference.

Then visit your instance, sign in with GitHub, and connect your repos.

## Custom domain

To use a custom domain instead of `*.workers.dev`:

1. Add a custom domain in the Cloudflare dashboard under your Worker's settings
2. Update the GitHub App's callback URL to `https://your-domain.com/auth/callback`

## Environment variables reference

| Secret | Purpose |
|--------|---------|
| `GITHUB_APP_CLIENT_ID` | GitHub App client ID for OAuth |
| `GITHUB_APP_CLIENT_SECRET` | GitHub App client secret for OAuth |
| `ENCRYPTION_KEY` | AES-256-GCM key for encrypting GitHub tokens at rest |
| `API_TOKEN_SECRET` | HMAC-SHA256 key for signing API tokens |

| KV Namespace | Purpose |
|--------------|---------|
| `SESSIONS` | Browser session storage |
| `CMS_DATA` | User records, API tokens, repo list, preferences |

## Local development

```bash
npm run dev
```

This starts a local dev server at `http://localhost:8787`. Set your GitHub App's callback URL to `http://localhost:8787/auth/callback` during development (or add a second callback URL).

For local dev, you can set environment variables in a `.dev.vars` file (not committed to git):

```
GITHUB_APP_CLIENT_ID=your_id
GITHUB_APP_CLIENT_SECRET=your_secret
ENCRYPTION_KEY=any-32-char-string-for-local-dev
API_TOKEN_SECRET=any-32-char-string-for-local-dev
```
