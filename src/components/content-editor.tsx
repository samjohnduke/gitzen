import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useConfig } from "../hooks/use-config";
import { useContentItem } from "../hooks/use-content-item";
import { useSaveContent } from "../hooks/use-save-content";
import { useWorkflow } from "../hooks/use-workflow";
import { useAutosave, loadDraft, clearDraft } from "../hooks/use-autosave";
import { TiptapEditor } from "./tiptap-editor";
import { MetadataSidebar } from "./metadata-sidebar";
import { SaveIndicator } from "./save-indicator";
import { SaveButton } from "./save-button";
import { titleToSlug } from "../lib/slug";
import { branchName } from "@shared/branch";
import { api } from "../api/client";

interface ContentEditorProps {
  isNew?: boolean;
}

export function ContentEditor({ isNew }: ContentEditorProps) {
  const params = useParams();
  const navigate = useNavigate();
  const repo = params.repo ? decodeURIComponent(params.repo) : null;
  const collection = params.collection ?? null;
  const slug = params.slug ?? null;

  const { config } = useConfig(repo);
  const { item, loading: itemLoading } = useContentItem(
    isNew ? null : repo,
    isNew ? null : collection,
    slug
  );

  const { saving, lastSaved, error: saveError, save } = useSaveContent();

  const collectionConfig = config?.collections[collection ?? ""];
  const fields = collectionConfig?.fields ?? [];

  // Title field (separate from frontmatter for editing UX)
  const titleField = fields.find((f) => f.name === "title");
  const nonTitleFields = fields.filter((f) => f.name !== "title");

  // Editor state
  const [frontmatter, setFrontmatter] = useState<Record<string, unknown>>({});
  const [body, setBody] = useState("");
  const [currentSha, setCurrentSha] = useState<string | undefined>();
  const [initialized, setInitialized] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const [activePrNumber, setActivePrNumber] = useState<number | null>(null);

  const workflow = useWorkflow(config, collection);

  // Draft key
  const draftKey = repo && collection && (slug || "new")
    ? `${repo}/${collection}/${slug || "new"}`
    : null;

  // Reset when navigating to a different item
  const itemKey = `${repo}/${collection}/${slug ?? "new"}`;
  const prevItemKey = useRef(itemKey);
  useEffect(() => {
    if (itemKey !== prevItemKey.current) {
      prevItemKey.current = itemKey;
      setInitialized(false);
      setCurrentSha(undefined);
      setFrontmatter({});
      setBody("");
      setActiveBranch(null);
      setActivePrNumber(null);
    }
  }, [itemKey]);

  // Initialize from item or draft
  useEffect(() => {
    if (initialized) return;

    if (isNew) {
      // Check for draft
      if (draftKey) {
        const draft = loadDraft(draftKey);
        if (draft) {
          setFrontmatter(draft.frontmatter);
          setBody(draft.body);
          setInitialized(true);
          return;
        }
      }
      // Set defaults
      const defaults: Record<string, unknown> = {};
      for (const field of fields) {
        if (field.default !== undefined) {
          defaults[field.name] = field.default;
        }
        if (field.type === "date" && field.name === "date") {
          defaults.date = new Date().toISOString().split("T")[0];
        }
      }
      setFrontmatter(defaults);
      setInitialized(true);
      return;
    }

    if (item) {
      // Check for local draft
      if (draftKey) {
        const draft = loadDraft(draftKey);
        if (draft) {
          // Use draft if it exists — user can always re-fetch by clearing localStorage
          setFrontmatter(draft.frontmatter);
          setBody(draft.body);
        } else {
          setFrontmatter(item.frontmatter);
          setBody(item.body ?? "");
        }
      } else {
        setFrontmatter(item.frontmatter);
        setBody(item.body ?? "");
      }
      setCurrentSha(item.sha);
      if (item.branch) setActiveBranch(item.branch);
      if (item.prNumber) setActivePrNumber(item.prNumber);
      setInitialized(true);
    }
  }, [item, isNew, initialized, fields, draftKey]);

  // Save handler
  const handleSave = useCallback(async (modeOverride?: "direct" | "pr") => {
    if (!repo || !collection) return;

    const title = String(frontmatter.title ?? "");
    const currentSlug = isNew ? titleToSlug(title) : slug;
    if (!currentSlug) return;

    // If already on a branch, always save to that branch
    const effectiveMode = activeBranch ? "branch" : (modeOverride ?? workflow.mode);

    const result = await save(repo, collection, currentSlug, {
      frontmatter,
      body,
      sha: currentSha,
      mode: effectiveMode === "pr" || effectiveMode === "branch" ? "branch" : "direct",
    });

    if (result) {
      setCurrentSha(result.sha);
      if (draftKey) clearDraft(draftKey);

      // If saved to a branch, auto-create PR if there isn't one yet
      if (result.branch && !activePrNumber) {
        try {
          const pr = await api.createPullRequest(repo, {
            branch: result.branch,
            title: `Draft: ${title || currentSlug}`,
            body: `Content ${isNew ? "created" : "updated"} via CMS`,
          });
          setActiveBranch(result.branch);
          setActivePrNumber(pr.number);
        } catch {
          // PR creation failed — branch save still succeeded
          setActiveBranch(result.branch);
        }
      } else if (result.branch) {
        setActiveBranch(result.branch);
      }

      if (isNew) {
        navigate(`/${encodeURIComponent(repo)}/${collection}/${currentSlug}`, { replace: true });
      }
    }
  }, [repo, collection, slug, isNew, frontmatter, body, currentSha, save, navigate, draftKey, workflow.mode, activeBranch, activePrNumber]);

  // Autosave
  useAutosave(draftKey, frontmatter, body, handleSave);

  // Delete handler
  const handleDelete = async () => {
    if (!repo || !collection || !slug || !currentSha) return;
    if (!confirm("Delete this item? This will create a commit removing the file.")) return;

    setDeleting(true);
    try {
      await api.deleteContent(repo, collection, slug, currentSha);
      if (draftKey) clearDraft(draftKey);
      navigate(`/${encodeURIComponent(repo)}/${collection}`);
    } catch {
      setDeleting(false);
    }
  };

  // Cmd+. toggles zen mode, Escape exits
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setZenMode((z) => !z);
        return;
      }
      if (e.key === "Escape" && zenMode) {
        e.preventDefault();
        setZenMode(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [zenMode]);

  const title = String(frontmatter.title ?? "");

  if (!isNew && itemLoading) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text-muted)",
      }}>
        Loading...
      </div>
    );
  }

  if (zenMode) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}>
        {/* Minimal top bar — fades in on hover */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 201,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            opacity: 0,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SaveIndicator saving={saving} lastSaved={lastSaved} error={saveError} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => handleSave()}
              disabled={saving}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 500,
                background: "var(--color-accent)",
                color: "white",
                borderRadius: "var(--radius-md)",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setZenMode(false)}
              title="Exit zen mode (Esc)"
              style={{
                padding: "6px 10px",
                fontSize: 12,
                color: "var(--color-text-muted)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Exit Zen
              <kbd style={{
                fontSize: 10,
                padding: "1px 4px",
                background: "var(--color-bg-muted)",
                borderRadius: 3,
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-muted)",
              }}>Esc</kbd>
            </button>
          </div>
        </div>

        {/* Centered writing area */}
        <div style={{
          flex: 1,
          padding: "80px 32px 60px",
          maxWidth: 680,
          width: "100%",
          margin: "0 auto",
        }}>
          {titleField && (
            <input
              type="text"
              value={title}
              onChange={(e) => setFrontmatter({ ...frontmatter, title: e.target.value })}
              placeholder="Title"
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                boxShadow: "none",
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
                padding: 0,
                marginBottom: 32,
                color: "var(--color-text)",
              }}
            />
          )}
          <TiptapEditor content={body} onChange={setBody} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Main editor area */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 32px",
          borderBottom: "1px solid var(--color-border-subtle)",
          minHeight: 52,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => navigate(`/${encodeURIComponent(repo!)}/${collection}`)}
              style={{
                padding: "4px 8px",
                color: "var(--color-text-muted)",
                fontSize: 13,
                borderRadius: "var(--radius-sm)",
              }}
            >
              &larr; {collectionConfig?.label ?? collection}
            </button>
            <SaveIndicator saving={saving} lastSaved={lastSaved} error={saveError} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setZenMode(true)}
              title="Zen mode — distraction-free writing (⌘ + ?)"
              style={{
                padding: "6px 12px",
                fontSize: 13,
                color: "var(--color-text-secondary)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {/* Enso circle icon */}
              <svg width="14" height="14" viewBox="0 0 100 100" fill="none">
                <circle
                  cx="50" cy="50" r="38"
                  stroke="currentColor" strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="220 40"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              Zen
              <kbd style={{
                fontSize: 11,
                padding: "1px 5px",
                background: "var(--color-bg-muted)",
                borderRadius: 3,
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-muted)",
                marginLeft: 2,
              }}>⌘ + ?</kbd>
            </button>
            {activeBranch && workflow.previewUrl(activeBranch) ? (
              <a
                href={workflow.previewUrl(activeBranch)!}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  color: "var(--color-accent)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
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
            {activePrNumber ? (
              <button
                onClick={() => navigate(`/${encodeURIComponent(repo!)}/reviews/${activePrNumber}`)}
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-accent)",
                  background: "var(--color-accent-subtle)",
                  borderRadius: 99,
                }}
              >
                PR #{activePrNumber}
              </button>
            ) : null}
            {!isNew && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  color: "var(--color-danger)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            )}
            <SaveButton
              mode={activeBranch ? "pr" : workflow.mode}
              locked={workflow.locked}
              saving={saving}
              isNew={!!isNew}
              prNumber={activePrNumber}
              onSave={handleSave}
              onModeChange={workflow.setMode}
            />
          </div>
        </div>

        {/* Editor content */}
        <div style={{
          flex: 1,
          padding: "40px 32px",
          maxWidth: 760,
          width: "100%",
          margin: "0 auto",
        }}>
          {/* Title input */}
          {titleField && (
            <input
              type="text"
              value={title}
              onChange={(e) => setFrontmatter({ ...frontmatter, title: e.target.value })}
              placeholder="Title"
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                boxShadow: "none",
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
                padding: 0,
                marginBottom: 24,
                color: "var(--color-text)",
              }}
            />
          )}

          {/* Tiptap editor */}
          <TiptapEditor content={body} onChange={setBody} />
        </div>
      </div>

      {/* Metadata sidebar */}
      {initialized && (
        <MetadataSidebar
          fields={nonTitleFields}
          values={frontmatter}
          onChange={setFrontmatter}
        />
      )}
    </div>
  );
}
