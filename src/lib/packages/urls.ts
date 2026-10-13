/**
 * URL safety for everything that comes from catalog data or package READMEs.
 * All such values are treated as untrusted external input.
 */

const FIRST_PARTY_PACKAGE_PATH = /^\/packages\/[a-z0-9][a-z0-9.-]*\.zip$/;
const GITHUB_RELEASE_ASSET_PATH = /^\/[\w.-]+\/[\w.-]+\/releases\/download\/[^/]+\/[^/]+\.zip$/;

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** True for absolute https: URLs without embedded credentials. */
export function isSafeHttpsUrl(value: string): boolean {
  const url = parseUrl(value);
  return url !== null && url.protocol === "https:" && url.username === "" && url.password === "";
}

/** A ZIP built from packages/ in this repository and served from this site. */
export function isFirstPartyPackagePath(value: string): boolean {
  return FIRST_PARTY_PACKAGE_PATH.test(value) && !value.includes("..");
}

/** A release asset on github.com: /<owner>/<repo>/releases/download/<tag>/<file>.zip */
export function isGitHubReleaseAssetUrl(value: string): boolean {
  if (!isSafeHttpsUrl(value)) return false;
  const url = parseUrl(value);
  return (
    url !== null &&
    url.hostname === "github.com" &&
    url.port === "" &&
    GITHUB_RELEASE_ASSET_PATH.test(url.pathname) &&
    !url.pathname.includes("..")
  );
}

/** The only two kinds of download reference the catalog accepts. */
export function isAllowedDownloadUrl(value: string): boolean {
  return isFirstPartyPackagePath(value) || isGitHubReleaseAssetUrl(value);
}

export type MarkdownLink =
  | { kind: "external"; href: string }
  | { kind: "fragment"; href: string }
  | { kind: "blocked" };

/**
 * Decides what a link inside README Markdown may point to. Relative links cannot be
 * resolved (the README is shown outside its repository) and every scheme other than
 * https/http/mailto is rejected, which rules out javascript:, data:, vbscript:, file: etc.
 */
export function resolveMarkdownLink(href: string | undefined): MarkdownLink {
  if (!href) return { kind: "blocked" };
  const trimmed = href.trim();
  if (trimmed.startsWith("#")) return { kind: "fragment", href: trimmed };
  const url = parseUrl(trimmed);
  if (!url) return { kind: "blocked" };
  if (url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:") {
    return { kind: "external", href: url.href };
  }
  return { kind: "blocked" };
}

/** File name of a download reference, for the `download` attribute and install commands. */
export function fileNameFromDownloadUrl(value: string): string | null {
  const path = value.startsWith("/") ? value : (parseUrl(value)?.pathname ?? "");
  const name = path.split("/").pop() ?? "";
  return /^[\w.-]+\.zip$/.test(name) ? name : null;
}
