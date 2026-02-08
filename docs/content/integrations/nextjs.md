---
title: "Next.js"
description: "Integrate samduke-cms with Next.js App Router for static and dynamic content delivery"
---

# Next.js Integration

This guide shows how to integrate samduke-cms with a Next.js application using the App Router. The CMS provides a REST API that works seamlessly with Next.js Server Components, static generation, and ISR.

## Environment Variables

Create a `.env.local` file in your Next.js project:

```env
CMS_URL=https://your-cms.workers.dev
CMS_TOKEN=cms_your_token_here
```

These variables are available server-side only (no `NEXT_PUBLIC_` prefix needed).

## CMS Client Helper

Create a helper function to interact with the CMS API:

```typescript
// lib/cms.ts
interface CMSListItem {
  slug: string;
  path: string;
  sha: string;
  frontmatter: {
    title: string;
    date: string;
    [key: string]: unknown;
  };
}

interface CMSContentItem extends CMSListItem {
  body: string;
}

async function fetchCMS<T>(path: string): Promise<T> {
  const url = `${process.env.CMS_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.CMS_TOKEN}`,
    },
    next: { revalidate: 3600 }, // ISR: revalidate every hour
  });

  if (!res.ok) {
    throw new Error(`CMS API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getContentList(
  repo: string,
  collection: string
): Promise<CMSListItem[]> {
  const encodedRepo = encodeURIComponent(repo);
  return fetchCMS<CMSListItem[]>(
    `/api/repos/${encodedRepo}/content/${collection}`
  );
}

export async function getContentItem(
  repo: string,
  collection: string,
  slug: string
): Promise<CMSContentItem> {
  const encodedRepo = encodeURIComponent(repo);
  return fetchCMS<CMSContentItem>(
    `/api/repos/${encodedRepo}/content/${collection}/${slug}`
  );
}
```

## Using in Server Components

Server Components can fetch content directly:

```typescript
// app/blog/page.tsx
import { getContentList } from '@/lib/cms';

export default async function BlogPage() {
  const posts = await getContentList('owner/repo', 'blog');

  return (
    <div>
      <h1>Blog Posts</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <a href={`/blog/${post.slug}`}>
              {post.frontmatter.title}
            </a>
            <time>{post.frontmatter.date}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Static Generation

Use `generateStaticParams` to pre-render all posts at build time:

```typescript
// app/blog/[slug]/page.tsx
import { getContentList, getContentItem } from '@/lib/cms';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getContentList('owner/repo', 'blog');
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getContentItem('owner/repo', 'blog', slug);

  return (
    <article>
      <h1>{post.frontmatter.title}</h1>
      <time>{post.frontmatter.date}</time>
      {/* Note: CMS body is HTML. Consider using a markdown-to-React library
          like react-markdown instead of dangerouslySetInnerHTML */}
      <div className="prose">{/* Render post.body safely here */}</div>
    </article>
  );
}
```

## Rendering Content Safely

The CMS returns HTML content in the `body` field. For security, use a React-based markdown renderer or HTML sanitizer:

**Option 1: Use react-markdown (if CMS stores markdown)**

```bash
npm install react-markdown
```

```typescript
import ReactMarkdown from 'react-markdown';

export default async function BlogPostPage({ params }: PageProps) {
  const post = await getContentItem('owner/repo', 'blog', slug);

  return (
    <article>
      <h1>{post.frontmatter.title}</h1>
      <ReactMarkdown>{post.body}</ReactMarkdown>
    </article>
  );
}
```

**Option 2: Sanitize HTML with DOMPurify (for HTML content)**

```bash
npm install isomorphic-dompurify
```

```typescript
import DOMPurify from 'isomorphic-dompurify';

export default async function BlogPostPage({ params }: PageProps) {
  const post = await getContentItem('owner/repo', 'blog', slug);
  const sanitizedHTML = DOMPurify.sanitize(post.body);

  return (
    <article>
      <h1>{post.frontmatter.title}</h1>
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      />
    </article>
  );
}
```

## Incremental Static Regeneration

Control revalidation timing in the fetch options:

```typescript
// Revalidate every 10 minutes
async function fetchCMS<T>(path: string): Promise<T> {
  const res = await fetch(url, {
    headers: { /* ... */ },
    next: { revalidate: 600 },
  });
  // ...
}
```

Or use route-level revalidation:

```typescript
// app/blog/page.tsx
export const revalidate = 600; // revalidate every 10 minutes

export default async function BlogPage() {
  // ...
}
```

## Complete Example

Here's a complete blog implementation with safe HTML rendering:

**List page:**

```typescript
// app/blog/page.tsx
import Link from 'next/link';
import { getContentList } from '@/lib/cms';

export const revalidate = 3600; // 1 hour

export default async function BlogPage() {
  const posts = await getContentList('owner/repo', 'blog');

  // Sort by date descending
  const sorted = posts.sort((a, b) =>
    new Date(b.frontmatter.date).getTime() -
    new Date(a.frontmatter.date).getTime()
  );

  return (
    <main>
      <h1>Blog</h1>
      <div className="posts">
        {sorted.map((post) => (
          <article key={post.slug}>
            <Link href={`/blog/${post.slug}`}>
              <h2>{post.frontmatter.title}</h2>
            </Link>
            <time dateTime={post.frontmatter.date}>
              {new Date(post.frontmatter.date).toLocaleDateString()}
            </time>
          </article>
        ))}
      </div>
    </main>
  );
}
```

**Single post page with sanitization:**

```typescript
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { getContentList, getContentItem } from '@/lib/cms';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600; // 1 hour

export async function generateStaticParams() {
  const posts = await getContentList('owner/repo', 'blog');
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const post = await getContentItem('owner/repo', 'blog', slug);
    return {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
    };
  } catch {
    return {};
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  let post;
  try {
    post = await getContentItem('owner/repo', 'blog', slug);
  } catch {
    notFound();
  }

  const sanitizedHTML = DOMPurify.sanitize(post.body);

  return (
    <article>
      <header>
        <h1>{post.frontmatter.title}</h1>
        <time dateTime={post.frontmatter.date}>
          {new Date(post.frontmatter.date).toLocaleDateString()}
        </time>
      </header>
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      />
    </article>
  );
}
```

## Next Steps

- Add error boundaries for better error handling
- Implement caching strategies based on your content update frequency
- Use `unstable_cache` for fine-grained caching control
- Consider streaming for large content collections
- Set up type-safe frontmatter schemas with Zod or TypeScript validation
