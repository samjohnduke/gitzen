import { Hono } from "hono";
import type { AppVariables } from "../types.js";
import type { CmsConfig } from "../../shared/types.js";
import { GitHubClient } from "../lib/github.js";
import { requirePermission, requireRepoAccess } from "../middleware/require-permission.js";

type ConfigApp = {
  Variables: AppVariables;
};

const config = new Hono<ConfigApp>();

config.get(
  "/:repo/config",
  requirePermission("config:read"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const github = new GitHubClient(c.var.auth.githubToken, c.var.logger);

    try {
      const { content } = await github.getFile(repo, "cms.config.json");
      const parsed = JSON.parse(content) as CmsConfig;
      return c.json(parsed);
    } catch {
      return c.json({ error: "Failed to fetch config" }, 404);
    }
  }
);

export default config;
