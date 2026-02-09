import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { usePullRequest } from "../hooks/use-pull-requests";
import { DiffView } from "./diff-view";
import { api } from "../api/client";
import type { PrComment } from "@shared/types";

export function ReviewDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const repo = params.repo ? decodeURIComponent(params.repo) : null;
  const number = params.number ? parseInt(params.number, 10) : null;

  const { pr, diff, loading, error, refresh } = usePullRequest(repo, number);

  const [merging, setMerging] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [rebasing, setRebasing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [comments, setComments] = useState<PrComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch comments
  useEffect(() => {
    if (!repo || !number) return;
    api.listPrComments(repo, number).then(setComments).catch(() => {});
  }, [repo, number]);

  const handleAddComment = async () => {
    if (!repo || !number || !commentBody.trim()) return;
    setSubmittingComment(true);
    try {
      const comment = await api.createPrComment(repo, number, commentBody.trim());
      setComments((prev) => [...prev, comment]);
      setCommentBody("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Poll for mergeable status if null
  useEffect(() => {
    if (!pr || pr.mergeable !== null) return;
    const timer = setTimeout(refresh, 2000);
    return () => clearTimeout(timer);
  }, [pr, refresh]);

  const handleMerge = async () => {
    if (!repo || !number) return;
    setMerging(true);
    setActionError(null);
    try {
      const result = await api.mergePullRequest(repo, number);
      if ("merged" in result && result.merged) {
        navigate(`/${encodeURIComponent(repo)}/reviews`);
      } else {
        setActionError("Merge failed: conflicts detected. Try updating the branch.");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setMerging(false);
    }
  };

  const handleUpdate = async () => {
    if (!repo || !number) return;
    setUpdating(true);
    setActionError(null);
    try {
      const result = await api.updatePullRequestBranch(repo, number);
      if (result.ok) {
        refresh();
      } else {
        setActionError("Branch update failed. Try force rebase instead.");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const handleRebase = async () => {
    if (!repo || !number) return;
    if (!confirm("Force rebase will recreate the branch from main with your content. Continue?")) return;
    setRebasing(true);
    setActionError(null);
    try {
      await api.rebasePullRequest(repo, number);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Rebase failed");
    } finally {
      setRebasing(false);
    }
  };

  const handleClose = async () => {
    if (!repo || !number) return;
    if (!confirm("Close this PR? The branch will be deleted and changes discarded.")) return;
    setClosing(true);
    setActionError(null);
    try {
      await api.closePullRequest(repo, number);
      navigate(`/${encodeURIComponent(repo)}/reviews`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Close failed");
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text-muted)",
      }}>
        Loading review...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "32px 40px" }}>
        <p style={{ color: "var(--color-danger)" }}>{error}</p>
      </div>
    );
  }

  if (!pr) return null;

  const mergeableState: "ready" | "conflicts" | "checking" =
    pr.mergeable === true
      ? "ready"
      : pr.mergeable === false
        ? "conflicts"
        : "checking";

  return (
    <div style={{ padding: "32px 40px", width: "100%", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate(`/${encodeURIComponent(repo!)}/reviews`)}
          style={{
            padding: "4px 8px",
            color: "var(--color-text-muted)",
            fontSize: 13,
            borderRadius: "var(--radius-sm)",
            marginBottom: 12,
          }}
        >
          &larr; Reviews
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              {pr.title}
              <span style={{
                fontSize: 14,
                fontWeight: 400,
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
              }}>
                #{pr.number}
              </span>
            </h1>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 6,
              fontSize: 13,
              color: "var(--color-text-secondary)",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                {pr.branch} &rarr; main
              </span>
              <span>by {pr.author}</span>
              {pr.previewUrl ? (
                <a
                  href={pr.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
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
              ) : null}
              <a
                href={pr.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--color-text-muted)",
                  textDecoration: "none",
                  fontSize: 12,
                }}
              >
                View on GitHub
              </a>
            </div>
          </div>

          {/* Status badge */}
          <span style={{
            fontSize: 12,
            fontWeight: 500,
            padding: "4px 10px",
            borderRadius: 99,
            background:
              mergeableState === "ready"
                ? "var(--color-success-subtle)"
                : mergeableState === "conflicts"
                  ? "rgba(220, 38, 38, 0.1)"
                  : "var(--color-bg-muted)",
            color:
              mergeableState === "ready"
                ? "var(--color-success)"
                : mergeableState === "conflicts"
                  ? "var(--color-danger)"
                  : "var(--color-text-muted)",
          }}>
            {mergeableState === "ready"
              ? "Ready to merge"
              : mergeableState === "conflicts"
                ? "Has conflicts"
                : "Checking..."}
          </span>
        </div>
      </div>

      {/* Conflict warning */}
      {mergeableState === "conflicts" && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(220, 38, 38, 0.05)",
          border: "1px solid rgba(220, 38, 38, 0.2)",
          borderRadius: "var(--radius-md)",
          marginBottom: 20,
          fontSize: 13,
          color: "var(--color-danger)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span>This branch has conflicts with the base branch.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleUpdate}
              disabled={updating}
              style={{
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 500,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                opacity: updating ? 0.7 : 1,
              }}
            >
              {updating ? "Updating..." : "Update Branch"}
            </button>
            <button
              onClick={handleRebase}
              disabled={rebasing}
              style={{
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-danger)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                opacity: rebasing ? 0.7 : 1,
              }}
            >
              {rebasing ? "Rebasing..." : "Force Rebase"}
            </button>
          </div>
        </div>
      )}

      {/* Action error */}
      {actionError && (
        <div style={{
          padding: "10px 16px",
          background: "rgba(220, 38, 38, 0.05)",
          border: "1px solid rgba(220, 38, 38, 0.2)",
          borderRadius: "var(--radius-md)",
          marginBottom: 20,
          fontSize: 13,
          color: "var(--color-danger)",
        }}>
          {actionError}
        </div>
      )}

      {/* Diff view */}
      {diff ? <DiffView diffs={diff} /> : null}

      {/* Comments */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text-secondary)",
          marginBottom: 12,
        }}>
          Comments{comments.length > 0 ? ` (${comments.length})` : ""}
        </h3>

        {comments.length > 0 && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 16,
          }}>
            {comments.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 14px",
                  background: "var(--color-bg-subtle)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <img
                  src={c.avatarUrl}
                  alt={c.author}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{c.author}</span>
                    <span style={{
                      fontSize: 11,
                      color: "var(--color-text-muted)",
                    }}>
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "var(--color-text-secondary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    margin: 0,
                  }}>
                    {c.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add comment form */}
        <div style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}>
          <textarea
            ref={commentInputRef}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAddComment();
              }
            }}
            placeholder="Leave a comment..."
            rows={2}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: 13,
              lineHeight: 1.5,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              resize: "vertical",
              minHeight: 60,
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={handleAddComment}
            disabled={submittingComment || !commentBody.trim()}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 500,
              background: "var(--color-accent)",
              color: "white",
              borderRadius: "var(--radius-md)",
              opacity: submittingComment || !commentBody.trim() ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {submittingComment ? "Posting..." : "Comment"}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: "flex",
        gap: 8,
        marginTop: 24,
        paddingTop: 20,
        borderTop: "1px solid var(--color-border)",
      }}>
        <button
          onClick={handleMerge}
          disabled={merging || mergeableState !== "ready"}
          style={{
            padding: "8px 20px",
            fontSize: 14,
            fontWeight: 500,
            background: mergeableState === "ready" ? "var(--color-success)" : "var(--color-bg-muted)",
            color: mergeableState === "ready" ? "white" : "var(--color-text-muted)",
            borderRadius: "var(--radius-md)",
            opacity: merging ? 0.7 : 1,
          }}
        >
          {merging ? "Merging..." : "Merge & Publish"}
        </button>

        {pr.collection && pr.slug ? (
          <button
            onClick={() =>
              navigate(`/${encodeURIComponent(repo!)}/${pr.collection}/${pr.slug}`)
            }
            style={{
              padding: "8px 16px",
              fontSize: 13,
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            Edit Draft
          </button>
        ) : null}

        {mergeableState !== "ready" && mergeableState !== "checking" ? (
          <button
            onClick={handleUpdate}
            disabled={updating}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              opacity: updating ? 0.7 : 1,
            }}
          >
            {updating ? "Updating..." : "Update Branch"}
          </button>
        ) : null}

        <div style={{ flex: 1 }} />

        <button
          onClick={handleClose}
          disabled={closing}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            color: "var(--color-danger)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            opacity: closing ? 0.7 : 1,
          }}
        >
          {closing ? "Closing..." : "Close"}
        </button>
      </div>
    </div>
  );
}
