const BASE = "/api";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) ?? {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getAuthStatus: () =>
    request<{ authenticated: boolean; username?: string }>("/auth/me"),

  logout: () =>
    fetch("/auth/logout", { method: "POST", credentials: "include" }),

  // GitHub
  getGithubRepos: () =>
    request<Array<{ fullName: string; private: boolean; description: string | null }>>("/github/repos"),

  // Repos
  getRepos: () =>
    request<Array<{ fullName: string; addedAt: string }>>("/repos"),

  addRepo: (fullName: string) =>
    request<{ ok: boolean }>("/repos", {
      method: "POST",
      body: JSON.stringify({ fullName }),
    }),

  removeRepo: (repo: string) =>
    request<{ ok: boolean }>(`/repos/${encodeURIComponent(repo)}`, {
      method: "DELETE",
    }),

  // Config
  getConfig: (repo: string) =>
    request<import("@shared/types").CmsConfig>(
      `/repos/${encodeURIComponent(repo)}/config`
    ),

  // Content
  listContent: (repo: string, collection: string) =>
    request<import("@shared/types").ContentItem[]>(
      `/repos/${encodeURIComponent(repo)}/content/${collection}`
    ),

  getContent: (repo: string, collection: string, slug: string) =>
    request<import("@shared/types").ContentItem>(
      `/repos/${encodeURIComponent(repo)}/content/${collection}/${slug}`
    ),

  saveContent: (
    repo: string,
    collection: string,
    slug: string,
    data: {
      frontmatter: Record<string, unknown>;
      body: string;
      sha?: string;
      mode?: "direct" | "branch";
    }
  ) =>
    request<{ sha: string; path: string; branch?: string }>(
      `/repos/${encodeURIComponent(repo)}/content/${collection}/${slug}`,
      { method: "PUT", body: JSON.stringify(data) }
    ),

  deleteContent: (repo: string, collection: string, slug: string, sha: string) =>
    request<{ ok: boolean }>(
      `/repos/${encodeURIComponent(repo)}/content/${collection}/${slug}?sha=${sha}`,
      { method: "DELETE" }
    ),

  // Pull Requests
  createPullRequest: (
    repo: string,
    data: { branch: string; title: string; body?: string }
  ) =>
    request<{ number: number; htmlUrl: string; previewUrl: string | null }>(
      `/repos/${encodeURIComponent(repo)}/pulls`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  listPullRequests: (repo: string) =>
    request<import("@shared/types").PullRequestSummary[]>(
      `/repos/${encodeURIComponent(repo)}/pulls`
    ),

  getPullRequest: (repo: string, number: number) =>
    request<import("@shared/types").PullRequestDetail>(
      `/repos/${encodeURIComponent(repo)}/pulls/${number}`
    ),

  getPullRequestDiff: (repo: string, number: number) =>
    request<import("@shared/types").ContentDiff[]>(
      `/repos/${encodeURIComponent(repo)}/pulls/${number}/diff`
    ),

  mergePullRequest: (repo: string, number: number) =>
    request<{ sha: string; merged: boolean } | { merged: false; reason: string }>(
      `/repos/${encodeURIComponent(repo)}/pulls/${number}/merge`,
      { method: "PUT" }
    ),

  updatePullRequestBranch: (repo: string, number: number) =>
    request<{ ok: boolean; reason?: string }>(
      `/repos/${encodeURIComponent(repo)}/pulls/${number}/update`,
      { method: "PUT" }
    ),

  rebasePullRequest: (repo: string, number: number) =>
    request<{ ok: boolean }>(
      `/repos/${encodeURIComponent(repo)}/pulls/${number}/rebase`,
      { method: "POST" }
    ),

  listPrComments: (repo: string, number: number) =>
    request<import("@shared/types").PrComment[]>(
      `/repos/${encodeURIComponent(repo)}/pulls/${number}/comments`
    ),

  createPrComment: (repo: string, number: number, body: string) =>
    request<import("@shared/types").PrComment>(
      `/repos/${encodeURIComponent(repo)}/pulls/${number}/comments`,
      { method: "POST", body: JSON.stringify({ body }) }
    ),

  closePullRequest: (repo: string, number: number) =>
    request<{ ok: boolean }>(
      `/repos/${encodeURIComponent(repo)}/pulls/${number}`,
      { method: "DELETE" }
    ),

  // API Tokens
  listTokens: () =>
    request<import("@shared/types").ApiTokenSummary[]>("/tokens"),

  createToken: (data: {
    name: string;
    repos: string[];
    permissions: import("@shared/types").Permission[];
    expiresIn?: number | null;
  }) =>
    request<import("@shared/types").ApiTokenCreated>("/tokens", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  revokeToken: (tokenId: string) =>
    request<{ ok: boolean }>(`/tokens/${tokenId}`, { method: "DELETE" }),
};

export { ApiError };
