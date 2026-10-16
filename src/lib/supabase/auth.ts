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

/**
 * The only page that redeems a sign-in code. If Supabase lands a code anywhere else (it
 * falls back to the Site URL when a redirect does not match the allow list), an inline
 * script in the root layout forwards it here before any other script runs, so no other
 * page can start redeeming it and be cut off mid-way.
 */
export const CALLBACK_PATH = "/auth/callback";

/** Where to go after the sign-in that is under way. Kept in the browser, not in the URL. */
const NEXT_KEY = "kl-auth-next";

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
  const supabase = getSupabaseClient();
  supabase.auth.onAuthStateChange((event, session) => {
    set(session);
    // A password-reset link signs the visitor in, then they must choose a new password.
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

/**
 * The redirect address for a sign-in. It is always exactly `<origin>/auth/callback`, with no
 * query string, so it matches the Supabase allow list (`https://kitloom.site/**`) every time.
 * The page to return to is remembered in localStorage, which an emailed link opened in a new
 * tab of the same browser can still read.
 */
export function callbackUrl(next: string): string {
  try {
    window.localStorage.setItem(NEXT_KEY, JSON.stringify({ next: safeNextPath(next), at: Date.now() }));
  } catch {
    // Storage blocked: the callback falls back to the account page.
  }
  return `${window.location.origin}${CALLBACK_PATH}`;
}

/** The page to return to after this sign-in (from the URL, else what callbackUrl stored). */
export function takeNextPath(fromUrl: string | null): string {
  if (fromUrl) return safeNextPath(fromUrl);
  try {
    // Read, not removed: React may call this twice. The next sign-in overwrites it, and an
    // old entry expires below.
    const raw = window.localStorage.getItem(NEXT_KEY);
    const saved = raw ? (JSON.parse(raw) as { next?: string; at?: number }) : null;
    // Only a recent sign-in counts: an old entry must not steer a later one.
    if (saved?.next && typeof saved.at === "number" && Date.now() - saved.at < 60 * 60 * 1000) return safeNextPath(saved.next);
  } catch {
    // Unreadable: fall through.
  }
  return safeNextPath(null);
}
