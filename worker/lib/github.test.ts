import { describe, it, expect } from "vitest";
import { encodePath, GitHubApiError } from "./github";

describe("encodePath", () => {
  it("encodes simple paths without modification", () => {
    expect(encodePath("content/posts/hello.md")).toBe("content/posts/hello.md");
  });

  it("encodes spaces in path segments", () => {
    expect(encodePath("content/my posts/hello world.md")).toBe(
      "content/my%20posts/hello%20world.md"
    );
  });

  it("encodes hash characters", () => {
    expect(encodePath("content/posts/c#-guide.md")).toBe(
      "content/posts/c%23-guide.md"
    );
  });

  it("encodes special characters per segment", () => {
    expect(encodePath("dir/file name#1.md")).toBe("dir/file%20name%231.md");
  });

  it("handles single segment paths", () => {
    expect(encodePath("README.md")).toBe("README.md");
  });

  it("preserves forward slash separators", () => {
    const result = encodePath("a/b/c/d");
    expect(result.split("/")).toHaveLength(4);
  });
});

describe("GitHubApiError", () => {
  it("does not include path or body in error message", () => {
    const err = new GitHubApiError(404, '{"message":"Not Found"}', "/repos/owner/repo/contents/secret-file.md");
    expect(err.message).toBe("GitHub API error 404");
    expect(err.message).not.toContain("secret-file");
    expect(err.message).not.toContain("Not Found");
  });

  it("preserves path and body as instance properties for logging", () => {
    const err = new GitHubApiError(500, "body-text", "/some/path");
    expect(err.path).toBe("/some/path");
    expect(err.body).toBe("body-text");
    expect(err.status).toBe(500);
  });
});
