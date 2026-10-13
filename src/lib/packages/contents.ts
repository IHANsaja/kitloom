import type { ManifestEntry } from "@/types/catalog";

export interface ContentKind {
  id: string;
  label: string;
  /** What this kind of file can do once an agent picks it up. */
  note: string;
  /** True when the files can cause commands to run on the user's machine. */
  executes: boolean;
  count: number;
}

interface Detector {
  id: string;
  label: string;
  note: string;
  executes: boolean;
  test: (path: string) => boolean;
}

const base = (path: string) => path.split("/").pop() ?? path;

const DETECTORS: Detector[] = [
  {
    id: "instructions",
    label: "Agent instructions",
    note: "Always-on guidance the agent reads at the start of a session.",
    executes: false,
    test: (p) => /^(AGENTS|CLAUDE|GEMINI)\.md$/i.test(base(p)) || /(^|\/)\.github\/copilot-instructions\.md$/.test(p),
  },
  {
    id: "rules",
    label: "Project rules",
    note: "Scoped rules applied by file pattern or on request.",
    executes: false,
    test: (p) => /(^|\/)\.(cursor|agent|agents|windsurf)\/rules\//.test(p) || /(^|\/)\.cursorrules$/.test(p),
  },
  {
    id: "skills",
    label: "Skills",
    note: "Procedures the agent loads when a task matches. May bundle scripts.",
    executes: false,
    test: (p) => /(^|\/)skills\/[^/]+\/SKILL\.md$/.test(p),
  },
  {
    id: "commands",
    label: "Commands",
    note: "Prompts you trigger by name, such as slash commands.",
    executes: false,
    test: (p) => /(^|\/)\.(claude|codex|cursor|gemini)\/(commands|prompts)\//.test(p),
  },
  {
    id: "subagents",
    label: "Agent definitions",
    note: "Named sub-agents with their own instructions and tool access.",
    executes: false,
    test: (p) => /(^|\/)\.(claude|codex)\/agents\//.test(p),
  },
  {
    id: "workflows",
    label: "Workflows",
    note: "Multi-step procedures the agent follows in order.",
    executes: false,
    test: (p) => /(^|\/)\.(agent|agents|windsurf)\/workflows\//.test(p),
  },
  {
    id: "mcp",
    label: "MCP server configuration",
    note: "Registers tool servers. Starting one runs the command it names.",
    executes: true,
    test: (p) => /(^|\/)\.?mcp\.json$/.test(p) || /(^|\/)\.(cursor|vscode)\/mcp\.json$/.test(p),
  },
  {
    id: "hooks",
    label: "Hooks and agent settings",
    note: "Settings files can define hooks that run shell commands automatically.",
    executes: true,
    test: (p) => /(^|\/)\.(claude|codex|gemini)\/(settings(\.local)?\.json|config\.toml|hooks\/.+)$/.test(p),
  },
  {
    id: "scripts",
    label: "Scripts",
    note: "Executable files. Read them before anything runs them.",
    executes: true,
    test: (p) => /\.(sh|bash|zsh|ps1|bat|cmd|py|js|mjs|cjs|ts|rb)$/i.test(p),
  },
  {
    id: "docs",
    label: "Documentation",
    note: "Reference material for people and agents.",
    executes: false,
    test: (p) => /\.(md|mdx|txt)$/i.test(p) || /^LICENSE/i.test(base(p)),
  },
];

/**
 * Describes what a package contains by looking only at its file manifest. First match
 * wins per file. This is a reading aid derived from paths — it is not a security scan.
 */
export function describeContents(manifest: readonly ManifestEntry[]): ContentKind[] {
  const counts = new Map<string, number>();
  for (const entry of manifest) {
    const detector = DETECTORS.find((d) => d.test(entry.path));
    if (detector) counts.set(detector.id, (counts.get(detector.id) ?? 0) + 1);
  }
  return DETECTORS.filter((d) => counts.has(d.id)).map((d) => ({
    id: d.id,
    label: d.label,
    note: d.note,
    executes: d.executes,
    count: counts.get(d.id) ?? 0,
  }));
}
