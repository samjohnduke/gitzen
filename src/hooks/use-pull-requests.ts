import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import type { PullRequestSummary, PullRequestDetail, ContentDiff } from "@shared/types";

export function usePullRequests(repo: string | null) {
  const [prs, setPrs] = useState<PullRequestSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!repo) {
      setPrs([]);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .listPullRequests(repo)
      .then((data) => {
        setPrs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [repo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { prs, loading, error, refresh: fetch };
}

export function usePullRequest(repo: string | null, number: number | null) {
  const [pr, setPr] = useState<PullRequestDetail | null>(null);
  const [diff, setDiff] = useState<ContentDiff[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!repo || !number) {
      setPr(null);
      setDiff(null);
      return;
    }
    setLoading(true);
    setError(null);

    Promise.all([
      api.getPullRequest(repo, number),
      api.getPullRequestDiff(repo, number),
    ])
      .then(([prData, diffData]) => {
        setPr(prData);
        setDiff(diffData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [repo, number]);

  useEffect(() => { fetch(); }, [fetch]);

  return { pr, diff, loading, error, refresh: fetch };
}
