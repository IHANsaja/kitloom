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
| Architecture | Static site + Supabase (accounts and all listings) |
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
  libraries are GSAP (motion and SVG animation), three.js (WebGL scenes, TSL only) and
  Sonner (toasts); see `design.md` §5 and §7 for their rules.
- **three.js must never be in a page's initial JavaScript.** It is reached only through
  the dynamic import in `src/components/motion/Scenes.tsx`. Do not import `three` or
  `src/components/motion/tsl/scenes.ts` statically from anywhere else.
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
- **Every listing comes from the database.** Nothing is built into the site: there is no
  catalog file, no bundled kits, no seed data in the repository. Rows in `public.setups`
  are published by signed-in users through `/publish` and rendered in the browser at
  `/setup?slug=<slug>`.
- **Package storage:** Kitloom stores no package files and has no upload. A setup points
  at a public GitHub repository; the download is the ZIP GitHub generates from its default
  branch (`https://github.com/<owner>/<repo>/archive/refs/heads/<branch>.zip`). Creators
  update a setup by pushing to GitHub.
- No backend of our own, no route handlers, no server actions, no payments.

Because the site is a static export, anything that needs a request-time server (dynamic
`searchParams` in Server Components, route handlers, middleware, `next/image` optimisation,
server actions) is unavailable. Listing, search, filtering, sign-in and publishing all run
in the browser. That is why setups use a query-string URL: a static export cannot
pre-render pages for rows that do not exist at build time. It also means listings are not
in the HTML that search engines receive.

### Environment variables

| Name | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes, for any listing to appear | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes, for any listing to appear | Public by design |

Both are read at **build** time. Without them the site still builds, but it has nothing to
list and says so ("The directory is not connected").

## 5. Repository map

```
supabase/migrations/             SQL migrations, each with a matching .down.sql
supabase/tests/rls.sql           Role-simulation test for the access rules (rolled back)
public/_headers                  Cloudflare Pages response headers
src/app/                         Routes (see below)
src/components/                  auth/ files/ filters/ layout/ publish/ search/ setups/ ui/
src/components/motion/           Animated SVG library (useSvgMotion, Ambient, Illustrations),
                                 stringEngine.ts + Strings.tsx (playable margins, loader, 404),
                                 Scenes.tsx (lazy WebGL wrapper), tsl/scenes.ts (three.js TSL)
src/lib/catalog/                 taxonomy, pure query (search/filter/sort), summary helpers
src/lib/community/               Supabase-backed setups: API, row mapping, validation, GitHub reader
src/lib/packages/                URL safety, path safety, download access, content classifier
src/lib/supabase/                Browser client and session/auth helpers
src/lib/site.ts                  Site-level config
src/types/catalog.ts             Listing types
docs/deployment.md               Cloudflare Pages + Supabase deployment steps
```

Routes: `/` · `/explore` · `/agents` · `/setup?slug=` · `/publish` (`?edit=<slug>`) · `/signin` ·
`/auth/callback` · `/account` · `/about`.

## 6. Architectural boundaries

| Concern | Owner | Notes |
|---|---|---|
| Setup data | `src/lib/community/setups.ts` | The only module that queries `setups`/`profiles`. `rowToCommunitySetup` treats every row as untrusted and drops or strips anything unsafe before it reaches the UI. |
| Listing hook | `src/lib/community/useSetups.ts` | One fetch per page load, shared by every component. Exposes `state` (`loading`/`ready`/`error`/`off`): an empty list is only a fact once the state is `ready`. |
| Query logic | `src/lib/catalog/query.ts` | Pure `searchSetups` / filter / sort / facets over `SetupSummary`. |
| Taxonomy | `src/lib/catalog/taxonomy.ts` | Known agents and categories. **Must match the check constraints on `public.setups`** — change both together, with a migration. |
| GitHub reader | `src/lib/community/github.ts` | Unauthenticated GitHub REST calls from the browser at publish time (README, file list, licence, default branch). |
| Storage references | `src/lib/packages/urls.ts` | Decides which download and link URLs are acceptable. |
| Download eligibility | `src/lib/packages/access.ts` | `getDownloadAccess(setup)` is the single place that decides whether and how a setup can be downloaded. Today everything is free. |
| Auth | `src/lib/supabase/auth.ts` | `useSession()` store, enabled-provider discovery, safe redirect paths. |
| Package contents | `src/lib/packages/contents.ts` | Classifies file paths (skills, hooks, MCP config…) as a reading aid. Not a scanner. |

UI components never query Supabase directly.

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
  `slug` cannot be updated. A trigger caps accounts at 25 setups and validates tags and
  credit links.
- `status = 'hidden'` is moderation: set by a maintainer in the Supabase dashboard.
- Every schema change ships as a migration in `supabase/migrations/` with a `.down.sql`,
  and is followed by `supabase/tests/rls.sql` and the Supabase security advisor.
- Do not add seed or test rows through migrations. Data is created by publishing.

### Listing rules

- Slugs are lowercase kebab-case. Dates are ISO-8601.
- The only acceptable download reference is a GitHub repository archive, derived in the
  app from `repository_url` and `default_branch`. Nothing else, ever — see
  `isAllowedDownloadUrl`.
- `repositoryUrl` is exactly `https://github.com/<owner>/<repo>`, and the repository must
  be public or the download fails for everyone but its owner.
- `sourceRepositories` ("Built from") are credits: up to 8 other GitHub repositories, in
  the same canonical form, that the creator says the setup draws on. They are display-only
  links stated by the creator. They are never downloaded, fetched, or treated as verified,
  and the setup's own repository is not allowed in the list. Enforced in three places:
  the form, `rowToCommunitySetup`, and the `setups_before_write` trigger.
- `downloads` is `null`: there is no trustworthy counter. "Most downloaded" sorting only
  appears if real data ever exists.
- There are no checksums. The archive follows the repository, so there is no fixed value to
  compare against, and the UI says so rather than implying integrity checking.

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
- Never show or imply a checksum, signature, or "verified" state for a download: the ZIP
  is generated by GitHub from a moving branch.
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
| Production build (static export to `out/`) | `npm run build` |
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
- **SVG illustrations.** One hook, `useSvgMotion`, drives all of them: it builds a paused
  GSAP timeline, plays it only while the SVG is on screen, and reverts on unmount. The
  markup must be the finished drawing; animation only adds to it.
- **WebGL scenes.** `TslScene` always renders an SVG fallback and upgrades to a three.js
  scene only when it is on screen, at `md` width or more, with motion welcome and data
  saving off. In development it logs a warning when a scene falls back.
- **Toasts.** Sonner injects styles at runtime; the theme overrides in `globals.css` are
  prefixed with `html` to win on specificity.
- **Sign-in methods are discovered, not configured.** The sign-in page asks Supabase which
  providers are enabled (`/auth/v1/settings`) and shows only those. Enabling GitHub or
  Google in the Supabase dashboard makes the button appear with no code change.
- **Publish snapshot.** On publish and on every edit, the form re-reads the README, file
  list, licence and default branch from GitHub and stores them. These are supplied by the
  client, so they are display data only — never a basis for trust.
- **No built-in listings.** The four starter kits, the JSON catalog, the ZIP build script
  and the `/setups/<slug>` pages were removed on 2026-10-13 at the owner's request. Do not
  reintroduce bundled or hard-coded listings; if examples are wanted, publish them like
  any other setup.
- **Licence.** The site's source, design, and branding are proprietary (`LICENSE`, all rights
  reserved; viewing and forking to contribute is allowed). Listed setups keep their
  creators' licences. Do not
  add a dependency whose licence forbids use in a closed-source commercial product.
