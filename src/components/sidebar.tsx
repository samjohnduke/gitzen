import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { api } from "../api/client";
import { useConfig } from "../hooks/use-config";
import type { RepoConnection } from "@shared/types";

interface SidebarProps {
  username?: string;
  onLogout: () => void;
}

interface GithubRepo {
  fullName: string;
  private: boolean;
  description: string | null;
}

export function Sidebar({ username, onLogout }: SidebarProps) {
  const navigate = useNavigate();
  const params = useParams();
  const [repos, setRepos] = useState<RepoConnection[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { config } = useConfig(selectedRepo);

  // Load repos on mount
  useEffect(() => {
    api.getRepos().then(setRepos).catch(() => {});
  }, []);

  // Auto-select first repo or from URL
  useEffect(() => {
    if (repos.length > 0 && !selectedRepo) {
      const fromUrl = params.repo ? decodeURIComponent(params.repo) : null;
      const match = fromUrl && repos.find((r) => r.fullName === fromUrl);
      setSelectedRepo(match ? match.fullName : repos[0].fullName);
    }
  }, [repos, params.repo, selectedRepo]);

  const currentCollection = params.collection;

  const handleAddRepo = async (fullName: string) => {
    try {
      await api.addRepo(fullName);
      const updated = await api.getRepos();
      setRepos(updated);
      setSelectedRepo(fullName);
      setPickerOpen(false);
    } catch {
      // repo might not have cms.config.json — error is shown in the picker
      throw new Error("No cms.config.json found in this repo");
    }
  };

  const handleRemoveRepo = async (repo: string) => {
    await api.removeRepo(repo);
    const updated = await api.getRepos();
    setRepos(updated);
    if (selectedRepo === repo) {
      setSelectedRepo(updated[0]?.fullName ?? null);
    }
  };

  return (
    <aside style={{
      width: "var(--sidebar-width)",
      height: "100%",
      borderRight: "1px solid var(--color-border)",
      background: "var(--color-bg-subtle)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
    }}>
      {/* Repo Switcher */}
      <div style={{
        padding: "16px 16px 12px",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedRepo?.split("/")[1] ?? "Select repo"}
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 4.5L6 7.5L9 4.5" />
              </svg>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={4}
              style={{
                minWidth: 220,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)",
                padding: 4,
                zIndex: 50,
              }}
            >
              {repos.map((repo) => (
                <DropdownMenu.Item
                  key={repo.fullName}
                  onSelect={() => {
                    setSelectedRepo(repo.fullName);
                    navigate("/");
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    outline: "none",
                    background: repo.fullName === selectedRepo ? "var(--color-accent-subtle)" : "transparent",
                  }}
                >
                  <span>{repo.fullName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRepo(repo.fullName);
                    }}
                    style={{
                      padding: 2,
                      color: "var(--color-text-muted)",
                      opacity: 0,
                      transition: "opacity 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                    title="Remove repo"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 3l6 6M9 3l-6 6" />
                    </svg>
                  </button>
                </DropdownMenu.Item>
              ))}
              <DropdownMenu.Separator style={{ height: 1, background: "var(--color-border)", margin: "4px 0" }} />
              <DropdownMenu.Item
                onSelect={() => setPickerOpen(true)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--color-accent)",
                  outline: "none",
                }}
              >
                + Add repository
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Collection Nav */}
      <nav style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
        {config && Object.entries(config.collections).map(([key, col]) => (
          <button
            key={key}
            onClick={() => navigate(`/${encodeURIComponent(selectedRepo!)}/${key}`)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: currentCollection === key ? 500 : 400,
              color: currentCollection === key ? "var(--color-accent)" : "var(--color-text-secondary)",
              background: currentCollection === key ? "var(--color-accent-subtle)" : "transparent",
              transition: "all 0.1s",
            }}
          >
            {col.label}
          </button>
        ))}
        {!config && selectedRepo && (
          <p style={{ padding: "12px 20px", color: "var(--color-text-muted)", fontSize: 13 }}>
            Loading collections...
          </p>
        )}
        {repos.length === 0 && (
          <p style={{ padding: "12px 20px", color: "var(--color-text-muted)", fontSize: 13 }}>
            No repos connected. Add one above.
          </p>
        )}
      </nav>

      {/* User footer */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 13,
      }}>
        <span style={{ color: "var(--color-text-secondary)" }}>{username}</span>
        <button
          onClick={onLogout}
          style={{
            color: "var(--color-text-muted)",
            fontSize: 12,
          }}
        >
          Sign out
        </button>
      </div>

      {/* Repo Picker Dialog */}
      <RepoPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        connectedRepos={repos}
        onAdd={handleAddRepo}
      />
    </aside>
  );
}

