import type { ReactNode } from "react";

import { cx } from "@/components/ui/styles";

/**
 * The ruled sheet. Every band of the page is a full-width hairline row whose content sits
 * inside the same centred frame, so vertical rules line up from header to footer.
 * Cells inside a frame set their own horizontal padding with the `cell-x` utility.
 */
export function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("mx-auto w-full max-w-[1360px] border-line lg:border-x", className)}>
      {children}
    </div>
  );
}

interface BandProps {
  children: ReactNode;
  as?: "section" | "div";
  className?: string;
  frameClassName?: string;
  labelledBy?: string;
  id?: string;
}

/** A full-width row of the sheet with a bottom rule. */
export function Band({ children, as: Tag = "section", className, frameClassName, labelledBy, id }: BandProps) {
  return (
    <Tag id={id} aria-labelledby={labelledBy} className={cx("border-b border-line", className)}>
      <Frame className={frameClassName}>{children}</Frame>
    </Tag>
  );
}

interface SectionHeaderProps {
  id: string;
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function SectionHeader({ id, eyebrow, title, children, action }: SectionHeaderProps) {
  return (
    <div className="cell-x flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-line py-6">
      <div className="max-w-[60ch]">
        <p className="eyebrow text-fg-3">{eyebrow}</p>
        <h2 id={id} className="mt-2 text-h2 text-balance">
          {title}
        </h2>
        {children ? <p className="mt-1.5 text-sm text-fg-2 text-pretty">{children}</p> : null}
      </div>
      {action}
    </div>
  );
}
