/**
 * weave: builds one Kitloom setup ("kit") for every coding agent from its neutral spec.
 *
 *   node scripts/kits/weave.mjs <slug>
 *
 * Reads   discovery/kits/specs/<slug>/  (see KIT_SPEC.md)
 * Writes  discovery/kits/build/<slug>/  the repository contents
 *         discovery/kits/build/<slug>.meta.json  the database row for Kitloom
 *
 * Third-party skills are copied from their source repository at the exact commit Kitloom
 * reviewed, only under licences that allow it, with the licence text and a NOTICE beside
 * them. The finished kit is checked with Heddle; a kit with warning signs fails the build.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

register("../discover/alias-loader.mjs", import.meta.url);
const { analyzeConfig, analyzeText, analyzeTree, bySeverity, isConfigFile, riskIndex, verdictFor } = await import("../../src/lib/scan/analyze.ts");

const ROOT = fileURLToPath(new URL("../../discovery/", import.meta.url));
const slug = process.argv[2];
if (!slug) throw new Error("Usage: node scripts/kits/weave.mjs <slug>");

const SPEC = join(ROOT, "kits", "specs", slug);
const BUILD = join(ROOT, "kits", "build", slug);
const OWNER = process.env.KITLOOM_GITHUB_OWNER ?? "kitloomlk-stack";
const YEAR = new Date().getUTCFullYear();

/** Every agent Kitloom knows; the kit is generated for all of them. */
const AGENTS = ["claude-code", "codex", "cursor", "antigravity", "gemini-cli", "github-copilot", "windsurf", "opencode", "aider"];
const CATEGORIES = new Set(["skills-workflows", "development-review", "testing-debugging", "documentation", "productivity"]);
const COPYABLE = new Set(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "Unlicense", "CC0-1.0", "CC-BY-4.0", "Zlib", "BSL-1.0"]);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ── Input ──────────────────────────────────────────────────────────────────────────

const read = (path) => readFileSync(join(SPEC, path), "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
const kit = JSON.parse(read("kit.json"));

function fail(message) {
  throw new Error(`[${slug}] ${message}`);
}
if (kit.slug !== slug || !KEBAB.test(slug) || slug.length < 3 || slug.length > 64) fail("slug must match the folder and be kebab-case, 3–64 characters");
if (typeof kit.name !== "string" || kit.name.trim().length < 2 || kit.name.length > 80) fail("name must be 2–80 characters");
if (typeof kit.description !== "string" || kit.description.trim().length < 20 || kit.description.length > 280) fail("description must be 20–280 characters");
if (!Array.isArray(kit.categories) || kit.categories.length < 1 || kit.categories.length > 5 || !kit.categories.every((c) => CATEGORIES.has(c))) fail("bad categories");
const tags = (kit.tags ?? []).filter((t) => /^[a-z0-9][a-z0-9.+-]{0,31}$/.test(t)).slice(0, 8);
for (const group of ["rules", "commands", "agents"]) {
  for (const item of kit[group] ?? []) if (!KEBAB.test(item.name ?? "")) fail(`${group}: "${item.name}" is not kebab-case`);
}

// Index of reviewed skills and the commits/manifests they were reviewed at.
const index = new Map(JSON.parse(readFileSync(join(ROOT, "out", "skills-index.json"), "utf8")).map((s) => [`${s.repo}#${s.dir}`, s]));
const manifests = new Map();
{
  const csv = readFileSync(join(ROOT, "out", "launch-setups.csv"), "utf8");
  // Only the columns we need: repository_url and manifest (last column).
  const rows = parseCsv(csv);
  for (const row of rows) manifests.set(row.repository_url.replace("https://github.com/", ""), JSON.parse(row.manifest || "[]"));
}

// ── Output helpers ─────────────────────────────────────────────────────────────────

rmSync(BUILD, { recursive: true, force: true });
const files = new Map();
/** Text gets a final newline; binary files (images in a skill folder) are kept byte for byte. */
const put = (path, content) => {
  if (files.has(path)) fail(`two outputs for ${path}`);
  files.set(path, typeof content !== "string" || content.endsWith("\n") ? content : `${content}\n`);
};
const yamlString = (s) => JSON.stringify(String(s));
const tomlString = (s) => JSON.stringify(String(s));
const tomlMultiline = (s) => `'''\n${String(s).replace(/'''/g, "' ''")}\n'''`;

// ── Skills (third-party, copied with their licence) ────────────────────────────────

const RAW = "https://raw.githubusercontent.com";
async function raw(repo, commit, path) {
  const response = await fetch(`${RAW}/${repo}/${commit}/${path.split("/").map(encodeURIComponent).join("/")}`, { headers: { "User-Agent": "kitloom-weave" } });
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.subarray(0, 8192).includes(0)) return { binary: buffer };
  return { text: buffer.toString("utf8") };
}
const licenceCache = new Map();
async function licenceText(repo, commit) {
  const key = `${repo}@${commit}`;
  if (!licenceCache.has(key)) {
    let text = null;
    for (const name of ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "LICENCE.md", "COPYING", "license", "license.md"]) {
      const file = await raw(repo, commit, name);
      if (file?.text) {
        text = file.text;
        break;
      }
    }
    licenceCache.set(key, text);
  }
  return licenceCache.get(key);
}

