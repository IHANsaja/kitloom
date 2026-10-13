# Docs Voice

Documentation rules for coding agents, so generated READMEs and guides are verified against
the code, written for the reader, and consistent from one page to the next.

## What is inside

| File | Purpose |
|---|---|
| `.claude/skills/write-docs/SKILL.md` | Claude Code skill: what to check before writing, style, structure, changelogs. |
| `.cursor/rules/docs.mdc` | Cursor rule with the same guidance, attached to `*.md` and `*.mdx` files. |
| `LICENSE` | MIT. |

## Install

Copy the folder for the agent you use into your repository root, merging with existing
folders:

- Claude Code: `.claude/skills/write-docs/`
- Cursor: `.cursor/rules/docs.mdc`

## Use

- **Claude Code** loads the skill when you ask it to document something or update a README.
- **Cursor** attaches the rule when the agent works on a Markdown file matched by the
  `globs` pattern.

## Compatibility

Declared by the author, not independently tested by Kitloom: Claude Code (project skills in
`.claude/skills/`) and Cursor (project rules in `.cursor/rules/`).

## Customising

Both files carry the same rules in two formats. If you change one, change the other. Add
your project's terminology, the tone you want, and any house rules for headings or
capitalisation.

## Safety

Markdown only. No scripts, hooks, or tool configuration.
