import type { ReactNode } from "react";
import Link from "next/link";

import { FileTree } from "@/components/files/FileTree";
import { ReadmePreview } from "@/components/files/ReadmePreview";
import { totalBytes } from "@/components/files/tree";
import { DownloadButton } from "@/components/setups/DownloadButton";
import { InstallSteps } from "@/components/setups/InstallSteps";
import { Band } from "@/components/ui/Frame";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { Reveal } from "@/components/ui/Reveal";
import { exploreHref } from "@/lib/catalog/query";
import { getAgent, getCategory } from "@/lib/catalog/taxonomy";
import { formatBytes, formatDate, pluralize } from "@/lib/format";
import { getDownloadAccess } from "@/lib/packages/access";
import { gitHubRepoLabel } from "@/lib/packages/urls";
import { describeContents } from "@/lib/packages/contents";
import type { Setup } from "@/types/catalog";
import { KitUnfold } from "@/components/motion/Illustrations";

const NOT_PROVIDED = <span className="text-fg-2">Not provided</span>;

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line-subtle py-2.5 last:border-b-0">
      <dt className="font-mono text-xs text-fg-2">{term}</dt>
      <dd className="min-w-0 text-right text-sm break-words text-fg">{children}</dd>
    </div>
  );
}

function Section({ id, title, meta, children }: { id: string; title: string; meta?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="cell-x border-b border-line py-8 last:border-b-0 lg:pr-8">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={id} className="text-h2">
          {title}
        </h2>
        {meta ? <p className="font-mono text-xs text-fg-2 tabular-nums">{meta}</p> : null}
      </div>
      {children}
    </section>
  );
}

interface SetupDetailProps {
  setup: Setup;
  /** Rendered above the header, e.g. owner controls on a community listing. */
  banner?: ReactNode;
}

/**
 * The full listing page body, rendered in the browser once a setup has been fetched.
 */
