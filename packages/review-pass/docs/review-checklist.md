# Review checklist

Edit this file to match your project. The agent applies every section to the diff.

## Correctness

- Does each changed branch handle empty, null, zero, and maximum-size input?
- Are errors handled where they occur, or deliberately propagated? Nothing swallowed silently.
- Off-by-one: loop bounds, slices, pagination, inclusive versus exclusive ranges.
- Concurrency: shared state, ordering assumptions, awaits missing or in a loop.
- Does the change keep working when run twice, or retried after a partial failure?

## Security

- Is input from users, files, the network, or the environment validated before use?
- No secrets, tokens, or personal data in code, logs, or error messages.
- Queries are parameterised. Shell commands do not interpolate untrusted strings.
- Paths built from input cannot escape their intended directory.
- New dependencies: are they necessary, maintained, and pinned?

## Tests

- Is the new behaviour covered by a test that would fail without the change?
- Do tests assert on behaviour rather than on implementation details?
- Were any tests deleted, skipped, or loosened? If so, is the reason stated?

## Maintainability

- Names say what a thing is. No misleading or stale comments.
- No dead code, debug output, or commented-out blocks left behind.
- The change follows the patterns already used in the files it touches.
- Public interfaces changed? Callers, documentation, and changelog are updated.

## Scope

- The diff does what the task asked and nothing unrelated.
- Formatting-only changes are not mixed with behaviour changes.
