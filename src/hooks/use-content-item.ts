import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { ContentItem } from "@shared/types";

export function useContentItem(
  repo: string | null,
  collection: string | null,
  slug: string | null
) {
  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repo || !collection || !slug) {
      setItem(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setItem(null);

    api
      .getContent(repo, collection, slug)
      .then((data) => {
        if (!cancelled) {
          setItem(data);
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
  }, [repo, collection, slug]);

  return { item, setItem, loading, error };
}
