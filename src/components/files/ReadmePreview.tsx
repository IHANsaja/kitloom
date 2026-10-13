import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { resolveMarkdownLink } from "@/lib/packages/urls";

/**
 * README content is untrusted. Safety here rests on four things:
 *  1. react-markdown never renders raw HTML (no rehype-raw; skipHtml drops it entirely).
 *  2. Links pass through resolveMarkdownLink: https/http/mailto only.
 *  3. Images are never fetched — a remote image would leak the reader's IP to the creator.
 *  4. Headings are demoted so a README cannot disturb the page's heading hierarchy.
 */
const components: Components = {
  h1: ({ children }) => <h3>{children}</h3>,
  h2: ({ children }) => <h4>{children}</h4>,
  h3: ({ children }) => <h5>{children}</h5>,
  h4: ({ children }) => <h6>{children}</h6>,
  h5: ({ children }) => <h6>{children}</h6>,
  a: ({ href, children }) => {
    const link = resolveMarkdownLink(href);
    if (link.kind === "external") {
      return (
        <a href={link.href} target="_blank" rel="noopener noreferrer nofollow ugc">
          {children}
        </a>
      );
    }
    // Fragments and relative links cannot resolve outside the package's own repository.
    return <span>{children}</span>;
  },
  img: ({ alt }) => <span className="font-mono text-xs text-fg-2">[image{alt ? `: ${alt}` : ""}]</span>,
  table: ({ children }) => (
    <div className="table-scroll" tabIndex={0}>
      <table>{children}</table>
    </div>
  ),
  pre: ({ children }) => <pre tabIndex={0}>{children}</pre>,
  input: () => null,
};

export function ReadmePreview({ markdown }: { markdown: string }) {
  return (
    <div className="rounded-sm border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2">
        <span className="font-mono text-xs text-fg-2">README.md</span>
        <span className="font-mono text-xs text-fg-2">rendered as plain Markdown</span>
      </div>
      <div className="prose-kit px-4 py-5 sm:px-6">
        <Markdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
          {markdown}
        </Markdown>
      </div>
    </div>
  );
}
