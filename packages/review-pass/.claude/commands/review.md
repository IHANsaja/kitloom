---
description: Review the current changes against the project review checklist
argument-hint: "[base branch or commit, default: main]"
---

Review the changes on this branch. Compare against `$ARGUMENTS` if given, otherwise against
`main`.

1. Run `git diff <base>...HEAD` and `git status` to see exactly what changed. Review only
   that diff. Do not review untouched code.
2. Read `docs/review-checklist.md` and apply every section to the diff.
3. For each problem, read enough surrounding code to be sure it is real before reporting it.
   Drop anything you cannot support with a specific line.

Report findings in this format, most severe first:

```
[severity] path/to/file.ext:line — one-sentence problem
  Why: what goes wrong, with a concrete input or sequence
  Fix: the smallest change that resolves it
```

Severity is one of `blocker` (wrong behaviour, data loss, security), `should-fix`
(likely bug or maintenance trap), or `nit` (style; at most three).

Rules:

- Do not edit any files. This command only reports.
- Do not praise the code or summarise what the diff does.
- If you find nothing, say "No findings" and list what you checked.
