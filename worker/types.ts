export interface Env {
  SESSIONS: KVNamespace;
  CMS_DATA: KVNamespace;
  ASSETS: Fetcher;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

export interface SessionData {
  githubToken: string;
  githubUsername: string;
  createdAt: string;
}
