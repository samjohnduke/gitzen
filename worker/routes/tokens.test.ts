import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import type {
  AuthContext,
  AppVariables,
  ApiTokenRecord,
  UserTokenIndex,
} from "../types";
import type { ApiTokenCreated, ApiTokenSummary } from "../../shared/types";
import tokensRoutes from "./tokens";
import { hmacVerify } from "../lib/crypto";
import { CloudflareKVStore } from "../lib/kv-cloudflare";
import type { AppConfig } from "../lib/config";

const ENCRYPTION_KEY = "test-encryption-key";
const API_TOKEN_SECRET = "test-api-token-secret";

const testConfig: AppConfig = {
  githubAppClientId: "test-client-id",
  githubAppClientSecret: "test-client-secret",
  encryptionKey: ENCRYPTION_KEY,
  apiTokenSecret: API_TOKEN_SECRET,
  sentryDsn: "",
  axiomApiToken: "",
  axiomDataset: "",
};

function createApp(auth: AuthContext) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use("*", async (c, next) => {
    c.set("auth", auth);
    c.set("githubToken", auth.githubToken);
    c.set("githubUsername", auth.githubUsername);
    c.set("sessions", new CloudflareKVStore(env.SESSIONS));
    c.set("data", new CloudflareKVStore(env.CMS_DATA));
    c.set("config", testConfig);
    return next();
  });
  app.route("/api/tokens", tokensRoutes);
  return app;
}

const sessionAuth: AuthContext = {
  userId: "12345",
  githubUsername: "testuser",
  githubToken: "gho_test",
  authMethod: "session",
};

const apiTokenAuth: AuthContext = {
  userId: "12345",
  githubUsername: "testuser",
  githubToken: "gho_test",
  authMethod: "api-token",
  tokenScope: { repos: ["*"], permissions: ["content:read"] },
};

