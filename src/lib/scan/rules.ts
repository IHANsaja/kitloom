import type { Category, Severity } from "@/lib/scan/types";

/**
 * Heddle's line rules. Each rule is a pattern plus the severity it carries in each kind of
 * file: a `curl … | sh` inside a hook script runs on its own, while the same line in a
 * README is an instruction a person (or an agent) would have to follow.
 *
 * Patterns run per line, so they stay fast on large files and point at a line number.
 */

/** What a file is, which decides how much a match in it matters. */
export type FileClass = "script" | "config" | "instruction" | "text";

export interface LineRule {
  id: string;
  category: Category;
  title: string;
  detail: string;
  pattern: RegExp;
  /** Severity per file class; a missing class means the rule does not apply there. */
  severity: Partial<Record<FileClass, Severity>>;
  /** Only for files whose path matches. */
  paths?: RegExp;
  /** Show only a masked excerpt (for credentials). */
  mask?: boolean;
}

const everywhere = (severity: Severity): Record<FileClass, Severity> => ({
  script: severity,
  config: severity,
  instruction: severity,
  text: severity,
});

export const LINE_RULES: readonly LineRule[] = [
  // ── Execution ──────────────────────────────────────────────────────────────────
  {
    id: "remote-script-pipe",
    category: "execution",
    title: "Downloads a script and runs it immediately",
    detail:
      "Pipes something fetched from the internet straight into a shell or interpreter. What runs is decided by that server at run time, so nothing in this repository shows what it does.",
    pattern:
      /\b(?:curl|wget)\b[^\n|;]*\|\s*(?:sudo\s+)?(?:ba|z|da|k|fi)?sh\b|\b(?:curl|wget)\b[^\n|;]*\|\s*(?:sudo\s+)?(?:python[0-9.]*|node|perl|ruby|php)\b|\b(?:iwr|irm|invoke-webrequest|invoke-restmethod)\b[^\n]*\|\s*(?:iex|invoke-expression)\b|\b(?:iex|invoke-expression)\b\s*\(?\s*\(?\s*(?:new-object\s+(?:system\.)?net\.webclient|iwr|irm|invoke-webrequest|invoke-restmethod)|\.downloadstring\s*\(/i,
    severity: { script: "critical", config: "critical", instruction: "medium", text: "medium" },
  },
  {
    id: "reverse-shell",
    category: "execution",
    title: "Reverse-shell pattern",
    detail:
      "Opens a shell that is controlled from another machine over the network. There is no legitimate reason for an agent setup to do this.",
    pattern:
      /\/dev\/tcp\/\S+|\bnc(?:at)?\b[^\n]*\s-[a-z]*e\s|\b(?:ba)?sh\s+-i\s*(?:>&|<&|>\s*&)|\bmkfifo\b[^\n]*\bnc\b|socket\.socket\([^\n]*(?:dup2|pty\.spawn)/i,
    severity: everywhere("critical"),
  },
  {
    id: "encoded-execution",
    category: "obfuscation",
    title: "Decodes hidden code and runs it",
    detail:
      "Turns encoded text (base64, compressed or char-code data) back into code and executes it. This is the most common way to hide what a script really does.",
    pattern:
      /base64\s+(?:-d|--decode|-D)\b[^\n]*\|\s*(?:sudo\s+)?(?:ba|z)?sh\b|\[(?:system\.)?convert\]::frombase64string|\batob\s*\([^\n]*\b(?:eval|Function)\b|\b(?:eval|Function)\s*\([^\n]*\batob\s*\(|\b(?:exec|eval)\s*\(\s*(?:base64|codecs|zlib|marshal|bytes\.fromhex)\b|Buffer\.from\([^\n]*['"](?:base64|hex)['"]\)[^\n]*\b(?:eval|Function|execSync|exec)\b|\beval\s*\(\s*String\.fromCharCode/i,
    severity: { script: "high", config: "high", instruction: "high", text: "medium" },
  },
  {
    id: "powershell-evasion",
    category: "execution",
    title: "PowerShell launched hidden or with policy bypass",
    detail:
      "Runs PowerShell with an encoded command, a hidden window, or with the execution policy switched off — techniques used to avoid being noticed.",
    pattern:
      /\s-(?:e|ec|enc|encodedcommand)\s+[A-Za-z0-9+/=]{24,}|-w(?:indowstyle)?\s+hidden\b|-(?:ep|executionpolicy)\s+(?:bypass|unrestricted)\b/i,
    severity: { script: "high", config: "high", instruction: "high", text: "medium" },
  },
  {
    id: "download-and-run",
    category: "execution",
    title: "Downloads a program, then runs it",
    detail: "Saves a file from the internet and executes it. Check exactly what is fetched and from where.",
    pattern:
      /\b(?:curl|wget)\b[^\n]*\s(?:-o|-O|--output)\s*\S+[^\n]*(?:&&|;)\s*(?:sudo\s+)?(?:chmod\s+\+x|\.\/|(?:ba)?sh\s)|start-process\b[^\n]*https?:\/\/|\bmsiexec\b[^\n]*https?:\/\//i,
    severity: { script: "high", config: "high", instruction: "medium", text: "low" },
  },
  {
    id: "dynamic-code",
    category: "execution",
    title: "Builds and runs code at run time",
    detail: "Uses eval or new Function, so the code that runs is assembled while the program is running.",
    pattern: /(?<![\w.])eval\s*\(|\bnew\s+Function\s*\(/,
    severity: { script: "medium" },
  },
  {
    id: "runs-shell",
    category: "execution",
    title: "Runs shell commands from code",
    detail: "Starts other programs or shell commands. Common in tooling, but read what it runs.",
    pattern:
      /\bchild_process\b|\b(?:execSync|spawnSync)\s*\(|\bos\.system\s*\(|\bsubprocess\.(?:run|call|Popen|check_output|check_call)\b[^\n]*shell\s*=\s*True|Runtime\.getRuntime\(\)\.exec/,
    severity: { script: "low" },
  },

  // ── Destructive ────────────────────────────────────────────────────────────────
  {
    id: "destructive-command",
    category: "destructive",
    title: "Command that can wipe files or disks",
    detail: "Deletes a home folder, a drive root or a disk, or formats storage. Never run this without understanding why it is there.",
    pattern:
      /\brm\s+(?:-[a-z]+\s+)*-[a-z]*(?:rf|fr)[a-z]*\s+(?:--no-preserve-root\s+)?(?:\/\*?|~\/?\*?|\$HOME\/?\*?|"\$HOME"\/?\*?)(?=\s|$|["';&|])|\bformat\s+[a-z]:|\bdel\s+(?:\/[a-z]\s+)*\/s\b[^\n]*[a-z]:\\(?:\s|$|\*)|remove-item\b[^\n]*-recurse\b[^\n]*(?:[a-z]:\\\*?(?:\s|$)|\$env:userprofile\\?\*?(?:\s|$)|~\\?\*?(?:\s|$))|\bmkfs(?:\.\w+)?\s+\/dev\/|\bdd\s+[^\n]*of=\/dev\/(?:sd|hd|nvme|disk)/i,
    severity: everywhere("high"),
  },
  {
    id: "history-rewrite",
    category: "destructive",
    title: "Rewrites or discards git history",
    detail: "Force-pushes, hard-resets or cleans the working tree. An agent following this can destroy uncommitted work.",
    pattern: /\bgit\s+push\s+[^\n]*(?:--force\b|-f\b)|\bgit\s+reset\s+--hard\b|\bgit\s+clean\s+-[a-z]*f[a-z]*d|\bgit\s+clean\s+-[a-z]*d[a-z]*f/i,
    severity: { script: "medium", config: "medium", instruction: "low" },
  },

  // ── Persistence and system changes ─────────────────────────────────────────────
  {
    id: "persistence",
    category: "persistence",
    title: "Makes itself run again later",
    detail:
      "Adds a scheduled task, a startup entry, a shell-profile line or an SSH key, so something keeps running or keeps access after you close the project.",
    pattern:
      /\bcrontab\b|>>?\s*(?:~|\$HOME)\/\.(?:bashrc|zshrc|profile|bash_profile|zprofile)\b|\\currentversion\\run(?:once)?\b|\bschtasks\b[^\n]*\/create|\b(?:new|register)-scheduledtask\b|\blaunchctl\s+(?:load|bootstrap)\b|\/library\/launch(?:agents|daemons)\/|\bsystemctl\s+(?:--user\s+)?enable\b|authorized_keys/i,
    severity: { script: "high", config: "high", instruction: "medium", text: "low" },
  },
  {
    id: "security-disable",
    category: "persistence",
    title: "Turns off operating-system protection",
    detail:
      "Disables or adds exclusions to antivirus, the firewall, SELinux, Gatekeeper or SIP, or strips macOS quarantine flags. Malware does this before it acts.",
    pattern:
      /set-mppreference\b[^\n]*-disable|add-mppreference\b[^\n]*-exclusion|\bsetenforce\s+0\b|\bufw\s+disable\b|netsh\s+advfirewall\s+set\b[^\n]*\boff\b|\bcsrutil\s+disable\b|\bspctl\s+--master-disable\b|xattr\s+-[a-z]*d[a-z]*\s+com\.apple\.quarantine/i,
    severity: { script: "critical", config: "critical", instruction: "high", text: "medium" },
  },
  {
    id: "elevated",
    category: "persistence",
    title: "Asks for administrator rights or opens permissions wide",
    detail: "Uses sudo, runs as administrator, or makes files writable by everyone.",
    pattern: /(?:^|[\s;&|(])sudo\s+\S|\bchmod\s+(?:-R\s+)?(?:0?777|[ugoa]*\+s)\b|-verb\s+runas\b|\brunas\s+\/user/i,
    severity: { script: "low", config: "low" },
  },

  // ── Exfiltration ───────────────────────────────────────────────────────────────
  {
    id: "credential-access",
    category: "exfiltration",
    title: "Touches credentials or private keys",
    detail:
      "Refers to SSH keys, cloud or registry credentials, browser password stores or the system keychain. A setup has no reason to read these.",
    pattern:
      /(?:~|\$HOME|%USERPROFILE%|\$env:USERPROFILE)[\\/]\.ssh\b|\bid_(?:rsa|ed25519|ecdsa|dsa)\b(?!\.pub)|\.aws[\\/]credentials|\.git-credentials|[\\/]\.netrc\b|\.docker[\\/]config\.json|\.kube[\\/]config|\.config[\\/]gh[\\/]hosts|\blogin data\b|\bcookies\.sqlite\b|\bkey4\.db\b|\bsecurity\s+(?:find|dump)-(?:generic|internet)-password|\bsecurity\s+dump-keychain|\/etc\/shadow\b|\bwallet\.dat\b|\bcmdkey\s+\/list\b|\bvaultcmd\b/i,
    severity: { script: "high", config: "high", instruction: "medium", text: "low" },
  },
  {
    id: "exfil-endpoint",
    category: "exfiltration",
    title: "Sends data to a drop-box style service",
    detail:
      "Names a service commonly used to collect stolen data or receive callbacks (request catchers, chat webhooks, paste sites, tunnels).",
    pattern:
      /webhook\.site|requestbin|pipedream\.net|\bngrok(?:-free)?\.(?:io|app|dev)|discord(?:app)?\.com\/api\/webhooks|api\.telegram\.org\/bot|hooks\.slack\.com\/services|pastebin\.com\/(?:raw|api)|\btransfer\.sh\b|\b0x0\.st\b|\btermbin\.com\b|interact\.sh|\boast\.(?:fun|me|pro|live|site|online)\b|burpcollaborator\.net|canarytokens\.com|\btrycloudflare\.com\b/i,
    severity: { script: "high", config: "high", instruction: "high", text: "medium" },
  },
  {
    id: "raw-ip-url",
    category: "exfiltration",
    title: "Connects to a bare IP address",
    detail: "Uses a numeric internet address instead of a domain name, which hides who runs the server.",
    pattern:
      /\b(?:https?|wss?|ftp|tcp):\/\/(?!(?:127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|169\.254\.))(?:\d{1,3}\.){3}\d{1,3}\b/i,
    severity: { script: "medium", config: "medium", instruction: "medium", text: "low" },
  },
  {
    id: "environment-dump",
    category: "exfiltration",
    title: "Collects all environment variables",
    detail: "Environment variables often hold API keys and tokens. Dumping all of them, especially near a network call, is how keys get stolen.",
    pattern:
      /\bprintenv\b\s*(?:$|[|>])|\benv\s*\|\s*(?:curl|nc|base64|xxd)|get-childitem\s+env:|\bgci\s+env:|json\.stringify\(\s*process\.env\s*\)|\bdict\(\s*os\.environ\s*\)|\bos\.environ\.copy\(\)[^\n]*(?:post|send|request)/i,
    severity: { script: "medium", config: "medium", instruction: "medium" },
  },
  {
    id: "file-upload",
    category: "exfiltration",
    title: "Uploads a local file",
    detail: "Sends the contents of a file on your machine to a server.",
    pattern: /\bcurl\b[^\n]*(?:\s-d\s*@|\s--data(?:-binary|-raw)?\s*@|\s-F\s*['"]?[\w-]+=@|\s(?:-T|--upload-file)\s)/i,
    severity: { script: "medium", config: "medium", instruction: "medium" },
  },

  // ── Prompt injection ───────────────────────────────────────────────────────────
  {
    id: "injection-override",
    category: "injection",
    title: "Tells the agent to ignore its instructions",
    detail:
      "Classic prompt injection: text that asks the agent to drop the rules it was given, so it will follow whatever comes next instead.",
    pattern:
      /\b(?:ignore|disregard|forget|override|bypass)\s+(?:all\s+|any\s+|every\s+)?(?:of\s+)?(?:the\s+|your\s+|its\s+)?(?:previous|prior|above|earlier|preceding|original|system|safety|other)\s+(?:instructions?|prompts?|rules|guidelines|directives|messages)/i,
    severity: { instruction: "high", config: "high", text: "medium", script: "medium" },
  },
  {
    id: "injection-concealment",
    category: "injection",
    title: "Tells the agent to hide what it does",
    detail:
      "Asks the agent to act without telling you, or to keep something secret from you. Legitimate setups never need this.",
    pattern:
      /\b(?:do\s+not|don't|dont|never)\s+(?:tell|inform|mention(?:\s+this)?\s+to|reveal(?:\s+this)?\s+to|show|notify|alert|ask)\s+(?:this\s+to\s+)?(?:the\s+)?user\b|\bwithout\s+(?:asking|telling|informing|notifying|alerting|the\s+knowledge\s+of)\s+(?:the\s+)?user\b|\b(?:silently|secretly|covertly|quietly)\s+(?:run|execute|send|upload|post|delete|install|modify|add|copy|exfiltrate)/i,
    severity: { instruction: "high", config: "high", text: "medium", script: "medium" },
  },
  {
    id: "injection-role",
    category: "injection",
    title: "Tries to replace the agent's identity or system prompt",
    detail: "Fake system messages or \"you are now…\" jailbreak phrasing aimed at the agent rather than at you.",
    pattern:
      /\byou\s+are\s+now\s+(?:in\s+)?(?:developer|dan|jailbreak|unrestricted|unfiltered|god)\b|\bnew\s+system\s+prompt\b|<\/?(?:system|system_prompt|im_start)>|\[\/?(?:INST|SYSTEM)\]|<\|im_start\|>/i,
    severity: { instruction: "medium", config: "medium", text: "low" },
  },
  {
    id: "auto-approve",
    category: "agent-config",
    title: "Switches off the agent's permission prompts",
    detail:
      "Makes the agent run commands and edit files without asking you first. Anything in this setup — or any text the agent reads later — can then act on your machine unchecked.",
    pattern:
      /--dangerously-skip-permissions|--yolo\b|"?defaultMode"?\s*[:=]\s*"?bypassPermissions|\bapproval_policy\s*=\s*"never"|\bsandbox_mode\s*=\s*"danger-full-access"|--full-auto\b|"(?:autoAccept|yolo|yoloMode)"\s*:\s*true|\b(?:always|automatically)\s+(?:approve|accept|allow)\s+(?:all\s+|every\s+)?(?:commands|tool\s+calls|tools|permissions)/i,
    severity: { config: "high", script: "high", instruction: "high", text: "medium" },
  },
  {
    id: "folder-open-task",
    category: "agent-config",
    title: "Runs a task as soon as the folder is opened",
    detail: "VS Code and Cursor run this task automatically when the project is opened, before you read anything.",
    pattern: /"runOn"\s*:\s*"folderOpen"/,
    severity: { config: "high" },
    paths: /(?:^|\/)\.vscode\/tasks\.json$/,
  },
  {
    id: "devcontainer-host-command",
    category: "agent-config",
    title: "Runs a command on your computer when the dev container starts",
    detail: "initializeCommand runs on the host machine, outside the container, when the project is opened in a dev container.",
    pattern: /"initializeCommand"\s*:/,
    severity: { config: "high" },
    paths: /devcontainer(?:\.json|\/[^/]*\.json)$/,
  },

  // ── Obfuscation ────────────────────────────────────────────────────────────────
  {
    id: "long-encoded-blob",
    category: "obfuscation",
    title: "Large block of encoded data",
    detail: "A long base64-style string. It may be an image or a key, or it may be hidden code. Decode it before trusting it.",
    pattern: /[A-Za-z0-9+/]{400,}={0,2}/,
    severity: { script: "medium", config: "medium", instruction: "medium", text: "low" },
  },
  {
    id: "escaped-code",
    category: "obfuscation",
    title: "Long run of escaped characters",
    detail: "Text written as \\x41 or \\u0041 escapes, or as char codes, so it cannot be read directly.",
    pattern: /(?:\\x[0-9a-fA-F]{2}){24,}|(?:\\u[0-9a-fA-F]{4}){16,}|String\.fromCharCode\s*\(\s*\d+(?:\s*,\s*\d+){15,}|(?:chr\(\d+\)\s*\+\s*){10,}/,
    severity: { script: "medium", config: "medium", instruction: "medium", text: "low" },
  },

  // ── Secrets ────────────────────────────────────────────────────────────────────
  {
    id: "committed-secret",
    category: "secrets",
    title: "A credential appears to be committed",
    detail:
      "Looks like a real access key or private key. Do not use it: it belongs to someone else and may be revoked or monitored. Its presence also says something about how carefully the repository is kept.",
    pattern:
      /\bAKIA[0-9A-Z]{16}\b|\bghp_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b|\bsk-ant-[A-Za-z0-9_-]{24,}|\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}|\bxox[abprs]-[A-Za-z0-9-]{10,}|\bAIza[0-9A-Za-z_-]{35}\b|\bnpm_[A-Za-z0-9]{36}\b|-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP |ENCRYPTED )?PRIVATE KEY-----/,
    severity: everywhere("medium"),
    mask: true,
  },
];
