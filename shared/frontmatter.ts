import * as yaml from "js-yaml";

export interface ParsedContent {
  frontmatter: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(raw: string): ParsedContent {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: raw };
  }
  const frontmatter = (yaml.load(match[1]) as Record<string, unknown>) ?? {};
  const body = match[2];
  return { frontmatter, body };
}

export function serializeFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string
): string {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  }

  const yamlStr = yaml.dump(cleaned, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
    sortKeys: false,
  });

  const trimmedBody = body.trimStart();
  return `---\n${yamlStr}---\n${trimmedBody ? "\n" + trimmedBody : ""}\n`;
}
