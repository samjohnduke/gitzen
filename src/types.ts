export type { CmsConfig, CollectionConfig, FieldDefinition, ContentItem, RepoConnection } from "@shared/types";

export interface AuthState {
  authenticated: boolean;
  username?: string;
}
