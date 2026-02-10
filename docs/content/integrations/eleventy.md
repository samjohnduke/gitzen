---
title: "Eleventy"
description: "Integrate gitzen with Eleventy (11ty) to fetch content at build time"
---

# Eleventy Integration

This guide shows how to integrate gitzen with [Eleventy (11ty)](https://www.11ty.dev/) to fetch content from your CMS at build time.

## Setup

First, install the required dependencies:

```bash
npm install dotenv
```

Create a `.env` file in your project root:

```bash
CMS_URL=https://your-cms-instance.workers.dev
CMS_TOKEN=cms_your_api_token_here
```

## Fetching Content with Data Files

Eleventy data files in the `_data/` directory can export async functions or promises. Create a data file to fetch posts from the CMS:

```js
// _data/posts.js
require('dotenv').config();

module.exports = async function() {
  const repo = encodeURIComponent('owner/repo'); // e.g., 'samduke/blog'
  const collection = 'posts'; // your collection name
  const url = `${process.env.CMS_URL}/api/repos/${repo}/content/${collection}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.CMS_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.statusText}`);
  }

  const posts = await response.json();

  // Sort by date (newest first)
  return posts.sort((a, b) => {
    const dateA = new Date(a.frontmatter.date || 0);
    const dateB = new Date(b.frontmatter.date || 0);
    return dateB - dateA;
  });
};
```

## API Reference

### List Content
```
GET /api/repos/:repo/content/:collection
```
- `:repo` is URL-encoded as `owner%2Frepo`
- Returns: `Array<{ slug, path, sha, frontmatter: { title, date, ... } }>`

### Get Single Item
```
GET /api/repos/:repo/content/:collection/:slug
```
- Returns: `{ slug, path, sha, frontmatter, body }`

Both endpoints require authentication:
```
Authorization: Bearer cms_your_token
```

## Using Data in Templates

### Blog List Template

Create a Nunjucks template to display all posts:

```njk
<!-- blog.njk -->
---
layout: base.njk
title: Blog
---

<h1>Blog Posts</h1>

<ul class="post-list">
  {% for post in posts %}
    <li>
      <article>
        <h2>
          <a href="/blog/{{ post.slug }}/">{{ post.frontmatter.title }}</a>
        </h2>
        {% if post.frontmatter.date %}
          <time datetime="{{ post.frontmatter.date }}">
            {{ post.frontmatter.date | date: "%B %d, %Y" }}
          </time>
        {% endif %}
        {% if post.frontmatter.description %}
          <p>{{ post.frontmatter.description }}</p>
        {% endif %}
      </article>
    </li>
  {% endfor %}
</ul>
```

### Individual Post Pages with Pagination

Use Eleventy's pagination to create individual pages for each post:

```njk
<!-- blog-post.njk -->
---
pagination:
  data: posts
  size: 1
  alias: post
permalink: "/blog/{{ post.slug }}/"
layout: base.njk
---

<article>
  <h1>{{ post.frontmatter.title }}</h1>

  {% if post.frontmatter.date %}
    <time datetime="{{ post.frontmatter.date }}">
      {{ post.frontmatter.date | date: "%B %d, %Y" }}
    </time>
  {% endif %}

  <div class="content">
    {{ post.body | safe }}
  </div>
</article>
```

## Fetching Post Body

To get the full content including the body, create a separate data file that fetches individual posts:

```js
// _data/postsWithBody.js
require('dotenv').config();

module.exports = async function() {
  const repo = encodeURIComponent('owner/repo');
  const collection = 'posts';
  const listUrl = `${process.env.CMS_URL}/api/repos/${repo}/content/${collection}`;

  // First, get the list of posts
  const listResponse = await fetch(listUrl, {
    headers: { 'Authorization': `Bearer ${process.env.CMS_TOKEN}` }
  });

  const posts = await listResponse.json();

  // Then fetch each post with body
  const postsWithBody = await Promise.all(
    posts.map(async (post) => {
      const postUrl = `${process.env.CMS_URL}/api/repos/${repo}/content/${collection}/${post.slug}`;
      const response = await fetch(postUrl, {
        headers: { 'Authorization': `Bearer ${process.env.CMS_TOKEN}` }
      });
      return response.json();
    })
  );

  // Sort by date
  return postsWithBody.sort((a, b) => {
    const dateA = new Date(a.frontmatter.date || 0);
    const dateB = new Date(b.frontmatter.date || 0);
    return dateB - dateA;
  });
};
```

Then update your template to use `postsWithBody` instead of `posts`.

## Next Steps

- Add error handling for failed API requests
- Implement caching to reduce build time
- Use Eleventy's `addGlobalData` for shared configuration
- Add filters for markdown rendering if the body is in markdown format
