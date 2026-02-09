import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useContentList } from "../hooks/use-content-list";
import { useConfig } from "../hooks/use-config";
import { api } from "../api/client";
import type { PullRequestSummary } from "@shared/types";

export function ContentList() {
  const params = useParams();
  const navigate = useNavigate();
  const repo = params.repo ? decodeURIComponent(params.repo) : null;
  const collection = params.collection ?? null;

  const { items, loading, error } = useContentList(repo, collection);
  const { config } = useConfig(repo);
  const [openPrs, setOpenPrs] = useState<PullRequestSummary[]>([]);

  // Fetch open PRs in parallel with content list
  useEffect(() => {
    if (!repo) return;
    api.listPullRequests(repo).then(setOpenPrs).catch(() => {});
  }, [repo]);

  // Map slug → PR for the current collection
  const prBySlug = new Map<string, PullRequestSummary>();
  for (const pr of openPrs) {
    if (pr.collection === collection) {
      prBySlug.set(pr.slug, pr);
    }
  }

  const collectionConfig = config?.collections[collection ?? ""];
  const label = collectionConfig?.label ?? collection ?? "";

  const sortedItems = [...items].sort((a, b) => {
    const dateA = String(a.frontmatter.date ?? "");
    const dateB = String(b.frontmatter.date ?? "");
    return dateB.localeCompare(dateA);
  });

  return (
    <div style={{ padding: "32px 40px", width: "100%" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
      }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}>
          {label}
        </h1>
        <button
          onClick={() => navigate(`/${encodeURIComponent(repo!)}/${collection}/new`)}
          style={{
            padding: "8px 16px",
            background: "var(--color-accent)",
            color: "white",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontWeight: 500,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-accent)")}
        >
          New {collectionConfig?.label?.replace(/s$/, "") ?? "item"}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <p style={{ color: "var(--color-text-muted)", padding: "40px 0", textAlign: "center" }}>
          Loading content...
        </p>
      )}

      {/* Error */}
      {error && (
        <p style={{ color: "var(--color-danger)", padding: "20px 0" }}>
          {error}
        </p>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "60px 0",
          color: "var(--color-text-muted)",
        }}>
          <p style={{ marginBottom: 8 }}>No items yet</p>
          <button
            onClick={() => navigate(`/${encodeURIComponent(repo!)}/${collection}/new`)}
            style={{ color: "var(--color-accent)", fontSize: 14 }}
          >
            Create the first one
          </button>
        </div>
      )}

      {/* Content table */}
      {!loading && sortedItems.length > 0 && (
        <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <th style={thStyle}>Title</th>
                <th style={{ ...thStyle, width: 120 }}>Date</th>
                <th style={{ ...thStyle, width: 80 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr
                  key={item.slug}
                  onClick={() => navigate(`/${encodeURIComponent(repo!)}/${collection}/${item.slug}`)}
                  style={{
                    borderBottom: "1px solid var(--color-border-subtle)",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-subtle)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 500 }}>
                      {String(item.frontmatter.title ?? item.slug)}
                    </span>
                    {item.frontmatter.description ? (
                      <span style={{
                        display: "block",
                        color: "var(--color-text-muted)",
                        fontSize: 12,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 500,
                      }}>
                        {String(item.frontmatter.description)}
                      </span>
                    ) : null}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--color-text-secondary)", fontSize: 13 }}>
                    {String(item.frontmatter.date ?? "")}
                  </td>
                  <td style={{ ...tdStyle, display: "flex", gap: 4, alignItems: "center" }}>
                    {item.frontmatter.draft ? (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "var(--color-bg-muted)",
                        color: "var(--color-text-muted)",
                      }}>
                        Draft
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "var(--color-success-subtle)",
                        color: "var(--color-success)",
                      }}>
                        Published
                      </span>
                    )}
                    {prBySlug.has(item.slug) ? (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "var(--color-accent-subtle)",
                        color: "var(--color-accent)",
                      }}>
                        PR #{prBySlug.get(item.slug)!.number}
                      </span>
                    ) : null}
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
