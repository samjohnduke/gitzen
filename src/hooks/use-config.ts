import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { CmsConfig } from "@shared/types";

export function useConfig(repo: string | null) {
  const [config, setConfig] = useState<CmsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repo) {
      setConfig(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getConfig(repo)
      .then((data) => {
        if (!cancelled) {
          setConfig(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [repo]);

  return { config, loading, error };
}
