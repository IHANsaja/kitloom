import { useId } from "react";

import type { SortId } from "@/lib/catalog/query";

interface SortSelectProps {
  value: SortId;
  options: readonly { id: SortId; label: string }[];
  onChange: (value: SortId) => void;
}

export function SortSelect({ value, options, onChange }: SortSelectProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-2.5">
      <label htmlFor={id} className="eyebrow text-fg-3">
        Sort
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option.id === event.target.value);
          if (next) onChange(next.id);
        }}
        className="h-9 rounded-xs border border-line-control bg-surface pr-8 pl-2.5 text-sm text-fg"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
