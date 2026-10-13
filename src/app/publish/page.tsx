import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { CodeBlock } from "@/components/ui/CodeBlock";
import { Band } from "@/components/ui/Frame";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { Reveal } from "@/components/ui/Reveal";
import { buttonClass } from "@/components/ui/styles";
import { AGENTS, CATEGORIES } from "@/lib/catalog/taxonomy";
import { CATALOG_ENTRY_TEMPLATE } from "@/lib/publishing";
import { repositoryLinks } from "@/lib/site";

export const metadata: Metadata = {
  title: "Publish a setup",
  description:
    "How to list an AI coding-agent setup on Kitloom: package it, host the ZIP as a GitHub release, and add one catalog entry by pull request.",
  alternates: { canonical: "/publish" },
};

const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: "Prepare the package",
    body: (
      <>
        Put the files in the layout a project expects, for example <code>AGENTS.md</code>,{" "}
        <code>.claude/skills/</code>, <code>.cursor/rules/</code>. Include only what someone else
        needs. Replace machine-specific paths and personal details with placeholders.
      </>
    ),
  },
  {
    title: "Add a README",
    body: (
      <>
        Say what the setup does, what each file is for, how to install it, and how to customise
        it. Kitloom shows the README on the listing page as plain Markdown: no HTML, no images.
      </>
    ),
  },
  {
    title: "Identify the supported agents",
    body: (
      <>
        List only agents the setup is actually written for. Entries are marked{" "}
        <code>declared</code>. Use <code>tested</code> only for agents you have run it with, and
        say how in the README.
      </>
    ),
  },
  {
    title: "Choose a licence",
    body: (
      <>
        Add a <code>LICENSE</code> file and give its SPDX identifier, such as <code>MIT</code> or{" "}
        <code>Apache-2.0</code>. A public repository without a licence does not give others the
        right to reuse your work; the listing will read “No licence stated”.
      </>
    ),
  },
  {
    title: "Remove credentials and secrets",
    body: (
      <>
        Search every file for API keys, tokens, passwords, private URLs, and <code>.env</code>{" "}
        values. Check MCP server configuration and hook settings in particular. Once a ZIP is
        public, treat anything inside it as leaked.
      </>
    ),
  },
  {
    title: "Package the files as a ZIP",
    body: (
      <>
        Create one <code>.zip</code> with a single top-level folder named after your setup. Name
        the file <code>&lt;slug&gt;-&lt;version&gt;.zip</code>.
      </>
    ),
  },
  {
    title: "Validate the package",
    body: (
      <>
        Extract the ZIP into an empty folder and confirm it contains exactly what you intend.
        Compute its SHA-256 and note the file size in bytes; both go in the catalog entry.
      </>
    ),
  },
  {
    title: "Submit through GitHub",
    body: (
      <>
        Attach the ZIP to a release in your own public GitHub repository. Then open a pull
        request against the Kitloom repository that adds one record to{" "}
        <code>src/data/setups.json</code>, using the template below.
      </>
    ),
  },
  {
    title: "Wait for validation and review",
    body: (
      <>
        The build validates the record: unique slug, known agents and categories, HTTPS GitHub
        release URL, well-formed checksum and dates. A maintainer then reads the package by hand.
        When the pull request is merged, the site rebuilds and the listing goes live.
      </>
    ),
  },
];

const FIELD_NOTES: { field: string; note: string }[] = [
  { field: "id, slug", note: "Identical, unique, lowercase kebab-case. The slug becomes the page URL." },
  { field: "description", note: "20–280 characters. What it does and who it is for. No marketing claims." },
  { field: "agents[].id", note: AGENTS.map((agent) => agent.id).join(", ") },
  { field: "categories[]", note: CATEGORIES.map((category) => category.id).join(", ") },
  { field: "package.downloadUrl", note: "https://github.com/<owner>/<repo>/releases/download/<tag>/<file>.zip — no other host or scheme is accepted." },
  { field: "package.sha256", note: "64 lowercase hex characters, computed from the exact file attached to the release." },
  { field: "manifest[].path", note: "Relative paths inside the top-level folder. No leading slash, no “..”." },
  { field: "downloads", note: "Always null. Kitloom does not track or accept download counts." },
];

