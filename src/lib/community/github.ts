/**
 * Reads public repository details from the GitHub REST API, in the browser, without
 * credentials. Unauthenticated calls are limited to 60 per hour per IP address, which is
 * plenty for publishing a setup. Everything returned is untrusted input.
 */
import { isSafeManifestPath } from "@/lib/packages/paths";
import type { GitHubRepo } from "@/lib/packages/urls";
import { isSafeGitBranch } from "@/lib/packages/urls";
import type { ManifestEntry } from "@/types/catalog";

export const MAX_MANIFEST_ENTRIES = 500;
export const MAX_README_CHARS = 40_000;

export interface RepoDetails {
  description: string | null;
  /** SPDX identifier reported by GitHub, or null when it found no recognised licence. */
  license: string | null;
  defaultBranch: string | null;
  readme: string | null;
  manifest: ManifestEntry[];
  /** True when the repository has more files than Kitloom stores. */
  manifestTruncated: boolean;
}

export class GitHubError extends Error {}

const API = "https://api.github.com";

async function get(path: string, accept = "application/vnd.github+json"): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { headers: { Accept: accept } });
  } catch {
    throw new GitHubError("Could not reach GitHub. Check your connection and try again.");
  }
  if (response.status === 403 || response.status === 429) {
    throw new GitHubError("GitHub's hourly request limit was reached from this network. Try again later.");
  }
  return response;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Fetches description, licence, default branch, README, and file list for a public repo. */
export async function fetchRepoDetails({ owner, repo }: GitHubRepo): Promise<RepoDetails> {
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  const repoResponse = await get(base);
  if (repoResponse.status === 404) {
    throw new GitHubError("GitHub has no public repository at that address. Private repositories cannot be listed.");
  }
  if (!repoResponse.ok) throw new GitHubError(`GitHub returned an error (${repoResponse.status}).`);
  const info = (await repoResponse.json()) as Record<string, unknown>;

  const branch = asString(info.default_branch);
  const defaultBranch = branch && isSafeGitBranch(branch) ? branch : null;
  const spdx = asString((info.license as Record<string, unknown> | null)?.spdx_id);
  const license = spdx && spdx !== "NOASSERTION" && /^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/.test(spdx) ? spdx : null;

  const [readmeResponse, treeResponse] = await Promise.all([
    get(`${base}/readme`, "application/vnd.github.raw+json"),
    get(`${base}/git/trees/${encodeURIComponent(defaultBranch ?? "HEAD")}?recursive=1`),
  ]);

  const readme = readmeResponse.ok ? (await readmeResponse.text()).slice(0, MAX_README_CHARS) : null;

  let manifest: ManifestEntry[] = [];
  let manifestTruncated = false;
  if (treeResponse.ok) {
    const tree = (await treeResponse.json()) as { tree?: unknown; truncated?: unknown };
    const files = (Array.isArray(tree.tree) ? tree.tree : [])
      .filter((entry): entry is { path: string; type: string; size?: unknown } => {
        const e = entry as Record<string, unknown> | null;
        return e !== null && typeof e.path === "string" && e.type === "blob" && isSafeManifestPath(e.path);
      })
      .map((entry) => ({
        path: entry.path,
        sizeBytes: typeof entry.size === "number" && Number.isInteger(entry.size) && entry.size >= 0 ? entry.size : null,
      }));
    manifestTruncated = tree.truncated === true || files.length > MAX_MANIFEST_ENTRIES;
    manifest = files.slice(0, MAX_MANIFEST_ENTRIES);
  }

  return {
    description: asString(info.description),
    license,
    defaultBranch,
    readme: readme && readme.trim() !== "" ? readme : null,
    manifest,
    manifestTruncated,
  };
}
