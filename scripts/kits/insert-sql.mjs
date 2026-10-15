/**
 * Writes the SQL that lists published kits on Kitloom, for a maintainer to run (Supabase
 * SQL editor or MCP). One statement per kit, owned by the Kitloom account.
 *
 *   node scripts/kits/insert-sql.mjs <kitloom-account-uuid>  →  discovery/kits/insert.sql
 *
 * Only kits that publish.mjs confirmed on GitHub (meta has a commit) are included. Rows go
 * through the same check constraints and setups_before_write trigger as any listing.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../discovery/kits/", import.meta.url));
const owner = process.argv[2] ?? "";
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(owner)) throw new Error("Usage: node scripts/kits/insert-sql.mjs <account-uuid>");

/** Dollar-quoted literal with a tag that cannot occur in the text. */
function literal(text) {
  let tag = "kl";
  while (text.includes(`$${tag}$`)) tag += "x";
  return `$${tag}$${text}$${tag}$`;
}
const array = (items) => `array[${items.map((i) => literal(i)).join(",")}]::text[]`;

const statements = [];
for (const file of readdirSync(join(ROOT, "build")).filter((f) => f.endsWith(".meta.json")).sort()) {
  const meta = JSON.parse(readFileSync(join(ROOT, "build", file), "utf8"));
  if (!meta.commit) {
    console.log(`${meta.slug}: skipped (not confirmed on GitHub)`);
    continue;
  }
  statements.push(
    `insert into public.setups (owner_id, slug, name, description, agents, categories, tags, version, license, repository_url, default_branch, readme, manifest, source_repositories)
values ('${owner}', ${literal(meta.slug)}, ${literal(meta.name)}, ${literal(meta.description)}, ${array(meta.agents)}, ${array(meta.categories)}, ${array(meta.tags)}, ${literal(meta.version)}, ${literal(meta.license)}, ${literal(meta.repository_url)}, ${literal(meta.default_branch)}, ${literal(meta.readme)}, ${literal(JSON.stringify(meta.manifest))}::jsonb, ${array(meta.source_repositories)})
on conflict (slug) do nothing;`,
  );
}
writeFileSync(join(ROOT, "insert.sql"), `${statements.join("\n\n")}\n`);
console.log(`${statements.length} insert statements → discovery/kits/insert.sql`);
