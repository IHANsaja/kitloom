import Link from "next/link";

import { FileTree } from "@/components/files/FileTree";
import { totalBytes } from "@/components/files/tree";
import { HomeSearch } from "@/components/search/HomeSearch";
import { SetupGrid } from "@/components/setups/SetupCell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Band, SectionHeader } from "@/components/ui/Frame";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { buttonClass } from "@/components/ui/styles";
import { getSetupSummaries, getShowcaseSetup } from "@/lib/catalog";
import { exploreHref } from "@/lib/catalog/query";
import { AGENT_FILTERS, CATEGORIES, matchesAgentFilter } from "@/lib/catalog/taxonomy";
import { formatBytes, pluralize } from "@/lib/format";

const JOURNEY = ["Discover", "Inspect", "Download", "Customize", "Share"] as const;
const LATEST_LIMIT = 8;

export default function HomePage() {
  const setups = getSetupSummaries();
  const showcase = getShowcaseSetup();
  const latest = setups.slice(0, LATEST_LIMIT);
  const showcaseBytes = showcase ? totalBytes(showcase.manifest) : null;

  return (
    <>
      <Band labelledBy="home-title">
        <Reveal mode="load" className="grid lg:grid-cols-12">
          <div className="cell-x py-12 sm:py-16 lg:col-span-7 lg:py-20">
            <p data-reveal-item className="eyebrow text-fg-2">
              A free directory of AI coding-agent setups
            </p>
            <h1 id="home-title" className="mt-5 text-display text-balance">
              <span data-reveal-item className="block">
                Agent setups,
              </span>
              <span data-reveal-item className="block">
                woven into <span className="text-lime">kits</span>
              </span>
              <span data-reveal-item className="block">
                you can reuse.
              </span>
            </h1>
            <p data-reveal-item className="mt-6 max-w-[54ch] text-[1.0625rem] leading-relaxed text-fg-2 text-pretty">
              Instructions, rules, skills, commands, and hooks for Claude Code, Codex, Cursor,
              Antigravity, and other agents. See exactly which files a kit contains before you
              download the ZIP.
            </p>
            <div data-reveal-item className="mt-8 max-w-[640px]">
              <HomeSearch />
            </div>
            <ol data-reveal-item aria-label="How Kitloom is used" className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 font-mono text-xs text-fg-2">
              {JOURNEY.map((step, index) => (
                <li key={step} className="flex items-center gap-2.5">
                  {index > 0 ? <Icon name="arrow-right" size={12} className="text-fg-3" /> : null}
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <aside aria-label="Example kit" className="flex flex-col border-t border-line lg:col-span-5 lg:border-t-0 lg:border-l">
            {showcase ? (
              <>
                <div data-reveal-item className="cell-x flex items-center justify-between gap-4 border-b border-line py-3 lg:px-6">
                  <p className="eyebrow text-fg-3">What a kit looks like</p>
                  <p className="font-mono text-xs text-fg-2 tabular-nums">
                    {pluralize(showcase.manifest.length, "file")}
                    {showcaseBytes !== null ? ` · ${formatBytes(showcaseBytes)}` : ""}
                  </p>
                </div>
                <div className="cell-x grow py-5 lg:px-6">
                  <FileTree rootName={showcase.slug} manifest={showcase.manifest} />
                </div>
                <div data-reveal-item className="cell-x border-t border-line py-4 lg:px-6">
                  <p className="text-sm text-fg-2">
                    This is the real file list of{" "}
                    <Link href={`/setups/${showcase.slug}`} className="link font-medium">
                      {showcase.name}
                    </Link>
                    . Every listing shows its files, licence, and checksum.
                  </p>
                </div>
              </>
            ) : (
              <div className="cell-x py-10 lg:px-6">
                <p className="eyebrow text-fg-3">What a kit looks like</p>
                <p className="mt-3 text-sm text-fg-2">
                  A kit is a ZIP of agent configuration files. Once a setup is published, its real
                  file list appears here.
                </p>
              </div>
            )}
          </aside>
        </Reveal>
      </Band>

      <Band id="agents" labelledBy="agents-title" className="scroll-mt-14">
        <SectionHeader id="agents-title" eyebrow="By agent" title="Start from the tool you use">
          Compatibility is stated per setup. Counts are the number of listed setups that declare
          support for each agent.
        </SectionHeader>
        <Reveal>
          <ul className="grid grid-cols-2 gap-px bg-line md:grid-cols-3 xl:grid-cols-6">
            {AGENT_FILTERS.map((filter) => {
              const count = setups.filter((setup) => matchesAgentFilter(setup.agents, filter.id)).length;
              return (
                <li key={filter.id} className="bg-carbon">
                  <Link
                    href={exploreHref({ agent: filter.id })}
                    className="group flex h-full min-h-28 flex-col justify-between px-4 py-4 transition-colors duration-150 ease-kit hover:bg-surface sm:px-6"
                  >
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
              <Link
                href="/explore"
                className="group flex h-full min-h-28 flex-col justify-between px-4 py-4 transition-colors duration-150 ease-kit hover:bg-surface sm:px-6"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-semibold tracking-[-0.01em]">All setups</span>
                  <Icon name="arrow-right" size={14} className="mt-1 shrink-0 text-fg-3 transition duration-150 ease-kit group-hover:translate-x-0.5 group-hover:text-lime" />
                </span>
                <span className="mt-4 font-mono text-xs text-fg-2 tabular-nums">{pluralize(setups.length, "setup")}</span>
              </Link>
            </li>
          </ul>
        </Reveal>
      </Band>

      <Band labelledBy="latest-title">
        <SectionHeader
          id="latest-title"
          eyebrow="Latest"
          title="Recently published"
          action={
            setups.length > 0 ? (
              <Link href="/explore" className={buttonClass("secondary", "md")}>
                Browse all {setups.length}
                <Icon name="arrow-right" size={16} />
              </Link>
            ) : undefined
          }
        />
        {latest.length > 0 ? (
          <Reveal>
            <SetupGrid setups={latest} />
          </Reveal>
        ) : (
          <EmptyState
            eyebrow="0 setups"
            title="Nothing has been published yet"
            actions={
              <Link href="/publish" className={buttonClass("primary")}>
                Publish the first setup
              </Link>
            }
          >
            The catalog is empty. Kitloom does not fill itself with placeholder listings, so this
            space stays blank until a real setup is submitted.
          </EmptyState>
        )}
      </Band>

      <Band labelledBy="categories-title">
        <SectionHeader id="categories-title" eyebrow="By category" title="Or start from the job to be done" />
        <Reveal>
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
        </Reveal>
      </Band>

      <Band labelledBy="publish-title">
        <Reveal className="grid lg:grid-cols-12">
          <div className="cell-x py-12 lg:col-span-7 lg:py-14">
            <p className="eyebrow text-fg-3">Share</p>
            <h2 id="publish-title" className="mt-2 text-h1 text-balance">
              Built a setup that works? List it.
            </h2>
            <p className="mt-4 max-w-[56ch] text-fg-2 text-pretty">
              You keep your package in your own GitHub repository and add one catalog entry by
              pull request. No account here, no upload form, no fee.
            </p>
          </div>
          <div className="cell-x flex items-center border-t border-line py-8 lg:col-span-5 lg:border-t-0 lg:border-l lg:px-6">
            <div className="flex flex-wrap gap-3">
              <Link href="/publish" className={buttonClass("primary", "lg")}>
                How to publish
                <Icon name="arrow-right" size={16} />
              </Link>
              <Link href="/about" className={buttonClass("secondary", "lg")}>
                What qualifies as a setup
              </Link>
            </div>
          </div>
        </Reveal>
      </Band>
    </>
  );
}
