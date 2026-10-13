# AGENTS.md Baseline

One instruction file that several coding agents can share, instead of a separate copy per
tool that slowly drifts apart.

## What is inside

| File | Purpose |
|---|---|
| `AGENTS.md` | A fill-in-the-blanks template: project summary, commands, layout, conventions, boundaries, definition of done. |
| `CLAUDE.md` | A one-line file that imports `AGENTS.md`, so Claude Code reads the same instructions. |
| `LICENSE` | MIT. |

## Install

1. Copy `AGENTS.md` and `CLAUDE.md` into the root of your repository.
2. Open `AGENTS.md` and replace every line in `<angle brackets>` with facts about your
   project. Delete sections you do not need.
3. Commit both files.

If you already have a `CLAUDE.md`, do not overwrite it. Add the line `@AGENTS.md` at the top
of your existing file instead.

## Compatibility

Declared by the author, not independently tested by Kitloom:

- **Codex** reads `AGENTS.md` from the repository root.
- **Cursor** reads `AGENTS.md` from the repository root.
- **Claude Code** reads `CLAUDE.md`, which imports `AGENTS.md` through the `@` import syntax.

Agent behaviour changes between versions. Check your agent's documentation if the file does
not seem to be picked up.

## Customising

Shorter is better. Agents load this file every session, so each line costs context. Keep
commands exact, keep rules specific to this project, and move long reference material into
separate documents that you link to.

## Safety

This kit contains Markdown only. It does not include scripts, hooks, or tool configuration.
