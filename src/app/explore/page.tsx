import type { Metadata } from "next";
import { Suspense } from "react";

import { ExploreClient } from "@/components/setups/ExploreClient";
import { Band } from "@/components/ui/Frame";
import { Shuttle } from "@/components/motion/Illustrations";

export const metadata: Metadata = {
  title: "Explore setups",
  description:
    "Search and filter AI coding-agent setups by agent, category, and keyword. Every listing shows its files, licence, and source repository.",
  alternates: { canonical: "/explore" },
};

export default function ExplorePage() {
  return (
    <>
      <Band as="div">
        <div className="cell-x flex items-center justify-between gap-10 py-8 lg:py-10">
          <div>
          <p className="eyebrow text-fg-3">Explore</p>
          <h1 className="mt-2 text-h1 text-balance">Find a setup</h1>
          <p className="mt-3 max-w-[62ch] text-fg-2 text-pretty">
            Filter by the agent you use and the job you need done. Compatibility is declared by
            each creator, not tested by Kitloom.
          </p>
          </div>
          <Shuttle className="hidden h-[90px] w-auto shrink-0 md:block" />
        </div>
      </Band>
      <Band as="div">
        {/* useSearchParams needs a Suspense boundary in a static export. */}
        <Suspense fallback={<p className="cell-x py-14 font-mono text-xs text-fg-2">Loading setups…</p>}>
          <ExploreClient />
        </Suspense>
      </Band>
    </>
  );
}
