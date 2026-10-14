/**
 * Heddle — runs in the visitor's browser before a download.
 *
 *   resolve   pin the branch to one commit SHA, so what is checked is what is downloaded
 *   map       read the full file tree at that commit (one GitHub API call)
 *   structure check the tree itself (analyze.ts, pass 1)
 *   read      fetch every readable text file from raw.githubusercontent.com — not counted
 *             against the GitHub API rate limit — and check it line by line (pass 2)
 *   config    parse agent configuration as data (pass 3)
 *   weigh     risk index and verdict
 *
 * It costs two GitHub API calls per scan. Nothing is executed: files are only read as text.
 */
import {
  analyzeConfig,
  analyzeText,
  analyzeTree,
  bySeverity,
  isConfigFile,
  isReadable,
  readPriority,
  riskIndex,
  verdictFor,
} from "@/lib/scan/analyze";
import { HEDDLE_VERSION, type Finding, type HeddleReport, type Progress, type Severity, type StageId, type TreeEntry } from "@/lib/scan/types";
import { SEVERITY_ORDER } from "@/lib/scan/analyze";
import { githubCommitArchiveUrl, parseGitHubRepoUrl } from "@/lib/packages/urls";

export const LIMITS = {
  /** Larger files are not read (they are counted as skipped). */
  maxFileBytes: 512 * 1024,
  /** Stop reading after this many bytes or files in total. */
  maxTotalBytes: 12 * 1024 * 1024,
  maxFiles: 800,
  concurrency: 8,
} as const;

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";

export type HeddleErrorKind = "rate-limit" | "not-found" | "network" | "aborted" | "unexpected";

export class HeddleError extends Error {
  constructor(
    readonly kind: HeddleErrorKind,
    message: string,
  ) {
    super(message);
  }
}

interface RunOptions {
  repositoryUrl: string;
  /** Branch name, or "HEAD" for the default branch. */
  ref: string;
  signal: AbortSignal;
  onProgress: (progress: Progress) => void;
}

async function request(url: string, signal: AbortSignal, accept?: string): Promise<Response> {
  try {
    return await fetch(url, { signal, headers: accept ? { Accept: accept } : undefined, cache: "no-store" });
  } catch {
    if (signal.aborted) throw new HeddleError("aborted", "The check was cancelled.");
    throw new HeddleError("network", "GitHub could not be reached. Check your connection and try again.");
  }
}

function apiFailure(response: Response): HeddleError {
  if (response.status === 403 || response.status === 429) {
    return new HeddleError("rate-limit", "GitHub's hourly limit for this network has been reached, so the check could not run.");
  }
  if (response.status === 404 || response.status === 422) {
    return new HeddleError("not-found", "GitHub has no public repository or branch at this address any more.");
  }
  return new HeddleError("unexpected", `GitHub answered with an error (${response.status}).`);
}

function toEntries(raw: unknown): TreeEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: TreeEntry[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const { path, mode, type, size } = item as Record<string, unknown>;
    if (typeof path !== "string" || typeof mode !== "string" || (type !== "blob" && type !== "tree" && type !== "commit")) continue;
    if (path.length === 0 || path.length > 1024) continue;
    entries.push({ path, mode, type, size: typeof size === "number" && size >= 0 ? size : null });
  }
  return entries;
}

function worst(a: Severity | undefined, b: Severity): Severity {
  return a === undefined || SEVERITY_ORDER.indexOf(b) < SEVERITY_ORDER.indexOf(a) ? b : a;
}

