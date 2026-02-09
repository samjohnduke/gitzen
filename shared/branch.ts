const PREFIX = "cms/";

export function branchName(collection: string, slug: string): string {
  return `${PREFIX}${collection}/${slug}`;
}

export function parseBranchName(
  branch: string
): { collection: string; slug: string } | null {
  if (!branch.startsWith(PREFIX)) return null;
  const rest = branch.slice(PREFIX.length);
  const slashIdx = rest.indexOf("/");
  if (slashIdx < 1) return null;
  return {
    collection: rest.slice(0, slashIdx),
    slug: rest.slice(slashIdx + 1),
  };
}

/**
 * Cloudflare Pages preview URL for a branch.
 * Pages sanitizes branch names: slashes → hyphens, lowercased.
 * e.g. "cms/blog/my-post" → "https://cms-blog-my-post.{project}.pages.dev"
 */
export function previewUrl(
  branch: string,
  pagesProject: string
): string {
  const sanitized = branch.replace(/\//g, "-").toLowerCase();
  return `https://${sanitized}.${pagesProject}.pages.dev`;
}
