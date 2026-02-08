---
title: "Astro"
description: "Integrate samduke-cms with your Astro site to fetch and display content from your CMS"
---

# Astro Integration

This guide shows you how to integrate samduke-cms with an Astro site. The CMS provides a REST API that you can use to fetch content at build time for static site generation.

## Environment Variables

Create a `.env` file in your Astro project root with your CMS credentials:

```env
CMS_URL=https://your-cms.workers.dev
CMS_TOKEN=cms_your_token_here
```

Access these variables in Astro using `import.meta.env.CMS_URL` and `import.meta.env.CMS_TOKEN`.

## Helper Fetch Function

Create a utility function to interact with the CMS API. Save this as `src/lib/cms.ts`:

```typescript
const CMS_URL = import.meta.env.CMS_URL;
const CMS_TOKEN = import.meta.env.CMS_TOKEN;

interface CMSFrontmatter {
  title: string;
  date: string;
  [key: string]: any;
}

interface CMSContentItem {
  slug: string;
  path: string;
  sha: string;
  frontmatter: CMSFrontmatter;
}

interface CMSContentDetail extends CMSContentItem {
  body: string;
}

async function fetchCMS(endpoint: string) {
  const response = await fetch(`${CMS_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${CMS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`CMS API error: ${response.statusText}`);
  }

  return response.json();
}

export async function listContent(
  repo: string,
  collection: string
): Promise<CMSContentItem[]> {
  const encodedRepo = encodeURIComponent(repo);
  return fetchCMS(`/api/repos/${encodedRepo}/content/${collection}`);
}

export async function getContent(
  repo: string,
  collection: string,
  slug: string
): Promise<CMSContentDetail> {
  const encodedRepo = encodeURIComponent(repo);
  return fetchCMS(`/api/repos/${encodedRepo}/content/${collection}/${slug}`);
}
```

## Displaying a Blog Post List

Use `listContent()` in an Astro page to fetch and display all posts:

```astro
---
// src/pages/blog/index.astro
import { listContent } from '../../lib/cms';

const posts = await listContent('owner/repo', 'blog');

// Sort by date, newest first
const sortedPosts = posts.sort((a, b) => {
  return new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime();
});
---

<html>
  <head>
    <title>Blog</title>
  </head>
  <body>
    <h1>Blog Posts</h1>
    <ul>
      {sortedPosts.map((post) => (
        <li>
          <a href={`/blog/${post.slug}`}>
            <h2>{post.frontmatter.title}</h2>
            <time datetime={post.frontmatter.date}>
              {new Date(post.frontmatter.date).toLocaleDateString()}
            </time>
          </a>
        </li>
      ))}
    </ul>
  </body>
</html>
```

## Single Post Page with Dynamic Routes

Use `getStaticPaths()` to generate static pages for each post:

```astro
---
// src/pages/blog/[slug].astro
import { listContent, getContent } from '../../lib/cms';

export async function getStaticPaths() {
  const posts = await listContent('owner/repo', 'blog');

  return posts.map((post) => ({
    params: { slug: post.slug },
  }));
}

const { slug } = Astro.params;
const post = await getContent('owner/repo', 'blog', slug);
---

<html>
  <head>
    <title>{post.frontmatter.title}</title>
  </head>
  <body>
    <article>
      <h1>{post.frontmatter.title}</h1>
      <time datetime={post.frontmatter.date}>
        {new Date(post.frontmatter.date).toLocaleDateString()}
      </time>
      <div set:html={post.body} />
    </article>
  </body>
</html>
```

## API Reference

### List Content

```
GET /api/repos/:repo/content/:collection
```

- `repo`: URL-encoded repository (e.g., `owner%2Frepo`)
- `collection`: Collection name (e.g., `blog`, `notes`)
- Returns: Array of `CMSContentItem` objects

### Get Single Content Item

```
GET /api/repos/:repo/content/:collection/:slug
```

- Returns: `CMSContentDetail` object with `body` field containing the full content

Both endpoints require the `Authorization: Bearer cms_your_token` header.
