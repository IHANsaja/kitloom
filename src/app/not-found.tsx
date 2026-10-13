import type { Metadata } from "next";
import Link from "next/link";

import { Band } from "@/components/ui/Frame";
import { buttonClass } from "@/components/ui/styles";
import { SnappedStrings } from "@/components/motion/Strings";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <Band as="div">
      <div className="cell-x flex flex-col gap-10 py-20 md:flex-row md:items-center md:justify-between lg:py-28">
        <div>
        <p className="eyebrow text-fg-3">404 · Not found</p>
        <h1 className="mt-3 text-h1 text-balance">The thread ends here</h1>
        <p className="mt-3 max-w-[56ch] text-fg-2 text-pretty">
          There is no page at this address. The setup may have been removed by its creator, or
          the link may be mistyped. Every published setup is listed on the Explore page.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/explore" className={buttonClass("primary")}>
            Explore setups
          </Link>
          <Link href="/" className={buttonClass("secondary")}>
            Go to the home page
          </Link>
        </div>
        </div>
        <SnappedStrings />
      </div>
    </Band>
  );
}
