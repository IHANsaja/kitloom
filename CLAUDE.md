# Kitloom — engineering manual

This file is the permanent engineering instruction manual for Kitloom. Read it, then
`design.md`, before changing anything. Update both when an architectural or visual decision
materially changes.

## 1. Product identity

| | |
|---|---|
| Product name | Kitloom |
| Domain | kitloom.site |
| Category | AI agent setup discovery and sharing platform |
| Business model (initial) | Entirely free |
| Architecture (initial) | Database-free, static site |
| Primary users | Software developers, AI-assisted developers, agent workflow builders, open-source contributors |
| Mission | Make useful AI agent configurations easy to discover, understand, reuse, share, and download |

Core journey: **Discover → Inspect → Download → Customize → Share**.

Kitloom is not an AI chatbot, an agent execution platform, an online IDE, or a social network.

A *setup* (also called a *kit*) is a ZIP package of agent configuration: instructions, project
rules, skills, agent definitions, commands, hooks, workflow templates, configuration examples,
documentation, and installation notes. A setup can target one agent or several.

## 2. Supported ecosystem

Kitloom is provider-neutral. It lists setups for Claude Code, OpenAI Codex, Cursor, Google
Antigravity, and other coding agents (the registry of known agents lives in
`src/lib/catalog/taxonomy.ts`).

- Never make the application depend on a single AI provider.
- Compatibility is explicit metadata on each catalog record. Never infer or claim that a
  package works with every agent.
- Each agent entry carries a `compatibility` level: `declared` (the creator says so) or
  `tested` (someone actually verified it). The UI must keep these visibly distinct. Do not
  mark anything `tested` unless it was.

## 3. Mandatory engineering constraints

- Next.js App Router, React, TypeScript in `strict` mode.
- Tailwind CSS v4, configured in CSS (`src/app/globals.css`, `@theme`). Do not create
  `tailwind.config.js` / `tailwind.config.ts`.
- npm is the package manager (`package-lock.json` is committed).
- Semantic HTML and accessible interactive elements. No `href="#"`, no decorative controls.
- No `any`. No `@ts-ignore`.
- Modular components; no giant single-file pages, no pointless fragmentation.
- Avoid unnecessary dependencies and unnecessary client-side JavaScript. The approved UI
  libraries are GSAP (motion) and Sonner (toasts); see `design.md` §5 and §7 for their rules.
- Server Components by default. Add `"use client"` only where interaction requires it.
- No paid database, paid API, or mandatory external service.
- No hardcoded secrets, API keys, credentials, or personal tokens. No `.env` with secrets.
- Browser code cannot securely publish to GitHub. Never pretend otherwise and never put a
  token in a client bundle.
- No fabricated data: no fake statistics, download counts, testimonials, creators, licenses,
  checksums, or compatibility results. Unknown values are `null` and rendered as "not provided".

## 4. Infrastructure

- **Hosting:** Cloudflare Pages, as a fully static export (`output: "export"` → `out/`).
- **Catalog:** version-controlled JSON at `src/data/setups.json`.
- **Package storage:** binaries are never stored in the catalog.
  - *Community packages* live in the creator's GitHub repository as release assets. The
    catalog stores the HTTPS release URL.
  - *First-party starter kits* live as plain source files in `packages/<slug>/`. The build
    zips them deterministically into `public/packages/` (git-ignored) and they are served
    from the same Pages deployment.
- No database, no backend service, no runtime API routes, no server actions, no payments.
- No environment variables are required to build or browse.

Because the site is a static export, anything that needs a request-time server (dynamic
`searchParams` in Server Components, route handlers, middleware, `next/image` optimisation,
server actions) is unavailable. Search and filtering therefore run in the browser over data
serialised at build time.

## 5. Repository map

```
packages/<slug>/            Source files of first-party starter kits (zipped at build)
scripts/packages.mjs        Builds kit ZIPs; verifies catalog size/sha256/manifest/readme
public/_headers             Cloudflare Pages response headers
src/app/                    Routes: /, /explore, /setups/[slug], /publish, /about
src/components/             layout/ search/ filters/ setups/ files/ ui/ (ui/Reveal = GSAP, ui/Toaster = Sonner)
src/data/setups.json        The catalog (single source of truth)
src/lib/catalog/            schema (zod), loader, taxonomy, pure query functions
src/lib/packages/           URL safety, download access boundary, formatting
src/lib/site.ts             Site-level config (name, URL, contribution repository)
src/lib/publishing.ts       Publishing boundary: submission types + catalog-entry template
src/lib/catalog/catalog.test.ts  Unit tests for everything above
src/types/catalog.ts        Catalog record types
docs/deployment.md          Cloudflare Pages deployment steps
CONTRIBUTING.md             How to submit a setup
```

## 6. Architectural boundaries

Keep these concepts separate; they are the seams for future work.

