"use client";

import { useEffect, useState } from "react";

import { fetchPublishedSummaries } from "@/lib/community/setups";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { SetupSummary } from "@/types/catalog";

/**
 * - "off": no database is configured for this build, so there is nothing to list.
 * - "loading" / "ready" / "error": the state of the fetch.
 * Callers must distinguish "loading" from an empty "ready": zero results is only a fact
 * once the database has answered.
 */
export type SetupsState = "off" | "loading" | "ready" | "error";

// One request per page load, shared by every component that lists setups.
let pending: Promise<SetupSummary[]> | null = null;

export function invalidateSetups() {
  pending = null;
}

function load(): Promise<SetupSummary[]> {
  pending ??= fetchPublishedSummaries().catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

/** Every published setup, newest first, fetched from the database in the browser. */
export function useSetups(): { setups: SetupSummary[]; state: SetupsState } {
  const [setups, setSetups] = useState<SetupSummary[]>([]);
  const [state, setState] = useState<SetupsState>(isSupabaseConfigured ? "loading" : "off");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    load().then(
      (rows) => {
        if (!active) return;
        setSetups(rows);
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

  return { setups, state };
}
