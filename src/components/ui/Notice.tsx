import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cx } from "@/components/ui/styles";

const TONES = {
  info: { label: "Note", icon: "info", rule: "border-l-info", text: "text-info" },
  warning: { label: "Caution", icon: "alert", rule: "border-l-warning", text: "text-warning" },
  danger: { label: "Unavailable", icon: "alert", rule: "border-l-danger", text: "text-danger" },
} as const satisfies Record<string, { label: string; icon: IconName; rule: string; text: string }>;

interface NoticeProps {
  tone?: keyof typeof TONES;
  /** Overrides the default label ("Note", "Caution", "Unavailable"). */
  label?: string;
  children: ReactNode;
  className?: string;
}

export function Notice({ tone = "info", label, children, className }: NoticeProps) {
  const t = TONES[tone];
  return (
    <div className={cx("border border-line border-l-2 bg-surface px-4 py-3.5", t.rule, className)}>
      <p className={cx("eyebrow flex items-center gap-2", t.text)}>
        <Icon name={t.icon} size={14} />
        {label ?? t.label}
      </p>
      <div className="mt-2 text-sm leading-relaxed text-fg-2 [&_a]:link [&_code]:font-mono [&_code]:text-code [&_code]:text-fg [&_strong]:font-semibold [&_strong]:text-fg">
        {children}
      </div>
    </div>
  );
}