export async function runHeddle({ repositoryUrl, ref, signal, onProgress }: RunOptions): Promise<HeddleReport> {
  const started = performance.now();
  const repo = parseGitHubRepoUrl(repositoryUrl);
  if (!repo || repo.url !== repositoryUrl) throw new HeddleError("unexpected", "This listing's repository link is not valid.");
  const apiBase = `${API}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;

  const flagged = new Map<string, Severity>();
  let paths: string[] = [];
  const report = (stage: StageId, done = 0, total = 0, current: string | null = null) =>
    onProgress({ stage, done, total, current, flagged, paths });
  const findings: Finding[] = [];
  const record = (items: Finding[]) => {
    for (const finding of items) {
      findings.push(finding);
      if (finding.path && finding.severity !== "info") flagged.set(finding.path, worst(flagged.get(finding.path), finding.severity));
    }
  };

  // 1 — resolve: the branch becomes one fixed commit.
  report("resolve");
  const commitResponse = await request(`${apiBase}/commits/${encodeURIComponent(ref)}`, signal, "application/vnd.github.sha");
  if (!commitResponse.ok) throw apiFailure(commitResponse);
  const commitSha = (await commitResponse.text()).trim();
  if (!/^[0-9a-f]{40}$/.test(commitSha)) throw new HeddleError("unexpected", "GitHub did not return a commit for this branch.");

  // 2 — map: every path at that commit.
  report("map");
  const treeResponse = await request(`${apiBase}/git/trees/${commitSha}?recursive=1`, signal);
  if (!treeResponse.ok) throw apiFailure(treeResponse);
  const tree = (await treeResponse.json()) as { tree?: unknown; truncated?: unknown };
  const entries = toEntries(tree.tree);
  const files = entries.filter((entry) => entry.type === "blob");
  paths = files.map((entry) => entry.path);

  // 3 — structure.
  report("structure", 0, files.length);
  record(analyzeTree(entries));

  // 4 — read, highest-risk kinds first, within the budget.
  const candidates = files
    .filter((entry) => isReadable(entry, LIMITS.maxFileBytes))
    .sort((a, b) => readPriority(a) - readPriority(b) || a.path.localeCompare(b.path));
  const queue: TreeEntry[] = [];
  let budget = 0;
  for (const entry of candidates) {
    if (queue.length >= LIMITS.maxFiles) break;
    const size = entry.size ?? 0;
    if (budget + size > LIMITS.maxTotalBytes) continue;
    budget += size;
    queue.push(entry);
  }

  const configTexts: { path: string; text: string }[] = [];
  let done = 0;
  let filesRead = 0;
  let bytesRead = 0;
  report("read", 0, queue.length);
  const rawBase = `${RAW}/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/${commitSha}`;

  const worker = async (cursor: { next: number }) => {
    while (cursor.next < queue.length) {
      const entry = queue[cursor.next++];
      if (!entry) break;
      const response = await request(`${rawBase}/${entry.path.split("/").map(encodeURIComponent).join("/")}`, signal);
      if (response.ok) {
        const text = await response.text();
        // A NUL byte means binary content despite the name: count it as skipped.
        if (!text.slice(0, 8192).includes("\u0000")) {
          filesRead += 1;
          bytesRead += text.length;
          record(analyzeText(entry.path, text, entry.mode));
          if (isConfigFile(entry.path)) configTexts.push({ path: entry.path, text });
        }
      }
      done += 1;
      report("read", done, queue.length, entry.path);
    }
  };
  const cursor = { next: 0 };
  await Promise.all(Array.from({ length: Math.min(LIMITS.concurrency, queue.length) }, () => worker(cursor)));

  // 5 — config.
  report("config", done, queue.length);
  for (const { path, text } of configTexts) record(analyzeConfig(path, text));

  // 6 — weigh.
  report("weigh", done, queue.length);
  findings.sort(bySeverity);

  return {
    version: HEDDLE_VERSION,
    repository: `${repo.owner}/${repo.repo}`,
    commitSha,
    archiveUrl: githubCommitArchiveUrl(repo.url, commitSha),
    fileName: `${repo.repo}-${commitSha}.zip`,
    filesTotal: files.length,
    filesRead,
    bytesRead,
    filesSkipped: files.length - filesRead,
    treeTruncated: tree.truncated === true,
    findings,
    riskIndex: riskIndex(findings),
    verdict: verdictFor(findings),
    durationMs: Math.round(performance.now() - started),
  };
}
