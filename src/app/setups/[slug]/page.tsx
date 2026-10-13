import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FileTree } from "@/components/files/FileTree";
import { ReadmePreview } from "@/components/files/ReadmePreview";
import { totalBytes } from "@/components/files/tree";
import { DownloadButton } from "@/components/setups/DownloadButton";
import { InstallSteps } from "@/components/setups/InstallSteps";
import { CopyButton } from "@/components/ui/CopyButton";
import { Band } from "@/components/ui/Frame";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { Reveal } from "@/components/ui/Reveal";
import { getAllSlugs, getSetupBySlug } from "@/lib/catalog";
import { exploreHref } from "@/lib/catalog/query";
import { getAgent, getCategory } from "@/lib/catalog/taxonomy";
import { formatBytes, formatDate, pluralize } from "@/lib/format";
import { getDownloadAccess } from "@/lib/packages/access";
import { describeContents } from "@/lib/packages/contents";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Static export: every setup page is generated at build time; unknown slugs are 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const setup = getSetupBySlug(slug);
  if (!setup) return { title: "Setup not found" };
  return {
    title: setup.name,
    description: setup.description,
    alternates: { canonical: `/setups/${setup.slug}` },
    openGraph: { title: setup.name, description: setup.description, url: `/setups/${setup.slug}`, type: "article" },
  };
}

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

export default async function SetupPage({ params }: PageProps) {
  const { slug } = await params;
  const setup = getSetupBySlug(slug);
  if (!setup) notFound();

  const access = getDownloadAccess(setup);
  const contents = describeContents(setup.manifest);
  const executable = contents.filter((kind) => kind.executes);
  const manifestBytes = totalBytes(setup.manifest);
  const anyTested = setup.agents.some((agent) => agent.compatibility === "tested");

  return (
    <>
      <Band as="div">
        <Reveal mode="load" className="cell-x py-8 lg:py-10">
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
                    <DownloadButton url={access.url} fileName={access.fileName} external={access.external} sha256={setup.package.sha256} />
                    <p className="mt-3 font-mono text-xs break-all text-fg-2">
                      {access.fileName}
                      {setup.package.sizeBytes !== null ? ` · ${formatBytes(setup.package.sizeBytes)}` : ""}
                      {" · Free"}
                    </p>
                    {access.external ? (
                      <p className="mt-1.5 text-xs text-fg-2">Hosted by the creator on GitHub Releases. The link leaves kitloom.site.</p>
                    ) : null}
                  </>
                ) : (
                  <Notice tone="danger" label="No download available">
                    {access.reason}
                  </Notice>
                )}
              </div>

              <div className="cell-x border-b border-line py-5 lg:px-6">
                <h2 className="eyebrow text-fg-3">SHA-256 checksum</h2>
                {setup.package.sha256 ? (
                  <>
                    <p className="mt-2.5 rounded-xs border border-line bg-surface px-3 py-2 font-mono text-xs leading-relaxed break-all text-fg">
                      {setup.package.sha256}
                    </p>
                    <div className="mt-2.5 flex items-start justify-between gap-3">
                      <p className="text-xs leading-relaxed text-fg-2">
                        {setup.origin === "first-party"
                          ? "Computed from the built file at deploy time. "
                          : "Provided by the creator. "}
                        Proves integrity, not safety.
                      </p>
                      <CopyButton value={setup.package.sha256} label="Copy" subject="Checksum" />
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-fg-2">Not provided. This download cannot be verified against a known value.</p>
                )}
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
                  <Row term="origin">{setup.origin === "first-party" ? "Kitloom starter kit" : "Community"}</Row>
                  <Row term="format">
                    <span className="font-mono text-code uppercase">{setup.package.format}</span>
                  </Row>
                  <Row term="size">
                    {setup.package.sizeBytes !== null ? <span className="font-mono text-code tabular-nums">{formatBytes(setup.package.sizeBytes)}</span> : NOT_PROVIDED}
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
                  <Row term="source">
                    {setup.repositoryUrl ? (
                      <a href={setup.repositoryUrl} rel="noopener noreferrer nofollow" className="link break-all">
                        {new URL(setup.repositoryUrl).host + new URL(setup.repositoryUrl).pathname}
                      </a>
                    ) : (
                      NOT_PROVIDED
                    )}
                  </Row>
                </dl>
              </div>

              <div className="cell-x py-5 lg:px-6">
                <Notice tone="warning" label="Inspect before you use it">
                  <p>
                    Agent setups can contain instructions, hooks, and tool configuration that make an
                    agent run commands on your machine. Read every file first. Kitloom reviews
                    listings by hand and does not scan or execute package contents.
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
                  The creator did not provide a README for this listing.
                  {setup.repositoryUrl ? " The source repository may have more detail." : ""}
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
                    <FileTree rootName={setup.slug} manifest={setup.manifest} />
                  </div>

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
                  No file manifest was provided for this listing. Open the ZIP and review its contents
                  before copying anything into a project.
                </p>
              )}
            </Section>

            <Section id="install-title" title="Install">
              <InstallSteps setup={setup} access={access} />
            </Section>

            <Section id="release-title" title="Release notes" meta={setup.version ? `v${setup.version}` : undefined}>
              {setup.releaseNotes ? (
                <p className="max-w-[68ch] text-sm leading-relaxed whitespace-pre-line text-fg-2">{setup.releaseNotes}</p>
              ) : (
                <p className="text-sm text-fg-2">No release notes were provided for this version.</p>
              )}
            </Section>
          </div>
        </div>
      </Band>
    </>
  );
}
