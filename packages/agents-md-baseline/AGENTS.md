# Project instructions

<!-- Replace every line in angle brackets. Delete sections that do not apply.
     Keep this file short: agents read it on every session. -->

## What this project is

<One or two sentences: what the software does and who uses it.>

## Commands

| Task | Command |
|---|---|
| Install | `<npm install>` |
| Run locally | `<npm run dev>` |
| Test | `<npm test>` |
| Lint / format | `<npm run lint>` |
| Type-check | `<npm run typecheck>` |

Run the test and lint commands before saying a change is finished. If a command fails,
report the failure with its output instead of working around it.

## Layout

- `<src/>` — <what lives here>
- `<tests/>` — <how tests are organised>
- `<docs/>` — <what is documented and for whom>

## Conventions

- Match the style of the file you are editing: naming, comment density, error handling.
- Prefer small, reviewable changes. Do not reformat code you are not otherwise changing.
- Do not add a dependency without saying why the existing ones are not enough.
- <Project-specific rule, for example "All database access goes through src/db/">

## Boundaries

- Never commit secrets, tokens, or `.env` files.
- Ask before: deleting files you did not create, changing public APIs, running migrations,
  force-pushing, or anything that touches production.
- Do not edit generated files: `<dist/, *.gen.ts>`.

## Definition of done

1. The change does what was asked, and nothing extra.
2. Tests cover the new behaviour and pass.
3. Lint and type-check pass.
4. Anything you could not verify is stated plainly.
