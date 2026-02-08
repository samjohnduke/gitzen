import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTokens } from "../hooks/use-tokens";
import type { Permission, ApiTokenCreated } from "@shared/types";

const ALL_PERMISSIONS: { value: Permission; label: string }[] = [
  { value: "content:read", label: "Read content" },
  { value: "content:write", label: "Write content" },
  { value: "content:delete", label: "Delete content" },
  { value: "config:read", label: "Read config" },
  { value: "repos:read", label: "List repos" },
];

const EXPIRY_OPTIONS = [
  { label: "7 days", value: 7 * 24 * 60 * 60 },
  { label: "30 days", value: 30 * 24 * 60 * 60 },
  { label: "90 days", value: 90 * 24 * 60 * 60 },
  { label: "Never", value: null },
];

export function TokenManager() {
  const { tokens, loading, createToken, revokeToken } = useTokens();
  const [createOpen, setCreateOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<ApiTokenCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleRevoke = async (tokenId: string) => {
    setRevoking(tokenId);
    try {
      await revokeToken(tokenId);
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>API Tokens</h1>
        <button
          onClick={() => {
            setCreatedToken(null);
            setCreateOpen(true);
          }}
          style={{
            padding: "8px 16px",
            background: "var(--color-accent)",
            color: "white",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Create token
        </button>
      </div>

      <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 20 }}>
        API tokens allow scripts and native apps to access the CMS API with scoped permissions.
      </p>

      {loading ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Loading...</p>
      ) : tokens.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
          No API tokens yet. Create one to get started.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tokens.map((token) => (
            <div
              key={token.tokenId}
              style={{
                padding: 16,
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface)",
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}>
                <span style={{ fontWeight: 500, fontSize: 14 }}>{token.name}</span>
                <button
                  onClick={() => handleRevoke(token.tokenId)}
                  disabled={revoking === token.tokenId}
                  style={{
                    padding: "4px 10px",
                    fontSize: 12,
                    color: "var(--color-danger)",
                    border: "1px solid var(--color-danger)",
                    borderRadius: "var(--radius-sm)",
                    background: "transparent",
                    opacity: revoking === token.tokenId ? 0.5 : 1,
                  }}
                >
                  {revoking === token.tokenId ? "Revoking..." : "Revoke"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {token.permissions.map((perm) => (
                  <span
                    key={perm}
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 99,
                      background: "var(--color-bg-muted)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {perm}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                <span>
                  Repos: {token.repos.includes("*") ? "All" : token.repos.join(", ")}
                </span>
                {" · "}
                <span>
                  Created {new Date(token.createdAt).toLocaleDateString()}
                </span>
                {token.expiresAt ? (
                  <>
                    {" · "}
                    <span>
                      Expires {new Date(token.expiresAt).toLocaleDateString()}
                    </span>
                  </>
                ) : null}
                {token.lastUsedAt ? (
                  <>
                    {" · "}
                    <span>
                      Last used {new Date(token.lastUsedAt).toLocaleDateString()}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Token Dialog */}
      <CreateTokenDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (data) => {
          const result = await createToken(data);
          setCreatedToken(result);
        }}
      />

      {/* Token Created Dialog (shows the secret once) */}
      <Dialog.Root
        open={createdToken !== null}
        onOpenChange={(open) => { if (!open) setCreatedToken(null); }}
      >
        <Dialog.Portal>
          <Dialog.Overlay style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.4)",
            zIndex: 100,
          }} />
          <Dialog.Content style={{
            position: "fixed",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 480,
            background: "var(--color-surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            padding: 24,
            zIndex: 101,
          }}>
            <Dialog.Title style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Token created
            </Dialog.Title>
            <Dialog.Description style={{
              fontSize: 13,
              color: "var(--color-text-muted)",
              marginBottom: 16,
            }}>
              Copy this token now. You won't be able to see it again.
            </Dialog.Description>

            {createdToken ? (
              <div style={{
                display: "flex",
                gap: 8,
                marginBottom: 16,
              }}>
                <code style={{
                  flex: 1,
                  padding: "10px 12px",
                  background: "var(--color-bg-muted)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  wordBreak: "break-all",
                  lineHeight: 1.4,
                }}>
                  {createdToken.token}
                </code>
                <button
                  onClick={() => handleCopy(createdToken.token)}
                  style={{
                    padding: "8px 12px",
                    background: copied ? "var(--color-success, #22c55e)" : "var(--color-accent)",
                    color: "white",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 12,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Dialog.Close asChild>
                <button style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  background: "var(--color-bg-subtle)",
                  border: "1px solid var(--color-border)",
                }}>
                  Done
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// --- Create Token Dialog ---

interface CreateTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    name: string;
    repos: string[];
    permissions: Permission[];
    expiresIn?: number | null;
  }) => Promise<void>;
}

function CreateTokenDialog({ open, onOpenChange, onCreate }: CreateTokenDialogProps) {
  const [name, setName] = useState("");
  const [repoInput, setRepoInput] = useState("*");
  const [permissions, setPermissions] = useState<Permission[]>([
    "content:read",
    "content:write",
    "config:read",
    "repos:read",
  ]);
  const [expiresIn, setExpiresIn] = useState<number | null>(90 * 24 * 60 * 60);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (perm: Permission) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (permissions.length === 0) {
      setError("Select at least one permission");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const repos =
        repoInput.trim() === "*"
          ? ["*"]
          : repoInput
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean);

      await onCreate({ name: name.trim(), repos, permissions, expiresIn });
      // Reset form
      setName("");
      setRepoInput("*");
      setPermissions(["content:read", "content:write", "config:read", "repos:read"]);
      setExpiresIn(90 * 24 * 60 * 60);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setCreating(false);
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
        <Dialog.Content style={{
          position: "fixed",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          maxHeight: "80vh",
          overflow: "auto",
          background: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: 24,
          zIndex: 101,
        }}>
          <Dialog.Title style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Create API token
          </Dialog.Title>

          {/* Name */}
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CI deploy, iPhone"
              style={{ width: "100%", fontSize: 13, padding: "8px 12px" }}
            />
          </label>

          {/* Repos */}
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
              Repos
            </span>
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="* for all, or owner/repo,owner/repo2"
              style={{ width: "100%", fontSize: 13, padding: "8px 12px" }}
            />
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2, display: "block" }}>
              Use * for all repos, or comma-separated owner/repo names
            </span>
          </label>

          {/* Permissions */}
          <fieldset style={{ border: "none", padding: 0, marginBottom: 12 }}>
            <legend style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Permissions
            </legend>
            {ALL_PERMISSIONS.map(({ value, label }) => (
              <label
                key={value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 0",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={permissions.includes(value)}
                  onChange={() => togglePermission(value)}
                />
                {label}
                <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>
                  ({value})
                </span>
              </label>
            ))}
          </fieldset>

          {/* Expiry */}
          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
              Expires
            </span>
            <select
              value={expiresIn === null ? "null" : String(expiresIn)}
              onChange={(e) => setExpiresIn(e.target.value === "null" ? null : Number(e.target.value))}
              style={{ width: "100%", fontSize: 13, padding: "8px 12px" }}
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={String(opt.value)} value={opt.value === null ? "null" : String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <p style={{ color: "var(--color-danger)", fontSize: 12, marginBottom: 12 }}>
              {error}
            </p>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Dialog.Close asChild>
              <button style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                background: "var(--color-bg-subtle)",
                border: "1px solid var(--color-border)",
              }}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleSubmit}
              disabled={creating}
              style={{
                padding: "8px 16px",
                background: "var(--color-accent)",
                color: "white",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                fontWeight: 500,
                opacity: creating ? 0.6 : 1,
              }}
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
