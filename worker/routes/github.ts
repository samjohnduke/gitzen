import { Hono } from "hono";
import type { Env, AuthContext } from "../types.js";
import { GitHubClient } from "../lib/github.js";
import { requirePermission } from "../middleware/require-permission.js";

type GithubApp = {
  Bindings: Env;
  Variables: { auth: AuthContext; githubToken: string; githubUsername: string };
};

const github = new Hono<GithubApp>();

// List all repos the authenticated user has access to
github.get("/repos", requirePermission("repos:read"), async (c) => {
  const client = new GitHubClient(c.var.auth.githubToken);
  const repos = await client.listUserRepos();
  return c.json(
    repos.map((r) => ({
      fullName: r.full_name,
      private: r.private,
      description: r.description,
    }))
  );
});

export default github;
