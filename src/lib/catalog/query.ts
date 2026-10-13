/**
 * Pure search, filter, and sort over setup summaries. No dependencies beyond the taxonomy,
 * so the same code runs at build time and in the browser.
 */
import {
  AGENT_FILTERS,
  CATEGORIES,
  getAgent,
  getCategory,
  isAgentFilterId,
  isCategoryId,
  matchesAgentFilter,
  type AgentFilterId,
  type CategoryId,
} from "@/lib/catalog/taxonomy";
import type { SetupSummary } from "@/types/catalog";

export const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "name", label: "Alphabetical" },
  { id: "downloads", label: "Most downloaded" },
] as const;

export type SortId = (typeof SORTS)[number]["id"];
export const DEFAULT_SORT: SortId = "newest";

export interface SetupQuery {
  /** Raw search text as typed. Normalised internally. */
  q: string;
  agent: AgentFilterId | null;
  category: CategoryId | null;
  sort: SortId;
}

export const EMPTY_QUERY: SetupQuery = { q: "", agent: null, category: null, sort: DEFAULT_SORT };

/** Lowercases, strips diacritics, and collapses whitespace. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(query: string): string[] {
  const normalized = normalizeText(query);
  return normalized === "" ? [] : normalized.split(" ");
}

function haystack(setup: SetupSummary): string {
  return normalizeText(
    [
      setup.name,
      setup.slug,
      setup.description,
      setup.creatorName,
      setup.license ?? "",
      setup.version ?? "",
      setup.format,
      ...setup.tags,
      ...setup.categories.map((id) => getCategory(id).label),
      ...setup.agents.flatMap((id) => [getAgent(id).name, getAgent(id).vendor, id]),
    ].join(" "),
  );
}

/** Every token must appear somewhere in the setup's searchable text. */
export function matchesSearch(setup: SetupSummary, tokens: readonly string[]): boolean {
  if (tokens.length === 0) return true;
  const text = haystack(setup);
  return tokens.every((token) => text.includes(token));
}

export function hasDownloadData(setups: readonly SetupSummary[]): boolean {
  return setups.some((setup) => setup.downloads !== null);
}

/** "Most downloaded" is only offered when real download data exists. */
export function availableSorts(setups: readonly SetupSummary[]): (typeof SORTS)[number][] {
  return SORTS.filter((sort) => sort.id !== "downloads" || hasDownloadData(setups));
}

export function sortSetups(setups: readonly SetupSummary[], sort: SortId): SetupSummary[] {
  const byName = (a: SetupSummary, b: SetupSummary) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  const sorted = [...setups];
  switch (sort) {
    case "name":
      return sorted.sort(byName);
    case "downloads":
      return sorted.sort((a, b) => (b.downloads ?? -1) - (a.downloads ?? -1) || byName(a, b));
    case "newest":
      return sorted.sort(
        (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || byName(a, b),
      );
  }
}

interface FilterOptions {
  ignoreAgent?: boolean;
  ignoreCategory?: boolean;
}

function filterSetups(
  setups: readonly SetupSummary[],
  query: SetupQuery,
  options: FilterOptions = {},
): SetupSummary[] {
  const tokens = tokenize(query.q);
  return setups.filter((setup) => {
    if (!matchesSearch(setup, tokens)) return false;
    if (!options.ignoreAgent && query.agent && !matchesAgentFilter(setup.agents, query.agent)) {
      return false;
    }
    if (
      !options.ignoreCategory &&
      query.category &&
      !setup.categories.includes(query.category)
    ) {
      return false;
    }
    return true;
  });
}

/** Search + filter + sort. Falls back to the default sort if the requested one is unavailable. */
export function searchSetups(setups: readonly SetupSummary[], query: SetupQuery): SetupSummary[] {
  const sort = availableSorts(setups).some((s) => s.id === query.sort) ? query.sort : DEFAULT_SORT;
  return sortSetups(filterSetups(setups, query), sort);
}

export interface Facets {
  agents: Record<AgentFilterId, number>;
  categories: Record<CategoryId, number>;
}

/**
 * Counts shown next to each filter. Each facet is counted with the search text and the
 * *other* facet applied, so a number always equals the results you get by selecting it.
 */
export function computeFacets(setups: readonly SetupSummary[], query: SetupQuery): Facets {
  const forAgents = filterSetups(setups, query, { ignoreAgent: true });
  const forCategories = filterSetups(setups, query, { ignoreCategory: true });
  return {
    agents: Object.fromEntries(
      AGENT_FILTERS.map((filter) => [
        filter.id,
        forAgents.filter((setup) => matchesAgentFilter(setup.agents, filter.id)).length,
      ]),
    ) as Record<AgentFilterId, number>,
    categories: Object.fromEntries(
      CATEGORIES.map((category) => [
        category.id,
        forCategories.filter((setup) => setup.categories.includes(category.id)).length,
      ]),
    ) as Record<CategoryId, number>,
  };
}

export function isFiltered(query: SetupQuery): boolean {
  return tokenize(query.q).length > 0 || query.agent !== null || query.category !== null;
}

interface ParamReader {
  get(name: string): string | null;
}

/** Reads a query from URL search parameters, ignoring anything unrecognised. */
export function parseQueryParams(params: ParamReader): SetupQuery {
  const agent = params.get("agent");
  const category = params.get("category");
  const sort = params.get("sort");
  return {
    q: (params.get("q") ?? "").slice(0, 120),
    agent: agent && isAgentFilterId(agent) ? agent : null,
    category: category && isCategoryId(category) ? category : null,
    sort: SORTS.find((s) => s.id === sort)?.id ?? DEFAULT_SORT,
  };
}

/** Serialises a query for the URL, omitting defaults so links stay short. */
export function toQueryString(query: Partial<SetupQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.agent) params.set("agent", query.agent);
  if (query.category) params.set("category", query.category);
  if (query.sort && query.sort !== DEFAULT_SORT) params.set("sort", query.sort);
  return params.toString();
}

export function exploreHref(query: Partial<SetupQuery> = {}): string {
  const qs = toQueryString(query);
  return qs ? `/explore?${qs}` : "/explore";
}
