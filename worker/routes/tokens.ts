import { Hono } from "hono";
import type { Env, AuthContext, ApiTokenRecord, UserTokenIndex } from "../types.js";
import type { Permission, ApiTokenSummary, ApiTokenCreated } from "../../shared/types.js";
import { generateRandomHex, hmacSign } from "../lib/crypto.js";
import { requireSession } from "../middleware/require-permission.js";

type TokensApp = {
  Bindings: Env;
  Variables: { auth: AuthContext; githubToken: string; githubUsername: string };
};

const VALID_PERMISSIONS: Permission[] = [
  "content:read",
  "content:write",
  "content:delete",
  "content:publish",
  "config:read",
  "repos:read",
];

const tokens = new Hono<TokensApp>();

// All token management requires session auth (no API token inception)
tokens.use("/*", requireSession());

// Create a new API token
tokens.post("/", async (c) => {
  const auth = c.var.auth;
  const body = await c.req.json<{
    name: string;
    repos: string[];
    permissions: Permission[];
    expiresIn?: number | null; // seconds from now, null = never
  }>();

  if (!body.name || body.name.length > 100) {
    return c.json({ error: "Name is required (max 100 chars)" }, 400);
  }

  if (!/^[\w\s\-:.()'+,]+$/.test(body.name)) {
    return c.json({ error: "Token name contains invalid characters" }, 400);
  }

  if (!body.repos || body.repos.length === 0) {
    return c.json({ error: "At least one repo (or '*') is required" }, 400);
  }

  const REPO_FORMAT_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
  for (const repo of body.repos) {
    if (repo !== "*" && !REPO_FORMAT_RE.test(repo)) {
      return c.json({ error: `Invalid repo format: ${repo}` }, 400);
    }
  }

  if (!body.permissions || body.permissions.length === 0) {
    return c.json({ error: "At least one permission is required" }, 400);
  }

  for (const perm of body.permissions) {
    if (!VALID_PERMISSIONS.includes(perm)) {
      return c.json({ error: `Invalid permission: ${perm}` }, 400);
    }
  }

  if (body.expiresIn !== undefined && body.expiresIn !== null) {
    if (body.expiresIn < 300) {
      return c.json({ error: "Expiry must be at least 300 seconds (5 minutes)" }, 400);
    }
    if (body.expiresIn > 31536000) {
      return c.json({ error: "Expiry must not exceed 31536000 seconds (1 year)" }, 400);
    }
  }

  const tokenId = generateRandomHex(20); // 40 hex chars
  const hmac = await hmacSign(tokenId, c.env.API_TOKEN_SECRET);
  const fullToken = `cms_${tokenId}.${hmac}`;

  const expiresAt = body.expiresIn
    ? new Date(Date.now() + body.expiresIn * 1000).toISOString()
    : null;

  const record: ApiTokenRecord = {
    tokenId,
    userId: auth.userId,
    name: body.name,
    repos: body.repos,
    permissions: body.permissions,
    createdAt: new Date().toISOString(),
    expiresAt,
    lastUsedAt: null,
  };

  // Store token record
  await c.env.CMS_DATA.put(
    `api-token:${tokenId}`,
    JSON.stringify(record)
  );

  // Update user token index
  const indexKey = `user-tokens:${auth.userId}`;
  const index = await c.env.CMS_DATA.get<UserTokenIndex>(indexKey, "json");
  const tokenIds = index?.tokenIds ?? [];
  tokenIds.push(tokenId);
  await c.env.CMS_DATA.put(indexKey, JSON.stringify({ tokenIds }));

  const response: ApiTokenCreated = {
    tokenId: record.tokenId,
    name: record.name,
    repos: record.repos,
    permissions: record.permissions,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    lastUsedAt: record.lastUsedAt,
    token: fullToken,
  };

  return c.json(response, 201);
});

// List all tokens for the current user
tokens.get("/", async (c) => {
  const auth = c.var.auth;
  const indexKey = `user-tokens:${auth.userId}`;
  const index = await c.env.CMS_DATA.get<UserTokenIndex>(indexKey, "json");

  if (!index || index.tokenIds.length === 0) {
    return c.json([]);
  }

  const summaries: ApiTokenSummary[] = [];
  for (const id of index.tokenIds) {
    const record = await c.env.CMS_DATA.get<ApiTokenRecord>(
      `api-token:${id}`,
      "json"
    );
    if (!record) continue;

    summaries.push({
      tokenId: record.tokenId,
      name: record.name,
      repos: record.repos,
      permissions: record.permissions,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      lastUsedAt: record.lastUsedAt,
    });
  }

  return c.json(summaries);
});

// Revoke (delete) a token
tokens.delete("/:tokenId", async (c) => {
  const auth = c.var.auth;
  const tokenId = c.req.param("tokenId");

  const record = await c.env.CMS_DATA.get<ApiTokenRecord>(
    `api-token:${tokenId}`,
    "json"
  );

  if (!record || record.userId !== auth.userId) {
    return c.json({ error: "Token not found" }, 404);
  }

  // Delete the token record
  await c.env.CMS_DATA.delete(`api-token:${tokenId}`);

  // Remove from user index
  const indexKey = `user-tokens:${auth.userId}`;
  const index = await c.env.CMS_DATA.get<UserTokenIndex>(indexKey, "json");
  if (index) {
    index.tokenIds = index.tokenIds.filter((id) => id !== tokenId);
    await c.env.CMS_DATA.put(indexKey, JSON.stringify(index));
  }

  return c.json({ ok: true });
});

export default tokens;
