import type { Permission } from "../shared/types.js";
import type { RequestLogger } from "./lib/logger.js";
import type { KVStore } from "./lib/kv.js";
import type { AppConfig } from "./lib/config.js";

export interface Env {
  SESSIONS: KVNamespace;
  CMS_DATA: KVNamespace;
  ASSETS: Fetcher;
  // GitHub App credentials
  GITHUB_APP_CLIENT_ID: string;
  GITHUB_APP_CLIENT_SECRET: string;
  // Crypto secrets
  ENCRYPTION_KEY: string;
  API_TOKEN_SECRET: string;
  // Observability
  SENTRY_DSN: string;
  AXIOM_API_TOKEN: string;
  AXIOM_DATASET: string;
  CF_VERSION_METADATA: { id: string };
}

export interface AppVariables {
  auth: AuthContext;
  githubToken: string;
  githubUsername: string;
  logger: RequestLogger;
  requestId: string;
  cspNonce: string;
  sessions: KVStore;
  data: KVStore;
  config: AppConfig;
}

/** Session format — references a UserRecord. */
export interface SessionRecord {
  userId: string;
  createdAt: string;
  expiresAt: string;
}

/** Stored in KV under key `user:{github_user_id}`. */
export interface UserRecord {
  githubUserId: string;
  githubUsername: string;
  encryptedGithubToken: string;
  encryptedRefreshToken: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Stored in KV under key `api-token:{token_id}`. */
export interface ApiTokenRecord {
  tokenId: string;
  userId: string;
  name: string;
  repos: string[];
  permissions: Permission[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

/** Index for listing a user's tokens. KV key: `user-tokens:{user_id}`. */
export interface UserTokenIndex {
  tokenIds: string[];
}

/** Unified auth context set by middleware on every authenticated request. */
export interface AuthContext {
  userId: string;
  githubUsername: string;
  githubToken: string;
  authMethod: "session" | "api-token";
  tokenScope?: {
    repos: string[];
    permissions: Permission[];
  };
}

