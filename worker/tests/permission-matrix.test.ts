import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { AuthContext } from "../types";
import type { Permission } from "../../shared/types";
import {
  requirePermission,
  requireRepoAccess,
  requireSession,
} from "../middleware/require-permission";

/**
 * Permission matrix test: verifies every route x permission x auth-method.
 * Uses minimal Hono apps with the real permission middleware.
 */

type TestApp = {
  Variables: { auth: AuthContext; githubToken: string; githubUsername: string };
};

function makeApp(auth: AuthContext) {
  const app = new Hono<TestApp>();

  app.use("*", async (c, next) => {
    c.set("auth", auth);
    c.set("githubToken", auth.githubToken);
    c.set("githubUsername", auth.githubUsername);
    return next();
  });

  // Mirror the actual route definitions
  app.get("/api/repos", requirePermission("repos:read"), (c) =>
    c.json({ route: "list-repos" })
  );

  app.get(
    "/api/repos/:repo/config",
    requirePermission("config:read"),
    requireRepoAccess(),
    (c) => c.json({ route: "get-config" })
  );

  app.get(
    "/api/repos/:repo/content/:col",
    requirePermission("content:read"),
    requireRepoAccess(),
    (c) => c.json({ route: "list-content" })
  );

  app.get(
    "/api/repos/:repo/content/:col/:slug",
    requirePermission("content:read"),
    requireRepoAccess(),
    (c) => c.json({ route: "get-content" })
  );

  app.put(
    "/api/repos/:repo/content/:col/:slug",
    requirePermission("content:write"),
    requireRepoAccess(),
    (c) => c.json({ route: "write-content" })
  );

  app.delete(
    "/api/repos/:repo/content/:col/:slug",
    requirePermission("content:delete"),
    requireRepoAccess(),
    (c) => c.json({ route: "delete-content" })
  );

  // PR routes
  app.post(
    "/api/repos/:repo/pulls",
    requirePermission("content:write"),
    requireRepoAccess(),
    (c) => c.json({ route: "create-pr" })
  );

  app.get(
    "/api/repos/:repo/pulls",
    requirePermission("content:read"),
    requireRepoAccess(),
    (c) => c.json({ route: "list-prs" })
  );

  app.get(
    "/api/repos/:repo/pulls/:number",
    requirePermission("content:read"),
    requireRepoAccess(),
    (c) => c.json({ route: "get-pr" })
  );

  app.get(
    "/api/repos/:repo/pulls/:number/diff",
    requirePermission("content:read"),
    requireRepoAccess(),
    (c) => c.json({ route: "get-pr-diff" })
  );

  app.put(
    "/api/repos/:repo/pulls/:number/merge",
    requirePermission("content:publish"),
    requireRepoAccess(),
    (c) => c.json({ route: "merge-pr" })
  );

  app.put(
    "/api/repos/:repo/pulls/:number/update",
    requirePermission("content:write"),
    requireRepoAccess(),
    (c) => c.json({ route: "update-pr-branch" })
  );

  app.post(
    "/api/repos/:repo/pulls/:number/rebase",
    requirePermission("content:write"),
    requireRepoAccess(),
    (c) => c.json({ route: "rebase-pr" })
  );

  app.delete(
    "/api/repos/:repo/pulls/:number",
    requirePermission("content:write"),
    requireRepoAccess(),
    (c) => c.json({ route: "close-pr" })
  );

  app.post("/api/tokens", requireSession(), (c) =>
    c.json({ route: "create-token" })
  );

  app.get("/api/tokens", requireSession(), (c) =>
    c.json({ route: "list-tokens" })
  );

  app.delete("/api/tokens/:id", requireSession(), (c) =>
    c.json({ route: "revoke-token" })
  );

  return app;
}

function tokenAuth(
  perms: Permission[],
  repos: string[] = ["*"]
): AuthContext {
  return {
    userId: "123",
    githubUsername: "testuser",
    githubToken: "ghp_test",
    authMethod: "api-token",
    tokenScope: { repos, permissions: perms },
  };
}

const sessionCtx: AuthContext = {
  userId: "123",
  githubUsername: "testuser",
  githubToken: "ghp_test",
  authMethod: "session",
};

const repo = encodeURIComponent("owner/repo-a");

// --- Session auth: full access to everything ---

