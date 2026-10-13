import { CopyButton } from "@/components/ui/CopyButton";

interface CodeBlockProps {
  code: string;
  /** Shown in the header bar, e.g. "bash" or a file name. */
  label: string;
  /** Used in the copy confirmation, e.g. "Command". */
  subject?: string;
}

export function CodeBlock({ code, label, subject = "Code" }: CodeBlockProps) {
  return (
    <div className="rounded-xs border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line-subtle py-1.5 pr-1.5 pl-3">
        <span className="font-mono text-xs text-fg-2">{label}</span>
        <CopyButton value={code} subject={subject} />
      </div>
      {/* Scrollable regions must be keyboard-focusable. */}
      <pre tabIndex={0} className="overflow-x-auto px-3 py-3 font-mono text-code text-fg">
        <code>{code}</code>
      </pre>
    </div>
  );
}
