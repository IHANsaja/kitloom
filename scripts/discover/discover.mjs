/**
 * Launch-setup discovery: finds public GitHub repositories that look like agent setups,
 * downloads each one's ZIP into memory, runs Heddle's real checks on every file, and writes
 * a review sheet plus an import-ready CSV to discovery/out/ (git-ignored).
 *
 *   node scripts/discover/discover.mjs [--limit 120]
 *
 * It needs no token: repository search is ~15 unauthenticated API calls, and archives come
 * from codeload.github.com, which is not counted against the API limit. Set GITHUB_TOKEN in
 * your shell to raise the search limits; it is only sent to api.github.com.
 *
 * It only finds and ranks. Every row must be read by a person before it is published, and
 * listings credit the repository owner as the author ("Listed by Kitloom").
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
const { analyzeConfig, analyzeText, analyzeTree, bySeverity, isConfigFile, isReadable, riskIndex, verdictFor } = await import("../../src/lib/scan/analyze.ts");
const { readZip } = await import("./zip.mjs");

const OUT = new URL("../../discovery/out/", import.meta.url);
const LIMIT = Number(process.argv[process.argv.indexOf("--limit") + 1]) || 600;
const TOKEN = process.env.GITHUB_TOKEN ?? "";

const QUERIES = [
  "topic:claude-code",
  "topic:claude-skills",
  "topic:claude-code-skills",
  "topic:claude-code-agents",
  "topic:claude-code-commands",
  "topic:cursor-rules",
  "topic:cursorrules",
  "topic:agents-md",
  "topic:codex-cli",
  "topic:gemini-cli",
  "topic:google-antigravity",
  "topic:windsurf-rules",
  "topic:copilot-instructions",
  '"CLAUDE.md" in:readme',
  '"AGENTS.md" in:readme',
  '".cursor/rules" in:readme',
];

/** Licences that allow reuse. No licence means all rights reserved: never listed. */
const LICENCES = new Set([
  "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "MPL-2.0", "0BSD", "Unlicense",
  "CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0", "GPL-2.0", "GPL-3.0", "LGPL-3.0", "AGPL-3.0", "EPL-2.0", "BSL-1.0", "Zlib",
]);

const MIN_STARS = 10;
const MAX_AGE_DAYS = 365;
// GitHub reports repository size including history; the archive itself is capped separately.
const MAX_REPO_KB = 120_000;
const MAX_ARCHIVE_BYTES = 40 * 1024 * 1024;
/** Source code outside the agent folders: lots of it means a codebase, not a setup. */
const CODE_FILE = /\.(?:js|jsx|ts|tsx|mjs|cjs|py|go|rs|java|kt|swift|rb|php|lua|c|cc|cpp|h|hpp|cs|dart|vue|svelte|scala|ex|exs|zig)$/i;
const MAX_CODE_FILES = 60;
const MAX_FILES = 3000;
const MAX_TEXT = 512 * 1024;

