import Link from "next/link";

import { SiteNav } from "@/components/layout/SiteNav";
import { Frame } from "@/components/ui/Frame";
import { LogoMark } from "@/components/ui/Icon";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-carbon">
      <Frame className="relative">
        <div className="cell-x flex h-14 items-stretch gap-4">
          <Link href="/" className="mr-2 flex items-center gap-2.5" aria-label="Kitloom home">
            <LogoMark size={20} />
            <span className="text-[1.0625rem] font-semibold tracking-[-0.03em]">kitloom</span>
          </Link>
          <SiteNav />
        </div>
      </Frame>
    </header>
  );
}
