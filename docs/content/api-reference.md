---
title: API Reference
description: REST API documentation for gitzen.
order: 4
---

All API endpoints are available at your gitzen instance URL (e.g., `https://gitzen.dev`). Your static site doesn't need this API — it reads content files from disk. The API is for building automations and pipelines.

> **[Interactive API Reference →](/reference)** — browse endpoints, schemas, and try requests with the OpenAPI spec viewer. You can also download the [OpenAPI spec](/api/openapi.yaml) directly.

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
| POST | `/api/repos/:repo/pulls` | `content:write` | Create pull request |
| GET | `/api/repos/:repo/pulls` | `content:read` | List open CMS PRs |
| GET | `/api/repos/:repo/pulls/:number` | `content:read` | Get PR detail |
| GET | `/api/repos/:repo/pulls/:number/diff` | `content:read` | Get structured content diff |
| PUT | `/api/repos/:repo/pulls/:number/merge` | `content:publish` | Squash merge PR |
| PUT | `/api/repos/:repo/pulls/:number/update` | `content:write` | Update PR branch |
| POST | `/api/repos/:repo/pulls/:number/rebase` | `content:write` | Force rebase PR branch |
| DELETE | `/api/repos/:repo/pulls/:number` | `content:write` | Close PR + delete branch |
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
GET /api/repos/:repo/content/:collection/:slug?branch=cms/blog/my-post
```

**Permission:** `content:read`

Returns the full content item including the markdown body. If a `cms/{collection}/{slug}` branch exists, the response automatically includes `branch` and `prNumber` fields. Use the `?branch=` query parameter to explicitly read from a specific branch.

```json
{
  "slug": "hello-world",
  "path": "src/content/blog/hello-world.md",
  "sha": "abc123def456...",
  "frontmatter": {
    "title": "Hello World",
    "date": "2025-01-15"
  },
  "body": "This is my first blog post.\n\n## Introduction\n\nWelcome!",
  "branch": "cms/blog/hello-world",
  "prNumber": 42
}
```

The `branch` and `prNumber` fields are only present when the item has an active draft branch with an open PR.

### Create or update content

```
PUT /api/repos/:repo/content/:collection/:slug
```

**Permission:** `content:write`

To create a new item, omit `sha`. To update an existing item, include the current `sha` (for conflict detection). Set `mode` to `"branch"` to save to a draft branch instead of the default branch.

```json
{
  "frontmatter": {
    "title": "Hello World",
    "date": "2025-01-15",
    "draft": false
  },
  "body": "This is my first blog post.",
  "sha": "abc123def456...",
  "mode": "branch"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `frontmatter` | `object` | — | Frontmatter fields |
| `body` | `string` | — | Markdown body content |
| `sha` | `string` | — | Current file SHA (required for updates, omit for new files) |
| `mode` | `"direct"` or `"branch"` | `"direct"` | Save mode: `"direct"` commits to main, `"branch"` commits to `cms/{collection}/{slug}` |

**Response:**

```json
{
  "sha": "new789sha...",
  "path": "src/content/blog/hello-world.md",
  "branch": "cms/blog/hello-world"
}
```

The `branch` field is only present when `mode` is `"branch"`. When saving to a branch, the CMS auto-creates the branch from main's HEAD if it doesn't exist.

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

## Pull Requests

The CMS uses GitHub pull requests for draft content workflow. These endpoints manage CMS-created PRs (branches matching `cms/*`).

### Create a pull request

```
POST /api/repos/:repo/pulls
```

**Permission:** `content:write`

Creates a PR from an existing CMS branch. Typically called automatically after the first branch save.

```json
{
  "branch": "cms/blog/my-post",
  "title": "Draft: My New Post",
  "body": "Content created via CMS"
}
```

**Response:**

```json
{
  "number": 42,
  "htmlUrl": "https://github.com/owner/repo/pull/42",
  "previewUrl": "https://cms-blog-my-post.my-site.pages.dev"
}
```

### List open CMS PRs

```
GET /api/repos/:repo/pulls
```

**Permission:** `content:read`

Returns all open PRs with `cms/*` branches, enriched with collection/slug info and preview URLs.

```json
[
  {
    "number": 42,
    "title": "Draft: My New Post",
    "branch": "cms/blog/my-post",
    "state": "open",
    "merged": false,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z",
    "collection": "blog",
    "slug": "my-post",
    "previewUrl": "https://cms-blog-my-post.my-site.pages.dev",
    "author": "samducker"
  }
]
```

### Get PR detail

```
GET /api/repos/:repo/pulls/:number
```

**Permission:** `content:read`

Returns full PR detail including mergeable status.

```json
{
  "number": 42,
  "title": "Draft: My New Post",
  "branch": "cms/blog/my-post",
  "state": "open",
  "merged": false,
  "mergeable": true,
  "headSha": "abc123...",
  "baseSha": "def456...",
  "htmlUrl": "https://github.com/owner/repo/pull/42",
  "body": "Content created via CMS",
  "collection": "blog",
  "slug": "my-post",
  "previewUrl": "https://cms-blog-my-post.my-site.pages.dev",
  "author": "samducker",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T11:00:00.000Z"
}
```

### Get structured content diff

```
GET /api/repos/:repo/pulls/:number/diff
```

**Permission:** `content:read`

Returns a structured diff comparing the PR branch to the base branch. Frontmatter fields are diffed individually, and the body is returned as old/new text for client-side word-level diffing.

```json
[
  {
    "collection": "blog",
    "slug": "my-post",
    "type": "modified",
    "frontmatter": {
      "fields": [
        { "name": "title", "oldValue": "My Post", "newValue": "My Updated Post", "changed": true },
        { "name": "date", "oldValue": "2025-01-15", "newValue": "2025-01-15", "changed": false }
      ]
    },
    "body": {
      "oldBody": "Original content...",
      "newBody": "Updated content..."
    }
  }
]
```

### Squash merge PR

```
PUT /api/repos/:repo/pulls/:number/merge
```

**Permission:** `content:publish`

Squash merges the PR and deletes the branch.

**Response (success):**

```json
{ "sha": "merged123...", "merged": true }
```

**Response (conflict):** `409`

```json
{ "merged": false, "reason": "conflicts" }
```

### Update PR branch

```
PUT /api/repos/:repo/pulls/:number/update
```

**Permission:** `content:write`

Merges the default branch into the PR branch (equivalent to GitHub's "Update branch" button).

**Response (success):**

```json
{ "ok": true }
```

**Response (conflict):** `409`

```json
{ "ok": false, "reason": "conflicts" }
```

### Force rebase PR branch

```
POST /api/repos/:repo/pulls/:number/rebase
```

**Permission:** `content:write`

Recreates the branch from the latest default branch HEAD and re-commits the file content. Use this when "Update branch" fails due to conflicts. Safe for CMS branches since they're single-file edits and PRs are squash-merged.

```json
{ "ok": true }
```

### Close PR + delete branch

```
DELETE /api/repos/:repo/pulls/:number
```

**Permission:** `content:write`

Closes the PR without merging and deletes the branch.

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
