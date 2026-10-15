"use client";

import Link from "next/link";

import { LoadingLine } from "@/components/motion/Strings";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useGlide } from "@/components/motion/useGlide";
import { buttonClass, cx } from "@/components/ui/styles";
import { exploreHref } from "@/lib/catalog/query";
import { setupHref } from "@/lib/catalog/summary";
import { AGENTS, type AgentDefinition } from "@/lib/catalog/taxonomy";
import { useSetups } from "@/lib/community/useSetups";
import { pluralize } from "@/lib/format";
import type { SetupSummary } from "@/types/catalog";
import { PurlPlaymate } from "@/components/pet/PurlPlaymate";
import { AgentLogo } from "@/components/ui/AgentLogo";

const PREVIEW = 3;

/** Each agent's tile: its logo, and the thing Purl plays with on this page. */
function AgentMark({ agent }: { agent: AgentDefinition }) {
  return (
    <span
      aria-hidden="true"
      data-agent-mark={agent.id}
      className="kl-mark relative grid size-11 shrink-0 place-items-center self-end border border-line-control bg-carbon text-fg"
    >
      <AgentLogo id={agent.id} size={24} />
      <span className="absolute -right-px -bottom-px size-1.5 bg-fg-3" />
    </span>
  );
}

/** Agents grouped as "other" on Explore do not have their own filter, so link by name. */
function browseHref(agent: AgentDefinition): string {
  return agent.primary ? exploreHref({ agent: agent.id }) : exploreHref({ q: agent.name });
}

function AgentRow({ agent, index, setups, ready }: { agent: AgentDefinition; index: number; setups: SetupSummary[]; ready: boolean }) {
  const count = setups.length;
  return (
    <li data-glide data-agent-row={agent.id} className="border-b border-line last:border-b-0">
      <article aria-labelledby={`agent-${agent.id}`} className="lg:grid lg:grid-cols-12">
        <div className="cell-x flex justify-between gap-4 py-6 lg:col-span-4 lg:border-r lg:border-line">
          <div className="min-w-0">
            <p className="font-mono text-xs text-fg-3 tabular-nums">{String(index + 1).padStart(2, "0")}</p>
            <h2 id={`agent-${agent.id}`} className="mt-2 text-h2">
              {agent.name}
            </h2>
            <p className="mt-1 font-mono text-xs text-fg-2">{agent.vendor}</p>
          </div>
          <AgentMark agent={agent} />
        </div>

        <div className="cell-x min-w-0 border-t border-line-subtle py-6 lg:col-span-5 lg:border-t-0 lg:border-r lg:border-line lg:px-6">
          {!ready ? (
            <p className="font-mono text-xs text-fg-2">—</p>
          ) : count === 0 ? (
            <p className="text-sm leading-relaxed text-fg-2">
              No setups declare support for {agent.name} yet. If you have one, it would be the first.
            </p>
          ) : (
            <ul className="space-y-3">
              {setups.slice(0, PREVIEW).map((setup) => (
                <li key={setup.slug}>
                  <Link href={setupHref(setup.slug)} className="group block">
                    <span className="link font-semibold break-words">{setup.name}</span>
                    <span className="mt-0.5 line-clamp-1 block text-sm text-fg-2">{setup.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cell-x flex items-center justify-between gap-4 border-t border-line-subtle py-5 lg:col-span-3 lg:flex-col lg:items-start lg:justify-center lg:border-t-0 lg:px-6">
          <p className="font-mono text-xs text-fg-2 tabular-nums">
            {ready ? pluralize(count, "setup") : <span aria-hidden="true">—</span>}
          </p>
          {ready && count === 0 ? (
            <Link href="/publish" className={buttonClass("secondary", "sm", "h-9 px-3.5")}>
              Publish one
            </Link>
          ) : (
            <Link href={browseHref(agent)} className={cx(buttonClass("secondary", "sm", "h-9 px-3.5"), "group")}>
              Browse
              <Icon name="arrow-right" size={14} className="transition-transform duration-150 ease-kit group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </article>
    </li>
  );
}

/**
 * Every agent Kitloom recognises, each with the setups that declare support for it.
 * Counts and listings come from the database; nothing here is written by hand.
 */
export function AgentsDirectory() {
  const { setups, state } = useSetups();
  const ready = state === "ready";
  const glide = useGlide<HTMLOListElement>("left");

  return (
    <>
      {state === "loading" ? <LoadingLine className="cell-x border-b border-line py-4">Loading setups…</LoadingLine> : null}
      {state === "error" || state === "off" ? (
        <div className="cell-x border-b border-line py-5">
          <Notice tone={state === "off" ? "warning" : "danger"} label={state === "off" ? "Directory not connected" : "Could not load setups"}>
            {state === "off"
              ? "This build has no database configured, so no setups can be shown for any agent."
              : "The database did not respond, so setups are missing below. Reload the page to try again."}
          </Notice>
        </div>
      ) : null}
      <PurlPlaymate>
        <ol ref={glide}>
          {AGENTS.map((agent, index) => (
            <AgentRow key={agent.id} agent={agent} index={index} ready={ready} setups={setups.filter((setup) => setup.agents.includes(agent.id))} />
          ))}
        </ol>
      </PurlPlaymate>
    </>
  );
}
