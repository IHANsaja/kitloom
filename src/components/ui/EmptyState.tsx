import type { ReactNode } from "react";
import { EmptyLoom } from "@/components/motion/Illustrations";

interface EmptyStateProps {
  /** A plain statement of the state, e.g. "0 results". */
  eyebrow: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function EmptyState({ eyebrow, title, children, actions }: EmptyStateProps) {
  return (
    <div className="cell-x flex flex-col gap-8 py-14 md:flex-row md:items-center md:justify-between">
      <div>
      <p className="eyebrow text-fg-3">{eyebrow}</p>
      <h2 className="mt-3 text-h2 text-balance">{title}</h2>
      <div className="mt-2 max-w-[56ch] text-sm leading-relaxed text-fg-2 text-pretty">{children}</div>
      {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      <EmptyLoom className="h-[84px] w-auto shrink-0 self-start md:mr-6 md:self-center" />
    </div>
  );
}
