import type { Metadata } from "next";
import Link from "next/link";

import { Harness } from "@/components/motion/Illustrations";
import { AgentsDirectory } from "@/components/setups/AgentsDirectory";
import { Band } from "@/components/ui/Frame";
import { AGENTS } from "@/lib/catalog/taxonomy";

export const metadata: Metadata = {
  title: "Agents",
  description: `Setups by coding agent: ${AGENTS.map((agent) => agent.name).join(", ")}. See which setups declare support for the tool you use.`,
  alternates: { canonical: "/agents" },
};

export default function AgentsPage() {
  return (
    <>
      <Band as="div">
        <div className="cell-x flex items-center justify-between gap-10 py-10 lg:py-12">
          <div>
            <p className="eyebrow text-fg-3">Agents</p>
            <h1 className="mt-2 text-h1 text-balance">Start from the tool you use</h1>
            <p className="mt-4 max-w-[62ch] text-[1.0625rem] leading-relaxed text-fg-2 text-pretty">
              Kitloom recognises {AGENTS.length} coding agents. A setup appears under an agent only
              when its creator says it is written for that agent — Kitloom does not test the claim,
              and never assumes a setup works anywhere it does not name.
            </p>
          </div>
          <Harness className="hidden h-[120px] w-auto shrink-0 md:block" />
        </div>
      </Band>

      <Band as="div">
        <AgentsDirectory />
      </Band>

      <Band as="div">
        <div className="cell-x py-8">
          <p className="max-w-[66ch] text-sm leading-relaxed text-fg-2">
            Using an agent that is not listed? Setups for it cannot be tagged yet. Publish under the
            closest match and say so in your README, or{" "}
            <Link href="/about#compatibility" className="link">
              read how compatibility works
            </Link>
            .
          </p>
        </div>
      </Band>
    </>
  );
}
