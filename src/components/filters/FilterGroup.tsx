import { cx } from "@/components/ui/styles";

export interface FilterOption<T extends string> {
  id: T;
  label: string;
  count: number;
  hint?: string;
}

interface FilterGroupProps<T extends string> {
  legend: string;
  allLabel: string;
  allCount: number;
  options: readonly FilterOption<T>[];
  selected: T | null;
  onSelect: (id: T | null) => void;
}

interface RowProps {
  label: string;
  count: number;
  pressed: boolean;
  hint?: string;
  onClick: () => void;
}

function Row({ label, count, pressed, hint, onClick }: RowProps) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={pressed}
        title={hint}
        onClick={onClick}
        className={cx(
          "flex min-h-11 w-full items-center justify-between gap-3 border-l-2 py-1.5 pr-4 pl-[calc(1rem-2px)] text-left text-sm transition-colors duration-150 ease-kit sm:pl-[calc(1.5rem-2px)] lg:min-h-9 lg:pr-5 lg:pl-[calc(2.5rem-2px)]",
          pressed ? "border-l-lime bg-surface-2 text-fg" : "border-l-transparent text-fg-2 hover:bg-surface hover:text-fg",
        )}
      >
        <span>{label}</span>
        <span className={cx("font-mono text-xs tabular-nums", pressed ? "text-fg" : "text-fg-2")}>
          {count}
          <span className="sr-only"> {count === 1 ? "setup" : "setups"}</span>
        </span>
      </button>
    </li>
  );
}

/** IDE-sidebar style single-select filter. Counts are computed, never hand-written. */
export function FilterGroup<T extends string>({ legend, allLabel, allCount, options, selected, onSelect }: FilterGroupProps<T>) {
  return (
    <fieldset className="border-b border-line py-4">
      <legend className="eyebrow cell-x float-left mb-2 w-full text-fg-3 lg:text-fg-3">{legend}</legend>
      <ul className="clear-both">
        <Row label={allLabel} count={allCount} pressed={selected === null} onClick={() => onSelect(null)} />
        {options.map((option) => (
          <Row
            key={option.id}
            label={option.label}
            count={option.count}
            hint={option.hint}
            pressed={selected === option.id}
            onClick={() => onSelect(selected === option.id ? null : option.id)}
          />
        ))}
      </ul>
    </fieldset>
  );
}
