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

Character: technical, precise, crafted, quiet. Dense enough for developers; never cramped.

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
- **Mono:** Geist Mono — technical metadata only: versions, file paths, checksums, slugs,
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
- Long slugs, URLs, and checksums must wrap (`break-all` / `break-words`), never overflow.

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
mark + lowercase wordmark `kitloom`. Centre/left: Explore, Agents, About. Right: Publish as
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
"Checksum copied", "Copy failed" — and carry the checksum reminder after a download link is
followed. They never announce a successful download (the browser does not tell us) and are
never used for marketing. Critical information is never toast-only.

**Empty state.** A ruled panel with a mono eyebrow stating the state plainly ("0 results"),
one sentence of guidance, and the one useful action (clear filters / publish). No
illustration, no emoji.

**Code block.** `surface` fill, 1px `line`, mono 13px, horizontal scroll, optional header
bar with a label and Copy button.

## 6. Page compositions

**Home `/`** — the working front door, not a marketing page.
- Top band, two columns split by a vertical rule. Left: eyebrow, display headline, one
  sentence, the search form (submits to `/explore?q=`), and the five-step journey as a mono
  line. Right: the real file manifest of a real catalog entry, labelled with its name and
  linked to its page — showing concretely what "a kit" is.
- "By agent": a ruled row of agent cells with real counts, each linking to a filtered Explore.
- "Latest": the newest setups as setup cells, with a link to all.
- "By category": ruled list with descriptions and real counts.
- Publish band: one paragraph and the Publish action.

**Explore `/explore`** — sidebar of filters (3 cols) + results (9 cols). Results header shows
the live count and the sort control. State lives in the URL (`q`, `agent`, `category`,
`sort`) so any view is shareable.

**Setup detail `/setups/[slug]`** — breadcrumb; header with name, description, agents, tags;
then 8/4: main column (README, file manifest, install steps, release notes) and a sticky
aside (download panel, checksum, metadata rows, source link, safety notice).

**Community setup `/setup?slug=`** — the same composition as the setup detail page, rendered
in the browser. While loading it shows one mono status line, not a skeleton. The owner sees
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

**About `/about`** — single reading column with a ruled section index.

**404** — states what happened and links to Explore.

## 7. Motion

Motion is built with **GSAP** (`gsap` + `@gsap/react`'s `useGSAP`, plus `ScrollTrigger`).
It is used with restraint: motion explains structure (threads assembling into a sheet), it
never decorates.

| Moment | Behaviour | Timing |
|---|---|---|
| Page-top entrance | Headline lines and the lead cells rise 14px and fade in, staggered | 0.5s, `power3.out`, staggered across 0.4s |
| Section reveal | A section that starts below the fold rises 16px and fades in once when it reaches 88% of the viewport | 0.5s, once only |
| Results update | When search/filter/sort changes, result cells fade up 8px | 0.25s, 30ms stagger, capped at 12 cells |
| Mobile menu | Menu rows slide down 6px and fade in | 0.18s |
| Hover / focus | Colour, border, background; a 2px arrow nudge | CSS, 120–160ms |

Rules:

- All GSAP code lives in Client Components and goes through `useGSAP` so it is reverted on
  unmount. The shared wrapper is `src/components/ui/Reveal.tsx`; prefer it to ad-hoc tweens.
- Everything is wrapped in `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`.
  With reduced motion, nothing is hidden and nothing moves.
- Content must never depend on JavaScript to become visible. Entrance items are pre-hidden
  only under `html.js`, and a CSS fallback reveals them after 3s if GSAP never runs.
  Below-the-fold reveals are hidden by GSAP itself, only when they start off-screen.
- Animate `opacity` and `transform` only. No layout properties, no scroll-jacking, no
  parallax, no looping or idle animation, no animated gradients.
- No animation may delay interaction: nothing longer than 0.6s, no entrance on controls
  the user is about to click.

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
buttons with the action ("Download ZIP", "Copy checksum", "Clear filters"). Be honest about
limits: "declared by the creator", "not provided", "a checksum proves integrity, not safety".
No hype words, no exclamation marks, no emoji.

## 11. Prohibited

Glow gradients; purple/blue "AI" gradients; glassmorphism and backdrop blur; drop shadows;
large rounded cards; decorative blobs or orbs; fake terminal windows as decoration; emoji as
identity; pill-badge clusters; stock photos and illustrations; fake statistics, testimonials,
user counts or download counts; login or profile UI that does nothing; sign-in buttons for providers that are not enabled;
password fields; upload controls; any control that does
not do what its label says; `href="#"`.