// Which agent a file belongs to. Detected from the files, not declared by the author.
const AGENT_FILES = [
  ["claude-code", /(^|\/)CLAUDE\.md$|(^|\/)\.claude\/|(^|\/)\.claude-plugin\/|(^|\/)skills\/[^/]+\/SKILL\.md$/i],
  ["codex", /(^|\/)AGENTS\.md$|(^|\/)\.codex\//i],
  ["cursor", /(^|\/)\.cursor\/(rules|commands)\/|(^|\/)\.cursorrules$/],
  ["antigravity", /(^|\/)\.agent\/(rules|workflows)\//],
  ["gemini-cli", /(^|\/)GEMINI\.md$|(^|\/)\.gemini\//],
  ["github-copilot", /(^|\/)\.github\/(copilot-instructions\.md|instructions\/|prompts\/|chatmodes\/)/],
  ["windsurf", /(^|\/)\.windsurfrules$|(^|\/)\.windsurf\//],
  ["opencode", /(^|\/)opencode\.json$|(^|\/)\.opencode\//],
  ["aider", /(^|\/)\.aider\.conf\.yml$/],
];
const AGENT_CONFIG = /(^|\/)(CLAUDE|AGENTS|GEMINI)\.md$|(^|\/)\.(claude|claude-plugin|codex|cursor|agent|gemini|windsurf|opencode)\/|(^|\/)\.(cursorrules|windsurfrules|mcp\.json)$|(^|\/)(skills|commands|agents|prompts|rules|workflows|hooks)\/.+\.(md|mdc|json|ya?ml|toml)$|(^|\/)\.github\/(copilot-instructions\.md|instructions\/|prompts\/)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "kitloom-discovery", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    });
    if (response.status === 403 || response.status === 429) {
      const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
      const wait = Math.min(70_000, Math.max(10_000, reset - Date.now() + 1000));
      console.log(`  rate limited, waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  }
  throw new Error(`${path}: still rate limited`);
}

// ── Helpers that shape a row to the database's own checks ──────────────────────────

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64).replace(/-+$/, "");
const titleCase = (s) =>
  s
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .slice(0, 80);

function plainFirstParagraph(markdown) {
  for (const block of markdown.split(/\n\s*\n/)) {
    const text = block
      .replace(/<[^>]+>/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[#>*_`|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length >= 40 && !/^(table of contents|contents)\b/i.test(text)) return text;
  }
  return "";
}

function describe(repo, readme) {
  let text = (repo.description ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 20 && readme) text = plainFirstParagraph(readme);
  if (text.length > 280) text = `${text.slice(0, 277).replace(/\s+\S*$/, "")}…`;
  return text.length >= 20 ? text : null;
}

function categorise(paths, repo) {
  const words = `${repo.name} ${repo.description ?? ""} ${(repo.topics ?? []).join(" ")}`.toLowerCase();
  const categories = new Set();
  if (paths.some((p) => /(^|\/)skills\/[^/]+\/SKILL\.md$|(^|\/)(commands|workflows|prompts)\//i.test(p)) || /\b(skill|workflow|command|subagent)s?\b/.test(words)) {
    categories.add("skills-workflows");
  }
  if (/\b(test|tests|testing|tdd|debug|debugging|qa)\b/.test(words)) categories.add("testing-debugging");
  if (/\b(doc|docs|documentation|readme|changelog|writing)\b/.test(words)) categories.add("documentation");
  if (/\b(productivity|planning|plan|notes|memory|handoff|todo|task)\b/.test(words)) categories.add("productivity");
  if (categories.size === 0 || /\b(review|rules|conventions|guidelines|best practices|coding standards|lint)\b/.test(words)) categories.add("development-review");
  return [...categories].slice(0, 3);
}

const csvCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const pgArray = (items) => `{${items.map((i) => `"${String(i).replace(/["\\]/g, "\\$&")}"`).join(",")}}`;
const toCsv = (rows, columns) => [columns.join(","), ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(","))].join("\n");

// ── 1. Search ──────────────────────────────────────────────────────────────────────

console.log(`Searching GitHub (${QUERIES.length} queries)…`);
const found = new Map();
for (const query of QUERIES) {
  const result = await api(`/search/repositories?q=${encodeURIComponent(`${query} fork:false archived:false`)}&sort=stars&order=desc&per_page=100`);
  for (const repo of result.items ?? []) {
    const hit = found.get(repo.full_name);
    if (hit) hit.queries.push(query);
    else found.set(repo.full_name, { repo, queries: [query] });
  }
  console.log(`  ${query}: ${result.items?.length ?? 0} (total ${found.size})`);
  await sleep(TOKEN ? 2500 : 6500);
}

// ── 2. Pre-filter on metadata alone ────────────────────────────────────────────────

const reviewed = [];
const reject = (repo, reason, extra = {}) =>
  reviewed.push({ repository: repo.full_name, url: repo.html_url, stars: repo.stargazers_count, license: repo.license?.spdx_id ?? "", decision: "skip", reason, ...extra });

