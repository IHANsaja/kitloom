"use client";

import Link from "next/link";

import { SetupGrid } from "@/components/setups/SetupCell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/styles";
import { exploreHref } from "@/lib/catalog/query";
import { AGENT_FILTERS, CATEGORIES, matchesAgentFilter } from "@/lib/catalog/taxonomy";
import { useAllSetups } from "@/lib/community/useAllSetups";
import { pluralize } from "@/lib/format";
import type { SetupSummary } from "@/types/catalog";

/**
 * Home-page sections whose numbers depend on the whole directory. They render from the
 * built-in catalog first and update when community setups arrive from the database, so
 * counts are always computed from real listings.
 */
interface Props {
  setups: readonly SetupSummary[];
}

const cellLink =
  "group flex h-full min-h-28 flex-col justify-between px-4 py-4 transition-colors duration-150 ease-kit hover:bg-surface sm:px-6";

export function AgentCells({ setups: builtIn }: Props) {
  const { setups } = useAllSetups(builtIn);
  return (
    <ul className="grid grid-cols-2 gap-px bg-line md:grid-cols-3 xl:grid-cols-6">
      {AGENT_FILTERS.map((filter) => {
        const count = setups.filter((setup) => matchesAgentFilter(setup.agents, filter.id)).length;
        return (
          <li key={filter.id} className="bg-carbon">
            <Link href={exploreHref({ agent: filter.id })} className={cellLink}>
              <span className="flex items-start justify-between gap-2">
                <span className="font-semibold tracking-[-0.01em]">{filter.label}</span>
                <Icon name="arrow-up-right" size={14} className="mt-1 shrink-0 text-fg-3 transition duration-150 ease-kit group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-lime" />
              </span>
              <span className="mt-4 font-mono text-xs text-fg-2 tabular-nums">{pluralize(count, "setup")}</span>
            </Link>
          </li>
        );
      })}
      <li className="bg-carbon">
        <Link href="/explore" className={cellLink}>
          <span className="flex items-start justify-between gap-2">
            <span className="font-semibold tracking-[-0.01em]">All setups</span>
            <Icon name="arrow-right" size={14} className="mt-1 shrink-0 text-fg-3 transition duration-150 ease-kit group-hover:translate-x-0.5 group-hover:text-lime" />
          </span>
          <span className="mt-4 font-mono text-xs text-fg-2 tabular-nums">{pluralize(setups.length, "setup")}</span>
        </Link>
      </li>
    </ul>
  );
}

export function LatestSetups({ setups: builtIn, limit }: Props & { limit: number }) {
  const { setups } = useAllSetups(builtIn);
  if (setups.length === 0) {
    return (
      <EmptyState
        eyebrow="0 setups"
        title="Nothing has been published yet"
        actions={
          <Link href="/publish" className={buttonClass("primary")}>
            Publish the first setup
          </Link>
        }
      >
        The directory is empty. Kitloom does not fill itself with placeholder listings, so this
        space stays blank until a real setup is published.
      </EmptyState>
    );
  }
  return <SetupGrid setups={setups.slice(0, limit)} />;
}

export function BrowseAllLink({ setups: builtIn }: Props) {
  const { setups } = useAllSetups(builtIn);
  if (setups.length === 0) return null;
  return (
    <Link href="/explore" className={buttonClass("secondary", "md")}>
      Browse all {setups.length}
      <Icon name="arrow-right" size={16} />
    </Link>
  );
}

export function CategoryRows({ setups: builtIn }: Props) {
  const { setups } = useAllSetups(builtIn);
  return (
    <ul>
      {CATEGORIES.map((category, index) => {
        const count = setups.filter((setup) => setup.categories.includes(category.id)).length;
        return (
          <li key={category.id} data-reveal-item className="border-b border-line-subtle last:border-b-0">
            <Link
              href={exploreHref({ category: category.id })}
              className="cell-x group flex items-baseline gap-4 py-4 transition-colors duration-150 ease-kit hover:bg-surface"
            >
              <span className="w-6 shrink-0 font-mono text-xs text-fg-3 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1 md:flex md:items-baseline md:gap-6">
                <span className="block font-semibold tracking-[-0.01em] md:w-64 md:shrink-0">{category.label}</span>
                <span className="mt-0.5 block text-sm text-fg-2 md:mt-0">{category.description}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3 font-mono text-xs whitespace-nowrap text-fg-2 tabular-nums">
                {pluralize(count, "setup")}
                <Icon name="arrow-right" size={14} className="text-fg-3 transition duration-150 ease-kit group-hover:translate-x-0.5 group-hover:text-lime" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
