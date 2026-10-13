import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

import { PublishForm } from "@/components/publish/PublishForm";
import { Band } from "@/components/ui/Frame";
import { Notice } from "@/components/ui/Notice";

export const metadata: Metadata = {
  title: "Publish a setup",
  description:
    "List an AI coding-agent setup on Kitloom: keep the files in your public GitHub repository, sign in, and describe what it is for.",
  alternates: { canonical: "/publish" },
};

const CHECKLIST: { title: string; body: string }[] = [
  {
    title: "The repository is public and is the setup",
    body: "Visitors download the whole repository as a ZIP, so it should contain the setup files and little else. A dedicated repository works best.",
  },
  {
    title: "It has a README",
    body: "What it does, what each file is for, how to install and customise it. Kitloom shows it on your page as plain Markdown, without HTML or images.",
  },
  {
    title: "It has a licence",
    body: "Add a LICENSE file. Without one, others have no right to reuse your work and the listing reads “No licence stated”.",
  },
  {
    title: "It contains no secrets",
    body: "Search every file for keys, tokens, passwords and private URLs — MCP configuration and hook settings in particular. Anything in a public repository is already exposed.",
  },
  {
    title: "Anything that runs is explained",
    body: "If the setup includes hooks, scripts or MCP servers, say in the README exactly what they execute and why.",
  },
  {
    title: "Compatibility is honest",
    body: "Tick only the agents the setup is written for. Listings always say “declared by the creator”.",
  },
];

export default function PublishPage() {
  return (
    <>
      <Band as="div">
        <div className="cell-x py-10 lg:py-12">
          <p className="eyebrow text-fg-3">Publish</p>
          <h1 className="mt-2 text-h1 text-balance">List your setup</h1>
          <p className="mt-4 max-w-[66ch] text-[1.0625rem] leading-relaxed text-fg-2 text-pretty">
            Your files stay in your own public GitHub repository. Kitloom stores a description and
            links to the ZIP that GitHub builds from it. Listing is free.
          </p>
        </div>
      </Band>

      <Band as="div">
        <div className="lg:grid lg:grid-cols-12">
          <div className="cell-x min-w-0 py-8 lg:col-span-8 lg:border-r lg:border-line lg:py-10">
            <Suspense fallback={<p className="font-mono text-xs text-fg-2">Loading the form…</p>}>
              <PublishForm />
            </Suspense>
          </div>

          <aside aria-labelledby="checklist-title" className="cell-x border-t border-line py-8 lg:col-span-4 lg:border-t-0 lg:px-6 lg:py-10">
            <h2 id="checklist-title" className="text-h2">
              Before you publish
            </h2>
            <ol className="mt-5 border-t border-line-subtle">
              {CHECKLIST.map((item, index) => (
                <li key={item.title} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 border-b border-line-subtle py-3.5">
                  <span aria-hidden="true" className="pt-0.5 font-mono text-xs text-fg-3 tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-fg-2">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <Notice tone="info" className="mt-6" label="Why a link and not an upload?">
              <p>
                Kitloom does not store package files yet. Linking to GitHub keeps your setup under
                your control, with its history visible to anyone who wants to check it. Because the
                ZIP follows your repository, it has no fixed checksum.
              </p>
            </Notice>

            <p className="mt-6 text-sm leading-relaxed text-fg-2">
              Listings appear as soon as you publish. Maintainers can hide one that contains
              secrets, malware, or someone else&apos;s work. More on the{" "}
              <Link href="/about#security" className="link">
                About page
              </Link>
              .
            </p>
          </aside>
        </div>
      </Band>
    </>
  );
}
