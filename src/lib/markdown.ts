import { Extension } from "@tiptap/core";
import { PluginKey, Plugin } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";
import { marked } from "marked";
import TurndownService from "turndown";

// --- Markdown <-> HTML conversion using proper libraries ---

// Configure marked for GFM-style markdown
marked.setOptions({
  gfm: true,
  breaks: false,
});

// Configure turndown for clean markdown output
const turndown = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
});

// Preserve code block language classes
turndown.addRule("fencedCodeBlock", {
  filter: (node) => {
    return (
      node.nodeName === "PRE" &&
      node.firstChild !== null &&
      node.firstChild.nodeName === "CODE"
    );
  },
  replacement: (_, node) => {
    const codeEl = node.firstChild as HTMLElement;
    const langMatch = codeEl.className?.match(/language-(\w+)/);
    const lang = langMatch ? langMatch[1] : "";
    const code = codeEl.textContent ?? "";
    return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
  },
});

export function markdownToHtml(md: string): string {
  if (!md || !md.trim()) return "<p></p>";
  const html = marked.parse(md, { async: false }) as string;
  return html || "<p></p>";
}

export function htmlToMarkdown(html: string): string {
  if (!html || html === "<p></p>") return "";
  const md = turndown.turndown(html);
  return md;
}

// --- Slash commands ---

interface SlashCommandItem {
  label: string;
  description: string;
  icon: string;
  command: (editor: Editor) => void;
}

export const slashCommands: SlashCommandItem[] = [
  {
    label: "Heading 1",
    description: "Large heading",
    icon: "H1",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: "Heading 2",
    description: "Medium heading",
    icon: "H2",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Heading 3",
    description: "Small heading",
    icon: "H3",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: "Bullet List",
    description: "Unordered list",
    icon: "•",
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Numbered List",
    description: "Ordered list",
    icon: "1.",
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Quote",
    description: "Block quote",
    icon: '"',
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    label: "Code Block",
    description: "Code snippet",
    icon: "<>",
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: "Horizontal Rule",
    description: "Divider line",
    icon: "—",
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
];

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("slashCommands"),
        props: {
          handleKeyDown(view, event) {
            if (event.key !== "/") return false;

            const { state } = view;
            const { $from } = state.selection;

            // Only trigger at start of a block
            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
            if (textBefore !== "") return false;

            const domEvent = new CustomEvent("slash-command", {
              detail: { pos: $from.pos },
              bubbles: true,
            });
            view.dom.dispatchEvent(domEvent);

            return false;
          },
        },
      }),
    ];
  },
});
