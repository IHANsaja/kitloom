/**
 * URL safety for everything that comes from catalog data, the database, or package
 * READMEs. All such values are treated as untrusted external input.
 */

const FIRST_PARTY_PACKAGE_PATH = /^\/packages\/[a-z0-9][a-z0-9.-]*\.zip$/;
const GITHUB_RELEASE_ASSET_PATH = /^\/[\w.-]+\/[\w.-]+\/releases\/download\/[^/]+\/[^/]+\.zip$/;
const GITHUB_ARCHIVE_PATH = /^\/[\w.-]+\/[\w.-]+\/archive\/(?:HEAD|refs\/heads\/[A-Za-z0-9._/-]+)\.zip$/;
const GITHUB_NAME = /^[A-Za-z0-9_.-]{1,100}$/;
const GITHUB_BRANCH = /^[A-Za-z0-9._/-]{1,255}$/;

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

export interface GitHubRepo {
  owner: string;
  repo: string;
  /** Canonical form: https://github.com/<owner>/<repo> */
  url: string;
}

/**
 * Accepts what people paste — with or without a trailing slash, ".git", or a deeper path
 * such as /tree/main — and returns the canonical repository, or null if it is not one.
 */
export function parseGitHubRepoUrl(input: string): GitHubRepo | null {
  const value = input.trim();
  if (value === "") return null;
  const url = parseUrl(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
  if (!url || url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.port !== "") {
    return null;
  }
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return null;
  const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
  const repo = rawRepo?.replace(/\.git$/, "");
  if (!owner || !repo || !GITHUB_NAME.test(owner) || !GITHUB_NAME.test(repo)) return null;
  if ([owner, repo].some((part) => part === "." || part === "..")) return null;
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

/** True only for the canonical form that is stored in the database. */
export function isGitHubRepoUrl(value: string): boolean {
  return parseGitHubRepoUrl(value)?.url === value;
}

export const MAX_SOURCE_REPOSITORIES = 8;

/**
 * Reads a pasted list of repository links (one per line, or separated by commas or
 * spaces). Returns canonical, de-duplicated URLs and whatever could not be understood, so
 * the form can name the exact entries that need fixing.
 */
export function parseGitHubRepoList(text: string): { urls: string[]; invalid: string[] } {
  const urls: string[] = [];
  const invalid: string[] = [];
  for (const item of text.split(/[\s,]+/).filter(Boolean)) {
    const repo = parseGitHubRepoUrl(item);
    if (!repo) invalid.push(item);
    else if (!urls.includes(repo.url)) urls.push(repo.url);
  }
  return { urls, invalid };
}

/** "https://github.com/owner/repo" → "owner/repo", for display. */
export function gitHubRepoLabel(url: string): string {
  const repo = parseGitHubRepoUrl(url);
  return repo ? `${repo.owner}/${repo.repo}` : url;
}

export function isSafeGitBranch(value: string): boolean {
  return GITHUB_BRANCH.test(value) && !value.includes("..") && !value.startsWith("/") && !value.endsWith("/");
}

/**
 * The ZIP that GitHub builds from a repository branch. With no known branch it falls back
 * to HEAD, which GitHub resolves to the default branch.
 */
export function githubArchiveUrl(repositoryUrl: string, branch: string | null): string | null {
  if (!isGitHubRepoUrl(repositoryUrl)) return null;
  const ref = branch && isSafeGitBranch(branch) ? `refs/heads/${branch}` : "HEAD";
  return `${repositoryUrl}/archive/${ref}.zip`;
}

/** A repository archive on github.com: /<owner>/<repo>/archive/(HEAD|refs/heads/<branch>).zip */
export function isGitHubArchiveUrl(value: string): boolean {
  if (!isSafeHttpsUrl(value)) return false;
  const url = parseUrl(value);
  return (
    url !== null &&
    url.hostname === "github.com" &&
    url.port === "" &&
    url.search === "" &&
    url.hash === "" &&
    GITHUB_ARCHIVE_PATH.test(url.pathname) &&
    !url.pathname.includes("..")
  );
}

/** The only kinds of download reference Kitloom will link to. */
export function isAllowedDownloadUrl(value: string): boolean {
  return isFirstPartyPackagePath(value) || isGitHubReleaseAssetUrl(value) || isGitHubArchiveUrl(value);
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

/**
 * File name of a download reference, for the `download` attribute and install commands.
 * Null when it cannot be known in advance (a HEAD archive is named by GitHub at download).
 */
export function fileNameFromDownloadUrl(value: string): string | null {
  if (isGitHubArchiveUrl(value)) {
    const match = /^\/[\w.-]+\/([\w.-]+)\/archive\/refs\/heads\/(.+)\.zip$/.exec(new URL(value).pathname);
    return match?.[1] && match[2] ? `${match[1]}-${match[2].replaceAll("/", "-")}.zip` : null;
  }
  const path = value.startsWith("/") ? value : (parseUrl(value)?.pathname ?? "");
  const name = path.split("/").pop() ?? "";
  return /^[\w.-]+\.zip$/.test(name) ? name : null;
}
