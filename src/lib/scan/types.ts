/**
 * Heddle — Kitloom's pre-download check for agent setups.
 *
 * Named after the part of a loom that lifts each warp thread in turn: Heddle lifts every
 * file of a repository at one exact commit and looks for warning signs. It reports what it
 * found; it never declares anything safe.
 */

export const HEDDLE_VERSION = "1.0";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Category =
  | "execution"
  | "exfiltration"
  | "injection"
  | "persistence"
  | "destructive"
  | "obfuscation"
  | "secrets"
  | "agent-config"
  | "structure";

export interface Finding {
  ruleId: string;
  severity: Severity;
  category: Category;
  title: string;
  /** Why this matters, in plain language. */
  detail: string;
  path: string | null;
  /** 1-based line number, when the finding comes from file contents. */
  line: number | null;
  /** A short, single-line excerpt with invisible characters made visible. */
  excerpt: string | null;
}

/** One entry of the repository tree, as GitHub reports it. */
export interface TreeEntry {
  path: string;
  /** Git file mode: 100644 file, 100755 executable, 120000 symlink, 160000 submodule. */
  mode: string;
  type: "blob" | "tree" | "commit";
  size: number | null;
}

export type Verdict = "clear" | "review" | "caution" | "danger";

export interface HeddleReport {
  version: string;
  repository: string;
  commitSha: string;
  /** The ZIP of exactly the commit that was scanned. */
  archiveUrl: string;
  fileName: string;
  filesTotal: number;
  /** Text files whose contents were read and checked. */
  filesRead: number;
  bytesRead: number;
  /** Files not read: binaries, too large, or past the read budget. */
  filesSkipped: number;
  /** GitHub returned a partial tree (very large repositories). */
  treeTruncated: boolean;
  findings: Finding[];
  /** 0–100. A weighting of the findings, not a probability. */
  riskIndex: number;
  verdict: Verdict;
  durationMs: number;
}

export type StageId = "resolve" | "map" | "structure" | "read" | "config" | "weigh";

export interface Progress {
  stage: StageId;
  /** Files read so far and files to read, during the "read" stage. */
  done: number;
  total: number;
  /** The file being read, for display. */
  current: string | null;
  /** Severity of each finding so far, keyed by file path, for the animation. */
  flagged: ReadonlyMap<string, Severity>;
  /** Every file path in the tree, in order, once the tree is mapped. */
  paths: readonly string[];
}
