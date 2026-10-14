/**
 * Heddle's analysis passes. Everything here is pure: it takes paths and text and returns
 * findings, so it can be tested without a network. The fetching lives in heddle.ts.
 *
 * Three passes, cheapest first:
 *   1. structure — the file tree alone: binaries, links, nested archives, disguised names
 *   2. content   — every readable text file, line by line, against LINE_RULES, plus
 *                  invisible-character and hidden-comment checks
 *   3. config    — agent configuration parsed as data: hooks, permissions, MCP servers,
 *                  install scripts — the things that make code run without you asking
 */
import { LINE_RULES, type FileClass } from "@/lib/scan/rules";
import type { Finding, Severity, TreeEntry, Verdict } from "@/lib/scan/types";

// ── File classes ────────────────────────────────────────────────────────────────────

const base = (path: string) => path.split("/").pop() ?? path;
const ext = (path: string) => {
  const name = base(path);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};

const SCRIPT_EXT = new Set([
  "sh", "bash", "zsh", "fish", "ksh", "ps1", "psm1", "psd1", "bat", "cmd", "py", "js", "mjs", "cjs", "ts", "mts", "cts",
  "jsx", "tsx", "rb", "pl", "php", "lua", "go", "rs", "vbs", "vbe", "jse", "wsf", "applescript", "scpt", "awk",
]);
const SCRIPT_NAMES = /^(?:makefile|dockerfile|justfile|rakefile|\.envrc|\.bashrc|\.zshrc|\.profile|pre-commit|post-checkout|post-merge|pre-push|commit-msg)$/i;
const CONFIG_EXT = new Set(["json", "jsonc", "json5", "toml", "yaml", "yml", "ini", "cfg", "conf", "xml", "plist", "env", "properties"]);
const INSTRUCTION_EXT = new Set(["md", "mdc", "mdx", "markdown", "rst", "txt", "prompt"]);
const INSTRUCTION_NAMES = /^(?:\.cursorrules|\.windsurfrules|\.clinerules|\.goosehints|AGENTS|CLAUDE|GEMINI)$/i;
const TEXT_EXT = new Set(["html", "htm", "css", "scss", "svg", "csv", "sql", "graphql", "gql", "tf", "hcl", "gradle", "kt", "java", "c", "h", "cpp", "cs", "swift", "dart", "vue", "svelte", "astro", "lock", "gitignore", "gitattributes", "editorconfig", "npmrc", "nvmrc", "license"]);

/** Never read: media, fonts, archives and compiled programs. Structure checks cover them. */
const UNREADABLE_EXT = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "avif", "ico", "bmp", "tif", "tiff", "psd", "mp3", "mp4", "mov", "webm", "wav", "ogg", "flac",
  "woff", "woff2", "ttf", "otf", "eot", "pdf", "zip", "7z", "rar", "tar", "tgz", "gz", "bz2", "xz", "zst", "cab", "iso", "dmg",
  "exe", "dll", "so", "dylib", "bin", "msi", "scr", "com", "pif", "jar", "class", "pyc", "pyo", "wasm", "node", "o", "a", "lib",
  "deb", "rpm", "apk", "app", "glb", "gltf", "fbx", "blend", "sqlite", "db", "parquet", "pkl", "pt", "onnx", "safetensors",
]);

