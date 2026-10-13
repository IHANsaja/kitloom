# Kitloom — engineering manual

This file is the permanent engineering instruction manual for Kitloom. Read it, then
`design.md`, before changing anything. Update both when an architectural or visual decision
materially changes.

## 1. Product identity

| | |
|---|---|
| Product name | Kitloom |
| Domain | kitloom.site |
| Repository | https://github.com/IHANsaja/kitloom |
| Category | AI agent setup discovery and sharing platform |
| Business model (initial) | Entirely free |
| Architecture | Static site + Supabase (accounts and community listings) |
| Primary users | Software developers, AI-assisted developers, agent workflow builders, open-source contributors |
| Mission | Make useful AI agent configurations easy to discover, understand, reuse, share, and download |

Core journey: **Discover → Inspect → Download → Customize → Share**.

Kitloom is not an AI chatbot, an agent execution platform, an online IDE, or a social network.

A *setup* (also called a *kit*) is a set of agent configuration files: instructions, project
rules, skills, agent definitions, commands, hooks, workflow templates, configuration
examples, documentation, and installation notes. A setup can target one agent or several.

## 2. Supported ecosystem

Kitloom is provider-neutral. It lists setups for Claude Code, OpenAI Codex, Cursor, Google
Antigravity, and other coding agents (the registry of known agents lives in
`src/lib/catalog/taxonomy.ts`, mirrored by a check constraint in the database).

- Never make the application depend on a single AI provider.
- Compatibility is explicit metadata on each listing. Never infer or claim that a package
  works with every agent.
- Each agent entry carries a `compatibility` level: `declared` (the creator says so) or
  `tested` (someone actually verified it). The UI keeps these visibly distinct. Community
  listings are always `declared`. Do not mark anything `tested` unless it was.

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
- The only external services are Supabase (free tier) and GitHub's public API. Do not add
  a paid API or another mandatory service.
- No hardcoded secrets, API keys, credentials, or personal tokens. `.env.local` is
  git-ignored; `.env.example` lists names only.
- **Only public values may exist in this application's environment.** It is a static site:
  anything available at build time can end up in browser JavaScript. The Supabase
  publishable key is public by design. A secret or service-role key must never be added.
- No fabricated data: no fake statistics, download counts, testimonials, creators, licences,
  checksums, or compatibility results. Unknown values are `null` and rendered as "not provided".

## 4. Infrastructure

- **Hosting:** Cloudflare Pages, as a fully static export (`output: "export"` → `out/`).
- **Supabase project:** `Kitloom` (ref `xwoekncvlylaohjxrkgf`, region ap-south-1). Provides
  Auth and Postgres. The browser talks to it directly with the publishable key.
- **Listings come from two places:**
  - *First-party starter kits*: records in `src/data/setups.json`, files in
    `packages/<slug>/`, zipped deterministically at build into `public/packages/`
    (git-ignored) and pre-rendered at `/setups/<slug>`.
  - *Community setups*: rows in the `public.setups` table, published by signed-in users
    through `/publish`, rendered in the browser at `/setup?slug=<slug>`.
- **Package storage:** Kitloom stores no community package files. A community setup points
  at a public GitHub repository; the download is the ZIP GitHub generates from its default
  branch (`/archive/refs/heads/<branch>.zip`). There is no upload.
- No backend of our own, no route handlers, no server actions, no payments.

Because the site is a static export, anything that needs a request-time server (dynamic
`searchParams` in Server Components, route handlers, middleware, `next/image` optimisation,
server actions) is unavailable. Search, filtering, sign-in and publishing all run in the
browser. That is why community setups use a query-string URL: a static export cannot
pre-render pages for rows that do not exist at build time.

### Environment variables

| Name | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | For accounts and community listings | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | For accounts and community listings | Public by design |

Both are read at **build** time. Without them the site still builds and shows the starter
kits; sign-in and publishing show a "not configured" notice.

## 5. Repository map

```
packages/<slug>/                 Source files of first-party starter kits (zipped at build)
scripts/packages.mjs             Builds kit ZIPs; verifies catalog size/sha256/manifest/readme
supabase/migrations/             SQL migrations, each with a matching .down.sql
supabase/tests/rls.sql           Role-simulation test for the access rules (rolled back)
public/_headers                  Cloudflare Pages response headers
src/app/                         Routes (see below)
src/components/                  auth/ files/ filters/ layout/ publish/ search/ setups/ ui/
src/data/setups.json             First-party catalog
src/lib/catalog/                 zod schema, loader, taxonomy, pure query + summary helpers
src/lib/community/               Supabase-backed setups: API, row mapping, validation, GitHub reader
src/lib/packages/                URL safety, path safety, download access, content classifier
src/lib/supabase/                Browser client and session/auth helpers
src/lib/site.ts                  Site-level config
src/types/catalog.ts             Listing types shared by both sources
docs/deployment.md               Cloudflare Pages + Supabase deployment steps
```

Routes: `/` · `/explore` · `/setups/[slug]` (first-party, static) · `/setup?slug=`
(community, client) · `/publish` (`?edit=<slug>`) · `/signin` · `/auth/callback` ·
`/account` · `/about`.

## 6. Architectural boundaries

