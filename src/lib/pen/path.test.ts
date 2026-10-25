import { describe, expect, it } from "vitest";

import { GRID } from "@/lib/pen/iso";
import { findPath, simplifyPath } from "@/lib/pen/path";
import { isDevWalkable, isPurlWalkable } from "@/lib/pen/world";

function walkablePath(points: { x: number; y: number }[], walkable: (i: number, j: number) => boolean): boolean {
  if (points.length === 0) return true;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (!from || !to) continue;
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) * 8));
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const i = Math.floor(from.x + (to.x - from.x) * t);
      const j = Math.floor(from.y + (to.y - from.y) * t);
      if (!walkable(i, j)) return false;
    }
  }
  return true;
}

describe("findPath", () => {
  it("walks a visitor from the lane, through the gate and across the pasture", () => {
    const path = findPath({ x: 9.5, y: 16.5 }, { x: 9.5, y: 6.5 }, isDevWalkable);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 9.5, y: 6.5 });
    expect(walkablePath(path, isDevWalkable)).toBe(true);
  });

  it("stays inside the pen for Purl and around its furniture", () => {
    const path = findPath({ x: 9.5, y: 9.5 }, { x: 12.5, y: 12.5 }, isPurlWalkable);
    expect(path.length).toBeGreaterThan(0);
    expect(walkablePath(path, isPurlWalkable)).toBe(true);
    for (const point of path) {
      expect(point.x).toBeGreaterThan(4);
      expect(point.y).toBeGreaterThan(4);
      expect(point.x).toBeLessThan(GRID);
      expect(point.y).toBeLessThan(GRID);
    }
  });

  it("returns nothing when the walker is already there", () => {
    expect(findPath({ x: 9.5, y: 9.5 }, { x: 9.6, y: 9.4 }, isPurlWalkable)).toEqual([]);
  });

  it("returns nothing when no tile is walkable", () => {
    expect(findPath({ x: 9.5, y: 9.5 }, { x: 9.5, y: 9.5 }, () => false)).toEqual([]);
  });
});

describe("simplifyPath", () => {
  const points = [
    { x: 0.5, y: 0.5 },
    { x: 1.5, y: 0.5 },
    { x: 2.5, y: 0.5 },
    { x: 3.5, y: 0.5 },
  ];

  it("drops redundant corners in a straight line", () => {
    const simplified = simplifyPath(points, isDevWalkable);
    expect(simplified).toEqual([points[0], points[points.length - 1]]);
  });

  it("keeps the corners a wall needs", () => {
    const wall = (i: number, j: number) => !(i === 1 && j === 0);
    const bend = [
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 1.5 },
      { x: 2.5, y: 1.5 },
      { x: 2.5, y: 0.5 },
    ];
    const simplified = simplifyPath(bend, wall);
    expect(simplified[0]).toEqual(bend[0]);
    expect(simplified[simplified.length - 1]).toEqual(bend[bend.length - 1]);
    expect(simplified).toContainEqual({ x: 0.5, y: 1.5 });
    expect(walkablePath(simplified, wall)).toBe(true);
  });
});