export function classify(path: string, mode = "100644"): FileClass {
  const name = base(path);
  const e = ext(path);
  if (SCRIPT_EXT.has(e) || SCRIPT_NAMES.test(name) || mode === "100755") return "script";
  if (/(?:^|\/)\.git(?:hooks|-hooks)\//.test(path) || /(?:^|\/)\.husky\//.test(path)) return "script";
  if (CONFIG_EXT.has(e) || /^\.env(?:\..+)?$/.test(name)) return "config";
  if (INSTRUCTION_EXT.has(e) || INSTRUCTION_NAMES.test(name.replace(/\.md$/i, ""))) return "instruction";
  return "text";
}

/** Files an agent loads by itself: read first, because they matter most. */
const AGENT_PATH =
  /(?:^|\/)(?:\.claude|\.codex|\.cursor|\.gemini|\.agent|\.agents|\.windsurf|\.github|\.vscode|\.devcontainer|skills|commands|agents|hooks|prompts)\/|(?:^|\/)(?:AGENTS|CLAUDE|GEMINI)\.md$|(?:^|\/)\.(?:mcp\.json|cursorrules|windsurfrules|clinerules|envrc)$|(?:^|\/)package\.json$/i;

export function isReadable(entry: TreeEntry, maxBytes: number): boolean {
  if (entry.type !== "blob" || entry.mode === "120000") return false;
  if (entry.size !== null && entry.size > maxBytes) return false;
  if (UNREADABLE_EXT.has(ext(entry.path))) return false;
  const e = ext(entry.path);
  return (
    e === "" ||
    SCRIPT_EXT.has(e) ||
    CONFIG_EXT.has(e) ||
    INSTRUCTION_EXT.has(e) ||
    TEXT_EXT.has(e) ||
    SCRIPT_NAMES.test(base(entry.path)) ||
    INSTRUCTION_NAMES.test(base(entry.path))
  );
}

/** Orders files so the riskiest kinds are read first when the read budget runs out. */
export function readPriority(entry: TreeEntry): number {
  if (AGENT_PATH.test(entry.path)) return 0;
  const cls = classify(entry.path, entry.mode);
  return cls === "script" ? 1 : cls === "config" ? 2 : cls === "instruction" ? 3 : 4;
}

// ── Excerpts ────────────────────────────────────────────────────────────────────────

const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u180E]|[\u{E0000}-\u{E007F}]/gu;

/** One line, shortened around the match, with invisible characters shown as ⟨U+XXXX⟩. */
export function excerpt(line: string, index = 0, mask = false): string {
  let text = line;
  if (mask) {
    text = line.replace(/[A-Za-z0-9_\-+/=]{12,}/g, (token) => `${token.slice(0, 4)}…[hidden]`);
  }
  text = text.replace(INVISIBLE, (ch) => `⟨U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}⟩`);
  text = text.replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;
  const start = Math.max(0, Math.min(index - 40, text.length - 160));
  return `${start > 0 ? "…" : ""}${text.slice(start, start + 160)}…`;
}

// ── Pass 1: structure ───────────────────────────────────────────────────────────────

const COMPILED = /\.(?:exe|dll|so|dylib|bin|msi|scr|com|pif|jar|app|deb|rpm|apk|elf)$/i;
const OPAQUE = /\.(?:pyc|pyo|class|wasm|node|o|a|lib)$/i;
const ARCHIVE = /\.(?:zip|7z|rar|tar|tgz|gz|bz2|xz|zst|cab|iso|dmg)$/i;
const DOUBLE_EXT = /\.(?:pdf|docx?|xlsx?|pptx?|txt|md|jpe?g|png|gif|mp[34]|zip)\.(?:exe|scr|bat|cmd|com|pif|js|jse|vbs|vbe|wsf|ps1|lnk|hta)$/i;
const WINDOWS_LAUNCHERS = /\.(?:vbs|vbe|jse|wsf|wsh|hta|lnk|scf|url|reg|cpl|msc)$/i;
const NAME_TRICKS = /[\u202A-\u202E\u2066-\u2069\u200B-\u200F]/;