function setFrontmatterName(text, name) {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!match) return { text: `---\nname: ${name}\ndescription: ${yamlString(`Skill ${name}.`)}\n---\n\n${text}`, changed: true };
  const body = match[1];
  if (new RegExp(`^name:\\s*["']?${name}["']?\\s*$`, "m").test(body)) return { text, changed: false };
  const next = /^name:.*$/m.test(body) ? body.replace(/^name:.*$/m, `name: ${name}`) : `name: ${name}\n${body}`;
  return { text: text.replace(match[0], `---\n${next}\n---`), changed: true };
}

const skillDirs = new Set();
const credits = [];
const skillLines = [];
for (const entry of kit.skills ?? []) {
  const meta = index.get(entry.id);
  if (!meta) fail(`unknown skill id ${entry.id}`);
  if (!COPYABLE.has(meta.license)) fail(`${entry.id}: licence ${meta.license} does not allow copying`);
  const manifest = manifests.get(meta.repo) ?? [];
  const prefix = meta.dir ? `${meta.dir}/` : "";
  const sources = manifest.map((m) => m.path).filter((p) => p.startsWith(prefix) && (meta.dir !== "" || p === "SKILL.md")).slice(0, 80);
  if (!sources.includes(`${prefix}SKILL.md`)) fail(`${entry.id}: SKILL.md not in the reviewed file list`);

  let folder = String(meta.name || meta.dir.split("/").at(-1) || "skill").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
  if (!folder || skillDirs.has(folder)) folder = `${folder || "skill"}-${meta.repo.split("/")[0].toLowerCase()}`.replace(/[^a-z0-9-]/g, "-").slice(0, 64);
  skillDirs.add(folder);

  const changes = [];
  const copied = new Map();
  for (const path of sources) {
    const file = await raw(meta.repo, meta.commit, path);
    if (!file) fail(`${entry.id}: could not fetch ${path}`);
    const rel = path.slice(prefix.length);
    if (rel === "SKILL.md") {
      const named = setFrontmatterName(file.text, folder);
      if (named.changed) changes.push(`set the SKILL.md \`name\` to \`${folder}\` so it matches its folder, as the Agent Skills format requires`);
      copied.set(rel, named.text);
    } else {
      copied.set(rel, file.text ?? file.binary);
    }
  }
  const licence = await licenceText(meta.repo, meta.commit);
  if (!licence) fail(`${entry.id}: no licence file found in ${meta.repo}`);
  const notice = [
    `# ${folder}`,
    "",
    `This skill is copied from [${meta.repo}](https://github.com/${meta.repo}/tree/${meta.commit}/${meta.dir}) at commit \`${meta.commit.slice(0, 12)}\`, under the ${meta.license} licence (see LICENSE.txt in this folder).`,
    "",
    changes.length > 0 ? `Changes made by Kitloom: ${changes.join("; ")}.` : "Kitloom made no changes to its files.",
  ].join("\n");

  for (const base of [".agents/skills", ".claude/skills"]) {
    for (const [rel, content] of copied) put(`${base}/${folder}/${rel}`, content);
    put(`${base}/${folder}/LICENSE.txt`, licence);
    put(`${base}/${folder}/NOTICE.md`, notice);
  }
  credits.push({ folder, repo: meta.repo, commit: meta.commit, license: meta.license, stars: meta.stars, dir: meta.dir });
  skillLines.push(`- \`${folder}\` — ${entry.why ?? meta.description.slice(0, 160)}`);
}

