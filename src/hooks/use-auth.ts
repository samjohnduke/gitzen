import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

interface AuthState {
  authenticated: boolean;
  username?: string;
  loading: boolean;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    authenticated: false,
    loading: true,
  });

  useEffect(() => {
    api
      .getAuthStatus()
      .then((data) =>
        setAuth({ authenticated: data.authenticated, username: data.username, loading: false })
      )
      .catch(() => setAuth({ authenticated: false, loading: false }));
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setAuth({ authenticated: false, loading: false });
  }, []);

  return { ...auth, logout };
}
