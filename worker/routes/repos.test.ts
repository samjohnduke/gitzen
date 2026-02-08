import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import type { Env, AuthContext } from "../types";
import type { Permission } from "../../shared/types";
import type { RepoConnection } from "../../shared/types";
import reposRoutes from "./repos";

type TestApp = {
  Bindings: Env;
  Variables: { auth: AuthContext; githubToken: string; githubUsername: string };
};

function createApp(auth: AuthContext) {
  const app = new Hono<TestApp>();
  app.use("*", async (c, next) => {
    c.set("auth", auth);
    c.set("githubToken", auth.githubToken);
    c.set("githubUsername", auth.githubUsername);
    return next();
  });
  app.route("/api/repos", reposRoutes);
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

const sessionAuth: AuthContext = {
  userId: "123",
  githubUsername: "testuser",
  githubToken: "ghp_test",
  authMethod: "session",
};

const REPOS_KEY = "connected_repos";

const seedRepos: RepoConnection[] = [
  { fullName: "owner/repo-a", addedAt: "2025-01-01T00:00:00Z" },
  { fullName: "owner/repo-b", addedAt: "2025-01-02T00:00:00Z" },
  { fullName: "other/repo-c", addedAt: "2025-01-03T00:00:00Z" },
];

describe("GET /api/repos — repo scope filtering", () => {
  beforeEach(async () => {
    await env.CMS_DATA.put(REPOS_KEY, JSON.stringify(seedRepos));
  });

  it("session auth sees all repos", async () => {
    const app = createApp(sessionAuth);
    const res = await app.request("/api/repos", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<RepoConnection[]>();
    expect(body).toHaveLength(3);
    expect(body.map((r) => r.fullName)).toEqual([
      "owner/repo-a",
      "owner/repo-b",
      "other/repo-c",
    ]);
  });

  it("wildcard token sees all repos", async () => {
    const app = createApp(tokenAuth(["repos:read"], ["*"]));
    const res = await app.request("/api/repos", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<RepoConnection[]>();
    expect(body).toHaveLength(3);
  });

  it("token scoped to repo-a only sees repo-a", async () => {
    const app = createApp(tokenAuth(["repos:read"], ["owner/repo-a"]));
    const res = await app.request("/api/repos", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<RepoConnection[]>();
    expect(body).toHaveLength(1);
    expect(body[0].fullName).toBe("owner/repo-a");
  });

  it("token scoped to two repos only sees those two", async () => {
    const app = createApp(
      tokenAuth(["repos:read"], ["owner/repo-a", "other/repo-c"])
    );
    const res = await app.request("/api/repos", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<RepoConnection[]>();
    expect(body).toHaveLength(2);
    expect(body.map((r) => r.fullName)).toEqual([
      "owner/repo-a",
      "other/repo-c",
    ]);
  });

  it("token scoped to nonexistent repo sees empty list", async () => {
    const app = createApp(tokenAuth(["repos:read"], ["owner/nope"]));
    const res = await app.request("/api/repos", {}, env);
    expect(res.status).toBe(200);
    const body = await res.json<RepoConnection[]>();
    expect(body).toHaveLength(0);
  });

  it("token without repos:read is rejected", async () => {
    const app = createApp(tokenAuth(["content:read"], ["*"]));
    const res = await app.request("/api/repos", {}, env);
    expect(res.status).toBe(403);
  });
});
