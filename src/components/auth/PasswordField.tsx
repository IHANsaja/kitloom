"use client";

import { useId, useState } from "react";

import { inputClass } from "@/components/ui/styles";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** "current-password" for sign-in, "new-password" when choosing one (lets managers generate it). */
  autoComplete: "current-password" | "new-password";
  hint?: string;
  invalid?: boolean;
}

/** A password input with a show/hide toggle. The value never leaves the form it is in. */
export function PasswordField({ label, value, onChange, autoComplete, hint, invalid = false }: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          name={autoComplete === "new-password" ? "new-password" : "password"}
          autoComplete={autoComplete}
          required
          spellCheck={false}
          autoCapitalize="none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={inputClass("pr-16")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-1 right-1 rounded-xs px-2.5 font-mono text-xs text-fg-2 hover:bg-surface-2 hover:text-fg"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-2 text-xs leading-relaxed text-fg-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
