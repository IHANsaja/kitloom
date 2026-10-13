/**
 * Catalog validation. Build/server only — do not import from a Client Component.
 */
import { z } from "zod";

import { AGENT_IDS, CATEGORY_IDS } from "@/lib/catalog/taxonomy";
import { isAllowedDownloadUrl, isSafeHttpsUrl } from "@/lib/packages/urls";
import type { Catalog, Setup } from "@/types/catalog";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const SPDX_LIKE = /^[A-Za-z0-9][A-Za-z0-9.+-]*$/;
const TAG = /^[a-z0-9][a-z0-9.+-]*$/;

function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

/** Manifest paths are relative, POSIX-style, and may never escape the package root. */
export function isSafeManifestPath(value: string): boolean {
  if (value.length === 0 || value.length > 260) return false;
  if (value.startsWith("/") || value.includes("\\") || /^[A-Za-z]:/.test(value)) return false;
  if (/[\u0000-\u001f]/.test(value)) return false;
  return value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

const httpsUrl = z.string().refine(isSafeHttpsUrl, "must be an https:// URL without credentials");
const isoDate = z.string().refine(isIsoDate, "must be an ISO-8601 UTC date-time");
const kebab = z.string().regex(KEBAB, "must be lowercase kebab-case");

const setupSchema = z
  .strictObject({
    id: kebab,
    slug: kebab.max(64),
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().min(20).max(280),
    origin: z.enum(["first-party", "community"]),
    creator: z.strictObject({
      name: z.string().trim().min(1).max(80),
      url: httpsUrl.nullable(),
    }),
    agents: z
      .array(
        z.strictObject({
          id: z.enum(AGENT_IDS),
          compatibility: z.enum(["declared", "tested"]),
        }),
      )
      .min(1, "at least one agent is required"),
    categories: z.array(z.enum(CATEGORY_IDS)).min(1, "at least one category is required"),
    tags: z.array(z.string().regex(TAG, "tags are lowercase, no spaces").max(32)).max(8),
    version: z.string().regex(SEMVER, "must be a semantic version such as 1.0.0").nullable(),
    releaseNotes: z.string().max(2000).nullable(),
    license: z.string().regex(SPDX_LIKE, "must be an SPDX identifier such as MIT").nullable(),
    package: z.strictObject({
      format: z.literal("zip"),
      downloadUrl: z
        .string()
        .refine(
          isAllowedDownloadUrl,
          "must be /packages/<file>.zip or an https://github.com/<owner>/<repo>/releases/download/<tag>/<file>.zip URL",
        )
        .nullable(),
      sizeBytes: z.number().int().positive().nullable(),
      sha256: z.string().regex(SHA256, "must be 64 lowercase hex characters").nullable(),
    }),
    repositoryUrl: httpsUrl.nullable(),
    readme: z.string().max(40_000).nullable(),
    manifest: z
      .array(
        z.strictObject({
          path: z.string().refine(isSafeManifestPath, "must be a safe relative path"),
          sizeBytes: z.number().int().nonnegative().nullable(),
        }),
      )
      .max(500),
    publishedAt: isoDate,
    updatedAt: isoDate,
    downloads: z.number().int().nonnegative().nullable(),
    featured: z.boolean(),
  })
  .superRefine((setup, ctx) => {
    if (Date.parse(setup.updatedAt) < Date.parse(setup.publishedAt)) {
      ctx.addIssue({ code: "custom", path: ["updatedAt"], message: "is earlier than publishedAt" });
    }
    const duplicates = (values: string[]) => values.filter((v, i) => values.indexOf(v) !== i);
    for (const [field, values] of [
      ["agents", setup.agents.map((agent) => agent.id)],
      ["categories", setup.categories],
      ["tags", setup.tags],
      ["manifest", setup.manifest.map((entry) => entry.path)],
    ] as const) {
      const repeated = duplicates([...values]);
      if (repeated.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `contains duplicates: ${[...new Set(repeated)].join(", ")}`,
        });
      }
    }
    if (setup.origin === "first-party" && setup.package.downloadUrl?.startsWith("https:")) {
      ctx.addIssue({
        code: "custom",
        path: ["package", "downloadUrl"],
        message: "first-party kits are served from /packages/",
      });
    }
    if (setup.origin === "community" && setup.package.downloadUrl?.startsWith("/")) {
      ctx.addIssue({
        code: "custom",
        path: ["package", "downloadUrl"],
        message: "community packages must be hosted as a GitHub release asset",
      });
    }
  }) satisfies z.ZodType<Setup>;

const envelopeSchema = z.object({
  schemaVersion: z.literal(1),
  setups: z.array(z.unknown()),
});

export interface CatalogValidationResult {
  /** Every record that passed validation. */
  catalog: Catalog;
  /** Human-readable problems, one per line, each naming the record it belongs to. */
  errors: string[];
}

function describeRecord(record: unknown, index: number): string {
  if (typeof record === "object" && record !== null && "slug" in record) {
    const slug = (record as { slug: unknown }).slug;
    if (typeof slug === "string" && slug.length > 0) return `setups[${index}] "${slug}"`;
  }
  return `setups[${index}]`;
}

/**
 * Validates each record on its own so one malformed entry is reported precisely
 * instead of taking the whole catalog down with an opaque error.
 */
export function validateCatalog(input: unknown): CatalogValidationResult {
  const envelope = envelopeSchema.safeParse(input);
  if (!envelope.success) {
    return {
      catalog: { schemaVersion: 1, setups: [] },
      errors: envelope.error.issues.map(
        (issue) => `catalog ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
    };
  }

  const errors: string[] = [];
  const setups: Setup[] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  envelope.data.setups.forEach((record, index) => {
    const label = describeRecord(record, index);
    const parsed = setupSchema.safeParse(record);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${label} ${issue.path.join(".") || "(record)"}: ${issue.message}`);
      }
      return;
    }
    const setup = parsed.data;
    if (seenIds.has(setup.id)) {
      errors.push(`${label} id: duplicate id "${setup.id}"`);
      return;
    }
    if (seenSlugs.has(setup.slug)) {
      errors.push(`${label} slug: duplicate slug "${setup.slug}"`);
      return;
    }
    seenIds.add(setup.id);
    seenSlugs.add(setup.slug);
    setups.push(setup);
  });

  return { catalog: { schemaVersion: 1, setups }, errors };
}

export class CatalogValidationError extends Error {
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(
      `The catalog (src/data/setups.json) is invalid:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
    );
    this.name = "CatalogValidationError";
    this.errors = errors;
  }
}

/** Strict variant used by the application: any problem stops the build with a full report. */
export function parseCatalog(input: unknown): Catalog {
  const { catalog, errors } = validateCatalog(input);
  if (errors.length > 0) throw new CatalogValidationError(errors);
  return catalog;
}
