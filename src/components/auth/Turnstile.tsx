"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Cloudflare Turnstile, the CAPTCHA Supabase Auth checks before it sends a sign-in email.
 * It stops the email form being used to flood someone's inbox. The site key is public;
 * the secret key lives only in the Supabase dashboard.
 *
 * Off unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set at build time. The script is loaded
 * only on the page that shows the widget.
 */

export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileOptions {
  sitekey: string;
  theme: "dark";
  size: "flexible";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not start.")));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Turnstile could not be loaded."));
    };
    document.head.append(script);
  });
  return loading;
}

export interface TurnstileHandle {
  /** Tokens work once: call after every attempt to get a fresh challenge. */
  reset: () => void;
}

interface TurnstileProps {
  /** Receives a token when the check passes, and null when it expires or fails. */
  onToken: (token: string | null) => void;
  /** Called if the widget cannot be loaded at all (blocked script, offline). */
  onUnavailable: () => void;
}

export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(function Turnstile({ onToken, onUnavailable }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  // Latest callbacks, so the widget is rendered once and never re-created on re-render.
  const callbacks = useRef({ onToken, onUnavailable });
  useEffect(() => {
    callbacks.current = { onToken, onUnavailable };
  });

  useImperativeHandle(ref, () => ({
    reset: () => {
      callbacks.current.onToken(null);
      if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
    },
  }));

  useEffect(() => {
    let active = true;
    loadTurnstile().then(
      (api) => {
        if (!active || !container.current) return;
        widget.current = api.render(container.current, {
          sitekey: turnstileSiteKey,
          theme: "dark",
          size: "flexible",
          callback: (token) => callbacks.current.onToken(token),
          "expired-callback": () => callbacks.current.onToken(null),
          "error-callback": () => callbacks.current.onToken(null),
        });
      },
      () => active && callbacks.current.onUnavailable(),
    );
    return () => {
      active = false;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  return <div ref={container} className="min-h-[65px]" />;
});
