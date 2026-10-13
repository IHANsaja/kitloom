import type { Metadata } from "next";
import Link from "next/link";

import { Band } from "@/components/ui/Frame";
import { buttonClass } from "@/components/ui/styles";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <Band as="div">
      <div className="cell-x py-20 lg:py-28">
        <p className="eyebrow text-fg-3">404 · Not found</p>
        <h1 className="mt-3 text-h1 text-balance">There is no page at this address</h1>
        <p className="mt-3 max-w-[56ch] text-fg-2 text-pretty">
          The setup may have been renamed or removed from the catalog, or the link may be
          mistyped. Every published setup is listed on the Explore page.
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
    </Band>
  );
}
