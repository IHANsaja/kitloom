# Kitloom

A free directory of AI coding-agent setups: instructions, rules, skills, commands, and hooks
for Claude Code, Codex, Cursor, Antigravity, and other agents. Each listing shows its files,
licence, and declared compatibility, and links to a ZIP. Anyone can browse and download;
signing in lets you publish your own.

Intended home: [kitloom.site](https://kitloom.site) (not yet deployed — see
`docs/deployment.md`).

## Run it

Requires Node.js 22 or newer.

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in the two Supabase values. Both are public by
design. Without them the site still runs, but it has no listings and sign-in and
publishing are switched off.

```bash
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Exports the static site to `out/` |
| `npm run preview` | Serves `out/` locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, strict |
| `npm test` | Search, filters, sorting, URL safety, row mapping, form validation |
| `npm run check` | All of the above checks plus the build |

## How it works

- **Every listing comes from the database.** Nothing is built into the site. Signed-in
  users publish at `/publish`, and rows live in Supabase.
- **No uploads.** A setup is a public GitHub repository. Kitloom stores a description plus
  a snapshot of the README and file list, and the Download button fetches the ZIP that
  GitHub builds from the repository's default branch. Creators update a setup by pushing.
- **Accounts** use Supabase Auth, passwordless only. The browser talks to Supabase
  directly, so Row Level Security in `supabase/migrations/` is the access control.
- The site is a static Next.js export for Cloudflare Pages. No server of its own, no
  analytics.

## Documents

- `CLAUDE.md` — engineering rules and architecture
- `design.md` — visual and interaction specification
- `CONTRIBUTING.md` — how to list a setup or change the site
- `docs/deployment.md` — Cloudflare Pages and Supabase setup

## Licence

Kitloom's own source code, design, and branding are proprietary: see `LICENSE`. You may
read the code and fork it to propose changes, but not reuse it or run it as your own
product without permission.

Setups listed in the directory are not covered by that licence: they belong to their
creators, under the licence each one states.
