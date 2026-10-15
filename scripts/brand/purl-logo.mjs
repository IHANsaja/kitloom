// Generates Kitloom's logo files from the mark data the site draws (src/components/ui/logo.ts):
//   src/app/icon.svg                      — the favicon
//   public/brand/kitloom-logo.svg         — the mark: lime tile, carbon k
//   public/brand/kitloom-logo-inverse.svg — carbon tile, lime k (only on lime backgrounds)
//   public/brand/kitloom-lockup.svg       — mark + wordmark, for dark backgrounds
//   public/brand/kitloom-lockup-light.svg — mark + wordmark, for light backgrounds
//
// Lockup proportions follow design.md §5 "Wordmark": the wordmark is 0.78 × the mark's
// height, 0.3 × away from it. The word is drawn from outlines (src/components/ui/wordmark.ts),
// so the lockups look the same everywhere, with no font to load.
//
// Run: node scripts/brand/purl-logo.mjs   (Node 22.18+, which strips TypeScript types)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MARK, MARK_GRID } from "../../src/components/ui/logo.ts";
import { WORDMARK } from "../../src/components/ui/wordmark.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const LIME = "#d9ff72";
const CARBON = "#111318";
const FG = "#f2f3f5";

const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** The mark's shapes as SVG markup, in its own 32-unit coordinates. */
function markShapes({ tile, ink }) {
  const color = { tile, ink, cut: tile };
  return MARK.map(({ el, tone, attrs, stroke }) => {
    const props = Object.entries(attrs).map(([key, value]) => `${kebab(key)}="${value}"`);
    props.push(stroke ? `fill="none" stroke="${color[tone]}" stroke-width="${stroke}" stroke-linecap="round"` : `fill="${color[tone]}"`);
    return `<${el} ${props.join(" ")}/>`;
  }).join("");
}

function mark(colors, size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_GRID} ${MARK_GRID}"${size ? ` width="${size}" height="${size}"` : ""} role="img" aria-labelledby="t">
<title id="t">Kitloom</title>
${markShapes(colors)}
</svg>
`;
}

function lockup(text) {
  const s = MARK_GRID;
  const k = (s * 0.78) / WORDMARK.fontSize;
  const x = s * 1.3;
  const baseline = s * 0.72;
  const width = Math.ceil(x + (WORDMARK.bbox.x + WORDMARK.bbox.width) * k + 1);
  const r = (n) => +n.toFixed(3);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${s}" width="${width * 4}" height="${s * 4}" role="img" aria-labelledby="t">
<title id="t">Kitloom</title>
${markShapes({ tile: LIME, ink: CARBON })}
<path d="${WORDMARK.paths.join(" ")}" fill="${text}" transform="translate(${r(x)} ${r(baseline - WORDMARK.baseline * k)}) scale(${r(k)})"/>
</svg>
`;
}

const brand = join(root, "public", "brand");
mkdirSync(brand, { recursive: true });
writeFileSync(join(root, "src", "app", "icon.svg"), mark({ tile: LIME, ink: CARBON }));
writeFileSync(join(brand, "kitloom-logo.svg"), mark({ tile: LIME, ink: CARBON }, 512));
writeFileSync(join(brand, "kitloom-logo-inverse.svg"), mark({ tile: CARBON, ink: LIME }, 512));
writeFileSync(join(brand, "kitloom-lockup.svg"), lockup(FG));
writeFileSync(join(brand, "kitloom-lockup-light.svg"), lockup(CARBON));
console.log("Wrote src/app/icon.svg and public/brand/kitloom-{logo,logo-inverse,lockup,lockup-light}.svg");
