import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { useAuth } from "./hooks/use-auth";
import { useThemeState, ThemeContext } from "./hooks/use-theme";
import { ErrorBoundary } from "./components/error-boundary";
import { Layout } from "./components/layout";
import { LoginPage } from "./components/login-page";
import { ContentList } from "./components/content-list";
import { ContentEditor } from "./components/content-editor";
import { TokenManager } from "./components/token-manager";
import { ReviewsList } from "./components/reviews-list";
import { ReviewDetail } from "./components/review-detail";

export function App() {
  const { authenticated, loading, username, logout } = useAuth();
  const themeState = useThemeState();

  if (loading) {
    return (
      <div style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text-muted)",
      }}>
        Loading...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <ThemeContext.Provider value={themeState}>
        <LoginPage />
      </ThemeContext.Provider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeContext.Provider value={themeState}>
        <BrowserRouter basename="/app">
          <Routes>
            <Route element={<Layout username={username} onLogout={logout} />}>
              <Route path="/" element={<EmptyState />} />
              <Route path="/settings/tokens" element={<TokenManager />} />
              <Route path="/:repo/reviews" element={<ReviewsList />} />
              <Route path="/:repo/reviews/:number" element={<ReviewDetail />} />
              <Route
                path="/:repo/:collection"
                element={<ContentList />}
              />
              <Route
                path="/:repo/:collection/new"
                element={<ContentEditor isNew />}
              />
              <Route
                path="/:repo/:collection/:slug"
                element={<ContentEditor />}
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeContext.Provider>
    </ErrorBoundary>
  );
}

function EmptyState() {
  return (
    <div style={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 8,
      color: "var(--color-text-muted)",
    }}>
      <p style={{ fontSize: 16 }}>Select a collection from the sidebar</p>
      <p style={{ fontSize: 13 }}>or press <kbd style={{
        padding: "2px 6px",
        background: "var(--color-bg-subtle)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--color-border)",
        fontSize: 12,
        fontFamily: "var(--font-mono)",
      }}>⌘K</kbd> to search</p>
    </div>
  );
}
