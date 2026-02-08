import { Hono } from "hono";
import type { Env } from "../types.js";
import type { CmsConfig, ContentItem } from "../../shared/types.js";
import { GitHubClient, GitHubApiError } from "../lib/github.js";
import { parseFrontmatter, serializeFrontmatter } from "../../shared/frontmatter.js";

type ContentApp = {
  Bindings: Env;
  Variables: { githubToken: string; githubUsername: string };
};

const content = new Hono<ContentApp>();

// List items in a collection
content.get("/:repo/content/:collection", async (c) => {
  const repo = decodeURIComponent(c.req.param("repo"));
  const collection = c.req.param("collection");
  const github = new GitHubClient(c.var.githubToken);

  // Fetch config to get directory
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
});

// Get a single item
content.get("/:repo/content/:collection/:slug", async (c) => {
  const repo = decodeURIComponent(c.req.param("repo"));
  const collection = c.req.param("collection");
  const slug = c.req.param("slug");
  const github = new GitHubClient(c.var.githubToken);

  const { content: configRaw } = await github.getFile(repo, "cms.config.json");
  const config = JSON.parse(configRaw) as CmsConfig;
  const collectionConfig = config.collections[collection];

  if (!collectionConfig) {
    return c.json({ error: "Collection not found" }, 404);
  }

  // Try .md then .mdx
  const basePath = `${collectionConfig.directory}/${slug}`;
  for (const ext of [".md", ".mdx"]) {
    try {
      const { content: raw, sha } = await github.getFile(repo, `${basePath}${ext}`);
      const { frontmatter, body } = parseFrontmatter(raw);
      return c.json({
        slug,
        path: `${basePath}${ext}`,
        sha,
        frontmatter,
        body,
      } satisfies ContentItem);
    } catch (e) {
      if (e instanceof GitHubApiError && e.status === 404) continue;
      throw e;
    }
  }

  return c.json({ error: "Item not found" }, 404);
});

// Create/update item
content.put("/:repo/content/:collection/:slug", async (c) => {
  const repo = decodeURIComponent(c.req.param("repo"));
  const collection = c.req.param("collection");
  const slug = c.req.param("slug");
  const github = new GitHubClient(c.var.githubToken);

  const { content: configRaw } = await github.getFile(repo, "cms.config.json");
  const config = JSON.parse(configRaw) as CmsConfig;
  const collectionConfig = config.collections[collection];

  if (!collectionConfig) {
    return c.json({ error: "Collection not found" }, 404);
  }

  const body = await c.req.json<{
    frontmatter: Record<string, unknown>;
    body: string;
    sha?: string;
  }>();

  const filePath = `${collectionConfig.directory}/${slug}.md`;
  const fileContent = serializeFrontmatter(body.frontmatter, body.body);
  const message = body.sha
    ? `Update ${collection}/${slug}`
    : `Create ${collection}/${slug}`;

  try {
    const result = await github.putFile(
      repo,
      filePath,
      fileContent,
      message,
      body.sha
    );
    return c.json({ sha: result.sha, path: filePath });
  } catch (e) {
    if (e instanceof GitHubApiError && e.status === 409) {
      return c.json(
        { error: "Conflict: file was modified outside CMS. Refresh and try again." },
        409
      );
    }
    throw e;
  }
});

// Delete item
content.delete("/:repo/content/:collection/:slug", async (c) => {
  const repo = decodeURIComponent(c.req.param("repo"));
  const collection = c.req.param("collection");
  const slug = c.req.param("slug");
  const github = new GitHubClient(c.var.githubToken);

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

  // Try .md then .mdx
  const basePath = `${collectionConfig.directory}/${slug}`;
  for (const ext of [".md", ".mdx"]) {
    try {
      await github.deleteFile(
        repo,
        `${basePath}${ext}`,
        `Delete ${collection}/${slug}`,
        sha
      );
      return c.json({ ok: true });
    } catch (e) {
      if (e instanceof GitHubApiError && e.status === 404) continue;
      throw e;
    }
  }

  return c.json({ error: "Item not found" }, 404);
});

export default content;
