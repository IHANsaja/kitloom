import type { Metadata } from "next";
import { Suspense } from "react";

import { CommunitySetupPage } from "@/components/setups/CommunitySetupPage";
import { Band } from "@/components/ui/Frame";

export const metadata: Metadata = {
  title: "Setup",
  description: "A community-published AI coding-agent setup on Kitloom.",
};

function Loading() {
  return (
    <Band as="div">
      <div className="cell-x py-20">
        <p className="font-mono text-xs text-fg-2">Loading setup…</p>
      </div>
    </Band>
  );
}

export default function CommunitySetupRoute() {
  return (
    <Suspense fallback={<Loading />}>
      <CommunitySetupPage />
    </Suspense>
  );
}
