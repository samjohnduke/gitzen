import { Hono } from "hono";
import type { Env } from "../types.js";
import { GitHubClient } from "../lib/github.js";

type GithubApp = {
  Bindings: Env;
  Variables: { githubToken: string; githubUsername: string };
};

const github = new Hono<GithubApp>();

// List all repos the authenticated user has access to
github.get("/repos", async (c) => {
  const client = new GitHubClient(c.var.githubToken);
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
