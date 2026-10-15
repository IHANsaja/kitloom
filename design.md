# Kitloom — design specification

The visual and interaction contract for every route. `CLAUDE.md` governs engineering; this
file governs what the product looks and feels like. Both describe the same product: a free
directory of AI coding-agent setups, served as a static site, with accounts only for the
people who publish.

## 1. Direction

**Concept:** reusable developer setups woven into practical, shareable kits. A loom makes
cloth from crossing threads; Kitloom's surface is built from crossing hairlines.

**The one idea to protect:** *the ruled grid*. Content sits in cells separated by 1px
hairlines that meet at clean intersections — like a ledger, a spec sheet, or a registry
index. Listings are cells in a shared grid, not floating cards with shadows. If a screen
could be mistaken for a generic SaaS template, it is wrong.

Influences, combined rather than copied: IDE sidebars and command palettes, source-control
histories, package registries, technical documentation, editorial grids.

Character: technical, precise, crafted — and alive: threads are always moving somewhere. Dense enough for developers; never cramped.

## 2. Colour

All colour comes from tokens defined in `src/app/globals.css` under `@theme`. Never write a
raw hex value in a component.

### Core tokens

| Token | Value | Use |
|---|---|---|
| `carbon` | `#111318` | Page background |
| `surface` | `#1B1E25` | Elevated surface: panels, code blocks, inputs |
| `surface-2` | `#20242D` | Hover / pressed surface, nested surface |
| `lime` | `#D9FF72` | Primary accent ("signal lime") |
| `fg` | `#F2F3F5` | Primary text |
| `fg-2` | `#A7ABB5` | Secondary text |
| `fg-3` | `#777E8A` | Muted text |
| `line` | `#343944` | Borders, grid rules |
| `line-subtle` | `#282C35` | Subtle separators inside a region |
| `line-control` | `#6B7280` | Boundary of form controls only |

### Semantic tokens

| Token | Value | Use |
|---|---|---|
| `success` | `#7BD49A` | Verified / tested state |
| `warning` | `#F0B95B` | Caution, safety notices |
| `danger` | `#FF8A80` | Errors, unavailable |
| `info` | `#8AB8F0` | Neutral informational notes |

### Measured contrast (WCAG 2.x ratio)

| Foreground | on `carbon` | on `surface` | on `surface-2` |
|---|---|---|---|
| `fg` | 16.74 | 15.02 | 13.99 |
| `fg-2` | 8.08 | 7.26 | 6.76 |
| `fg-3` | 4.54 | 4.08 | 3.80 |
| `lime` | 16.37 | 14.69 | 13.68 |
| `line-control` | 3.84 | 3.45 | 3.21 |
| `success` / `warning` / `danger` / `info` | 10.38 / 10.44 / 8.14 / 9.02 | ≥ 7.31 | ≥ 6.81 |

Carbon text on a lime fill is 16.37.

Rules that follow from the numbers:

- `fg-3` is only allowed for text on `carbon`. On `surface` or `surface-2`, the lowest text
  colour is `fg-2`.
- `line` and `line-subtle` are decorative structure (below 3:1). Anything a user must
  perceive to operate a control — an input's edge, a checkbox — uses `line-control` or lime.
- Disabled controls use `fg-3` text plus a non-colour cue (`aria-disabled`, no hover, explicit
  wording such as "Not available").

### Using lime

Lime is a signal, not a theme colour. It is allowed for exactly these things:

1. The single primary action in a region (filled lime, carbon text).
2. The active/selected state: current nav item, selected filter, active sort.
3. Focus rings.
4. One deliberate highlight per screen (for example the mark in the wordmark, or one key
   phrase in the home headline).

Not lime: headings in general, body links (links are `fg` with an underline), icons at rest,
borders at rest, badges, dividers. If more than about 5% of a screen is lime, remove some.

Status is never colour-only: every semantic colour is paired with text or an icon.

## 3. Typography

- **Sans:** Geist Sans — interface, headings, body.
- **Mono:** Geist Mono — technical metadata only: versions, file paths, repository names, slugs,
  identifiers, keyboard shortcuts, eyebrow labels, counts.

Both ship from the `geist` npm package (SIL OFL), self-hosted through `next/font`; no
runtime font request to a third party. Headings are never monospace.

### Scale

