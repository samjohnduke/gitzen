import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { Env, AuthContext } from "../types";
import type { Permission } from "../../shared/types";
import {
  requirePermission,
  requireRepoAccess,
  requireSession,
} from "./require-permission";

type TestApp = {
  Bindings: Env;
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
  return app;
}

const sessionAuth: AuthContext = {
  userId: "123",
  githubUsername: "testuser",
  githubToken: "ghp_test",
  authMethod: "session",
};

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

describe("requirePermission", () => {
  it("session auth bypasses all permission checks", async () => {
    const app = makeApp(sessionAuth);
    app.get("/test", requirePermission("content:write", "content:delete"), (c) =>
      c.json({ ok: true })
    );
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("allows API token with exact matching permission", async () => {
    const app = makeApp(tokenAuth(["content:read"]));
    app.get("/test", requirePermission("content:read"), (c) =>
      c.json({ ok: true })
    );
    expect((await app.request("/test")).status).toBe(200);
  });

  it("rejects API token missing required permission", async () => {
    const app = makeApp(tokenAuth(["content:read"]));
    app.get("/test", requirePermission("content:write"), (c) =>
      c.json({ ok: true })
    );
    const res = await app.request("/test");
    expect(res.status).toBe(403);
    const body = await res.json<{ error: string }>();
    expect(body.error).toContain("content:write");
  });

  it("requires ALL listed permissions (AND logic)", async () => {
    const app = makeApp(tokenAuth(["content:read"]));
    app.get(
      "/test",
      requirePermission("content:read", "content:write"),
      (c) => c.json({ ok: true })
    );
    expect((await app.request("/test")).status).toBe(403);
  });

  it("allows when token has all required permissions", async () => {
    const app = makeApp(tokenAuth(["content:read", "content:write"]));
    app.get(
      "/test",
      requirePermission("content:read", "content:write"),
      (c) => c.json({ ok: true })
    );
    expect((await app.request("/test")).status).toBe(200);
  });

  it("allows when token has superset of required permissions", async () => {
    const app = makeApp(
      tokenAuth(["content:read", "content:write", "content:delete", "repos:read"])
    );
    app.get("/test", requirePermission("content:read"), (c) =>
      c.json({ ok: true })
    );
    expect((await app.request("/test")).status).toBe(200);
  });

  it("rejects token with empty permissions array", async () => {
    const app = makeApp(tokenAuth([]));
    app.get("/test", requirePermission("content:read"), (c) =>
      c.json({ ok: true })
    );
    expect((await app.request("/test")).status).toBe(403);
  });

  it("each permission type is independently checked", async () => {
    const allPerms: Permission[] = [
      "content:read",
      "content:write",
      "content:delete",
      "config:read",
      "repos:read",
    ];

    for (const required of allPerms) {
      // Token with only this permission
      const app = makeApp(tokenAuth([required]));
      app.get("/ok", requirePermission(required), (c) => c.json({ ok: true }));
      expect((await app.request("/ok")).status).toBe(200);

      // Token without this permission
      const others = allPerms.filter((p) => p !== required);
      const app2 = makeApp(tokenAuth(others));
      app2.get("/nope", requirePermission(required), (c) =>
        c.json({ ok: true })
      );
      expect((await app2.request("/nope")).status).toBe(403);
    }
  });
});

describe("requireRepoAccess", () => {
  it("session auth bypasses repo checks", async () => {
    const app = makeApp(sessionAuth);
    app.get("/:repo/data", requireRepoAccess(), (c) =>
      c.json({ ok: true })
    );
    const res = await app.request(
      `/${encodeURIComponent("any/repo-at-all")}/data`
    );
    expect(res.status).toBe(200);
  });

  it("allows API token with matching repo", async () => {
    const app = makeApp(tokenAuth(["content:read"], ["owner/repo-a"]));
    app.get("/:repo/data", requireRepoAccess(), (c) =>
      c.json({ ok: true })
    );
    expect(
      (
        await app.request(
          `/${encodeURIComponent("owner/repo-a")}/data`
        )
      ).status
    ).toBe(200);
  });

  it("rejects API token for unscoped repo", async () => {
    const app = makeApp(tokenAuth(["content:read"], ["owner/repo-a"]));
    app.get("/:repo/data", requireRepoAccess(), (c) =>
      c.json({ ok: true })
    );
    const res = await app.request(
      `/${encodeURIComponent("owner/repo-b")}/data`
    );
    expect(res.status).toBe(403);
    const body = await res.json<{ error: string }>();
    expect(body.error).toContain("repo-b");
  });

  it("allows API token with wildcard repo scope", async () => {
    const app = makeApp(tokenAuth(["content:read"], ["*"]));
    app.get("/:repo/data", requireRepoAccess(), (c) =>
      c.json({ ok: true })
    );
    expect(
      (
        await app.request(
          `/${encodeURIComponent("any/repo-at-all")}/data`
        )
      ).status
    ).toBe(200);
  });

  it("repo matching is exact (no substring match)", async () => {
    const app = makeApp(tokenAuth(["content:read"], ["owner/repo"]));
    app.get("/:repo/data", requireRepoAccess(), (c) =>
      c.json({ ok: true })
    );
    // "owner/repo-extended" should NOT match "owner/repo"
    expect(
      (
        await app.request(
          `/${encodeURIComponent("owner/repo-extended")}/data`
        )
      ).status
    ).toBe(403);
    // "owner/rep" should NOT match "owner/repo"
    expect(
      (
        await app.request(
          `/${encodeURIComponent("owner/rep")}/data`
        )
      ).status
    ).toBe(403);
  });

  it("allows token scoped to multiple repos", async () => {
    const app = makeApp(
      tokenAuth(["content:read"], ["owner/repo-a", "owner/repo-b"])
    );
    app.get("/:repo/data", requireRepoAccess(), (c) =>
      c.json({ ok: true })
    );
    expect(
      (
        await app.request(
          `/${encodeURIComponent("owner/repo-a")}/data`
        )
      ).status
    ).toBe(200);
    expect(
      (
        await app.request(
          `/${encodeURIComponent("owner/repo-b")}/data`
        )
      ).status
    ).toBe(200);
    expect(
      (
        await app.request(
          `/${encodeURIComponent("owner/repo-c")}/data`
        )
      ).status
    ).toBe(403);
  });

  it("rejects token with empty repos array", async () => {
    const app = makeApp(tokenAuth(["content:read"], []));
    app.get("/:repo/data", requireRepoAccess(), (c) =>
      c.json({ ok: true })
    );
    expect(
      (
        await app.request(
          `/${encodeURIComponent("owner/repo")}/data`
        )
      ).status
    ).toBe(403);
  });

  it("handles URL-encoded repo names correctly", async () => {
    const app = makeApp(
      tokenAuth(["content:read"], ["owner/my-repo.name"])
    );
    app.get("/:repo/data", requireRepoAccess(), (c) =>
      c.json({ ok: true })
    );
    expect(
      (
        await app.request(
          `/${encodeURIComponent("owner/my-repo.name")}/data`
        )
      ).status
    ).toBe(200);
  });
});

describe("requireSession", () => {
  it("allows session auth", async () => {
    const app = makeApp(sessionAuth);
    app.get("/test", requireSession(), (c) => c.json({ ok: true }));
    expect((await app.request("/test")).status).toBe(200);
  });

  it("rejects API token auth with clear error", async () => {
    const app = makeApp(tokenAuth(["content:read"]));
    app.get("/test", requireSession(), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(403);
    const body = await res.json<{ error: string }>();
    expect(body.error).toContain("session");
  });

  it("rejects wildcard API token (session still required)", async () => {
    const all: Permission[] = [
      "content:read",
      "content:write",
      "content:delete",
      "config:read",
      "repos:read",
    ];
    const app = makeApp(tokenAuth(all, ["*"]));
    app.get("/test", requireSession(), (c) => c.json({ ok: true }));
    expect((await app.request("/test")).status).toBe(403);
  });
});

describe("middleware composition", () => {
  it("permission + repo middleware work together", async () => {
    const app = makeApp(tokenAuth(["content:read"], ["owner/repo-a"]));
    app.get(
      "/:repo/data",
      requirePermission("content:read"),
      requireRepoAccess(),
      (c) => c.json({ ok: true })
    );

    // Right permission, right repo
    expect(
      (
        await app.request(
          `/${encodeURIComponent("owner/repo-a")}/data`
        )
      ).status
    ).toBe(200);

    // Right permission, wrong repo
    expect(
      (
        await app.request(
          `/${encodeURIComponent("owner/repo-b")}/data`
        )
      ).status
    ).toBe(403);
  });

  it("wrong permission short-circuits before repo check", async () => {
    const app = makeApp(tokenAuth(["content:read"], ["owner/repo-a"]));
    app.get(
      "/:repo/data",
      requirePermission("content:write"),
      requireRepoAccess(),
      (c) => c.json({ ok: true })
    );

    const res = await app.request(
      `/${encodeURIComponent("owner/repo-a")}/data`
    );
    expect(res.status).toBe(403);
    const body = await res.json<{ error: string }>();
    // Error should mention permission, not repo
    expect(body.error).toContain("content:write");
  });
});
