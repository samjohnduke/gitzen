import { describe, it, expect } from "vitest";
import { isValidSlug, isValidCollection } from "./content";

describe("isValidSlug", () => {
  it("accepts simple alphanumeric slugs", () => {
    expect(isValidSlug("hello")).toBe(true);
    expect(isValidSlug("my-post")).toBe(true);
    expect(isValidSlug("post123")).toBe(true);
    expect(isValidSlug("a")).toBe(true);
  });

  it("accepts slugs with dots, underscores, hyphens", () => {
    expect(isValidSlug("my.post")).toBe(true);
    expect(isValidSlug("my_post")).toBe(true);
    expect(isValidSlug("my-post")).toBe(true);
    expect(isValidSlug("2024-01-01.draft")).toBe(true);
  });

  it("rejects path traversal attempts", () => {
    expect(isValidSlug("..")).toBe(false);
    expect(isValidSlug("../etc/passwd")).toBe(false);
    expect(isValidSlug("foo/../bar")).toBe(false);
  });

  it("rejects leading dots", () => {
    expect(isValidSlug(".hidden")).toBe(false);
    expect(isValidSlug(".env")).toBe(false);
    expect(isValidSlug("..secret")).toBe(false);
  });

  it("rejects slashes", () => {
    expect(isValidSlug("foo/bar")).toBe(false);
    expect(isValidSlug("foo\\bar")).toBe(false);
    expect(isValidSlug("/etc/passwd")).toBe(false);
  });

  it("rejects null bytes and special characters", () => {
    expect(isValidSlug("foo\x00bar")).toBe(false);
    expect(isValidSlug("foo bar")).toBe(false);
    expect(isValidSlug("<script>")).toBe(false);
    expect(isValidSlug("foo&bar")).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(isValidSlug("")).toBe(false);
  });

  it("rejects slugs exceeding 200 characters", () => {
    expect(isValidSlug("a".repeat(200))).toBe(true);
    expect(isValidSlug("a".repeat(201))).toBe(false);
  });

  it("rejects leading hyphens and underscores", () => {
    expect(isValidSlug("-leading")).toBe(false);
    expect(isValidSlug("_leading")).toBe(false);
  });
});

describe("isValidCollection", () => {
  it("accepts simple collection names", () => {
    expect(isValidCollection("posts")).toBe(true);
    expect(isValidCollection("blog")).toBe(true);
    expect(isValidCollection("pages123")).toBe(true);
  });

  it("accepts names with dots, underscores, hyphens", () => {
    expect(isValidCollection("my-collection")).toBe(true);
    expect(isValidCollection("my_collection")).toBe(true);
    expect(isValidCollection("my.collection")).toBe(true);
  });

  it("rejects path traversal attempts", () => {
    expect(isValidCollection("..")).toBe(false);
    expect(isValidCollection("../etc")).toBe(false);
    expect(isValidCollection("foo/../bar")).toBe(false);
  });

  it("rejects leading dots", () => {
    expect(isValidCollection(".hidden")).toBe(false);
    expect(isValidCollection(".git")).toBe(false);
  });

  it("rejects slashes", () => {
    expect(isValidCollection("foo/bar")).toBe(false);
    expect(isValidCollection("foo\\bar")).toBe(false);
  });

  it("rejects null bytes and special characters", () => {
    expect(isValidCollection("foo\x00bar")).toBe(false);
    expect(isValidCollection("foo bar")).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(isValidCollection("")).toBe(false);
  });

  it("rejects names exceeding 100 characters", () => {
    expect(isValidCollection("a".repeat(100))).toBe(true);
    expect(isValidCollection("a".repeat(101))).toBe(false);
  });
});
