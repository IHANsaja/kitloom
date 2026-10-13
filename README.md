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
design. Without them the site still runs and shows the starter kits; sign-in and publishing
are switched off.

```bash
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Builds kit ZIPs, verifies them, exports the static site to `out/` |
| `npm run preview` | Serves `out/` locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, strict |
| `npm test` | Catalog validation, search, filters, sorting, URL safety, row mapping |
| `npm run packages:sync` | Rewrites kit size/checksum/manifest in the catalog from `packages/` |
| `npm run check` | All of the above checks plus the build |

## How it works

- **Starter kits** are maintained here: a record in `src/data/setups.json`, files in
  `packages/`, zipped deterministically during the build with a verified SHA-256.
- **Community setups** are published by signed-in users at `/publish` and stored in
  Supabase. The files stay in the creator's public GitHub repository; Kitloom links to the
  ZIP GitHub builds from it. Nothing is uploaded.
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

Two things are licensed separately:

- The starter kits in `packages/` each carry their own MIT `LICENSE`.
- Setups listed in the directory belong to their creators, under the licence each one states.
