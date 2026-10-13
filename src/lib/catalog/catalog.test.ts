import { describe, expect, it } from "vitest";

import rawCatalog from "@/data/setups.json";
import { getAllSlugs, getSetupBySlug, getSetups, getSetupSummaries } from "@/lib/catalog";
import {
  computeFacets,
  availableSorts,
  EMPTY_QUERY,
  normalizeText,
  parseQueryParams,
  searchSetups,
  sortSetups,
  toQueryString,
} from "@/lib/catalog/query";
import { isSafeManifestPath, parseCatalog, validateCatalog } from "@/lib/catalog/schema";
import { getDownloadAccess } from "@/lib/packages/access";
import { describeContents } from "@/lib/packages/contents";
import {
  fileNameFromDownloadUrl,
  isAllowedDownloadUrl,
  isSafeHttpsUrl,
  resolveMarkdownLink,
} from "@/lib/packages/urls";
import type { SetupSummary } from "@/types/catalog";

const validRecord = {
  id: "example",
  slug: "example",
  name: "Example",
  description: "A record that exists only inside this test file.",
  origin: "community",
  creator: { name: "Someone", url: null },
  agents: [{ id: "codex", compatibility: "declared" }],
  categories: ["productivity"],
  tags: ["example"],
  version: "1.0.0",
  releaseNotes: null,
  license: null,
  package: { format: "zip", downloadUrl: null, sizeBytes: null, sha256: null },
  repositoryUrl: null,
  readme: null,
  manifest: [],
  publishedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  downloads: null,
  featured: false,
};

const withRecord = (patch: Record<string, unknown>) => ({
  schemaVersion: 1,
  setups: [{ ...validRecord, ...patch }],
});

function summary(patch: Partial<SetupSummary>): SetupSummary {
  return {
    slug: "s",
    name: "S",
    description: "",
    origin: "community",
    creatorName: "Someone",
    agents: ["codex"],
    categories: ["productivity"],
    tags: [],
    version: "1.0.0",
    license: null,
    format: "zip",
    publishedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    downloads: null,
    featured: false,
    ...patch,
  };
}

