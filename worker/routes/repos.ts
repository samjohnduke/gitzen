import { Hono } from "hono";
import type { Env } from "../types.js";
import type { RepoConnection } from "../../shared/types.js";
import { GitHubClient } from "../lib/github.js";

type ReposApp = {
  Bindings: Env;
  Variables: { githubToken: string; githubUsername: string };
};

const repos = new Hono<ReposApp>();

const REPOS_KEY = "connected_repos";

async function getRepos(kv: KVNamespace): Promise<RepoConnection[]> {
  return (await kv.get<RepoConnection[]>(REPOS_KEY, "json")) ?? [];
}

repos.get("/", async (c) => {
  const repoList = await getRepos(c.env.CMS_DATA);
  return c.json(repoList);
});

repos.post("/", async (c) => {
  const { fullName } = await c.req.json<{ fullName: string }>();

  if (!fullName || !fullName.includes("/")) {
    return c.json({ error: "Invalid repo format. Use owner/repo-name" }, 400);
  }

  // Validate cms.config.json exists
  const github = new GitHubClient(c.var.githubToken);
  try {
    await github.getFile(fullName, "cms.config.json");
  } catch {
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