// ── Instructions ───────────────────────────────────────────────────────────────────

let instructions = read("AGENTS.md").trim();
const rules = kit.rules ?? [];
if (rules.length > 0) {
  instructions += [
    "",
    "",
    "## Scoped rules",
    "",
    "Agents that support scoped rules load these automatically. If yours does not, read the matching file before editing files it covers:",
    "",
    ...rules.map((r) => `- \`.agents/rules/${r.name}.md\` — ${r.alwaysApply ? "always" : `for \`${(r.globs ?? []).join("`, `")}\``}: ${r.description}`),
  ].join("\n");
}
put("AGENTS.md", instructions);
put("CLAUDE.md", "@AGENTS.md");
put(".gemini/settings.json", JSON.stringify({ context: { fileName: ["AGENTS.md"] } }, null, 2));
put(".aider.conf.yml", "# Aider does not read AGENTS.md on its own; this loads it read-only.\nread:\n  - AGENTS.md");

// ── Rules ──────────────────────────────────────────────────────────────────────────

for (const rule of rules) {
  const body = read(`rules/${rule.name}.md`).trim();
  const globs = rule.alwaysApply ? [] : rule.globs ?? [];
  if (!rule.alwaysApply && globs.length === 0) fail(`rule ${rule.name} needs globs or alwaysApply`);
  // Claude Code
  put(`.claude/rules/${rule.name}.md`, globs.length ? `---\npaths:\n${globs.map((g) => `  - ${yamlString(g)}`).join("\n")}\n---\n\n${body}` : body);
  // Cursor
  put(`.cursor/rules/${rule.name}.mdc`, `---\ndescription: ${yamlString(rule.description)}\nglobs: ${globs.join(",")}\nalwaysApply: ${rule.alwaysApply ? "true" : "false"}\n---\n\n${body}`);
  // GitHub Copilot
  put(`.github/instructions/${rule.name}.instructions.md`, `---\napplyTo: ${yamlString(globs.length ? globs.join(",") : "**")}\ndescription: ${yamlString(rule.description)}\n---\n\n${body}`);
  // Antigravity and Windsurf/Devin share the trigger format.
  const trigger = rule.alwaysApply
    ? "trigger: always_on"
    : `trigger: glob\nglobs: ${yamlString(globs.join(","))}\ndescription: ${yamlString(rule.description)}`;
  put(`.agents/rules/${rule.name}.md`, `---\n${trigger}\n---\n\n${body}`);
  put(`.windsurf/rules/${rule.name}.md`, `---\n${trigger}\n---\n\n${body}`);
}

// ── Commands (skills you invoke by name, plus the formats that still have commands) ─

for (const command of kit.commands ?? []) {
  const body = read(`commands/${command.name}.md`).trim();
  const skill = `---\nname: ${command.name}\ndescription: ${yamlString(command.description)}\ndisable-model-invocation: true\n---\n\n${body}`;
  if (skillDirs.has(command.name)) fail(`command ${command.name} clashes with a skill folder`);
  put(`.agents/skills/${command.name}/SKILL.md`, skill);
  put(`.claude/skills/${command.name}/SKILL.md`, skill);
  put(`.gemini/commands/${command.name}.toml`, `description = ${tomlString(command.description)}\nprompt = ${tomlMultiline(body)}`);
  put(`.github/prompts/${command.name}.prompt.md`, `---\nname: ${yamlString(command.name)}\ndescription: ${yamlString(command.description)}\n---\n\n${body}`);
  put(`.opencode/commands/${command.name}.md`, `---\ndescription: ${yamlString(command.description)}\n---\n\n${body}`);
  put(`.windsurf/workflows/${command.name}.md`, `# ${command.name}\n\n${command.description}\n\n${body}`);
}

// ── Sub-agents ─────────────────────────────────────────────────────────────────────

for (const agent of kit.agents ?? []) {
  const body = read(`agents/${agent.name}.md`).trim();
  const tools = Array.isArray(agent.tools) && agent.tools.length ? `\ntools: ${agent.tools.join(", ")}` : "";
  const md = `---\nname: ${agent.name}\ndescription: ${yamlString(agent.description)}${tools}\n---\n\n${body}`;
  put(`.claude/agents/${agent.name}.md`, md); // also read by Cursor and GitHub Copilot
  put(`.gemini/agents/${agent.name}.md`, `---\nname: ${agent.name}\ndescription: ${yamlString(agent.description)}\n---\n\n${body}`);
  put(`.agents/agents/${agent.name}.md`, `---\nname: ${agent.name}\ndescription: ${yamlString(agent.description)}\n---\n\n${body}`);
  put(`.opencode/agents/${agent.name}.md`, `---\ndescription: ${yamlString(agent.description)}\nmode: subagent\n---\n\n${body}`);
  put(`.codex/agents/${agent.name}.toml`, `name = ${tomlString(agent.name)}\ndescription = ${tomlString(agent.description)}\ndeveloper_instructions = ${tomlMultiline(body)}`);
}

// ── README, licence, notices ───────────────────────────────────────────────────────

const commandLines = (kit.commands ?? []).map((c) => `- \`${c.name}\` — ${c.description}`);
const agentLines = (kit.agents ?? []).map((a) => `- \`${a.name}\` — ${a.description}`);
put(
  "README.md",
  [
    `# ${kit.name}`,
    "",
    kit.description,
    "",
    `A setup for AI coding agents, made by [Kitloom](https://kitloom.site). One source, generated for every major agent: Claude Code, OpenAI Codex, Cursor, Google Antigravity, Gemini CLI, GitHub Copilot, Windsurf (Devin), opencode and Aider.`,
    "",
    "## Install",
    "",
    "1. Download this repository as a ZIP, or use the **Check and download** button on its Kitloom page, which checks it first.",
    "2. Read the files. Nothing here runs on its own: the kit has no hooks and no install scripts.",
    "3. Copy the folders and files you want into the root of your project. `AGENTS.md` is the shared instructions file; edit it to fit your project.",
    "",
    "## What is inside",
    "",
    "### Skills",
    "",
    ...skillLines,
    "",
    ...(commandLines.length ? ["### Commands", "", "Invoke by name (for example `/" + (kit.commands[0]?.name ?? "") + "`).", "", ...commandLines, ""] : []),
    ...(agentLines.length ? ["### Sub-agents", "", ...agentLines, ""] : []),
    ...(rules.length ? ["### Scoped rules", "", ...rules.map((r) => `- \`${r.name}\` — ${r.description}`), ""] : []),
    "## Where each agent finds it",
    "",
    "| Agent | Instructions | Skills and commands | Rules | Sub-agents |",
    "|---|---|---|---|---|",
    "| Claude Code | `CLAUDE.md` (imports `AGENTS.md`) | `.claude/skills/` | `.claude/rules/` | `.claude/agents/` |",
    "| OpenAI Codex | `AGENTS.md` | `.agents/skills/` | listed in `AGENTS.md` | `.codex/agents/` |",
    "| Cursor | `AGENTS.md` | `.agents/skills/`, `.claude/skills/` | `.cursor/rules/` | `.claude/agents/` |",
    "| Google Antigravity | `AGENTS.md` | `.agents/skills/` | `.agents/rules/` | `.agents/agents/` |",
    "| Gemini CLI | `AGENTS.md` via `.gemini/settings.json` | `.agents/skills/`, `.gemini/commands/` | listed in `AGENTS.md` | `.gemini/agents/` |",
    "| GitHub Copilot | `AGENTS.md` | `.agents/skills/`, `.github/prompts/` | `.github/instructions/` | `.claude/agents/` |",
    "| Windsurf (Devin) | `AGENTS.md` | `.agents/skills/`, `.windsurf/workflows/` | `.windsurf/rules/` | — |",
    "| opencode | `AGENTS.md` | `.agents/skills/`, `.opencode/commands/` | listed in `AGENTS.md` | `.opencode/agents/` |",
    "| Aider | `AGENTS.md` via `.aider.conf.yml` | — | — | — |",
    "",
    "Skills are stored twice (`.agents/skills/` and `.claude/skills/`) because Claude Code reads only its own folder. Agents that read both may list a skill twice; delete the copy you do not need.",
    "",
    "## Credits",
    "",
    "The skills come from these open-source repositories, each under its own licence. Their licence and a notice are kept beside every copied skill.",
    "",
    "| Skill | Source | Licence |",
    "|---|---|---|",
    ...credits.map((c) => `| \`${c.folder}\` | [${c.repo}](https://github.com/${c.repo}) at \`${c.commit.slice(0, 7)}\` | ${c.license} |`),
    "",
    "Everything else in this repository (instructions, rules, commands, sub-agents) is by Kitloom under the MIT licence.",
    "",
    "## Use at your own risk",
    "",
    "Read every file before you use it. Agent instructions can make an agent run commands on your machine. This kit was checked with Kitloom's pre-download check, which looks for warning signs but cannot prove anything is safe.",
  ].join("\n"),
);
put(
  "LICENSE",
  `MIT License\n\nCopyright (c) ${YEAR} Kitloom\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n\nThis licence covers the files written by Kitloom. Skills copied from other\nrepositories keep their own licences: see LICENSE.txt and NOTICE.md in each skill\nfolder, and THIRD_PARTY_NOTICES.md.`,
);
put(
  "THIRD_PARTY_NOTICES.md",
  [
    "# Third-party notices",
    "",
    "This kit includes skills from the repositories below. Each is used under its licence; the full licence text is in `LICENSE.txt` inside the skill's folder.",
    "",
    ...credits.map((c) => `- **${c.folder}** — https://github.com/${c.repo}/tree/${c.commit}/${c.dir} (${c.license})`),
  ].join("\n"),
);
put(".gitattributes", "* text=auto eol=lf");

// ── Write, then check the result with Heddle ───────────────────────────────────────

for (const [path, content] of files) {
  const target = join(BUILD, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

const tree = [...files.keys()].map((path) => ({ path, mode: "100644", type: "blob", size: Buffer.byteLength(files.get(path)) }));
const findings = [...analyzeTree(tree)];
for (const [path, content] of files) {
  if (typeof content !== "string") continue;
  findings.push(...analyzeText(path, content));
  if (isConfigFile(path)) findings.push(...analyzeConfig(path, content));
}
findings.sort(bySeverity);
const verdict = verdictFor(findings);
const summary = findings.filter((f) => f.severity !== "info" && f.severity !== "low").map((f) => `${f.severity} ${f.ruleId} ${f.path}:${f.line ?? ""} ${f.excerpt ?? ""}`);

const sourceRepositories = [...new Map(credits.sort((a, b) => b.stars - a.stars).map((c) => [c.repo, `https://github.com/${c.repo}`])).values()].slice(0, 8);
const meta = {
  slug,
  name: kit.name.trim(),
  description: kit.description.trim(),
  agents: AGENTS,
  categories: kit.categories,
  tags,
  version: "1.0.0",
  license: "MIT",
  repository_url: `https://github.com/${OWNER}/${slug}`,
  default_branch: "main",
  source_repositories: sourceRepositories,
  readme: files.get("README.md").slice(0, 40_000),
  manifest: tree.slice(0, 500).map((f) => ({ path: f.path, sizeBytes: f.size })),
  heddle: { verdict, riskIndex: riskIndex(findings), findings: summary.slice(0, 20) },
};
writeFileSync(join(ROOT, "kits", "build", `${slug}.meta.json`), JSON.stringify(meta, null, 2));

console.log(`${slug}: ${files.size} files, ${credits.length} skills, Heddle ${verdict} (risk ${meta.heddle.riskIndex})`);
for (const line of summary.slice(0, 15)) console.log(`  ${line}`);
if (verdict === "caution" || verdict === "danger") {
  console.error(`${slug}: Heddle found warning signs; not publishable until fixed.`);
  process.exit(2);
}

// ── CSV reader ─────────────────────────────────────────────────────────────────────

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  row.push(cell);
  rows.push(row);
  const header = rows.shift();
  return rows.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((k, i) => [k, r[i]])));
}
