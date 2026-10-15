"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { PasswordField } from "@/components/auth/PasswordField";
import { ProviderIcon } from "@/components/auth/ProviderIcon";
import { Turnstile, turnstileSiteKey, type TurnstileHandle } from "@/components/auth/Turnstile";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { buttonClass, cx, inputClass } from "@/components/ui/styles";
import {
  callbackUrl,
  fetchAuthMethods,
  OAUTH_PROVIDERS,
  RESET_PASSWORD_PATH,
  safeNextPath,
  useSession,
  type AuthMethods,
  type OAuthProviderId,
} from "@/lib/supabase/auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { EMAIL, explainAuthError, PASSWORD_MIN, passwordProblem } from "@/lib/supabase/password";

type MethodsState = AuthMethods | "loading" | "error";
/** sign-in and sign-up use a password; forgot sends a reset link; link sends a one-time sign-in link. */
type Mode = "sign-in" | "sign-up" | "forgot" | "link";
type Sent = { kind: "confirm" | "reset" | "link"; to: string };

const SENT_COPY: Record<Sent["kind"], { eyebrow: string; title: string; body: string }> = {
  confirm: {
    eyebrow: "Confirm your email",
    title: "Check your inbox to finish creating your account",
    body: "Open the confirmation link on this device, in this browser. Then sign in with your email and password.",
  },
  reset: {
    eyebrow: "Check your inbox",
    title: "If an account uses that address, a reset link is on its way",
    body: "Open it on this device, in this browser, and choose a new password. The link works once and expires after a short time.",
  },
  link: {
    eyebrow: "Check your inbox",
    title: "We sent a sign-in link",
    body: "Open it on this device, in this browser, to finish signing in. The link works once and expires after a short time.",
  },
};

/**
 * Sign-in: GitHub or Google, an email and password, or a one-time emailed link. Only the
 * methods enabled on the Supabase project are shown, so no button here is a dead end.
 * Messages never reveal whether an email address has an account.
 */
