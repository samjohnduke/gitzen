import { Hono } from "hono";
import type { Env, AuthContext } from "../types.js";
import type { CmsConfig, PullRequestSummary, PullRequestDetail, ContentDiff, PrComment } from "../../shared/types.js";
import { GitHubClient, GitHubApiError } from "../lib/github.js";
import { parseFrontmatter } from "../../shared/frontmatter.js";
import { parseBranchName, previewUrl as buildPreviewUrl } from "../../shared/branch.js";
import { requirePermission, requireRepoAccess } from "../middleware/require-permission.js";

type PullsApp = {
  Bindings: Env;
  Variables: { auth: AuthContext; githubToken: string; githubUsername: string };
};

const pulls = new Hono<PullsApp>();

function parsePrNumber(raw: string): number | null {
  const n = parseInt(raw, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

// Create PR from existing branch
pulls.post(
  "/:repo/pulls",
  requirePermission("content:write"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const github = new GitHubClient(c.var.auth.githubToken);
    const { branch, title, body } = await c.req.json<{
      branch: string;
      title: string;
      body?: string;
    }>();

    if (!branch || !/^[\w][\w.\/-]{0,254}$/.test(branch)) {
      return c.json({ error: "Invalid branch name" }, 400);
    }

    if (!title?.trim()) {
      return c.json({ error: "PR title is required" }, 400);
    }

    const defaultBranch = await github.getDefaultBranch(repo);
    const pr = await github.createPullRequest(
      repo,
      title,
      branch,
      defaultBranch,
      body ?? ""
    );

    // Build preview URL if config has preview settings
    let previewUrlResult: string | null = null;
    try {
      const { content: configRaw } = await github.getFile(repo, "cms.config.json");
      const config = JSON.parse(configRaw) as CmsConfig;
      if (config.preview?.pagesProject) {
        previewUrlResult = buildPreviewUrl(branch, config.preview.pagesProject);
      }
    } catch {
      // Config fetch failed — no preview URL
    }

    return c.json({
      number: pr.number,
      htmlUrl: pr.html_url,
      previewUrl: previewUrlResult,
    });
  }
);

// List open CMS PRs
pulls.get(
  "/:repo/pulls",
  requirePermission("content:read"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const github = new GitHubClient(c.var.auth.githubToken);

    const [ghPrs, configResult] = await Promise.all([
      github.listPullRequests(repo, "open"),
      github.getFile(repo, "cms.config.json").catch(() => null),
    ]);

    let pagesProject: string | null = null;
    if (configResult) {
      const config = JSON.parse(configResult.content) as CmsConfig;
      pagesProject = config.preview?.pagesProject ?? null;
    }

    const cmsPrs: PullRequestSummary[] = [];
    for (const pr of ghPrs) {
      const parsed = parseBranchName(pr.head.ref);
      if (!parsed) continue;

      cmsPrs.push({
        number: pr.number,
        title: pr.title,
        branch: pr.head.ref,
        state: pr.state,
        merged: pr.merged_at !== null,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        collection: parsed.collection,
        slug: parsed.slug,
        previewUrl: pagesProject
          ? buildPreviewUrl(pr.head.ref, pagesProject)
          : null,
        author: pr.user.login,
      });
    }

    return c.json(cmsPrs);
  }
);

// Get PR detail
pulls.get(
  "/:repo/pulls/:number",
  requirePermission("content:read"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const number = parsePrNumber(c.req.param("number"));
    if (number === null) return c.json({ error: "Invalid PR number" }, 400);
    const github = new GitHubClient(c.var.auth.githubToken);

    const [pr, configResult] = await Promise.all([
      github.getPullRequest(repo, number),
      github.getFile(repo, "cms.config.json").catch(() => null),
    ]);

    let pagesProject: string | null = null;
    if (configResult) {
      const config = JSON.parse(configResult.content) as CmsConfig;
      pagesProject = config.preview?.pagesProject ?? null;
    }

    const parsed = parseBranchName(pr.head.ref);

    const detail: PullRequestDetail = {
      number: pr.number,
      title: pr.title,
      branch: pr.head.ref,
      state: pr.state,
      merged: pr.merged_at !== null,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      collection: parsed?.collection ?? "",
      slug: parsed?.slug ?? "",
      previewUrl: pagesProject
        ? buildPreviewUrl(pr.head.ref, pagesProject)
        : null,
      author: pr.user.login,
      body: pr.body,
      mergeable: pr.mergeable,
      headSha: pr.head.sha,
      baseSha: pr.base.sha,
      htmlUrl: pr.html_url,
    };

    return c.json(detail);
  }
);

// Structured content diff
pulls.get(
  "/:repo/pulls/:number/diff",
  requirePermission("content:read"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const number = parsePrNumber(c.req.param("number"));
    if (number === null) return c.json({ error: "Invalid PR number" }, 400);
    const github = new GitHubClient(c.var.auth.githubToken);

    const pr = await github.getPullRequest(repo, number);
    const comparison = await github.compareCommits(
      repo,
      pr.base.ref,
      pr.head.ref
    );

    // Filter to content files (.md/.mdx)
    const contentFiles = comparison.files.filter(
      (f) => f.filename.endsWith(".md") || f.filename.endsWith(".mdx")
    );

    const diffs: ContentDiff[] = [];

    for (const file of contentFiles) {
      // Determine collection and slug from path
      let collection = "";
      let slug = file.filename.replace(/\.mdx?$/, "");
      const pathParts = slug.split("/");
      if (pathParts.length >= 2) {
        // Try to get collection from the parsed branch name
        const parsed = parseBranchName(pr.head.ref);
        if (parsed) {
          collection = parsed.collection;
          slug = parsed.slug;
        } else {
          collection = pathParts[pathParts.length - 2];
          slug = pathParts[pathParts.length - 1];
        }
      }

      let oldFrontmatter: Record<string, unknown> = {};
      let oldBody = "";
      let newFrontmatter: Record<string, unknown> = {};
      let newBody = "";

      // Fetch base version (may 404 for new files)
      if (file.status !== "added") {
        try {
          const { content } = await github.getFile(repo, file.filename, pr.base.ref);
          const parsed = parseFrontmatter(content);
          oldFrontmatter = parsed.frontmatter;
          oldBody = parsed.body;
        } catch {
          // File doesn't exist on base
        }
      }

      // Fetch head version (may 404 for deletions)
      if (file.status !== "removed") {
        try {
          const { content } = await github.getFile(repo, file.filename, pr.head.ref);
          const parsed = parseFrontmatter(content);
          newFrontmatter = parsed.frontmatter;
          newBody = parsed.body;
        } catch {
          // File doesn't exist on head
        }
      }

      // Build field diffs
      const allKeys = new Set([
        ...Object.keys(oldFrontmatter),
        ...Object.keys(newFrontmatter),
      ]);
      const fields = [...allKeys].map((name) => ({
        name,
        oldValue: oldFrontmatter[name],
        newValue: newFrontmatter[name],
        changed: JSON.stringify(oldFrontmatter[name]) !== JSON.stringify(newFrontmatter[name]),
      }));

      const type: ContentDiff["type"] =
        file.status === "added"
          ? "added"
          : file.status === "removed"
            ? "deleted"
            : "modified";

      diffs.push({
        collection,
        slug,
        type,
        frontmatter: { fields },
        body: { oldBody, newBody },
      });
    }

    return c.json(diffs);
  }
);

// Squash merge PR
pulls.put(
  "/:repo/pulls/:number/merge",
  requirePermission("content:publish"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const number = parsePrNumber(c.req.param("number"));
    if (number === null) return c.json({ error: "Invalid PR number" }, 400);
    const github = new GitHubClient(c.var.auth.githubToken);

    const pr = await github.getPullRequest(repo, number);

    try {
      const result = await github.mergePullRequest(
        repo,
        number,
        pr.title,
        `Merge CMS content: ${pr.title}`
      );

      // Delete branch after merge
      try {
        await github.deleteBranch(repo, pr.head.ref);
      } catch {
        // Branch may already be deleted
      }

      return c.json({ sha: result.sha, merged: true });
    } catch (e) {
      if (e instanceof GitHubApiError && e.status === 409) {
        return c.json({ merged: false, reason: "conflicts" }, 409);
      }
      throw e;
    }
  }
);

// Update PR branch (merge main into PR branch)
pulls.put(
  "/:repo/pulls/:number/update",
  requirePermission("content:write"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const number = parsePrNumber(c.req.param("number"));
    if (number === null) return c.json({ error: "Invalid PR number" }, 400);
    const github = new GitHubClient(c.var.auth.githubToken);

    try {
      await github.updatePullRequestBranch(repo, number);
      return c.json({ ok: true });
    } catch (e) {
      if (e instanceof GitHubApiError && (e.status === 409 || e.status === 422)) {
        return c.json({ ok: false, reason: "conflicts" }, 409);
      }
      throw e;
    }
  }
);

// Pragmatic rebase — recreate branch from main with user's content
pulls.post(
  "/:repo/pulls/:number/rebase",
  requirePermission("content:write"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const number = parsePrNumber(c.req.param("number"));
    if (number === null) return c.json({ error: "Invalid PR number" }, 400);
    const github = new GitHubClient(c.var.auth.githubToken);

    const pr = await github.getPullRequest(repo, number);
    const branch = pr.head.ref;
    const parsed = parseBranchName(branch);
    if (!parsed) {
      return c.json({ error: "Not a CMS branch" }, 400);
    }

    // Get config for file path
    const { content: configRaw } = await github.getFile(repo, "cms.config.json");
    const config = JSON.parse(configRaw) as CmsConfig;
    const collectionConfig = config.collections[parsed.collection];
    if (!collectionConfig) {
      return c.json({ error: "Collection not found" }, 404);
    }

    const filePath = `${collectionConfig.directory}/${parsed.slug}.md`;

    // Read file content from PR branch
    const { content: fileContent } = await github.getFile(repo, filePath, branch);

    // Get default branch HEAD SHA
    const defaultBranch = await github.getDefaultBranch(repo);
    const mainSha = await github.getBranchSha(repo, defaultBranch);
    if (!mainSha) {
      return c.json({ error: "Could not find default branch" }, 500);
    }

    // Delete and recreate branch from main HEAD
    await github.deleteBranch(repo, branch);
    await github.createBranch(repo, branch, mainSha);

    // Get file SHA on new branch (may not exist for new files)
    let existingSha: string | undefined;
    try {
      const existing = await github.getFile(repo, filePath, branch);
      existingSha = existing.sha;
    } catch {
      // File doesn't exist on main — that's fine for new content
    }

    // Commit file to fresh branch
    await github.putFile(
      repo,
      filePath,
      fileContent,
      `Rebase ${parsed.collection}/${parsed.slug}`,
      existingSha,
      branch
    );

    return c.json({ ok: true });
  }
);

// List comments on a PR
pulls.get(
  "/:repo/pulls/:number/comments",
  requirePermission("content:read"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const number = parsePrNumber(c.req.param("number"));
    if (number === null) return c.json({ error: "Invalid PR number" }, 400);
    const github = new GitHubClient(c.var.auth.githubToken);

    const ghComments = await github.listIssueComments(repo, number);
    const comments: PrComment[] = ghComments.map((gc) => ({
      id: gc.id,
      body: gc.body,
      author: gc.user.login,
      avatarUrl: gc.user.avatar_url,
      createdAt: gc.created_at,
    }));

    return c.json(comments);
  }
);

// Add a comment to a PR
pulls.post(
  "/:repo/pulls/:number/comments",
  requirePermission("content:write"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const number = parsePrNumber(c.req.param("number"));
    if (number === null) return c.json({ error: "Invalid PR number" }, 400);
    const github = new GitHubClient(c.var.auth.githubToken);
    const { body } = await c.req.json<{ body: string }>();

    if (!body?.trim()) {
      return c.json({ error: "Comment body is required" }, 400);
    }

    if (body.length > 65536) {
      return c.json({ error: "Comment body too long (max 65536 chars)" }, 400);
    }

    const gc = await github.createIssueComment(repo, number, body);
    const comment: PrComment = {
      id: gc.id,
      body: gc.body,
      author: gc.user.login,
      avatarUrl: gc.user.avatar_url,
      createdAt: gc.created_at,
    };

    return c.json(comment, 201);
  }
);

// Close PR + delete branch
pulls.delete(
  "/:repo/pulls/:number",
  requirePermission("content:write"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const number = parsePrNumber(c.req.param("number"));
    if (number === null) return c.json({ error: "Invalid PR number" }, 400);
    const github = new GitHubClient(c.var.auth.githubToken);

    const pr = await github.getPullRequest(repo, number);

    await github.closePullRequest(repo, number);

    try {
      await github.deleteBranch(repo, pr.head.ref);
    } catch {
      // Branch may already be deleted
    }

    return c.json({ ok: true });
  }
);

export default pulls;