export function analyzeTree(entries: readonly TreeEntry[]): Finding[] {
  const findings: Finding[] = [];
  const add = (path: string, severity: Severity, ruleId: string, title: string, detail: string) =>
    findings.push({ ruleId, severity, category: "structure", title, detail, path, line: null, excerpt: null });

  for (const entry of entries) {
    const { path } = entry;
    if (entry.type === "commit" || entry.mode === "160000") {
      add(path, "info", "submodule", "Git submodule (not in the download)", "Points at another repository. GitHub's ZIP leaves it out, so it was not checked and will not be downloaded.");
      continue;
    }
    if (entry.type !== "blob") continue;
    if (NAME_TRICKS.test(path)) {
      add(path, "critical", "deceptive-name", "File name hides its real type", "The name contains invisible or right-to-left characters, a trick that makes a program look like a document.");
    }
    if (DOUBLE_EXT.test(path)) {
      add(path, "critical", "double-extension", "Program disguised as a document", "A double extension such as .pdf.exe makes a program look like a harmless file.");
    } else if (COMPILED.test(path)) {
      add(path, "high", "compiled-program", "Compiled program", "Machine code cannot be read or checked. Agent setups are text; a program here deserves a very good reason.");
    } else if (OPAQUE.test(path)) {
      add(path, "medium", "compiled-code", "Compiled code", "Bytecode or a native module that cannot be read like source.");
    } else if (WINDOWS_LAUNCHERS.test(path)) {
      add(path, "high", "windows-launcher", "Runs when double-clicked on Windows", "Script, shortcut or registry file that Windows executes or applies when opened.");
    }
    if (ARCHIVE.test(path)) {
      add(path, "medium", "nested-archive", "Archive inside the archive", "Heddle does not open archives inside the repository, so what this contains was not checked.");
    }
    if (entry.mode === "120000") {
      add(path, "medium", "symlink", "Symbolic link", "A link to another path. When extracted it can point outside the folder, for example at your home directory.");
    }
    if (/(?:^|\/)\.envrc$/.test(path)) {
      add(path, "medium", "direnv", "Runs when you enter the folder (direnv)", "If you use direnv, this file executes as soon as you cd into the folder.");
    }
    if (/(?:^|\/)\.(?:githooks|husky)\//.test(path)) {
      add(path, "medium", "git-hooks", "Git hooks", "Scripts that run on git commands once they are enabled. Read them before enabling.");
    }
  }
  return findings;
}

// ── Pass 2: content ─────────────────────────────────────────────────────────────────

const MAX_HITS_PER_RULE_PER_FILE = 3;

const UNICODE_TAGS = /[\u{E0000}-\u{E007F}]/u;
const BIDI = /[\u202A-\u202E\u2066-\u2069]/;
const ZERO_WIDTH = /[\u200B-\u200D\u2060-\u2064\u180E]|(?<!^)\uFEFF/;
const HIDDEN_COMMENT_WORDS = /\b(?:run|execute|curl|wget|install|ignore|disregard|send|upload|post|token|password|secret|delete|remove|download|always|never tell|do not tell|system)\b/i;

