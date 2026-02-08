const GITHUB_API = "https://api.github.com";

interface GitHubFileResponse {
  name: string;
  path: string;
  sha: string;
  content: string;
  encoding: string;
}

interface GitHubDirectoryItem {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
}

export class GitHubClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${GITHUB_API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "samduke-cms",
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new GitHubApiError(res.status, body, path);
    }

    return res.json() as Promise<T>;
  }

  async getFile(
    repo: string,
    path: string
  ): Promise<{ content: string; sha: string }> {
    const data = await this.request<GitHubFileResponse>(
      `/repos/${repo}/contents/${path}`
    );
    const content = atob(data.content.replace(/\n/g, ""));
    return { content, sha: data.sha };
  }

  async listDirectory(repo: string, path: string): Promise<GitHubDirectoryItem[]> {
    return this.request<GitHubDirectoryItem[]>(
      `/repos/${repo}/contents/${path}`
    );
  }

  async putFile(
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string
  ): Promise<{ sha: string }> {
    const body: Record<string, unknown> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
    };
    if (sha) {
      body.sha = sha;
    }

    const data = await this.request<{ content: { sha: string } }>(
      `/repos/${repo}/contents/${path}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    );
    return { sha: data.content.sha };
  }

  async deleteFile(
    repo: string,
    path: string,
    message: string,
    sha: string
  ): Promise<void> {
    await this.request(`/repos/${repo}/contents/${path}`, {
      method: "DELETE",
      body: JSON.stringify({ message, sha }),
    });
  }

  async getUser(): Promise<{ login: string; avatar_url: string; name: string }> {
    return this.request("/user");
  }

  async listUserRepos(): Promise<Array<{ full_name: string; private: boolean; description: string | null }>> {
    const repos: Array<{ full_name: string; private: boolean; description: string | null }> = [];
    let page = 1;
    while (true) {
      const batch = await this.request<Array<{ full_name: string; private: boolean; description: string | null }>>(
        `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`
      );
      repos.push(...batch);
      if (batch.length < 100) break;
      page++;
    }
    return repos;
  }
}

export class GitHubApiError extends Error {
  status: number;
  body: string;
  path: string;

  constructor(status: number, body: string, path: string) {
    super(`GitHub API error ${status} on ${path}: ${body}`);
    this.status = status;
    this.body = body;
    this.path = path;
  }
}
