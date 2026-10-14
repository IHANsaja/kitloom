# Kit spec — the neutral source of a Kitloom setup

A Kitloom setup ("kit") is written once, in this neutral form, and `weave.mjs` generates
the files every coding agent expects (Claude Code, Codex, Cursor, Antigravity, Gemini CLI,
GitHub Copilot, Windsurf/Devin, opencode, Aider). Do not write agent-specific files by hand.

## Folder

```
discovery/kits/specs/<slug>/
  kit.json            the manifest (below)
  AGENTS.md           the instructions every agent reads (Markdown, no frontmatter)
  rules/<name>.md     scoped rules (plain Markdown body, no frontmatter)
  commands/<name>.md  commands the user invokes by name (plain Markdown body)
  agents/<name>.md    sub-agents (plain Markdown body = the sub-agent's prompt)
```

## kit.json

```json
{
  "slug": "nextjs-supabase-kit",
  "name": "Next.js + Supabase Kit",
  "description": "One or two sentences, 20–280 characters, saying what the setup is for.",
  "categories": ["development-review", "skills-workflows"],
  "tags": ["nextjs", "supabase", "typescript"],
  "skills": [
    { "id": "owner/repo#path/to/skill-dir", "why": "one line: when the agent should use it" }
  ],
  "rules": [
    { "name": "api-routes", "description": "When this applies, one sentence.", "globs": ["app/api/**/*.ts"], "alwaysApply": false }
  ],
  "commands": [
    { "name": "ship-check", "description": "What it does when invoked, one sentence." }
  ],
  "agents": [
    { "name": "reviewer", "description": "When to delegate to it, one sentence.", "tools": ["Read", "Grep", "Glob"] }
  ],
  "mcp": []
}
```

Constraints (the database and the agents enforce these — breaking one fails the build):

- `slug`: lowercase kebab-case, 3–64 characters, ending in `-kit`. It is also the GitHub repository name.
- `name`: 2–80 characters. `description`: 20–280 characters, plain text, no emoji.
- `categories`: 1–3 of `skills-workflows`, `development-review`, `testing-debugging`, `documentation`, `productivity`.
- `tags`: up to 8, each lowercase `[a-z0-9][a-z0-9.+-]{0,31}`.
- `skills`: 5–12 entries. `id` must be copied exactly from the first column of the shortlist.
  Prefer high-star, `heddle=clear` skills; avoid near-duplicates; avoid skills that need
  paid services, accounts, or API keys unless the theme is about that service.
- `rules`: 1–4. `name` lowercase kebab-case. Either `alwaysApply: true`, or `globs`.
  Each needs `rules/<name>.md`.
- `commands`: 1–4. `name` lowercase kebab-case, at most 40 characters. Each needs
  `commands/<name>.md`, written as instructions to the agent ("When invoked, …").
- `agents`: 0–3. `name` lowercase kebab-case. Each needs `agents/<name>.md`. `tools` is
  optional (Claude tool names: Read, Grep, Glob, Edit, Write, Bash, WebFetch).
- `mcp`: leave empty (`[]`) for now.

## Writing AGENTS.md

- 3–8 KB. Practical, specific to the stack or job. No filler, no marketing.
- Start with a one-paragraph purpose, then sections such as: Working agreement, Stack
  conventions, Testing, Before you finish. Use imperative, checkable rules.
- Add a "Skills in this kit" section: one line per skill, `name` — when to use it.
- Add "Commands" and "Sub-agents" sections listing what the kit provides.
- Never: tell the agent to skip permission prompts, run remote scripts (`curl | sh`), install
  global packages, read credentials, push or deploy without asking, or hide anything from
  the user. Kitloom scans every kit before download and these patterns are flagged.
- Do not reference files that the kit does not contain.

## Hooks

Kits have no hooks. Hooks run commands automatically, and a starter kit should be safe to
copy into any project without running anything.
