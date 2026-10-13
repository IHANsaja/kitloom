---
name: write-docs
description: Write or revise project documentation — READMEs, how-to guides, reference pages, changelogs. Use when asked to document a feature, update a README, or explain how to use something.
---

# Writing documentation

## Before writing

1. Identify the reader and what they are trying to do. Write for someone who has not seen
   this code and arrived from a search.
2. Verify every claim against the code. Run each command you document. Never describe
   behaviour you have not confirmed.
3. Pick one type of document and stay in it:
   - **How-to** — steps to achieve a goal. Numbered, imperative, one action per step.
   - **Reference** — exact facts: options, types, defaults. Complete and terse.
   - **Explanation** — why it works this way. Prose, with the trade-offs.

## Style

- Lead with what the reader needs most. Put the answer before the background.
- Use the second person and the present tense: "Run the command", not "The user should
  run the command".
- One idea per sentence. Cut "simply", "just", "easily", and "obviously".
- Use the exact names that appear in the code and the interface. Do not rename things.
- Put code, commands, file paths, and option names in backticks.
- Every code block states its language and can be copied and run as written.
- Show the expected output after a command when it helps the reader confirm success.

## Structure

- A README answers, in order: what it is, how to install it, the smallest working example,
  where to go next.
- Headings describe content ("Configure the database"), not categories ("Miscellaneous").
- Use a table for options and a numbered list for steps. Do not use a list for prose.

## Changelogs

Group entries under Added, Changed, Fixed, Removed. Write each entry for a user of the
project, not for its developers: say what changed for them and whether they must act.

## Before finishing

- Re-run every command in the document.
- Check that links resolve.
- Remove anything that restates the code without adding information.
