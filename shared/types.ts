export interface CmsConfig {
  name: string;
  collections: Record<string, CollectionConfig>;
}

export interface CollectionConfig {
  label: string;
  directory: string;
  fields: FieldDefinition[];
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
}

export interface RepoConnection {
  fullName: string; // "owner/repo-name"
  addedAt: string;
}

// --- API Token types ---

export type Permission =
  | "content:read"
  | "content:write"
  | "content:delete"
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