export function analyzeText(path: string, text: string, mode = "100644"): Finding[] {
  const cls = classify(path, mode);
  const findings: Finding[] = [];
  const lines = text.split(/\r?\n/);
  const hits = new Map<string, number>();

  const push = (finding: Finding) => {
    const count = hits.get(finding.ruleId) ?? 0;
    hits.set(finding.ruleId, count + 1);
    if (count < MAX_HITS_PER_RULE_PER_FILE) findings.push(finding);
  };

  lines.forEach((line, index) => {
    if (line.length === 0) return;
    // Very long lines are checked in a window, so one huge minified line cannot stall the scan.
    const subject = line.length > 20_000 ? line.slice(0, 20_000) : line;

    for (const rule of LINE_RULES) {
      const severity = rule.severity[cls];
      if (!severity) continue;
      if (rule.paths && !rule.paths.test(path)) continue;
      const match = rule.pattern.exec(subject);
      if (!match) continue;
      push({
        ruleId: rule.id,
        severity,
        category: rule.category,
        title: rule.title,
        detail: rule.detail,
        path,
        line: index + 1,
        excerpt: excerpt(subject, match.index, rule.mask),
      });
    }

    if (UNICODE_TAGS.test(subject)) {
      push({
        ruleId: "invisible-tag-text",
        severity: "critical",
        category: "injection",
        title: "Invisible text only an AI can read",
        detail:
          "Contains Unicode tag characters: they render as nothing for you but are read as normal text by language models — a known way to smuggle hidden instructions to an agent.",
        path,
        line: index + 1,
        excerpt: excerpt(subject),
      });
    }
    if (BIDI.test(subject)) {
      push({
        ruleId: "bidi-control",
        severity: cls === "text" ? "medium" : "high",
        category: "obfuscation",
        title: "Text direction override (Trojan Source)",
        detail: "Right-to-left control characters reorder how text is displayed, so what you read is not what runs or what the agent reads.",
        path,
        line: index + 1,
        excerpt: excerpt(subject),
      });
    }
    if (ZERO_WIDTH.test(subject)) {
      push({
        ruleId: "zero-width",
        severity: cls === "instruction" || cls === "script" ? "medium" : "low",
        category: "obfuscation",
        title: "Zero-width characters",
        detail: "Invisible characters inside the text. They can split words to dodge checks or hide content.",
        path,
        line: index + 1,
        excerpt: excerpt(subject),
      });
    }
  });

  // Markdown comments are invisible when rendered but fully visible to an agent.
  if (cls === "instruction") {
    for (const match of text.matchAll(/<!--([\s\S]*?)-->/g)) {
      const body = match[1] ?? "";
      if (!HIDDEN_COMMENT_WORDS.test(body)) continue;
      push({
        ruleId: "hidden-instructions",
        severity: "medium",
        category: "injection",
        title: "Instructions hidden in a comment",
        detail: "An HTML comment does not show when the Markdown is displayed, but an agent reads it. Read what it asks for.",
        path,
        line: text.slice(0, match.index).split("\n").length,
        excerpt: excerpt(body),
      });
    }
  }

  return findings;
}

// ── Pass 3: agent configuration ─────────────────────────────────────────────────────

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function parseJson(text: string): Json | undefined {
  try {
    return JSON.parse(text) as Json;
  } catch {
    // JSONC: drop line and block comments, then trailing commas, and try once more.
    try {
      const stripped = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1")
        .replace(/,(\s*[}\]])/g, "$1");
      return JSON.parse(stripped) as Json;
    } catch {
      return undefined;
    }
  }
}

const isObject = (value: Json | undefined): value is { [key: string]: Json } =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const asArray = (value: Json | undefined): Json[] => (Array.isArray(value) ? value : []);
const asText = (value: Json | undefined): string | null => (typeof value === "string" ? value : null);

const CLAUDE_SETTINGS = /(?:^|\/)\.claude\/settings(?:\.local)?\.json$|(?:^|\/)hooks\/hooks\.json$|(?:^|\/)\.claude-plugin\/plugin\.json$/;
const MCP_CONFIG = /(?:^|\/)\.mcp\.json$|(?:^|\/)(?:\.cursor|\.vscode|\.windsurf|\.gemini|\.roo|\.kiro)\/(?:mcp|settings|mcp_config)\.json$|(?:^|\/)(?:mcp|mcp_config|claude_desktop_config)\.json$/;
const PACKAGE_JSON = /(?:^|\/)package\.json$/;

/** Runners that fetch and execute a package from a registry. */
const PACKAGE_RUNNER = /^(?:npx|bunx|pnpx|uvx|pipx)$|^(?:pnpm|yarn|bun)\s+dlx$/;

function hookFindings(path: string, hooks: Json | undefined): Finding[] {
  const findings: Finding[] = [];
  if (!isObject(hooks)) return findings;
  for (const [event, groups] of Object.entries(hooks)) {
    for (const group of asArray(groups)) {
      const matcher = isObject(group) ? asText(group.matcher) : null;
      for (const hook of asArray(isObject(group) ? group.hooks : undefined)) {
        if (!isObject(hook)) continue;
        const command = asText(hook.command);
        if (!command) continue;
        findings.push({
          ruleId: "agent-hook",
          severity: "medium",
          category: "agent-config",
          title: `Runs a command automatically on ${event.slice(0, 40)}`,
          detail: `Claude Code runs this hook by itself${matcher ? ` whenever a tool matches “${matcher.slice(0, 60)}”` : ""}, without asking. Read the command and anything it calls.`,
          path,
          line: null,
          excerpt: excerpt(command),
        });
      }
    }
  }
  return findings;
}