const now = Date.now();
const shortlist = [];
for (const { repo, queries } of found.values()) {
  const spdx = repo.license?.spdx_id ?? "";
  const ageDays = (now - Date.parse(repo.pushed_at)) / 86_400_000;
  if (!LICENCES.has(spdx)) reject(repo, spdx ? `licence ${spdx} not on the reuse list` : "no licence (all rights reserved)");
  else if (repo.stargazers_count < MIN_STARS) reject(repo, `fewer than ${MIN_STARS} stars`);
  else if (ageDays > MAX_AGE_DAYS) reject(repo, `no push in ${Math.round(ageDays)} days`);
  else if (repo.size > MAX_REPO_KB) reject(repo, `repository too large (${Math.round(repo.size / 1024)} MB)`);
  else if (!/^[A-Za-z0-9._/-]{1,255}$/.test(repo.default_branch)) reject(repo, "unusual default branch name");
  else if (/^awesome[-_]|[-_]awesome$/i.test(repo.name)) reject(repo, "a list of links, not a setup");
  else shortlist.push({ repo, queries });
}
shortlist.sort((a, b) => b.repo.stargazers_count - a.repo.stargazers_count);
const toScan = shortlist.slice(0, LIMIT);
for (const { repo } of shortlist.slice(LIMIT)) reject(repo, `beyond --limit ${LIMIT}`);
console.log(`${found.size} found, ${shortlist.length} pass metadata checks, scanning ${toScan.length}.`);

// ── 3. Download each archive into memory and run Heddle ────────────────────────────

const accepted = [];
const usedSlugs = new Set();

async function scan({ repo, queries }) {
  const response = await fetch(`https://codeload.github.com/${repo.full_name}/zip/refs/heads/${repo.default_branch}`, {
    headers: { "User-Agent": "kitloom-discovery" },
  });
  if (!response.ok) return reject(repo, `archive download failed (${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_ARCHIVE_BYTES) return reject(repo, "archive too large");

  const zip = readZip(buffer);
  const commitSha = /^[0-9a-f]{40}$/.test(zip.comment.trim()) ? zip.comment.trim() : null;
  const root = zip.entries[0]?.path.split("/")[0] ?? "";
  const entries = zip.entries
    .filter((e) => e.path.startsWith(`${root}/`))
    .map((e) => ({ ...e, path: e.path.slice(root.length + 1) }))
    .filter((e) => e.path.length > 0);
  if (entries.length > MAX_FILES) return reject(repo, `${entries.length} files: a codebase, not a setup`);

  const paths = entries.map((e) => e.path);
  const agents = AGENT_FILES.filter(([, pattern]) => paths.some((p) => pattern.test(p))).map(([id]) => id);
  const configFiles = paths.filter((p) => AGENT_CONFIG.test(p));
  if (agents.length === 0) return reject(repo, "no agent configuration files");
  const codeFiles = paths.filter(
    (p) =>
      CODE_FILE.test(p) &&
      !AGENT_CONFIG.test(p) &&
      !/(^|\/)(skills|hooks|scripts|\.claude|\.cursor|\.codex|\.gemini)\//i.test(p) &&
      !/(^|\/)(tests?|examples?)\//i.test(p),
  );
  if (codeFiles.length > MAX_CODE_FILES) {
    return reject(repo, `${codeFiles.length} source files outside the agent folders: a codebase, not a setup`);
  }
  if (configFiles.length < 3 && configFiles.length / paths.length < 0.2) {
    return reject(repo, `only ${configFiles.length} agent file(s) in ${paths.length}: a project that uses an agent, not a setup`);
  }

  // Heddle, the same passes the site runs before a download.
  const tree = entries.map((e) => ({ path: e.path, mode: e.mode, type: "blob", size: e.size }));
  const findings = [...analyzeTree(tree)];
  let readme = null;
  for (const entry of entries) {
    if (!isReadable(tree.find((t) => t.path === entry.path), MAX_TEXT)) continue;
    const data = entry.read(MAX_TEXT);
    if (!data || data.subarray(0, 8192).includes(0)) continue;
    const text = data.toString("utf8");
    findings.push(...analyzeText(entry.path, text, entry.mode));
    if (isConfigFile(entry.path)) findings.push(...analyzeConfig(entry.path, text));
    if (!readme && /^readme(\.md|\.markdown)?$/i.test(entry.path)) readme = text.slice(0, 40_000);
  }
  findings.sort(bySeverity);
  const verdict = verdictFor(findings);
  const risk = riskIndex(findings);
  const summary = [...new Set(findings.filter((f) => f.severity !== "info").map((f) => `${f.severity}: ${f.title}`))].slice(0, 6).join(" | ");

  const description = describe(repo, readme);
  const base = {
    repository: repo.full_name,
    url: repo.html_url,
    stars: repo.stargazers_count,
    license: repo.license.spdx_id,
    agents: agents.join(" "),
    agent_files: configFiles.length,
    files: paths.length,
    heddle_verdict: verdict,
    heddle_risk_index: risk,
    heddle_findings: summary,
    found_by: queries.join(" ; "),
  };
  if (verdict === "caution" || verdict === "danger") return reviewed.push({ ...base, decision: "skip", reason: `Heddle: ${verdict}` });
  if (!description) return reviewed.push({ ...base, decision: "skip", reason: "no usable description (20–280 chars)" });

  let slug = slugify(repo.name);
  if (slug.length < 3 || usedSlugs.has(slug)) slug = slugify(`${repo.owner.login}-${repo.name}`);
  if (slug.length < 3 || usedSlugs.has(slug)) return reviewed.push({ ...base, decision: "skip", reason: "slug collision" });
  usedSlugs.add(slug);

  const tags = (repo.topics ?? []).filter((t) => /^[a-z0-9][a-z0-9.+-]{0,31}$/.test(t)).slice(0, 8);
  const manifest = paths.filter((p) => p.length <= 260 && !p.split("/").some((s) => s === "" || s === "." || s === "..")).slice(0, 500).map((p) => ({
    path: p,
    sizeBytes: entries.find((e) => e.path === p)?.size ?? null,
  }));

  reviewed.push({ ...base, decision: "candidate", reason: verdict === "review" ? "Heddle: review — read the findings" : "no warning signs" });
  accepted.push({
    slug,
    name: titleCase(repo.name),
    description,
    author: repo.owner.login,
    repository_url: `https://github.com/${repo.full_name}`,
    default_branch: repo.default_branch,
    commit_sha: commitSha,
    license: repo.license.spdx_id,
    agents: pgArray(agents),
    categories: pgArray(categorise(paths, repo)),
    tags: pgArray(tags),
    source_repositories: "{}",
    stars: repo.stargazers_count,
    pushed_at: repo.pushed_at,
    heddle_verdict: verdict,
    heddle_risk_index: risk,
    heddle_findings: summary,
    readme,
    manifest: JSON.stringify(manifest),
  });
}

