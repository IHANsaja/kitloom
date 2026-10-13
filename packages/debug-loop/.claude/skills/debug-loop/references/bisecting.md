# Finding the change that broke it

Use this when something worked before and does not now.

## With git bisect

You need a commit where the behaviour was correct and one where it is broken.

```bash
git bisect start
git bisect bad                 # the current commit is broken
git bisect good <commit>       # a commit known to work
```

Git checks out a commit halfway between. Run the reproduction, then mark the result:

```bash
git bisect good    # or: git bisect bad
```

Repeat until git names the first bad commit. Then return to where you started:

```bash
git bisect reset
```

If the reproduction is a single command that exits non-zero on failure, let git drive:

```bash
git bisect run <command>
```

## Before you bisect

- Commit or stash local changes first. Bisecting checks out other commits.
- Make sure the reproduction is reliable. A flaky check sends bisect to the wrong commit.
- If a commit does not build, skip it with `git bisect skip`.

## After you find the commit

Read its diff. The cause is usually visible in a few lines. The offending commit tells you
*where* to look; you still need to understand *why* before fixing it.
