import * as Sentry from "@sentry/react";
import { useState } from "react";

export function DebugSentry() {
  const [sent, setSent] = useState(false);

  const sendTestError = () => {
    Sentry.captureException(new Error("Sentry frontend test error"));
    setSent(true);
  };

  const throwRenderError = () => {
    throw new Error("Sentry render crash test");
  };

  return (
    <div style={{ padding: 32, maxWidth: 480 }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>Sentry Debug</h2>
      <dl style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.8 }}>
        <dt style={{ fontWeight: 600 }}>DSN configured</dt>
        <dd>{import.meta.env.VITE_SENTRY_DSN ? "Yes" : "No"}</dd>
        <dt style={{ fontWeight: 600 }}>Client initialized</dt>
        <dd>{String(!!(window as any).__SENTRY_INITIALIZED__)}</dd>
      </dl>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={sendTestError} style={buttonStyle}>
          {sent ? "Sent!" : "Send test error"}
        </button>
        <button onClick={throwRenderError} style={{ ...buttonStyle, background: "#c53030", color: "#fff" }}>
          Throw render error
        </button>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "8px 16px",
  background: "var(--color-bg-subtle)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  color: "var(--color-text)",
  fontSize: 14,
};
