import * as Sentry from "@sentry/react";

function FallbackComponent({ resetError }: { resetError: () => void }) {
  return (
    <div style={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 12,
      color: "var(--color-text-muted)",
    }}>
      <p style={{ fontSize: 16 }}>Something went wrong.</p>
      <button
        onClick={resetError}
        style={{
          padding: "8px 16px",
          background: "var(--color-bg-subtle)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          color: "var(--color-text)",
          fontSize: 14,
        }}
      >
        Try again
      </button>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <FallbackComponent resetError={resetError} />}>
      {children}
    </Sentry.ErrorBoundary>
  );
}
