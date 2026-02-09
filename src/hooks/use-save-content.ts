import { useState, useCallback } from "react";
import { api, ApiError } from "../api/client";

interface SaveState {
  saving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

export function useSaveContent() {
  const [state, setState] = useState<SaveState>({
    saving: false,
    lastSaved: null,
    error: null,
  });

  const save = useCallback(
    async (
      repo: string,
      collection: string,
      slug: string,
      data: {
        frontmatter: Record<string, unknown>;
        body: string;
        sha?: string;
        mode?: "direct" | "branch";
      }
    ): Promise<{ sha: string; path: string; branch?: string } | null> => {
      setState((s) => ({ ...s, saving: true, error: null }));
      try {
        const result = await api.saveContent(repo, collection, slug, data);
        setState({ saving: false, lastSaved: new Date(), error: null });
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to save";
        setState((s) => ({ ...s, saving: false, error: message }));
        return null;
      }
    },
    []
  );

  return { ...state, save };
}
