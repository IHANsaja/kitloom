import { describe, expect, it } from "vitest";

import { setupHref, toSummary } from "@/lib/catalog/summary";
import { parseTags, rowToCommunitySetup, slugify, validateSetupInput, type SetupInput } from "@/lib/community/setups";
import { getDownloadAccess } from "@/lib/packages/access";
import {
  fileNameFromDownloadUrl,
  githubArchiveUrl,
  isAllowedDownloadUrl,
  isGitHubArchiveUrl,
  gitHubRepoLabel,
  isGitHubRepoUrl,
  parseGitHubRepoList,
  parseGitHubRepoUrl,
} from "@/lib/packages/urls";
import { safeNextPath } from "@/lib/supabase/auth";

const row = {
  slug: "my-kit",
  name: "My Kit",
  description: "A description that is long enough to pass.",
  agents: ["claude-code", "cursor"],
  categories: ["documentation"],
  tags: ["docs", "skill"],
  version: "1.2.0",
  license: "MIT",
  repository_url: "https://github.com/octo/my-kit",
  default_branch: "main",
  created_at: "2026-10-13T08:13:12.66563+00:00",
  updated_at: "2026-10-14T09:00:00+00:00",
  status: "published",
  owner_id: "00000000-0000-0000-0000-00000000000a",
  profiles: { display_name: "octo", github_username: "octo" },
  readme: "# My Kit",
  source_repositories: ["https://github.com/anthropics/skills", "https://github.com/octo/other"],
  manifest: [
    { path: "README.md", sizeBytes: 10 },
    { path: ".claude/skills/x/SKILL.md", sizeBytes: 20 },
  ],
};

describe("GitHub repository links", () => {
  it("normalises what people paste", () => {
    for (const input of [
      "https://github.com/octo/my-kit",
      "https://github.com/octo/my-kit/",
      "https://github.com/octo/my-kit.git",
      "https://github.com/octo/my-kit/tree/main/docs",
      "github.com/octo/my-kit",
      "  https://www.github.com/octo/my-kit  ",
    ]) {
      expect(parseGitHubRepoUrl(input)?.url, input).toBe("https://github.com/octo/my-kit");
    }
  });

  it.each([
    "",
    "https://github.com/octo",
    "https://gitlab.com/octo/my-kit",
    "https://github.com.evil.example/octo/my-kit",
    "http://github.com/octo/my-kit",
    "https://user:pass@github.com/octo/my-kit",
    "https://github.com:8443/octo/my-kit",
    "javascript:alert(1)",
    "https://github.com/../my-kit",
    "https://github.com/octo/my kit",
  ])("rejects %s", (input) => {
    expect(parseGitHubRepoUrl(input)).toBeNull();
  });

  it("only treats the canonical form as stored-safe", () => {
    expect(isGitHubRepoUrl("https://github.com/octo/my-kit")).toBe(true);
    expect(isGitHubRepoUrl("https://github.com/octo/my-kit/")).toBe(false);
    expect(isGitHubRepoUrl("https://github.com/octo/my-kit?x=1")).toBe(false);
  });

  it("builds archive links and nothing else", () => {
    expect(githubArchiveUrl("https://github.com/octo/my-kit", "main")).toBe("https://github.com/octo/my-kit/archive/refs/heads/main.zip");
    expect(githubArchiveUrl("https://github.com/octo/my-kit", "feat/x")).toBe("https://github.com/octo/my-kit/archive/refs/heads/feat/x.zip");
    expect(githubArchiveUrl("https://github.com/octo/my-kit", null)).toBe("https://github.com/octo/my-kit/archive/HEAD.zip");
    expect(githubArchiveUrl("https://github.com/octo/my-kit", "../../etc")).toBe("https://github.com/octo/my-kit/archive/HEAD.zip");
    expect(githubArchiveUrl("https://evil.example/octo/my-kit", "main")).toBeNull();
  });

  it("accepts archive URLs as downloads and names the file", () => {
    const url = "https://github.com/octo/my-kit/archive/refs/heads/feat/x.zip";
    expect(isGitHubArchiveUrl(url)).toBe(true);
    expect(isAllowedDownloadUrl(url)).toBe(true);
    expect(fileNameFromDownloadUrl(url)).toBe("my-kit-feat-x.zip");
    expect(fileNameFromDownloadUrl("https://github.com/octo/my-kit/archive/HEAD.zip")).toBeNull();
    expect(isGitHubArchiveUrl("https://github.com/octo/my-kit/archive/HEAD.zip?token=1")).toBe(false);
    expect(isGitHubArchiveUrl("https://github.com/octo/my-kit/archive/refs/tags/v1.zip")).toBe(false);
    expect(isGitHubArchiveUrl("https://codeload.github.com/octo/my-kit/zip/main")).toBe(false);
  });
});