function post(app: ReturnType<typeof createApp>, body: Record<string, unknown>) {
  return app.request(
    "/api/tokens",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("tokens routes", () => {
  // --- POST /api/tokens ---

  describe("POST /api/tokens", () => {
    it("creates a token and returns the full secret once", async () => {
      const app = createApp(sessionAuth);
      const res = await post(app, {
        name: "CI deploy",
        repos: ["owner/repo"],
        permissions: ["content:read", "content:write"],
        expiresIn: 86400,
      });

      expect(res.status).toBe(201);
      const body = await res.json<ApiTokenCreated>();
      expect(body.name).toBe("CI deploy");
      expect(body.token).toMatch(/^cms_[0-9a-f]{40}\./);
      expect(body.repos).toEqual(["owner/repo"]);
      expect(body.permissions).toEqual(["content:read", "content:write"]);
      expect(body.expiresAt).toBeTruthy();
      expect(body.tokenId).toBeTruthy();
      expect(body.createdAt).toBeTruthy();
      expect(body.lastUsedAt).toBeNull();

      // Verify HMAC is cryptographically valid
      const parts = body.token.slice(4).split(".");
      expect(await hmacVerify(parts[0], parts[1], API_TOKEN_SECRET)).toBe(true);
    });

    it("creates token with null expiresIn (never expires)", async () => {
      const app = createApp(sessionAuth);
      const res = await post(app, {
        name: "Permanent",
        repos: ["*"],
        permissions: ["content:read"],
        expiresIn: null,
      });
      expect(res.status).toBe(201);
      const body = await res.json<ApiTokenCreated>();
      expect(body.expiresAt).toBeNull();
    });

    it("creates token without expiresIn field (never expires)", async () => {
      const app = createApp(sessionAuth);
      const res = await post(app, {
        name: "No expiry field",
        repos: ["*"],
        permissions: ["content:read"],
      });
      expect(res.status).toBe(201);
      const body = await res.json<ApiTokenCreated>();
      expect(body.expiresAt).toBeNull();
    });

    it("stores token in KV and user index", async () => {
      const app = createApp(sessionAuth);
      const res = await post(app, {
        name: "KV check",
        repos: ["*"],
        permissions: ["content:read"],
      });
      const body = await res.json<ApiTokenCreated>();

      // Check token record
      const record = await env.CMS_DATA.get<ApiTokenRecord>(
        `api-token:${body.tokenId}`,
        "json"
      );
      expect(record).not.toBeNull();
      expect(record!.name).toBe("KV check");
      expect(record!.userId).toBe("12345");

      // Check user index
      const index = await env.CMS_DATA.get<UserTokenIndex>(
        `user-tokens:${sessionAuth.userId}`,
        "json"
      );
      expect(index).not.toBeNull();
      expect(index!.tokenIds).toContain(body.tokenId);
    });

    // --- Validation ---

    it("rejects empty name", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "",
        repos: ["*"],
        permissions: ["content:read"],
      });
      expect(res.status).toBe(400);
    });

    it("rejects name over 100 characters", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "x".repeat(101),
        repos: ["*"],
        permissions: ["content:read"],
      });
      expect(res.status).toBe(400);
    });

    it("allows name of exactly 100 characters", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "x".repeat(100),
        repos: ["*"],
        permissions: ["content:read"],
      });
      expect(res.status).toBe(201);
    });

    it("rejects empty repos array", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Test",
        repos: [],
        permissions: ["content:read"],
      });
      expect(res.status).toBe(400);
    });

    it("rejects empty permissions array", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Test",
        repos: ["*"],
        permissions: [],
      });
      expect(res.status).toBe(400);
    });

    it("rejects invalid permission string", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Bad",
        repos: ["*"],
        permissions: ["admin:all"],
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toContain("admin:all");
    });

    it("rejects mixed valid and invalid permissions", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Mixed",
        repos: ["*"],
        permissions: ["content:read", "nonexistent:perm"],
      });
      expect(res.status).toBe(400);
    });

    it("rejects HTML in token name", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "<script>alert(1)</script>",
        repos: ["*"],
        permissions: ["content:read"],
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toContain("invalid characters");
    });

    it("accepts valid token name characters", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "CI deploy (prod): v2.0 - main",
        repos: ["*"],
        permissions: ["content:read"],
      });
      expect(res.status).toBe(201);
    });

    it("rejects invalid repo format", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Test",
        repos: ["not-a-valid-repo"],
        permissions: ["content:read"],
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toContain("Invalid repo format");
    });

    it("rejects repo starting with dot", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Test",
        repos: [".hidden/repo"],
        permissions: ["content:read"],
      });
      expect(res.status).toBe(400);
    });

    it("accepts wildcard repo", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Test",
        repos: ["*"],
        permissions: ["content:read"],
      });
      expect(res.status).toBe(201);
    });

    it("accepts valid owner/repo format", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Test",
        repos: ["owner/my-repo.js"],
        permissions: ["content:read"],
      });
      expect(res.status).toBe(201);
    });

    it("rejects negative expiry", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Test",
        repos: ["*"],
        permissions: ["content:read"],
        expiresIn: -100,
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toContain("at least 300");
    });

    it("rejects zero expiry", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Test",
        repos: ["*"],
        permissions: ["content:read"],
        expiresIn: 0,
      });
      expect(res.status).toBe(400);
    });

    it("rejects expiry exceeding 1 year", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Test",
        repos: ["*"],
        permissions: ["content:read"],
        expiresIn: 31536001,
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toContain("must not exceed");
    });

    it("accepts expiry at minimum bound (300s)", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Test",
        repos: ["*"],
        permissions: ["content:read"],
        expiresIn: 300,
      });
      expect(res.status).toBe(201);
    });

    it("accepts expiry at maximum bound (1 year)", async () => {
      const res = await post(createApp(sessionAuth), {
        name: "Test",
        repos: ["*"],
        permissions: ["content:read"],
        expiresIn: 31536000,
      });
      expect(res.status).toBe(201);
    });

    it("rejects API token auth (session only, no token inception)", async () => {
      const res = await post(createApp(apiTokenAuth), {
        name: "Inception",
        repos: ["*"],
        permissions: ["content:read"],
      });
      expect(res.status).toBe(403);
    });
  });

  // --- GET /api/tokens ---

  describe("GET /api/tokens", () => {
    it("lists tokens without exposing the secret", async () => {
      const app = createApp(sessionAuth);
      await post(app, {
        name: "List test",
        repos: ["owner/repo"],
        permissions: ["content:read"],
      });

      const res = await app.request("/api/tokens");
      expect(res.status).toBe(200);
      const body = await res.json<ApiTokenSummary[]>();
      expect(body.length).toBeGreaterThanOrEqual(1);

      const token = body.find((t) => t.name === "List test");
      expect(token).toBeDefined();
      expect(token!.tokenId).toBeTruthy();
      expect(token!.repos).toEqual(["owner/repo"]);
      expect(token!.permissions).toEqual(["content:read"]);
      // Secret must NOT be in the listing
      expect("token" in token!).toBe(false);
      expect(
        (token as unknown as Record<string, unknown>).token
      ).toBeUndefined();
    });

    it("returns empty array when user has no tokens", async () => {
      const freshAuth = { ...sessionAuth, userId: "fresh-user-99999" };
      const app = createApp(freshAuth);
      const res = await app.request("/api/tokens");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    });

    it("only lists tokens for the requesting user", async () => {
      const app1 = createApp(sessionAuth);
      await post(app1, {
        name: "User1 token",
        repos: ["*"],
        permissions: ["content:read"],
      });

      const otherAuth = { ...sessionAuth, userId: "other-user-77777" };
      const app2 = createApp(otherAuth);
      const res = await app2.request("/api/tokens");
      expect(res.status).toBe(200);
      const body = await res.json<ApiTokenSummary[]>();
      expect(body.find((t) => t.name === "User1 token")).toBeUndefined();
    });

    it("handles deleted token records gracefully (stale index)", async () => {
      const app = createApp(sessionAuth);
      const createRes = await post(app, {
        name: "Will be orphaned",
        repos: ["*"],
        permissions: ["content:read"],
      });
      const created = await createRes.json<ApiTokenCreated>();

      // Manually delete the token record but leave the index pointing to it
      await env.CMS_DATA.delete(`api-token:${created.tokenId}`);

      const res = await app.request("/api/tokens");
      expect(res.status).toBe(200);
      const body = await res.json<ApiTokenSummary[]>();
      // Orphaned entry should be silently skipped
      expect(body.find((t) => t.tokenId === created.tokenId)).toBeUndefined();
    });

    it("rejects API token auth for listing", async () => {
      const app = createApp(apiTokenAuth);
      const res = await app.request("/api/tokens");
      expect(res.status).toBe(403);
    });
  });

  // --- DELETE /api/tokens/:tokenId ---

  describe("DELETE /api/tokens/:tokenId", () => {
    it("revokes a token and removes from KV + index", async () => {
      const app = createApp(sessionAuth);
      const createRes = await post(app, {
        name: "To revoke",
        repos: ["*"],
        permissions: ["content:read"],
      });
      const created = await createRes.json<ApiTokenCreated>();

      const deleteRes = await app.request(
        `/api/tokens/${created.tokenId}`,
        { method: "DELETE" },
      );
      expect(deleteRes.status).toBe(200);

      // Token record should be deleted
      const record = await env.CMS_DATA.get(`api-token:${created.tokenId}`);
      expect(record).toBeNull();

      // Token ID should be removed from user index
      const index = await env.CMS_DATA.get<UserTokenIndex>(
        `user-tokens:${sessionAuth.userId}`,
        "json"
      );
      if (index) {
        expect(index.tokenIds).not.toContain(created.tokenId);
      }
    });

    it("revoked token no longer appears in list", async () => {
      const app = createApp(sessionAuth);
      const createRes = await post(app, {
        name: "Revoke then list",
        repos: ["*"],
        permissions: ["content:read"],
      });
      const created = await createRes.json<ApiTokenCreated>();

      await app.request(
        `/api/tokens/${created.tokenId}`,
        { method: "DELETE" },
      );

      const listRes = await app.request("/api/tokens");
      const body = await listRes.json<ApiTokenSummary[]>();
      expect(body.find((t) => t.tokenId === created.tokenId)).toBeUndefined();
    });

    it("returns 404 for nonexistent token ID", async () => {
      const app = createApp(sessionAuth);
      const res = await app.request(
        "/api/tokens/nonexistent-id",
        { method: "DELETE" },
      );
      expect(res.status).toBe(404);
    });

    it("prevents revoking another user's token", async () => {
      const app1 = createApp(sessionAuth);
      const createRes = await app1.request(
        "/api/tokens",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Other user's token",
            repos: ["*"],
            permissions: ["content:read"],
          }),
        },
      );
      const created = await createRes.json<ApiTokenCreated>();

      const otherAuth = { ...sessionAuth, userId: "attacker-99999" };
      const app2 = createApp(otherAuth);
      const deleteRes = await app2.request(
        `/api/tokens/${created.tokenId}`,
        { method: "DELETE" },
      );
      expect(deleteRes.status).toBe(404);

      // Original token should still exist
      const record = await env.CMS_DATA.get(`api-token:${created.tokenId}`);
      expect(record).not.toBeNull();
    });

    it("double-delete returns 404 on second attempt", async () => {
      const app = createApp(sessionAuth);
      const createRes = await post(app, {
        name: "Double delete",
        repos: ["*"],
        permissions: ["content:read"],
      });
      const created = await createRes.json<ApiTokenCreated>();

      const first = await app.request(
        `/api/tokens/${created.tokenId}`,
        { method: "DELETE" },
      );
      expect(first.status).toBe(200);

      const second = await app.request(
        `/api/tokens/${created.tokenId}`,
        { method: "DELETE" },
      );
      expect(second.status).toBe(404);
    });

    it("rejects API token auth for revoking", async () => {
      const app = createApp(apiTokenAuth);
      const res = await app.request(
        "/api/tokens/any-id",
        { method: "DELETE" },
      );
      expect(res.status).toBe(403);
    });
  });
});