| Role | Class recipe | Size / line | Notes |
|---|---|---|---|
| Display | `text-display` | clamp(2.25rem → 3.75rem) / 1.02 | Home headline only. Weight 600, tracking −0.035em |
| Page heading (h1) | `text-h1` | clamp(1.75rem → 2.5rem) / 1.1 | Weight 600, tracking −0.025em |
| Section heading (h2) | `text-h2` | 1.25rem / 1.3 | Weight 600, tracking −0.015em |
| Sub heading (h3) | `text-base font-semibold` | 1rem / 1.4 | |
| Body | `text-[0.9375rem]` | 15px / 1.6 | Default paragraph size |
| Small | `text-sm` | 14px / 1.5 | Card descriptions, secondary copy |
| Meta | `font-mono text-xs` | 12px / 1.5 | Versions, sizes, dates, licences |
| Eyebrow | `eyebrow` | mono 11px, uppercase, tracking 0.08em, `fg-3`/`fg-2` | Section labels |
| Path / code | `font-mono text-[0.8125rem]` | 13px / 1.6 | File trees, code blocks |
| Kbd | `kbd` | mono 11px in a 1px bordered box | Keyboard shortcuts |

- Use `tabular-nums` on versions, counts, sizes, and dates.
- Prose measure: 60–72 characters (`max-w-prose` or `max-w-[68ch]`).
- Headings use `text-balance`; long paragraphs use `text-pretty`.
- Long slugs, URLs, and repository names must wrap (`break-all` / `break-words`), never overflow.

## 4. Layout

### Grid and container

- Container: `max-w-[1360px]`, centred, horizontal padding 16px (mobile) / 24px (≥640) /
  40px (≥1024). One shared `Container` component; never re-implement its padding.
- 12-column grid at ≥1024px with hairline column gutters where regions meet. Main/aside
  splits are 8/4 (detail page) and 3/9 (explore: filters/results).
- Regions are separated by full-width 1px `line` rules, not by large empty gaps. Vertical
  rules continue through horizontal ones so the page reads as one woven sheet.

### Spacing

4px base. Allowed steps: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96. Cell padding is 20px
(mobile 16px). Section vertical padding is 40–72px; nothing needs 120px of air.

### Radii

- `2px` — default for controls, tags, code, inputs, buttons.
- `4px` — panels.
- No pill shapes except the status dot. No radius above 6px anywhere.

### Elevation

There are no drop shadows. Depth is expressed by surface colour and hairlines only.

### Component heights

Controls share heights so rows align: 32px (compact: filter rows, copy buttons),
40px (default: inputs, buttons), 44px minimum hit area on touch for anything tappable.

## 5. Components

**Site header.** 56px, bottom hairline, sticky, solid `carbon` (no blur/glass). Left: woven
mark + lowercase wordmark `kitloom`. Centre/left: Explore, Agents (its own page), About. Right: Publish as
the only bordered action. Current route shown by `fg` text plus a 2px lime underline and
`aria-current="page"`. Below 768px the links collapse into a disclosure menu opened by a
labelled button; the menu is a full-width ruled list. Beside Publish sits one quiet text
link: "Sign in" when signed out, "Account" when signed in. Its slot has a reserved width
and stays empty while the session loads, so the header never shifts. No avatar, no
dropdown, no user name in the header.

**Form field.** Label above (14px, weight 500), control, then hint (12px `fg-2`), then error
(12px `danger` with an alert icon, `role="alert"`). Controls: `surface` fill, `line-control`
border, 2px radius, 44px tall; focus turns the border lime; `aria-invalid` turns it
`danger`. Optional fields say "optional" in mono at the right of the label — required is
the default and is not marked with an asterisk. Technical values (URLs, slugs, versions,
tags, licence ids) are set in mono. Errors appear on submit, name the fix, and are tied to
their field with `aria-describedby`; a form-level line states that nothing was saved.

**Choice grid.** Multi-select options (agents, categories) are native checkboxes laid out
as cells in a ruled grid: selected cells take `surface-2` and `fg`, the checkbox itself is
lime (`accent-color`). Never custom-drawn toggles, never pills.