describe("session auth — full access to all routes", () => {
  const app = makeApp(sessionCtx);

  const routes = [
    ["GET", "/api/repos"],
    ["GET", `/api/repos/${repo}/config`],
    ["GET", `/api/repos/${repo}/content/blog`],
    ["GET", `/api/repos/${repo}/content/blog/hello`],
    ["PUT", `/api/repos/${repo}/content/blog/hello`],
    ["DELETE", `/api/repos/${repo}/content/blog/hello`],
    ["POST", `/api/repos/${repo}/pulls`],
    ["GET", `/api/repos/${repo}/pulls`],
    ["GET", `/api/repos/${repo}/pulls/1`],
    ["GET", `/api/repos/${repo}/pulls/1/diff`],
    ["PUT", `/api/repos/${repo}/pulls/1/merge`],
    ["PUT", `/api/repos/${repo}/pulls/1/update`],
    ["POST", `/api/repos/${repo}/pulls/1/rebase`],
    ["DELETE", `/api/repos/${repo}/pulls/1`],
    ["POST", "/api/tokens"],
    ["GET", "/api/tokens"],
    ["DELETE", "/api/tokens/some-id"],
  ] as const;

  for (const [method, path] of routes) {
    it(`${method} ${path} → 200`, async () => {
      const res = await app.request(path, { method });
      expect(res.status).toBe(200);
    });
  }
});

// --- Read-only token, single repo ---

describe("API token: content:read only, repo-a", () => {
  const auth = tokenAuth(["content:read"], ["owner/repo-a"]);
  const app = makeApp(auth);

  it("GET /api/repos → 403 (needs repos:read)", async () => {
    expect((await app.request("/api/repos")).status).toBe(403);
  });

  it("GET config on repo-a → 403 (needs config:read)", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/config`)).status
    ).toBe(403);
  });

  it("GET content list on repo-a → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/content/blog`)).status
    ).toBe(200);
  });

  it("GET content item on repo-a → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/content/blog/hello`)).status
    ).toBe(200);
  });

  it("GET content on repo-b → 403 (wrong repo)", async () => {
    const repoB = encodeURIComponent("owner/repo-b");
    expect(
      (await app.request(`/api/repos/${repoB}/content/blog`)).status
    ).toBe(403);
  });

  it("PUT content on repo-a → 403 (needs content:write)", async () => {
    expect(
      (
        await app.request(`/api/repos/${repo}/content/blog/slug`, {
          method: "PUT",
        })
      ).status
    ).toBe(403);
  });

  it("DELETE content on repo-a → 403 (needs content:delete)", async () => {
    expect(
      (
        await app.request(`/api/repos/${repo}/content/blog/slug`, {
          method: "DELETE",
        })
      ).status
    ).toBe(403);
  });

  it("token CRUD → 403 (session only)", async () => {
    expect(
      (await app.request("/api/tokens", { method: "POST" })).status
    ).toBe(403);
    expect((await app.request("/api/tokens")).status).toBe(403);
    expect(
      (await app.request("/api/tokens/x", { method: "DELETE" })).status
    ).toBe(403);
  });
});

// --- Write-only token, all repos ---

describe("API token: content:write + repos:read, all repos", () => {
  const auth = tokenAuth(["content:write", "repos:read"], ["*"]);
  const app = makeApp(auth);

  it("GET /api/repos → 200", async () => {
    expect((await app.request("/api/repos")).status).toBe(200);
  });

  it("GET config → 403 (no config:read)", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/config`)).status
    ).toBe(403);
  });

  it("GET content → 403 (no content:read)", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/content/blog`)).status
    ).toBe(403);
  });

  it("PUT content → 200", async () => {
    expect(
      (
        await app.request(`/api/repos/${repo}/content/blog/slug`, {
          method: "PUT",
        })
      ).status
    ).toBe(200);
  });

  it("DELETE content → 403 (no content:delete)", async () => {
    expect(
      (
        await app.request(`/api/repos/${repo}/content/blog/slug`, {
          method: "DELETE",
        })
      ).status
    ).toBe(403);
  });
});

// --- Full permissions, repo-scoped ---

