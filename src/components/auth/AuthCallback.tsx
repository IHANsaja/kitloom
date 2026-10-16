"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Notice } from "@/components/ui/Notice";
import { buttonClass } from "@/components/ui/styles";
import { takeNextPath } from "@/lib/supabase/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import { LoadingLine } from "@/components/motion/Strings";

type Outcome = { kind: "working" } | { kind: "failed"; reason: "provider" | "link" | "missing"; detail?: string };

/** One redemption per code, even if React mounts this page twice (Strict Mode). */
const redeeming = new Map<string, Promise<string | null>>();

function redeem(code: string): Promise<string | null> {
  let pending = redeeming.get(code);
  if (!pending) {
    pending = getSupabaseClient()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => (error ? error.message : null))
      .catch((error: unknown) => (error instanceof Error ? error.message : "Unknown error"));
    redeeming.set(code, pending);
  }
  return pending;
}

/**
 * Landing point after an OAuth redirect or an emailed link, and the only page that redeems a
 * sign-in code (the client does not do it on its own, and the root layout forwards codes
 * that land elsewhere to here). Redeems the code once, then forwards the visitor to where
 * they were going — or says plainly why it did not work.
 */
export function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  // An error from the provider is in the URL from the start: no need to wait for anything.
  const [outcome, setOutcome] = useState<Outcome>(() => {
    if (typeof window === "undefined") return { kind: "working" };
    const detail = params.get("error_description") ?? params.get("error") ?? new URLSearchParams(window.location.hash.slice(1)).get("error_description");
    return detail ? { kind: "failed", reason: "provider", detail } : { kind: "working" };
  });
  const [next] = useState(() => (typeof window === "undefined" ? "/account" : takeNextPath(params.get("next"))));

  useEffect(() => {
    if (outcome.kind === "failed") return;
    const code = params.get("code");
    let cancelled = false;
    (async () => {
      if (!code) {
        // No code: fine if the visitor is already signed in, otherwise nothing to finish.
        const { data } = await getSupabaseClient().auth.getSession();
        if (cancelled) return;
        if (data.session) router.replace(next);
        else setOutcome({ kind: "failed", reason: "missing" });
        return;
      }
      const error = await redeem(code);
      if (cancelled) return;
      if (!error) {
        router.replace(next);
        return;
      }
      // The code may already have been redeemed by this browser (a reload, a second tab).
      const { data } = await getSupabaseClient().auth.getSession();
      if (cancelled) return;
      if (data.session) router.replace(next);
      // Supabase's message, first sentence only: the rest is advice for server-rendered apps.
      else setOutcome({ kind: "failed", reason: "link", detail: error.split(/(?<=\.)\s/)[0] });
    })();
    return () => {
      cancelled = true;
    };
    // The outcome only changes inside this effect once it has started; re-running on it would redeem twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, next, router]);

  if (outcome.kind === "working") {
    return <LoadingLine>Finishing sign-in…</LoadingLine>;
  }

  const message =
    outcome.reason === "provider"
      ? "The sign-in was cancelled or rejected."
      : outcome.reason === "missing"
        ? "This page was opened without a sign-in code."
        : "The link may have expired, been used already, or been opened in a different browser from the one that requested it.";

  return (
    <div className="max-w-[56ch]">
      <Notice tone="danger" label="Sign-in did not complete">
        <p>{message}</p>
        {outcome.detail ? <p className="mt-2 font-mono text-xs text-fg-2">{outcome.detail}</p> : null}
      </Notice>
      <Link href={`/signin?next=${encodeURIComponent(next)}`} className={buttonClass("primary", "md", "mt-6")}>
        Try signing in again
      </Link>
    </div>
  );
}
