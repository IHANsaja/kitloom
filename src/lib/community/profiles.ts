/**
 * The signed-in member's own profile: read it, and change the three editable fields.
 *
 * The database is the boundary (migration 20261015090000_profile_editing.sql): column
 * grants allow only display_name, bio and website_url; a trigger enforces the name rules
 * (length and characters, reserved names, unique regardless of case, once a day). The
 * checks here mirror those rules only so people get a clear message before saving.
 */
import { getSupabaseClient } from "@/lib/supabase/client";

export interface OwnProfile {
  displayName: string;
  githubUsername: string | null;
  bio: string | null;
  websiteUrl: string | null;
  /** When the display name last changed; null if never. */
  displayNameChangedAt: string | null;
}

export interface ProfileInput {
  displayName: string;
  bio: string;
  websiteUrl: string;
}

export class ProfileError extends Error {
  constructor(
    message: string,
    readonly field: keyof ProfileInput | null = null,
  ) {
    super(message);
  }
}

export const DISPLAY_NAME = /^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u;
export const BIO_MAX = 200;
const WEBSITE = /^https:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/\S*)?$/;

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() !== "" ? value : null);

export async function fetchOwnProfile(userId: string): Promise<OwnProfile | null> {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("display_name, github_username, bio, website_url, display_name_changed_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new ProfileError("Your profile could not be loaded.");
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    displayName: text(row.display_name) ?? "",
    githubUsername: text(row.github_username),
    bio: text(row.bio),
    websiteUrl: text(row.website_url),
    displayNameChangedAt: text(row.display_name_changed_at),
  };
}

/** Problems with the input, before it is sent. Empty when it looks acceptable. */
export function validateProfile(input: ProfileInput): ProfileError[] {
  const problems: ProfileError[] = [];
  const name = input.displayName.trim();
  if (name.length < 3 || name.length > 40 || !DISPLAY_NAME.test(name) || /\s{2}/.test(name)) {
    problems.push(new ProfileError("Use 3–40 characters: letters, digits, spaces, \".\", \"_\" or \"-\", starting with a letter or digit.", "displayName"));
  }
  if (input.bio.trim().length > BIO_MAX) problems.push(new ProfileError(`Keep the bio to ${BIO_MAX} characters.`, "bio"));
  const website = input.websiteUrl.trim();
  if (website !== "" && (website.length > 200 || !WEBSITE.test(website))) {
    problems.push(new ProfileError("Use a full https:// address, such as https://example.com.", "websiteUrl"));
  }
  return problems;
}

export async function updateOwnProfile(userId: string, current: OwnProfile, input: ProfileInput): Promise<OwnProfile> {
  const problems = validateProfile(input);
  if (problems[0]) throw problems[0];
  const changes: Record<string, string | null> = {
    bio: input.bio.trim() || null,
    website_url: input.websiteUrl.trim() || null,
  };
  // Only send the name when it changed, so editing the bio never trips the once-a-day rule.
  if (input.displayName.trim() !== current.displayName) changes.display_name = input.displayName.trim();

  const { error } = await getSupabaseClient().from("profiles").update(changes).eq("id", userId);
  if (error) {
    if (error.code === "23505") throw new ProfileError("Someone already uses that name, or one that differs only in capitals or punctuation.", "displayName");
    if (error.code === "P0001") throw new ProfileError(error.message, "displayName");
    if (error.code === "23514") throw new ProfileError("One of the fields was rejected. Check the website address and bio length.");
    throw new ProfileError("Your profile could not be saved. Try again.");
  }
  const fresh = await fetchOwnProfile(userId);
  if (!fresh) throw new ProfileError("Your profile could not be reloaded.");
  return fresh;
}
