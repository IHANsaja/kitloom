import type { Setup, SetupSummary } from "@/types/catalog";

/** Pure and dependency-free: used at build time and in the browser. */
export function toSummary(setup: Setup): SetupSummary {
  return {
    slug: setup.slug,
    name: setup.name,
    description: setup.description,
    origin: setup.origin,
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
    featured: setup.featured,
  };
}

/**
 * First-party kits are pre-rendered at /setups/<slug>. Community setups live in the
 * database, which a static export cannot pre-render, so they use /setup?slug=<slug>.
 */
export function setupHref(setup: Pick<SetupSummary, "slug" | "origin">): string {
  return setup.origin === "community"
    ? `/setup?slug=${encodeURIComponent(setup.slug)}`
    : `/setups/${setup.slug}`;
}
