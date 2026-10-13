"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { buttonClass } from "@/components/ui/styles";
import { setupHref } from "@/lib/catalog/summary";
import { deleteSetup, fetchOwnSetups, type CommunitySetup } from "@/lib/community/setups";
import { invalidateSetups } from "@/lib/community/useSetups";
import { formatDate, pluralize } from "@/lib/format";
import { useSession } from "@/lib/supabase/auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { LoadingLine } from "@/components/motion/Strings";
import { Spool } from "@/components/motion/Illustrations";

type ListState = CommunitySetup[] | "loading" | "error";

export function AccountPanel() {
  const router = useRouter();
  const session = useSession();
  const userId = session !== "loading" && session !== null ? session.user.id : null;
  const [setups, setSetups] = useState<ListState>("loading");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (session === null) router.replace("/signin?next=/account");
  }, [session, router]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchOwnSetups(userId).then(
      (rows) => active && setSetups(rows),
      () => active && setSetups("error"),
    );
    getSupabaseClient()
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && typeof data?.display_name === "string") setDisplayName(data.display_name);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (!isSupabaseConfigured) {
    return (
      <div className="cell-x py-10">
        <Notice tone="warning" label="Accounts are not configured">
          This deployment has no account service connected.
        </Notice>
      </div>
    );
  }

  if (session === "loading" || session === null) {
    return (
      <div className="cell-x py-16">
        <LoadingLine>{session === null ? "Redirecting to sign in…" : "Loading your account…"}</LoadingLine>
      </div>
    );
  }

  async function signOut() {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) {
      toast.error("Sign-out failed", { description: "Try again." });
      return;
    }
    invalidateSetups();
    toast.success("Signed out");
    router.replace("/");
  }

  async function remove(slug: string) {
    setDeleting(slug);
    try {
      await deleteSetup(slug);
      invalidateSetups();
      setSetups((current) => (Array.isArray(current) ? current.filter((item) => item.setup.slug !== slug) : current));
      toast.success("Setup deleted", { description: slug });
    } catch (error) {
      toast.error("Delete failed", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  }

  return (
    <>
      <div className="cell-x flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-line py-8">
        <Spool className="hidden h-[84px] w-auto shrink-0 self-center sm:block" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-fg-3">Account</p>
          <h1 className="mt-2 text-h1 break-words">{displayName ?? "Your account"}</h1>
          <p className="mt-2 text-sm text-fg-2">
            Signed in as <span className="font-mono text-code break-all text-fg">{session.user.email ?? "a connected account"}</span>. Your
            email is not shown to anyone else; listings carry the display name above.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/publish" className={buttonClass("primary")}>
            Publish a setup
          </Link>
          <button type="button" onClick={signOut} className={buttonClass("secondary")}>
            Sign out
          </button>
        </div>
      </div>

      <section aria-labelledby="my-setups">
        <div className="cell-x flex items-baseline justify-between gap-4 border-b border-line py-4">
          <h2 id="my-setups" className="text-h2">
            Your setups
          </h2>
          {Array.isArray(setups) ? <p className="font-mono text-xs text-fg-2 tabular-nums">{pluralize(setups.length, "setup")}</p> : null}
        </div>

        {setups === "loading" ? (
          <LoadingLine className="cell-x py-10">Loading your setups…</LoadingLine>
        ) : setups === "error" ? (
          <div className="cell-x py-8">
            <Notice tone="danger" label="Could not load">
              Your setups could not be loaded. Reload the page to try again.
            </Notice>
          </div>
        ) : setups.length === 0 ? (
          <EmptyState
            eyebrow="0 setups"
            title="You have not published anything yet"
            actions={
              <Link href="/publish" className={buttonClass("primary")}>
                Publish your first setup
              </Link>
            }
          >
            Put your agent files in a public GitHub repository, then list it here with a short description.
          </EmptyState>
        ) : (
          <ul>
            {setups.map(({ setup, status }) => (
              <li key={setup.slug} className="cell-x flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-line-subtle py-4 last:border-b-0">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Link href={setupHref(setup.slug)} className="link font-semibold break-words">
                      {setup.name}
                    </Link>
                    {status === "hidden" ? <span className="font-mono text-xs text-warning">hidden by a maintainer</span> : null}
                  </p>
                  <p className="mt-1 font-mono text-xs break-all text-fg-2">
                    {setup.slug} · updated <time dateTime={setup.updatedAt}>{formatDate(setup.updatedAt)}</time>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/publish?edit=${encodeURIComponent(setup.slug)}`} className={buttonClass("secondary", "sm", "h-9 px-3.5")}>
                    Edit
                  </Link>
                  {confirming === setup.slug ? (
                    <>
                      <button
                        type="button"
                        disabled={deleting === setup.slug}
                        onClick={() => remove(setup.slug)}
                        className={buttonClass("secondary", "sm", "h-9 border-danger px-3.5 text-danger disabled:opacity-60")}
                      >
                        {deleting === setup.slug ? "Deleting…" : "Delete permanently"}
                      </button>
                      <button type="button" onClick={() => setConfirming(null)} className={buttonClass("secondary", "sm", "h-9 px-3.5")}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirming(setup.slug)} className={buttonClass("secondary", "sm", "h-9 px-3.5")}>
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
