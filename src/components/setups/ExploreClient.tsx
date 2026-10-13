"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import { FilterGroup } from "@/components/filters/FilterGroup";
import { SortSelect } from "@/components/filters/SortSelect";
import { SearchInput } from "@/components/search/SearchInput";
import { SetupGrid } from "@/components/setups/SetupCell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { MOTION_OK } from "@/components/ui/Reveal";
import { buttonClass, cx } from "@/components/ui/styles";
import {
  availableSorts,
  computeFacets,
  EMPTY_QUERY,
  isFiltered,
  parseQueryParams,
  searchSetups,
  toQueryString,
  tokenize,
  type SetupQuery,
} from "@/lib/catalog/query";
import { AGENT_FILTERS, CATEGORIES } from "@/lib/catalog/taxonomy";
import { pluralize } from "@/lib/format";
import type { SetupSummary } from "@/types/catalog";

const ANIMATED_CELLS = 12;

/**
 * Search, filters, and sorting over the catalog, entirely in the browser (the site is a
 * static export). State is mirrored into the URL so every view can be shared or bookmarked.
 */
export function ExploreClient({ setups }: { setups: readonly SetupSummary[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const urlKey = new URLSearchParams(params.toString()).toString();

  const [query, setQuery] = useState<SetupQuery>(() => parseQueryParams(params));
  // useSearchParams lags behind our own history writes, and typing can outrun it. So we
  // remember the URLs this component wrote (oldest first) and only adopt a URL from the
  // router when it is not one of ours: back/forward, or a link to /explore.
  const [seenKey, setSeenKey] = useState(urlKey);
  const [writtenKeys, setWrittenKeys] = useState<string[]>([urlKey]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const results = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  if (urlKey !== seenKey) {
    setSeenKey(urlKey);
    const index = writtenKeys.indexOf(urlKey);
    if (index === -1) {
      setQuery(parseQueryParams(params));
      setWrittenKeys([urlKey]);
    } else {
      setWrittenKeys(writtenKeys.slice(index));
    }
  }

  // Handlers read the latest query from a ref, so two events in the same frame (a filter
  // click followed at once by a keystroke) build on each other instead of on a stale render.
  const latest = useRef(query);
  useEffect(() => {
    latest.current = query;
  }, [query]);

  function update(patch: Partial<SetupQuery>) {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    const qs = toQueryString(next);
    setQuery(next);
    setWrittenKeys((keys) => [...keys.slice(-40), qs]);
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }

  const sorts = useMemo(() => availableSorts(setups), [setups]);
  const matches = useMemo(() => searchSetups(setups, query), [setups, query]);
  const facets = useMemo(() => computeFacets(setups, query), [setups, query]);
  const unfilteredByAgent = useMemo(() => searchSetups(setups, { ...query, agent: null }).length, [setups, query]);
  const unfilteredByCategory = useMemo(() => searchSetups(setups, { ...query, category: null }).length, [setups, query]);

  const filtered = isFiltered(query);
  const activeFilterCount = (query.agent ? 1 : 0) + (query.category ? 1 : 0);
  const sort = sorts.some((s) => s.id === query.sort) ? query.sort : EMPTY_QUERY.sort;
  const resultKey = `${matches.map((s) => s.slug).join(",")}|${sort}`;

  useGSAP(
    () => {
      // The first paint is server-rendered and must not flash; animate changes only.
      if (firstRender.current) {
        firstRender.current = false;
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const cells = gsap.utils.toArray<HTMLElement>("[data-setup-cell]", results.current).slice(0, ANIMATED_CELLS);
        if (cells.length === 0) return;
        gsap.fromTo(
          cells,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", stagger: 0.03, clearProps: "all" },
        );
      });
    },
    { scope: results, dependencies: [resultKey], revertOnUpdate: true },
  );

  const terms = tokenize(query.q);
  const agentLabel = AGENT_FILTERS.find((f) => f.id === query.agent)?.label;
  const categoryLabel = CATEGORIES.find((c) => c.id === query.category)?.label;

  return (
    <div className="lg:grid lg:grid-cols-12">
      <div className="lg:col-span-3 lg:border-r lg:border-line">
        <div className="cell-x border-b border-line py-3 lg:hidden">
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="explore-filters"
            onClick={() => setFiltersOpen((value) => !value)}
            className={buttonClass("secondary", "md", "w-full justify-between")}
          >
            <span className="flex items-center gap-2">
              <Icon name="filter" size={16} />
              Filters
              {activeFilterCount > 0 ? <span className="font-mono text-xs text-lime tabular-nums">{activeFilterCount} active</span> : null}
            </span>
            <Icon name="chevron" size={16} className={cx("transition-transform duration-150 ease-kit", filtersOpen && "rotate-90")} />
          </button>
        </div>

        <aside
          id="explore-filters"
          aria-label="Filters"
          className={cx("lg:sticky lg:top-14 lg:block lg:max-h-[calc(100dvh-3.5rem)] lg:overflow-y-auto", !filtersOpen && "hidden")}
        >
          <FilterGroup
            legend="Agent"
            allLabel="All agents"
            allCount={unfilteredByAgent}
            options={AGENT_FILTERS.map((f) => ({ id: f.id, label: f.label, hint: f.hint, count: facets.agents[f.id] }))}
            selected={query.agent}
            onSelect={(agent) => update({ agent })}
          />
          <FilterGroup
            legend="Category"
            allLabel="All categories"
            allCount={unfilteredByCategory}
            options={CATEGORIES.map((c) => ({ id: c.id, label: c.label, hint: c.description, count: facets.categories[c.id] }))}
            selected={query.category}
            onSelect={(category) => update({ category })}
          />
          {filtered ? (
            <div className="cell-x py-4">
              <button type="button" onClick={() => update({ q: "", agent: null, category: null })} className={buttonClass("secondary", "sm", "h-9 w-full")}>
                <Icon name="close" size={14} />
                Clear search and filters
              </button>
            </div>
          ) : null}
        </aside>
      </div>

      <div className="min-w-0 lg:col-span-9">
        <div className="cell-x border-b border-line py-4 lg:px-6">
          <SearchInput value={query.q} onChange={(q) => update({ q })} />
        </div>

        <div className="cell-x flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line py-3 lg:px-6">
          <p role="status" aria-live="polite" className="font-mono text-xs text-fg-2 tabular-nums">
            <span className="text-fg">{pluralize(matches.length, "setup")}</span>
            {filtered ? ` of ${setups.length}` : ""}
            {terms.length > 0 ? <> matching “{terms.join(" ")}”</> : null}
            {agentLabel ? <> · {agentLabel}</> : null}
            {categoryLabel ? <> · {categoryLabel}</> : null}
          </p>
          <SortSelect value={sort} options={sorts} onChange={(next) => update({ sort: next })} />
        </div>

        <div ref={results}>
          {matches.length > 0 ? (
            <SetupGrid setups={matches} layout="beside-sidebar" />
          ) : setups.length === 0 ? (
            <EmptyState
              eyebrow="0 setups"
              title="Nothing has been published yet"
              actions={
                <Link href="/publish" className={buttonClass("primary")}>
                  Publish the first setup
                </Link>
              }
            >
              The catalog is empty. Listings appear here once a real setup is submitted and reviewed.
            </EmptyState>
          ) : (
            <EmptyState
              eyebrow="0 results"
              title={terms.length > 0 ? `No setups match “${terms.join(" ")}”` : "No setups match these filters"}
              actions={
                <>
                  <button type="button" onClick={() => update({ q: "", agent: null, category: null })} className={buttonClass("primary")}>
                    Clear search and filters
                  </button>
                  <Link href="/publish" className={buttonClass("secondary")}>
                    Publish a setup
                  </Link>
                </>
              }
            >
              {terms.length > 0 && activeFilterCount > 0
                ? "Try fewer words, or remove a filter. Search looks at names, descriptions, tags, categories, agents, licences, and creators."
                : terms.length > 0
                  ? "Try fewer or different words. Search looks at names, descriptions, tags, categories, agents, licences, and creators."
                  : `Nothing is listed yet for ${[agentLabel, categoryLabel].filter(Boolean).join(" in ")}. If you have a setup that fits, you can add it.`}
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}
