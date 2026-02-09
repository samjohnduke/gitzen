import { Hono } from "hono";
import type { Env, AuthContext } from "../types.js";
import type { RepoConnection } from "../../shared/types.js";
import { GitHubClient, GitHubApiError } from "../lib/github.js";
import { requirePermission } from "../middleware/require-permission.js";
import { GITHUB_APP_INSTALL_URL } from "../../shared/constants.js";

type ReposApp = {
  Bindings: Env;
  Variables: { auth: AuthContext; githubToken: string; githubUsername: string };
};

const repos = new Hono<ReposApp>();

const REPOS_KEY = "connected_repos";

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

  return c.json(repoList);
});

repos.post("/", async (c) => {
  const { fullName } = await c.req.json<{ fullName: string }>();

  if (!fullName || !fullName.includes("/")) {
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
  if (repoList.some((r) => r.fullName === fullName)) {
    return c.json({ error: "Repo already connected" }, 409);
  }

  repoList.push({ fullName, addedAt: new Date().toISOString() });
  await c.env.CMS_DATA.put(REPOS_KEY, JSON.stringify(repoList));

  return c.json({ ok: true }, 201);
});

repos.delete("/:repo", async (c) => {
  const repo = decodeURIComponent(c.req.param("repo"));
  const repoList = await getRepos(c.env.CMS_DATA);
  const filtered = repoList.filter((r) => r.fullName !== repo);

  if (filtered.length === repoList.length) {
    return c.json({ error: "Repo not found" }, 404);
  }

  await c.env.CMS_DATA.put(REPOS_KEY, JSON.stringify(filtered));
  return c.json({ ok: true });
});

export default repos;
