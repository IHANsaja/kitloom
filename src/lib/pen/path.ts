import { GRID, type WorldPoint } from "@/lib/pen/iso";

/**
 * A* over the farm tiles. Paths are lists of tile centres; movement walks them in order.
 * Eight directions, but never diagonally through the corner between two blocked tiles.
 */

export type Walkable = (i: number, j: number) => boolean;

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

interface Node {
  i: number;
  j: number;
  g: number;
  f: number;
  parent: Node | null;
}

function key(i: number, j: number): number {
  return j * GRID + i;
}

function heuristic(i: number, j: number, ti: number, tj: number): number {
  const dx = Math.abs(i - ti);
  const dy = Math.abs(j - tj);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

function nearestTile(i: number, j: number, walkable: Walkable): { i: number; j: number } | null {
  const startI = Math.max(0, Math.min(GRID - 1, i));
  const startJ = Math.max(0, Math.min(GRID - 1, j));
  if (walkable(startI, startJ)) return { i: startI, j: startJ };
  const seen = new Set<number>([key(startI, startJ)]);
  const queue: { i: number; j: number }[] = [{ i: startI, j: startJ }];
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    for (const [dx, dy] of STEPS) {
      const ni = next.i + dx;
      const nj = next.j + dy;
      if (ni < 0 || nj < 0 || ni >= GRID || nj >= GRID) continue;
      const k = key(ni, nj);
      if (seen.has(k)) continue;
      seen.add(k);
      if (walkable(ni, nj)) return { i: ni, j: nj };
      queue.push({ i: ni, j: nj });
    }
  }
  return null;
}

function reconstruct(node: Node): WorldPoint[] {
  const points: WorldPoint[] = [];
  let current: Node | null = node;
  while (current) {
    points.push({ x: current.i + 0.5, y: current.j + 0.5 });
    current = current.parent;
  }
  return points.reverse();
}

function lineClear(a: WorldPoint, b: WorldPoint, walkable: Walkable): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 6));
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    if (!walkable(Math.floor(a.x + dx * t), Math.floor(a.y + dy * t))) return false;
  }
  return true;
}

/** Drops waypoints that are in a straight walkable line, so movement looks natural. */
export function simplifyPath(points: WorldPoint[], walkable: Walkable): WorldPoint[] {
  if (points.length <= 2) return points;
  const first = points[0];
  if (!first) return points;
  const out: WorldPoint[] = [first];
  let anchor = 0;
  for (let index = 2; index < points.length; index += 1) {
    const from = points[anchor];
    const to = points[index];
    if (!from || !to) continue;
    if (!lineClear(from, to, walkable)) {
      const corner = points[index - 1];
      if (corner) out.push(corner);
      anchor = index - 1;
    }
  }
  const last = points[points.length - 1];
  if (last && out[out.length - 1] !== last) out.push(last);
  return out;
}

/** A path from one world point to another. Empty when the target is already reached. */
export function findPath(from: WorldPoint, to: WorldPoint, walkable: Walkable): WorldPoint[] {
  const start = nearestTile(Math.floor(from.x), Math.floor(from.y), walkable);
  const goal = nearestTile(Math.floor(to.x), Math.floor(to.y), walkable);
  if (!start || !goal) return [];
  if (start.i === goal.i && start.j === goal.j) return [];

  const open = new Map<number, Node>();
  const closed = new Set<number>();
  const first: Node = { ...start, g: 0, f: heuristic(start.i, start.j, goal.i, goal.j), parent: null };
  open.set(key(start.i, start.j), first);

  while (open.size > 0) {
    let current: Node | null = null;
    for (const candidate of open.values()) {
      if (!current || candidate.f < current.f) current = candidate;
    }
    if (!current) break;
    const currentTile = current;
    open.delete(key(currentTile.i, currentTile.j));
    if (currentTile.i === goal.i && currentTile.j === goal.j) {
      return simplifyPath(reconstruct(currentTile), walkable);
    }
    closed.add(key(currentTile.i, currentTile.j));

    for (const [dx, dy] of STEPS) {
      const ni = currentTile.i + dx;
      const nj = currentTile.j + dy;
      if (ni < 0 || nj < 0 || ni >= GRID || nj >= GRID) continue;
      if (!walkable(ni, nj)) continue;
      if (dx !== 0 && dy !== 0 && (!walkable(currentTile.i + dx, currentTile.j) || !walkable(currentTile.i, currentTile.j + dy))) {
        continue;
      }
      const k = key(ni, nj);
      if (closed.has(k)) continue;
      const diagonal = dx !== 0 && dy !== 0;
      const tentative = currentTile.g + (diagonal ? Math.SQRT2 : 1);
      const existing = open.get(k);
      if (existing && tentative >= existing.g) continue;
      const node: Node = {
        i: ni,
        j: nj,
        g: tentative,
        f: tentative + heuristic(ni, nj, goal.i, goal.j),
        parent: currentTile,
      };
      open.set(k, node);
    }
  }
  return [];
}
