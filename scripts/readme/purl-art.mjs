// Generates the README art from Purl's real sprite data (src/components/pet/sprites.ts):
//   docs/assets/purl-banner.svg — Purl trotting across, unwinding a lime yarn (animated)
//   docs/assets/purl-moods.svg  — Purl's moods side by side
//
// GitHub shows README images as plain SVG, without the site's CSS, so the theme tokens are
// written out as hex here (same values as src/app/globals.css). Animation is CSS inside the
// SVG and stops for viewers who prefer reduced motion.
//
// Run: node scripts/readme/purl-art.mjs   (Node 22.18+, which strips TypeScript types)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { composePose, EFFECTS, toRuns } from "../../src/components/pet/sprites.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = join(root, "docs", "assets");

const TOKENS = {
  carbon: "#111318",
  surface: "#1b1e25",
  lime: "#d9ff72",
  fg: "#f2f3f5",
  fg2: "#a7abb5",
  fg3: "#777e8a",
  line: "#343944",
  lineSubtle: "#282c35",
  lineControl: "#6b7280",
};
const FILL = { W: TOKENS.fg, w: TOKENS.fg2, F: TOKENS.lineControl, E: TOKENS.carbon, h: TOKENS.fg, B: TOKENS.lime, S: TOKENS.lime, L: TOKENS.fg2 };

const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const pose = (face, extra = {}) => ({ face, ears: "down", legs: "stand", puff: false, lying: false, ...extra });

/** A grid of pixel rows as rects, `size` px per pixel, at (x, y). */
function pixels(rows, size, x = 0, y = 0, attrs = "") {
  const rects = toRuns(rows)
    .map((run) => `<rect x="${run.x * size}" y="${run.y * size}" width="${run.width * size}" height="${size}" fill="${FILL[run.code]}"/>`)
    .join("");
  return `<g transform="translate(${x} ${y})"${attrs ? ` ${attrs}` : ""}>${rects}</g>`;
}

function banner() {
  const W = 880;
  const H = 260;
  const P = 4; // px per sprite pixel: Purl is 88 × 64
  const ground = 226;
  const purlY = ground - 16 * P;
  const grid = Array.from({ length: Math.floor(W / 80) - 1 }, (_, i) => (i + 1) * 80)
    .map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${TOKENS.lineSubtle}" stroke-width="1"/>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d" shape-rendering="crispEdges">
<title id="t">Kitloom</title>
<desc id="d">Purl, Kitloom's pixel-art lamb, trots across the banner unwinding a lime yarn.</desc>
<style>
  .walk { animation: walk 9s linear -3.2s infinite; }
  .yarn { transform-origin: 0 0; animation: yarn 9s linear -3.2s infinite; }
  .a { animation: step 0.3s steps(1) infinite; }
  .b { animation: step 0.3s steps(1) -0.15s infinite; }
  @keyframes walk { from { transform: translateX(-100px); } to { transform: translateX(${W + 20}px); } }
  @keyframes yarn { 0%, 8% { transform: scaleX(0); } 100% { transform: scaleX(1.02); } }
  @keyframes step { 0% { opacity: 1; } 50% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .walk { animation: none; transform: translateX(${W - 180}px); }
    .yarn { animation: none; transform: scaleX(0.8); }
    .a, .b { animation: none; } .b { opacity: 0; }
  }
</style>
<rect width="${W}" height="${H}" fill="${TOKENS.carbon}"/>
${grid}
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${TOKENS.line}"/>
<rect x="48" y="58" width="14" height="14" fill="${TOKENS.lime}"/>
<text x="74" y="72" font-family="${SANS}" font-size="40" font-weight="600" letter-spacing="-1.2" fill="${TOKENS.fg}" shape-rendering="auto">kitloom</text>
<text x="48" y="108" font-family="${SANS}" font-size="17" fill="${TOKENS.fg2}" shape-rendering="auto">AI coding-agent setups you can inspect, check and download</text>
<text x="48" y="134" font-family="${MONO}" font-size="12" fill="${TOKENS.fg3}" shape-rendering="auto">Claude Code · Codex · Cursor · Antigravity · Gemini CLI · Copilot · Windsurf · opencode · Aider</text>
<line x1="0" y1="${ground + 1}" x2="${W}" y2="${ground + 1}" stroke="${TOKENS.line}"/>
<rect class="yarn" x="0" y="${ground - 4}" width="${W}" height="2" fill="${TOKENS.lime}"/>
<g class="walk">
  ${pixels(composePose(pose("lookRight", { legs: "stepA" })), P, 0, purlY, 'class="a"')}
  ${pixels(composePose(pose("lookRight", { legs: "stepB" })), P, 0, purlY, 'class="b"')}
</g>
</svg>
`;
}

function moods() {
  const W = 880;
  const H = 210;
  const P = 4;
  const ground = 150;
  const slot = W / 5;
  const items = [
    { label: "wandering", rows: composePose(pose("open")) },
    { label: "happy", rows: composePose(pose("love", { ears: "wiggle" })), effect: "heart" },
    { label: "scared", rows: composePose(pose("scared", { ears: "perk", puff: true })), effect: "drop" },
    { label: "squished", rows: composePose(pose("squished", { legs: "splay" })), squash: 0.5 },
    { label: "asleep", rows: composePose(pose("sleep", { legs: "none", lying: true })), effect: "z" },
  ];

  const art = items
    .map((item, index) => {
      const cx = slot * index + slot / 2;
      const x = cx - (22 * P) / 2;
      const y = ground - 16 * P;
      const sprite = item.squash
        ? `<g transform="translate(${cx} ${ground}) scale(${1 + (1 - item.squash) * 0.6} ${item.squash}) translate(${-cx} ${-ground})">${pixels(item.rows, P, x, y)}</g>`
        : pixels(item.rows, P, x, y);
      let effect = "";
      if (item.effect === "heart") effect = pixels([...EFFECTS.heart], 3, x + 66, y - 18) + pixels([...EFFECTS.heart], 2, x + 12, y - 8);
      if (item.effect === "drop") effect = pixels([...EFFECTS.drop], 3, x + 78, y + 10);
      if (item.effect === "z") effect = pixels([...EFFECTS.z], 3, x + 72, y + 2) + pixels([...EFFECTS.z], 2, x + 88, y - 10);
      const label = `<text x="${cx}" y="${ground + 34}" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${TOKENS.fg2}" shape-rendering="auto">${item.label}</text>`;
      return sprite + effect + label;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d" shape-rendering="crispEdges">
<title id="t">Purl's moods</title>
<desc id="d">Purl wandering, happy with hearts, scared, squished flat, and asleep.</desc>
<rect width="${W}" height="${H}" fill="${TOKENS.carbon}"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${TOKENS.line}"/>
${Array.from({ length: 4 }, (_, i) => `<line x1="${slot * (i + 1)}" y1="0" x2="${slot * (i + 1)}" y2="${H}" stroke="${TOKENS.lineSubtle}"/>`).join("")}
<line x1="0" y1="${ground + 1}" x2="${W}" y2="${ground + 1}" stroke="${TOKENS.line}"/>
${art}
</svg>
`;
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "purl-banner.svg"), banner());
writeFileSync(join(out, "purl-moods.svg"), moods());
console.log("Wrote docs/assets/purl-banner.svg and docs/assets/purl-moods.svg");
