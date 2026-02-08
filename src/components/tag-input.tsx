import { useState, type KeyboardEvent } from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder = "Add tag..." }: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 4,
      padding: "6px 8px",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-md)",
      background: "var(--color-surface)",
      minHeight: 38,
      alignItems: "center",
      cursor: "text",
    }}
    onClick={(e) => {
      const input = (e.currentTarget.querySelector("input") as HTMLInputElement);
      input?.focus();
    }}
    >
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            background: "var(--color-bg-muted)",
            borderRadius: 99,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(i); }}
            style={{
              padding: 0,
              lineHeight: 1,
              color: "var(--color-text-muted)",
              fontSize: 14,
            }}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={value.length === 0 ? placeholder : ""}
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          flex: 1,
          minWidth: 80,
          padding: "2px 4px",
          fontSize: 13,
        }}
      />
    </div>
  );
}