let done = 0;
const queue = [...toScan];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      try {
        await scan(item);
      } catch (error) {
        reject(item.repo, `scan failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      done += 1;
      if (done % 10 === 0) console.log(`  scanned ${done}/${toScan.length}`);
    }
  }),
);

// ── 4. Write ───────────────────────────────────────────────────────────────────────

mkdirSync(OUT, { recursive: true });
accepted.sort((a, b) => b.stars - a.stars);
reviewed.sort((a, b) => (a.decision === b.decision ? b.stars - a.stars : a.decision === "candidate" ? -1 : 1));

writeFileSync(
  new URL("setups.csv", OUT),
  toCsv(accepted, [
    "slug", "name", "description", "author", "repository_url", "default_branch", "commit_sha", "license", "agents", "categories", "tags",
    "source_repositories", "stars", "pushed_at", "heddle_verdict", "heddle_risk_index", "heddle_findings", "readme", "manifest",
  ]),
);
writeFileSync(
  new URL("review.csv", OUT),
  toCsv(reviewed, [
    "decision", "reason", "repository", "url", "stars", "license", "agents", "agent_files", "files", "heddle_verdict", "heddle_risk_index", "heddle_findings", "found_by",
  ]),
);
console.log(`\n${accepted.length} candidates → discovery/out/setups.csv`);
console.log(`${reviewed.length} repositories with decisions → discovery/out/review.csv`);