| Concern | Owner | Notes |
|---|---|---|
| Catalog metadata | `src/lib/catalog/index.ts` | The only module that imports `setups.json`. Exposes `getCatalog`, `getSetups`, `getSetupBySlug`, `getSetupSummaries`. Replaceable by a database-backed implementation. |
| Validation | `src/lib/catalog/schema.ts` | zod schema; runs at build. Server/build only — never import it from a Client Component. |
| Query logic | `src/lib/catalog/query.ts` | Pure, dependency-free `searchSetups` / filter / sort over `SetupSummary`. Safe in the browser. |
| Taxonomy | `src/lib/catalog/taxonomy.ts` | Known agents and categories. Catalog records may only reference these ids. |
| Storage references | `src/lib/packages/urls.ts` | Decides which download and link URLs are acceptable. |
| Download eligibility | `src/lib/packages/access.ts` | `getDownloadAccess(setup)` is the single place that decides whether and how a setup can be downloaded. Today everything is free. |
| Creator identity | `Setup.creator` | Display attribution only. No accounts. |
| Publishing | `src/lib/publishing.ts` | Today: pull request. `SetupPublisher` is the interface a future authenticated backend implements. |
| Package contents | `src/lib/packages/contents.ts` | Classifies manifest paths (skills, hooks, MCP config…) as a reading aid. Not a scanner. |

UI components must not read `setups.json` or know its shape beyond the exported types.

### Catalog rules

- `id` and `slug` are unique, lowercase kebab-case.
- `agents[].id` and `categories[]` must exist in the taxonomy.
- Dates are ISO-8601 strings; `updatedAt >= publishedAt`.
- `package.sha256` is 64 lowercase hex characters or `null`.
- `package.downloadUrl` is `null`, a first-party path `/packages/<slug>-<version>.zip`, or an
  `https://github.com/<owner>/<repo>/releases/download/...` URL. Nothing else.
- `repositoryUrl` and `creator.url` must be `https:`.
- `downloads` is `null` unless a reliable source exists. "Most downloaded" sorting is only
  offered when data exists.
- An invalid catalog fails the build with a per-record error list. It must never fail silently.

### First-party kits

`npm run packages:check` (run automatically before `dev` and `build`) rebuilds every kit ZIP
and fails if the catalog's `sizeBytes`, `sha256`, `manifest`, or `readme` do not match the
real artifact. After editing files under `packages/`, run `npm run packages:sync` to write
the new values into the catalog, and bump the kit's `version`.

## 7. Security rules

- Never execute package contents, never run downloaded scripts, never auto-install anything.
- Hosting on GitHub does not make a ZIP trusted. The UI tells users to inspect before use.
- The site does not process uploaded ZIP bytes. If that is ever added: reject path traversal
  and absolute paths, cap archive size / file count / compression ratio, never extract blindly.
- README content is untrusted Markdown: rendered with `react-markdown` (no raw HTML), with
  link protocols restricted and external links opened with `rel="noopener noreferrer nofollow"`.
- A SHA-256 checksum proves integrity against a known value. It does not prove safety. Copy
  must never blur the two.
- Nothing claims automated scanning. Review is manual, via pull request.

## 8. Future extensibility (do not build yet)

The boundaries above exist so these can be added without a rewrite: database-backed catalog,
authenticated creator publishing, private package storage, paid listings, purchase
verification, platform fees, creator earnings and payouts.

Not in the MVP, and not to be added speculatively: pricing fields, payment buttons, checkout,
accounts, login buttons, upload forms, download counters, torrents/WebTorrent, analytics.
Future paid downloads must be authorised by a trusted backend — never by hiding a button.

## 9. Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Develop | `npm run dev` |
| Lint | `npm run lint` |
| Type-check | `npm run typecheck` |
| Unit tests (catalog validation, search, filters, sort, URL safety) | `npm test` |
| Rebuild kits and verify catalog integrity | `npm run packages:check` |
| Write real kit size/checksum/manifest into the catalog | `npm run packages:sync` |
| Production build (static export to `out/`) | `npm run build` — never bare `next build`, which skips the kit ZIPs |
| Everything | `npm run check` |

## 10. Workflow

Before a major feature: read this file, read `design.md`, inspect the existing
implementation, follow the conventions already present. After: run `npm run check`, look at
the result in a browser at mobile and desktop widths, and update these documents if a
decision changed.

Report results honestly. Never claim a test passed, a deployment succeeded, or a domain is
connected unless it was actually done and verified.

## 11. Implementation notes worth knowing

- **Explore state.** `ExploreClient` owns search/filter/sort state and mirrors it to the URL
  with `history.replaceState`. `useSearchParams` lags behind those writes, so the component
  tracks the URLs it wrote and only adopts a router URL that is not its own. Handlers build
  on a ref of the latest query. Do not "simplify" either without re-testing fast typing
  right after a filter click.
- **Entrance animation.** Items are pre-hidden by CSS only under `html.js` (set by an inline
  script in the root layout) with a 3s CSS fallback. Never hide content in a way that
  depends on GSAP loading.
- **Toasts.** Sonner injects styles at runtime; the theme overrides in `globals.css` are
  prefixed with `html` to win on specificity.
- **Site repository URL.** `site.repositoryUrl` is `null` until the public repository
  exists. The Publish page and footer adapt automatically.
- **Licence.** Starter kits are MIT. The site's own source has no licence chosen yet.
