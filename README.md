# Kitloom

A free, database-free directory of AI coding-agent setups: instructions, rules, skills,
commands, and hooks for Claude Code, Codex, Cursor, Antigravity, and other agents. Each
listing shows its files, licence, declared compatibility, and checksum, and links to a ZIP.

Intended home: [kitloom.site](https://kitloom.site) (not yet deployed — see
`docs/deployment.md`).

## Run it

Requires Node.js 22 or newer.

```bash
npm install
```

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
| `npm test` | Catalog validation, search, filters, sorting, URL safety |
| `npm run packages:sync` | Rewrites kit size/checksum/manifest in the catalog from `packages/` |
| `npm run check` | All of the above checks plus the build |

## How it works

- `src/data/setups.json` is the catalog and the only source of listings.
- `src/lib/catalog/` validates it at build time and provides search, filter, and sort.
- Community packages are hosted by their creators as GitHub release assets; the catalog
  stores only the URL and metadata.
- First-party starter kits live as plain files in `packages/` and are zipped
  deterministically during the build.
- The site is a static Next.js export for Cloudflare Pages. No server, no accounts, no
  analytics, no environment variables.

## Documents

- `CLAUDE.md` — engineering rules and architecture
- `design.md` — visual and interaction specification
- `CONTRIBUTING.md` — how to list a setup or change the site
- `docs/deployment.md` — Cloudflare Pages deployment

## Licence

The starter kits in `packages/` each carry an MIT `LICENSE`. No licence has been chosen for
the site's own source code yet; add one before accepting outside contributions.
