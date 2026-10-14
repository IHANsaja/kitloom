/**
 * Builds the ingredient list for Kitloom-authored setups: every SKILL.md in the curated
 * candidates whose licence allows copying with attribution, with its frontmatter name and
 * description, read at the exact commit Heddle checked.
 *
 *   node scripts/discover/skills-index.mjs
 *
 * Reads discovery/out/launch-setups.csv, writes discovery/out/skills-index.json. Files come
 * from raw.githubusercontent.com (not counted against the API limit) and are only read.
 */
import { readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("../../discovery/out/", import.meta.url);
/** Copying a skill into a Kitloom repository is only allowed under these licences. */
const COPYABLE = new Set(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "Unlicense", "CC0-1.0", "CC-BY-4.0", "Zlib", "BSL-1.0"]);
const MAX_PER_REPO = 80;

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

/** Minimal YAML frontmatter reader for the two fields we need. */
function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return {};
  const fields = {};
  const lines = match[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = /^(name|description):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    let value = kv[2].trim();
    if (value === ">" || value === "|" || value === ">-" || value === "|-") {
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
      value = parts.join(" ");
    }
    fields[kv[1]] = value.replace(/^["']|["']$/g, "").slice(0, 600);
  }
  return fields;
}

const rows = parseCsv(readFileSync(new URL("launch-setups.csv", OUT), "utf8"));
const index = [];
let repos = 0;
for (const row of rows) {
  if (!COPYABLE.has(row.license)) continue;
  const manifest = JSON.parse(row.manifest || "[]");
  const skills = manifest.map((m) => m.path).filter((p) => /(^|\/)SKILL\.md$/.test(p)).slice(0, MAX_PER_REPO);
  if (skills.length === 0) continue;
  repos += 1;
  const repo = row.repository_url.replace("https://github.com/", "");
  const results = await Promise.all(
    skills.map(async (path) => {
      const url = `https://raw.githubusercontent.com/${repo}/${row.commit_sha}/${path.split("/").map(encodeURIComponent).join("/")}`;
      try {
        const response = await fetch(url, { headers: { "User-Agent": "kitloom-discovery" } });
        if (!response.ok) return null;
        const text = (await response.text()).slice(0, 200_000);
        const meta = frontmatter(text);
        return {
          repo,
          commit: row.commit_sha,
          license: row.license,
          stars: Number(row.stars),
          heddle: row.heddle_verdict,
          path,
          dir: path.replace(/\/?SKILL\.md$/, ""),
          name: meta.name ?? path.split("/").at(-2) ?? "",
          description: meta.description ?? "",
          lines: text.split("\n").length,
        };
      } catch {
        return null;
      }
    }),
  );
  index.push(...results.filter(Boolean));
  process.stdout.write(`\r${repos} repos, ${index.length} skills`);
}
writeFileSync(new URL("skills-index.json", OUT), JSON.stringify(index, null, 1));
console.log(`\n${index.length} skills from ${repos} repositories → discovery/out/skills-index.json`);
