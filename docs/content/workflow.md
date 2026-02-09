---
title: Content Workflow
description: PR-based content workflow — draft branches, preview deployments, and the Reviews UI.
order: 2.5
---

samduke-cms supports two content save modes: **direct publish** (commit straight to main) and **draft PR** (commit to a branch with a pull request for review and preview).

## Overview

| Mode | What happens | When to use |
|------|-------------|-------------|
| **Direct** | Content is committed to the default branch immediately | Quick edits, typo fixes, solo workflows |
| **PR (draft)** | Content is committed to a `cms/{collection}/{slug}` branch, and a pull request is auto-created | Team review, preview before publish, staged content |

You can switch between modes per-save using the split save button, or configure a default per collection.

## Workflow configuration

Add a `workflow` field to any collection in `cms.config.json`:

```json
{
  "name": "My Blog",
  "collections": {
    "posts": {
      "label": "Posts",
      "directory": "src/content/blog",
      "fields": [...],
      "workflow": {
        "default": "pr",
        "locked": false
      }
    }
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `default` | `"pr"` or `"direct"` | `"direct"` | Default save mode for new saves in this collection |
| `locked` | `boolean` | `false` | If `true`, users cannot override the default mode |

When `workflow` is omitted, the collection defaults to `{ "default": "direct", "locked": false }` — fully backward compatible with existing setups.

## How it works

### Branch naming

When saving as a draft, the CMS creates a branch named `cms/{collection}/{slug}`. For example, saving a blog post with slug `my-new-post` creates the branch `cms/blog/my-new-post`.

This deterministic naming means one slug can only have one draft branch — preventing duplicate PRs for the same content.

### Auto-PR creation

On the first draft save:

1. A new branch is created from the default branch's HEAD
2. The content file is committed to the branch
3. A pull request is automatically opened with a "Draft:" prefix

Subsequent saves to the same item commit directly to the existing branch — no new PRs are created.

### Editing drafts

When you open a content item that has an active draft branch, the editor automatically loads from the branch instead of main. A "PR #X" badge appears in the editor toolbar, linking to the Reviews page.

## Preview deployments

If your site is deployed on Cloudflare Pages, every PR branch gets a free preview deployment automatically. Configure the preview URL pattern in your `cms.config.json`:

```json
{
  "name": "My Blog",
  "preview": {
    "pagesProject": "my-blog"
  },
  "collections": { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `pagesProject` | `string` | Your Cloudflare Pages project name |

The CMS constructs preview URLs by sanitizing the branch name: slashes become hyphens, and the result is lowercased. For example:

- Branch `cms/blog/my-post` → `https://cms-blog-my-post.my-blog.pages.dev`

Preview links appear in the editor toolbar and the Reviews list.

### Setting up preview deployments

1. Deploy your site to Cloudflare Pages (it may already be there)
2. Ensure your Pages project is configured to build preview deployments for all branches (this is the default)
3. Add the `preview.pagesProject` field to your `cms.config.json`

No additional infrastructure is needed — Cloudflare Pages handles preview builds automatically.

## Reviews

The Reviews page (`/app/:repo/reviews`) shows all open pull requests created by the CMS. From here you can:

- **View diffs** — see exactly what changed in frontmatter fields and the markdown body
- **Preview** — click through to the Cloudflare Pages preview deployment
- **Publish** — squash merge the PR into main (requires `content:publish` permission for API tokens)
- **Edit** — navigate back to the editor to make changes on the branch
- **Update branch** — merge the latest main into the PR branch (if main has moved ahead)
- **Force rebase** — recreate the branch from main with your content (when update fails due to conflicts)
- **Close** — close the PR and delete the branch without publishing

### Conflict resolution

Conflicts happen when someone edits the same file on main while a PR is open. The Reviews page shows the conflict state:

- **Ready to merge** — no conflicts, Publish button is enabled
- **Has conflicts** — Publish is disabled. Use "Update Branch" to auto-resolve, or "Force Rebase" if auto-merge fails
- **Checking** — GitHub is still computing mergeable status. The page polls and updates automatically.

**Force Rebase** is safe for CMS branches because they're single-file edits. It recreates the branch from the latest main and re-applies your content. Since PRs are squash-merged anyway, commit history on the branch doesn't matter.

## Permissions

| Action | Required permission |
|--------|-------------------|
| Save as draft (branch) | `content:write` |
| Create / close PRs | `content:write` |
| View PRs and diffs | `content:read` |
| Merge (publish) PRs | `content:publish` |
| Update branch / rebase | `content:write` |

Session auth (browser) bypasses all permission checks as usual.
