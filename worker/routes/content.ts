import { Hono } from "hono";
import type { AppVariables } from "../types.js";
import type { CmsConfig, ContentItem } from "../../shared/types.js";
import { GitHubClient, GitHubApiError } from "../lib/github.js";
import { parseFrontmatter, serializeFrontmatter } from "../../shared/frontmatter.js";
import { requirePermission, requireRepoAccess } from "../middleware/require-permission.js";
import { branchName } from "../../shared/branch.js";
import { GITHUB_APP_INSTALL_URL } from "../../shared/constants.js";

type ContentApp = {
  Variables: AppVariables;
};

const content = new Hono<ContentApp>();

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 200 && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(slug);
}

export function isValidCollection(name: string): boolean {
  return name.length > 0 && name.length <= 100 && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name);
}

// List items in a collection
content.get(
  "/:repo/content/:collection",
  requirePermission("content:read"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const collection = c.req.param("collection");

    if (!isValidCollection(collection)) {
      return c.json({ error: "Invalid collection name" }, 400);
    }

    const github = new GitHubClient(c.var.auth.githubToken, c.var.logger);

    const { content: configRaw } = await github.getFile(repo, "cms.config.json");
    const config = JSON.parse(configRaw) as CmsConfig;
    const collectionConfig = config.collections[collection];

    if (!collectionConfig) {
      return c.json({ error: "Collection not found" }, 404);
    }

    try {
      const files = await github.listDirectory(repo, collectionConfig.directory);
      const mdFiles = files.filter(
        (f) => f.type === "file" && (f.name.endsWith(".md") || f.name.endsWith(".mdx"))
      );

      const items: ContentItem[] = await Promise.all(
        mdFiles.map(async (file) => {
          try {
            const { content: raw, sha } = await github.getFile(repo, file.path);
            const { frontmatter } = parseFrontmatter(raw);
            const slug = file.name.replace(/\.mdx?$/, "");
            return { slug, path: file.path, sha, frontmatter };
          } catch {
            const slug = file.name.replace(/\.mdx?$/, "");
            return { slug, path: file.path, sha: file.sha, frontmatter: {} };
          }
        })
      );

      return c.json(items);
    } catch (e) {
      if (e instanceof GitHubApiError && e.status === 404) {
        return c.json([]);
      }
      throw e;
    }
  }
);

// Get a single item
content.get(
  "/:repo/content/:collection/:slug",
  requirePermission("content:read"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const collection = c.req.param("collection");
    const slug = c.req.param("slug");

    if (!isValidCollection(collection)) {
      return c.json({ error: "Invalid collection name" }, 400);
    }
    if (!isValidSlug(slug)) {
      return c.json({ error: "Invalid slug" }, 400);
    }

    const github = new GitHubClient(c.var.auth.githubToken, c.var.logger);

    const { content: configRaw } = await github.getFile(repo, "cms.config.json");
    const config = JSON.parse(configRaw) as CmsConfig;
    const collectionConfig = config.collections[collection];

    if (!collectionConfig) {
      return c.json({ error: "Collection not found" }, 404);
    }

    // Support explicit ?branch= param, or auto-detect cms branch
    const queryBranch = c.req.query("branch") ?? null;
    const cmsBranch = branchName(collection, slug);

    // Determine which branch to read from
    let activeBranch: string | null = queryBranch;
    let prNumber: number | null = null;

    if (!activeBranch) {
      // Check if a cms branch exists for this item
      const branchSha = await github.getBranchSha(repo, cmsBranch);
      if (branchSha) {
        activeBranch = cmsBranch;
        // Find open PR for this branch
        try {
          const prs = await github.listPullRequests(repo, "open");
          const match = prs.find((pr) => pr.head.ref === cmsBranch);
          if (match) prNumber = match.number;
        } catch {
          // PR listing failed — not critical
        }
      }
    }

    const basePath = `${collectionConfig.directory}/${slug}`;
    for (const ext of [".md", ".mdx"]) {
      try {
        const { content: raw, sha } = await github.getFile(
          repo,
          `${basePath}${ext}`,
          activeBranch ?? undefined
        );
        const { frontmatter, body } = parseFrontmatter(raw);
        const result: ContentItem = {
          slug,
          path: `${basePath}${ext}`,
          sha,
          frontmatter,
          body,
        };
        if (activeBranch) result.branch = activeBranch;
        if (prNumber) result.prNumber = prNumber;
        return c.json(result);
      } catch (e) {
        if (e instanceof GitHubApiError && e.status === 404) continue;
        throw e;
      }
    }

    // If we were reading from a branch and got 404, try main
    if (activeBranch) {
      for (const ext of [".md", ".mdx"]) {
        try {
          const { content: raw, sha } = await github.getFile(repo, `${basePath}${ext}`);
          const { frontmatter, body } = parseFrontmatter(raw);
          const result: ContentItem = { slug, path: `${basePath}${ext}`, sha, frontmatter, body };
          if (activeBranch) result.branch = activeBranch;
          if (prNumber) result.prNumber = prNumber;
          return c.json(result);
        } catch (e) {
          if (e instanceof GitHubApiError && e.status === 404) continue;
          throw e;
        }
      }
    }

    return c.json({ error: "Item not found" }, 404);
  }
);

