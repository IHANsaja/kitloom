/**
 * Browser Supabase client.
 *
 * Kitloom is a static export, so there is no server to hold a secret: only the project URL
 * and the publishable key are used, and both are public by design. Every table must have
 * Row Level Security enabled — RLS, not this key, is what protects data.
 *
 * Never import a secret or service-role key anywhere in this application.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** False when the environment variables are missing, e.g. a build without `.env.local`. */
export const isSupabaseConfigured = Boolean(url && publishableKey);

let client: SupabaseClient | null = null;

/**
 * Returns the shared client, creating it on first use. Throws a clear error when the
 * environment is not configured, so a missing variable is never mistaken for empty data.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
  // PKCE keeps tokens out of the URL: the callback page receives a one-time code instead.
  // The client never redeems a code on its own (detectSessionInUrl: false); only
  // /auth/callback does, exactly once, so the sign-in cannot be started on one page and
  // cut off by a navigation.
  client ??= createClient(url, publishableKey, {
    auth: { flowType: "pkce", detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
  });
  return client;
}
