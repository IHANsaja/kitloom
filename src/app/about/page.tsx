import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { Band } from "@/components/ui/Frame";
import { buttonClass } from "@/components/ui/styles";
import { AGENTS } from "@/lib/catalog/taxonomy";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Kitloom is, what counts as a setup, how contributions, licensing, compatibility, security, and updates work.",
  alternates: { canonical: "/about" },
};

const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: "what",
    title: "What Kitloom is",
    body: (
      <>
        <p>
          Kitloom is a directory of reusable setups for AI coding agents. Developers already
          write good instructions, rules, skills, and workflows for their tools; they are
          scattered across repositories and hard to compare. Kitloom lists them in one place,
          shows what each one contains, and links to the ZIP.
        </p>
        <p>
          It is free, has no accounts, sets no cookies, and runs no analytics. The whole site is
          static files built from one JSON catalog. It is not a chatbot, it does not run agents,
          and it does not install anything for you.
        </p>
      </>
    ),
  },
  {
    id: "setup",
    title: "What qualifies as a setup",
    body: (
      <>
        <p>A setup is a ZIP of configuration that changes how a coding agent behaves in a project:</p>
        <ul>
          <li>agent instructions and project rules</li>
          <li>skills, commands, and agent definitions</li>
          <li>hooks, workflow templates, and tool configuration</li>
          <li>the documentation and install notes that go with them</li>
        </ul>
        <p>
          A setup can target one agent or several. Applications, model weights, datasets, and
          bare prompt collections are out of scope.
        </p>
      </>
    ),
  },
  {
    id: "compatibility",
    title: "Compatibility declarations",
    body: (
      <>
        <p>
          Each listing names the agents it supports. Kitloom currently recognises{" "}
          {AGENTS.map((agent) => agent.name).join(", ")}.
        </p>
        <p>
          <strong>Declared</strong> means the creator says the setup works with that agent.{" "}
          <strong>Tested</strong> means it was actually verified, and the listing shows that
          separately. Kitloom does not test packages itself, and a setup is never assumed to
          work with an agent it does not name. Agents change between versions, so check the
          date on a listing.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security expectations",
    body: (
      <>
        <p>
          A setup is not passive text. Instructions can tell an agent to run commands, hooks run
          shell commands automatically, and MCP configuration starts programs. Treat a kit like
          code from a stranger.
        </p>
        <ul>
          <li>Read every file before copying it into a project. The listing shows the full file list.</li>
          <li>Extract into an empty folder first, never straight into a repository.</li>
          <li>
            Compare the SHA-256 when one is shown. A match proves you received the listed file.
            It does not prove the file is safe.
          </li>
          <li>Being hosted on GitHub, or listed here, does not make a package trusted.</li>
        </ul>
        <p>
          Kitloom never executes package contents and does not run automated scanning. Listings
          are reviewed by a person when they are submitted. READMEs are displayed as plain
          Markdown with HTML removed and remote images blocked.
        </p>
      </>
    ),
  },
  {
    id: "licensing",
    title: "Licensing and attribution",
    body: (
      <>
        <p>
          Every setup belongs to its creator. Listings show the licence the creator stated, or
          “No licence stated” when there is none. Without a licence you do not automatically have
          the right to reuse or redistribute someone&apos;s work, even when the repository is public.
        </p>
        <p>
          Creator names, source repository links, and licence files are preserved as submitted.
          If you build on someone else&apos;s setup, keep their notice and follow their terms.
        </p>
      </>
    ),
  },
  {
    id: "contribute",
    title: "How to contribute",
    body: (
      <>
        <p>
          Host your ZIP as a release asset in your own GitHub repository, then add one record to
          the catalog by pull request. The build validates the record and a maintainer reviews
          the package. There is no upload form, because a static site cannot hold publishing
          credentials safely.
        </p>
        <p>
          <Link href="/publish" className={buttonClass("secondary", "md", "no-underline")}>
            Read the publishing steps
          </Link>
        </p>
      </>
    ),
  },
  {
    id: "updates",
    title: "How updates are handled",
    body: (
      <>
        <p>
          The catalog is a file in version control, so every change to a listing is a reviewed
          commit. To update a setup, publish a new release and open a pull request that changes
          the version, download URL, size, checksum, manifest, and updated date.
        </p>
        <p>
          Kitloom links to one version per setup. Older releases stay available in the
          creator&apos;s repository. Kitloom does not show download counts, because a static site has
          no trustworthy way to count them.
        </p>
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <>
      <Band as="div">
        <div className="cell-x py-10 lg:py-14">
          <p className="eyebrow text-fg-3">About</p>
          <h1 className="mt-2 max-w-[22ch] text-h1 text-balance">A plain directory for agent setups</h1>
        </div>
      </Band>
      <Band as="div">
        <div className="lg:grid lg:grid-cols-12">
          <nav aria-label="On this page" className="cell-x border-b border-line py-6 lg:col-span-3 lg:border-r lg:border-b-0">
            <ol className="space-y-2 lg:sticky lg:top-24">
              {SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="group flex items-baseline gap-3 text-sm text-fg-2 transition-colors duration-150 hover:text-fg">
                    <span className="font-mono text-xs text-fg-3 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="lg:col-span-9">
            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="cell-x border-b border-line-subtle py-9 last:border-b-0 lg:px-10">
                <h2 id={`${section.id}-title`} className="text-h2">
                  {section.title}
                </h2>
                <div className="mt-4 max-w-[68ch] space-y-4 leading-relaxed text-fg-2 text-pretty [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-fg [&_ul]:list-[square] [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:marker:text-fg-3">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Band>
    </>
  );
}
