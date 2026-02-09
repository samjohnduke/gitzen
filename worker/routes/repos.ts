import { Hono } from "hono";
import type { Env, AuthContext } from "../types.js";
import type { RepoConnection } from "../../shared/types.js";
import { GitHubClient, GitHubApiError } from "../lib/github.js";
import { requirePermission, requireSession } from "../middleware/require-permission.js";
import { GITHUB_APP_INSTALL_URL } from "../../shared/constants.js";

type ReposApp = {
  Bindings: Env;
  Variables: { auth: AuthContext; githubToken: string; githubUsername: string };
};

const repos = new Hono<ReposApp>();

const REPOS_KEY = "connected_repos";
const REPO_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

async function getRepos(kv: KVNamespace): Promise<RepoConnection[]> {
  return (await kv.get<RepoConnection[]>(REPOS_KEY, "json")) ?? [];
}

repos.get("/", requirePermission("repos:read"), async (c) => {
  const repoList = await getRepos(c.env.CMS_DATA);
  const { auth } = c.var;

  // API tokens only see repos within their scope
  if (auth.authMethod === "api-token" && auth.tokenScope && !auth.tokenScope.repos.includes("*")) {
    const allowed = new Set(auth.tokenScope.repos);
    return c.json(repoList.filter((r) => allowed.has(r.fullName)));
  }

  // Session users only see repos they added (or legacy entries with no addedBy)
  if (auth.authMethod === "session") {
    return c.json(repoList.filter((r) => !r.addedBy || r.addedBy === auth.userId));
  }

  return c.json(repoList);
});

repos.post("/", requireSession(), async (c) => {
  const { fullName } = await c.req.json<{ fullName: string }>();

  if (!fullName || !REPO_RE.test(fullName)) {
    return c.json({ error: "Invalid repo format. Use owner/repo-name" }, 400);
  }

  const github = new GitHubClient(c.var.auth.githubToken);
  try {
    await github.getFile(fullName, "cms.config.json");
  } catch (e) {
    if (e instanceof GitHubApiError && e.status === 403) {
      return c.json(
        { error: `GitHub App not installed on this repo. Install it here: ${GITHUB_APP_INSTALL_URL}` },
        403
      );
    }
    return c.json(
      { error: "No cms.config.json found in repo root" },
      400
    );
  }

  const repoList = await getRepos(c.env.CMS_DATA);
  const existing = repoList.find((r) => r.fullName === fullName);

  if (existing) {
    // If legacy entry (no addedBy), claim it for this user
    if (!existing.addedBy) {
      existing.addedBy = c.var.auth.userId;
      await c.env.CMS_DATA.put(REPOS_KEY, JSON.stringify(repoList));
      return c.json({ ok: true }, 200);
    }
    return c.json({ error: "Repo already connected" }, 409);
  }

  repoList.push({
    fullName,
    addedAt: new Date().toISOString(),
    addedBy: c.var.auth.userId,
  });
  await c.env.CMS_DATA.put(REPOS_KEY, JSON.stringify(repoList));

  return c.json({ ok: true }, 201);
});

repos.delete("/:repo", requireSession(), async (c) => {
  const repo = decodeURIComponent(c.req.param("repo"));
  const repoList = await getRepos(c.env.CMS_DATA);
  const target = repoList.find((r) => r.fullName === repo);

  if (!target) {
    return c.json({ error: "Repo not found" }, 404);
  }

  if (!target.addedBy) {
    return c.json({ error: "Cannot remove legacy repo entry without owner" }, 403);
  }
  if (target.addedBy !== c.var.auth.userId) {
    return c.json({ error: "You can only disconnect repos you connected" }, 403);
  }

  const filtered = repoList.filter((r) => r.fullName !== repo);
  await c.env.CMS_DATA.put(REPOS_KEY, JSON.stringify(filtered));
  return c.json({ ok: true });
});

export default repos;
