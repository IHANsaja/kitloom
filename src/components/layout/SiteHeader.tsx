import Link from "next/link";

import { SiteNav } from "@/components/layout/SiteNav";
import { Frame } from "@/components/ui/Frame";
import { LogoMark } from "@/components/ui/Icon";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-carbon">
      <Frame className="relative">
        <div className="cell-x flex h-14 items-stretch gap-4">
          <Link href="/" className="mr-2 flex items-center gap-2" aria-label="Kitloom home">
            <LogoMark size={24} />
            <span className="font-wordmark text-[1.1875rem] leading-none font-semibold">kitloom</span>
          </Link>
          <SiteNav />
        </div>
      </Frame>
    </header>
  );
}
