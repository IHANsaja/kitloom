import type { AgentId, CategoryId } from "@/lib/catalog/taxonomy";

/** Semantic version string such as "1.2.0". */
export type Version = string;

/** SPDX licence identifier such as "MIT", or null when the creator did not provide one. */
export type License = string | null;

/**
 * How compatibility with an agent was established.
 * - "declared": the creator says the setup works with this agent.
 * - "tested": the setup was actually verified with this agent.
 * Every listing is "declared" today; "tested" exists so the two never get blurred later.
 */
export type CompatibilityLevel = "declared" | "tested";

export interface AgentCompatibility {
  id: AgentId;
  compatibility: CompatibilityLevel;
}

export interface Creator {
  name: string;
  url: string | null;
}

export type PackageFormat = "zip";

/**
 * A reference to where the package lives. Kitloom stores no package files: the download is
 * the ZIP GitHub generates from the creator's repository.
 */
export interface PackageMetadata {
  format: PackageFormat;
  downloadUrl: string | null;
}

/** One file in the repository, relative to its root. */
export interface ManifestEntry {
  path: string;
  sizeBytes: number | null;
}

/** A published setup. Every one comes from the database; see src/lib/community/setups.ts. */
export interface Setup {
  slug: string;
  name: string;
  description: string;
  creator: Creator;
  agents: AgentCompatibility[];
  categories: CategoryId[];
  tags: string[];
  version: Version | null;
  license: License;
  package: PackageMetadata;
  /** The public GitHub repository that holds the setup: https://github.com/<owner>/<repo> */
  repositoryUrl: string;
  /**
   * Credits: other public GitHub repositories the creator says this setup draws on.
   * Canonical https://github.com/<owner>/<repo> links. Stated by the creator, not verified.
   */
  sourceRepositories: string[];
  /** Untrusted Markdown. Must only be rendered through ReadmePreview. */
  readme: string | null;
  manifest: ManifestEntry[];
  publishedAt: string;
  updatedAt: string;
  /** Null until a reliable source of download statistics exists. Never estimated. */
  downloads: number | null;
}

/** The fields needed to list, search, filter, and sort. */
export interface SetupSummary {
  slug: string;
  name: string;
  description: string;
  creatorName: string;
  agents: AgentId[];
  categories: CategoryId[];
  tags: string[];
  version: Version | null;
  license: License;
  format: PackageFormat;
  publishedAt: string;
  updatedAt: string;
  downloads: number | null;
}
