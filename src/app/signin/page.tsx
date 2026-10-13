import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInPanel } from "@/components/auth/SignInPanel";
import { Band } from "@/components/ui/Frame";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Kitloom to publish and manage your setups.",
  alternates: { canonical: "/signin" },
  robots: { index: false },
};

export default function SignInPage() {
  return (
    <Band as="div">
      <div className="lg:grid lg:grid-cols-12">
        <div className="cell-x py-10 lg:col-span-7 lg:py-16">
          <p className="eyebrow text-fg-3">Account</p>
          <h1 className="mt-2 text-h1 text-balance">Sign in to publish</h1>
          <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-fg-2 text-pretty">
            Browsing and downloading never need an account. Signing in lets you list your own
            setups and edit or remove them later.
          </p>
          <ul className="mt-8 max-w-[52ch] space-y-3 border-t border-line pt-6 text-sm leading-relaxed text-fg-2">
            <li>Kitloom stores a public display name and the setups you publish. Nothing else.</li>
            <li>Your email address is used only to sign you in. It is never displayed.</li>
            <li>There are no passwords to create or remember.</li>
          </ul>
        </div>
        <div className="cell-x border-t border-line py-10 lg:col-span-5 lg:border-t-0 lg:border-l lg:px-8 lg:py-16">
          <Suspense fallback={<p className="font-mono text-xs text-fg-2">Loading sign-in options…</p>}>
            <SignInPanel />
          </Suspense>
        </div>
      </div>
    </Band>
  );
}
