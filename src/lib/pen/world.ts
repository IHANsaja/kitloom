import { GRID, type WorldPoint } from "@/lib/pen/iso";

/**
 * The farm, in tile coordinates. 18 × 18 isometric tiles: a fenced sheep pen in the middle,
 * a barn and a chicken coop behind it, a pond to the east, crops to the west, and a path in
 * from the bottom edge where visitors arrive.
 */

export const PEN = { x0: 4, y0: 4, x1: 13, y1: 13 } as const;
export const GATE = { x: 9, y: 13 } as const;
export const BARN = { x0: 1, y0: 1, x1: 3, y1: 3 } as const;
export const POND = { x0: 14, y0: 1, x1: 16, y1: 3 } as const;
export const CROPS = { x0: 1, y0: 8, x1: 3, y1: 15 } as const;

export const PURL_HOME: WorldPoint = { x: 9.5, y: 9.5 };
export const NAP_SPOT: WorldPoint = { x: 11.6, y: 6.4 };
export const SHELTER_SPOT: WorldPoint = { x: 11.6, y: 6.4 };
export const HAY_SPOT: WorldPoint = { x: 10.6, y: 10.6 };
export const VISITOR_SPAWN: WorldPoint = { x: 9.5, y: 16.5 };

export const GRAZE_SPOTS: readonly WorldPoint[] = [
  { x: 6.5, y: 7.5 },
  { x: 8.5, y: 10.5 },
  { x: 10.5, y: 8.5 },
  { x: 7.5, y: 10.5 },
  { x: 9.5, y: 6.5 },
  { x: 11.5, y: 9.5 },
  { x: 6.5, y: 9.5 },
  { x: 8.5, y: 6.5 },
  { x: 9.5, y: 11.5 },
];

export type TileKind = "grass" | "path" | "crop" | "water";

const PATH_TILES = new Set<string>();
// The lane from the bottom edge to the gate, worn dirt just inside it, and a cross lane.
for (let y = 14; y <= 17; y += 1) PATH_TILES.add(`${GATE.x},${y}`);
PATH_TILES.add(`${GATE.x},12`);
for (let x = 2; x <= 14; x += 1) PATH_TILES.add(`${x},16`);

export function inGrid(i: number, j: number): boolean {
  return i >= 0 && j >= 0 && i < GRID && j < GRID;
}

export function inRect(i: number, j: number, rect: { x0: number; y0: number; x1: number; y1: number }): boolean {
  return i >= rect.x0 && i <= rect.x1 && j >= rect.y0 && j <= rect.y1;
}

export function tileKind(i: number, j: number): TileKind {
  if (inRect(i, j, POND)) return "water";
  if (inRect(i, j, CROPS)) return "crop";
  if (PATH_TILES.has(`${i},${j}`)) return "path";
  return "grass";
}

export function isFenceTile(i: number, j: number): boolean {
  if (i === GATE.x && j === GATE.y) return false;
  const onHorizontal = (j === PEN.y0 || j === PEN.y1) && i >= PEN.x0 && i <= PEN.x1;
  const onVertical = (i === PEN.x0 || i === PEN.x1) && j >= PEN.y0 && j <= PEN.y1;
  return onHorizontal || onVertical;
}

export type PropKind = "barn" | "coop" | "tree" | "shelter" | "trough" | "hay" | "basket" | "lamp" | "scarecrow" | "bush" | "rock";

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  variant: number;
}

/** Static farm objects, drawn in depth order with the living actors. */
export const PROPS: readonly Prop[] = [
  { kind: "barn", x: 3.6, y: 3.7, variant: 0 },
  { kind: "coop", x: 5.8, y: 2.7, variant: 0 },
  { kind: "tree", x: 1.0, y: 6.3, variant: 0 },
  { kind: "tree", x: 16.3, y: 7.2, variant: 1 },
  { kind: "tree", x: 15.7, y: 16.3, variant: 2 },
  { kind: "tree", x: 0.9, y: 16.6, variant: 1 },
  { kind: "tree", x: 16.0, y: 11.6, variant: 0 },
  { kind: "shelter", x: 12.2, y: 5.8, variant: 0 },
  { kind: "trough", x: 5.7, y: 5.7, variant: 0 },
  { kind: "hay", x: 11.8, y: 11.7, variant: 0 },
  { kind: "basket", x: 6.7, y: 11.6, variant: 0 },
  { kind: "lamp", x: 8.3, y: 14.6, variant: 0 },
  { kind: "lamp", x: 13.7, y: 14.4, variant: 1 },
  { kind: "scarecrow", x: 2.2, y: 9.2, variant: 0 },
  { kind: "bush", x: 3.4, y: 6.4, variant: 0 },
  { kind: "bush", x: 15.2, y: 10.2, variant: 1 },
  { kind: "bush", x: 4.5, y: 17.0, variant: 0 },
  { kind: "rock", x: 7.2, y: 17.1, variant: 0 },
  { kind: "rock", x: 14.2, y: 4.2, variant: 1 },
];

