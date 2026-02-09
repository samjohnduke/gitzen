import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface SaveButtonProps {
  mode: "direct" | "pr";
  locked: boolean;
  saving: boolean;
  isNew: boolean;
  prNumber: number | null;
  onSave: (mode?: "direct" | "pr") => void;
  onModeChange: (mode: "direct" | "pr") => void;
}

export function SaveButton({
  mode,
  locked,
  saving,
  isNew,
  prNumber,
  onSave,
  onModeChange,
}: SaveButtonProps) {
  const primaryLabel = saving
    ? "Saving..."
    : mode === "pr"
      ? prNumber
        ? "Update Draft"
        : "Save Draft"
      : isNew
        ? "Publish"
        : "Save";

  const secondaryLabel = mode === "pr" ? "Publish Directly" : "Save as Draft";
  const secondaryMode: "direct" | "pr" = mode === "pr" ? "direct" : "pr";

  if (locked) {
    return (
      <button
        onClick={() => onSave()}
        disabled={saving}
        style={{
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 500,
          background: mode === "pr" ? "var(--color-accent)" : "var(--color-accent)",
          color: "white",
          borderRadius: "var(--radius-md)",
          opacity: saving ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {primaryLabel}
        {prNumber ? (
          <span style={{
            fontSize: 11,
            padding: "1px 6px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: 99,
          }}>
            PR #{prNumber}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "stretch" }}>
      <button
        onClick={() => onSave()}
        disabled={saving}
        style={{
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 500,
          background: "var(--color-accent)",
          color: "white",
          borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
          opacity: saving ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {primaryLabel}
        {prNumber ? (
          <span style={{
            fontSize: 11,
            padding: "1px 6px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: 99,
          }}>
            PR #{prNumber}
          </span>
        ) : null}
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            style={{
              padding: "6px 6px",
              background: "var(--color-accent)",
              color: "white",
              borderRadius: "0 var(--radius-md) var(--radius-md) 0",
              borderLeft: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              opacity: saving ? 0.7 : 1,
            }}
            disabled={saving}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={4}
            align="end"
            style={{
              minWidth: 160,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
              padding: 4,
              zIndex: 50,
            }}
          >
            <DropdownMenu.Item
              onSelect={() => {
                onModeChange(secondaryMode);
                onSave(secondaryMode);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: 13,
                outline: "none",
              }}
            >
              {secondaryLabel}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
