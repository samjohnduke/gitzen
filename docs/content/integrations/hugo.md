---
title: "Hugo"
description: "Integrate samduke-cms with Hugo by fetching content at build time"
---

# Hugo Integration

Hugo is a fast static site generator that works with markdown files. You can integrate samduke-cms by fetching content from the CMS API at build time and writing it to Hugo's content directory.

## Setup

### 1. Create a Fetch Script

Create `scripts/fetch-content.js` in your Hugo project:

```javascript
import fs from 'fs/promises';
import path from 'path';

const CMS_URL = process.env.CMS_URL || 'https://your-cms.workers.dev';
const CMS_TOKEN = process.env.CMS_TOKEN;
const REPO = process.env.CMS_REPO || 'owner/repo';
const COLLECTION = process.env.CMS_COLLECTION || 'blog';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'content/blog';

if (!CMS_TOKEN) {
  console.error('Error: CMS_TOKEN environment variable is required');
  process.exit(1);
}

async function fetchContent() {
  const encodedRepo = encodeURIComponent(REPO);
  const url = `${CMS_URL}/api/repos/${encodedRepo}/content/${COLLECTION}`;

  console.log(`Fetching content from ${url}...`);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${CMS_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
  }

  const items = await response.json();
  console.log(`Found ${items.length} items`);

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Fetch each item's full content
  for (const item of items) {
    const itemUrl = `${CMS_URL}/api/repos/${encodedRepo}/content/${COLLECTION}/${item.slug}`;
    console.log(`Fetching ${item.slug}...`);

    const itemResponse = await fetch(itemUrl, {
      headers: {
        'Authorization': `Bearer ${CMS_TOKEN}`
      }
    });

    if (!itemResponse.ok) {
      console.error(`Failed to fetch ${item.slug}: ${itemResponse.status}`);
      continue;
    }

    const { frontmatter, body } = await itemResponse.json();

    // Reconstruct markdown file with YAML frontmatter
    const yamlLines = ['---'];
    for (const [key, value] of Object.entries(frontmatter)) {
      if (typeof value === 'string') {
        yamlLines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else if (Array.isArray(value)) {
        yamlLines.push(`${key}:`);
        value.forEach(v => yamlLines.push(`  - ${v}`));
      } else {
        yamlLines.push(`${key}: ${value}`);
      }
    }
    yamlLines.push('---');
    yamlLines.push('');

    const markdown = yamlLines.join('\n') + body;

    // Write to Hugo content directory
    const outputPath = path.join(OUTPUT_DIR, `${item.slug}.md`);
    await fs.writeFile(outputPath, markdown, 'utf-8');
    console.log(`Written ${outputPath}`);
  }

  console.log('Content fetch complete!');
}

fetchContent().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
```

### 2. Environment Variables

Set the following environment variables:

```bash
export CMS_URL="https://your-cms.workers.dev"
export CMS_TOKEN="cms_your_token_here"
export CMS_REPO="owner/repo"
export CMS_COLLECTION="blog"
export OUTPUT_DIR="content/blog"
```

Or create a `.env` file (don't commit this):

```
CMS_URL=https://your-cms.workers.dev
CMS_TOKEN=cms_your_token_here
CMS_REPO=owner/repo
CMS_COLLECTION=blog
OUTPUT_DIR=content/blog
```

### 3. Update Build Command

Add the fetch script to your build process.

**Using package.json:**

```json
{
  "scripts": {
    "fetch": "node scripts/fetch-content.js",
    "build": "npm run fetch && hugo",
    "dev": "npm run fetch && hugo server"
  },
  "type": "module"
}
```

**Using Makefile:**

```makefile
.PHONY: fetch build

fetch:
	node scripts/fetch-content.js

build: fetch
	hugo

dev: fetch
	hugo server
```

## Hugo Templates

Create a template to list your blog posts in `layouts/_default/list.html`:

```html
{{ define "main" }}
<main>
  <h1>{{ .Title }}</h1>

  <ul class="post-list">
    {{ range .Pages }}
    <article>
      <h2>
        <a href="{{ .Permalink }}">{{ .Title }}</a>
      </h2>
      <time datetime="{{ .Date.Format "2006-01-02" }}">
        {{ .Date.Format "January 2, 2006" }}
      </time>
      {{ if .Params.description }}
      <p>{{ .Params.description }}</p>
      {{ end }}
    </article>
    {{ end }}
  </ul>
</main>
{{ end }}
```

Create a single post template in `layouts/_default/single.html`:

```html
{{ define "main" }}
<article>
  <header>
    <h1>{{ .Title }}</h1>
    <time datetime="{{ .Date.Format "2006-01-02" }}">
      {{ .Date.Format "January 2, 2006" }}
    </time>
  </header>

  <div class="content">
    {{ .Content }}
  </div>

  {{ if .Params.tags }}
  <footer>
    <strong>Tags:</strong>
    {{ range .Params.tags }}
    <a href="/tags/{{ . | urlize }}">{{ . }}</a>
    {{ end }}
  </footer>
  {{ end }}
</article>
{{ end }}
```

## API Reference

### List Content

```
GET /api/repos/:repo/content/:collection
```

- `:repo` - URL-encoded repository (e.g., `owner%2Frepo`)
- `:collection` - Collection name (e.g., `blog`, `notes`)
- Header: `Authorization: Bearer cms_your_token`

Response:

```json
[
  {
    "slug": "my-post",
    "path": "content/blog/my-post.md",
    "sha": "abc123...",
    "frontmatter": {
      "title": "My Post",
      "date": "2026-01-15",
      "tags": ["hugo", "cms"]
    }
  }
]
```

### Get Single Item

```
GET /api/repos/:repo/content/:collection/:slug
```

Response:

```json
{
  "slug": "my-post",
  "path": "content/blog/my-post.md",
  "sha": "abc123...",
  "frontmatter": {
    "title": "My Post",
    "date": "2026-01-15",
    "tags": ["hugo", "cms"]
  },
  "body": "## Hello World\n\nPost content here..."
}
```

## Deployment

For continuous deployment (e.g., Netlify, Vercel), set the environment variables in your deployment platform and ensure the build command runs the fetch script:

```bash
npm run build
```

The fetch script will pull the latest content from your CMS before Hugo builds the site.