| Concern | Owner | Notes |
|---|---|---|
| First-party catalog | `src/lib/catalog/index.ts` | The only module that imports `setups.json`. Validated with zod at build; an invalid catalog fails the build with a per-record report. Build/server only. |
| Query logic | `src/lib/catalog/query.ts` | Pure `searchSetups` / filter / sort / facets over `SetupSummary`. Used for both sources. |
| Taxonomy | `src/lib/catalog/taxonomy.ts` | Known agents and categories. **Must match the check constraints on `public.setups`** — change both together, with a migration. |
| Community data | `src/lib/community/setups.ts` | The only module that queries `setups`/`profiles`. `rowToCommunitySetup` treats every row as untrusted and drops or strips anything unsafe before it reaches the UI. |
| Merged listing | `src/lib/community/useAllSetups.ts` | Built-in summaries first, community summaries merged when the database answers. One fetch per page load. |
| GitHub reader | `src/lib/community/github.ts` | Unauthenticated GitHub REST calls from the browser at publish time (README, file list, licence, default branch). |
| Storage references | `src/lib/packages/urls.ts` | Decides which download and link URLs are acceptable. |
| Download eligibility | `src/lib/packages/access.ts` | `getDownloadAccess(setup)` is the single place that decides whether and how a setup can be downloaded. Today everything is free. |
| Auth | `src/lib/supabase/auth.ts` | `useSession()` store, enabled-provider discovery, safe redirect paths. |
| Package contents | `src/lib/packages/contents.ts` | Classifies manifest paths (skills, hooks, MCP config…) as a reading aid. Not a scanner. |

UI components never query Supabase or read `setups.json` directly.

### Database (the real security boundary)

The browser holds the publishable key and a user's session, nothing more. **Row Level
Security, column grants, and check constraints are the access control.** Client-side
validation exists only to give good error messages.

- `profiles` — one row per account, created by the `handle_new_user` trigger. Public
  read; no client writes at all, so a display name cannot be changed to impersonate
  someone. Display names come from the GitHub username or provider name, never from an
  email address (email sign-ins get `member-xxxxxxxx`).
- `setups` — public read of `status = 'published'`; owners also see their own hidden rows.
  Insert/update/delete only by the owner. `owner_id`, `status`, `id` and timestamps are not
  grantable columns: `owner_id` defaults to `auth.uid()`, `status` to `'published'`.
  `slug` cannot be updated. A trigger caps accounts at 25 setups and validates tags.
- `status = 'hidden'` is moderation: set by a maintainer in the Supabase dashboard.
- Every schema change ships as a migration in `supabase/migrations/` with a `.down.sql`,
  and is followed by `supabase/tests/rls.sql` and the Supabase security advisor.

### Listing rules (both sources)

- Slugs are lowercase kebab-case. Dates are ISO-8601.
- Download references must be one of: `/packages/<file>.zip` (first-party), a GitHub release
  asset, or a GitHub repository archive. Nothing else, ever — see `isAllowedDownloadUrl`.
- `repositoryUrl` for community setups is exactly `https://github.com/<owner>/<repo>`.
- `sourceRepositories` ("Built from") are credits: up to 8 other GitHub repositories, in
  the same canonical form, that the creator says the setup draws on. They are display-only
  links stated by the creator. They are never downloaded, fetched, or treated as verified,
  and the setup's own repository is not allowed in the list. Enforced in three places:
  the form, `rowToCommunitySetup`, and the `setups_before_write` trigger.
- `downloads` is `null`: there is no trustworthy counter. "Most downloaded" sorting only
  appears if real data ever exists.
- Community setups have no checksum (the archive follows the repository) and the UI says so.

### First-party kits

`npm run packages:check` (run automatically before `dev` and `build`) rebuilds every kit ZIP
and fails if the catalog's `sizeBytes`, `sha256`, `manifest`, or `readme` do not match the
real artifact. After editing files under `packages/`, run `npm run packages:sync` and bump
the kit's `version`.

## 7. Security rules

- Never execute package contents, never run downloaded scripts, never auto-install anything.
- Hosting on GitHub does not make a ZIP trusted. The UI tells users to inspect before use.
- Community listings are published without review and say so. Do not add copy that
  implies vetting, scanning, or endorsement.
- README content is untrusted Markdown: rendered with `react-markdown` (no raw HTML), link
  protocols restricted, remote images never fetched.
- Sign-in is passwordless only (OAuth or emailed link, PKCE flow). Do not add password
  fields. Post-sign-in redirects go through `safeNextPath` (same-site paths only).
- Never display a user's email address to anyone but that user.
- A SHA-256 checksum proves integrity against a known value. It does not prove safety.
- If ZIP uploads are ever added: reject path traversal and absolute paths, cap archive
  size / file count / compression ratio, never extract blindly, and do it on a backend.

## 8. Future extensibility (do not build yet)

Possible later: package uploads and private storage, a review queue and admin UI, paid
listings, purchase verification, platform fees, creator earnings and payouts.

Not to be added speculatively: pricing fields, payment buttons, checkout, upload forms,
download counters, torrents/WebTorrent, analytics. Paid or private downloads must be
authorised by a trusted backend — never by hiding a button, and never by RLS alone on a
link that is public anyway.

## 9. Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Develop | `npm run dev` |
| Lint | `npm run lint` |
| Type-check | `npm run typecheck` |
| Unit tests | `npm test` |
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
- **Sign-in methods are discovered, not configured.** The sign-in page asks Supabase which
  providers are enabled (`/auth/v1/settings`) and shows only those. Enabling GitHub or
  Google in the Supabase dashboard makes the button appear with no code change.
- **Publish snapshot.** On publish and on every edit, the form re-reads the README, file
  list, licence and default branch from GitHub and stores them. These are supplied by the
  client, so they are display data only — never a basis for trust.
- **Licence.** The site's source, design, and branding are proprietary (`LICENSE`, all rights
  reserved; viewing and forking to contribute is allowed). Starter kits in `packages/` stay
  MIT under their own `LICENSE` files. Listed setups keep their creators' licences. Do not
  add a dependency whose licence forbids use in a closed-source commercial product.
