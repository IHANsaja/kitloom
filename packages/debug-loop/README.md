# Debug Loop

A Claude Code skill that makes the agent debug the slow, correct way: reproduce the failure,
narrow it down, test one hypothesis at a time, and prove the fix with a test that fails
first.

## What is inside

| File | Purpose |
|---|---|
| `.claude/skills/debug-loop/SKILL.md` | The five-step procedure and the conditions for stopping to ask. |
| `.claude/skills/debug-loop/references/bisecting.md` | How to find the commit that introduced a regression with `git bisect`. |
| `LICENSE` | MIT. |

## Install

Copy the `.claude/skills/debug-loop/` folder into your repository so the path is
`.claude/skills/debug-loop/SKILL.md`. To make it available in every project instead, copy
it to `~/.claude/skills/debug-loop/`.

## Use

Claude Code loads the skill on its own when a task matches the description: a failing test,
a bug report, or unexplained behaviour. You can also ask for it by name, for example
"use the debug-loop skill on this failing test".

## Compatibility

Declared by the author for Claude Code (project skills in `.claude/skills/`). Not
independently tested by Kitloom. The procedure in `SKILL.md` is plain Markdown, so you can
paste it into another agent's instruction file, but that use is not declared here.

## Customising

Edit the stop conditions at the bottom of `SKILL.md` to match how much autonomy you want
the agent to have. Add your project's test and debugger commands to step 1.

## Safety

Markdown only. The reference file describes `git bisect`, which checks out other commits in
your working tree; the skill tells the agent to commit or stash first. There are no hooks
and no scripts.
