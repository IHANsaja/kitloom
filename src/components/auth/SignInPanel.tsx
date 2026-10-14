"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Turnstile, turnstileSiteKey, type TurnstileHandle } from "@/components/auth/Turnstile";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { buttonClass, inputClass } from "@/components/ui/styles";
import {
  callbackUrl,
  fetchAuthMethods,
  OAUTH_PROVIDERS,
  safeNextPath,
  useSession,
  type AuthMethods,
  type OAuthProviderId,
} from "@/lib/supabase/auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

type MethodsState = AuthMethods | "loading" | "error";

/**
 * Sign-in without passwords: an OAuth provider or a one-time email link. Only the methods
 * that are actually enabled on the project are shown, so no button here can be a dead end.
 */
export function SignInPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const session = useSession();
  const emailId = useId();

  const [methods, setMethods] = useState<MethodsState>("loading");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<OAuthProviderId | "email" | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Only used when a Turnstile site key is configured (see Turnstile.tsx).
  const captcha = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    fetchAuthMethods().then(
      (result) => active && setMethods(result),
      () => active && setMethods("error"),
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (session !== "loading" && session !== null) router.replace(next);
  }, [session, next, router]);

  if (!isSupabaseConfigured) {
    return (
      <Notice tone="warning" label="Sign-in is not configured">
        This deployment has no account service connected, so signing in is unavailable.
      </Notice>
    );
  }

  async function signInWith(provider: OAuthProviderId) {
    setError(null);
    setBusy(provider);
    const { error: failure } = await getSupabaseClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl(next) },
    });
    if (failure) {
      setBusy(null);
      setError("That sign-in could not be started. Try again, or use another method.");
    }
  }

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    if (turnstileSiteKey && !captchaToken) {
      setError("Complete the check above the button first.");
      return;
    }
    setError(null);
    setBusy("email");
    const { error: failure } = await getSupabaseClient().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: true, captchaToken: captchaToken ?? undefined },
    });
    setBusy(null);
    // A token is accepted once, whatever the outcome.
    captcha.current?.reset();
    if (failure) {
      setError(
        failure.status === 429
          ? "Too many sign-in emails were requested. Wait a few minutes and try again."
          : /captcha/i.test(failure.message)
            ? "The human check failed or expired. Complete it again, then resend."
            : "The sign-in email could not be sent. Check the address and try again.",
      );
      return;
    }
    setSentTo(address);
    toast.success("Sign-in link sent", { description: address });
  }

  if (sentTo) {
    return (
      <div>
        <p className="eyebrow text-lime">Check your inbox</p>
        <h2 className="mt-2 text-h2">We sent a sign-in link to {sentTo}</h2>
        <p className="mt-3 text-sm leading-relaxed text-fg-2">
          Open it on this device, in this browser, to finish signing in. The link works once and
          expires after a short time. If nothing arrives, check your spam folder.
        </p>
        <button type="button" onClick={() => setSentTo(null)} className={buttonClass("secondary", "md", "mt-6")}>
          Use a different address
        </button>
      </div>
    );
  }

  if (methods === "loading" || session === "loading") {
    return <p className="font-mono text-xs text-fg-2">Loading sign-in options…</p>;
  }
  if (methods === "error") {
    return (
      <Notice tone="danger" label="Sign-in unavailable">
        The account service did not respond. Reload the page to try again.
      </Notice>
    );
  }
  if (!methods.email && methods.oauth.length === 0) {
    return (
      <Notice tone="warning" label="No sign-in method enabled">
        No sign-in method is switched on for this site yet.
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      {methods.oauth.length > 0 ? (
        <div className="space-y-2.5">
          {OAUTH_PROVIDERS.filter((provider) => methods.oauth.includes(provider.id)).map((provider) => (
            <button
              key={provider.id}
              type="button"
              disabled={busy !== null}
              onClick={() => signInWith(provider.id)}
              className={buttonClass(provider.id === "github" ? "primary" : "secondary", "lg", "w-full disabled:opacity-60")}
            >
              {busy === provider.id ? "Redirecting…" : `Continue with ${provider.label}`}
              <Icon name="arrow-up-right" size={16} />
            </button>
          ))}
        </div>
      ) : null}

      {methods.oauth.length > 0 && methods.email ? (
        <p className="eyebrow flex items-center gap-3 text-fg-3 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
          or
        </p>
      ) : null}

      {methods.email ? (
        <form onSubmit={sendLink} noValidate>
          <label htmlFor={emailId} className="text-sm font-medium">
            Email address
          </label>
          <input
            id={emailId}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error !== null}
            aria-describedby={`${emailId}-help`}
            placeholder="you@example.com"
            className={inputClass("mt-2")}
          />
          <p id={`${emailId}-help`} className="mt-2 text-xs leading-relaxed text-fg-2">
            We email you a one-time sign-in link. No password. Your address is never shown publicly.
          </p>
          {turnstileSiteKey ? (
            <div className="mt-4">
              {captchaUnavailable ? (
                <p className="text-xs leading-relaxed text-danger">
                  The human check could not load, so email sign-in is unavailable. Allow
                  challenges.cloudflare.com or use another sign-in method.
                </p>
              ) : (
                <Turnstile ref={captcha} onToken={setCaptchaToken} onUnavailable={() => setCaptchaUnavailable(true)} />
              )}
            </div>
          ) : null}
          <button type="submit" disabled={busy !== null || (Boolean(turnstileSiteKey) && !captchaToken)} className={buttonClass(methods.oauth.length > 0 ? "secondary" : "primary", "lg", "mt-4 w-full disabled:opacity-60")}>
            {busy === "email" ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="flex items-start gap-2 text-sm text-danger">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
