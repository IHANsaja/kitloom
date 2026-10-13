// Builds first-party kit ZIPs from packages/<slug>/ into public/packages/ and keeps the
// catalog honest about them.
//
//   node scripts/packages.mjs           build ZIPs, fail if the catalog does not match them
//   node scripts/packages.mjs --write   build ZIPs, write real values into the catalog
//
// The ZIP is deterministic: sorted entries, fixed timestamp, LF line endings. The same
// sources therefore produce the same bytes — and the same SHA-256 — on any machine.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalogPath = join(root, "src", "data", "setups.json");
const sourcesDir = join(root, "packages");
const outputDir = join(root, "public", "packages");
const write = process.argv.includes("--write");

// Built from local-time fields because ZIP stores local time without a zone; this keeps
// the stored bytes identical regardless of the machine's timezone.
const FIXED_MTIME = new Date(2026, 0, 1, 0, 0, 0);
const TEXT_EXTENSIONS = new Set(["", ".md", ".mdc", ".mdx", ".txt", ".json", ".toml", ".yml", ".yaml", ".sh"]);
const MAX_FILES = 200;
const MAX_TOTAL_BYTES = 2_000_000;

function walk(dir, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not allowed: ${relative}`);
    if (entry.isDirectory()) files.push(...walk(join(dir, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

function readNormalized(path) {
  const bytes = readFileSync(path);
  if (!TEXT_EXTENSIONS.has(extname(path).toLowerCase())) return new Uint8Array(bytes);
  return new TextEncoder().encode(bytes.toString("utf8").replace(/\r\n/g, "\n"));
}

function buildKit(setup) {
  const dir = join(sourcesDir, setup.slug);
  if (!existsSync(dir)) throw new Error(`packages/${setup.slug}/ does not exist`);
  if (!setup.version) throw new Error(`"${setup.slug}" needs a version`);

  const paths = walk(dir).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (paths.length === 0) throw new Error(`packages/${setup.slug}/ is empty`);
  if (paths.length > MAX_FILES) throw new Error(`"${setup.slug}" has more than ${MAX_FILES} files`);

  const entries = {};
  const manifest = [];
  let total = 0;
  let readme = null;
  for (const path of paths) {
    const bytes = readNormalized(join(dir, path));
    total += bytes.length;
    entries[`${setup.slug}/${path}`] = [bytes, { level: 9, mtime: FIXED_MTIME }];
    manifest.push({ path, sizeBytes: bytes.length });
    if (path === "README.md") readme = new TextDecoder().decode(bytes);
  }
  if (total > MAX_TOTAL_BYTES) throw new Error(`"${setup.slug}" exceeds ${MAX_TOTAL_BYTES} bytes`);

  const zip = zipSync(entries, { level: 9, mtime: FIXED_MTIME });
  const fileName = `${setup.slug}-${setup.version}.zip`;
  writeFileSync(join(outputDir, fileName), zip);

  return {
    fileName,
    package: {
      format: "zip",
      downloadUrl: `/packages/${fileName}`,
      sizeBytes: zip.length,
      sha256: createHash("sha256").update(zip).digest("hex"),
    },
    manifest,
    readme,
  };
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const problems = [];
let built = 0;

for (const setup of catalog.setups ?? []) {
  if (setup.origin !== "first-party") continue;
  let kit;
  try {
    kit = buildKit(setup);
  } catch (error) {
    problems.push(`${setup.slug}: ${error.message}`);
    continue;
  }
  built += 1;

  if (write) {
    setup.package = kit.package;
    setup.manifest = kit.manifest;
    setup.readme = kit.readme;
    console.log(`  wrote  ${kit.fileName}  ${kit.package.sizeBytes} B  sha256 ${kit.package.sha256}`);
    continue;
  }

  for (const [field, expected, actual] of [
    ["package", kit.package, setup.package],
    ["manifest", kit.manifest, setup.manifest],
    ["readme", kit.readme, setup.readme],
  ]) {
    if (!same(expected, actual)) problems.push(`${setup.slug}: catalog "${field}" does not match the built ZIP`);
  }
  console.log(`  ok     ${kit.fileName}  ${kit.package.sizeBytes} B`);
}

if (write) writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

if (problems.length > 0) {
  console.error(`\nKit check failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  console.error(`\nIf you changed files under packages/, run "npm run packages:sync" and bump the kit version.`);
  process.exit(1);
}
console.log(`${built} kit${built === 1 ? "" : "s"} ${write ? "synced" : "verified"}.`);
