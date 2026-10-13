# Deploying Kitloom to Cloudflare Pages

Kitloom is a fully static export. There is no server, no database, no adapter, and no
environment variable required at build or run time.

> Status: the build below has been run and verified locally. Nothing has been deployed, and
> `kitloom.site` has not been connected, as part of creating this repository. Do those steps
> yourself and confirm each one in the Cloudflare dashboard.

## Facts about the build

| | |
|---|---|
| Package manager | npm (lockfile: `package-lock.json`) |
| Node.js | 22 (pinned in `.node-version`; `package.json` requires `>=22`) |
| Framework | Next.js 16 App Router with `output: "export"` (`next.config.ts`) |
| Development command | `npm run dev` |
| Production build command | `npm run build` |
| Build output directory | `out` |
| Environment variables | None required |
| Response headers | `public/_headers` (copied to `out/_headers`) |
| Not-found page | `out/404.html`, served by Pages for unknown paths |

**Use `npm run build`, not `npx next build`.** The `prebuild` script
(`scripts/packages.mjs`) zips the starter kits in `packages/` into `public/packages/` and
verifies their size and SHA-256 against the catalog. Running `next build` directly skips
that step and ships a site whose Download buttons return 404.

## 1. Repository

The source is at https://github.com/IHANsaja/kitloom (public, default branch `main`), and
`repositoryUrl` in `src/lib/site.ts` already points to it.

## 2. Create the Pages project

1. In the Cloudflare dashboard, go to **Workers & Pages** and create a Pages project by
   connecting to Git.
2. Select the GitHub repository.
3. Build settings:

   | Setting | Value |
   |---|---|
   | Production branch | `main` |
   | Framework preset | `Next.js (Static HTML Export)` |
   | Build command | `npm run build` (replace the preset's default `npx next build`) |
   | Build output directory | `out` |
   | Root directory | leave empty |

4. Environment variables: none are needed. If the build picks an older Node.js despite
   `.node-version`, add `NODE_VERSION` = `22` for both Production and Preview.
5. Save and deploy. Check the build log for `4 kits verified.` followed by the Next.js
   route table.

Every push to `main` then redeploys production, and every pull request gets a preview URL —
which is how a catalog contribution can be reviewed before it is merged.

## 3. Verify the deployment

On the `*.pages.dev` URL, check:

- `/`, `/explore`, `/publish`, `/about` load.
- `/setups/review-pass` loads, and **Download ZIP** downloads a file whose SHA-256 matches
  the checksum on the page.
- `/setups/does-not-exist` returns the Kitloom 404 page with status 404.
- `/explore?agent=cursor` opens with the Cursor filter selected.

## 4. Connect kitloom.site

An apex domain must be a Cloudflare zone on the same account as the Pages project.

1. Add `kitloom.site` to Cloudflare as a site and change the domain's nameservers at the
   registrar to the two Cloudflare nameservers shown. Wait until the zone is active.
2. In **Workers & Pages**, open the Pages project, select **Custom domains**, then
   **Set up a domain**.
3. Enter `kitloom.site` and select **Continue**. Cloudflare creates the DNS record.
4. Optionally repeat for `www.kitloom.site`, and add a redirect rule from `www` to the apex
   so there is one canonical host. (`metadataBase`, the sitemap, and canonical links all
   use `https://kitloom.site`.)
5. Wait for the certificate to become active, then repeat the checks from step 3 on
   `https://kitloom.site`.

Add the domain through the Pages dashboard first; a manually created CNAME without it does
not resolve.

## Deploying without Git (optional)

```bash
npm run build
```

```bash
npx wrangler pages deploy out --project-name <project-name>
```

This requires a Cloudflare login on your machine (`npx wrangler login`). Never commit an API
token to the repository.

## What does not work on this architecture

Because the site is a static export: no route handlers or API routes, no server actions, no
middleware, no request-time `searchParams` in Server Components, no `next/image`
optimisation, no ISR. Search and filtering run in the browser. If a future feature needs a
server (accounts, uploads, paid downloads), it will need Pages Functions or a Workers
deployment through the OpenNext Cloudflare adapter; decide that then and update `CLAUDE.md`.
