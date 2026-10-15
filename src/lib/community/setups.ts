/**
 * Setups: the listings that signed-in users publish, stored in Supabase. This is the
 * only source of listings; nothing is built into the site.
 *
 * Trust model: the browser reads and writes the database directly, so the database's Row
 * Level Security and check constraints are the real gate (see supabase/migrations). The
 * checks here exist to give people clear messages before a write, and to make sure that
 * rows read back from the database are safe to render — every row is treated as untrusted.
 */
import { toSummary } from "@/lib/catalog/summary";
import { isAgentId, isCategoryId, type AgentId, type CategoryId } from "@/lib/catalog/taxonomy";
import { isSafeManifestPath } from "@/lib/packages/paths";
import {
  githubArchiveUrl,
  isGitHubRepoUrl,
  isSafeGitBranch,
  isSafeHttpsUrl,
  MAX_SOURCE_REPOSITORIES,
  parseGitHubRepoUrl,
} from "@/lib/packages/urls";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ManifestEntry, Setup, SetupSummary } from "@/types/catalog";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SPDX_LIKE = /^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/;
const TAG = /^[a-z0-9][a-z0-9.+-]{0,31}$/;

const SUMMARY_COLUMNS =
  "slug,name,description,agents,categories,tags,version,license,repository_url,default_branch,created_at,updated_at,status,owner_id,profiles(display_name,github_username,website_url)";
const DETAIL_COLUMNS = `${SUMMARY_COLUMNS},readme,manifest,source_repositories`;

/** What a creator fills in. Everything else is derived or assigned by the database. */
export interface SetupInput {
  slug: string;
  name: string;
  description: string;
  repositoryUrl: string;
  agents: AgentId[];
  categories: CategoryId[];
  tags: string[];
  version: string;
  license: string;
  /** Credits: canonical links to other repositories this setup was built from. */
  sourceRepositories: string[];
}

/** Details read from GitHub at publish time and stored alongside the listing. */
export interface SetupRepoSnapshot {
  defaultBranch: string | null;
  readme: string | null;
  manifest: ManifestEntry[];
}

export type SetupInputErrors = Partial<Record<keyof SetupInput, string>>;

export interface CommunitySetup {
  setup: Setup;
  ownerId: string;
  status: "published" | "hidden";
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}