export function SignInPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const session = useSession();
  const emailId = useId();

  const [methods, setMethods] = useState<MethodsState>("loading");
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<OAuthProviderId | "email" | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
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

  function switchMode(target: Mode) {
    setMode(target);
    setError(null);
    setPassword("");
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!EMAIL.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode === "sign-up") {
      const problem = passwordProblem(password);
      if (problem) {
        setError(problem);
        return;
      }
    }
    if (mode === "sign-in" && password === "") {
      setError("Enter your password.");
      return;
    }
    if (turnstileSiteKey && !captchaToken) {
      setError("Complete the check above the button first.");
      return;
    }
    setError(null);
    setBusy("email");
    const auth = getSupabaseClient().auth;
    const captchaOption = captchaToken ?? undefined;

    try {
      if (mode === "sign-in") {
        const { error: failure } = await auth.signInWithPassword({ email: address, password, options: { captchaToken: captchaOption } });
        if (failure) setError(explainAuthError(failure, "sign-in"));
        // Success: the session effect above forwards to `next`.
      } else if (mode === "sign-up") {
        const { data, error: failure } = await auth.signUp({
          email: address,
          password,
          options: { emailRedirectTo: callbackUrl(next), captchaToken: captchaOption },
        });
        if (failure) setError(explainAuthError(failure, "sign-up"));
        // With email confirmation on there is no session yet. Supabase answers the same way
        // whether or not the address already has an account, so this reveals nothing.
        else if (!data.session) setSent({ kind: "confirm", to: address });
      } else if (mode === "forgot") {
        const { error: failure } = await auth.resetPasswordForEmail(address, {
          redirectTo: callbackUrl(RESET_PASSWORD_PATH),
          captchaToken: captchaOption,
        });
        if (failure && (failure.status === 429 || /captcha/i.test(failure.message))) setError(explainAuthError(failure, "reset"));
        else setSent({ kind: "reset", to: address });
      } else {
        const { error: failure } = await auth.signInWithOtp({
          email: address,
          options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: true, captchaToken: captchaOption },
        });
        if (failure) setError(explainAuthError(failure, "link"));
        else {
          setSent({ kind: "link", to: address });
          toast.success("Sign-in link sent", { description: address });
        }
      }
    } finally {
      setBusy(null);
      setPassword(mode === "sign-in" ? password : "");
      // A token is accepted once, whatever the outcome.
      captcha.current?.reset();
    }
  }

  if (sent) {
    const copy = SENT_COPY[sent.kind];
    return (
      <div>
        <p className="eyebrow text-lime">{copy.eyebrow}</p>
        <h2 className="mt-2 text-h2 break-words">{copy.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-fg-2">
          {copy.body} Sent to <span className="font-mono text-code break-all text-fg">{sent.to}</span>. If nothing arrives, check your spam folder.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(null);
            switchMode("sign-in");
          }}
          className={buttonClass("secondary", "md", "mt-6")}
        >
          Back to sign in
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

  const submitLabel = { "sign-in": "Sign in", "sign-up": "Create account", forgot: "Send reset link", link: "Email me a sign-in link" }[mode];
  const busyLabel = { "sign-in": "Signing in…", "sign-up": "Creating account…", forgot: "Sending…", link: "Sending…" }[mode];

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
              className={buttonClass(provider.id === "github" ? "primary" : "secondary", "lg", "group w-full disabled:opacity-60")}
            >
              <span className={provider.id === "github" ? "" : "transition-colors duration-150 ease-kit group-hover:text-lime"}>
                <ProviderIcon provider={provider.id} />
              </span>
              {busy === provider.id ? "Redirecting…" : `Continue with ${provider.label}`}
            </button>
          ))}
        </div>
      ) : null}

      {methods.oauth.length > 0 && methods.email ? (
        <p className="eyebrow flex items-center gap-3 text-fg-3 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
          or with email
        </p>
      ) : null}

      {methods.email ? (
        <div>
          {mode === "sign-in" || mode === "sign-up" ? (
            <div role="tablist" aria-label="Email sign-in" className="mb-5 grid grid-cols-2 gap-px border border-line bg-line">
              {(["sign-in", "sign-up"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab}
                  onClick={() => switchMode(tab)}
                  className={cx(
                    "h-10 text-sm transition-colors duration-150 ease-kit",
                    mode === tab ? "bg-surface-2 font-semibold text-fg" : "bg-carbon text-fg-2 hover:text-fg",
                  )}
                >
                  {tab === "sign-in" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-5">
              <p className="text-sm font-semibold">{mode === "forgot" ? "Reset your password" : "Sign in with a one-time link"}</p>
              <p className="mt-1 text-xs leading-relaxed text-fg-2">
                {mode === "forgot"
                  ? "We email you a link to choose a new password."
                  : "We email you a link that signs you in once. No password needed."}
              </p>
            </div>
          )}

          <form onSubmit={submit} noValidate className="space-y-4" role={mode === "sign-in" || mode === "sign-up" ? "tabpanel" : undefined}>
            <div>
              <label htmlFor={emailId} className="text-sm font-medium">
                Email address
              </label>
              <input
                id={emailId}
                type="email"
                name="email"
                autoComplete={mode === "sign-up" ? "email" : "username"}
                inputMode="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={error !== null}
                placeholder="you@example.com"
                className={inputClass("mt-2")}
              />
            </div>

            {mode === "sign-in" || mode === "sign-up" ? (
              <PasswordField
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                invalid={error !== null}
                hint={mode === "sign-up" ? `At least ${PASSWORD_MIN} characters. A password manager can generate one.` : undefined}
              />
            ) : null}

            {mode === "sign-in" ? (
              <button type="button" onClick={() => switchMode("forgot")} className="link text-xs">
                Forgot password?
              </button>
            ) : null}

            {turnstileSiteKey ? (
              <div>
                {captchaUnavailable ? (
                  <p className="text-xs leading-relaxed text-danger">
                    The human check could not load, so email sign-in is unavailable. Allow challenges.cloudflare.com or use
                    another sign-in method.
                  </p>
                ) : (
                  <Turnstile ref={captcha} onToken={setCaptchaToken} onUnavailable={() => setCaptchaUnavailable(true)} />
                )}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy !== null || (Boolean(turnstileSiteKey) && !captchaToken)}
              className={buttonClass(methods.oauth.length > 0 ? "secondary" : "primary", "lg", "w-full disabled:opacity-60")}
            >
              {busy === "email" ? busyLabel : submitLabel}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
            {mode === "forgot" || mode === "link" ? (
              <button type="button" onClick={() => switchMode("sign-in")} className="link">
                Back to sign in with a password
              </button>
            ) : (
              <button type="button" onClick={() => switchMode("link")} className="link">
                Email me a sign-in link instead
              </button>
            )}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-fg-2">Your email address is used to sign you in. It is never shown publicly.</p>
        </div>
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
