import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import type {
  Env,
  AuthContext,
  UserRecord,
  ApiTokenRecord,
  SessionRecord,
  LegacySessionData,
} from "../types";
import { authMiddleware } from "./auth";
import { encrypt, hmacSign, generateRandomHex } from "../lib/crypto";

type TestApp = {
  Bindings: Env;
  Variables: { auth: AuthContext; githubToken: string; githubUsername: string };
};

function createApp() {
  const app = new Hono<TestApp>();
  app.use("*", authMiddleware);
  app.get("/test", (c) =>
    c.json({
      userId: c.var.auth.userId,
      username: c.var.auth.githubUsername,
      method: c.var.auth.authMethod,
      hasScope: !!c.var.auth.tokenScope,
      permissions: c.var.auth.tokenScope?.permissions ?? null,
      repos: c.var.auth.tokenScope?.repos ?? null,
      // Verify legacy aliases are also set
      legacyToken: c.var.githubToken,
      legacyUsername: c.var.githubUsername,
    })
  );
  return app;
}

const ENCRYPTION_KEY = "test-encryption-key";
const API_TOKEN_SECRET = "test-api-token-secret";

async function seedUser(userId: string, username: string, githubToken: string) {
  const encryptedToken = await encrypt(githubToken, ENCRYPTION_KEY);
  const userRecord: UserRecord = {
    githubUserId: userId,
    githubUsername: username,
    encryptedGithubToken: encryptedToken,
    encryptedRefreshToken: null,
    tokenExpiresAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await env.CMS_DATA.put(`user:${userId}`, JSON.stringify(userRecord));
  return userRecord;
}

async function seedSession(sessionId: string, userId: string, expiresIn = 86400000) {
  const session: SessionRecord = {
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiresIn).toISOString(),
  };
  await env.SESSIONS.put(sessionId, JSON.stringify(session));
  return session;
}

async function seedApiToken(
  userId: string,
  opts: Partial<ApiTokenRecord> = {}
) {
  const tokenId = generateRandomHex(20);
  const hmac = await hmacSign(tokenId, API_TOKEN_SECRET);
  const record: ApiTokenRecord = {
    tokenId,
    userId,
    name: opts.name ?? "Test token",
    repos: opts.repos ?? ["*"],
    permissions: opts.permissions ?? ["content:read"],
    createdAt: new Date().toISOString(),
    expiresAt: opts.expiresAt ?? null,
    lastUsedAt: opts.lastUsedAt ?? null,
  };
  await env.CMS_DATA.put(`api-token:${tokenId}`, JSON.stringify(record));
  return { tokenId, hmac, bearer: `Bearer cms_${tokenId}.${hmac}`, record };
}

