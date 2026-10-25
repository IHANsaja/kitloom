/**
 * Purl, Kitloom's pet: a pixel-art lamb in a lime yarn scarf. Wool is where yarn starts,
 * and a purl is a knitting stitch.
 *
 * Pure data. A sprite is a 22 × 16 pixel grid: 14 rows of body (wool, face, scarf) and 2
 * rows of legs. Every pose is the base body plus small patches, so the lamb is drawn once
 * and every expression is only the pixels that differ.
 */

export const COLS = 22;
export const BODY_ROWS = 14;
export const ROWS = 16;
/** CSS pixels per sprite pixel. */
export const PX = 3;
export const WIDTH = COLS * PX;
export const HEIGHT = ROWS * PX;

/** Pixel codes → token fill classes. Colour only ever comes from the theme. */
export const PIXEL_CLASS = {
  W: "fill-fg", // wool
  w: "fill-fg-2", // wool curl
  F: "fill-line-control", // face and ears
  E: "fill-carbon", // eyes, mouth
  h: "fill-fg", // eye shine
  B: "fill-lime", // cheeks
  S: "fill-lime", // the scarf: the one lime thread
  L: "fill-fg-2", // legs
} as const;

export type PixelCode = keyof typeof PIXEL_CLASS;

export type Face =
  | "open"
  | "lookLeft"
  | "lookRight"
  | "blink"
  | "happy"
  | "love"
  | "scared"
  | "squished"
  | "sleep"
  | "sad"
  | "wink"
  | "starry"
  | "eager"
  | "curious"
  | "worried"
  | "determined"
  | "graze";
export type Ears = "down" | "perk" | "wiggle";
export type Legs = "stand" | "stepA" | "stepB" | "tuck" | "splay" | "none";

export interface Pose {
  face: Face;
  ears: Ears;
  legs: Legs;
  /** Wool standing on end (scared). */
  puff: boolean;
  /** Lying down: the body sits two rows lower and the legs are folded away. */
  lying: boolean;
}

export const RESTING_POSE: Pose = { face: "open", ears: "down", legs: "stand", puff: false, lying: false };

const BODY = [
  "........WW.WW.........",
  "......WWWWWWWWW.......",
  "....WWWWWWWWWWWWW.....",
  "..FFWWWFFFFFFFWWWFF...",
  "..FFWWFFFFFFFFFWWFF...",
  "...WWWFFFFFFFFFWWW....",
  "..WWWWFFFFFFFFFWWWW...",
  "..WWWWFFFFFFFFFWWWW...",
  "..WWWWWFFFFFFFWWWWW...",
  ".WWWWWSSSSSSSSSWWWWW..",
  ".WWwWWWWWWWWWSWWWwWW..",
  ".WWWWWWwWWWWWSWWWWWW..",
  "..WWWWWWWWWwWWWWWWW...",
  "...WWWWWWWWWWWWWWW....",
];

type Patch = readonly [x: number, y: number, code: PixelCode | "."];

/** Eyes: 2 × 2 with a shine in the lower corner, `dx` shifts both to look sideways. */
function eyes(dx: number): Patch[] {
  return [7, 12].flatMap((x) => [
    [x + dx, 5, "E"],
    [x + dx + 1, 5, "E"],
    [x + dx, 6, "E"],
    [x + dx + 1, 6, "h"],
  ] as Patch[]);
}

const CHEEKS: Patch[] = [
  [7, 7, "B"],
  [13, 7, "B"],
];

