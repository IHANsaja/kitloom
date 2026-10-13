"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { FileTree } from "@/components/files/FileTree";
import { totalBytes } from "@/components/files/tree";
import { SetupGrid } from "@/components/setups/SetupCell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/styles";
import { exploreHref } from "@/lib/catalog/query";
import { setupHref } from "@/lib/catalog/summary";
import { AGENT_FILTERS, CATEGORIES, matchesAgentFilter } from "@/lib/catalog/taxonomy";
import { fetchLatestSetup } from "@/lib/community/setups";
import { useSetups, type SetupsState } from "@/lib/community/useSetups";
import { formatBytes, pluralize } from "@/lib/format";
import { gitHubRepoLabel } from "@/lib/packages/urls";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { Setup } from "@/types/catalog";
import { LoadingLine } from "@/components/motion/Strings";

/**
 * Home-page sections. Every number and listing here comes from the database, fetched in
 * the browser. Until it answers, counts show a dash — never a zero that might be wrong.
 */

const cellLink =
  "group flex h-full min-h-28 flex-col justify-between px-4 py-4 transition-colors duration-150 ease-kit hover:bg-surface sm:px-6";

function Count({ value, state }: { value: number; state: SetupsState }) {
  if (state === "ready") return <>{pluralize(value, "setup")}</>;
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{state === "loading" ? "Loading count" : "Count unavailable"}</span>
    </>
  );
}

export function AgentCells() {
  const { setups, state } = useSetups();
  return (
    <ul className="grid grid-cols-2 gap-px bg-line md:grid-cols-3 xl:grid-cols-6">
      {AGENT_FILTERS.map((filter) => (
        <li key={filter.id} className="bg-carbon">
          <Link href={exploreHref({ agent: filter.id })} className={cellLink}>
            <span className="flex items-start justify-between gap-2">
              <span className="font-semibold tracking-[-0.01em]">{filter.label}</span>
              <Icon name="arrow-up-right" size={14} className="mt-1 shrink-0 text-fg-3 transition duration-150 ease-kit group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-lime" />
            </span>
            <span className="mt-4 font-mono text-xs text-fg-2 tabular-nums">
              <Count state={state} value={setups.filter((setup) => matchesAgentFilter(setup.agents, filter.id)).length} />
            </span>
          </Link>
        </li>
      ))}
      <li className="bg-carbon">
        <Link href="/explore" className={cellLink}>
          <span className="flex items-start justify-between gap-2">
            <span className="font-semibold tracking-[-0.01em]">All setups</span>
            <Icon name="arrow-right" size={14} className="mt-1 shrink-0 text-fg-3 transition duration-150 ease-kit group-hover:translate-x-0.5 group-hover:text-lime" />
          </span>
          <span className="mt-4 font-mono text-xs text-fg-2 tabular-nums">
            <Count state={state} value={setups.length} />
          </span>
        </Link>
      </li>
    </ul>
  );
}

export function LatestSetups({ limit }: { limit: number }) {
  const { setups, state } = useSetups();

  if (state === "loading") {
    return (
      <LoadingLine className="cell-x py-14">Loading setups…</LoadingLine>
    );
  }
  if (state === "error" || state === "off") {
    return (
      <EmptyState
        eyebrow={state === "off" ? "Not connected" : "Could not load"}
        title={state === "off" ? "The directory is not connected" : "Setups could not be loaded"}
        actions={
          state === "error" ? (
            <button type="button" onClick={() => window.location.reload()} className={buttonClass("primary")}>
              Reload
            </button>
          ) : undefined
        }
      >
        {state === "off"
          ? "This build has no database configured, so there are no listings to show."
          : "The database did not respond. Try again in a moment."}
      </EmptyState>
    );
  }
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
        space stays blank until someone publishes a real setup.
      </EmptyState>
    );
  }
  return <SetupGrid setups={setups.slice(0, limit)} />;
}

export function BrowseAllLink() {
  const { setups, state } = useSetups();
  if (state !== "ready" || setups.length === 0) return null;
  return (
    <Link href="/explore" className={buttonClass("secondary", "md")}>
      Browse all {setups.length}
      <Icon name="arrow-right" size={16} />
    </Link>
  );
}

export function CategoryRows() {
  const { setups, state } = useSetups();
  return (
    <ul>
      {CATEGORIES.map((category, index) => (
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
              <Count state={state} value={setups.filter((setup) => setup.categories.includes(category.id)).length} />
              <Icon name="arrow-right" size={14} className="text-fg-3 transition duration-150 ease-kit group-hover:translate-x-0.5 group-hover:text-lime" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type ShowcaseState = { kind: "loading" } | { kind: "ready"; setup: Setup } | { kind: "none" };

/**
 * The hero's worked example: the real file list of the most recently published setup.
 * With nothing published it explains what a kit is instead of inventing one.
 */
export function ShowcaseKit() {
  const [state, setState] = useState<ShowcaseState>(isSupabaseConfigured ? { kind: "loading" } : { kind: "none" });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    fetchLatestSetup().then(
      (setup) => active && setState(setup && setup.manifest.length > 0 ? { kind: "ready", setup } : { kind: "none" }),
      () => active && setState({ kind: "none" }),
    );
    return () => {
      active = false;
    };
  }, []);

  if (state.kind !== "ready") {
    return (
      <div className="cell-x py-10 lg:px-6">
        <p className="eyebrow text-fg-3">What a kit looks like</p>
        {state.kind === "loading" ? (
          <LoadingLine className="mt-4">Loading the latest setup…</LoadingLine>
        ) : (
          <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-fg-2">
            A kit is a public GitHub repository of agent configuration: instructions, rules,
            skills, commands, hooks. When a setup is published, its real file list appears here.
          </p>
        )}
      </div>
    );
  }

  const { setup } = state;
  const bytes = totalBytes(setup.manifest);
  return (
    <>
      <div className="cell-x flex items-center justify-between gap-4 border-b border-line py-3 lg:px-6">
        <p className="eyebrow text-fg-3">What a kit looks like</p>
        <p className="font-mono text-xs text-fg-2 tabular-nums">
          {pluralize(setup.manifest.length, "file")}
          {bytes !== null ? ` · ${formatBytes(bytes)}` : ""}
        </p>
      </div>
      <div className="cell-x max-h-[26rem] grow overflow-y-auto py-5 lg:px-6">
        <FileTree rootName={gitHubRepoLabel(setup.repositoryUrl).split("/")[1] ?? setup.slug} manifest={setup.manifest} />
      </div>
      <div className="cell-x border-t border-line py-4 lg:px-6">
        <p className="text-sm text-fg-2">
          This is the real file list of{" "}
          <Link href={setupHref(setup.slug)} className="link font-medium">
            {setup.name}
          </Link>
          , the most recently published setup.
        </p>
      </div>
    </>
  );
}
