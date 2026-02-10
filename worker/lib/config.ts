export interface AppConfig {
  githubAppClientId: string;
  githubAppClientSecret: string;
  encryptionKey: string;
  apiTokenSecret: string;
  sentryDsn: string;
  axiomApiToken: string;
  axiomDataset: string;
}

export function configFromEnv(env: Record<string, unknown>): AppConfig {
  return {
    githubAppClientId: env.GITHUB_APP_CLIENT_ID as string,
    githubAppClientSecret: env.GITHUB_APP_CLIENT_SECRET as string,
    encryptionKey: env.ENCRYPTION_KEY as string,
    apiTokenSecret: env.API_TOKEN_SECRET as string,
    sentryDsn: (env.SENTRY_DSN as string) ?? "",
    axiomApiToken: (env.AXIOM_API_TOKEN as string) ?? "",
    axiomDataset: (env.AXIOM_DATASET as string) ?? "",
  };
}