const FACES: Record<Face, Patch[]> = {
  open: [...eyes(0), ...CHEEKS, [10, 8, "E"]],
  lookLeft: [...eyes(-1), ...CHEEKS, [9, 8, "E"]],
  lookRight: [...eyes(1), ...CHEEKS, [11, 8, "E"]],
  blink: [[7, 6, "E"], [8, 6, "E"], [12, 6, "E"], [13, 6, "E"], ...CHEEKS, [10, 8, "E"]],
  // ^ ^ and a wide smile
  happy: [[7, 6, "E"], [8, 5, "E"], [9, 6, "E"], [11, 6, "E"], [12, 5, "E"], [13, 6, "E"], ...CHEEKS, [9, 8, "E"], [10, 8, "E"], [11, 8, "E"]],
  // Eyes squeezed into little hearts' worth of joy: ^ ^ with blushing cheeks doubled
  love: [[7, 6, "E"], [8, 5, "E"], [9, 6, "E"], [11, 6, "E"], [12, 5, "E"], [13, 6, "E"], [6, 7, "B"], [7, 7, "B"], [13, 7, "B"], [14, 7, "B"], [10, 7, "E"], [10, 8, "E"]],
  // Wide eyes, pupils shrunk to a dot in the middle, mouth an open "o"
  scared: [[7, 4, "E"], [8, 4, "E"], [7, 5, "E"], [8, 5, "h"], [7, 6, "E"], [8, 6, "E"], [12, 4, "E"], [13, 4, "E"], [12, 5, "h"], [13, 5, "E"], [12, 6, "E"], [13, 6, "E"], [10, 7, "E"], [10, 8, "E"]],
  // > <
  squished: [[7, 5, "E"], [8, 6, "E"], [7, 7, "E"], [13, 5, "E"], [12, 6, "E"], [13, 7, "E"], [9, 8, "E"], [11, 8, "E"]],
  sleep: [[7, 6, "E"], [8, 6, "E"], [12, 6, "E"], [13, 6, "E"], ...CHEEKS],
  // Eyes looking down, brows tilted, a small frown
  sad: [[7, 6, "E"], [8, 6, "E"], [12, 6, "E"], [13, 6, "E"], [8, 4, "E"], [12, 4, "E"], [9, 8, "E"], [10, 7, "E"], [11, 8, "E"]],
  // One eye open, one closed, a sideways grin: welcome aboard
  wink: [[7, 5, "E"], [8, 5, "E"], [7, 6, "E"], [8, 6, "h"], [12, 6, "E"], [13, 6, "E"], [13, 5, "E"], ...CHEEKS, [10, 8, "E"], [11, 8, "E"], [12, 7, "E"]],
  // Lime, shining eyes and a wide smile: delighted
  starry: [[7, 5, "S"], [8, 5, "S"], [7, 6, "S"], [8, 6, "h"], [12, 5, "S"], [13, 5, "S"], [12, 6, "S"], [13, 6, "h"], [9, 7, "E"], [9, 8, "E"], [10, 8, "E"], [11, 8, "E"], [11, 7, "E"]],
  // Bright eyes looking up, open happy mouth: ready to go
  eager: [[7, 4, "E"], [8, 4, "h"], [7, 5, "E"], [8, 5, "E"], [12, 4, "E"], [13, 4, "h"], [12, 5, "E"], [13, 5, "E"], ...CHEEKS, [9, 7, "E"], [10, 7, "E"], [11, 7, "E"], [10, 8, "E"]],
  // One brow up, one eye wide, a small "o": hm, what is this?
  curious: [[7, 5, "E"], [8, 5, "E"], [7, 6, "E"], [8, 6, "h"], [12, 3, "E"], [13, 3, "E"], [12, 4, "E"], [13, 4, "E"], [12, 5, "E"], [13, 5, "h"], [12, 6, "E"], [13, 6, "E"], [10, 8, "E"]],
  // Brows tilted up in the middle, a wobbly frown: oh no
  worried: [[8, 3, "E"], [9, 4, "E"], [12, 3, "E"], [11, 4, "E"], [7, 5, "E"], [8, 5, "E"], [7, 6, "E"], [8, 6, "h"], [12, 5, "E"], [13, 5, "E"], [12, 6, "E"], [13, 6, "h"], [9, 8, "E"], [10, 7, "E"], [11, 8, "E"]],
  // Brows down, eyes narrowed, mouth set: on guard
  determined: [[7, 4, "E"], [8, 5, "E"], [13, 4, "E"], [12, 5, "E"], [7, 6, "E"], [8, 6, "E"], [12, 6, "E"], [13, 6, "E"], [9, 8, "E"], [10, 8, "E"], [11, 8, "E"]],
  // Eyes lowered to the grass, one mouthful of clover: grazing, head down
  graze: [[7, 7, "E"], [8, 7, "E"], [12, 7, "E"], [13, 7, "E"], ...CHEEKS, [10, 8, "E"]],
};

export const FACE_NAMES = Object.keys(FACES) as Face[];
export const EAR_NAMES: Ears[] = ["down", "perk", "wiggle"];
export const LEG_NAMES: Legs[] = ["stand", "stepA", "stepB", "tuck", "splay", "none"];

const EAR_PIXELS: Patch[] = [
  [2, 3, "."], [3, 3, "."], [2, 4, "."], [3, 4, "."],
  [17, 3, "."], [18, 3, "."], [17, 4, "."], [18, 4, "."],
];

