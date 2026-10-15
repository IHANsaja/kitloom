import Link from "next/link";

import { Frame } from "@/components/ui/Frame";
import { LogoMark } from "@/components/ui/Icon";
import { repositoryLinks, site } from "@/lib/site";
import { WeftWave } from "@/components/motion/Ambient";
import { PurlNook } from "@/components/pet/PurlNook";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/agents", label: "Agents" },
  { href: "/publish", label: "Publish" },
  { href: "/about", label: "About" },
  { href: "/about#security", label: "Security" },
] as const;

export function SiteFooter() {
  const repo = repositoryLinks();
  return (
    <footer>
      <WeftWave />
      <Frame>
        <div className="cell-x flex flex-col gap-8 py-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[44ch]">
            <p className="flex items-center gap-2.5">
              <LogoMark size={18} />
              <span className="font-semibold tracking-[-0.03em]">kitloom</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-fg-2">
              A free directory of AI coding-agent setups. No account needed to browse or download,
              and no tracking. Setups belong to their creators and are shared under the licence
              each one states.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-2.5 text-sm">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-fg-2 transition-colors duration-150 hover:text-fg">
                    {link.label}
                  </Link>
                </li>
              ))}
              {repo ? (
                <li>
                  <a href={repo.home} rel="noopener noreferrer" className="text-fg-2 transition-colors duration-150 hover:text-fg">
                    Source on GitHub
                  </a>
                </li>
              ) : null}
            </ul>
          </nav>
        </div>
        <div className="cell-x relative border-t border-line-subtle py-4 lg:flex lg:h-16 lg:items-center lg:py-0">
          <p className="font-mono text-xs text-fg-3">{site.domain}</p>
          <PurlNook mode="lane" className="left-48" />
        </div>
      </Frame>
    </footer>
  );
}