export default function PublishPage() {
  const repo = repositoryLinks();

  return (
    <>
      <Band as="div">
        <Reveal mode="load" className="grid lg:grid-cols-12">
          <div className="cell-x py-10 lg:col-span-8 lg:py-14">
            <p data-reveal-item className="eyebrow text-fg-3">
              Publish
            </p>
            <h1 data-reveal-item className="mt-2 text-h1 text-balance">
              List your setup by pull request
            </h1>
            <p data-reveal-item className="mt-4 max-w-[64ch] text-[1.0625rem] leading-relaxed text-fg-2 text-pretty">
              Kitloom has no accounts and no upload form. You host the ZIP in your own GitHub
              repository, and a single reviewed record in a version-controlled file makes it
              discoverable here. Listing is free.
            </p>
          </div>
          <div data-reveal-item className="cell-x flex flex-col justify-center gap-3 border-t border-line py-8 lg:col-span-4 lg:border-t-0 lg:border-l lg:px-6">
            {repo ? (
              <>
                <a href={repo.contributing} rel="noopener noreferrer" className={buttonClass("primary", "lg")}>
                  Contribution guide on GitHub
                  <Icon name="arrow-up-right" size={16} />
                </a>
                <a href={repo.catalog} rel="noopener noreferrer" className={buttonClass("secondary", "lg")}>
                  Open the catalog file
                  <Icon name="arrow-up-right" size={16} />
                </a>
              </>
            ) : (
              <Notice tone="warning" label="Repository not connected yet">
                <p>
                  The public GitHub repository for contributions has not been configured for this
                  deployment, so there is nowhere to send a pull request yet. The steps and
                  template below are final; the links will appear here once the repository is live.
                </p>
              </Notice>
            )}
          </div>
        </Reveal>
      </Band>

      <Band labelledBy="steps-title">
        <div className="lg:grid lg:grid-cols-12">
          <div className="cell-x border-b border-line py-8 lg:col-span-4 lg:border-r lg:border-b-0">
            <div className="lg:sticky lg:top-24">
              <h2 id="steps-title" className="text-h2">
                Nine steps
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-2">
                Most of the work is making the package safe and understandable for a stranger.
                The submission itself is one JSON record.
              </p>
              <Notice tone="info" className="mt-6" label="Why not an upload button?">
                <p>
                  Publishing files from a browser needs credentials, and credentials in a public
                  web page are not secret. A real upload flow requires a backend that Kitloom
                  does not run yet. Pull requests give the same result with review built in.
                </p>
              </Notice>
            </div>
          </div>
          <ol className="lg:col-span-8">
            {STEPS.map((step, index) => (
              <li key={step.title} className="cell-x grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-line-subtle py-5 last:border-b-0 lg:px-6">
                <span aria-hidden="true" className="pt-0.5 font-mono text-xs text-fg-3 tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1.5 max-w-[66ch] text-sm leading-relaxed text-fg-2 [&_code]:font-mono [&_code]:text-code [&_code]:text-fg">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Band>

      <Band labelledBy="template-title">
        <div className="lg:grid lg:grid-cols-12">
          <div className="cell-x min-w-0 border-b border-line py-8 lg:col-span-7 lg:border-r lg:border-b-0">
            <h2 id="template-title" className="text-h2">
              Catalog entry template
            </h2>
            <p className="mt-2 mb-5 max-w-[62ch] text-sm leading-relaxed text-fg-2">
              Copy this record, replace every value, and append it to the <code className="font-mono text-code text-fg">setups</code>{" "}
              array. Use <code className="font-mono text-code text-fg">null</code> for anything you genuinely cannot
              provide. Unknown fields are rejected.
            </p>
            <CodeBlock label="src/data/setups.json — one record" code={CATALOG_ENTRY_TEMPLATE} subject="Template" />
          </div>
          <div className="cell-x py-8 lg:col-span-5 lg:px-6">
            <h3 className="font-semibold">Field rules</h3>
            <dl className="mt-3 border-t border-line-subtle">
              {FIELD_NOTES.map((item) => (
                <div key={item.field} className="border-b border-line-subtle py-3">
                  <dt className="font-mono text-code text-fg">{item.field}</dt>
                  <dd className="mt-1 text-sm leading-relaxed break-words text-fg-2">{item.note}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-7 font-semibold">Compute the checksum</h3>
            <div className="mt-3 space-y-3">
              <CodeBlock label="macOS / Linux" code="shasum -a 256 your-setup-slug-1.0.0.zip" subject="Command" />
              <CodeBlock label="Windows PowerShell" code="(Get-FileHash your-setup-slug-1.0.0.zip -Algorithm SHA256).Hash.ToLower()" subject="Command" />
            </div>
          </div>
        </div>
      </Band>

      <Band labelledBy="review-title">
        <div className="cell-x py-10">
          <h2 id="review-title" className="text-h2">
            What reviewers check
          </h2>
          <ul className="mt-5 grid gap-x-10 gap-y-4 text-sm leading-relaxed text-fg-2 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["It is a setup", "Agent instructions, rules, skills, commands, hooks, or workflow configuration — not an application or a prompt dump."],
              ["It matches its description", "The files in the ZIP are the files in the manifest, and they do what the README says."],
              ["It contains no secrets", "No keys, tokens, or private endpoints anywhere in the archive."],
              ["Anything that runs is explained", "Hooks, scripts, and MCP servers are called out in the README with what they execute and why."],
              ["Attribution is intact", "Work derived from someone else's keeps their licence and credit."],
              ["Compatibility is honest", "Agents are declared only where the setup really targets them."],
            ].map(([title, body]) => (
              <li key={title} className="border-t border-line pt-3">
                <p className="font-semibold text-fg">{title}</p>
                <p className="mt-1">{body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-fg-2">
            Updating a listing works the same way: publish a new release, then change the version,
            URL, size, checksum, manifest, and <code className="font-mono text-code text-fg">updatedAt</code> in a pull request.
            More detail is on the{" "}
            <Link href="/about" className="link">
              About page
            </Link>
            .
          </p>
        </div>
      </Band>
    </>
  );
}