interface RepoPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectedRepos: RepoConnection[];
  onAdd: (fullName: string) => Promise<void>;
}

function RepoPicker({ open, onOpenChange, connectedRepos, onAdd }: RepoPickerProps) {
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const connectedSet = new Set(connectedRepos.map((r) => r.fullName));

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setQuery("");
    setError(null);
    api.getGithubRepos().then((repos) => {
      setGithubRepos(repos);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [open]);

  const filtered = githubRepos.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(q) ||
      (r.description?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleAdd = async (fullName: string) => {
    setAdding(fullName);
    setError(null);
    try {
      await onAdd(fullName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add repo");
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          zIndex: 100,
        }} />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 480,
            maxHeight: "70vh",
            background: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            zIndex: 101,
          }}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title style={{
            padding: "16px 16px 0",
            fontSize: 15,
            fontWeight: 600,
          }}>
            Add Repository
          </Dialog.Title>
          <Dialog.Description style={{
            padding: "4px 16px 12px",
            fontSize: 13,
            color: "var(--color-text-muted)",
          }}>
            Select a repo that has a <code style={{
              fontSize: 12,
              padding: "1px 4px",
              background: "var(--color-bg-muted)",
              borderRadius: 3,
              fontFamily: "var(--font-mono)",
            }}>cms.config.json</code> in its root.
          </Dialog.Description>

          {/* Search */}
          <div style={{
            padding: "0 16px 12px",
          }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repositories..."
              style={{ width: "100%", fontSize: 13, padding: "8px 12px" }}
            />
          </div>

          {error && (
            <p style={{ padding: "0 16px 8px", color: "var(--color-danger)", fontSize: 12 }}>
              {error}
            </p>
          )}

          {/* Repo list */}
          <div style={{ flex: 1, overflow: "auto", padding: "0 8px 8px" }}>
            {loading && (
              <p style={{ padding: "20px 8px", color: "var(--color-text-muted)", fontSize: 13, textAlign: "center" }}>
                Loading your repositories...
              </p>
            )}
            {!loading && filtered.length === 0 && (
              <p style={{ padding: "20px 8px", color: "var(--color-text-muted)", fontSize: 13, textAlign: "center" }}>
                {query ? "No matching repositories" : "No repositories found"}
              </p>
            )}
            {!loading && filtered.map((repo) => {
              const isConnected = connectedSet.has(repo.fullName);
              const isAdding = adding === repo.fullName;
              return (
                <button
                  key={repo.fullName}
                  onClick={() => !isConnected && !isAdding && handleAdd(repo.fullName)}
                  disabled={isConnected || isAdding}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13,
                    cursor: isConnected ? "default" : "pointer",
                    opacity: isConnected ? 0.5 : 1,
                    background: "transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (!isConnected) e.currentTarget.style.background = "var(--color-bg-subtle)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 500 }}>{repo.fullName}</span>
                      {repo.private && (
                        <span style={{
                          fontSize: 10,
                          padding: "1px 5px",
                          borderRadius: 99,
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text-muted)",
                        }}>
                          private
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p style={{
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {repo.description}
                      </p>
                    )}
                  </div>
                  {isConnected ? (
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0, marginLeft: 8 }}>
                      Connected
                    </span>
                  ) : isAdding ? (
                    <span style={{ fontSize: 11, color: "var(--color-accent)", flexShrink: 0, marginLeft: 8 }}>
                      Adding...
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
