# Review Pass

A repeatable code-review procedure for coding agents: one editable checklist, one fixed
report format, and a rule that the agent only reports and never edits.

## What is inside

| File | Purpose |
|---|---|
| `.claude/commands/review.md` | Claude Code slash command `/review [base]`. |
| `.cursor/rules/review.mdc` | Cursor rule the agent applies when you ask for a review. |
| `docs/review-checklist.md` | The checklist both of them read. Edit this to fit your project. |
| `LICENSE` | MIT. |

## Install

1. Copy `.claude/`, `.cursor/`, and `docs/review-checklist.md` into your repository root,
   merging with any folders that already exist. You can skip the folder for an agent you
   do not use.
2. Edit `docs/review-checklist.md`. Remove what does not apply and add your own rules.
3. Commit the files.

If you move the checklist, update the path inside both the command and the rule.

## Use

- **Claude Code:** run `/review` to compare against `main`, or `/review develop` to compare
  against another branch or commit.
- **Cursor:** ask the agent to review your changes. The rule is attached when relevant
  because of its description; it is not always on.

Findings come back most severe first:

```
[blocker] src/billing/invoice.ts:88 — total is computed before discounts are applied
  Why: an order with a 100% coupon is charged the full amount
  Fix: move applyDiscounts() above the total calculation
```

## Compatibility

Declared by the author, not independently tested by Kitloom: Claude Code (custom slash
commands in `.claude/commands/`) and Cursor (project rules in `.cursor/rules/`).

## Safety

Markdown only. The Claude Code command asks the agent to run `git diff` and `git status`,
which read your repository and change nothing. It contains no hooks and no scripts.