describe("auth middleware", () => {
  beforeEach(async () => {
    const e = env as unknown as Record<string, unknown>;
    e.ENCRYPTION_KEY = ENCRYPTION_KEY;
    e.API_TOKEN_SECRET = API_TOKEN_SECRET;
    e.GITHUB_APP_CLIENT_ID = "test-client-id";
    e.GITHUB_APP_CLIENT_SECRET = "test-client-secret";
  });

  // --- No auth ---

  describe("unauthenticated requests", () => {
    it("rejects requests with no auth header and no cookie", async () => {
      const app = createApp();
      const res = await app.request("/test", {}, env);
      expect(res.status).toBe(401);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe("Unauthorized");
    });

    it("rejects requests with empty Authorization header", async () => {
      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Authorization: "" } },
        env
      );
      expect(res.status).toBe(401);
    });

    it("rejects non-existent session cookie", async () => {
      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Cookie: "cms_session=nonexistent-session-id" } },
        env
      );
      expect(res.status).toBe(401);
    });
  });

  // --- Raw GitHub token rejection ---

  describe("raw GitHub token rejection", () => {
    it("rejects ghp_ tokens with helpful error message", async () => {
      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Authorization: "Bearer ghp_abc123" } },
        env
      );
      expect(res.status).toBe(401);
      const body = await res.json<{ error: string }>();
      expect(body.error).toContain("no longer accepted");
      expect(body.error).toContain("CMS API token");
    });
  });

  // --- Session auth ---

  describe("session auth (new format)", () => {
    it("authenticates valid session and sets auth context", async () => {
      const userId = "12345";
      const githubToken = "gho_test_token_123";
      await seedUser(userId, "testuser", githubToken);
      const sessionId = "valid-session";
      await seedSession(sessionId, userId);

      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Cookie: `cms_session=${sessionId}` } },
        env
      );
      expect(res.status).toBe(200);
      const body = await res.json<Record<string, unknown>>();
      expect(body.userId).toBe(userId);
      expect(body.username).toBe("testuser");
      expect(body.method).toBe("session");
      expect(body.hasScope).toBe(false);
      // Legacy aliases should be set too
      expect(body.legacyToken).toBe(githubToken);
      expect(body.legacyUsername).toBe("testuser");
    });

    it("rejects expired session", async () => {
      const userId = "12345";
      await seedUser(userId, "testuser", "gho_test");
      const sessionId = "expired-session";
      await seedSession(sessionId, userId, -1000); // expired 1s ago

      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Cookie: `cms_session=${sessionId}` } },
        env
      );
      expect(res.status).toBe(401);
    });

    it("rejects session pointing to nonexistent user", async () => {
      const sessionId = "orphaned-session";
      await seedSession(sessionId, "nonexistent-user-99999");

      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Cookie: `cms_session=${sessionId}` } },
        env
      );
      expect(res.status).toBe(401);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe("Unauthorized");
    });

    it("handles session cookie among multiple cookies", async () => {
      const userId = "12345";
      await seedUser(userId, "testuser", "gho_test");
      const sessionId = "multi-cookie-session";
      await seedSession(sessionId, userId);

      const app = createApp();
      const res = await app.request(
        "/test",
        {
          headers: {
            Cookie: `other=value; cms_session=${sessionId}; another=thing`,
          },
        },
        env
      );
      expect(res.status).toBe(200);
    });
  });

  // --- API token auth ---

  describe("API token auth", () => {
    it("authenticates valid API token and sets scope", async () => {
      const userId = "12345";
      const githubToken = "gho_api_token_test";
      await seedUser(userId, "apiuser", githubToken);
      const { bearer } = await seedApiToken(userId, {
        repos: ["owner/repo"],
        permissions: ["content:read", "content:write"],
      });

      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Authorization: bearer } },
        env
      );
      expect(res.status).toBe(200);
      const body = await res.json<Record<string, unknown>>();
      expect(body.userId).toBe(userId);
      expect(body.username).toBe("apiuser");
      expect(body.method).toBe("api-token");
      expect(body.hasScope).toBe(true);
      expect(body.permissions).toEqual(["content:read", "content:write"]);
      expect(body.repos).toEqual(["owner/repo"]);
    });

    it("updates lastUsedAt on successful API token auth", async () => {
      const userId = "12345";
      await seedUser(userId, "user", "gho_token");
      const { bearer, tokenId } = await seedApiToken(userId);

      const app = createApp();
      await app.request(
        "/test",
        { headers: { Authorization: bearer } },
        env
      );

      const record = await env.CMS_DATA.get<ApiTokenRecord>(
        `api-token:${tokenId}`,
        "json"
      );
      expect(record?.lastUsedAt).not.toBeNull();
    });

    it("rejects API token with tampered HMAC", async () => {
      const tokenId = generateRandomHex(20);
      const fakeHmac = "a".repeat(64);

      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Authorization: `Bearer cms_${tokenId}.${fakeHmac}` } },
        env
      );
      expect(res.status).toBe(401);
    });

    it("rejects API token with missing dot separator", async () => {
      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Authorization: "Bearer cms_nodothere" } },
        env
      );
      expect(res.status).toBe(401);
    });

    it("rejects API token with empty token ID", async () => {
      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Authorization: "Bearer cms_.somesignature" } },
        env
      );
      expect(res.status).toBe(401);
    });

    it("rejects expired API token", async () => {
      const userId = "12345";
      await seedUser(userId, "user", "gho_expired");
      const { bearer } = await seedApiToken(userId, {
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });

      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Authorization: bearer } },
        env
      );
      expect(res.status).toBe(401);
    });

    it("allows API token with null expiresAt (never expires)", async () => {
      const userId = "12345";
      await seedUser(userId, "user", "gho_token");
      const { bearer } = await seedApiToken(userId, { expiresAt: null });

      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Authorization: bearer } },
        env
      );
      expect(res.status).toBe(200);
    });

    it("rejects revoked (deleted) API token", async () => {
      const tokenId = generateRandomHex(20);
      const hmac = await hmacSign(tokenId, API_TOKEN_SECRET);
      // Valid HMAC but no token record in KV

      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Authorization: `Bearer cms_${tokenId}.${hmac}` } },
        env
      );
      expect(res.status).toBe(401);
    });

    it("rejects API token whose user record was deleted", async () => {
      // Token exists but user record doesn't
      const tokenId = generateRandomHex(20);
      const hmac = await hmacSign(tokenId, API_TOKEN_SECRET);
      const record: ApiTokenRecord = {
        tokenId,
        userId: "ghost-user-12345",
        name: "Orphan token",
        repos: ["*"],
        permissions: ["content:read"],
        createdAt: new Date().toISOString(),
        expiresAt: null,
        lastUsedAt: null,
      };
      await env.CMS_DATA.put(`api-token:${tokenId}`, JSON.stringify(record));

      const app = createApp();
      const res = await app.request(
        "/test",
        { headers: { Authorization: `Bearer cms_${tokenId}.${hmac}` } },
        env
      );
      expect(res.status).toBe(401);
    });
  });

  // --- Auth method priority ---

  describe("auth method priority", () => {
    it("API token header takes precedence over session cookie", async () => {
      const userId = "12345";
      await seedUser(userId, "headeruser", "gho_token");
      const { bearer } = await seedApiToken(userId);
      const sessionId = "should-not-use";
      await seedSession(sessionId, userId);

      const app = createApp();
      const res = await app.request(
        "/test",
        {
          headers: {
            Authorization: bearer,
            Cookie: `cms_session=${sessionId}`,
          },
        },
        env
      );
      expect(res.status).toBe(200);
      const body = await res.json<Record<string, unknown>>();
      expect(body.method).toBe("api-token");
    });
  });
});
