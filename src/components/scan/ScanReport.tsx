import { Icon } from "@/components/ui/Icon";
import { cx } from "@/components/ui/styles";
import { SEVERITY_ORDER } from "@/lib/scan/analyze";
import type { Category, Finding, HeddleReport, Severity, Verdict } from "@/lib/scan/types";
import { formatBytes, pluralize } from "@/lib/format";

/** Heddle's result: verdict, numbers, grouped findings, limits, and what to do next. */

export const VERDICT: Record<Verdict, { label: string; summary: string; text: string; rule: string; bar: string }> = {
  clear: {
    label: "No warning signs found",
    summary: "Heddle found nothing that matches its rules in the files it read. That is not the same as safe.",
    text: "text-success",
    rule: "border-l-success",
    bar: "bg-success",
  },
  review: {
    label: "Review recommended",
    summary: "Some files do things worth understanding before you use them, such as starting servers or running commands.",
    text: "text-info",
    rule: "border-l-info",
    bar: "bg-info",
  },
  caution: {
    label: "Warning signs found",
    summary: "Heddle found patterns that can harm your machine or leak data if they are used. Read every flagged file first.",
    text: "text-warning",
    rule: "border-l-warning",
    bar: "bg-warning",
  },
  danger: {
    label: "Serious warning signs",
    summary: "Heddle found patterns strongly associated with malicious code. Do not use this setup unless you can explain every flagged line.",
    text: "text-danger",
    rule: "border-l-danger",
    bar: "bg-danger",
  },
};

export const SEVERITY_STYLE: Record<Severity, { label: string; text: string; dot: string }> = {
  critical: { label: "Critical", text: "text-danger", dot: "bg-danger" },
  high: { label: "High", text: "text-danger", dot: "bg-danger" },
  medium: { label: "Medium", text: "text-warning", dot: "bg-warning" },
  low: { label: "Low", text: "text-info", dot: "bg-info" },
  info: { label: "Info", text: "text-fg-2", dot: "bg-line-control" },
};

interface Group {
  ruleId: string;
  severity: Severity;
  category: Category;
  title: string;
  detail: string;
  items: Finding[];
}

function groupFindings(findings: readonly Finding[]): Group[] {
  const groups = new Map<string, Group>();
  for (const finding of findings) {
    const key = `${finding.ruleId}\u0000${finding.title}`;
    const group = groups.get(key);
    if (group) {
      group.items.push(finding);
      if (SEVERITY_ORDER.indexOf(finding.severity) < SEVERITY_ORDER.indexOf(group.severity)) group.severity = finding.severity;
    } else {
      groups.set(key, { ...finding, items: [finding] });
    }
  }
  return [...groups.values()].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
}

const MAX_ITEMS = 8;

function FindingGroup({ group, open }: { group: Group; open: boolean }) {
  const style = SEVERITY_STYLE[group.severity];
  return (
    <li className="border-b border-line-subtle last:border-b-0">
      <details open={open} className="group/finding">
        <summary className="flex cursor-pointer list-none items-start gap-3 py-3 hover:text-lime">
          <span className={cx("mt-1.5 size-2 shrink-0", style.dot)} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-semibold text-fg">{group.title}</span>
              <span className={cx("font-mono text-[0.6875rem] uppercase", style.text)}>{style.label}</span>
            </span>
            <span className="mt-0.5 block font-mono text-xs text-fg-2">{pluralize(group.items.length, "place")}</span>
          </span>
          <Icon name="chevron" size={14} className="mt-1 shrink-0 text-fg-2 transition-transform duration-150 ease-kit group-open/finding:rotate-90" />
        </summary>
        <div className="pb-4 pl-5">
          <p className="text-sm leading-relaxed text-fg-2">{group.detail}</p>
          <ul className="mt-3 space-y-2">
            {group.items.slice(0, MAX_ITEMS).map((item, index) => (
              <li key={index} className="border border-line-subtle bg-carbon px-3 py-2">
                {item.path ? (
                  <p className="font-mono text-xs break-all text-fg">
                    {item.path}
                    {item.line ? <span className="text-fg-2">:{item.line}</span> : null}
                  </p>
                ) : null}
                {item.excerpt ? <p className="mt-1 font-mono text-xs break-all text-fg-2">{item.excerpt}</p> : null}
              </li>
            ))}
          </ul>
          {group.items.length > MAX_ITEMS ? (
            <p className="mt-2 font-mono text-xs text-fg-2">and {group.items.length - MAX_ITEMS} more</p>
          ) : null}
        </div>
      </details>
    </li>
  );
}

