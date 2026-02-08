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
