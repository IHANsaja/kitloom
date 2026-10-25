# Deploying Kitloom

Kitloom is a static export hosted on Cloudflare Pages. Accounts and community listings come
from a Supabase project that the browser talks to directly. There is no server of our own.

> Status: the build below has been run and verified locally, and the database schema has
> been applied to the Supabase project. Nothing has been deployed to Cloudflare, and
> `kitloom.site` has not been connected. Do those steps yourself and confirm each one.

## Facts about the build

| | |
|---|---|
| Package manager | npm (lockfile: `package-lock.json`) |
| Node.js | 22 (pinned in `.node-version`; `package.json` requires `>=22`) |
| Framework | Next.js 16 App Router with `output: "export"` (`next.config.ts`) |
| Development command | `npm run dev` |
| Production build command | `npm run build` |
| Build output directory | `out` |
| Environment variables | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, optional `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (all public) |
| Content-Security-Policy | Added to every page by `scripts/csp.mjs`, which runs automatically after `next build` |
| Response headers | `public/_headers` (copied to `out/_headers`) |
| Not-found page | `out/404.html`, served by Pages for unknown paths |

**The two environment variables are baked in at build time.** They must be set in
Cloudflare before the build runs; changing them later needs a redeploy. Without them the
site still builds, but it has no listings at all and sign-in and publishing are disabled.

Never add a Supabase secret or service-role key to this project's environment. It is a
static site, so build-time values can end up in public JavaScript.

## 1. Supabase

Project: **Kitloom** (ref `xwoekncvlylaohjxrkgf`). The schema in `supabase/migrations/` is
already applied. What remains is configuration that can only be done in the dashboard.

### URL configuration (required before sign-in works in production)

In **Authentication → URL Configuration**:

| Setting | Value |
|---|---|
| Site URL | `https://kitloom.site` |
| Redirect URLs | `https://kitloom.site/auth/callback`, `http://localhost:3000/auth/callback`, and your `https://<project>.pages.dev/auth/callback` |

A sign-in that returns to an address not on this list is rejected by Supabase.

### Sign-in methods

The sign-in page shows only the methods that are enabled, with no code change needed.

- **Email** (enabled by default) covers both email-and-password accounts and the one-time
  emailed link. Keep **Confirm email** on, so a password account is only active once its
  owner opens the confirmation link. Supabase's built-in mail service is for testing only:
  it is tightly rate-limited and only delivers to members of your Supabase organisation.
  For real users, configure your own SMTP provider under
  **Authentication → Emails → SMTP Settings**.
- **GitHub (recommended for this audience):** create an OAuth App at
  github.com → Settings → Developer settings → OAuth Apps with callback URL
  `https://xwoekncvlylaohjxrkgf.supabase.co/auth/v1/callback`, then paste its Client ID and
  Client Secret into **Authentication → Sign In / Providers → GitHub**. GitHub sign-ins get
  their GitHub username as their public display name.
- **Google:** in Google Cloud, **APIs & Services → Credentials → Create OAuth client ID**,
  type *Web application*:
  - Authorized JavaScript origins: `https://kitloom.site`, `http://localhost:3000`, and
    your `https://<project>.pages.dev` (optional for this flow, harmless).
  - Authorized redirect URI: exactly `https://xwoekncvlylaohjxrkgf.supabase.co/auth/v1/callback`.

  Paste the Client ID and Client secret into **Authentication → Sign In / Providers →
  Google**. The consent screen shows the `supabase.co` address unless you verify your brand
  with Google or add a custom domain to Supabase.

OAuth client secrets are entered in the Supabase dashboard only. They never go in this
repository or in Cloudflare.

### Realtime (Purl's pen)

`/purl` uses Supabase Realtime **broadcast and presence only** on the channel
`kitloom-pen`. It has no tables, no migrations, and stores nothing: each visitor joins
with presence, the earliest joiner hosts the simulation, and state travels as broadcast
messages. There is nothing to configure beyond Realtime being available on the project
(it is on by default), and no RLS policies are involved because no rows are read or
written. The CSP allows both the `https://` and `wss://` forms of the Supabase origin.

### Moderation

Community listings are public as soon as they are published. To take one down, open
**Table Editor → setups** and set its `status` to `hidden`. The owner still sees it,
labelled as hidden, and cannot change the status back.

### Abuse protection

Publishing limits are enforced by the database (migration
`20261014090000_setup_write_rate_limits.sql`): at most 5 new setups and 60 writes per
account per hour, on top of the 25-setup cap. Edits made in the dashboard are not limited.

The rest is dashboard configuration:

