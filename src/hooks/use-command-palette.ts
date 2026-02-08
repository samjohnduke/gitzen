import { useState, useEffect, useCallback } from "react";

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  action: () => void;
  keywords?: string[];
}

export function useCommandPalette(commands: CommandItem[]) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    globalThis.addEventListener?.("keydown", handler);
    return () => globalThis.removeEventListener?.("keydown", handler);
  }, [open]);

  const filtered = commands.filter((cmd) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.description?.toLowerCase().includes(q) ||
      cmd.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  });

  const execute = useCallback(
    (cmd: CommandItem) => {
      cmd.action();
      setOpen(false);
      setQuery("");
    },
    []
  );

  return { open, setOpen, query, setQuery, filtered, execute };
}
