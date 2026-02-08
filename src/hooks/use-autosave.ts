import { useEffect, useRef, useCallback } from "react";

const DRAFT_PREFIX = "cms_draft_";

interface DraftData {
  frontmatter: Record<string, unknown>;
  body: string;
  savedAt: string;
}

export function useAutosave(
  key: string | null,
  frontmatter: Record<string, unknown>,
  body: string,
  onSave: () => void,
  delay: number = 30000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDataRef = useRef<string>("");

  const storageKey = key ? `${DRAFT_PREFIX}${key}` : null;

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (!storageKey) return;
    const data: DraftData = {
      frontmatter,
      body,
      savedAt: new Date().toISOString(),
    };
    const serialized = JSON.stringify(data);
    if (serialized !== lastDataRef.current) {
      localStorage.setItem(storageKey, serialized);
      lastDataRef.current = serialized;
    }
  }, [storageKey, frontmatter, body]);

  // Auto-save on changes
  useEffect(() => {
    if (!storageKey) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveDraft();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [saveDraft, delay, storageKey]);

  // Cmd+S handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveDraft();
        onSave();
      }
    };
    globalThis.addEventListener?.("keydown", handler);
    return () => globalThis.removeEventListener?.("keydown", handler);
  }, [saveDraft, onSave]);

  return { saveDraft };
}

export function loadDraft(key: string): DraftData | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as DraftData;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  localStorage.removeItem(`${DRAFT_PREFIX}${key}`);
}
