import { useParams, useNavigate } from "react-router";
import { usePullRequests } from "../hooks/use-pull-requests";

export function ReviewsList() {
  const params = useParams();
  const navigate = useNavigate();
  const repo = params.repo ? decodeURIComponent(params.repo) : null;

  const { prs, loading, error } = usePullRequests(repo);

  return (
    <div style={{ padding: "32px 40px", width: "100%" }}>
      <h1 style={{
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        marginBottom: 24,
      }}>
        Reviews
      </h1>

      {loading && (
        <p style={{ color: "var(--color-text-muted)", padding: "40px 0", textAlign: "center" }}>
          Loading reviews...
        </p>
      )}

      {error && (
        <p style={{ color: "var(--color-danger)", padding: "20px 0" }}>
          {error}
        </p>
      )}

      {!loading && !error && prs.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "60px 0",
          color: "var(--color-text-muted)",
        }}>
          <p>No open pull requests</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            Save content as a draft to create a pull request
          </p>
        </div>
      )}

      {!loading && prs.length > 0 && (
        <div style={{
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          overflowX: "auto",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th style={thStyle}>Title</th>
                <th style={{ ...thStyle, width: 120 }}>Collection</th>
                <th style={{ ...thStyle, width: 100 }}>Author</th>
                <th style={{ ...thStyle, width: 100 }}>Preview</th>
                <th style={{ ...thStyle, width: 120 }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {prs.map((pr) => (
                <tr
                  key={pr.number}
                  onClick={() => navigate(`/${encodeURIComponent(repo!)}/reviews/${pr.number}`)}
                  style={{
                    borderBottom: "1px solid var(--color-border-subtle)",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-subtle)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 500 }}>{pr.title}</span>
                      <span style={{
                        fontSize: 11,
                        color: "var(--color-text-muted)",
                        fontFamily: "var(--font-mono)",
                      }}>
                        #{pr.number}
                      </span>
                    </div>
                    <span style={{
                      display: "block",
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      marginTop: 2,
                      fontFamily: "var(--font-mono)",
                    }}>
                      {pr.branch}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: "var(--color-bg-muted)",
                      fontSize: 11,
                      fontWeight: 500,
                    }}>
                      {pr.collection}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: "var(--color-text-secondary)", fontSize: 13 }}>
                    {pr.author}
                  </td>
                  <td style={tdStyle}>
                    {pr.previewUrl ? (
                      <a
                        href={pr.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: 12,
                          color: "var(--color-accent)",
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        Preview
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 1h6v6M9 1L1 9" />
                        </svg>
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>—</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--color-text-secondary)", fontSize: 13 }}>
                    {formatDate(pr.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 16px",
  fontSize: 12,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--color-text-muted)",
  background: "var(--color-bg-subtle)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 14,
};