describe("the real catalog", () => {
  it("passes validation", () => {
    expect(validateCatalog(rawCatalog).errors).toEqual([]);
  });

  it("has unique slugs and resolves each one", () => {
    const slugs = getAllSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(getSetupBySlug(slug)?.slug).toBe(slug);
  });

  it("returns null for a missing setup", () => {
    expect(getSetupBySlug("does-not-exist")).toBeNull();
  });

  it("never claims download counts or tested compatibility it does not have", () => {
    for (const slug of getAllSlugs()) {
      const setup = getSetupBySlug(slug);
      expect(setup?.downloads).toBeNull();
      expect(setup?.agents.every((agent) => agent.compatibility === "declared")).toBe(true);
    }
  });

  it("gives every first-party kit a verifiable, downloadable package", () => {
    for (const slug of getAllSlugs()) {
      const setup = getSetupBySlug(slug);
      if (!setup || setup.origin !== "first-party") continue;
      expect(setup.package.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(setup.manifest.length).toBeGreaterThan(0);
      expect(getDownloadAccess(setup)).toMatchObject({
        kind: "free",
        external: false,
        fileName: `${slug}-${setup.version}.zip`,
      });
    }
  });

  it("answers queries through the catalog service", () => {
    const all = getSetupSummaries();
    expect(getSetups(EMPTY_QUERY)).toHaveLength(all.length);
    expect(getSetups({ ...EMPTY_QUERY, q: "zzzz-no-such-thing" })).toEqual([]);
  });
});

describe("catalog validation", () => {
  it("accepts a valid record", () => {
    expect(validateCatalog(withRecord({})).errors).toEqual([]);
  });

  it("rejects a wrong envelope", () => {
    expect(validateCatalog({ schemaVersion: 2, setups: [] }).errors).not.toEqual([]);
    expect(validateCatalog(null).errors).not.toEqual([]);
  });

  it.each([
    ["missing required field", { name: undefined }],
    ["unknown agent", { agents: [{ id: "skynet", compatibility: "declared" }] }],
    ["no agents", { agents: [] }],
    ["unknown category", { categories: ["blockchain"] }],
    ["invalid date", { publishedAt: "yesterday" }],
    ["impossible date", { publishedAt: "2026-13-40T00:00:00.000Z" }],
    ["updated before published", { updatedAt: "2025-01-01T00:00:00.000Z" }],
    ["bad sha256", { package: { ...validRecord.package, sha256: "abc123" } }],
    ["uppercase sha256", { package: { ...validRecord.package, sha256: "A".repeat(64) } }],
    ["unsupported format", { package: { ...validRecord.package, format: "tar" } }],
    ["bad slug", { slug: "Has Spaces" }],
    ["bad version", { version: "v1" }],
    ["http repository", { repositoryUrl: "http://github.com/a/b" }],
    ["javascript creator url", { creator: { name: "X", url: "javascript:alert(1)" } }],
    ["invented download count field type", { downloads: "lots" }],
    ["unknown extra field", { price: 5 }],
    ["traversal in manifest", { manifest: [{ path: "../../etc/passwd", sizeBytes: 1 }] }],
    ["community package on a first-party path", { package: { ...validRecord.package, downloadUrl: "/packages/x-1.0.0.zip" } }],
  ])("rejects %s", (_label, patch) => {
    const { errors, catalog } = validateCatalog(withRecord(patch));
    expect(errors.length).toBeGreaterThan(0);
    expect(catalog.setups).toHaveLength(0);
  });

  it("reports duplicates and keeps the first record", () => {
    const { errors, catalog } = validateCatalog({
      schemaVersion: 1,
      setups: [validRecord, { ...validRecord }, { ...validRecord, id: "other" }],
    });
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("duplicate id");
    expect(errors[1]).toContain("duplicate slug");
    expect(catalog.setups).toHaveLength(1);
  });

  it("isolates a malformed record instead of losing the valid ones", () => {
    const { errors, catalog } = validateCatalog({
      schemaVersion: 1,
      setups: [validRecord, { slug: "broken" }, 42],
    });
    expect(catalog.setups.map((s) => s.slug)).toEqual(["example"]);
    expect(errors.some((e) => e.includes('"broken"'))).toBe(true);
    expect(errors.some((e) => e.startsWith("setups[2]"))).toBe(true);
  });

  it("parseCatalog throws a readable error", () => {
    expect(() => parseCatalog(withRecord({ slug: "Bad Slug" }))).toThrow(/setups\.json.*invalid/s);
  });

  it("checks manifest paths", () => {
    expect(isSafeManifestPath(".claude/skills/x/SKILL.md")).toBe(true);
    for (const bad of ["", "/abs", "a/../b", "..", "a\\b", "C:/x", "a//b", "./a"]) {
      expect(isSafeManifestPath(bad), bad).toBe(false);
    }
  });
});

describe("package URL validation", () => {
  it("accepts first-party paths and GitHub release assets only", () => {
    expect(isAllowedDownloadUrl("/packages/review-pass-1.0.0.zip")).toBe(true);
    expect(isAllowedDownloadUrl("https://github.com/owner/repo/releases/download/v1.0.0/kit.zip")).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:application/zip;base64,AAAA",
    "http://github.com/owner/repo/releases/download/v1/kit.zip",
    "https://github.com.evil.example/owner/repo/releases/download/v1/kit.zip",
    "https://user:pass@github.com/owner/repo/releases/download/v1/kit.zip",
    "https://github.com/owner/repo/archive/main.zip",
    "https://github.com/owner/repo/releases/download/v1/kit.exe",
    "https://example.com/kit.zip",
    "/packages/../secret.zip",
    "/other/kit.zip",
    "//evil.example/packages/kit.zip",
    "packages/kit.zip",
    "",
  ])("rejects %s", (url) => {
    expect(isAllowedDownloadUrl(url)).toBe(false);
  });

  it("requires https without credentials for links", () => {
    expect(isSafeHttpsUrl("https://example.com/a")).toBe(true);
    expect(isSafeHttpsUrl("http://example.com")).toBe(false);
    expect(isSafeHttpsUrl("ftp://example.com")).toBe(false);
    expect(isSafeHttpsUrl("not a url")).toBe(false);
  });

  it("reports unavailable downloads instead of inventing a link", () => {
    expect(getDownloadAccess({ package: { ...validRecord.package, format: "zip" } }).kind).toBe("unavailable");
    expect(
      getDownloadAccess({
        package: { format: "zip", downloadUrl: "javascript:alert(1)", sizeBytes: null, sha256: null },
      }).kind,
    ).toBe("unavailable");
  });

  it("extracts file names", () => {
    expect(fileNameFromDownloadUrl("/packages/a-1.0.0.zip")).toBe("a-1.0.0.zip");
    expect(fileNameFromDownloadUrl("https://github.com/o/r/releases/download/v1/kit.zip")).toBe("kit.zip");
    expect(fileNameFromDownloadUrl("https://example.com/")).toBeNull();
  });

  it("blocks unsafe Markdown links", () => {
    expect(resolveMarkdownLink("https://example.com")).toEqual({ kind: "external", href: "https://example.com/" });
    expect(resolveMarkdownLink("#install")).toEqual({ kind: "fragment", href: "#install" });
    for (const bad of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "data:text/html,x", "vbscript:x", "file:///etc/passwd", "docs/install.md", undefined]) {
      expect(resolveMarkdownLink(bad).kind, String(bad)).toBe("blocked");
    }
  });
});

