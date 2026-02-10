---
title: "Jekyll"
description: "Integrate gitzen with Jekyll to fetch content at build time"
---

# Jekyll Integration

Jekyll can fetch content from gitzen at build time using a simple Node.js script. This approach allows you to manage content through the CMS while building a static Jekyll site.

## Fetch Script

Create a script to fetch content from the CMS API and write markdown files to Jekyll's directories:

**scripts/fetch-content.js**

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CMS_URL = process.env.CMS_URL || 'https://cms.example.com';
const CMS_TOKEN = process.env.CMS_TOKEN;

if (!CMS_TOKEN) {
  console.error('Error: CMS_TOKEN environment variable is required');
  process.exit(1);
}

async function fetchContent(repo, collection) {
  const encodedRepo = encodeURIComponent(repo);
  const url = `${CMS_URL}/api/repos/${encodedRepo}/content/${collection}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${CMS_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.statusText}`);
  }

  return response.json();
}

async function fetchItem(repo, collection, slug) {
  const encodedRepo = encodeURIComponent(repo);
  const url = `${CMS_URL}/api/repos/${encodedRepo}/content/${collection}/${slug}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${CMS_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch item ${slug}: ${response.statusText}`);
  }

  return response.json();
}

function buildMarkdown(frontmatter, body) {
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (typeof value === 'string' && value.includes('\n')) {
        return `${key}: |\n  ${value.replace(/\n/g, '\n  ')}`;
      }
      return `${key}: ${JSON.stringify(value)}`;
    })
    .join('\n');

  return `---\n${yaml}\n---\n\n${body}`;
}

async function main() {
  const repo = 'owner/repo'; // Replace with your GitHub repo
  const collection = 'blog'; // Replace with your collection name
  const outputDir = path.join(__dirname, '..', '_posts');

  console.log(`Fetching content from ${repo}/${collection}...`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Fetch list of content items
  const items = await fetchContent(repo, collection);
  console.log(`Found ${items.length} items`);

  // Fetch and write each item
  for (const item of items) {
    console.log(`Fetching ${item.slug}...`);
    const full = await fetchItem(repo, collection, item.slug);

    // Build markdown with frontmatter
    const markdown = buildMarkdown(full.frontmatter, full.body);

    // Write to Jekyll's _posts directory
    // Jekyll expects YYYY-MM-DD-title.md format
    const date = full.frontmatter.date ? new Date(full.frontmatter.date).toISOString().split('T')[0] : '2024-01-01';
    const filename = `${date}-${item.slug}.md`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, markdown, 'utf-8');
    console.log(`Written ${filename}`);
  }

  console.log('Content fetch complete!');
}

main().catch(error => {
  console.error('Error fetching content:', error);
  process.exit(1);
});
```

## Environment Variables

Set the following environment variables:

```bash
CMS_URL=https://your-cms.example.com
CMS_TOKEN=cms_your_api_token_here
```

You can obtain an API token from the CMS dashboard under Settings > API Tokens.

## Build Configuration

Add the fetch script to your build process:

**package.json**

```json
{
  "scripts": {
    "prebuild": "node scripts/fetch-content.js",
    "build": "bundle exec jekyll build"
  }
}
```

Now when you run `npm run build`, the content will be fetched before Jekyll builds the site.

## Jekyll Template

Use the fetched posts in your Jekyll templates as usual:

**index.html**

```liquid
---
layout: default
---

<div class="posts">
  {% for post in site.posts %}
    <article class="post">
      <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
      <time datetime="{{ post.date | date_to_xmlschema }}">
        {{ post.date | date: "%B %-d, %Y" }}
      </time>
      <div class="excerpt">
        {{ post.excerpt }}
      </div>
    </article>
  {% endfor %}
</div>
```

**_layouts/post.html**

```liquid
---
layout: default
---

<article class="post">
  <header>
    <h1>{{ page.title }}</h1>
    <time datetime="{{ page.date | date_to_xmlschema }}">
      {{ page.date | date: "%B %-d, %Y" }}
    </time>
  </header>

  <div class="content">
    {{ content }}
  </div>
</article>
```

## API Reference

### List Content

```
GET /api/repos/:repo/content/:collection
```

- `:repo` - URL-encoded repository (e.g., `owner%2Frepo`)
- `:collection` - Collection name (e.g., `blog`, `posts`)

**Response:**

```json
[
  {
    "slug": "my-post",
    "path": "content/blog/my-post.md",
    "sha": "abc123...",
    "frontmatter": {
      "title": "My Post",
      "date": "2024-01-15",
      "tags": ["jekyll", "cms"]
    }
  }
]
```

### Get Single Item

```
GET /api/repos/:repo/content/:collection/:slug
```

**Response:**

```json
{
  "slug": "my-post",
  "path": "content/blog/my-post.md",
  "sha": "abc123...",
  "frontmatter": {
    "title": "My Post",
    "date": "2024-01-15",
    "tags": ["jekyll", "cms"]
  },
  "body": "Post content here..."
}
```

### Authentication

All API requests require a bearer token:

```
Authorization: Bearer cms_your_token_here
```

## Next Steps

- Configure webhooks to trigger rebuilds when content changes
- Set up CI/CD to automatically fetch and deploy on content updates
- Cache fetched content to speed up local development builds
