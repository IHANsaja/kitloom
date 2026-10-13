import type { AgentId, CategoryId } from "@/lib/catalog/taxonomy";

/** Semantic version string such as "1.2.0". */
export type Version = string;

/** SPDX licence identifier such as "MIT", or null when the creator did not provide one. */
export type License = string | null;

/**
 * How compatibility with an agent was established.
 * - "declared": the creator says the setup works with this agent.
 * - "tested": the setup was actually verified with this agent.
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

/** A reference to where the package binary lives. The binary itself is never in the catalog. */
export interface PackageMetadata {
  format: PackageFormat;
  downloadUrl: string | null;
  sizeBytes: number | null;
  sha256: string | null;
}

/** One file inside the package, relative to the package root. */
export interface ManifestEntry {
  path: string;
  sizeBytes: number | null;
}

/**
 * - "first-party": a starter kit maintained in this repository under packages/.
 * - "community": published by a signed-in user; stored in the database, hosted on GitHub.
 */
export type SetupOrigin = "first-party" | "community";

export interface Setup {
  id: string;
  slug: string;
  name: string;
  description: string;
  origin: SetupOrigin;
  creator: Creator;
  agents: AgentCompatibility[];
  categories: CategoryId[];
  tags: string[];
  version: Version | null;
  releaseNotes: string | null;
  license: License;
  package: PackageMetadata;
  repositoryUrl: string | null;
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
  featured: boolean;
}

export interface Catalog {
  schemaVersion: 1;
  setups: Setup[];
}

/** The fields needed to list, search, filter, and sort. Small enough to ship to the browser. */
export interface SetupSummary {
  slug: string;
  name: string;
  description: string;
  origin: SetupOrigin;
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
  featured: boolean;
}