/** Advice that always applies, plus advice triggered by what was found. */
function recommendations(report: HeddleReport): string[] {
  const categories = new Set(report.findings.filter((f) => f.severity !== "info").map((f) => f.category));
  const ruleIds = new Set(report.findings.map((f) => f.ruleId));
  const advice: string[] = [];
  if (report.verdict === "danger" || report.verdict === "caution") {
    advice.push("Open each flagged file on GitHub and read the lines above before downloading. If you cannot explain a line, do not use the setup.");
  }
  advice.push("Scan the ZIP with your antivirus before extracting it, and extract it into an empty folder, not into an existing project.");
  advice.push("Read every file before copying it into a project. Start with the instructions the agent loads automatically (CLAUDE.md, AGENTS.md, rules, skills).");
  if (categories.has("agent-config") || ruleIds.has("install-script")) {
    advice.push("Remove hooks, MCP servers and install scripts you do not need, pin package versions you have reviewed, and keep your agent's permission prompts switched on.");
  }
  if (categories.has("exfiltration") || categories.has("secrets")) {
    advice.push("Try it first somewhere without real credentials — a fresh container, VM or throwaway account — so nothing valuable can be read or sent.");
  } else {
    advice.push("Try it first in a throwaway project or container rather than in work you care about.");
  }
  if (categories.has("injection")) {
    advice.push("Delete any instruction you did not write and do not understand. Hidden or invisible text in agent instructions is never needed.");
  }
  advice.push("Check the repository's commit history and the creator's profile on GitHub. A new account, very recent changes, or a mismatch with the README are reasons for extra care.");
  return advice;
}

export function ScanReport({ report }: { report: HeddleReport }) {
  const verdict = VERDICT[report.verdict];
  const groups = groupFindings(report.findings);
  const counts = SEVERITY_ORDER.map((severity) => [severity, report.findings.filter((f) => f.severity === severity).length] as const);
  const coverage = report.filesTotal === 0 ? 1 : report.filesRead / report.filesTotal;

  return (
    <div className="space-y-6">
      <div className={cx("border border-line border-l-2 bg-surface px-4 py-4", verdict.rule)}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className={cx("text-lg font-semibold tracking-[-0.01em]", verdict.text)} role="status">
            {verdict.label}
          </p>
          <p className="font-mono text-xs text-fg-2 tabular-nums">
            Risk index <span className="text-fg">{report.riskIndex}</span>/100
          </p>
        </div>
        <div className="mt-3 h-1.5 bg-line-subtle" aria-hidden="true">
          <div className={cx("h-full transition-[width] duration-700 ease-kit", verdict.bar)} style={{ width: `${Math.max(2, report.riskIndex)}%` }} />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-fg-2">{verdict.summary}</p>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {[
          ["Files read", `${report.filesRead} of ${report.filesTotal}`],
          ["Text checked", formatBytes(report.bytesRead)],
          ["Commit", report.commitSha.slice(0, 7)],
          ["Time", `${(report.durationMs / 1000).toFixed(1)} s`],
        ].map(([term, value]) => (
          <div key={term} className="bg-carbon px-3 py-2.5">
            <dt className="font-mono text-[0.6875rem] text-fg-3 uppercase">{term}</dt>
            <dd className="mt-0.5 font-mono text-sm text-fg tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {coverage < 1 ? (
        <p className="text-xs leading-relaxed text-fg-2">
          {pluralize(report.filesSkipped, "file")} {report.filesSkipped === 1 ? "was" : "were"} not read: images, fonts, archives, compiled
          files, files over 512 KB, or files past the read limit. Heddle only checked their names.
          {report.treeTruncated ? " GitHub returned only part of this very large repository's file list." : ""}
        </p>
      ) : null}

      <section aria-labelledby="heddle-findings">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2">
          <h3 id="heddle-findings" className="eyebrow text-fg-3">
            Findings
          </h3>
          <p className="flex flex-wrap gap-x-3 font-mono text-xs text-fg-2 tabular-nums">
            {counts
              .filter(([, count]) => count > 0)
              .map(([severity, count]) => (
                <span key={severity} className={SEVERITY_STYLE[severity].text}>
                  {count} {SEVERITY_STYLE[severity].label.toLowerCase()}
                </span>
              ))}
          </p>
        </div>
        {groups.length > 0 ? (
          <ul>
            {groups.map((group, index) => (
              <FindingGroup key={`${group.ruleId}-${group.title}`} group={group} open={index === 0 && (group.severity === "critical" || group.severity === "high")} />
            ))}
          </ul>
        ) : (
          <p className="py-3 text-sm text-fg-2">Nothing matched Heddle&apos;s rules in the files it read.</p>
        )}
      </section>

      <div className="border border-line border-l-2 border-l-warning bg-surface px-4 py-3.5">
        <p className="eyebrow flex items-center gap-2 text-warning">
          <Icon name="alert" size={14} />
          Use at your own risk
        </p>
        <p className="mt-2 text-sm leading-relaxed text-fg-2">
          Heddle looks for known warning signs; it does not prove anything is safe. A setup can
          still contain malware or harmful instructions that Heddle cannot identify: code hidden in
          compiled files or nested archives, code downloaded only when it runs, new tricks its rules
          do not know, or harmful instructions written to sound ordinary. Kitloom does not review
          listings. You download and use this setup at your own risk.
        </p>
      </div>

      <section aria-labelledby="heddle-advice">
        <h3 id="heddle-advice" className="eyebrow text-fg-3">
          What we recommend
        </h3>
        <ol className="mt-3 space-y-2.5">
          {recommendations(report).map((item, index) => (
            <li key={index} className="flex gap-3 text-sm leading-relaxed text-fg-2">
              <span className="w-5 shrink-0 font-mono text-xs text-lime tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              {item}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
