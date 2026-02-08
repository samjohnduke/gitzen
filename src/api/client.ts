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
    data: { frontmatter: Record<string, unknown>; body: string; sha?: string }
  ) =>
    request<{ sha: string; path: string }>(
      `/repos/${encodeURIComponent(repo)}/content/${collection}/${slug}`,
      { method: "PUT", body: JSON.stringify(data) }
    ),

  deleteContent: (repo: string, collection: string, slug: string, sha: string) =>
    request<{ ok: boolean }>(
      `/repos/${encodeURIComponent(repo)}/content/${collection}/${slug}?sha=${sha}`,
      { method: "DELETE" }
    ),
};

export { ApiError };
