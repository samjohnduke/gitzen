import { createHighlighter, type Highlighter } from "shiki";
import { Marked } from "marked";
import yaml from "js-yaml";
import type { Plugin } from "vite";

interface TocEntry {
  id: string;
  text: string;
  depth: number;
}

export default function markdownPlugin(): Plugin {
  let highlighter: Highlighter | null = null;

  return {
    name: "vite-plugin-markdown",
    enforce: "pre",

    async buildStart() {
      if (!highlighter) {
        highlighter = await createHighlighter({
          themes: ["github-light", "tokyo-night"],
          langs: [
            "javascript",
            "typescript",
            "bash",
            "json",
            "yaml",
            "html",
            "css",
            "ruby",
            "go",
            "markdown",
          ],
        });
      }
    },

    async transform(src: string, id: string) {
      if (!id.endsWith(".md")) return null;

      // Parse frontmatter
      const fmMatch = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      let meta: Record<string, unknown> = {};
      let content = src;

      if (fmMatch) {
        meta = yaml.load(fmMatch[1]) as Record<string, unknown>;
        content = fmMatch[2];
      }

      // Collect ToC entries
      const toc: TocEntry[] = [];

      // Create a marked instance with custom renderer
      const marked = new Marked();

      if (!highlighter) {
        highlighter = await createHighlighter({
          themes: ["github-light", "tokyo-night"],
          langs: [
            "javascript",
            "typescript",
            "bash",
            "json",
            "yaml",
            "html",
            "css",
            "ruby",
            "go",
            "markdown",
          ],
        });
      }
      const hl = highlighter;

      marked.use({
        renderer: {
          heading({ tokens, depth }: { tokens: { raw: string }[]; depth: number }) {
            const text = tokens.map((t) => t.raw).join("");
            const id = text
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-");
            if (depth === 2 || depth === 3) {
              toc.push({ id, text, depth });
            }
            return `<h${depth} id="${id}">${text}</h${depth}>`;
          },
          code({ text, lang }: { text: string; lang?: string }) {
            const language = lang || "text";
            try {
              const loadedLangs = hl.getLoadedLanguages();
              if (loadedLangs.includes(language as never)) {
                const highlighted = hl.codeToHtml(text, {
                  lang: language,
                  themes: { light: "github-light", dark: "tokyo-night" },
                });
                return highlighted;
              }
            } catch {
              // Fall through to plain rendering
            }
            const escaped = text
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            return `<pre><code class="language-${language}">${escaped}</code></pre>`;
          },
        },
      });

      const html = await marked.parse(content);

      const code = `
export const html = ${JSON.stringify(html)};
export const meta = ${JSON.stringify(meta)};
export const toc = ${JSON.stringify(toc)};
export default { html, meta, toc };
`;
      return { code, map: null };
    },
  };
}