1. **Human check on email sign-in (Cloudflare Turnstile, free).** Without it, anyone can
   use the sign-in form to send magic-link emails to any address.
   1. In Cloudflare, open **Turnstile**, add a widget for `kitloom.site`, your
      `*.pages.dev` host and `localhost` (mode: Managed). You get a site key and a secret key.
   2. Add the **site key** as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Cloudflare Pages (Production
      and Preview) and in `.env.local`, then redeploy. The widget appears on `/signin`.
   3. Only then, in Supabase **Authentication → Attack Protection**, enable CAPTCHA
      protection, choose Turnstile and paste the **secret key**. In the other order, email
      sign-in fails until the site is redeployed.

   OAuth sign-in (GitHub, Google) is not affected; those providers do their own checks.
2. **Redirect allowlist.** Keep **Authentication → URL Configuration → Redirect URLs** to
   the exact `/auth/callback` addresses listed above. Do not add wildcards such as
   `https://*.pages.dev/**`, which would let any Pages site receive sign-in codes.
3. **Rate limits.** In **Authentication → Rate Limits**, keep the email limit low (for
   example 30 per hour for the whole project) and keep the token-verification limits at
   their defaults or lower.
4. **Link lifetime.** In the Email provider settings, set the one-time link expiry to
   15 minutes (900 seconds) or less.
5. **Passwords.** In **Authentication → Policies** (password settings):
   - set **Minimum password length** to 10 (the sign-in form asks for the same);
   - turn on **leaked-password protection** (blocks passwords found in data breaches), if
     your plan offers it;
   - turn on **Secure password change**, so changing a password needs a recent sign-in.

   A "forgot password" email links to `/auth/callback?next=/account?reset=password`, which
   is covered by the `/auth/callback` redirect URLs above.

### Checking the access rules

After any change to tables or policies, run `supabase/tests/rls.sql` in the SQL editor. It
simulates an owner, another user and an anonymous visitor in a transaction that is rolled
back, and lists what each was allowed to do.

## 2. Create the Pages project

The source is at https://github.com/IHANsaja/kitloom (public, default branch `main`).

1. In the Cloudflare dashboard, go to **Workers & Pages** and create a Pages project by
   connecting to Git.
2. Select the GitHub repository.
3. Build settings:

   | Setting | Value |
   |---|---|
   | Production branch | `main` |
   | Framework preset | `Next.js (Static HTML Export)` |
   | Build command | `npm run build` |
   | Build output directory | `out` |
   | Root directory | leave empty |

4. Environment variables, for both Production and Preview — copy the values from
   `.env.local` or from Supabase **Project Settings → API Keys**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xwoekncvlylaohjxrkgf.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | optional: the Turnstile site key (see Abuse protection) |

   If the build picks an older Node.js despite `.node-version`, also add `NODE_VERSION` = `22`.
5. Save and deploy. Check the build log for the Next.js route table.

Every push to `main` then redeploys production, and every pull request gets a preview URL.

## 3. Verify the deployment

On the `*.pages.dev` URL, check:

- `/`, `/explore`, `/purl`, `/publish`, `/about` load.
- `/explore` lists the setups in the database, and opening one shows its README and files.
- **Check and download** on a setup opens Heddle, which scans the latest commit (a few
  seconds) and then offers `<repo>-<commit>.zip` from github.com.
- `/purl` shows the pen with Purl moving on her own, the clock and weather, and your name
  in the roster. Open it in a second tab or another device: both visitors appear in the
  roster, each developer walks where its own visitor clicks, and petting, calling or
  throwing a kit from one tab is visible in the other. Close the tab that is hosting (the
  roster marks it) and the pen keeps going in the remaining tab after it takes over.
- `/does-not-exist` returns the Kitloom 404 page with status 404.
- `/explore?agent=cursor` opens with the Cursor filter selected.
- Response headers on any page include `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`
  and `Content-Security-Policy: frame-ancestors 'none'…`, and the page source has a
  `<meta http-equiv="Content-Security-Policy">` tag whose `connect-src` includes
  `wss://xwoekncvlylaohjxrkgf.supabase.co`. The browser console shows no CSP errors and
  `/purl` keeps its connection (no repeated "violates the Content Security Policy"
  messages for websockets).
- `/signin` shows the sign-in methods you enabled, and signing in lands on `/account`.
- Publishing a test setup from `/publish` shows it at `/setup?slug=…` and in `/explore`,
  and deleting it from `/account` removes it. That setup then appears in `/purl`'s kit
  list and can be thrown to Purl.

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

This requires a Cloudflare login on your machine (`npx wrangler login`), and `.env.local`
must be present so the build picks up the Supabase values. Never commit an API token.

## What does not work on this architecture

Because the site is a static export: no route handlers or API routes, no server actions, no
middleware, no request-time `searchParams` in Server Components, no `next/image`
optimisation, no ISR. Search, filtering, sign-in and publishing run in the browser, and
community setup pages use `/setup?slug=…` because pages for database rows cannot be
pre-rendered. Features that need a trusted server (file uploads, review queues, paid or
private downloads) will need Pages Functions or a Workers deployment through the OpenNext
Cloudflare adapter; decide that then and update `CLAUDE.md`.
