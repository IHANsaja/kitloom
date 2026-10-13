---
name: debug-loop
description: Systematic debugging procedure. Use when a test fails, a bug is reported, or behaviour is wrong and the cause is not yet known. Reproduce first, form one hypothesis at a time, and prove the fix with a failing-then-passing test.
---

# Debug loop

Do not change code until step 3. Guess-and-patch hides bugs instead of fixing them.

## 1. Reproduce

- Get the exact failure: the command, the input, the full error output.
- Run it yourself and confirm you see the same failure. If you cannot reproduce it, say so
  and stop to ask for more detail. Do not fix a bug you have not seen.
- Shrink the reproduction to the smallest command or test that still fails.

## 2. Locate

- Read the error and the stack trace completely before reading any code.
- State what you expected and what happened instead, in one sentence each.
- Find the last point where the state was correct and the first point where it was wrong.
  The defect is between them. Add temporary logging or use a debugger to narrow that gap.
- If the behaviour used to work, find the change that broke it. See
  `references/bisecting.md`.

## 3. Hypothesise, one at a time

- Write down one specific, falsifiable cause: "X is null here because Y returns early
  when Z".
- Design a check that would prove it wrong. Run the check.
- If the hypothesis is wrong, discard it completely and go back to step 2. Do not stack a
  second guess on top of an unproven first one.

## 4. Fix the cause

- Write a test that fails because of the bug. Watch it fail for the right reason.
- Make the smallest change that fixes the cause, not the symptom. Do not add a null check
  around a value that should never have been null without explaining why it was.
- Watch the test pass. Run the rest of the suite.

## 5. Clean up and report

- Remove every temporary log line and debugging aid you added.
- Report: the root cause in one or two sentences, the fix, the test that now covers it, and
  anything you could not verify.

## Stop conditions

Stop and ask the person you are working with when: you cannot reproduce the failure, three
hypotheses in a row were wrong, the fix would change a public interface, or the cause is
outside this repository.