describe("database rows", () => {
  it("maps a valid row to a community setup", () => {
    const mapped = rowToCommunitySetup(row);
    expect(mapped?.ownerId).toBe(row.owner_id);
    expect(mapped?.status).toBe("published");
    const setup = mapped!.setup;
    expect(setup).toMatchObject({
      slug: "my-kit",
      origin: "community",
      creator: { name: "octo", url: "https://github.com/octo" },
      license: "MIT",
      version: "1.2.0",
      repositoryUrl: "https://github.com/octo/my-kit",
      sourceRepositories: ["https://github.com/anthropics/skills", "https://github.com/octo/other"],
      publishedAt: "2026-10-13T08:13:12.665Z",
      downloads: null,
      featured: false,
    });
    expect(setup.package).toEqual({
      format: "zip",
      downloadUrl: "https://github.com/octo/my-kit/archive/refs/heads/main.zip",
      sizeBytes: null,
      sha256: null,
    });
    expect(setup.agents.every((agent) => agent.compatibility === "declared")).toBe(true);
    expect(getDownloadAccess(setup)).toMatchObject({ kind: "free", source: "github-archive", external: true, fileName: "my-kit-main.zip" });
    expect(setupHref(toSummary(setup))).toBe("/setup?slug=my-kit");
  });

  it.each([
    ["not an object", null],
    ["bad slug", { ...row, slug: "Bad Slug" }],
    ["non-GitHub repository", { ...row, repository_url: "https://evil.example/a/b" }],
    ["javascript repository", { ...row, repository_url: "javascript:alert(1)" }],
    ["no known agents", { ...row, agents: ["skynet"] }],
    ["no known categories", { ...row, categories: ["blockchain"] }],
    ["missing date", { ...row, created_at: "not a date" }],
    ["missing owner", { ...row, owner_id: null }],
  ])("drops a row with %s", (_label, bad) => {
    expect(rowToCommunitySetup(bad)).toBeNull();
  });

  it("strips unsafe pieces from an otherwise valid row", () => {
    const mapped = rowToCommunitySetup({
      ...row,
      agents: ["claude-code", "skynet", "claude-code"],
      tags: ["ok", "Has Space", "<script>"],
      version: "v1",
      license: "MIT; DROP",
      default_branch: "../../x",
      profiles: { display_name: null, github_username: "not a user/../x" },
      manifest: [{ path: "../../etc/passwd", sizeBytes: 1 }, { path: "ok.md", sizeBytes: -5 }, { path: "ok.md", sizeBytes: 1 }, "junk"],
      source_repositories: ["https://github.com/a/b", "https://github.com/a/b", "https://evil.example/a/b", "javascript:alert(1)", "https://github.com/a/b/", "https://github.com/octo/my-kit", 42],
      status: "hidden",
    });
    const setup = mapped!.setup;
    expect(mapped!.status).toBe("hidden");
    expect(setup.agents.map((agent) => agent.id)).toEqual(["claude-code"]);
    expect(setup.tags).toEqual(["ok"]);
    expect(setup.sourceRepositories).toEqual(["https://github.com/a/b"]);
    expect(setup.version).toBeNull();
    expect(setup.license).toBeNull();
    expect(setup.creator).toEqual({ name: "Kitloom member", url: null });
    expect(setup.manifest).toEqual([{ path: "ok.md", sizeBytes: null }]);
    expect(setup.package.downloadUrl).toBe("https://github.com/octo/my-kit/archive/HEAD.zip");
  });
});

describe("publish form validation", () => {
  const valid: SetupInput = {
    slug: "my-kit",
    name: "My Kit",
    description: "A description that is long enough to pass.",
    repositoryUrl: "https://github.com/octo/my-kit",
    agents: ["codex"],
    categories: ["productivity"],
    tags: ["one"],
    version: "",
    license: "",
    sourceRepositories: ["https://github.com/anthropics/skills"],
  };

  it("accepts a complete submission, with optional fields empty", () => {
    expect(validateSetupInput(valid)).toEqual({});
  });

  it("reports each problem against its field", () => {
    const errors = validateSetupInput({
      ...valid,
      slug: "No",
      name: "x",
      description: "too short",
      repositoryUrl: "https://example.com/a/b",
      agents: [],
      categories: [],
      tags: ["Bad Tag"],
      version: "v1",
      license: "not a licence!",
      sourceRepositories: ["https://evil.example/a/b"],
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["agents", "categories", "description", "license", "name", "repositoryUrl", "slug", "sourceRepositories", "tags", "version"].sort(),
    );
  });

  it("limits and sanity-checks credit links", () => {
    const nine = Array.from({ length: 9 }, (_, i) => `https://github.com/o/r${i}`);
    expect(validateSetupInput({ ...valid, sourceRepositories: nine }).sourceRepositories).toBeDefined();
    expect(validateSetupInput({ ...valid, sourceRepositories: [valid.repositoryUrl] }).sourceRepositories).toBeDefined();
    expect(validateSetupInput({ ...valid, sourceRepositories: [] }).sourceRepositories).toBeUndefined();
  });

  it("parses a pasted list of repositories", () => {
    const pasted = ["https://github.com/a/b", " github.com/c/d.git, https://github.com/a/b/tree/main", "not-a-link https://gitlab.com/x/y"].join("\n");
    expect(parseGitHubRepoList(pasted)).toEqual({
      urls: ["https://github.com/a/b", "https://github.com/c/d"],
      invalid: ["not-a-link", "https://gitlab.com/x/y"],
    });
    expect(parseGitHubRepoList("  ")).toEqual({ urls: [], invalid: [] });
    expect(gitHubRepoLabel("https://github.com/a/b")).toBe("a/b");
  });

  it("limits tags to eight", () => {
    expect(validateSetupInput({ ...valid, tags: "a b c d e f g h i".split(" ") }).tags).toBeDefined();
  });

  it("derives slugs and tags from free text", () => {
    expect(slugify("  My Débug Kit!! v2 ")).toBe("my-debug-kit-v2");
    expect(slugify("---")).toBe("");
    expect(slugify("a".repeat(80)).length).toBe(64);
    expect(parseTags("Code-Review, #skill  skill,,docs")).toEqual(["code-review", "skill", "docs"]);
  });
});

describe("post-sign-in redirect", () => {
  it("only allows same-site paths", () => {
    expect(safeNextPath("/publish?edit=my-kit")).toBe("/publish?edit=my-kit");
    for (const bad of [null, "", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)"]) {
      expect(safeNextPath(bad), String(bad)).toBe("/account");
    }
  });
});
