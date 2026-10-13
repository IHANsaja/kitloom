import type { Setup, SetupSummary } from "@/types/catalog";

export function toSummary(setup: Setup): SetupSummary {
  return {
    slug: setup.slug,
    name: setup.name,
    description: setup.description,
    creatorName: setup.creator.name,
    agents: setup.agents.map((agent) => agent.id),
    categories: setup.categories,
    tags: setup.tags,
    version: setup.version,
    license: setup.license,
    format: setup.package.format,
    publishedAt: setup.publishedAt,
    updatedAt: setup.updatedAt,
    downloads: setup.downloads,
  };
}

/**
 * Setups live in the database, and a static export cannot pre-render a page per row, so a
 * setup's address carries its slug in the query string.
 */
export function setupHref(slug: string): string {
  return `/setup?slug=${encodeURIComponent(slug)}`;
}
