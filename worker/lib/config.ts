import type { Env } from "../types.js";

export interface AppConfig {
  githubAppClientId: string;
  githubAppClientSecret: string;
  encryptionKey: string;
  apiTokenSecret: string;
  sentryDsn: string;
  axiomApiToken: string;
  axiomDataset: string;
}

export function configFromEnv(env: Env): AppConfig {
  return {
    githubAppClientId: env.GITHUB_APP_CLIENT_ID,
    githubAppClientSecret: env.GITHUB_APP_CLIENT_SECRET,
    encryptionKey: env.ENCRYPTION_KEY,
    apiTokenSecret: env.API_TOKEN_SECRET,
    sentryDsn: env.SENTRY_DSN ?? "",
    axiomApiToken: env.AXIOM_API_TOKEN ?? "",
    axiomDataset: env.AXIOM_DATASET ?? "",
  };
}
