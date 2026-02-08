import type { FieldDefinition } from "@shared/types";
import { TagInput } from "./tag-input";

interface FrontmatterFormProps {
  fields: FieldDefinition[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

export function FrontmatterForm({ fields, values, onChange }: FrontmatterFormProps) {
  const updateField = (name: string, value: unknown) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {fields.map((field) => (
        <div key={field.name}>
          {field.type === "boolean" ? (
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}>
              <input
                type="checkbox"
                checked={Boolean(values[field.name])}
                onChange={(e) => updateField(field.name, e.target.checked)}
                style={{
                  width: 16,
                  height: 16,
                  accentColor: "var(--color-accent)",
                }}
              />
              <span style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                fontFamily: "var(--font-mono)",
              }}>
                {field.label}
              </span>
            </label>
          ) : (
            <>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {field.label}
                {field.required && (
                  <span style={{ color: "var(--color-danger)", marginLeft: 2 }}>*</span>
                )}
              </label>
              <FieldInput
                field={field}
                value={values[field.name]}
                onChange={(v) => updateField(field.name, v)}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

interface FieldInputProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  switch (field.type) {
    case "string":
      if (field.name === "description") {
        return (
          <textarea
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            style={{ width: "100%", fontSize: 13, resize: "vertical" }}
          />
        );
      }
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", fontSize: 13 }}
        />
      );

    case "string[]":
      return (
        <TagInput
          value={Array.isArray(value) ? value.map(String) : []}
          onChange={onChange}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={value !== undefined && value !== null ? Number(value) : ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          style={{ width: "100%", fontSize: 13 }}
        />
      );

    case "boolean":
      // Handled inline in FrontmatterForm — shouldn't reach here
      return null;

    case "date":
      return (
        <input
          type="date"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", fontSize: 13 }}
        />
      );

    default:
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", fontSize: 13 }}
        />
      );
  }
}
