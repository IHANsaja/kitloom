"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { SetupDetail } from "@/components/setups/SetupDetail";
import { EmptyState } from "@/components/ui/EmptyState";
import { Band } from "@/components/ui/Frame";
import { buttonClass } from "@/components/ui/styles";
import { fetchCommunitySetup, type CommunitySetup } from "@/lib/community/setups";
import { useSession } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { site } from "@/lib/site";

type State = { kind: "loading" } | { kind: "ready"; data: CommunitySetup } | { kind: "missing" } | { kind: "error" };

/**
 * Community setups live in the database, which a static export cannot pre-render, so this
 * page fetches one by `?slug=` in the browser and renders the same detail view as a
 * first-party kit.
 */
export function CommunitySetupPage() {
  const slug = useSearchParams().get("slug") ?? "";
  const session = useSession();
  const userId = session !== "loading" && session !== null ? session.user.id : null;
  const sessionReady = session !== "loading";
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    // Wait for the session: an owner may be looking at their own hidden listing.
    if (!isSupabaseConfigured || !sessionReady) return;
    let active = true;
    fetchCommunitySetup(slug).then(
      (data) => active && setState(data ? { kind: "ready", data } : { kind: "missing" }),
      () => active && setState({ kind: "error" }),
    );
    return () => {
      active = false;
    };
  }, [slug, sessionReady, userId]);

  useEffect(() => {
    if (state.kind === "ready") document.title = `${state.data.setup.name} — ${site.name}`;
  }, [state]);

  if (!isSupabaseConfigured || state.kind === "missing") {
    return (
      <Band as="div">
        <EmptyState
          eyebrow="404 · Not found"
          title="There is no setup at this address"
          actions={
            <Link href="/explore" className={buttonClass("primary")}>
              Explore setups
            </Link>
          }
        >
          It may have been removed by its creator, or the link may be mistyped.
        </EmptyState>
      </Band>
    );
  }

  if (state.kind === "error") {
    return (
      <Band as="div">
        <EmptyState
          eyebrow="Could not load"
          title="This setup could not be loaded"
          actions={
            <button type="button" onClick={() => window.location.reload()} className={buttonClass("primary")}>
              Reload
            </button>
          }
        >
          The database did not respond. Nothing is wrong with the link; try again in a moment.
        </EmptyState>
      </Band>
    );
  }

  if (state.kind === "loading") {
    return (
      <Band as="div">
        <div className="cell-x py-20">
          <p role="status" className="font-mono text-xs text-fg-2">
            Loading setup…
          </p>
        </div>
      </Band>
    );
  }

  const { setup, ownerId, status } = state.data;
  const isOwner = userId === ownerId;

  return (
    <SetupDetail
      setup={setup}
      banner={
        isOwner ? (
          <Band as="div" className="bg-surface">
            <div className="cell-x flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
              <p className="text-sm text-fg-2">
                <span className="eyebrow mr-3 text-lime">Your setup</span>
                {status === "hidden"
                  ? "A maintainer has hidden this listing. Only you can see it."
                  : "This listing is public."}
              </p>
              <div className="flex gap-2">
                <Link href={`/publish?edit=${encodeURIComponent(setup.slug)}`} className={buttonClass("secondary", "sm", "h-9 px-3.5")}>
                  Edit
                </Link>
                <Link href="/account" className={buttonClass("secondary", "sm", "h-9 px-3.5")}>
                  All my setups
                </Link>
              </div>
            </div>
          </Band>
        ) : undefined
      }
    />
  );
}
