/**
 * The Kitloom mark, the "woolly k": a lowercase k on a lime tile, drawn as Purl. The stem is
 * Purl's fleece, the arm is Purl's head in profile (wool crown, lime eye and cheek), the
 * lime scarf sits at the neck, and the k's leg is the scarf's tail with a stripe and fringe.
 *
 * Pure data on a 32 × 32 grid, so the site (`LogoMark`) and the generated files
 * (`scripts/brand/purl-logo.mjs`: favicon, standalone logos, lockup; `scripts/readme/purl-art.mjs`)
 * draw exactly the same shapes. Rules for using it: design.md §5 "Wordmark".
 */

export const MARK_GRID = 32;

/** tile: the lime square. ink: the k and Purl, carbon. cut: lime details cut into the ink. */
export type MarkTone = "tile" | "ink" | "cut";

export interface MarkShape {
  el: "rect" | "circle" | "ellipse" | "polygon" | "path";
  tone: MarkTone;
  attrs: Readonly<Record<string, string | number>>;
  /** Drawn as a round-capped line of this width instead of a fill. */
  stroke?: number;
}

export const MARK: readonly MarkShape[] = [
  { el: "rect", tone: "tile", attrs: { width: 32, height: 32, rx: 7 } },
  // Stem: Purl's fleece, with a woolly left edge and top.
  { el: "rect", tone: "ink", attrs: { x: 7, y: 8, width: 5.2, height: 18, rx: 2.6 } },
  { el: "circle", tone: "ink", attrs: { cx: 7.2, cy: 10.4, r: 2.3 } },
  { el: "circle", tone: "ink", attrs: { cx: 6.8, cy: 14.8, r: 2.3 } },
  { el: "circle", tone: "ink", attrs: { cx: 6.8, cy: 19.2, r: 2.3 } },
  { el: "circle", tone: "ink", attrs: { cx: 7.2, cy: 23.6, r: 2.3 } },
  { el: "circle", tone: "ink", attrs: { cx: 9.2, cy: 7.2, r: 2.6 } },
  { el: "circle", tone: "ink", attrs: { cx: 12, cy: 7.8, r: 2.2 } },
  // Arm: neck, head and wool crown.
  { el: "polygon", tone: "ink", attrs: { points: "11.5,14 16.6,10.4 19.2,15.6 11.5,19.6" } },
  { el: "ellipse", tone: "ink", attrs: { cx: 21, cy: 12.6, rx: 5.4, ry: 4.3, transform: "rotate(-18 21 12.6)" } },
  { el: "circle", tone: "ink", attrs: { cx: 17.6, cy: 9, r: 2.4 } },
  { el: "circle", tone: "ink", attrs: { cx: 20.6, cy: 7.8, r: 2.4 } },
  // Leg: the scarf's tail.
  { el: "polygon", tone: "ink", attrs: { points: "13,17.5 17,16.4 25.6,25 22.6,27.6" } },
  // Eye and cheek.
  { el: "circle", tone: "cut", attrs: { cx: 22.6, cy: 11.6, r: 1.1 } },
  { el: "circle", tone: "cut", attrs: { cx: 24.2, cy: 14.1, r: 0.75 } },
  // Scarf at the neck: two close lines that read as one band at small sizes.
  { el: "path", tone: "cut", attrs: { d: "M14.78 11.5 L16.68 16.9" }, stroke: 1.2 },
  { el: "path", tone: "cut", attrs: { d: "M16.22 10.9 L18.12 16.3" }, stroke: 1.2 },
  // The tail's stripe and three-thread fringe.
  { el: "path", tone: "cut", attrs: { d: "M18.3 22.9 L20.8 20.5" }, stroke: 1 },
  { el: "path", tone: "cut", attrs: { d: "M23.7 24.5 L25.3 26.1" }, stroke: 0.6 },
  { el: "path", tone: "cut", attrs: { d: "M23 25.2 L24.6 26.8" }, stroke: 0.6 },
  { el: "path", tone: "cut", attrs: { d: "M22.3 25.8 L23.9 27.4" }, stroke: 0.6 },
];
