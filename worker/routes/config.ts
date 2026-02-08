import { Hono } from "hono";
import type { Env } from "../types.js";
import type { CmsConfig } from "../../shared/types.js";
import { GitHubClient } from "../lib/github.js";

type ConfigApp = {
  Bindings: Env;
  Variables: { githubToken: string; githubUsername: string };
};

const config = new Hono<ConfigApp>();

config.get("/:repo/config", async (c) => {
  const repo = decodeURIComponent(c.req.param("repo"));
  const github = new GitHubClient(c.var.githubToken);

  try {
    const { content } = await github.getFile(repo, "cms.config.json");
    const parsed = JSON.parse(content) as CmsConfig;
    return c.json(parsed);
  } catch {
    return c.json({ error: "Failed to fetch config" }, 404);
  }
});

export default config;
