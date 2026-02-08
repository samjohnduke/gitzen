import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import type { ApiTokenSummary, ApiTokenCreated, Permission } from "@shared/types";

export function useTokens() {
  const [tokens, setTokens] = useState<ApiTokenSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    api
      .listTokens()
      .then(setTokens)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createToken = useCallback(
    async (data: {
      name: string;
      repos: string[];
      permissions: Permission[];
      expiresIn?: number | null;
    }): Promise<ApiTokenCreated> => {
      const created = await api.createToken(data);
      refresh();
      return created;
    },
    [refresh]
  );

  const revokeToken = useCallback(
    async (tokenId: string) => {
      await api.revokeToken(tokenId);
      refresh();
    },
    [refresh]
  );

  return { tokens, loading, createToken, revokeToken, refresh };
}
