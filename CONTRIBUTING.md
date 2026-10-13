# Contributing to Kitloom

There are two ways to contribute: list a setup, or improve the site.

## Licence terms for contributions

Kitloom's own code is proprietary (see `LICENSE`). By opening a pull request you keep
ownership of what you submit and grant Kitloom the right to use it as part of the site,
as set out in section 5 of `LICENSE`. A setup you list stays under the licence you chose
for it.

## List a setup

You host the package; Kitloom lists it. Nothing is uploaded to this repository.

1. **Prepare the package.** Lay the files out the way a project expects them
   (`AGENTS.md`, `.claude/skills/…`, `.cursor/rules/…`). Replace machine-specific paths and
   personal details with placeholders.
2. **Add a `README.md`.** What it does, what each file is for, how to install and customise
   it. If anything runs commands (hooks, scripts, MCP servers), say exactly what and why.
3. **Identify the supported agents.** Only the ones the setup is written for.
4. **Choose a licence** and include a `LICENSE` file.
5. **Remove credentials and secrets.** Check MCP configuration and settings files twice.
6. **Package as a ZIP** with one top-level folder, named `<slug>-<version>.zip`.
7. **Validate.** Extract into an empty folder and confirm the contents. Compute the
   checksum and size:

   ```bash
   shasum -a 256 your-setup-1.0.0.zip
   ```

   ```powershell
   (Get-FileHash your-setup-1.0.0.zip -Algorithm SHA256).Hash.ToLower()
   ```

8. **Publish a release** in your own public GitHub repository with the ZIP attached.
9. **Open a pull request** here that appends one record to `src/data/setups.json`. The
   template is on the site's `/publish` page and in `src/lib/publishing.ts`.

### Record rules

- `id` and `slug`: identical, unique, lowercase kebab-case.
- `origin`: `"community"`.
- `agents[].id` and `categories[]`: ids from `src/lib/catalog/taxonomy.ts`.
- `agents[].compatibility`: `"declared"`, or `"tested"` only if you ran it with that agent.
- `package.downloadUrl`:
  `https://github.com/<owner>/<repo>/releases/download/<tag>/<file>.zip`. No other host.
- `package.sha256`: 64 lowercase hex characters of the exact release asset.
- `manifest[].path`: relative to the top-level folder; no leading `/`, no `..`.
- `downloads`: `null`. `featured`: `false`.
- Use `null` for anything you cannot provide. Do not guess. Unknown fields are rejected.

Run `npm test` before pushing. It validates the whole catalog and prints each problem with
the record it belongs to.

### Review

A maintainer downloads the ZIP, checks that it matches the checksum, manifest, and
description, reads every file, and looks for secrets and unexplained commands. Kitloom does
not run automated scanning and never executes package contents. A listing is not an
endorsement, and compatibility remains the creator's declaration.

### Updating or removing a listing

Publish a new release, then open a pull request changing `version`, `package`, `manifest`,
`readme`, `releaseNotes`, and `updatedAt`. To remove a listing, open a pull request deleting
the record.

## Improve the site

Read `CLAUDE.md` (engineering rules) and `design.md` (visual rules) first.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run check
```

`npm run check` runs lint, type-check, unit tests, and the production build. All four must
pass.

### First-party starter kits

Kits under `packages/` are zipped at build time. After changing a kit's files, bump its
`version` in the catalog and run:

```bash
npm run packages:sync
```

That writes the real size, SHA-256, manifest, and README into the catalog. The build fails
if the catalog and the built ZIP ever disagree.

## Reporting a problem with a listing

If a listed package contains secrets, malware, or someone else's work without permission,
open an issue with the setup's slug and what you found. Do not paste secrets into the issue.
