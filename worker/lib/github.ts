import type { RequestLogger } from "./logger.js";

const GITHUB_API = "https://api.github.com";

/** Encode each segment of a file path for use in GitHub API URLs. */
export function encodePath(filePath: string): string {
  return filePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

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
  private logger?: RequestLogger;

  constructor(token: string, logger?: RequestLogger) {
    this.token = token;
    this.logger = logger;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const start = Date.now();
    const method = (options.method ?? "GET").toUpperCase();

    const res = await fetch(`${GITHUB_API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "samduke-cms",
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });

    if (this.logger) {
      this.logger.info("github_api", {
        github_method: method,
        github_path: path,
        github_status: res.status,
        github_duration_ms: Date.now() - start,
        github_ratelimit_remaining: res.headers.get("x-ratelimit-remaining"),
      });
    }

    if (!res.ok) {
      const body = await res.text();
      throw new GitHubApiError(res.status, body, path);
    }

    return res.json() as Promise<T>;
  }

  async getFile(
    repo: string,
    path: string,
    branch?: string
  ): Promise<{ content: string; sha: string }> {
    const ref = branch ? `?ref=${encodeURIComponent(branch)}` : "";
    const data = await this.request<GitHubFileResponse>(
      `/repos/${repo}/contents/${encodePath(path)}${ref}`
    );
    const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
    return { content, sha: data.sha };
  }

  async listDirectory(
    repo: string,
    path: string,
    branch?: string
  ): Promise<GitHubDirectoryItem[]> {
    const ref = branch ? `?ref=${encodeURIComponent(branch)}` : "";
    return this.request<GitHubDirectoryItem[]>(
      `/repos/${repo}/contents/${encodePath(path)}${ref}`
    );
  }

  async putFile(
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string,
    branch?: string
  ): Promise<{ sha: string }> {
    const body: Record<string, unknown> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
    };
    if (sha) body.sha = sha;
    if (branch) body.branch = branch;

    const data = await this.request<{ content: { sha: string } }>(
      `/repos/${repo}/contents/${encodePath(path)}`,
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
    sha: string,
    branch?: string
  ): Promise<void> {
    const body: Record<string, unknown> = { message, sha };
    if (branch) body.branch = branch;
    await this.request(`/repos/${repo}/contents/${encodePath(path)}`, {
      method: "DELETE",
      body: JSON.stringify(body),
    });
  }

  // --- Branch operations ---

  async getBranchSha(
    repo: string,
    branch: string
  ): Promise<string | null> {
    try {
      const data = await this.request<{ object: { sha: string } }>(
        `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`
      );
      return data.object.sha;
    } catch (e) {
      if (e instanceof GitHubApiError && e.status === 404) return null;
      throw e;
    }
  }

  async getDefaultBranch(repo: string): Promise<string> {
    const data = await this.request<{ default_branch: string }>(
      `/repos/${repo}`
    );
    return data.default_branch;
  }

  async createBranch(
    repo: string,
    branch: string,
    fromSha: string
  ): Promise<void> {
    await this.request(`/repos/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: fromSha,
      }),
    });
  }

  async deleteBranch(repo: string, branch: string): Promise<void> {
    await this.request(
      `/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
      { method: "DELETE" }
    );
  }

  // --- Pull Request operations ---

  async createPullRequest(
    repo: string,
    title: string,
    head: string,
    base: string,
    body: string
  ): Promise<{ number: number; html_url: string }> {
    return this.request(`/repos/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({ title, head, base, body }),
    });
  }

  async listPullRequests(
    repo: string,
    state: "open" | "closed" | "all" = "open"
  ): Promise<
    Array<{
      number: number;
      title: string;
      state: "open" | "closed";
      merged_at: string | null;
      head: { ref: string; sha: string };
      base: { ref: string; sha: string };
      created_at: string;
      updated_at: string;
      body: string;
      html_url: string;
      mergeable: boolean | null;
      user: { login: string };
    }>
  > {
    return this.request(
      `/repos/${repo}/pulls?state=${state}&per_page=100`
    );
  }

  async getPullRequest(
    repo: string,
    number: number
  ): Promise<{
    number: number;
    title: string;
    state: "open" | "closed";
    merged_at: string | null;
    head: { ref: string; sha: string };
    base: { ref: string; sha: string };
    created_at: string;
    updated_at: string;
    body: string;
    html_url: string;
    mergeable: boolean | null;
    user: { login: string };
  }> {
    return this.request(`/repos/${repo}/pulls/${number}`);
  }

  async mergePullRequest(
    repo: string,
    number: number,
    commitTitle: string,
    commitMessage: string
  ): Promise<{ sha: string; merged: boolean }> {
    return this.request(`/repos/${repo}/pulls/${number}/merge`, {
      method: "PUT",
      body: JSON.stringify({
        commit_title: commitTitle,
        commit_message: commitMessage,
        merge_method: "squash",
      }),
    });
  }

  async updatePullRequestBranch(
    repo: string,
    number: number
  ): Promise<void> {
    await this.request(
      `/repos/${repo}/pulls/${number}/update-branch`,
      { method: "PUT", body: JSON.stringify({}) }
    );
  }

  async closePullRequest(repo: string, number: number): Promise<void> {
    await this.request(`/repos/${repo}/pulls/${number}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed" }),
    });
  }

  async compareCommits(
    repo: string,
    base: string,
    head: string
  ): Promise<{
    files: Array<{
      filename: string;
      status: "added" | "modified" | "removed" | "renamed";
    }>;
  }> {
    return this.request(
      `/repos/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`
    );
  }

  // --- Issue/PR comment operations ---

  async listIssueComments(
    repo: string,
    issueNumber: number
  ): Promise<
    Array<{
      id: number;
      body: string;
      user: { login: string; avatar_url: string };
      created_at: string;
    }>
  > {
    return this.request(
      `/repos/${repo}/issues/${issueNumber}/comments?per_page=100`
    );
  }

  async createIssueComment(
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<{
    id: number;
    body: string;
    user: { login: string; avatar_url: string };
    created_at: string;
  }> {
    return this.request(`/repos/${repo}/issues/${issueNumber}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
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
    super(`GitHub API error ${status}`);
    this.status = status;
    this.body = body;
    this.path = path;
  }
}