/** "a, B  c,a" → ["a", "b", "c"] */
export function parseTags(value: string): string[] {
  return [...new Set(value.toLowerCase().split(/[\s,]+/).map((tag) => tag.replace(/^#/, "")).filter(Boolean))];
}

/** Mirrors the database constraints so problems are reported per field before any write. */
export function validateSetupInput(input: SetupInput): SetupInputErrors {
  const errors: SetupInputErrors = {};
  const name = input.name.trim();
  const description = input.description.trim();

  if (!parseGitHubRepoUrl(input.repositoryUrl)) {
    errors.repositoryUrl = "Enter a public GitHub repository, for example https://github.com/owner/repo.";
  }
  if (name.length < 2 || name.length > 80) errors.name = "Use between 2 and 80 characters.";
  if (!SLUG.test(input.slug) || input.slug.length < 3 || input.slug.length > 64) {
    errors.slug = "Use 3–64 lowercase letters, digits, and single hyphens.";
  }
  if (description.length < 20 || description.length > 280) {
    errors.description = `Use between 20 and 280 characters (currently ${description.length}).`;
  }
  if (input.agents.length === 0) errors.agents = "Choose at least one agent the setup is written for.";
  if (input.categories.length === 0) errors.categories = "Choose at least one category.";
  if (input.tags.length > 8) errors.tags = "Use at most 8 tags.";
  else if (input.tags.some((tag) => !TAG.test(tag))) {
    errors.tags = "Tags are lowercase letters, digits, “.”, “+” or “-”, up to 32 characters each.";
  }
  if (input.version.trim() !== "" && !SEMVER.test(input.version.trim())) {
    errors.version = "Use a semantic version such as 1.0.0, or leave it empty.";
  }
  const main = parseGitHubRepoUrl(input.repositoryUrl)?.url;
  if (input.sourceRepositories.length > MAX_SOURCE_REPOSITORIES) {
    errors.sourceRepositories = `List at most ${MAX_SOURCE_REPOSITORIES} repositories.`;
  } else if (input.sourceRepositories.some((url) => !isGitHubRepoUrl(url))) {
    errors.sourceRepositories = "Each credit must be a public GitHub repository link.";
  } else if (main && input.sourceRepositories.includes(main)) {
    errors.sourceRepositories = "The setup’s own repository is already linked. List only other repositories here.";
  }
  if (input.license.trim() !== "" && !SPDX_LIKE.test(input.license.trim())) {
    errors.license = "Use an SPDX identifier such as MIT or Apache-2.0, or leave it empty.";
  }
  return errors;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.slice(0, max) : null;
}

function isoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function manifestFrom(value: unknown): ManifestEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const entries: ManifestEntry[] = [];
  for (const item of value.slice(0, 500)) {
    const entry = item as Record<string, unknown> | null;
    if (!entry || typeof entry.path !== "string" || !isSafeManifestPath(entry.path) || seen.has(entry.path)) continue;
    seen.add(entry.path);
    const size = entry.sizeBytes;
    entries.push({
      path: entry.path,
      sizeBytes: typeof size === "number" && Number.isInteger(size) && size >= 0 ? size : null,
    });
  }
  return entries;
}

/**
 * Turns a database row into a Setup, or null if the row is not safe or complete enough to
 * show. Nothing from the row reaches the UI without passing through here.
 */
export function rowToCommunitySetup(row: unknown): CommunitySetup | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;

  const slug = text(r.slug, 64);
  const name = text(r.name, 80);
  const description = text(r.description, 280);
  const repositoryUrl = text(r.repository_url, 300);
  const publishedAt = isoDate(r.created_at);
  const ownerId = text(r.owner_id, 64);
  if (!slug || !SLUG.test(slug) || !name || !description || !publishedAt || !ownerId) return null;
  if (!repositoryUrl || !isGitHubRepoUrl(repositoryUrl)) return null;

  const agents = strings(r.agents).filter(isAgentId);
  const categories = strings(r.categories).filter(isCategoryId);
  if (agents.length === 0 || categories.length === 0) return null;

  const branch = text(r.default_branch, 255);
  const version = text(r.version, 64);
  const license = text(r.license, 64);
  const profile = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as Record<string, unknown> | null | undefined;
  const githubUsername = text(profile?.github_username, 39);
  const website = text(profile?.website_url, 200);

  const setup: Setup = {
    slug,
    name: name.trim(),
    description: description.trim(),
    creator: {
      name: text(profile?.display_name, 80) ?? "Kitloom member",
      // A linked GitHub account first; otherwise the member's own website, if it is https.
      url:
        githubUsername && /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(githubUsername)
          ? `https://github.com/${githubUsername}`
          : website && isSafeHttpsUrl(website)
            ? website
            : null,
    },
    // Community listings are always the creator's own declaration.
    agents: [...new Set(agents)].map((id) => ({ id, compatibility: "declared" })),
    categories: [...new Set(categories)],
    tags: [...new Set(strings(r.tags).filter((tag) => TAG.test(tag)))].slice(0, 8),
    version: version && SEMVER.test(version) ? version : null,
    license: license && SPDX_LIKE.test(license) ? license : null,
    package: {
      format: "zip",
      downloadUrl: githubArchiveUrl(repositoryUrl, branch && isSafeGitBranch(branch) ? branch : null),
    },
    repositoryUrl,
    // Only canonical GitHub repository links survive; the setup’s own repository is not a credit.
    sourceRepositories: [...new Set(strings(r.source_repositories).filter((url) => isGitHubRepoUrl(url) && url !== repositoryUrl))].slice(
      0,
      MAX_SOURCE_REPOSITORIES,
    ),
    readme: text(r.readme, 40_000),
    manifest: manifestFrom(r.manifest),
    publishedAt,
    updatedAt: isoDate(r.updated_at) ?? publishedAt,
    downloads: null,
  };

  return { setup, ownerId, status: r.status === "hidden" ? "hidden" : "published" };
}

export class CommunityError extends Error {}

function fail(message: string): never {
  throw new CommunityError(message);
}

/** Published community setups as summaries, newest first. */
export async function fetchPublishedSummaries(): Promise<SetupSummary[]> {
  const { data, error } = await getSupabaseClient()
    .from("setups")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) fail("Community setups could not be loaded.");
  return (data ?? []).flatMap((row) => {
    const mapped = rowToCommunitySetup(row);
    return mapped ? [toSummary(mapped.setup)] : [];
  });
}

/** The most recently published setup, in full, or null when there are none. */
export async function fetchLatestSetup(): Promise<Setup | null> {
  const { data, error } = await getSupabaseClient()
    .from("setups")
    .select(DETAIL_COLUMNS)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) fail("The latest setup could not be loaded.");
  return rowToCommunitySetup(data?.[0])?.setup ?? null;
}