const EARS: Record<Ears, Patch[]> = {
  down: [],
  // Both ears straight out and up: alarm
  perk: [...EAR_PIXELS, [1, 2, "F"], [2, 2, "F"], [2, 3, "F"], [3, 3, "F"], [18, 2, "F"], [19, 2, "F"], [17, 3, "F"], [18, 3, "F"]],
  // Left ear flicks up
  wiggle: [[2, 3, "."], [3, 3, "."], [2, 4, "."], [3, 4, "."], [1, 2, "F"], [2, 2, "F"], [2, 3, "F"], [3, 3, "F"]],
};

const PUFF: Patch[] = [[7, 0, "W"], [10, 0, "W"], [14, 0, "W"], [4, 1, "W"], [16, 1, "W"], [3, 2, "W"], [17, 2, "W"], [0, 10, "W"], [20, 10, "W"]];

const LEG_COLUMNS = [4, 8, 12, 16];

function legRows(legs: Legs): string[] {
  const rows = [Array<string>(COLS).fill("."), Array<string>(COLS).fill(".")];
  const put = (x: number, depth: number) => {
    rows.slice(0, depth).forEach((row) => {
      row[x] = "L";
      row[x + 1] = "L";
    });
  };
  switch (legs) {
    case "stand":
      LEG_COLUMNS.forEach((x) => put(x, 2));
      break;
    case "stepA":
      LEG_COLUMNS.forEach((x, i) => put(x, i % 2 === 0 ? 1 : 2));
      break;
    case "stepB":
      LEG_COLUMNS.forEach((x, i) => put(x, i % 2 === 0 ? 2 : 1));
      break;
    case "tuck":
      LEG_COLUMNS.forEach((x) => put(x, 1));
      break;
    case "splay":
      [2, 6, 14, 18].forEach((x) => put(x, 1));
      break;
    case "none":
      break;
  }
  return rows.map((row) => row.join(""));
}

/** The full 22 × 16 grid for a pose, top row first. "." is transparent. */
export function composePose(pose: Pose): string[] {
  const grid = BODY.map((row) => row.split(""));
  const apply = (patches: Patch[]) => {
    for (const [x, y, code] of patches) {
      if (grid[y]?.[x] !== undefined) grid[y][x] = code;
    }
  };
  apply(EARS[pose.ears]);
  if (pose.puff) apply(PUFF);
  apply(FACES[pose.face]);
  const body = grid.map((row) => row.join(""));
  if (pose.lying) {
    const blank = ".".repeat(COLS);
    return [blank, blank, ...body];
  }
  return [...body, ...legRows(pose.legs)];
}

export interface Run {
  x: number;
  y: number;
  width: number;
  code: PixelCode;
}

/** Merges horizontal runs of one colour so a pose is a few dozen rects, not hundreds. */
export function toRuns(rows: string[]): Run[] {
  const runs: Run[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const code = row[x] ?? ".";
      let end = x + 1;
      while (end < row.length && row[end] === code) end += 1;
      if (code in PIXEL_CLASS) runs.push({ x, y, width: end - x, code: code as PixelCode });
      x = end;
    }
  });
  return runs;
}

/** Pixel hearts, Zs, the alarm mark and a sweat drop: tiny effects drawn beside the lamb. */
export const EFFECTS = {
  heart: [".B.B.", "BBBBB", "BBBBB", ".BBB.", "..B.."],
  // Props for the account emails
  sparkle: ["..B..", ".BBB.", "BBBBB", ".BBB.", "..B.."],
  key: [".www.....", "w...wwwww", "w...w.w.w", ".www....."],
  envelope: ["WWWWWWW", "WW...WW", "W.W.W.W", "W..W..W", "WWWWWWW"],
  question: [".WWW.", "W...W", "...W.", "..W..", ".....", "..W.."],
  lock: [".www.", "w...w", "w...w", "WWWWW", "WWEWW", "WWEWW", "WWWWW"],
  z: ["WWW", "..W", ".W.", "WWW"],
  bang: ["W", "W", "W", ".", "W"],
  drop: [".w.", "www", ".w."],
  // A small bleat: a quaver note
  note: ["..SS", "..S.", "..S.", "SSS.", "SS.."],
  // Two knitting needles crossed over a lime stitch
  needles: ["w.......w", ".w.....w.", "..w...w..", "...wSw...", "....S...."],
  // A ball of lime yarn with a loose end
  ball: [".SSS..", "SSwSS.", "SwSSS.", ".SSS.S"],
} as const;
