import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCallback } from "@/components/auth/AuthCallback";
import { Band } from "@/components/ui/Frame";

export const metadata: Metadata = {
  title: "Signing in",
  robots: { index: false },
};

export default function AuthCallbackPage() {
  return (
    <Band as="div">
      <div className="cell-x py-20">
        <h1 className="mb-4 text-h2">Signing you in</h1>
        <Suspense fallback={<p className="font-mono text-xs text-fg-2">Finishing sign-in…</p>}>
          <AuthCallback />
        </Suspense>
      </div>
    </Band>
  );
}
