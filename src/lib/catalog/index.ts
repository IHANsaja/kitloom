/**
 * Catalog access. This is the only module that reads src/data/setups.json; the rest of the
 * application depends on these functions and the types in src/types/catalog.ts. A future
 * database-backed catalog replaces this file and nothing else.
 *
 * Build/server only (it pulls in the zod schema). Client Components receive SetupSummary
 * data as props and use the pure functions in ./query.
 */
import rawCatalog from "@/data/setups.json";
import { parseCatalog } from "@/lib/catalog/schema";
import { searchSetups, sortSetups, type SetupQuery } from "@/lib/catalog/query";
import { toSummary } from "@/lib/catalog/summary";
import type { Catalog, Setup, SetupSummary } from "@/types/catalog";

// Validated once per build. An invalid catalog throws a CatalogValidationError listing
// every problem by record, which fails the build instead of shipping broken pages.
const catalog: Catalog = parseCatalog(rawCatalog);
const setupsBySlug = new Map(catalog.setups.map((setup) => [setup.slug, setup]));

export { toSummary };

export function getCatalog(): Catalog {
  return catalog;
}

/** All setups as summaries, newest first. */
export function getSetupSummaries(): SetupSummary[] {
  return sortSetups(catalog.setups.map(toSummary), "newest");
}

/** Summaries matching a query (search text, agent, category, sort). */
export function getSetups(query: SetupQuery): SetupSummary[] {
  return searchSetups(catalog.setups.map(toSummary), query);
}

/** The full record for one setup, or null when the slug is unknown. */
export function getSetupBySlug(slug: string): Setup | null {
  return setupsBySlug.get(slug) ?? null;
}

export function getAllSlugs(): string[] {
  return catalog.setups.map((setup) => setup.slug);
}

/** The setup used as the worked example on the home page: featured first, else newest. */
export function getShowcaseSetup(): Setup | null {
  const withManifest = catalog.setups.filter((setup) => setup.manifest.length > 0);
  return withManifest.find((setup) => setup.featured) ?? withManifest[0] ?? null;
}
