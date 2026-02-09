export interface WorkflowConfig {
  default: "pr" | "direct";
  locked: boolean;
}

export interface PreviewConfig {
  pagesProject: string;
}

export interface CmsConfig {
  name: string;
  collections: Record<string, CollectionConfig>;
  preview?: PreviewConfig;
}

export interface CollectionConfig {
  label: string;
  directory: string;
  fields: FieldDefinition[];
  workflow?: WorkflowConfig;
}

export type FieldType = "string" | "string[]" | "number" | "boolean" | "date";

export interface FieldDefinition {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  default?: unknown;
}

export interface ContentItem {
  slug: string;
  path: string;
  sha: string;
  frontmatter: Record<string, unknown>;
  body?: string;
  branch?: string;
  prNumber?: number;
}

export interface RepoConnection {
  fullName: string; // "owner/repo-name"
  addedAt: string;
  addedBy?: string; // userId — absent on legacy entries
}

// --- API Token types ---

export type Permission =
  | "content:read"
  | "content:write"
  | "content:delete"
  | "content:publish"
  | "config:read"
  | "repos:read";

/** Returned when listing tokens (secret is never exposed after creation). */
export interface ApiTokenSummary {
  tokenId: string;
  name: string;
  repos: string[];
  permissions: Permission[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

/** Returned only once, at creation time. */
export interface ApiTokenCreated extends ApiTokenSummary {
  token: string;
}

// --- Pull Request types ---

export interface PullRequestSummary {
  number: number;
  title: string;
  branch: string;
  state: "open" | "closed";
  merged: boolean;
  createdAt: string;
  updatedAt: string;
  collection: string;
  slug: string;
  previewUrl: string | null;
  author: string;
}

export interface PullRequestDetail extends PullRequestSummary {
  body: string;
  mergeable: boolean | null;
  headSha: string;
  baseSha: string;
  htmlUrl: string;
}

export interface PrComment {
  id: number;
  body: string;
  author: string;
  avatarUrl: string;
  createdAt: string;
}

export interface ContentDiff {
  collection: string;
  slug: string;
  type: "added" | "modified" | "deleted";
  frontmatter: {
    fields: Array<{
      name: string;
      oldValue: unknown;
      newValue: unknown;
      changed: boolean;
    }>;
  };
  body: {
    oldBody: string;
    newBody: string;
  };
}
