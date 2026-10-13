# Contributing to Kitloom

There are two ways to contribute: list a setup, or improve the site.

## Licence terms for contributions

Kitloom's own code is proprietary (see `LICENSE`). By opening a pull request you keep
ownership of what you submit and grant Kitloom the right to use it as part of the site,
as set out in section 5 of `LICENSE`. A setup you list stays under the licence you chose
for it.

## List a setup

You do this on the site, not in this repository.

1. **Put the setup in a public GitHub repository.** Visitors download the whole repository
   as a ZIP, so a dedicated repository containing just the setup works best. Lay the files
   out the way a project expects them (`AGENTS.md`, `.claude/skills/…`, `.cursor/rules/…`).
2. **Add a `README.md`.** What it does, what each file is for, how to install and customise
   it. If anything runs commands (hooks, scripts, MCP servers), say exactly what and why.
3. **Add a `LICENSE` file.** Without one, others have no right to reuse your work.
4. **Remove credentials and secrets.** Check MCP configuration and settings files twice.
   Replace machine-specific paths and personal details with placeholders.
5. **Sign in** at `/signin`.
6. **Publish** at `/publish`: paste the repository link, choose "Read from GitHub", and
   fill in the description, the agents it is written for, and the categories.

The listing is public immediately. Kitloom stores your description plus a snapshot of the
README and file list; the download is always the current state of your repository.

### What to know

- Compatibility is shown as "declared by the creator". Tick only agents the setup targets.
- If you built on other people's repositories, credit them under "Built from" (up to 8
  GitHub links). They appear on your page as links; they are not included in the download.
  Crediting a repository does not replace following its licence.
- There is no checksum for a community setup, because the ZIP follows your repository.
- Edit or delete a listing from `/account`. Editing re-reads the README and file list.
- The URL name cannot be changed after publishing.
- An account can list up to 25 setups.

### Moderation

Listings are not reviewed before they appear. Maintainers hide listings that contain
secrets, malware, or someone else's work without permission. A listing is never an
endorsement.

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

### Database changes

Every change to tables or policies is a migration in `supabase/migrations/` with a matching
`.down.sql`. The browser talks to the database directly, so policies are the security
boundary: run `supabase/tests/rls.sql` after any change and include its output in the pull
request. If you add an agent or category, change `src/lib/catalog/taxonomy.ts` and the
check constraints on `public.setups` together.

### First-party starter kits

Kits under `packages/` are zipped at build time. After changing a kit's files, bump its
`version` in `src/data/setups.json` and run:

```bash
npm run packages:sync
```

That writes the real size, SHA-256, manifest, and README into the catalog. The build fails
if the catalog and the built ZIP ever disagree.

## Reporting a problem with a listing

If a listed setup contains secrets, malware, or someone else's work without permission,
open an issue with the setup's URL name and what you found. Do not paste secrets into the
issue.
