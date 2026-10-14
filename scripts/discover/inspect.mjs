/**
 * Debug helper: scans named repositories and prints Heddle's high and critical findings
 * with file, line and excerpt. Used to tune rules against real setups.
 *   node scripts/discover/inspect.mjs owner/repo [owner/repo…]
 */
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
const { analyzeConfig, analyzeText, analyzeTree, isConfigFile, isReadable } = await import("../../src/lib/scan/analyze.ts");
const { readZip } = await import("./zip.mjs");

for (const name of process.argv.slice(2)) {
  const response = await fetch(`https://codeload.github.com/${name}/zip/HEAD`, { headers: { "User-Agent": "kitloom-discovery" } });
  if (!response.ok) {
    console.log(`${name}: download failed ${response.status}`);
    continue;
  }
  const zip = readZip(Buffer.from(await response.arrayBuffer()));
  const root = zip.entries[0]?.path.split("/")[0] ?? "";
  const entries = zip.entries.map((e) => ({ ...e, path: e.path.slice(root.length + 1) })).filter((e) => e.path);
  const findings = [...analyzeTree(entries.map((e) => ({ path: e.path, mode: e.mode, type: "blob", size: e.size })))];
  for (const e of entries) {
    if (!isReadable({ path: e.path, mode: e.mode, type: "blob", size: e.size }, 512 * 1024)) continue;
    const data = e.read(512 * 1024);
    if (!data || data.subarray(0, 8192).includes(0)) continue;
    const text = data.toString("utf8");
    findings.push(...analyzeText(e.path, text, e.mode));
    if (isConfigFile(e.path)) findings.push(...analyzeConfig(e.path, text));
  }
  console.log(`\n=== ${name}`);
  for (const f of findings.filter((f) => f.severity === "critical" || f.severity === "high").slice(0, 40)) {
    console.log(`[${f.severity}] ${f.ruleId} ${f.path}:${f.line ?? ""}  ${f.excerpt ?? ""}`);
  }
}
