---
title: Getting Started
description: Configure your repo and start editing your site's content from the browser.
order: 1
---

Get up and running with gitzen in a few minutes.

## What is gitzen?

gitzen is a web-based editor for your static site's markdown content. It connects to your GitHub repos and gives you a visual editor for the markdown files your site already uses — blog posts, docs, project pages, anything with frontmatter.

Every save is a real git commit to your repo. Your static site generator (Astro, Hugo, Next.js, Jekyll, etc.) reads those files from disk as it always has. gitzen doesn't change your build process and your site doesn't depend on it.

**It is not a CMS in the traditional sense.** There's no content database and your site doesn't fetch from an API at build time. gitzen is just a better way to edit the files that are already there.

## 1. Add cms.config.json to your repo

In the GitHub repository that contains your site's content, create a `cms.config.json` file at the root. This tells gitzen where your markdown files live and what frontmatter fields they have:

```json
{
  "name": "My Blog",
  "collections": {
    "blog": {
      "label": "Blog Posts",
      "directory": "src/content/blog",
      "fields": [
        { "name": "title", "type": "string", "label": "Title", "required": true },
        { "name": "date", "type": "date", "label": "Date", "required": true },
        { "name": "description", "type": "string", "label": "Description" },
        { "name": "tags", "type": "string[]", "label": "Tags" },
        { "name": "draft", "type": "boolean", "label": "Draft", "default": false }
      ]
    }
  }
}
```

The `directory` should point to where your site already stores its content files. See the [Configuration](/docs/configuration) guide for the full reference.

## 2. Install the GitHub App

gitzen needs access to read and write files in your repo. Install the GitHub App on your repository:

1. Go to [github.com/apps/git-zen-cms](https://github.com/apps/git-zen-cms)
2. Click **Install** and select the repositories you want to use with gitzen

## 3. Sign in and connect your repo

1. Visit [gitzen.dev/app](https://gitzen.dev/app)
2. Sign in with GitHub
3. Click **Add Repository** and select your repo
4. Open a collection from the sidebar — you'll see your existing content
5. Click any item to edit it, or create new content

Changes are committed directly to your repo's default branch. Your site rebuilds and deploys as usual.

## Next steps

- [Configuration](/docs/configuration) — full `cms.config.json` reference
- [Content Workflow](/docs/workflow) — draft branches, PR review, preview deployments
- [Authentication](/docs/authentication) — API tokens and device code flow
- [API Reference](/docs/api-reference) — REST API for automations and pipelines
- [Self-Hosting](/docs/self-hosting) — deploy your own gitzen instance
