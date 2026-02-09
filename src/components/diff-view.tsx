import type { ContentDiff } from "@shared/types";
import { wordDiff, type DiffSegment } from "../lib/diff";

interface DiffViewProps {
  diffs: ContentDiff[];
}

export function DiffView({ diffs }: DiffViewProps) {
  if (diffs.length === 0) {
    return (
      <p style={{ color: "var(--color-text-muted)", padding: "20px 0" }}>
        No content changes detected.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {diffs.map((diff) => (
        <div key={`${diff.collection}/${diff.slug}`}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 99,
              background:
                diff.type === "added"
                  ? "var(--color-success-subtle)"
                  : diff.type === "deleted"
                    ? "rgba(220, 38, 38, 0.1)"
                    : "var(--color-accent-subtle)",
              color:
                diff.type === "added"
                  ? "var(--color-success)"
                  : diff.type === "deleted"
                    ? "var(--color-danger)"
                    : "var(--color-accent)",
            }}>
              {diff.type}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              {diff.collection}/{diff.slug}
            </span>
          </div>

          {/* Frontmatter diff */}
          <FrontmatterDiff fields={diff.frontmatter.fields} type={diff.type} />

          {/* Body diff */}
          {(diff.body.oldBody || diff.body.newBody) ? (
            <div style={{ marginTop: 16 }}>
              <h4 style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--color-text-muted)",
                marginBottom: 8,
              }}>
                Body
              </h4>
              <BodyDiff oldBody={diff.body.oldBody} newBody={diff.body.newBody} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function FrontmatterDiff({
  fields,
  type,
}: {
  fields: ContentDiff["frontmatter"]["fields"];
  type: ContentDiff["type"];
}) {
  if (fields.length === 0) return null;

  return (
    <div style={{
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
            <th style={fmThStyle}>Field</th>
            {type !== "added" ? <th style={fmThStyle}>Previous</th> : null}
            {type !== "deleted" ? <th style={fmThStyle}>Current</th> : null}
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr
              key={field.name}
              style={{
                borderBottom: "1px solid var(--color-border-subtle)",
                opacity: field.changed ? 1 : 0.5,
              }}
            >
              <td style={{
                ...fmTdStyle,
                fontWeight: 500,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}>
                {field.name}
              </td>
              {type !== "added" ? (
                <td style={{
                  ...fmTdStyle,
                  background: field.changed ? "rgba(220, 38, 38, 0.05)" : undefined,
                  textDecoration: field.changed && type === "modified" ? "line-through" : undefined,
                  color: field.changed ? "var(--color-danger)" : "var(--color-text-secondary)",
                }}>
                  {formatValue(field.oldValue)}
                </td>
              ) : null}
              {type !== "deleted" ? (
                <td style={{
                  ...fmTdStyle,
                  background: field.changed ? "rgba(34, 197, 94, 0.05)" : undefined,
                  color: field.changed ? "var(--color-success)" : "var(--color-text-secondary)",
                }}>
                  {formatValue(field.newValue)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BodyDiff({ oldBody, newBody }: { oldBody: string; newBody: string }) {
  const segments = wordDiff(oldBody, newBody);

  // Split segments into left (equal + removed) and right (equal + added)
  const leftSegments = segments.filter((s) => s.type !== "added");
  const rightSegments = segments.filter((s) => s.type !== "removed");

  const columnStyle: React.CSSProperties = {
    flex: 1,
    padding: "12px 16px",
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: 500,
    overflow: "auto",
    minWidth: 0,
  };

  return (
    <div style={{
      display: "flex",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }}>
      <div style={{
        ...columnStyle,
        background: "rgba(220, 38, 38, 0.02)",
        borderRight: "1px solid var(--color-border)",
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--color-text-muted)",
          marginBottom: 8,
          fontFamily: "var(--font-sans, inherit)",
        }}>Previous</div>
        {leftSegments.map((seg, i) => (
          <span key={i} style={segmentStyle(seg.type)}>{seg.text}</span>
        ))}
      </div>
      <div style={{
        ...columnStyle,
        background: "rgba(34, 197, 94, 0.02)",
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--color-text-muted)",
          marginBottom: 8,
          fontFamily: "var(--font-sans, inherit)",
        }}>Current</div>
        {rightSegments.map((seg, i) => (
          <span key={i} style={segmentStyle(seg.type)}>{seg.text}</span>
        ))}
      </div>
    </div>
  );
}

function segmentStyle(type: DiffSegment["type"]): React.CSSProperties {
  switch (type) {
    case "added":
      return {
        background: "rgba(34, 197, 94, 0.15)",
        color: "var(--color-success)",
        textDecoration: "none",
      };
    case "removed":
      return {
        background: "rgba(220, 38, 38, 0.15)",
        color: "var(--color-danger)",
        textDecoration: "line-through",
      };
    default:
      return {};
  }
}

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  return JSON.stringify(value);
}

const fmThStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--color-text-muted)",
  background: "var(--color-bg-subtle)",
};

const fmTdStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
};
