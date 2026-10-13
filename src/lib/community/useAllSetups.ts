"use client";

import { useEffect, useMemo, useState } from "react";

import { sortSetups } from "@/lib/catalog/query";
import { fetchPublishedSummaries } from "@/lib/community/setups";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { SetupSummary } from "@/types/catalog";

/**
 * - "off": no database is configured; only the built-in catalog exists.
 * - "loading" / "ready" / "error": the state of the community fetch.
 */
export type CommunityState = "off" | "loading" | "ready" | "error";

// One request per page load, shared by every component that lists setups.
let pending: Promise<SetupSummary[]> | null = null;

export function invalidateCommunitySetups() {
  pending = null;
}

function load(): Promise<SetupSummary[]> {
  pending ??= fetchPublishedSummaries().catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

/**
 * The built-in catalog (pre-rendered, always present) merged with community setups from
 * the database once they arrive. The page is complete and usable before the fetch ends.
 */
export function useAllSetups(initial: readonly SetupSummary[]): { setups: SetupSummary[]; community: CommunityState } {
  const [community, setCommunity] = useState<SetupSummary[]>([]);
  const [state, setState] = useState<CommunityState>(isSupabaseConfigured ? "loading" : "off");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    load().then(
      (rows) => {
        if (!active) return;
        setCommunity(rows);
        setState("ready");
      },
      () => {
        if (active) setState("error");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const setups = useMemo(() => sortSetups([...initial, ...community], "newest"), [initial, community]);
  return { setups, community: state };
}
