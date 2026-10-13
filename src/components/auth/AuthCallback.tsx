"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Notice } from "@/components/ui/Notice";
import { buttonClass } from "@/components/ui/styles";
import { safeNextPath, useSession } from "@/lib/supabase/auth";

const TIMEOUT_MS = 10_000;

/**
 * Landing point after an OAuth redirect or an emailed link. The Supabase client exchanges
 * the one-time code in the URL for a session on its own; this page only waits for the
 * result and forwards the visitor — or says plainly that it did not work.
 */
export function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const next = safeNextPath(params.get("next"));
  const providerError = params.get("error_description") ?? params.get("error");
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (session !== "loading" && session !== null) router.replace(next);
  }, [session, next, router]);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const failed = providerError !== null || (timedOut && (session === null || session === "loading"));

  if (!failed) {
    return (
      <p role="status" className="font-mono text-xs text-fg-2">
        Finishing sign-in…
      </p>
    );
  }

  return (
    <div className="max-w-[56ch]">
      <Notice tone="danger" label="Sign-in did not complete">
        <p>
          {providerError
            ? "The sign-in was cancelled or rejected."
            : "The link may have expired, been used already, or been opened in a different browser from the one that requested it."}
        </p>
      </Notice>
      <Link href={`/signin?next=${encodeURIComponent(next)}`} className={buttonClass("primary", "md", "mt-6")}>
        Try signing in again
      </Link>
    </div>
  );
}