describe("search", () => {
  const setups = [
    summary({ slug: "a", name: "Alpha Review", description: "Checks diffs", tags: ["code-review"], agents: ["claude-code", "cursor"], categories: ["development-review"], publishedAt: "2026-03-01T00:00:00.000Z" }),
    summary({ slug: "b", name: "beta Débug", description: "Finds bugs", tags: ["debugging"], agents: ["claude-code"], categories: ["testing-debugging"], publishedAt: "2026-05-01T00:00:00.000Z", license: "MIT" }),
    summary({ slug: "c", name: "Gamma Notes", description: "Hand-off notes", agents: ["aider"], categories: ["productivity"], publishedAt: "2026-04-01T00:00:00.000Z", creatorName: "Robin" }),
  ];
  const run = (patch: Partial<typeof EMPTY_QUERY>) => searchSetups(setups, { ...EMPTY_QUERY, ...patch }).map((s) => s.slug);

  it("normalises case, whitespace, and diacritics", () => {
    expect(normalizeText("  Héllo \n  WORLD ")).toBe("hello world");
    expect(run({ q: "   ALPHA   " })).toEqual(["a"]);
    expect(run({ q: "debug" })).toEqual(["b"]);
    expect(run({ q: "   " })).toHaveLength(3);
  });

  it("matches name, description, tags, category, agent, licence, and creator", () => {
    expect(run({ q: "diffs" })).toEqual(["a"]);
    expect(run({ q: "code-review" })).toEqual(["a"]);
    expect(run({ q: "testing" })).toEqual(["b"]);
    expect(run({ q: "cursor" })).toEqual(["a"]);
    expect(run({ q: "anthropic" }).sort()).toEqual(["a", "b"]);
    expect(run({ q: "mit" })).toEqual(["b"]);
    expect(run({ q: "robin" })).toEqual(["c"]);
  });

  it("requires every term to match", () => {
    expect(run({ q: "claude review" })).toEqual(["a"]);
    expect(run({ q: "claude nonsense" })).toEqual([]);
  });

  it("filters by agent, including the grouped other-agents filter", () => {
    expect(run({ agent: "claude-code" }).sort()).toEqual(["a", "b"]);
    expect(run({ agent: "cursor" })).toEqual(["a"]);
    expect(run({ agent: "antigravity" })).toEqual([]);
    expect(run({ agent: "other" })).toEqual(["c"]);
  });

  it("filters by category and combines with agent and search", () => {
    expect(run({ category: "testing-debugging" })).toEqual(["b"]);
    expect(run({ category: "testing-debugging", agent: "cursor" })).toEqual([]);
    expect(run({ category: "development-review", agent: "cursor", q: "alpha" })).toEqual(["a"]);
  });

  it("sorts newest first and alphabetically", () => {
    expect(run({ sort: "newest" })).toEqual(["b", "c", "a"]);
    expect(run({ sort: "name" })).toEqual(["a", "b", "c"]);
  });

  it("only offers most-downloaded when real data exists", () => {
    expect(availableSorts(setups).map((s) => s.id)).toEqual(["newest", "name"]);
    expect(run({ sort: "downloads" })).toEqual(["b", "c", "a"]);
    const counted = [summary({ slug: "x", name: "X", downloads: 3 }), summary({ slug: "y", name: "Y", downloads: 9 }), summary({ slug: "z", name: "Z" })];
    expect(availableSorts(counted).map((s) => s.id)).toContain("downloads");
    expect(sortSetups(counted, "downloads").map((s) => s.slug)).toEqual(["y", "x", "z"]);
  });

  it("computes facet counts that match the results of selecting them", () => {
    const facets = computeFacets(setups, { ...EMPTY_QUERY, category: "testing-debugging" });
    expect(facets.agents["claude-code"]).toBe(1);
    expect(facets.agents.cursor).toBe(0);
    expect(facets.categories["development-review"]).toBe(1);
    expect(facets.categories.documentation).toBe(0);
  });

  it("round-trips URL parameters and ignores junk", () => {
    const query = { q: "review  kit", agent: "cursor", category: "documentation", sort: "name" } as const;
    expect(parseQueryParams(new URLSearchParams(toQueryString(query)))).toEqual(query);
    expect(toQueryString(EMPTY_QUERY)).toBe("");
    expect(parseQueryParams(new URLSearchParams("agent=<script>&category=nope&sort=price"))).toEqual(EMPTY_QUERY);
  });
});

describe("package contents", () => {
  it("classifies files and flags the kinds that can run commands", () => {
    const kinds = describeContents(
      ["AGENTS.md", "README.md", ".claude/skills/x/SKILL.md", ".claude/commands/review.md", ".cursor/rules/a.mdc", ".mcp.json", ".claude/settings.json", "tools/setup.sh"].map(
        (path) => ({ path, sizeBytes: 1 }),
      ),
    );
    expect(kinds.map((k) => k.id)).toEqual(["instructions", "rules", "skills", "commands", "mcp", "hooks", "scripts", "docs"]);
    expect(kinds.filter((k) => k.executes).map((k) => k.id)).toEqual(["mcp", "hooks", "scripts"]);
  });
});

describe("publishing template", () => {
  it("is a valid catalog record once its placeholders are filled in", async () => {
    const { CATALOG_ENTRY_TEMPLATE } = await import("@/lib/publishing");
    const record = JSON.parse(CATALOG_ENTRY_TEMPLATE);
    record.package.sizeBytes = 1024;
    record.package.sha256 = "a".repeat(64);
    expect(validateCatalog({ schemaVersion: 1, setups: [record] }).errors).toEqual([]);
  });
});
