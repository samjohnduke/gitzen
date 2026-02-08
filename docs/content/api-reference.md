---
title: API Reference
description: Complete REST API documentation for samduke-cms.
order: 4
---

All API endpoints are available at your CMS worker URL (e.g., `https://your-cms.workers.dev`).

## Authentication

Most endpoints require authentication via the `Authorization` header:

```
Authorization: Bearer cms_your_token_here
```

See the [Authentication guide](/docs/authentication) for details on creating and managing tokens.

## Repo path encoding

Repository names contain a `/` (e.g., `owner/repo-name`), which must be URL-encoded as `owner%2Frepo-name` in API paths.

## Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/api/health` | None | Health check |
| GET | `/api/auth/me` | None | Check auth status |
| GET | `/api/repos` | `repos:read` | List connected repos |
| POST | `/api/repos` | Session | Connect a repo |
| DELETE | `/api/repos/:repo` | Session | Disconnect a repo |
| GET | `/api/repos/:repo/config` | `config:read` | Get CMS config |
| GET | `/api/repos/:repo/content/:collection` | `content:read` | List content |
| GET | `/api/repos/:repo/content/:collection/:slug` | `content:read` | Get content item |
| PUT | `/api/repos/:repo/content/:collection/:slug` | `content:write` | Create/update content |
| DELETE | `/api/repos/:repo/content/:collection/:slug` | `content:delete` | Delete content |
| GET | `/api/github/repos` | Any auth | List GitHub repos |
| POST | `/api/tokens` | Session | Create API token |
| GET | `/api/tokens` | Session | List API tokens |
| DELETE | `/api/tokens/:tokenId` | Session | Revoke API token |

## Health check

```
GET /api/health
```

No authentication required.

```json
{ "status": "ok" }
```

## Auth status

```
GET /api/auth/me
```

No authentication required. Checks the session cookie.

```json
{ "authenticated": true, "username": "samducker" }
```

Or if not authenticated:

```json
{ "authenticated": false }
```

## Repositories

### List connected repos

```
GET /api/repos
```

**Permission:** `repos:read`

Returns all repositories connected to the CMS. API tokens only see repos within their scope.

```json
[
  { "fullName": "owner/repo-name", "addedAt": "2025-01-15T10:30:00.000Z" }
]
```

### Connect a repo

```
POST /api/repos
```

**Permission:** Session only

The repository must have a `cms.config.json` file in the root.

```json
{ "fullName": "owner/repo-name" }
```

**Response:** `201 Created`

```json
{ "ok": true }
```

**Errors:**

- `400` — Invalid repo format or missing `cms.config.json`
- `409` — Repository already connected

### Disconnect a repo

```
DELETE /api/repos/:repo
```

**Permission:** Session only

**Response:**

```json
{ "ok": true }
```

## Configuration

### Get CMS config

```
GET /api/repos/:repo/config
```

**Permission:** `config:read`

Returns the parsed `cms.config.json` from the repository.

```json
{
  "name": "My Blog",
  "collections": {
    "blog": {
      "label": "Blog Posts",
      "directory": "src/content/blog",
      "fields": [
        { "name": "title", "type": "string", "label": "Title", "required": true },
        { "name": "date", "type": "date", "label": "Date", "required": true }
      ]
    }
  }
}
```

## Content

### List content items

```
GET /api/repos/:repo/content/:collection
```

**Permission:** `content:read`

Returns all markdown files in the collection directory with parsed frontmatter.

```json
[
  {
    "slug": "hello-world",
    "path": "src/content/blog/hello-world.md",
    "sha": "abc123def456...",
    "frontmatter": {
      "title": "Hello World",
      "date": "2025-01-15",
      "tags": ["intro", "welcome"]
    }
  }
]
```

### Get a content item

```
GET /api/repos/:repo/content/:collection/:slug
```

**Permission:** `content:read`

Returns the full content item including the markdown body.

```json
{
  "slug": "hello-world",
  "path": "src/content/blog/hello-world.md",
  "sha": "abc123def456...",
  "frontmatter": {
    "title": "Hello World",
    "date": "2025-01-15"
  },
  "body": "This is my first blog post.\n\n## Introduction\n\nWelcome!"
}
```

### Create or update content

```
PUT /api/repos/:repo/content/:collection/:slug
```

**Permission:** `content:write`

To create a new item, omit `sha`. To update an existing item, include the current `sha` (for conflict detection).

```json
{
  "frontmatter": {
    "title": "Hello World",
    "date": "2025-01-15",
    "draft": false
  },
  "body": "This is my first blog post.",
  "sha": "abc123def456..."
}
```

**Response:**

```json
{
  "sha": "new789sha...",
  "path": "src/content/blog/hello-world.md"
}
```

**Errors:**

- `404` — Collection not found in `cms.config.json`
- `409` — Conflict — the file was modified externally. Fetch the latest `sha` and retry.

### Delete content

```
DELETE /api/repos/:repo/content/:collection/:slug?sha=abc123...
```

**Permission:** `content:delete`

The `sha` query parameter is required to prevent accidental deletion of modified content.

```json
{ "ok": true }
```

## Tokens

### Create a token

```
POST /api/tokens
```

**Permission:** Session only (API tokens cannot create tokens)

```json
{
  "name": "build-token",
  "repos": ["owner/repo-name"],
  "permissions": ["content:read", "config:read"],
  "expiresIn": 7776000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Token name (max 100 chars) |
| `repos` | `string[]` | Repo names, or `["*"]` for all |
| `permissions` | `string[]` | One or more permissions |
| `expiresIn` | `number \| null` | Seconds until expiry, or `null` for no expiry |

**Response:** `201 Created`

```json
{
  "tokenId": "a1b2c3...",
  "name": "build-token",
  "repos": ["owner/repo-name"],
  "permissions": ["content:read", "config:read"],
  "createdAt": "2025-01-15T10:30:00.000Z",
  "expiresAt": "2025-04-15T10:30:00.000Z",
  "lastUsedAt": null,
  "token": "cms_a1b2c3..."
}
```

> The `token` field is only included in the creation response. Store it securely — you won't be able to see it again.

### List tokens

```
GET /api/tokens
```

**Permission:** Session only

```json
[
  {
    "tokenId": "a1b2c3...",
    "name": "build-token",
    "repos": ["owner/repo-name"],
    "permissions": ["content:read", "config:read"],
    "createdAt": "2025-01-15T10:30:00.000Z",
    "expiresAt": "2025-04-15T10:30:00.000Z",
    "lastUsedAt": "2025-02-01T08:00:00.000Z"
  }
]
```

### Revoke a token

```
DELETE /api/tokens/:tokenId
```

**Permission:** Session only

```json
{ "ok": true }
```

## GitHub

### List accessible repos

```
GET /api/github/repos
```

**Permission:** Any authenticated user

Returns GitHub repositories the user has access to (via GitHub App installation).

```json
[
  {
    "fullName": "owner/repo-name",
    "private": false,
    "description": "My blog repository"
  }
]
```

## Error responses

All errors return JSON with an `error` field:

```json
{ "error": "Not found" }
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request — invalid input or missing fields |
| `401` | Unauthorized — missing or invalid authentication |
| `403` | Forbidden — insufficient permissions or repo not in token scope |
| `404` | Not found — resource doesn't exist |
| `409` | Conflict — concurrent edit detected, refresh and retry |
| `502` | Bad gateway — GitHub API error |
