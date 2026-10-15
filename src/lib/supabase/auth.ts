"use client";

import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * "loading" until the stored session has been read; then a Session or null (signed out).
 * Kept in a module-level store so every component sees the same value from one listener.
 */
export type SessionState = Session | null | "loading";

/** Where a password-reset link must end up: the account page, with the new-password form open. */
export const RESET_PASSWORD_PATH = "/account?reset=password";

const CALLBACK_PATH = "/auth/callback";

/** True when the URL carries a sign-in code or an auth error from Supabase. */
function isAuthRedirect(location: Location): boolean {
  const query = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.slice(1));
  return query.has("code") || query.has("error_description") || hash.has("error_description");
}

let state: SessionState = isSupabaseConfigured ? "loading" : null;
let started = false;
const listeners = new Set<() => void>();

function set(next: SessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function start() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  // Supabase falls back to the Site URL when a link's redirect is not on its allow list, so a
  // sign-in code can land on any page. Hand it to the callback page, which finishes the
  // sign-in or explains why it failed, instead of exchanging it silently wherever it landed.
  if (window.location.pathname.replace(/\/$/, "") !== CALLBACK_PATH && isAuthRedirect(window.location)) {
    window.location.replace(`${CALLBACK_PATH}${window.location.search}${window.location.hash}`);
    return;
  }
  const supabase = getSupabaseClient();
  supabase.auth.onAuthStateChange((event, session) => {
    set(session);
    // A password-reset link signs the visitor in, then they must choose a new password.
    // Supabase sends them to the Site URL instead of our callback when the redirect URL is
    // not on its allow list, so react to the event wherever it lands, not only on /auth/callback.
    if (event === "PASSWORD_RECOVERY" && window.location.pathname + window.location.search !== RESET_PASSWORD_PATH) {
      window.location.replace(RESET_PASSWORD_PATH);
    }
  });
  supabase.auth
    .getSession()
    .then(({ data }) => set(data.session))
    .catch(() => set(null));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

export function useSession(): SessionState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => (isSupabaseConfigured ? "loading" : null),
  );
}

export const OAUTH_PROVIDERS = [
  { id: "github", label: "GitHub" },
  { id: "google", label: "Google" },
] as const;

export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number]["id"];

export interface AuthMethods {
  email: boolean;
  oauth: OAuthProviderId[];
}

/**
 * Asks the project which sign-in methods are actually switched on, so the sign-in page
 * never shows a button for a provider that would fail.
 */
export async function fetchAuthMethods(): Promise<AuthMethods> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  if (!response.ok) throw new Error("Sign-in settings could not be loaded.");
  const settings = (await response.json()) as { external?: Record<string, unknown> };
  const external = settings.external ?? {};
  return {
    email: external.email === true,
    oauth: OAUTH_PROVIDERS.map((provider) => provider.id).filter((id) => external[id] === true),
  };
}

/** Only same-site paths are accepted as a post-sign-in destination. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/account";
  return value;
}

export function callbackUrl(next: string): string {
  return `${window.location.origin}${CALLBACK_PATH}?next=${encodeURIComponent(safeNextPath(next))}`;
}
