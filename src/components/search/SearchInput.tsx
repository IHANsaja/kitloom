"use client";

import { useEffect, useId, useRef } from "react";

import { Icon } from "@/components/ui/Icon";
import { cx } from "@/components/ui/styles";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Form field name, so the input also works as a plain GET form field. */
  name?: string;
  label?: string;
  placeholder?: string;
  size?: "md" | "lg";
  className?: string;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Search field with a clear button. Pressing "/" anywhere focuses it, unless the user is
 * already typing in a field. Escape clears it.
 */
export function SearchInput({
  value,
  onChange,
  name = "q",
  label = "Search setups",
  placeholder = "Search name, agent, tag…",
  size = "md",
  className,
}: SearchInputProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      input.current?.focus();
      input.current?.select();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={cx("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-2" />
      <input
        ref={input}
        id={id}
        name={name}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={120}
        value={value}
        placeholder={placeholder}
        aria-keyshortcuts="/"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value !== "") {
            event.preventDefault();
            onChange("");
          }
        }}
        className={cx(
          "w-full rounded-xs border border-line-control bg-surface pr-12 pl-11 text-fg placeholder:text-fg-2 focus-visible:border-lime focus-visible:outline-offset-0 [&::-webkit-search-cancel-button]:hidden",
          size === "lg" ? "h-12 text-base" : "h-11 text-[0.9375rem]",
        )}
      />
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
        {value !== "" ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              input.current?.focus();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xs text-fg-2 hover:bg-surface-2 hover:text-fg"
          >
            <Icon name="close" size={16} />
            <span className="sr-only">Clear search</span>
          </button>
        ) : (
          <span aria-hidden="true" className="kbd mr-1.5 hidden sm:inline-flex">
            /
          </span>
        )}
      </div>
    </div>
  );
}
