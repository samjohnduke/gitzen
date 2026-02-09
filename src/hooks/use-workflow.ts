import { useState, useMemo, useCallback } from "react";
import type { CmsConfig } from "@shared/types";
import { previewUrl as buildPreviewUrl } from "@shared/branch";

export function useWorkflow(
  config: CmsConfig | null,
  collection: string | null
) {
  const collectionWorkflow = useMemo(() => {
    if (!config || !collection) return null;
    return config.collections[collection]?.workflow ?? null;
  }, [config, collection]);

  const defaultMode = collectionWorkflow?.default ?? "direct";
  const locked = collectionWorkflow?.locked ?? false;
  const canOverride = !locked;

  const [overrideMode, setOverrideMode] = useState<"direct" | "pr" | null>(
    null
  );

  const mode = locked ? defaultMode : overrideMode ?? defaultMode;

  const setMode = useCallback(
    (m: "direct" | "pr") => {
      if (!locked) setOverrideMode(m);
    },
    [locked]
  );

  const pagesProject = config?.preview?.pagesProject ?? null;

  const previewUrl = useCallback(
    (branch: string): string | null => {
      if (!pagesProject) return null;
      return buildPreviewUrl(branch, pagesProject);
    },
    [pagesProject]
  );

  return { defaultMode, locked, canOverride, mode, setMode, previewUrl };
}
