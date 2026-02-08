import { useState, useEffect } from "react";

interface SaveIndicatorProps {
  saving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

export function SaveIndicator({ saving, lastSaved, error }: SaveIndicatorProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  if (error) {
    return (
      <span style={{ color: "var(--color-danger)", fontSize: 12 }}>
        Error: {error}
      </span>
    );
  }

  if (saving) {
    return (
      <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
        Saving...
      </span>
    );
  }

  if (lastSaved) {
    const diff = Math.floor((now - lastSaved.getTime()) / 1000);
    const label = diff < 10
      ? "just now"
      : diff < 60
        ? `${diff}s ago`
        : diff < 3600
          ? `${Math.floor(diff / 60)}m ago`
          : `${Math.floor(diff / 3600)}h ago`;

    return (
      <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
        Saved {label}
      </span>
    );
  }

  return null;
}
