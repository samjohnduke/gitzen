export function LoginPage() {
  return (
    <div style={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-bg)",
    }}>
      <div style={{
        textAlign: "center",
        maxWidth: 360,
        padding: 40,
      }}>
        {/* Enso circle */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 100 100"
          fill="none"
          style={{ marginBottom: 16 }}
        >
          <circle
            cx="50" cy="50" r="38"
            stroke="var(--color-text)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="220 40"
            transform="rotate(-90 50 50)"
          />
        </svg>
        <h1 style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          marginBottom: 8,
          color: "var(--color-text)",
        }}>
          gitzen
        </h1>
        <p style={{
          color: "var(--color-text-secondary)",
          marginBottom: 32,
          fontSize: 15,
          lineHeight: 1.5,
        }}>
          Sign in with GitHub to manage your content.
        </p>
        <a
          href="/auth/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 24px",
            background: "var(--color-accent)",
            color: "#fff",
            borderRadius: "var(--radius-lg)",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Sign in with GitHub
        </a>
      </div>
    </div>
  );
}
