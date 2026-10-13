import Link from "next/link";

import { FileTree } from "@/components/files/FileTree";
import { totalBytes } from "@/components/files/tree";
import { HomeSearch } from "@/components/search/HomeSearch";
import { AgentCells, BrowseAllLink, CategoryRows, LatestSetups } from "@/components/setups/HomeSections";
import { Band, SectionHeader } from "@/components/ui/Frame";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { buttonClass } from "@/components/ui/styles";
import { getSetupSummaries, getShowcaseSetup } from "@/lib/catalog";
import { formatBytes, pluralize } from "@/lib/format";

const JOURNEY = ["Discover", "Inspect", "Download", "Customize", "Share"] as const;
const LATEST_LIMIT = 8;

export default function HomePage() {
  const setups = getSetupSummaries();
  const showcase = getShowcaseSetup();
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
          <AgentCells setups={setups} />
        </Reveal>
      </Band>

      <Band labelledBy="latest-title">
        <SectionHeader id="latest-title" eyebrow="Latest" title="Recently published" action={<BrowseAllLink setups={setups} />} />
        <Reveal>
          <LatestSetups setups={setups} limit={LATEST_LIMIT} />
        </Reveal>
      </Band>

      <Band labelledBy="categories-title">
        <SectionHeader id="categories-title" eyebrow="By category" title="Or start from the job to be done" />
        <Reveal>
          <CategoryRows setups={setups} />
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
              Keep the files in your own public GitHub repository. Sign in, paste the repository
              link, and describe what the setup is for. Listing is free.
            </p>
          </div>
          <div className="cell-x flex items-center border-t border-line py-8 lg:col-span-5 lg:border-t-0 lg:border-l lg:px-6">
            <div className="flex flex-wrap gap-3">
              <Link href="/publish" className={buttonClass("primary", "lg")}>
                Publish a setup
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
