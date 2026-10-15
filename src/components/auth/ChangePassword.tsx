"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PasswordField } from "@/components/auth/PasswordField";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/styles";
import { explainAuthError, PASSWORD_MIN, passwordProblem } from "@/lib/supabase/password";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Set or change the account password. Accounts created with GitHub, Google or an emailed
 * link can add one here to sign in with email and password too. After a "forgot password"
 * link, this is where the new password is chosen.
 */
export function ChangePassword({ recovering = false }: { recovering?: boolean }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = passwordProblem(password) ?? (password !== confirm ? "The two passwords do not match." : null);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    const { error: failure } = await getSupabaseClient().auth.updateUser({ password });
    setBusy(false);
    if (failure) {
      setError(explainAuthError(failure, "update"));
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Password saved", { description: "You can now sign in with your email and this password." });
  }

  return (
    <form onSubmit={save} noValidate className="max-w-[40rem] space-y-5">
      {recovering ? (
        <p className="border-l-2 border-lime bg-surface px-4 py-3 text-sm leading-relaxed text-fg">
          You followed a password reset link. Choose a new password to finish.
        </p>
      ) : null}
      <PasswordField
        label="New password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        invalid={error !== null}
        hint={`At least ${PASSWORD_MIN} characters. A password manager can generate one.`}
      />
      <PasswordField label="Repeat the new password" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={error !== null} />
      {error ? (
        <p role="alert" className="flex items-start gap-2 text-sm text-danger">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className={buttonClass("primary", "md", "disabled:opacity-60")}>
        {busy ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