describe("API token: all permissions, scoped to repo-a", () => {
  const auth = tokenAuth(
    [
      "content:read",
      "content:write",
      "content:delete",
      "config:read",
      "repos:read",
    ],
    ["owner/repo-a"]
  );
  const app = makeApp(auth);

  it("all content ops on repo-a → 200", async () => {
    expect((await app.request("/api/repos")).status).toBe(200);
    expect(
      (await app.request(`/api/repos/${repo}/config`)).status
    ).toBe(200);
    expect(
      (await app.request(`/api/repos/${repo}/content/blog`)).status
    ).toBe(200);
    expect(
      (await app.request(`/api/repos/${repo}/content/blog/x`)).status
    ).toBe(200);
    expect(
      (
        await app.request(`/api/repos/${repo}/content/blog/x`, {
          method: "PUT",
        })
      ).status
    ).toBe(200);
    expect(
      (
        await app.request(`/api/repos/${repo}/content/blog/x`, {
          method: "DELETE",
        })
      ).status
    ).toBe(200);
  });

  it("all content ops on repo-b → 403", async () => {
    const repoB = encodeURIComponent("owner/repo-b");
    expect(
      (await app.request(`/api/repos/${repoB}/config`)).status
    ).toBe(403);
    expect(
      (await app.request(`/api/repos/${repoB}/content/blog`)).status
    ).toBe(403);
    expect(
      (await app.request(`/api/repos/${repoB}/content/blog/x`)).status
    ).toBe(403);
    expect(
      (
        await app.request(`/api/repos/${repoB}/content/blog/x`, {
          method: "PUT",
        })
      ).status
    ).toBe(403);
    expect(
      (
        await app.request(`/api/repos/${repoB}/content/blog/x`, {
          method: "DELETE",
        })
      ).status
    ).toBe(403);
  });

  it("token management → 403 (session only)", async () => {
    expect(
      (await app.request("/api/tokens", { method: "POST" })).status
    ).toBe(403);
    expect((await app.request("/api/tokens")).status).toBe(403);
    expect(
      (await app.request("/api/tokens/x", { method: "DELETE" })).status
    ).toBe(403);
  });
});

// --- Multi-repo scoped token ---

describe("API token: content:read + content:write, scoped to two repos", () => {
  const auth = tokenAuth(
    ["content:read", "content:write"],
    ["owner/repo-a", "owner/repo-b"]
  );
  const app = makeApp(auth);

  it("read/write on repo-a → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/content/blog`)).status
    ).toBe(200);
    expect(
      (
        await app.request(`/api/repos/${repo}/content/blog/x`, {
          method: "PUT",
        })
      ).status
    ).toBe(200);
  });

  it("read/write on repo-b → 200", async () => {
    const repoB = encodeURIComponent("owner/repo-b");
    expect(
      (await app.request(`/api/repos/${repoB}/content/blog`)).status
    ).toBe(200);
    expect(
      (
        await app.request(`/api/repos/${repoB}/content/blog/x`, {
          method: "PUT",
        })
      ).status
    ).toBe(200);
  });

  it("any op on repo-c → 403", async () => {
    const repoC = encodeURIComponent("owner/repo-c");
    expect(
      (await app.request(`/api/repos/${repoC}/content/blog`)).status
    ).toBe(403);
  });

  it("delete on repo-a → 403 (no content:delete)", async () => {
    expect(
      (
        await app.request(`/api/repos/${repo}/content/blog/x`, {
          method: "DELETE",
        })
      ).status
    ).toBe(403);
  });
});

// --- Minimal token: single permission, no extra ---

describe("API token: config:read only, all repos", () => {
  const auth = tokenAuth(["config:read"], ["*"]);
  const app = makeApp(auth);

  it("GET config → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/config`)).status
    ).toBe(200);
  });

  it("everything else → 403", async () => {
    expect((await app.request("/api/repos")).status).toBe(403);
    expect(
      (await app.request(`/api/repos/${repo}/content/blog`)).status
    ).toBe(403);
    expect(
      (
        await app.request(`/api/repos/${repo}/content/blog/x`, {
          method: "PUT",
        })
      ).status
    ).toBe(403);
    expect(
      (
        await app.request(`/api/repos/${repo}/content/blog/x`, {
          method: "DELETE",
        })
      ).status
    ).toBe(403);
  });
});

// --- Empty permissions ---

