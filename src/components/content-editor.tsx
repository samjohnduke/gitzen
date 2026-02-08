import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useConfig } from "../hooks/use-config";
import { useContentItem } from "../hooks/use-content-item";
import { useSaveContent } from "../hooks/use-save-content";
import { useAutosave, loadDraft, clearDraft } from "../hooks/use-autosave";
import { TiptapEditor } from "./tiptap-editor";
import { MetadataSidebar } from "./metadata-sidebar";
import { SaveIndicator } from "./save-indicator";
import { titleToSlug } from "../lib/slug";
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
      setInitialized(true);
    }
  }, [item, isNew, initialized, fields, draftKey]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!repo || !collection) return;

    const title = String(frontmatter.title ?? "");
    const currentSlug = isNew ? titleToSlug(title) : slug;
    if (!currentSlug) return;

    const result = await save(repo, collection, currentSlug, {
      frontmatter,
      body,
      sha: currentSha,
    });

    if (result) {
      setCurrentSha(result.sha);
      if (draftKey) clearDraft(draftKey);
      if (isNew) {
        navigate(`/${encodeURIComponent(repo)}/${collection}/${currentSlug}`, { replace: true });
      }
    }
  }, [repo, collection, slug, isNew, frontmatter, body, currentSha, save, navigate, draftKey]);

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
            <button
              onClick={handleSave}
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
              {saving ? "Saving..." : isNew ? "Publish" : "Save"}
            </button>
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
                fontFamily: "var(--font-serif)",
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
