import { describe, expect, it } from "vitest";

import {
  availableSorts,
  computeFacets,
  EMPTY_QUERY,
  normalizeText,
  parseQueryParams,
  searchSetups,
  sortSetups,
  toQueryString,
} from "@/lib/catalog/query";
import { getDownloadAccess } from "@/lib/packages/access";
import { describeContents } from "@/lib/packages/contents";
import { isSafeManifestPath } from "@/lib/packages/paths";
import { isAllowedDownloadUrl, isSafeHttpsUrl, resolveMarkdownLink } from "@/lib/packages/urls";
import type { SetupSummary } from "@/types/catalog";

function summary(patch: Partial<SetupSummary>): SetupSummary {
  return {
    slug: "s",
    name: "S",
    description: "",
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
    ...patch,
  };
}

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

  it("handles an empty directory", () => {
    expect(searchSetups([], EMPTY_QUERY)).toEqual([]);
    expect(computeFacets([], EMPTY_QUERY).agents["claude-code"]).toBe(0);
  });

  it("round-trips URL parameters and ignores junk", () => {
    const query = { q: "review  kit", agent: "cursor", category: "documentation", sort: "name" } as const;
    expect(parseQueryParams(new URLSearchParams(toQueryString(query)))).toEqual(query);
    expect(toQueryString(EMPTY_QUERY)).toBe("");
    expect(parseQueryParams(new URLSearchParams("agent=<script>&category=nope&sort=price"))).toEqual(EMPTY_QUERY);
  });
});

describe("download links", () => {
  it("accepts GitHub repository archives only", () => {
    expect(isAllowedDownloadUrl("https://github.com/owner/repo/archive/refs/heads/main.zip")).toBe(true);
    expect(isAllowedDownloadUrl("https://github.com/owner/repo/archive/HEAD.zip")).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:application/zip;base64,AAAA",
    "http://github.com/owner/repo/archive/HEAD.zip",
    "https://github.com.evil.example/owner/repo/archive/HEAD.zip",
    "https://user:pass@github.com/owner/repo/archive/HEAD.zip",
    "https://github.com/owner/repo/releases/download/v1/kit.zip",
    "https://github.com/owner/repo/archive/HEAD.exe",
    "https://github.com/owner/repo/archive/refs/heads/../../x.zip",
    "https://example.com/kit.zip",
    "/packages/kit-1.0.0.zip",
    "//evil.example/kit.zip",
    "",
  ])("rejects %s", (url) => {
    expect(isAllowedDownloadUrl(url)).toBe(false);
  });

  it("reports unavailable downloads instead of inventing a link", () => {
    expect(getDownloadAccess({ package: { format: "zip", downloadUrl: null } }).kind).toBe("unavailable");
    expect(getDownloadAccess({ package: { format: "zip", downloadUrl: "javascript:alert(1)" } }).kind).toBe("unavailable");
  });

  it("requires https without credentials for links", () => {
    expect(isSafeHttpsUrl("https://example.com/a")).toBe(true);
    expect(isSafeHttpsUrl("http://example.com")).toBe(false);
    expect(isSafeHttpsUrl("not a url")).toBe(false);
  });

  it("blocks unsafe Markdown links", () => {
    expect(resolveMarkdownLink("https://example.com")).toEqual({ kind: "external", href: "https://example.com/" });
    expect(resolveMarkdownLink("#install")).toEqual({ kind: "fragment", href: "#install" });
    for (const bad of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "data:text/html,x", "vbscript:x", "file:///etc/passwd", "docs/install.md", undefined]) {
      expect(resolveMarkdownLink(bad).kind, String(bad)).toBe("blocked");
    }
  });
});

describe("file lists", () => {
  it("checks manifest paths", () => {
    expect(isSafeManifestPath(".claude/skills/x/SKILL.md")).toBe(true);
    for (const bad of ["", "/abs", "a/../b", "..", "a\\b", "C:/x", "a//b", "./a"]) {
      expect(isSafeManifestPath(bad), bad).toBe(false);
    }
  });

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