describe("API token: empty permissions", () => {
  const auth = tokenAuth([], ["*"]);
  const app = makeApp(auth);

  it("all routes → 403", async () => {
    expect((await app.request("/api/repos")).status).toBe(403);
    expect(
      (await app.request(`/api/repos/${repo}/config`)).status
    ).toBe(403);
    expect(
      (await app.request(`/api/repos/${repo}/content/blog`)).status
    ).toBe(403);
    expect(
      (
        await app.request(`/api/repos/${repo}/content/blog/x`, {
          method: "PUT",
        })
      ).status
    ).toBe(403);
    expect(
      (
        await app.request(`/api/repos/${repo}/content/blog/x`, {
          method: "DELETE",
        })
      ).status
    ).toBe(403);
  });
});

// --- PR routes: content:read token ---

describe("API token: content:read — PR route permissions", () => {
  const auth = tokenAuth(["content:read"], ["owner/repo-a"]);
  const app = makeApp(auth);

  it("GET pulls list → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls`)).status
    ).toBe(200);
  });

  it("GET pull detail → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls/1`)).status
    ).toBe(200);
  });

  it("GET pull diff → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls/1/diff`)).status
    ).toBe(200);
  });

  it("POST create PR → 403 (needs content:write)", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls`, { method: "POST" })).status
    ).toBe(403);
  });

  it("PUT merge → 403 (needs content:publish)", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls/1/merge`, { method: "PUT" })).status
    ).toBe(403);
  });

  it("PUT update branch → 403 (needs content:write)", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls/1/update`, { method: "PUT" })).status
    ).toBe(403);
  });

  it("DELETE close PR → 403 (needs content:write)", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls/1`, { method: "DELETE" })).status
    ).toBe(403);
  });
});

// --- PR routes: content:write token (no content:publish) ---

describe("API token: content:write — PR merge requires content:publish", () => {
  const auth = tokenAuth(["content:write"], ["owner/repo-a"]);
  const app = makeApp(auth);

  it("POST create PR → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls`, { method: "POST" })).status
    ).toBe(200);
  });

  it("PUT merge → 403 (needs content:publish)", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls/1/merge`, { method: "PUT" })).status
    ).toBe(403);
  });

  it("PUT update branch → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls/1/update`, { method: "PUT" })).status
    ).toBe(200);
  });

  it("POST rebase → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls/1/rebase`, { method: "POST" })).status
    ).toBe(200);
  });

  it("DELETE close PR → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls/1`, { method: "DELETE" })).status
    ).toBe(200);
  });
});

// --- PR routes: content:publish token ---

describe("API token: content:publish only", () => {
  const auth = tokenAuth(["content:publish"], ["owner/repo-a"]);
  const app = makeApp(auth);

  it("PUT merge → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls/1/merge`, { method: "PUT" })).status
    ).toBe(200);
  });

  it("POST create PR → 403 (needs content:write)", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls`, { method: "POST" })).status
    ).toBe(403);
  });

  it("GET pull list → 403 (needs content:read)", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls`)).status
    ).toBe(403);
  });
});

// --- PR routes: repo scoping ---

describe("API token: content:write scoped to repo-a — PR repo access", () => {
  const auth = tokenAuth(["content:write", "content:read"], ["owner/repo-a"]);
  const app = makeApp(auth);

  it("create PR on repo-a → 200", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/pulls`, { method: "POST" })).status
    ).toBe(200);
  });

  it("create PR on repo-b → 403", async () => {
    const repoB = encodeURIComponent("owner/repo-b");
    expect(
      (await app.request(`/api/repos/${repoB}/pulls`, { method: "POST" })).status
    ).toBe(403);
  });
});

// --- All permissions, empty repos ---

describe("API token: all permissions but empty repos array", () => {
  const auth = tokenAuth(
    [
      "content:read",
      "content:write",
      "content:delete",
      "config:read",
      "repos:read",
    ],
    []
  );
  const app = makeApp(auth);

  it("repos:read route (no repo param) → 200", async () => {
    expect((await app.request("/api/repos")).status).toBe(200);
  });

  it("any repo-scoped route → 403", async () => {
    expect(
      (await app.request(`/api/repos/${repo}/config`)).status
    ).toBe(403);
    expect(
      (await app.request(`/api/repos/${repo}/content/blog`)).status
    ).toBe(403);
  });
});