// Create/update item
content.put(
  "/:repo/content/:collection/:slug",
  requirePermission("content:write"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const collection = c.req.param("collection");
    const slug = c.req.param("slug");

    if (!isValidCollection(collection)) {
      return c.json({ error: "Invalid collection name" }, 400);
    }
    if (!isValidSlug(slug)) {
      return c.json({ error: "Invalid slug" }, 400);
    }

    const github = new GitHubClient(c.var.auth.githubToken, c.var.logger);

    const { content: configRaw } = await github.getFile(repo, "cms.config.json");
    const config = JSON.parse(configRaw) as CmsConfig;
    const collectionConfig = config.collections[collection];

    if (!collectionConfig) {
      return c.json({ error: "Collection not found" }, 404);
    }

    const reqBody = await c.req.json<{
      frontmatter: Record<string, unknown>;
      body: string;
      sha?: string;
      mode?: "direct" | "branch";
    }>();

    const filePath = `${collectionConfig.directory}/${slug}.md`;
    const fileContent = serializeFrontmatter(reqBody.frontmatter, reqBody.body);

    if (reqBody.mode === "branch") {
      // Branch-based save
      const branch = branchName(collection, slug);

      // Check if branch exists, create if not
      let branchSha = await github.getBranchSha(repo, branch);
      if (!branchSha) {
        const defaultBranch = await github.getDefaultBranch(repo);
        const mainSha = await github.getBranchSha(repo, defaultBranch);
        if (!mainSha) {
          return c.json({ error: "Could not find default branch HEAD" }, 500);
        }
        await github.createBranch(repo, branch, mainSha);
        branchSha = mainSha;
      }

      // Get file's current SHA on the branch (if updating)
      let fileSha: string | undefined = reqBody.sha;
      if (!fileSha) {
        try {
          const existing = await github.getFile(repo, filePath, branch);
          fileSha = existing.sha;
        } catch {
          // File doesn't exist on branch — new file
        }
      }

      const message = fileSha
        ? `Update ${collection}/${slug}`
        : `Create ${collection}/${slug}`;

      try {
        const result = await github.putFile(
          repo,
          filePath,
          fileContent,
          message,
          fileSha,
          branch
        );
        c.var.logger?.audit("content.saved", { repo, collection, slug, mode: "branch", branch });
        return c.json({ sha: result.sha, path: filePath, branch });
      } catch (e) {
        if (e instanceof GitHubApiError && e.status === 403) {
          return c.json(
            { error: `GitHub App not installed on this repo. Install it here: ${GITHUB_APP_INSTALL_URL}` },
            403
          );
        }
        if (e instanceof GitHubApiError && e.status === 409) {
          return c.json(
            { error: "Conflict: file was modified. Refresh and try again." },
            409
          );
        }
        throw e;
      }
    }

    // Direct save (default behavior)
    const message = reqBody.sha
      ? `Update ${collection}/${slug}`
      : `Create ${collection}/${slug}`;

    try {
      const result = await github.putFile(
        repo,
        filePath,
        fileContent,
        message,
        reqBody.sha
      );
      c.var.logger?.audit("content.saved", { repo, collection, slug, mode: "direct" });
      return c.json({ sha: result.sha, path: filePath });
    } catch (e) {
      if (e instanceof GitHubApiError && e.status === 403) {
        return c.json(
          { error: `GitHub App not installed on this repo. Install it here: ${GITHUB_APP_INSTALL_URL}` },
          403
        );
      }
      if (e instanceof GitHubApiError && e.status === 409) {
        return c.json(
          { error: "Conflict: file was modified outside CMS. Refresh and try again." },
          409
        );
      }
      throw e;
    }
  }
);

// Delete item
content.delete(
  "/:repo/content/:collection/:slug",
  requirePermission("content:delete"),
  requireRepoAccess(),
  async (c) => {
    const repo = decodeURIComponent(c.req.param("repo"));
    const collection = c.req.param("collection");
    const slug = c.req.param("slug");

    if (!isValidCollection(collection)) {
      return c.json({ error: "Invalid collection name" }, 400);
    }
    if (!isValidSlug(slug)) {
      return c.json({ error: "Invalid slug" }, 400);
    }

    const github = new GitHubClient(c.var.auth.githubToken, c.var.logger);

    const { content: configRaw } = await github.getFile(repo, "cms.config.json");
    const config = JSON.parse(configRaw) as CmsConfig;
    const collectionConfig = config.collections[collection];

    if (!collectionConfig) {
      return c.json({ error: "Collection not found" }, 404);
    }

    const sha = c.req.query("sha");
    if (!sha) {
      return c.json({ error: "sha is required" }, 400);
    }

    const basePath = `${collectionConfig.directory}/${slug}`;
    for (const ext of [".md", ".mdx"]) {
      try {
        await github.deleteFile(
          repo,
          `${basePath}${ext}`,
          `Delete ${collection}/${slug}`,
          sha
        );
        c.var.logger?.audit("content.deleted", { repo, collection, slug });
        return c.json({ ok: true });
      } catch (e) {
        if (e instanceof GitHubApiError && e.status === 404) continue;
        throw e;
      }
    }

    return c.json({ error: "Item not found" }, 404);
  }
);

export default content;
