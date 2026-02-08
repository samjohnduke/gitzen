---
title: Authentication
description: How authentication works in samduke-cms — browser sessions, API tokens, and device code flow.
order: 3
---

samduke-cms supports three authentication methods: browser sessions for the web UI, API tokens for programmatic access, and device code flow for CLI tools.

## Browser sessions

When you sign in via the web UI at `/app`, the CMS redirects to GitHub for OAuth. After authorization, a session cookie (`cms_session`) is set with a 30-day expiry.

Sessions have full access — they bypass all permission checks. This is because the browser UI is for interactive management by the repository owner.

## API tokens

API tokens are designed for build scripts, CI/CD pipelines, and programmatic access. They support fine-grained permissions and repo scoping.

### Creating a token

Create tokens from the CMS web UI under **Settings → API Tokens**, or via the API if you have a session.

```bash
# Via the API (requires session cookie)
curl -X POST https://your-cms.workers.dev/api/tokens \
  -H "Cookie: cms_session=your_session_id" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "build-token",
    "repos": ["owner/repo-name"],
    "permissions": ["content:read", "config:read"],
    "expiresIn": 7776000
  }'
```

### Token format

Tokens look like `cms_a1b2c3d4e5...`. The format is `cms_{tokenId}.{hmac}` where the HMAC is a cryptographic signature ensuring the token hasn't been tampered with.

### Using a token

Pass the token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer cms_your_token_here" \
  https://your-cms.workers.dev/api/repos/owner%2Frepo-name/content/blog
```

### Permissions

Tokens must specify at least one permission. Available permissions:

| Permission | Description |
|-----------|-------------|
| `content:read` | List and read content items |
| `content:write` | Create and update content items |
| `content:delete` | Delete content items |
| `config:read` | Read `cms.config.json` from repos |
| `repos:read` | List connected repositories |

A typical build token only needs `content:read` and `config:read`.

### Repo scoping

Tokens can be scoped to specific repositories or granted access to all repos:

- **Specific repos**: `"repos": ["owner/repo-1", "owner/repo-2"]`
- **All repos**: `"repos": ["*"]`

Requests to repos outside the token's scope return `403 Forbidden`.

### Token lifecycle

- **Expiry**: Set `expiresIn` (in seconds) when creating. Pass `null` for tokens that never expire.
- **Revocation**: Delete a token via the UI or API (`DELETE /api/tokens/:tokenId`). Revoked tokens are immediately invalid.
- **Last used**: The CMS tracks when each token was last used.

### Restrictions

API tokens cannot:
- Create, list, or delete other tokens (use a browser session)
- Access repos outside their scope
- Perform actions beyond their permissions

## Device code flow

For CLI tools and native apps that can't redirect to a browser, the device code flow provides a way to authenticate.

### How it works

1. Your app requests a device code from the CMS
2. The user visits a URL and enters the code in their browser
3. Your app polls until the user authorizes
4. The CMS returns an API token

### Step 1: Request a device code

```bash
curl -X POST https://your-cms.workers.dev/auth/device
```

Response:

```json
{
  "deviceCode": "abc123...",
  "userCode": "ABCD-1234",
  "verificationUri": "https://github.com/login/device",
  "expiresIn": 900,
  "interval": 5
}
```

### Step 2: Direct the user

Display the `userCode` and tell the user to visit the `verificationUri` in their browser.

### Step 3: Poll for completion

```bash
curl -X POST https://your-cms.workers.dev/auth/device/token \
  -H "Content-Type: application/json" \
  -d '{"deviceCode": "abc123..."}'
```

Possible responses:

| Status | Meaning |
|--------|---------|
| `"pending"` | User hasn't authorized yet — keep polling |
| `"slow_down"` | You're polling too fast — increase interval |
| `"expired"` | The code expired — start over |
| `"denied"` | The user denied authorization |
| `"success"` | Authorization complete — token included |

Success response:

```json
{
  "status": "success",
  "token": "cms_a1b2c3...",
  "expiresAt": "2025-04-15T00:00:00.000Z",
  "username": "samducker"
}
```

Device code tokens are created with 90-day expiry and full permissions on all repos.

## Security notes

- GitHub tokens are encrypted at rest using AES-256-GCM. The CMS never stores plaintext GitHub tokens.
- API tokens are verified using HMAC-SHA256 with constant-time comparison to prevent timing attacks.
- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` (in production).
- GitHub tokens are automatically refreshed when they're within 5 minutes of expiry.
