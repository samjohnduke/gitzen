export interface TocEntry {
  id: string;
  text: string;
  depth: number;
}

export interface DocModule {
  html: string;
  meta: { title: string; description?: string; order?: number };
  toc: TocEntry[];
}

export interface NavItem {
  title: string;
  slug?: string;
  children?: { title: string; slug: string }[];
}

export const docsNav: NavItem[] = [
  { title: "Getting Started", slug: "getting-started" },
  { title: "Configuration", slug: "configuration" },
  { title: "Content Workflow", slug: "workflow" },
  { title: "Authentication", slug: "authentication" },
  { title: "API Reference", slug: "api-reference" },
  { title: "Self-Hosting", slug: "self-hosting" },
];

/** Flat list of all doc slugs in order, for prev/next navigation. */
export function getFlatSlugs(): { title: string; slug: string }[] {
  const result: { title: string; slug: string }[] = [];
  for (const item of docsNav) {
    if (item.slug) {
      result.push({ title: item.title, slug: item.slug });
    }
    if (item.children) {
      for (const child of item.children) {
        result.push({ title: child.title, slug: child.slug });
      }
    }
  }
  return result;
}
