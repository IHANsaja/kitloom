/**
 * Site-level configuration. Nothing here is secret.
 */
export const site = {
  name: "Kitloom",
  domain: "kitloom.site",
  url: "https://kitloom.site",
  tagline: "Agent setups, woven into kits you can reuse.",
  description:
    "A free, open directory of AI coding-agent setups — instructions, rules, skills, commands, and hooks for Claude Code, Codex, Cursor, Antigravity, and more. Inspect what is inside, then download the ZIP.",

  /**
   * REQUIRES CONFIGURATION.
   * The public GitHub repository that hosts this site and accepts catalog contributions,
   * for example "https://github.com/<owner>/<repo>". Leave as null until that repository
   * actually exists: while null, the Publish page explains the process without linking
   * anywhere, instead of pointing at a repository that is not there.
   */
  repositoryUrl: null as string | null,
  repositoryDefaultBranch: "main",
} as const;

export function repositoryLinks(): { home: string; contributing: string; catalog: string; newIssue: string } | null {
  const repo = site.repositoryUrl;
  if (repo === null) return null;
  const branch = site.repositoryDefaultBranch;
  return {
    home: repo,
    contributing: `${repo}/blob/${branch}/CONTRIBUTING.md`,
    catalog: `${repo}/blob/${branch}/src/data/setups.json`,
    newIssue: `${repo}/issues/new`,
  };
}