export function SetupDetail({ setup, banner }: SetupDetailProps) {
  const access = getDownloadAccess(setup);
  const contents = describeContents(setup.manifest);
  const executable = contents.filter((kind) => kind.executes);
  const manifestBytes = totalBytes(setup.manifest);
  const anyTested = setup.agents.some((agent) => agent.compatibility === "tested");

  return (
    <>
      {banner}
      <Band as="div">
        <Reveal mode="load" className="cell-x relative py-8 lg:py-10">
          <KitUnfold className="pointer-events-none absolute top-8 right-10 hidden h-[110px] w-auto lg:block" />
          <nav aria-label="Breadcrumb" data-reveal-item>
            <ol className="flex flex-wrap items-center gap-2 font-mono text-xs text-fg-2">
              <li>
                <Link href="/explore" className="hover:text-fg">
                  explore
                </Link>
              </li>
              <li aria-hidden="true" className="text-fg-3">
                /
              </li>
              <li aria-current="page" className="break-all text-fg">
                {setup.slug}
              </li>
            </ol>
          </nav>

          <h1 data-reveal-item className="mt-5 text-h1 text-balance break-words">
            {setup.name}
          </h1>
          <p data-reveal-item className="mt-3 max-w-[70ch] text-[1.0625rem] leading-relaxed text-fg-2 text-pretty">
            {setup.description}
          </p>

          <div data-reveal-item className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ul aria-label="Categories" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {setup.categories.map((id) => (
                <li key={id}>
                  <Link href={exploreHref({ category: id })} className="link">
                    {getCategory(id).label}
                  </Link>
                </li>
              ))}
            </ul>
            {setup.tags.length > 0 ? (
              <ul aria-label="Tags" className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-fg-2">
                {setup.tags.map((tag) => (
                  <li key={tag}>
                    <Link href={exploreHref({ q: tag })} className="hover:text-fg">
                      #{tag}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Reveal>
      </Band>

      <Band as="div">
        <div className="lg:grid lg:grid-cols-12">
          <aside aria-label="Package details" className="border-b border-line lg:order-2 lg:col-span-4 lg:border-b-0">
            <div className="lg:sticky lg:top-14 lg:max-h-[calc(100dvh-3.5rem)] lg:overflow-y-auto">
              <div className="cell-x border-b border-line py-6 lg:px-6">
                {access.kind === "free" ? (
                  <>
                    <DownloadButton url={access.url} repositoryUrl={setup.repositoryUrl} />
                    <p className="mt-3 font-mono text-xs text-fg-2">ZIP from github.com · Free</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-fg-2">
                      First, Heddle checks the repository&apos;s latest commit in your browser for warning
                      signs: hidden instructions, commands that run on their own, credential theft. Then
                      you download exactly that commit. It cannot catch everything.
                    </p>
                  </>
                ) : (
                  <Notice tone="danger" label="No download available">
                    {access.reason}
                  </Notice>
                )}
              </div>

              <div className="cell-x border-b border-line py-5 lg:px-6">
                <h2 className="eyebrow text-fg-3">Source repository</h2>
                <a href={setup.repositoryUrl} rel="noopener noreferrer nofollow" className="link mt-2.5 inline-flex max-w-full items-baseline gap-1.5 font-mono text-code break-all">
                  {gitHubRepoLabel(setup.repositoryUrl)}
                  <Icon name="arrow-up-right" size={12} className="shrink-0 self-center text-fg-2" />
                </a>
                <p className="mt-2.5 text-xs leading-relaxed text-fg-2">
                  There is no published checksum. Downloads are pinned to the commit Heddle checked,
                  and the ZIP keeps that commit&apos;s ID in its name; the repository&apos;s commit history
                  shows what changed and when.
                </p>
              </div>

              <div className="cell-x border-b border-line py-5 lg:px-6">
                <h2 className="eyebrow text-fg-3">Compatibility</h2>
                <ul className="mt-2.5 space-y-2">
                  {setup.agents.map((agent) => (
                    <li key={agent.id} className="flex items-baseline justify-between gap-4 text-sm">
                      <Link href={exploreHref({ agent: agent.id })} className="link">
                        {getAgent(agent.id).name}
                      </Link>
                      {agent.compatibility === "tested" ? (
                        <span className="flex items-center gap-1.5 font-mono text-xs text-success">
                          <Icon name="check" size={12} />
                          tested
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-fg-2">declared</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-fg-2">
                  {anyTested
                    ? "“Tested” means the setup was verified with that agent. “Declared” is the creator's statement only."
                    : "Declared by the creator. Kitloom has not independently tested this setup with any agent."}
                </p>
              </div>

              <div className="cell-x border-b border-line py-3 lg:px-6">
                <h2 className="sr-only">Details</h2>
                <dl>
                  <Row term="version">{setup.version ? <span className="font-mono text-code tabular-nums">{setup.version}</span> : NOT_PROVIDED}</Row>
                  <Row term="licence">{setup.license ? <span className="font-mono text-code">{setup.license}</span> : NOT_PROVIDED}</Row>
                  <Row term="creator">
                    {setup.creator.url ? (
                      <a href={setup.creator.url} rel="noopener noreferrer nofollow" className="link">
                        {setup.creator.name}
                      </a>
                    ) : (
                      setup.creator.name
                    )}
                  </Row>
                  <Row term="format">
                    <span className="font-mono text-code uppercase">{setup.package.format}</span>
                  </Row>
                  <Row term="published">
                    <time dateTime={setup.publishedAt} className="font-mono text-code tabular-nums">
                      {formatDate(setup.publishedAt)}
                    </time>
                  </Row>
                  <Row term="updated">
                    <time dateTime={setup.updatedAt} className="font-mono text-code tabular-nums">
                      {formatDate(setup.updatedAt)}
                    </time>
                  </Row>
                </dl>
              </div>

              {setup.sourceRepositories.length > 0 ? (
                <div className="cell-x border-b border-line py-5 lg:px-6">
                  <h2 className="eyebrow text-fg-3">Built from</h2>
                  <ul className="mt-2.5 space-y-2">
                    {setup.sourceRepositories.map((url) => (
                      <li key={url}>
                        <a href={url} rel="noopener noreferrer nofollow" className="link inline-flex max-w-full items-baseline gap-1.5 font-mono text-code break-all">
                          {gitHubRepoLabel(url)}
                          <Icon name="arrow-up-right" size={12} className="shrink-0 self-center text-fg-2" />
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs leading-relaxed text-fg-2">
                    Repositories the creator credits as sources for this setup. Listed by the creator;
                    Kitloom has not checked them, and they are not part of the download.
                  </p>
                </div>
              ) : null}

              <div className="cell-x py-5 lg:px-6">
                <Notice tone="warning" label="Inspect before you use it">
                  <p>
                    Agent setups can contain instructions, hooks, and tool configuration that make an
                    agent run commands on your machine. Read every file first. Listings are published
                    by their creators without review. Heddle&apos;s pre-download check looks for warning
                    signs, but it cannot prove a setup is safe, and Kitloom never runs their contents.
                  </p>
                </Notice>
              </div>
            </div>
          </aside>

          <div className="min-w-0 lg:order-1 lg:col-span-8 lg:border-r lg:border-line">
            <Section id="readme-title" title="README">
              {setup.readme ? (
                <ReadmePreview markdown={setup.readme} />
              ) : (
                <p className="text-sm text-fg-2">
                  This repository had no README when the listing was last updated. Browse the source
                  repository to see what it contains.
                </p>
              )}
            </Section>

            <Section
              id="files-title"
              title="Files"
              meta={
                setup.manifest.length > 0
                  ? `${pluralize(setup.manifest.length, "file")}${manifestBytes !== null ? ` · ${formatBytes(manifestBytes)} unpacked` : ""}`
                  : undefined
              }
            >
              {setup.manifest.length > 0 ? (
                <>
                  <div className="rounded-sm border border-line px-4 py-4">
                    <FileTree rootName={gitHubRepoLabel(setup.repositoryUrl).split("/")[1] ?? setup.slug} manifest={setup.manifest} />
                  </div>
                  <p className="mt-3 text-sm text-fg-2">
                    This list was read from the repository on {formatDate(setup.updatedAt)}. The
                    repository may have changed since; the ZIP always contains its current files.
                  </p>

                  <h3 className="mt-7 font-semibold">What these files do</h3>
                  <p className="mt-1 text-sm text-fg-2">Worked out from file paths alone. It is a reading aid, not a security scan.</p>
                  <ul className="mt-3 border-t border-line-subtle">
                    {contents.map((kind) => (
                      <li key={kind.id} className="grid gap-x-6 gap-y-0.5 border-b border-line-subtle py-2.5 sm:grid-cols-[14rem_1fr]">
                        <span className="flex items-baseline gap-2 text-sm font-medium">
                          {kind.label}
                          <span className="font-mono text-xs font-normal text-fg-2 tabular-nums">×{kind.count}</span>
                        </span>
                        <span className="text-sm text-fg-2">
                          {kind.executes ? (
                            <span className="mr-1.5 inline-flex items-center gap-1 font-mono text-xs text-warning">
                              <Icon name="alert" size={12} />
                              can run commands
                            </span>
                          ) : null}
                          {kind.note}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {executable.length === 0 ? (
                    <p className="mt-3 text-sm text-fg-2">
                      No scripts, hook settings, or MCP server configuration were found by path. Instruction
                      files can still tell an agent to run commands, so read them.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-fg-2">
                  The file list could not be read when this listing was last updated. Open the ZIP and
                  review its contents before copying anything into a project.
                </p>
              )}
            </Section>

            <Section id="install-title" title="Install">
              <InstallSteps access={access} />
            </Section>
          </div>
        </div>
      </Band>
    </>
  );
}
