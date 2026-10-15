"use client";

import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/ui/Icon";
import { buttonClass, inputClass } from "@/components/ui/styles";
import { invalidateSetups } from "@/lib/community/useSetups";
import { BIO_MAX, ProfileError, updateOwnProfile, validateProfile, type OwnProfile, type ProfileInput } from "@/lib/community/profiles";

/** The public face of an account: display name, bio and website. */
export function ProfileEditor({ userId, profile, onSaved }: { userId: string; profile: OwnProfile; onSaved: (next: OwnProfile) => void }) {
  const id = useId();
  const [input, setInput] = useState<ProfileInput>({
    displayName: profile.displayName,
    bio: profile.bio ?? "",
    websiteUrl: profile.websiteUrl ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileInput | "form", string>>>({});
  const [saving, setSaving] = useState(false);

  const nameChanged = input.displayName.trim() !== profile.displayName;
  const dirty = nameChanged || input.bio.trim() !== (profile.bio ?? "") || input.websiteUrl.trim() !== (profile.websiteUrl ?? "");
  const nextNameChange = profile.displayNameChangedAt ? new Date(Date.parse(profile.displayNameChangedAt) + 86_400_000) : null;
  // The time the page opened is precise enough for a once-a-day rule.
  const [openedAt] = useState(() => Date.now());
  const nameLocked = nextNameChange !== null && nextNameChange.getTime() > openedAt;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems = validateProfile(input);
    if (problems.length > 0) {
      setErrors(Object.fromEntries(problems.map((p) => [p.field ?? "form", p.message])));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const next = await updateOwnProfile(userId, profile, input);
      onSaved(next);
      // Listings show the display name, so refresh them.
      invalidateSetups();
      toast.success("Profile saved");
    } catch (error) {
      const failure = error instanceof ProfileError ? error : new ProfileError("Your profile could not be saved.");
      setErrors({ [failure.field ?? "form"]: failure.message });
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof ProfileInput) => ({
    "aria-invalid": errors[key] !== undefined,
    "aria-describedby": `${id}-${key}-help${errors[key] ? ` ${id}-${key}-error` : ""}`,
  });
  const error = (key: keyof ProfileInput) =>
    errors[key] ? (
      <p id={`${id}-${key}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
        <Icon name="alert" size={12} className="mt-0.5 shrink-0" />
        {errors[key]}
      </p>
    ) : null;

  return (
    <form onSubmit={save} noValidate className="max-w-[40rem] space-y-6">
      <div>
        <label htmlFor={`${id}-name`} className="text-sm font-medium">
          Display name
        </label>
        <input
          id={`${id}-name`}
          value={input.displayName}
          onChange={(e) => setInput({ ...input, displayName: e.target.value })}
          maxLength={40}
          autoComplete="nickname"
          disabled={nameLocked}
          className={inputClass("mt-2 disabled:opacity-60")}
          {...field("displayName")}
        />
        <p id={`${id}-displayName-help`} className="mt-2 text-xs leading-relaxed text-fg-2">
          {nameLocked && nextNameChange
            ? `You changed your name recently. You can change it again after ${nextNameChange.toLocaleString()}.`
            : "Shown on your listings. 3–40 characters; it must be unique and can be changed once a day. Names like Kitloom or the agent vendors are reserved."}
        </p>
        {error("displayName")}
      </div>

      <div>
        <label htmlFor={`${id}-bio`} className="text-sm font-medium">
          Bio <span className="font-normal text-fg-2">(optional)</span>
        </label>
        <textarea
          id={`${id}-bio`}
          value={input.bio}
          onChange={(e) => setInput({ ...input, bio: e.target.value })}
          rows={3}
          maxLength={BIO_MAX + 40}
          className={inputClass("mt-2 resize-y")}
          {...field("bio")}
        />
        <p id={`${id}-bio-help`} className="mt-2 font-mono text-xs text-fg-2 tabular-nums">
          {input.bio.trim().length}/{BIO_MAX}
        </p>
        {error("bio")}
      </div>

      <div>
        <label htmlFor={`${id}-web`} className="text-sm font-medium">
          Website <span className="font-normal text-fg-2">(optional)</span>
        </label>
        <input
          id={`${id}-web`}
          type="url"
          inputMode="url"
          value={input.websiteUrl}
          onChange={(e) => setInput({ ...input, websiteUrl: e.target.value })}
          placeholder="https://example.com"
          autoComplete="url"
          className={inputClass("mt-2")}
          {...field("websiteUrl")}
        />
        <p id={`${id}-websiteUrl-help`} className="mt-2 text-xs leading-relaxed text-fg-2">
          {profile.githubUsername
            ? `Your listings link to github.com/${profile.githubUsername}; the website appears on your account only.`
            : "Your name on listings links here."}
        </p>
        {error("websiteUrl")}
      </div>

      {profile.githubUsername ? (
        <p className="text-xs leading-relaxed text-fg-2">
          Linked GitHub account: <span className="font-mono text-fg">{profile.githubUsername}</span>. It comes from GitHub sign-in and cannot be
          edited.
        </p>
      ) : null}

      {errors.form ? (
        <p role="alert" className="flex items-start gap-2 text-sm text-danger">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          {errors.form}
        </p>
      ) : null}

      <button type="submit" disabled={!dirty || saving} className={buttonClass("primary", "md", "disabled:opacity-50")}>
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
