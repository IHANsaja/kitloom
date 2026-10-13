"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { buttonClass, cx, inputClass } from "@/components/ui/styles";
import { setupHref } from "@/lib/catalog/summary";
import { AGENTS, CATEGORIES, type AgentId, type CategoryId } from "@/lib/catalog/taxonomy";
import { fetchRepoDetails, GitHubError, type RepoDetails } from "@/lib/community/github";
import {
  createSetup,
  fetchCommunitySetup,
  parseTags,
  slugify,
  updateSetup,
  validateSetupInput,
  type SetupInput,
  type SetupInputErrors,
} from "@/lib/community/setups";
import { invalidateCommunitySetups } from "@/lib/community/useAllSetups";
import { pluralize } from "@/lib/format";
import { MAX_SOURCE_REPOSITORIES, parseGitHubRepoList, parseGitHubRepoUrl } from "@/lib/packages/urls";
import { useSession } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const EMPTY: SetupInput = {
  slug: "",
  name: "",
  description: "",
  repositoryUrl: "",
  agents: [],
  categories: [],
  tags: [],
  version: "",
  license: "",
  sourceRepositories: [],
};

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined }) => ReactNode;
}

function Field({ label, hint, error, optional, children }: FieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-medium">
        {label}
        {optional ? <span className="font-mono text-xs font-normal text-fg-2">optional</span> : null}
      </label>
      <div className="mt-2">{children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}</div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-fg-2">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
          <Icon name="alert" size={14} className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface CheckGroupProps<T extends string> {
  legend: string;
  hint: string;
  error?: string;
  options: readonly { id: T; label: string }[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
}

function CheckGroup<T extends string>({ legend, hint, error, options, selected, onChange }: CheckGroupProps<T>) {
  const id = useId();
  return (
    <fieldset aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}>
      <legend className="text-sm font-medium">{legend}</legend>
      <p id={`${id}-hint`} className="mt-1 text-xs leading-relaxed text-fg-2">
        {hint}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label
              key={option.id}
              className={cx(
                "flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors duration-150 ease-kit",
                checked ? "bg-surface-2 text-fg" : "bg-carbon text-fg-2 hover:bg-surface hover:text-fg",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? selected.filter((value) => value !== option.id) : [...selected, option.id])}
                className="h-4 w-4 shrink-0 accent-lime"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
          <Icon name="alert" size={14} className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

type RepoState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; url: string; details: RepoDetails }
  | { kind: "error"; message: string };

/**
 * Publishes (or edits) a community setup. The files stay in the creator's public GitHub
 * repository: this form stores a description and a snapshot of the repository's README
 * and file list. There is no upload, because Kitloom has nowhere trustworthy to keep one.
 */
export function PublishForm() {
  const router = useRouter();
  const editSlug = useSearchParams().get("edit");
  const session = useSession();
  const userId = session !== "loading" && session !== null ? session.user.id : null;

  const [input, setInput] = useState<SetupInput>(EMPTY);
  const [tagsText, setTagsText] = useState("");
  const [sourcesText, setSourcesText] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<SetupInputErrors>({});
  const [repo, setRepo] = useState<RepoState>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editState, setEditState] = useState<"none" | "loading" | "ready" | "denied">(editSlug ? "loading" : "none");

  const set = <K extends keyof SetupInput>(key: K, value: SetupInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  useEffect(() => {
    if (!editSlug || !userId) return;
    let active = true;
    fetchCommunitySetup(editSlug).then(
      (found) => {
        if (!active) return;
        if (!found || found.ownerId !== userId) {
          setEditState("denied");
          return;
        }
        const { setup } = found;
        setInput({
          slug: setup.slug,
          name: setup.name,
          description: setup.description,
          repositoryUrl: setup.repositoryUrl ?? "",
          agents: setup.agents.map((agent) => agent.id),
          categories: setup.categories,
          tags: setup.tags,
          version: setup.version ?? "",
          license: setup.license ?? "",
          sourceRepositories: setup.sourceRepositories,
        });
        setSourcesText(setup.sourceRepositories.join("\n"));
        setTagsText(setup.tags.join(", "));
        setSlugTouched(true);
        setEditState("ready");
      },
      () => active && setEditState("denied"),
    );
    return () => {
      active = false;
    };
  }, [editSlug, userId]);

  if (!isSupabaseConfigured) {
    return (
      <Notice tone="warning" label="Publishing is not configured">
        This deployment has no account service connected, so setups cannot be published from the site.
      </Notice>
    );
  }

  if (session === "loading") {
    return <p className="font-mono text-xs text-fg-2">Checking your sign-in…</p>;
  }

  if (session === null) {
    const next = editSlug ? `/publish?edit=${editSlug}` : "/publish";
    return (
      <div className="rounded-sm border border-line bg-surface px-5 py-6">
        <p className="eyebrow text-fg-2">Sign-in required</p>
        <h2 className="mt-2 text-h2">Sign in to publish a setup</h2>
        <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-fg-2">
          An account ties a listing to its creator, so you can edit or remove it later and nobody
          else can. It takes one click or one email.
        </p>
        <Link href={`/signin?next=${encodeURIComponent(next)}`} className={buttonClass("primary", "lg", "mt-5")}>
          Sign in to continue
          <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    );
  }

  if (editState === "loading") return <p className="font-mono text-xs text-fg-2">Loading your setup…</p>;
  if (editState === "denied") {
    return (
      <Notice tone="danger" label="Cannot edit">
        That setup does not exist, or it belongs to a different account.{" "}
        <Link href="/account">See your setups</Link>.
      </Notice>
    );
  }

  const editing = editState === "ready";

  async function readRepository(): Promise<RepoState> {
    const parsed = parseGitHubRepoUrl(input.repositoryUrl);
    if (!parsed) {
      const state: RepoState = { kind: "error", message: "Enter a public GitHub repository, for example https://github.com/owner/repo." };
      setRepo(state);
      return state;
    }
    setRepo({ kind: "loading" });
    try {
      const details = await fetchRepoDetails(parsed);
      const state: RepoState = { kind: "ready", url: parsed.url, details };
      setRepo(state);
      // Fill only what the creator has not written themselves.
      setInput((current) => {
        const name = current.name.trim() === "" ? parsed.repo.replace(/[-_.]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80) : current.name;
        return {
          ...current,
          repositoryUrl: parsed.url,
          name,
          slug: slugTouched || current.slug !== "" ? current.slug : slugify(name),
          description: current.description.trim() === "" && details.description ? details.description.slice(0, 280) : current.description,
          license: current.license.trim() === "" && details.license ? details.license : current.license,
        };
      });
      return state;
    } catch (error) {
      const state: RepoState = {
        kind: "error",
        message: error instanceof GitHubError ? error.message : "The repository could not be read. Try again.",
      };
      setRepo(state);
      return state;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const sources = parseGitHubRepoList(sourcesText);
    const candidate: SetupInput = { ...input, tags: parseTags(tagsText), sourceRepositories: sources.urls };
    const found = validateSetupInput(candidate);
    if (sources.invalid.length > 0) {
      found.sourceRepositories = `Not a GitHub repository link: ${sources.invalid.slice(0, 3).join(", ")}`;
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError("Some fields need attention. Nothing was published.");
      return;
    }

    setSubmitting(true);
    try {
      const canonical = parseGitHubRepoUrl(candidate.repositoryUrl)?.url;
      // Always publish with details read from GitHub for exactly this repository.
      const current = repo.kind === "ready" && repo.url === canonical ? repo : await readRepository();
      if (current.kind !== "ready") {
        setFormError(current.kind === "error" ? current.message : "The repository could not be read.");
        return;
      }
      const snapshot = {
        defaultBranch: current.details.defaultBranch,
        readme: current.details.readme,
        manifest: current.details.manifest,
      };
      const final = { ...candidate, repositoryUrl: current.url };
      if (editing) await updateSetup(final.slug, final, snapshot);
      else await createSetup(final, snapshot);

      invalidateCommunitySetups();
      toast.success(editing ? "Setup updated" : "Setup published", { description: final.name });
      router.push(setupHref({ slug: final.slug, origin: "community" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "The setup could not be saved. Nothing was published.";
      if (message.includes("already taken")) setErrors((current) => ({ ...current, slug: message }));
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <div className="space-y-3">
        <Field
          label="GitHub repository"
          hint="Must be public. Kitloom links to the ZIP that GitHub builds from this repository; nothing is uploaded."
          error={errors.repositoryUrl}
        >
          {(props) => (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                {...props}
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://github.com/owner/repo"
                value={input.repositoryUrl}
                onChange={(event) => {
                  set("repositoryUrl", event.target.value);
                  setRepo({ kind: "idle" });
                }}
                className={inputClass("h-11 flex-1 font-mono text-code")}
              />
              <button type="button" onClick={() => void readRepository()} disabled={repo.kind === "loading"} className={buttonClass("secondary", "md", "h-11 disabled:opacity-60")}>
                {repo.kind === "loading" ? "Reading…" : "Read from GitHub"}
              </button>
            </div>
          )}
        </Field>

        <div aria-live="polite">
          {repo.kind === "ready" ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-l-lime bg-surface px-3 py-2 font-mono text-xs text-fg-2">
              <Icon name="check" size={14} className="text-lime" />
              <span className="text-fg">Repository found</span>
              <span>{pluralize(repo.details.manifest.length, "file")}{repo.details.manifestTruncated ? " (first 500 stored)" : ""}</span>
              <span>{repo.details.readme ? "README found" : "no README"}</span>
              <span>{repo.details.license ?? "no licence detected"}</span>
              {repo.details.defaultBranch ? <span>branch {repo.details.defaultBranch}</span> : null}
            </p>
          ) : repo.kind === "error" ? (
            <p role="alert" className="flex items-start gap-2 border-l-2 border-l-danger bg-surface px-3 py-2 text-sm text-danger">
              <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
              {repo.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Name" error={errors.name}>
          {(props) => (
            <input
              {...props}
              type="text"
              maxLength={80}
              value={input.name}
              onChange={(event) => {
                const name = event.target.value;
                set("name", name);
                if (!editing && !slugTouched) setInput((current) => ({ ...current, name, slug: slugify(name) }));
              }}
              className={inputClass("h-11")}
            />
          )}
        </Field>
        <Field
          label="URL name"
          hint={editing ? "Cannot be changed after publishing, so existing links keep working." : `Your page will be kitloom.site/setup?slug=${input.slug || "…"}`}
          error={errors.slug}
        >
          {(props) => (
            <input
              {...props}
              type="text"
              maxLength={64}
              readOnly={editing}
              autoCapitalize="off"
              spellCheck={false}
              value={input.slug}
              onChange={(event) => {
                setSlugTouched(true);
                set("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
              className={inputClass("h-11 font-mono text-code")}
            />
          )}
        </Field>
      </div>

      <Field
        label="Description"
        hint={`What it does and who it is for. ${input.description.trim().length}/280 characters, at least 20.`}
        error={errors.description}
      >
        {(props) => (
          <textarea {...props} rows={3} maxLength={280} value={input.description} onChange={(event) => set("description", event.target.value)} className={inputClass("resize-y leading-relaxed")} />
        )}
      </Field>

      <CheckGroup<AgentId>
        legend="Agents"
        hint="Only the agents this setup is actually written for. Listings show these as declared by you, not tested by Kitloom."
        error={errors.agents}
        options={AGENTS.map((agent) => ({ id: agent.id, label: agent.name }))}
        selected={input.agents}
        onChange={(next) => set("agents", next)}
      />

      <CheckGroup<CategoryId>
        legend="Categories"
        hint="Where people should find it."
        error={errors.categories}
        options={CATEGORIES.map((category) => ({ id: category.id, label: category.label }))}
        selected={input.categories}
        onChange={(next) => set("categories", next)}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Field label="Tags" optional hint="Up to 8, separated by commas." error={errors.tags}>
          {(props) => (
            <input
              {...props}
              type="text"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="code-review, skill"
              value={tagsText}
              onChange={(event) => {
                setTagsText(event.target.value);
                setErrors((current) => ({ ...current, tags: undefined }));
              }}
              className={inputClass("h-11 font-mono text-code")}
            />
          )}
        </Field>
        <Field label="Version" optional hint="Semantic version, e.g. 1.0.0." error={errors.version}>
          {(props) => <input {...props} type="text" spellCheck={false} placeholder="1.0.0" value={input.version} onChange={(event) => set("version", event.target.value)} className={inputClass("h-11 font-mono text-code")} />}
        </Field>
        <Field label="Licence" optional hint="SPDX identifier. Filled from GitHub when it detects one." error={errors.license}>
          {(props) => <input {...props} type="text" spellCheck={false} placeholder="MIT" value={input.license} onChange={(event) => set("license", event.target.value)} className={inputClass("h-11 font-mono text-code")} />}
        </Field>
      </div>

      <Field
        label="Built from"
        optional
        hint={`Credit other public GitHub repositories you drew on to make this setup, one per line, up to ${MAX_SOURCE_REPOSITORIES}. They are shown on your page as “Built from”.`}
        error={errors.sourceRepositories}
      >
        {(props) => (
          <textarea
            {...props}
            rows={3}
            spellCheck={false}
            autoCapitalize="off"
            placeholder={"https://github.com/owner/repo\nhttps://github.com/another/repo"}
            value={sourcesText}
            onChange={(event) => {
              setSourcesText(event.target.value);
              setErrors((current) => ({ ...current, sourceRepositories: undefined }));
            }}
            className={inputClass("resize-y font-mono text-code leading-relaxed")}
          />
        )}
      </Field>

      <div className="border-t border-line pt-6">
        {formError ? (
          <p role="alert" className="mb-4 flex items-start gap-2 text-sm text-danger">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            {formError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={submitting} className={buttonClass("primary", "lg", "disabled:opacity-60")}>
            {submitting ? "Saving…" : editing ? "Save changes" : "Publish setup"}
          </button>
          <Link href={editing ? "/account" : "/explore"} className={buttonClass("secondary", "lg")}>
            Cancel
          </Link>
          <p className="basis-full text-xs leading-relaxed text-fg-2 sm:basis-auto">
            {editing
              ? "Saving re-reads the README and file list from GitHub."
              : "Your listing appears immediately. You can edit or delete it from your account."}
          </p>
        </div>
      </div>
    </form>
  );
}
