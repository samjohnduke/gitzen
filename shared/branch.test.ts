import { describe, it, expect } from "vitest";
import { branchName, parseBranchName, previewUrl } from "./branch";

describe("branchName", () => {
  it("creates cms/{collection}/{slug} format", () => {
    expect(branchName("blog", "my-post")).toBe("cms/blog/my-post");
    expect(branchName("notes", "hello-world")).toBe("cms/notes/hello-world");
  });
});

describe("parseBranchName", () => {
  it("parses valid cms branches", () => {
    expect(parseBranchName("cms/blog/my-post")).toEqual({
      collection: "blog",
      slug: "my-post",
    });
    expect(parseBranchName("cms/notes/hello-world")).toEqual({
      collection: "notes",
      slug: "hello-world",
    });
  });

  it("handles slugs with extra slashes", () => {
    expect(parseBranchName("cms/blog/sub/path")).toEqual({
      collection: "blog",
      slug: "sub/path",
    });
  });

  it("returns null for non-cms branches", () => {
    expect(parseBranchName("main")).toBeNull();
    expect(parseBranchName("feature/something")).toBeNull();
    expect(parseBranchName("cms/")).toBeNull();
    expect(parseBranchName("cms/blog")).toBeNull();
  });
});

describe("previewUrl", () => {
  it("sanitizes branch name for Cloudflare Pages URL", () => {
    expect(previewUrl("cms/blog/my-post", "samduke-blog")).toBe(
      "https://cms-blog-my-post.samduke-blog.pages.dev"
    );
  });

  it("lowercases the branch name", () => {
    expect(previewUrl("cms/Blog/My-Post", "my-project")).toBe(
      "https://cms-blog-my-post.my-project.pages.dev"
    );
  });
});