**Inline status line.** Result of a background check (e.g. "Repository found · 12 files ·
README found · MIT"): a `surface` strip with a 2px left rule — lime for success, `danger`
for failure — mono 12px, announced with `aria-live="polite"`.

**Destructive action.** Two steps in place, never a modal: "Delete" swaps to
"Delete permanently" (`danger` border and text) plus "Keep". Confirmed by toast afterwards.

**Wordmark.** A 3×3 over-under weave drawn with strokes: neutral threads with a single lime
weft. Always paired with the text wordmark.

**Search input.** 40–48px, `surface` fill, `line-control` border, leading search icon,
trailing `/` kbd hint when empty and a labelled clear button when filled. Focus: lime ring.

**Filter list.** IDE-sidebar style vertical list. Each row: label left, mono count right.
Selected row: `surface-2` fill, `fg` text, 2px lime left rule, `aria-pressed="true"`. Counts
are computed from the catalog; never typed by hand. On screens below 1024px the filter
groups sit inside a single disclosure above the results.

**Setup cell (the listing card).** A cell in a ruled grid (`gap-px` over a `line`
background), `carbon` fill, `surface` on hover. Contents, top to bottom:
1. Meta line (mono): primary category · version.
2. Name (h3, `fg`) — the whole cell is one link via a stretched anchor.
3. Description, clamped to 3 lines, `fg-2`.
4. Agent names as plain mono text separated by a middot — not pills.
5. Footer meta (mono): `ZIP` · licence or "No licence" · `Free` · creator.
An arrow glyph at the top right shifts 2px on hover. No shadow, no lift, no scale.

**Agent label.** Mono text. In detail contexts it carries its compatibility level in words:
"declared" (plain) or "tested" (success colour + check icon). Never a bare coloured dot.

**Tags.** `#tag` in mono `fg-2`. No backgrounds.

**Buttons.**
- Primary: lime fill, carbon text, 2px radius, weight 600. One per region.
- Secondary: transparent, `line-control` border, `fg` text; hover `surface-2`.
- Ghost/link: `fg` text, underline offset 3px; hover underline lime.
Buttons are real `<button>`s; navigation uses real `<a>`s.

**Copy button.** Compact secondary button with a copy icon and a visible text label.
After a successful `navigator.clipboard.writeText` it reads "Copied" for 2s and announces
via `aria-live`. If the clipboard call fails it says "Copy failed" — it never fakes success.

**File tree.** Mono 13px. Directories are native `<details>` (open by default) with a
chevron; files show their size right-aligned in `fg-2`. Indent guides are 1px
`line-subtle` rules. The container scrolls horizontally if a path is long. Data comes only
from the catalog manifest.

**README preview.** Rendered Markdown inside a ruled panel with a mono header bar showing
`README.md`. Prose styles are scoped under `.prose-kit`. No raw HTML is rendered.

**Definition rows.** Metadata on the detail page is a `<dl>` of ruled rows: mono `fg-2`
term left, value right. Missing values read "Not provided" in `fg-2`.

**Notice.** A ruled block with a 2px left rule in the semantic colour, an icon, and a text
label ("Note", "Caution"). Used for the safety reminder and configuration warnings.

**Toast.** Sonner (`sonner`), bottom-right (bottom-centre on mobile), themed entirely from
tokens: `surface` fill, 1px `line`, 4px radius, no shadow, a 2px left rule (lime for
success, `danger` for errors, `info` for notes), title in sans, description in mono `fg-2`.
The success icon is the small woven mark. Toasts confirm things that really happened —
"Command copied", "Copy failed", "Setup published" — and carry the inspect-first reminder after a download link is
followed. They never announce a successful download (the browser does not tell us) and are
never used for marketing. Critical information is never toast-only.

**Empty state.** A ruled panel with a mono eyebrow stating the state plainly ("0 results"),
one sentence of guidance, the one useful action (clear filters / publish), and the
`EmptyLoom` illustration at the right. No emoji.

**Code block.** `surface` fill, 1px `line`, mono 13px, horizontal scroll, optional header
bar with a label and Copy button.

## 6. Page compositions

**Home `/`** — the working front door, not a marketing page.
- Top band, two columns split by a vertical rule. Left: eyebrow, display headline, one
  sentence, the search form (submits to `/explore?q=`), and the five-step journey as a mono
  line. Right: the real file list of the most recently published setup, labelled with its
  name and linked to its page — showing concretely what "a kit" is. With nothing published
  it explains what a kit is in two sentences instead.
- "By agent": a ruled row of agent cells with real counts, each linking to a filtered Explore.
- "Latest": the newest setups as setup cells, with a link to all.
- "By category": ruled list with descriptions and real counts.
- Publish band: one paragraph and the Publish action.

**Explore `/explore`** — sidebar of filters (3 cols) + results (9 cols). Results header shows
the live count and the sort control. State lives in the URL (`q`, `agent`, `category`,
`sort`) so any view is shareable.

**Setup detail** — breadcrumb; header with name, description, categories, tags; then 8/4:
main column (README, file list with a "what these files do" breakdown, install steps) and a
sticky aside (Download ZIP, source repository with the no-checksum note, compatibility,
metadata rows, "Built from" credits, safety notice).

**Loading and counts.** All listings arrive from the database after the page loads. While
they load, lists show one mono status line with the `StringLoader` ("Loading setups…"), never skeletons or
shimmer, and counts show an em dash — never a zero that might be wrong. A zero is only
shown once the database has answered.

**Setup `/setup?slug=`** — the setup detail composition, rendered in the browser. While
loading it shows one mono status line, not a skeleton. The owner sees
a `surface` band above the header with "Your setup", its visibility, and Edit.

**Built from (credits).** When a creator lists other repositories their setup draws on, the
detail aside shows a "Built from" block between the metadata rows and the safety notice:
`owner/repo` links in mono with an external arrow, one per line, and a one-sentence caption
saying they are the creator's own credits, unchecked, and not part of the download. The
block is absent when there are none. Never styled as badges or logos.

**Publish `/publish`** — 8/4. Main: the publish form (repository link with a "Read from
GitHub" action and its status line, name, URL name, description, agents, categories, tags,
version, licence, and an optional "Built from" list of credited repositories, one per line). Signed out, the same cell holds a single panel explaining why sign-in is
needed, with one primary action. Aside: a numbered "Before you publish" checklist and a
note on why there is a link instead of an upload. There is no file-upload control.

**Sign in `/signin`** — 7/5. Left: one sentence on why, and three plain statements about
what is stored. Right: only the sign-in methods that are actually enabled — provider buttons
(GitHub is the primary one when present), an "or" rule, and an email field that sends a
one-time link. After sending, the panel is replaced by "Check your inbox". No password
field exists anywhere.

**Account `/account`** — header cell with the display name, the signed-in email (shown only
to its owner), Publish and Sign out; then a ruled list of the user's setups with Edit and
the two-step Delete. A hidden listing is labelled in `warning` text.

**Agents `/agents`** — a ledger, not a grid: one full-width ruled row per recognised agent,
in three cells — number, name and vendor (4 cols); up to three setups that declare support,
or one sentence saying there are none (5 cols); the count and one action, Browse or Publish
one (3 cols). The header carries the `Harness` illustration. It must not repeat the
home page layout.

**Page margins.** At 1520px and wider, the space outside the frame is strung with loom
strings (`Gutters`) that respond to the cursor — the one place where motion is driven by the
visitor rather than by time. The feel is physical: a spring per string, slightly
under-damped so a pluck rings and settles in about a second, with a little coupling so
neighbours stir. At rest the strings are plain `line` hairlines; a moving string is lime.
Silent, always. Fixed and behind all content; it listens on the window and never
intercepts clicks or scrolling. Still under reduced motion and on touch devices. Below
1520px the margins stay empty.

**About `/about`** — single reading column with a ruled section index.

**404** — "The thread ends here": states what happened, links to Explore and home, and
shows `SnappedStrings` at the right.

## 7. Motion

Kitloom moves. Motion is part of the identity: threads, looms, knots and kits, drawn in the
carbon-and-lime palette. It comes in three layers, each with its own rules.

### 7.1 Interface motion (GSAP)

Built with **GSAP** (`gsap` + `@gsap/react`'s `useGSAP`, `ScrollTrigger`, `MotionPathPlugin`).

| Moment | Behaviour | Timing |
|---|---|---|
| Page-top entrance | Headline lines and the lead cells rise 14px and fade in, staggered | 0.5s, `power3.out`, spread over 0.4s |
| Section reveal | A section that starts below the fold rises 16px and fades in once at 88% of the viewport | 0.5s, once only |
| Results update | When search/filter/sort changes, result cells fade up 8px | 0.25s, 30ms stagger, capped at 12 cells |
| Mobile menu | Menu rows slide down 6px and fade in | 0.18s |
| Hover / focus | Colour, border, background; a 2px arrow nudge | CSS, 120–160ms |
| Glide (hover between items) | In a group of items, one highlight travels to whichever item the pointer or keyboard focus is on. The leading edge arrives first and the trailing edge follows, so it stretches across the gap like a pulled thread, then its lime edge is plucked. Lists use a left edge, the header nav a bottom edge, grids four corner marks | lead 0.22s / trail 0.46s, `power3.out`; pluck 0.6s `elastic.out`; fades out 90ms after the pointer leaves |

The shared wrapper is `src/components/ui/Reveal.tsx`.

**Glide** lives in `src/components/motion/useGlide.ts`: put its ref on a container and
`data-glide` on each item. It is used by the header nav, Explore filters, every setup grid,
the home agent cells and category rows, the Agents ledger, the publish form's checkbox
grids and the account list. New groups of hoverable items should use it rather than a
per-item hover background. It only attaches with a fine pointer and motion welcome; on
touch or reduced motion the items' own CSS hover applies.

### 7.2 SVG illustrations (GSAP)

A library of animated SVGs in `src/components/motion/`. Timeline illustrations are driven by
one hook, `useSvgMotion`. The strings — page margins, loader, 404 — share one spring
simulation, `stringEngine.ts`, so everything a visitor can touch or wait on moves with the
same physics. Every page has at least one illustration, and each says something about its page.

| Illustration | Where | What it shows |
|---|---|---|
| `WeaveField` | Home hero (fallback for the WebGL loom) | Warp and weft with lime shuttles passing through |
| `ThreadTick` | Every section header | A thread pulled taut and knotted as the section arrives |
| `AgentThreads` | Home, "By agent" | Threads from several agents running into one kit |
| `Harness` | Agents header | A loom harness with one heddle eye per agent: the threads stay put, alternate eyes lift, a lime shuttle carries a weft through the gap, the weft is beaten down into the cloth, and the sets swap |
| `RepoToZip` | Home, publish band | Files leaving a repository and being packed into a ZIP |
| `Shuttle` | Explore header | A shuttle carrying the weft through the warp, row by row |
| `KitUnfold` | Setup detail header | A kit opening, its files rising out to be read |
| `Stitch` | Publish header | A needle stitching a seam, one stitch per step |
| `Latch` | Sign in | A thread looping through a latch — no key, no password |
| `Spool` | Account | Thread winding onto your spool |
| `ScrollThread` | About | A thread let out as you scroll through the page |
| `SnappedStrings` | 404 | The thread you followed has snapped: one lime string hangs in two loose halves, the others still ring now and then, and all of them can be played with the cursor |
| `EmptyLoom` | Every empty state | A threaded loom with one weft waiting |
| `WeftWave` | Footer | A row of warp ends with a wave travelling along it |
| `StringLoader` | Every loading line | A wave of plucks running along a short row of strings |
| `TreeLoader` | Home hero, the "What a kit looks like" panel while it loads | The outline of a kit ruled in row by row with a lime marker stepping down beside it; it fills the panel, which keeps the same height once the real file list arrives and its rows slide in |
| `StitchSampler` | Heddle download dialog | The scan as a cross-stitch sampler in a hoop: one stitch per slice of the repository's files. A lime needle runs back and forth along the rows, like one thread worked across the cloth, and sews a cross for every slice actually read; slices with findings are stitched in the finding's colour, and the faint thread behind shows the path. When the scan ends the needle is parked and a rule in the verdict's colour is drawn underneath. Pure CSS motion (no GSAP): positions come from real progress, so it is always correct and quicker than ambient loops |
| `Gutters` (playable strings) | The margins outside the frame, every page, at 1520px and wider | Loom strings that react to the cursor: they bow away as it comes near, are plucked when it sweeps across, turn lime and vibrate until they settle, and pass movement to their neighbours |

### 7.2a Purl, the pet

Purl is Kitloom's pet: a pixel-art lamb (wool is where yarn starts; a purl is a knitting
stitch) with a lime yarn scarf. Code: `src/components/pet/` — `sprites.ts` (pure pixel data,
tested), `PurlSprite.tsx` (renders a pose), `PurlNook.tsx` (behaviour).

| Where | Mode |
|---|---|
| Explore, under the filters | `PurlNook` gap |
| Setup detail, under the package sidebar (visible when the sidebar is short) | `PurlNook` gap |
| About, under the "On this page" nav | `PurlNook` gap, knitting: a lime scarf grows with reading progress through `#about-content`; at the end Purl holds it up with hearts |
| Publish, under the checklist | `PurlNook` gap |
| Footer, bottom bar | `PurlNook` lane |
| Agents, the ledger | `PurlPlaymate`: Purl sits on an agent's logo tile. Hover another row and it drops what it is doing and flies there in one hop, faster the further it goes, re-aimed mid-air if the cursor moves on (moves are interruptible: `actor.interruptWhen`). On each visit it plays: bounces on the tile (which squashes), spins it (lands dizzy), boops it (it wobbles) or hugs it (hearts, the logo turns lime). Wanders to other tiles on screen and naps on one when the cursor is still |
| About header | `PurlWorkshop`, a pixel diorama of the whole idea: Purl fetches yarn from a basket, the lime shuttle weaves cloth on the loom row by row, the cloth becomes a kit, Purl files it on the shelf (the directory); three kits fill the shelf, then it clears (`lg` and up) |
| Account header, beside the spool (`xl` and up) | `PurlYarnBall`: says hello with a hop, chases a lime yarn ball and nudges it along, naps when left alone, and cheers when the profile or password is saved (`cheerPurl()` in `pet/cheer.ts`) |
| Every page, first visit in a session | `PurlPreloader`: Purl trots across while a lime yarn unwinds behind it, hops on arrival, the curtain lifts |

Scripted scenes (Agents, About header, Account) use `usePurlActor`: an async script of `walkTo`, `hop`,
`pose`, `wait` and `hearts`, which only runs while the stage is on screen and stops on
unmount.

**Agent logos.** `src/components/ui/AgentLogo.tsx`: the vendors' single-colour ("mono") logos
from [thesvg](https://thesvg.org) (`npx @thesvg/cli add <slug> --variant mono`), inlined and
painted in `currentColor`, so they follow the theme: `fg-2`/`fg` at rest, lime when active.
Aider is not in that library, so its mark is Kitloom's own drawing (a code bubble). Logos are
trademarks of their owners and are used only to identify the agent beside its name, so they
are decorative (`aria-hidden`). Used on the Agents tiles, the Explore agent filters, the home
agent cells and the setup page's compatibility list. To refresh one, run the CLI into a
scratch folder (not the repo) and copy the path data.

**Preloader rules.** CSS only, so it plays before any script and always leaves by itself
(about 1.6s), with or without JavaScript. It never takes pointer events, shows once per
browser session (the root layout's inline script sets `html.kl-pre-seen`), and does not
appear with reduced motion.

- **Gap mode.** Put `<PurlNook />` last in a column with `lg:relative`, and mark the element
  above the empty space with `data-pet-roof`. Purl measures the room between the two live as
  the page scrolls or the column changes: plenty of room → it wanders, blinks, flicks an
  ear, watches the cursor and dozes off (Zs) after 25s without pointer movement; room closing
  in → an alarm mark, then scared (wide eyes, wool on end, ears up, trembling, sweat drop);
  room almost gone → squashed flat to fit with `> <` eyes; room back → a hop of relief.
- **Lane mode.** A fixed strip where Purl only wanders.
- Hovering Purl makes it happy: `^ ^`, blushing, lime pixel hearts. Purl takes no pointer
  events (hover is worked out from the cursor position), so it never blocks a control.
- Decorative: `aria-hidden`, hidden below `lg`. Runs only while on screen and while the tab
  is visible. With reduced motion it stands still and simply hides when the room is too small.
- **Deliberate exceptions to §7.2:** Purl is pixel art with solid fills (wool `fg`, face
  `line-control`, eyes `carbon`), not 1–2px line art, and it trembles when scared. Its lime is
  limited to the scarf, the cheeks and the hearts. These exceptions are for Purl only.

Rules for adding one:

- Vocabulary is weaving and kits only: threads, warp, weft, shuttles, needles, knots,
  spools, looms, folders, files. No abstract blobs, particles, or generic "tech" shapes.
- Colour comes from tokens via classes (`stroke-line-control`, `stroke-fg-2`, `fill-lime`…).
  Lime is the moving accent — the active thread — never the whole drawing.
- Strokes are 1–2px, square or butt caps for structure, round only for thread. No fills
  except `carbon` (to mask) and small lime knots. No gradients, glows, or shadows.
- **The markup is the finished drawing.** Animation only adds to it. Without JavaScript,
  or with reduced motion, every illustration is complete, static artwork.
- Loops run only while on screen (the hook pauses them otherwise, using
  IntersectionObserver so it stays correct when listings load and the page grows) and are slow: 3–5s a
  cycle, with a rest between cycles. Nothing flashes, strobes, or shakes.
- Illustrations are decorative: `aria-hidden`, never the only carrier of information, and
  never placed where they compete with a control. Hide them below `md` when space is tight.

### 7.3 WebGL scenes (three.js TSL)

One small scene written with three.js **TSL** node materials on its WebGL 2 backend, in
`src/components/motion/tsl/scenes.ts`, mounted through `TslScene` in `Scenes.tsx`.

| Scene | Where | Fallback |
|---|---|---|
| `loom` — a rippling woven sheet with lime weft threads | Home hero backdrop | `WeaveField` |

Rules:

- A scene is an **enhancement of an SVG**, never a replacement. The SVG renders first and
  stays if WebGL is unavailable, the chunk fails, or any condition below is not met.
- three.js is large. It is loaded only by dynamic import, only when the scene scrolls into
  view, only at `md` width and above, and never when the visitor prefers reduced motion or
  has asked to save data. No page may import `tsl/scenes.ts` statically.
- Scenes render only while on screen and while the tab is visible. Pixel ratio is capped
  at 1.5. One scene per page.
- Unlit, flat, line-based: `MeshBasicNodeMaterial`, token colours read from CSS at mount,
  transparent background. No lighting rigs, bloom, post-processing, textures, or models.
- A scene behind text is masked so it fades out under the copy; body text must keep its
  measured contrast.

### 7.4 Rules for all motion

- Everything runs inside `gsap.matchMedia("(prefers-reduced-motion: no-preference)")` or an
  equivalent check. With reduced motion, nothing is hidden and nothing moves.
- Content must never depend on JavaScript to become visible. Anything pre-hidden for an
  entrance is hidden only under `html.js`, with a CSS fallback that reveals it after 3s.
- Animate `opacity`, `transform` and stroke dash offsets only. No layout properties, no
  scroll-jacking, no parallax.
- Motion never delays interaction: no entrance on a control the user is about to click, and
  no loop inside or directly beside a form field.

## 8. Responsive behaviour

| Width | Behaviour |
|---|---|
| 320–479 | Single column. Header collapses to mark + menu button. Setup cells stack. Metadata rows stack term above value when needed. |
| 480–767 | Single column, wider cells. |
| 768–1023 | Header shows full nav. Setup grid 2 columns. Detail aside moves below the header and above the README so Download stays near the top. |
| 1024–1439 | Full 12-col layouts. Explore sidebar visible. Setup grid 2 columns beside the sidebar. |
| ≥1440 | Setup grid 3 columns; container caps at 1360px. |

No horizontal page scroll at any width. Only code blocks and file trees may scroll
horizontally, inside their own box. Touch targets are at least 44px tall below 1024px.

## 9. Accessibility

- Landmarks: one `header`, `nav` (labelled), `main`, `footer`. A "Skip to content" link is
  the first focusable element.
- One `h1` per page; heading levels never skip.
- Focus: 2px lime outline with 2px offset on every interactive element (`:focus-visible`).
  Never removed.
- Icon-only controls have an accessible name. Decorative icons are `aria-hidden`.
- Filters are buttons with `aria-pressed`; the result count is an `aria-live="polite"` region.
- Keyboard: `/` focuses search (ignored while typing in a field); `Escape` clears the search
  field when it has focus and content.
- External links say where they go and carry `rel="noopener noreferrer"`.
- Body text meets 4.5:1; see the measured table above.

## 10. Voice

Plain, specific, developer-to-developer. Say what a thing is and what will happen. Label
buttons with the action ("Download ZIP", "Read from GitHub", "Clear filters"). Be honest about
limits: "declared by the creator", "not provided", "there is no checksum to verify".
No hype words, no exclamation marks, no emoji.

## 11. Prohibited

Glow gradients; purple/blue "AI" gradients; glassmorphism and backdrop blur; drop shadows;
large rounded cards; decorative blobs, orbs or particles; illustration outside the weaving
vocabulary; WebGL without an SVG fallback; fake terminal windows as decoration; emoji as
identity; pill-badge clusters; stock photos and illustrations; fake statistics, testimonials,
user counts or download counts; login or profile UI that does nothing; sign-in buttons for providers that are not enabled;
password fields; upload controls; any control that does
not do what its label says; `href="#"`.
