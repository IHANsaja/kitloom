/**
 * Email-and-password sign-in rules and messages, shared by the sign-in page and the
 * account page. Supabase Auth stores and checks passwords; nothing here sees a hash.
 *
 * Set the same minimum length in Supabase (Authentication → Policies) so the server
 * enforces it too, and turn on leaked-password protection there.
 */

export const PASSWORD_MIN = 10;
/** bcrypt ignores everything after 72 bytes, so longer passwords give a false sense of strength. */
export const PASSWORD_MAX = 72;

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  if (/^\s|\s$/.test(password)) return "Remove spaces at the start or end.";
  return null;
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthFailure {
  code?: string;
  status?: number;
  message: string;
}

/**
 * Plain-language message for a Supabase Auth error. Sign-in failures never say whether
 * the email exists, so the form cannot be used to find out who has an account.
 */
export function explainAuthError(error: AuthFailure, action: "sign-in" | "sign-up" | "link" | "reset" | "update"): string {
  const code = error.code ?? "";
  if (error.status === 429 || /rate_limit/.test(code)) return "Too many attempts. Wait a few minutes and try again.";
  // Supabase answers 500 when its mail server refuses the message. That is a site problem,
  // the same for every address, so saying so reveals nothing about who has an account.
  if ((action === "sign-up" || action === "link") && (error.status === 500 || code === "unexpected_failure")) {
    return "We could not send the email right now. Try again later, or continue with GitHub or Google.";
  }
  if (/captcha/i.test(code) || /captcha/i.test(error.message)) return "The human check failed or expired. Complete it again and retry.";
  if (code === "weak_password") return `That password is too weak or has appeared in a data breach. Use at least ${PASSWORD_MIN} characters and avoid common passwords.`;
  if (code === "same_password") return "That is your current password. Choose a different one.";
  if (code === "reauthentication_needed" || code === "session_not_found") return "For safety, sign in again before changing your password.";
  if (code === "email_address_invalid") return "Enter a valid email address.";
  if (code === "signup_disabled" || code === "email_provider_disabled") return "Creating accounts with email is switched off on this site.";
  if (action === "sign-in") {
    if (code === "email_not_confirmed") return "Confirm your email first: open the link we sent when you created the account.";
    return "The email or password is incorrect.";
  }
  if (action === "sign-up") return "The account could not be created. Check the details and try again.";
  if (action === "link") return "The sign-in link could not be sent. Try again in a moment.";
  if (action === "reset") return "The reset email could not be sent. Try again in a moment.";
  return "Your password could not be changed. Try again.";
}
