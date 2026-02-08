---
title: Configuration
description: Reference for the cms.config.json file that defines your content collections.
order: 2
---

samduke-cms uses a `cms.config.json` file in the root of your repository to define content collections and their fields.

## File format

```json
{
  "name": "My Site",
  "collections": {
    "blog": {
      "label": "Blog Posts",
      "directory": "src/content/blog",
      "fields": [
        { "name": "title", "type": "string", "label": "Title", "required": true },
        { "name": "date", "type": "date", "label": "Date", "required": true }
      ]
    }
  }
}
```

## Top-level properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Display name for the site in the CMS UI |
| `collections` | `object` | Map of collection names to collection configs |

## Collection config

Each key in `collections` is the collection name (used in API paths). The value is an object:

| Property | Type | Description |
|----------|------|-------------|
| `label` | `string` | Display name in the CMS sidebar |
| `directory` | `string` | Path to the directory containing markdown files (relative to repo root) |
| `fields` | `Field[]` | Array of field definitions for frontmatter |

## Field types

Each field has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Field name (used as the YAML frontmatter key) |
| `type` | `string` | One of the types below |
| `label` | `string` | Display label in the editor |
| `required` | `boolean` | Whether the field is required (default: `false`) |
| `default` | `any` | Default value when creating new content |

### Supported types

| Type | YAML output | Example |
|------|------------|---------|
| `string` | `title: "Hello World"` | Single-line text |
| `string[]` | `tags: ["a", "b"]` | Array of strings |
| `number` | `order: 3` | Numeric value |
| `boolean` | `draft: false` | True/false toggle |
| `date` | `date: 2025-01-15` | Date in `YYYY-MM-DD` format |

## Example configurations

### Blog

```json
{
  "name": "Blog",
  "collections": {
    "posts": {
      "label": "Posts",
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

### Portfolio

```json
{
  "name": "Portfolio",
  "collections": {
    "projects": {
      "label": "Projects",
      "directory": "src/content/projects",
      "fields": [
        { "name": "title", "type": "string", "label": "Title", "required": true },
        { "name": "description", "type": "string", "label": "Description", "required": true },
        { "name": "url", "type": "string", "label": "URL" },
        { "name": "image", "type": "string", "label": "Cover Image" },
        { "name": "order", "type": "number", "label": "Sort Order", "default": 0 },
        { "name": "featured", "type": "boolean", "label": "Featured", "default": false }
      ]
    }
  }
}
```

### Docs site

```json
{
  "name": "Documentation",
  "collections": {
    "docs": {
      "label": "Documentation",
      "directory": "docs",
      "fields": [
        { "name": "title", "type": "string", "label": "Title", "required": true },
        { "name": "description", "type": "string", "label": "Description" },
        { "name": "order", "type": "number", "label": "Sort Order" },
        { "name": "category", "type": "string", "label": "Category" }
      ]
    }
  }
}
```

### Multiple collections

```json
{
  "name": "My Site",
  "collections": {
    "blog": {
      "label": "Blog",
      "directory": "content/blog",
      "fields": [
        { "name": "title", "type": "string", "label": "Title", "required": true },
        { "name": "date", "type": "date", "label": "Date", "required": true }
      ]
    },
    "changelog": {
      "label": "Changelog",
      "directory": "content/changelog",
      "fields": [
        { "name": "title", "type": "string", "label": "Version", "required": true },
        { "name": "date", "type": "date", "label": "Release Date", "required": true }
      ]
    },
    "authors": {
      "label": "Authors",
      "directory": "content/authors",
      "fields": [
        { "name": "name", "type": "string", "label": "Name", "required": true },
        { "name": "bio", "type": "string", "label": "Bio" },
        { "name": "avatar", "type": "string", "label": "Avatar URL" }
      ]
    }
  }
}
```

## Notes

- The `directory` path is relative to the repository root.
- Content files must be `.md` or `.mdx` — the CMS looks for both extensions.
- The `name` field in the config is used as the site label in the CMS UI sidebar.
- Collection names are used in API paths, so keep them URL-friendly (lowercase, hyphens).
- Date fields use `YYYY-MM-DD` format, not ISO timestamps.