const BLOCKED = new Set<string>();

function block(i: number, j: number) {
  BLOCKED.add(`${i},${j}`);
}

for (let i = BARN.x0; i <= BARN.x1; i += 1) for (let j = BARN.y0; j <= BARN.y1; j += 1) block(i, j);
for (let i = POND.x0; i <= POND.x1; i += 1) for (let j = POND.y0; j <= POND.y1; j += 1) block(i, j);
for (let i = CROPS.x0; i <= CROPS.x1; i += 1) for (let j = CROPS.y0; j <= CROPS.y1; j += 1) block(i, j);
for (let i = PEN.x0; i <= PEN.x1; i += 1) {
  if (isFenceTile(i, PEN.y0)) block(i, PEN.y0);
  if (isFenceTile(i, PEN.y1)) block(i, PEN.y1);
}
for (let j = PEN.y0; j <= PEN.y1; j += 1) {
  if (isFenceTile(PEN.x0, j)) block(PEN.x0, j);
  if (isFenceTile(PEN.x1, j)) block(PEN.x1, j);
}
// Furniture: the pen's trough, hay stack and yarn basket are not walk-through.
block(5, 5);
block(11, 11);
block(6, 11);
block(12, 5);
for (const prop of PROPS) {
  if (prop.kind === "lamp" || prop.kind === "coop" || prop.kind === "tree" || prop.kind === "bush" || prop.kind === "rock" || prop.kind === "hay" || prop.kind === "basket") {
    block(Math.floor(prop.x), Math.floor(prop.y));
  }
}

export function isBlockedTile(i: number, j: number): boolean {
  if (!inGrid(i, j)) return true;
  return BLOCKED.has(`${i},${j}`);
}

/** Visitors may go anywhere on the farm except water, crops, buildings, fences and props. */
export function isDevWalkable(i: number, j: number): boolean {
  return !isBlockedTile(i, j);
}

/** Purl stays inside the pen and steps around its furniture. */
export function isPurlWalkable(i: number, j: number): boolean {
  if (i < PEN.x0 + 1 || i > PEN.x1 - 1 || j < PEN.y0 + 1 || j > PEN.y1 - 1) return false;
  return !isBlockedTile(i, j);
}

export function isInsidePen(x: number, y: number): boolean {
  return x > PEN.x0 && x < PEN.x1 + 1 && y > PEN.y0 && y < PEN.y1 + 1;
}

/** Breadth-first search for the closest tile that suits the walker. */
export function nearestWalkableTile(
  i: number,
  j: number,
  walkable: (i: number, j: number) => boolean,
): { i: number; j: number } | null {
  const startI = Math.max(0, Math.min(GRID - 1, Math.floor(i)));
  const startJ = Math.max(0, Math.min(GRID - 1, Math.floor(j)));
  if (walkable(startI, startJ)) return { i: startI, j: startJ };
  const seen = new Set<string>([`${startI},${startJ}`]);
  const queue: { i: number; j: number }[] = [{ i: startI, j: startJ }];
  const steps = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    for (const [dx, dy] of steps) {
      const ni = next.i + dx;
      const nj = next.j + dy;
      const key = `${ni},${nj}`;
      if (!inGrid(ni, nj) || seen.has(key)) continue;
      seen.add(key);
      if (walkable(ni, nj)) return { i: ni, j: nj };
      queue.push({ i: ni, j: nj });
    }
  }
  return null;
}

/** A walkable spot inside the pen, as close as possible to a world point. */
export function nearestPurlSpot(x: number, y: number): WorldPoint {
  const clampedX = Math.max(PEN.x0 + 1.02, Math.min(PEN.x1 - 0.02, x));
  const clampedY = Math.max(PEN.y0 + 1.02, Math.min(PEN.y1 - 0.02, y));
  const tile = nearestWalkableTile(Math.floor(clampedX), Math.floor(clampedY), isPurlWalkable);
  return tile ? { x: tile.i + 0.5, y: tile.j + 0.5 } : { ...PURL_HOME };
}

/** Where a thrown kit lands: beside the visitor if they are inside, else just over the fence. */
export function feedSpotFor(x: number, y: number, random: () => number): WorldPoint {
  const inside = isInsidePen(x, y);
  const targetX = inside ? x + (random() - 0.5) * 1.2 : Math.max(5.8, Math.min(12.2, x));
  const targetY = inside ? y + (random() - 0.5) * 1.2 : Math.max(5.8, Math.min(12.2, y));
  return nearestPurlSpot(targetX, targetY);
}

/** True when a point is inside the fenced pasture. */
export function inPasture(x: number, y: number): boolean {
  return isInsidePen(x, y);
}