/** One setup by slug, or null when it does not exist or is not visible to this visitor. */
export async function fetchCommunitySetup(slug: string): Promise<CommunitySetup | null> {
  if (!SLUG.test(slug)) return null;
  const { data, error } = await getSupabaseClient().from("setups").select(DETAIL_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) fail("This setup could not be loaded.");
  return data ? rowToCommunitySetup(data) : null;
}

/** The signed-in user's own setups, including any a maintainer has hidden. */
export async function fetchOwnSetups(ownerId: string): Promise<CommunitySetup[]> {
  const { data, error } = await getSupabaseClient()
    .from("setups")
    .select(SUMMARY_COLUMNS)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) fail("Your setups could not be loaded.");
  return (data ?? []).flatMap((row) => rowToCommunitySetup(row) ?? []);
}

function toColumns(input: SetupInput, snapshot: SetupRepoSnapshot) {
  const repo = parseGitHubRepoUrl(input.repositoryUrl);
  if (!repo) fail("Enter a public GitHub repository URL.");
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    agents: input.agents,
    categories: input.categories,
    tags: input.tags,
    version: input.version.trim() || null,
    license: input.license.trim() || null,
    repository_url: repo.url,
    source_repositories: input.sourceRepositories,
    default_branch: snapshot.defaultBranch,
    readme: snapshot.readme,
    manifest: snapshot.manifest,
  };
}

function explain(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "That URL name is already taken. Choose a different one.";
  if (error.code === "P0001") return error.message;
  if (error.code === "23514") return "One of the fields was rejected by the database. Check the form and try again.";
  if (error.code === "42501") return "You do not have permission to do that. Sign in again and retry.";
  return "The setup could not be saved. Nothing was published.";
}

export async function createSetup(input: SetupInput, snapshot: SetupRepoSnapshot): Promise<string> {
  const { error } = await getSupabaseClient()
    .from("setups")
    .insert({ slug: input.slug, ...toColumns(input, snapshot) });
  if (error) fail(explain(error));
  return input.slug;
}

export async function updateSetup(slug: string, input: SetupInput, snapshot: SetupRepoSnapshot): Promise<void> {
  const { data, error } = await getSupabaseClient().from("setups").update(toColumns(input, snapshot)).eq("slug", slug).select("slug");
  if (error) fail(explain(error));
  if (!data || data.length === 0) fail("That setup was not found, or it is not yours to edit.");
}

export async function deleteSetup(slug: string): Promise<void> {
  const { data, error } = await getSupabaseClient().from("setups").delete().eq("slug", slug).select("slug");
  if (error) fail("The setup could not be deleted.");
  if (!data || data.length === 0) fail("That setup was not found, or it is not yours to delete.");
}
