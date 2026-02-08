import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import type { ContentItem } from "@shared/types";

export function useContentList(repo: string | null, collection: string | null) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repo || !collection) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setItems([]);

    api
      .listContent(repo, collection)
      .then((data) => {
        if (!cancelled) {
          setItems(data);
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
  }, [repo, collection]);

  const refresh = useCallback(() => {
    if (repo && collection) {
      setLoading(true);
      api
        .listContent(repo, collection)
        .then((data) => {
          setItems(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [repo, collection]);

  return { items, loading, error, refresh };
}
