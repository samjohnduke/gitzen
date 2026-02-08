import { useState } from "react";
import type { FieldDefinition } from "@shared/types";
import { FrontmatterForm } from "./frontmatter-form";

interface MetadataSidebarProps {
  fields: FieldDefinition[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

export function MetadataSidebar({ fields, values, onChange }: MetadataSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      style={{
        width: collapsed ? 40 : "var(--metadata-width)",
        minWidth: collapsed ? 40 : "var(--metadata-width)",
        height: "100%",
        borderLeft: "1px solid var(--color-border)",
        background: "var(--color-bg-subtle)",
        transition: "width 0.2s, min-width 0.2s",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Toggle button */}
      <div
        style={{
          padding: collapsed ? "12px 8px" : "12px 16px",
          borderBottom: collapsed ? "none" : "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
        }}
      >
        {!collapsed && (
          <span style={{
            fontSize: 12,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--color-text-muted)",
          }}>
            Metadata
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Show metadata" : "Hide metadata"}
          style={{
            padding: 4,
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-muted)",
            transition: "color 0.1s",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          >
            <path d="M10 4l-4 4 4 4" />
          </svg>
        </button>
      </div>

      {/* Form */}
      {!collapsed && (
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <FrontmatterForm fields={fields} values={values} onChange={onChange} />
        </div>
      )}
    </aside>
  );
}
