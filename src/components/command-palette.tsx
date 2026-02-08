import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { api } from "../api/client";
import { useTheme } from "../hooks/use-theme";
import type { CmsConfig, RepoConnection } from "@shared/types";

export function CommandPalette() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [repos, setRepos] = useState<RepoConnection[]>([]);
  const [configs, setConfigs] = useState<Record<string, CmsConfig>>({});

  // Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setSelectedIndex(0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Load data when opened
  useEffect(() => {
    if (!open) return;
    api.getRepos().then(async (repoList) => {
      setRepos(repoList);
      const cfgs: Record<string, CmsConfig> = {};
      for (const r of repoList) {
        try {
          cfgs[r.fullName] = await api.getConfig(r.fullName);
        } catch { /* skip */ }
      }
      setConfigs(cfgs);
    });
  }, [open]);

  // Build command list
  const commands = useMemo(() => {
    const cmds: Array<{
      id: string;
      label: string;
      description: string;
      action: () => void;
    }> = [];

    for (const repo of repos) {
      const config = configs[repo.fullName];
      if (!config) continue;

      for (const [key, col] of Object.entries(config.collections)) {
        cmds.push({
          id: `${repo.fullName}/${key}`,
          label: col.label,
          description: repo.fullName.split("/")[1] ?? repo.fullName,
          action: () => {
            navigate(`/${encodeURIComponent(repo.fullName)}/${key}`);
            setOpen(false);
          },
        });
        cmds.push({
          id: `${repo.fullName}/${key}/new`,
          label: `New ${col.label.replace(/s$/, "")}`,
          description: repo.fullName.split("/")[1] ?? repo.fullName,
          action: () => {
            navigate(`/${encodeURIComponent(repo.fullName)}/${key}/new`);
            setOpen(false);
          },
        });
      }
    }

    // Theme commands
    const themeLabel = (t: string) =>
      t === theme ? `${t.charAt(0).toUpperCase() + t.slice(1)} (current)` : t.charAt(0).toUpperCase() + t.slice(1);

    cmds.push({
      id: "theme-light",
      label: `Theme: ${themeLabel("light")}`,
      description: "Appearance",
      action: () => { setTheme("light"); setOpen(false); },
    });
    cmds.push({
      id: "theme-dark",
      label: `Theme: ${themeLabel("dark")}`,
      description: "Appearance",
      action: () => { setTheme("dark"); setOpen(false); },
    });
    cmds.push({
      id: "theme-system",
      label: `Theme: ${themeLabel("system")}`,
      description: "Appearance",
      action: () => { setTheme("system"); setOpen(false); },
    });

    return cmds;
  }, [repos, configs, navigate, theme, setTheme]);

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.4)",
            zIndex: 100,
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 520,
            background: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
            zIndex: 101,
          }}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search for commands and navigate the CMS
          </Dialog.Description>

          {/* Search input */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border)",
          }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands..."
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 15,
                padding: 0,
              }}
            />
          </div>

          {/* Results */}
          <div style={{ maxHeight: 320, overflow: "auto", padding: 4 }}>
            {filtered.length === 0 && (
              <p style={{
                padding: "20px 16px",
                color: "var(--color-text-muted)",
                textAlign: "center",
                fontSize: 13,
              }}>
                No results
              </p>
            )}
            {filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => cmd.action()}
                onMouseEnter={() => setSelectedIndex(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 14,
                  background: i === selectedIndex ? "var(--color-accent-subtle)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontWeight: 500 }}>{cmd.label}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {cmd.description}
                </span>
              </button>
            ))}
          </div>

          {/* Footer hint */}
          <div style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: "var(--color-text-muted)",
          }}>
            <span><kbd style={kbdStyle}>&uarr;&darr;</kbd> navigate</span>
            <span><kbd style={kbdStyle}>&crarr;</kbd> select</span>
            <span><kbd style={kbdStyle}>esc</kbd> close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const kbdStyle: React.CSSProperties = {
  padding: "1px 4px",
  background: "var(--color-bg-muted)",
  borderRadius: 3,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
};