function claudeSettingsFindings(path: string, data: { [key: string]: Json }): Finding[] {
  const findings = hookFindings(path, data.hooks);
  const add = (severity: Severity, ruleId: string, title: string, detail: string, text: string | null) =>
    findings.push({ ruleId, severity, category: "agent-config", title, detail, path, line: null, excerpt: text ? excerpt(text) : null });

  const permissions = isObject(data.permissions) ? data.permissions : null;
  for (const rule of asArray(permissions?.allow).map(asText).filter((v): v is string => v !== null)) {
    if (/^Bash(?:\(\s*\*?\s*(?::\s*\*)?\s*\))?$/.test(rule.trim())) {
      add("high", "allow-any-shell", "Lets the agent run any shell command without asking", "An unrestricted Bash permission means every command the agent decides to run goes through unchecked.", rule);
    } else if (/^Bash\(\s*(?:curl|wget|rm|sudo|sh|bash|python|node|npx|powershell|pwsh|iex)\b/i.test(rule)) {
      add("medium", "allow-risky-shell", "Pre-approves a risky shell command", "This command will run without a permission prompt.", rule);
    }
  }
  if (data.enableAllProjectMcpServers === true) {
    add("medium", "auto-enable-mcp", "Turns on every MCP server in the project automatically", "Servers defined in the repository start without you approving each one.", "enableAllProjectMcpServers: true");
  }
  const apiKeyHelper = asText(data.apiKeyHelper);
  if (apiKeyHelper) {
    add("medium", "api-key-helper", "Runs a command to produce your API key", "Claude Code executes this to get credentials. A malicious one can read or leak keys.", apiKeyHelper);
  }
  const statusLine = isObject(data.statusLine) ? asText(data.statusLine.command) : null;
  if (statusLine) {
    add("low", "status-line-command", "Runs a command to draw the status line", "Executed repeatedly while you work.", statusLine);
  }
  if (isObject(data.env)) {
    for (const [key, value] of Object.entries(data.env)) {
      const target = asText(value);
      if (/_BASE_URL$|_API_URL$|^HTTPS?_PROXY$/i.test(key) && target && !/^https:\/\/api\.(?:anthropic|openai)\.com\b/.test(target)) {
        add("high", "traffic-redirect", "Sends the agent's traffic through another server", "Pointing the API base URL or proxy elsewhere lets that server see your prompts, code and possibly your API key.", `${key}=${target}`);
      }
    }
  }
  return findings;
}

function mcpFindings(path: string, data: { [key: string]: Json }): Finding[] {
  const findings: Finding[] = [];
  const servers = isObject(data.mcpServers) ? data.mcpServers : isObject(data.servers) ? data.servers : isObject(data.mcp_servers) ? data.mcp_servers : null;
  if (!servers) return findings;
  for (const [name, server] of Object.entries(servers)) {
    if (!isObject(server)) continue;
    const label = name.slice(0, 60);
    const command = asText(server.command);
    const args = asArray(server.args).map(asText).filter((v): v is string => v !== null);
    const url = asText(server.url) ?? asText(server.serverUrl) ?? asText(server.httpUrl);
    if (command) {
      const full = [command, ...args].join(" ");
      findings.push({
        ruleId: "mcp-local-server",
        severity: "medium",
        category: "agent-config",
        title: `Starts an MCP server: ${label}`,
        detail: "This program runs on your machine whenever the agent starts, with your user's permissions, and the agent can call its tools.",
        path,
        line: null,
        excerpt: excerpt(full),
      });
      const runner = PACKAGE_RUNNER.test(command.trim()) || PACKAGE_RUNNER.test(`${command} ${args[0] ?? ""}`.trim());
      const pkg = args.find((arg) => !arg.startsWith("-") && arg !== "dlx");
      if (runner && pkg && !/@\d|==\d|@sha256:/.test(pkg)) {
        findings.push({
          ruleId: "mcp-unpinned-package",
          severity: "medium",
          category: "agent-config",
          title: `MCP server installs the latest version of ${pkg.slice(0, 60)}`,
          detail: "No version is pinned, so a different — possibly compromised — release can run each time. Pin a version you have reviewed.",
          path,
          line: null,
          excerpt: excerpt(full),
        });
      }
    }
    if (url) {
      let host = url;
      try {
        host = new URL(url).host;
      } catch {
        // Keep the raw value.
      }
      findings.push({
        ruleId: "mcp-remote-server",
        severity: "medium",
        category: "agent-config",
        title: `Connects the agent to a remote server: ${host.slice(0, 80)}`,
        detail: "What you and the agent send to this tool goes to that server, and its responses are read by the agent as trusted tool output.",
        path,
        line: null,
        excerpt: excerpt(url),
      });
    }
  }
  return findings;
}

function packageJsonFindings(path: string, data: { [key: string]: Json }): Finding[] {
  if (!isObject(data.scripts)) return [];
  return Object.entries(data.scripts)
    .filter(([name]) => /^(?:preinstall|install|postinstall|prepare|prepublish|preprepare|postprepare)$/.test(name))
    .map(([name, value]) => ({
      ruleId: "install-script",
      severity: "medium" as const,
      category: "execution" as const,
      title: `Runs “${name}” automatically on npm install`,
      detail: "npm executes this script during install, before you have used anything.",
      path,
      line: null,
      excerpt: excerpt(asText(value) ?? ""),
    }));
}

/** True for files whose structure pass 3 understands. */
export function isConfigFile(path: string): boolean {
  return CLAUDE_SETTINGS.test(path) || MCP_CONFIG.test(path) || PACKAGE_JSON.test(path);
}

export function analyzeConfig(path: string, text: string): Finding[] {
  const data = parseJson(text);
  if (!isObject(data)) return [];
  const findings: Finding[] = [];
  if (CLAUDE_SETTINGS.test(path)) findings.push(...claudeSettingsFindings(path, data));
  if (MCP_CONFIG.test(path) || CLAUDE_SETTINGS.test(path)) findings.push(...mcpFindings(path, data));
  if (PACKAGE_JSON.test(path)) findings.push(...packageJsonFindings(path, data));
  return findings;
}

// ── Weighing ────────────────────────────────────────────────────────────────────────

export const SEVERITY_ORDER: readonly Severity[] = ["critical", "high", "medium", "low", "info"];
const WEIGHT: Record<Severity, number> = { critical: 40, high: 18, medium: 6, low: 2, info: 0 };

export function bySeverity(a: Finding, b: Finding): number {
  return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || (a.path ?? "").localeCompare(b.path ?? "") || (a.line ?? 0) - (b.line ?? 0);
}

/**
 * The risk index: each distinct (rule, file) pair counts once at its severity's weight, so
 * one noisy file cannot dominate, capped at 100. It ranks; it is not a probability.
 */
export function riskIndex(findings: readonly Finding[]): number {
  const seen = new Map<string, number>();
  for (const finding of findings) {
    const key = `${finding.ruleId}\u0000${finding.path ?? ""}`;
    seen.set(key, Math.max(seen.get(key) ?? 0, WEIGHT[finding.severity]));
  }
  let total = 0;
  for (const weight of seen.values()) total += weight;
  return Math.min(100, total);
}

export function verdictFor(findings: readonly Finding[]): Verdict {
  if (findings.some((f) => f.severity === "critical")) return "danger";
  if (findings.some((f) => f.severity === "high")) return "caution";
  if (findings.some((f) => f.severity === "medium")) return "review";
  return "clear";
}
