import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import * as Popover from "@radix-ui/react-popover";
import { useEffect, useRef, useState, useCallback } from "react";
import { SlashCommands, slashCommands, markdownToHtml, htmlToMarkdown } from "../lib/markdown";

interface TiptapEditorProps {
  content: string;
  onChange: (markdown: string) => void;
}

export function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const lastEditorOutputRef = useRef<string>(content);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Placeholder.configure({
        placeholder: "Start writing... (type / for commands)",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "tiptap-link",
        },
      }),
      SlashCommands,
    ],
    content: markdownToHtml(content),
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const md = htmlToMarkdown(editor.getHTML());
        lastEditorOutputRef.current = md;
        onChangeRef.current(md);
      }, 150);
    },
    editorProps: {
      attributes: {
        class: "tiptap-content",
        style: [
          "outline: none",
          "font-family: var(--font-sans)",
          "font-size: 17px",
          "line-height: 1.75",
          "color: var(--color-text)",
          "min-height: 400px",
          "padding: 0",
        ].join(";"),
      },
    },
  });

  // Word count
  const wordCount = editor
    ? editor.state.doc.textContent
        .split(/\s+/)
        .filter((w) => w.length > 0).length
    : 0;

  // --- Link editing ---
  const openLinkPopover = useCallback(() => {
    if (!editor) return;
    const existing = editor.getAttributes("link").href ?? "";
    setLinkUrl(existing);
    setLinkPopoverOpen(true);
    setTimeout(() => linkInputRef.current?.focus(), 50);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl.trim()) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl.trim() })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setLinkPopoverOpen(false);
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkPopoverOpen(false);
  }, [editor]);

  // Cmd+K for links (when not in slash menu)
  useEffect(() => {
    if (!editor) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && !e.shiftKey) {
        // Only intercept if editor is focused and there's a selection
        if (editor.isFocused && !editor.state.selection.empty) {
          e.preventDefault();
          e.stopPropagation();
          openLinkPopover();
        }
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [editor, openLinkPopover]);

  // --- Slash commands ---
  useEffect(() => {
    const el = editorRef.current;
    if (!el || !editor) return;

    const handler = ((e: CustomEvent) => {
      const { pos } = e.detail;
      const coords = editor.view.coordsAtPos(pos);
      const rect = el.getBoundingClientRect();
      if (anchorRef.current) {
        anchorRef.current.style.top = `${coords.bottom - rect.top}px`;
        anchorRef.current.style.left = `${coords.left - rect.left}px`;
      }
      setSlashMenuOpen(true);
      setSlashQuery("");
      setSelectedIndex(0);
    }) as EventListener;

    el.addEventListener("slash-command", handler);
    return () => el.removeEventListener("slash-command", handler);
  }, [editor]);

  useEffect(() => {
    if (!editor || !slashMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      const el = editorRef.current;
      if (el && !el.contains(e.target as Node)) {
        setSlashMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editor, slashMenuOpen]);

  const filteredCommands = slashCommands.filter((cmd) =>
    !slashQuery || cmd.label.toLowerCase().includes(slashQuery.toLowerCase())
  );

  const executeSlashCommand = useCallback(
    (cmd: (typeof slashCommands)[number]) => {
      if (!editor) return;
      const { state } = editor.view;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const slashIdx = textBefore.lastIndexOf("/");
      if (slashIdx >= 0) {
        const from = $from.start() + slashIdx;
        const to = $from.pos;
        editor.view.dispatch(state.tr.delete(from, to));
      }
      cmd.command(editor);
      setSlashMenuOpen(false);
    },
    [editor]
  );

  useEffect(() => {
    if (!slashMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setSlashMenuOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => (i + 1) % filteredCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (filteredCommands[selectedIndex]) {
          executeSlashCommand(filteredCommands[selectedIndex]);
        }
        return;
      }
      if (e.key === "Backspace") {
        setTimeout(() => {
          if (!editor) return;
          const { state } = editor.view;
          const { $from } = state.selection;
          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
          if (!textBefore.includes("/")) {
            setSlashMenuOpen(false);
          } else {
            setSlashQuery(textBefore.slice(textBefore.lastIndexOf("/") + 1));
            setSelectedIndex(0);
          }
        }, 0);
        return;
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        setTimeout(() => {
          if (!editor) return;
          const { state } = editor.view;
          const { $from } = state.selection;
          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
          const slashIdx = textBefore.lastIndexOf("/");
          if (slashIdx >= 0) {
            setSlashQuery(textBefore.slice(slashIdx + 1));
            setSelectedIndex(0);
          }
        }, 0);
        return;
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [slashMenuOpen, filteredCommands, selectedIndex, editor, executeSlashCommand]);

  // --- Content sync ---
  useEffect(() => {
    if (!editor) return;
    if (content === lastEditorOutputRef.current) return;
    lastEditorOutputRef.current = content;
    editor.commands.setContent(markdownToHtml(content));
  }, [content, editor]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Popover.Root open={slashMenuOpen && filteredCommands.length > 0} onOpenChange={setSlashMenuOpen}>
        <div ref={editorRef} style={{ position: "relative", flex: 1 }}>
          <style>{tiptapStyles}</style>
          <EditorContent editor={editor} />

          {/* Bubble menu (floating toolbar on selection) */}
          {editor && (
            <BubbleMenu
              editor={editor}
              tippyOptions={{
                duration: 100,
                placement: "top",
              }}
            >
              <div style={{
                display: "flex",
                gap: 1,
                padding: 3,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)",
              }}>
                <BubbleButton
                  active={editor.isActive("bold")}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  title="Bold (⌘B)"
                >
                  <strong>B</strong>
                </BubbleButton>
                <BubbleButton
                  active={editor.isActive("italic")}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  title="Italic (⌘I)"
                >
                  <em>I</em>
                </BubbleButton>
                <BubbleButton
                  active={editor.isActive("code")}
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  title="Code (⌘E)"
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>&lt;/&gt;</span>
                </BubbleButton>
                <BubbleButton
                  active={editor.isActive("strike")}
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  title="Strikethrough (⌘⇧X)"
                >
                  <s>S</s>
                </BubbleButton>
                <div style={{ width: 1, background: "var(--color-border)", margin: "4px 2px" }} />
                <BubbleButton
                  active={editor.isActive("link")}
                  onClick={openLinkPopover}
                  title="Link (⌘K)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </BubbleButton>
              </div>
            </BubbleMenu>
          )}

          {/* Link editing popover */}
          {linkPopoverOpen && (
            <div style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
            }}
              onClick={() => setLinkPopoverOpen(false)}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                  padding: 12,
                  width: 340,
                  zIndex: 61,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  marginBottom: 6,
                }}>
                  Link URL
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    ref={linkInputRef}
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); applyLink(); }
                      if (e.key === "Escape") { setLinkPopoverOpen(false); editor?.chain().focus().run(); }
                    }}
                    placeholder="https://..."
                    style={{ flex: 1, fontSize: 13, padding: "6px 10px" }}
                  />
                  <button
                    onClick={applyLink}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                      background: "var(--color-accent)",
                      color: "white",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    Apply
                  </button>
                </div>
                {editor?.isActive("link") && (
                  <button
                    onClick={removeLink}
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "var(--color-danger)",
                    }}
                  >
                    Remove link
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Slash command anchor */}
          <Popover.Anchor asChild>
            <div
              ref={anchorRef}
              style={{ position: "absolute", top: 0, left: 0, width: 1, height: 1, pointerEvents: "none" }}
            />
          </Popover.Anchor>

          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="start"
              sideOffset={4}
              collisionPadding={16}
              avoidCollisions
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)",
                padding: 4,
                minWidth: 220,
                zIndex: 50,
                animationDuration: "0.1s",
              }}
            >
              {filteredCommands.map((cmd, i) => (
                <button
                  key={cmd.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeSlashCommand(cmd);
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13,
                    background: i === selectedIndex ? "var(--color-accent-subtle)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <span style={{
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-text-secondary)",
                    flexShrink: 0,
                  }}>
                    {cmd.icon}
                  </span>
                  <span>
                    <span style={{ fontWeight: 500, display: "block" }}>{cmd.label}</span>
                    <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                      {cmd.description}
                    </span>
                  </span>
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </div>
      </Popover.Root>

      {/* Footer: word count + keyboard shortcuts */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 0",
        borderTop: "1px solid var(--color-border-subtle)",
        marginTop: 16,
        fontSize: 12,
        color: "var(--color-text-muted)",
      }}>
        <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
        <button
          onClick={() => setShowShortcuts((v) => !v)}
          style={{
            fontSize: 12,
            color: "var(--color-text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h12" />
          </svg>
          Shortcuts
        </button>
      </div>

      {/* Keyboard shortcuts panel */}
      {showShortcuts && (
        <div style={{
          padding: "12px 16px",
          background: "var(--color-bg-subtle)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border-subtle)",
          marginTop: 4,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 24px",
          fontSize: 12,
        }}>
          {shortcuts.map(([keys, label]) => (
            <div key={keys} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
              <kbd style={kbdStyle}>{keys}</kbd>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function BubbleButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      style={{
        padding: "4px 8px",
        borderRadius: "var(--radius-sm)",
        fontSize: 13,
        fontWeight: 500,
        background: active ? "var(--color-accent-subtle)" : "transparent",
        color: active ? "var(--color-accent)" : "var(--color-text)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 28,
        height: 28,
      }}
    >
      {children}
    </button>
  );
}

const shortcuts: [string, string][] = [
  ["⌘B", "Bold"],
  ["⌘I", "Italic"],
  ["⌘E", "Code"],
  ["⌘⇧X", "Strikethrough"],
  ["⌘K", "Link (with selection)"],
  ["⌘S", "Save"],
  ["⌘Z", "Undo"],
  ["⌘⇧Z", "Redo"],
  ["/", "Slash commands"],
  ["⌘⌥K", "Command palette"],
];

const kbdStyle: React.CSSProperties = {
  padding: "1px 5px",
  background: "var(--color-bg-muted)",
  borderRadius: 3,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--color-text-muted)",
  whiteSpace: "nowrap",
};

const tiptapStyles = `
.tiptap-content {
  outline: none;
}
.tiptap-content > * + * {
  margin-top: 0.75em;
}
.tiptap-content h1 {
  font-size: 2em;
  font-weight: 600;
  line-height: 1.3;
  margin-top: 1.5em;
}
.tiptap-content h2 {
  font-size: 1.5em;
  font-weight: 600;
  line-height: 1.3;
  margin-top: 1.4em;
}
.tiptap-content h3 {
  font-size: 1.2em;
  font-weight: 600;
  line-height: 1.4;
  margin-top: 1.2em;
}
.tiptap-content h4 {
  font-size: 1em;
  font-weight: 600;
  line-height: 1.4;
  margin-top: 1em;
}
.tiptap-content p {
  margin: 0;
}
.tiptap-content ul, .tiptap-content ol {
  padding-left: 1.5em;
}
.tiptap-content li {
  margin-top: 0.25em;
}
.tiptap-content li p {
  margin: 0;
}
.tiptap-content blockquote {
  border-left: 3px solid var(--color-border);
  padding-left: 1em;
  color: var(--color-text-secondary);
  font-style: italic;
}
.tiptap-content pre {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.875em;
  line-height: 1.6;
}
.tiptap-content code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--color-bg-subtle);
  padding: 2px 5px;
  border-radius: 3px;
}
.tiptap-content pre code {
  background: none;
  padding: 0;
  border-radius: 0;
}
.tiptap-content hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 2em 0;
}
.tiptap-content a,
.tiptap-content .tiptap-link {
  color: var(--color-accent);
  text-decoration: underline;
  cursor: pointer;
}
.tiptap-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--color-text-muted);
  pointer-events: none;
  height: 0;
}
`;
