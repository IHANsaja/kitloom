/**
 * Post-build step: adds a Content-Security-Policy to every exported HTML page.
 *
 * A static export has no server to generate nonces, and Next.js writes a few inline
 * <script> blocks into each page. Instead of allowing every inline script, this computes
 * the SHA-256 of the ones actually in each file and allows exactly those. The policy goes
 * in a <meta> tag so each page carries its own hashes; the directives a <meta> policy
 * cannot express (frame-ancestors) are sent as a header from public/_headers.
 *
 * Runs automatically after `npm run build` (the "postbuild" script).
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
const GITHUB_API_ORIGIN = "https://api.github.com";
// Heddle reads file contents from here; it is not counted against the API rate limit.
const GITHUB_RAW_ORIGIN = "https://raw.githubusercontent.com";

/** Inline scripts: a <script> without a src attribute. Their bodies are hashed verbatim. */
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;

export function inlineScriptHashes(html) {
  const hashes = new Set();
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    const body = match[1] ?? "";
    if (body.length === 0) continue;
    hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
  return [...hashes];
}

/** Only the origin of a configured URL is used, and only if it is https. */
export function httpsOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function buildPolicy({ scriptHashes, supabaseOrigin, turnstile }) {
  const directives = [
    ["default-src", "'self'"],
    ["script-src", "'self'", ...scriptHashes, ...(turnstile ? [TURNSTILE_ORIGIN] : [])],
    // React style attributes and Sonner's injected <style> need inline styles. Styles
    // cannot run code, so this is an accepted trade-off.
    ["style-src", "'self'", "'unsafe-inline'"],
    // README images are never fetched; only the site's own images and data: icons load.
    ["img-src", "'self'", "data:"],
    ["font-src", "'self'"],
    ["connect-src", "'self'", ...(supabaseOrigin ? [supabaseOrigin] : []), GITHUB_API_ORIGIN, GITHUB_RAW_ORIGIN],
    ["frame-src", ...(turnstile ? [TURNSTILE_ORIGIN] : ["'none'"])],
    ["worker-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'none'"],
    ["form-action", "'self'"],
    ["upgrade-insecure-requests"],
  ];
  return directives.map((parts) => parts.join(" ")).join("; ");
}

/** Inserts the policy right after <meta charset>, before any script can run. */
export function injectPolicy(html, policy) {
  if (html.includes('http-equiv="Content-Security-Policy"')) {
    throw new Error("Page already has a Content-Security-Policy meta tag.");
  }
  const tag = `<meta http-equiv="Content-Security-Policy" content="${policy}"/>`;
  const charset = /<meta charSet="utf-8"\/>/i;
  if (charset.test(html)) return html.replace(charset, (found) => found + tag);
  const head = /<head[^>]*>/i;
  if (!head.test(html)) throw new Error("Page has no <head>.");
  return html.replace(head, (found) => found + tag);
}

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "_next" ? [] : htmlFiles(path);
    return name.endsWith(".html") ? [path] : [];
  });
}

async function main() {
  // Same environment files, in the same order, as `next build`.
  const { loadEnvConfig } = createRequire(import.meta.url)("@next/env");
  loadEnvConfig(process.cwd());

  const supabaseOrigin = httpsOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const turnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const files = htmlFiles(join(process.cwd(), "out"));
  if (files.length === 0) throw new Error("No HTML found in out/. Run `next build` first.");

  for (const file of files) {
    const html = readFileSync(file, "utf8");
    const policy = buildPolicy({ scriptHashes: inlineScriptHashes(html), supabaseOrigin, turnstile });
    writeFileSync(file, injectPolicy(html, policy));
  }
  console.log(`CSP: added to ${files.length} pages${turnstile ? " (Turnstile allowed)" : ""}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
