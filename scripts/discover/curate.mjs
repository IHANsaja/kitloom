/**
 * Applies a person's review to the discovery output: drops excluded repositories (with the
 * reason), gives generic repository names a clearer listing name, flags descriptions that
 * are not in English, and writes discovery/out/launch-setups.csv.
 *
 *   node scripts/discover/curate.mjs
 *
 * Decisions live in discovery/out/curation.json (git-ignored, like all candidate data):
 *   { "exclude": { "owner/repo": "reason" }, "genericNames": ["skills", …] }
 */
import { readFileSync, writeFileSync } from "node:fs";

const OUT = new URL("../../discovery/out/", import.meta.url);
const curation = JSON.parse(readFileSync(new URL("curation.json", OUT), "utf8"));
const generic = new Set(curation.genericNames.map((n) => n.toLowerCase()));

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
  return { header, rows: rows.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((k, i) => [k, r[i]]))) };
}

const cell = (value) => {
  const text = value ?? "";
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const { header, rows } = parseCsv(readFileSync(new URL("setups.csv", OUT), "utf8"));
const kept = [];
const dropped = [];
const slugs = new Set();

for (const row of rows) {
  const repo = row.repository_url.replace("https://github.com/", "");
  const reason = curation.exclude[repo];
  if (reason) {
    dropped.push(`${repo}: ${reason}`);
    continue;
  }
  const [owner, name] = repo.split("/");
  if (generic.has(name.toLowerCase())) {
    row.name = `${owner}/${name}`;
    row.slug = `${owner}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
  }
  if (slugs.has(row.slug)) row.slug = `${owner}-${row.slug}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64);
  slugs.add(row.slug);
  // Mostly CJK or Cyrillic text: the site is in English, so a person should decide.
  const foreign = (row.description.match(/[぀-ヿ㐀-鿿가-힯Ѐ-ӿ]/g) ?? []).length;
  row.review_note = [
    row.heddle_verdict === "review" ? "read Heddle findings" : "",
    foreign > row.description.length / 4 ? "description not in English" : "",
  ]
    .filter(Boolean)
    .join("; ");
  kept.push(row);
}

const columns = [...header.filter((c) => c !== "readme" && c !== "manifest"), "review_note", "readme", "manifest"];
writeFileSync(new URL("launch-setups.csv", OUT), [columns.join(","), ...kept.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\n"));
console.log(`${kept.length} kept → discovery/out/launch-setups.csv`);
console.log(`${dropped.length} excluded:\n  ${dropped.join("\n  ")}`);
