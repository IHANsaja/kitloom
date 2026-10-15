import { createElement } from "react";

import { MARK, MARK_GRID, type MarkTone } from "@/components/ui/logo";

const PATHS = {
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.9-3.9",
  close: "M6 6l12 12M18 6 6 18",
  "arrow-right": "M5 12h14M13 6l6 6-6 6",
  "arrow-up-right": "M7 17 17 7M8 7h9v9",
  copy: "M9 9h10v10H9zM5 15V5h10",
  check: "M5 12.5l4.5 4.5L19 7.5",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  chevron: "M9 6l6 6-6 6",
  file: "M7 3h7l4 4v14H7zM14 3v4h4",
  folder: "M3 6h6l2 2h10v11H3z",
  alert: "M12 4 2.5 20h19L12 4ZM12 10v5M12 17.5v.5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v6M12 7.5v.5",
  menu: "M4 7h16M4 12h16M4 17h16",
  filter: "M4 6h16M7 12h10M10 18h4",
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/** Decorative by default. Give the parent control an accessible name. */
export function Icon({ name, size = 16, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

const MARK_COLOR: Record<MarkTone, string> = {
  tile: "var(--color-lime)",
  ink: "var(--color-carbon)",
  cut: "var(--color-lime)",
};

/** The woolly k: Kitloom's mark, Purl drawn as a lowercase k on a lime tile (ui/logo.ts). */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox={`0 0 ${MARK_GRID} ${MARK_GRID}`} className={className}>
      {MARK.map((shape, index) => {
        const color = MARK_COLOR[shape.tone];
        const paint = shape.stroke ? { fill: "none", stroke: color, strokeWidth: shape.stroke, strokeLinecap: "round" as const } : { fill: color };
        return createElement(shape.el, { key: index, ...shape.attrs, ...paint });
      })}
    </svg>
  );
}
