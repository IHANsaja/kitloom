import type { Metadata } from "next";
import { Suspense } from "react";

import { ExploreClient } from "@/components/setups/ExploreClient";
import { SetupGrid } from "@/components/setups/SetupCell";
import { Band } from "@/components/ui/Frame";
import { getSetupSummaries } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Explore setups",
  description:
    "Search and filter AI coding-agent setups by agent, category, and keyword. Every listing shows its files, licence, and checksum.",
  alternates: { canonical: "/explore" },
};

export default function ExplorePage() {
  const setups = getSetupSummaries();
  return (
    <>
      <Band as="div">
        <div className="cell-x py-8 lg:py-10">
          <p className="eyebrow text-fg-3">Explore</p>
          <h1 className="mt-2 text-h1 text-balance">Find a setup</h1>
          <p className="mt-3 max-w-[62ch] text-fg-2 text-pretty">
            Filter by the agent you use and the job you need done. Compatibility is declared by
            each creator unless a listing says it was tested.
          </p>
        </div>
      </Band>
      <Band as="div">
        {/* useSearchParams needs a Suspense boundary in a static export. The fallback is the
            unfiltered list, so the page is complete even before JavaScript runs. */}
        <Suspense fallback={<SetupGrid setups={setups} />}>
          <ExploreClient setups={setups} />
        </Suspense>
      </Band>
    </>
  );
}
