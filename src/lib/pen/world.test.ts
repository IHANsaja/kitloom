import { describe, expect, it } from "vitest";

import { GRID } from "@/lib/pen/iso";
import { mulberry32 } from "@/lib/pen/iso";
import {
  GATE,
  PEN,
  PURL_HOME,
  VISITOR_SPAWN,
  feedSpotFor,
  inPasture,
  isDevWalkable,
  isFenceTile,
  isInsidePen,
  isPurlWalkable,
  nearestPurlSpot,
  tileKind,
} from "@/lib/pen/world";

describe("pen geography", () => {
  it("fences the perimeter except for the gate", () => {
    expect(isFenceTile(GATE.x, GATE.y)).toBe(false);
    expect(isFenceTile(PEN.x0, 8)).toBe(true);
    expect(isFenceTile(PEN.x1, 8)).toBe(true);
    expect(isFenceTile(8, PEN.y0)).toBe(true);
    expect(isFenceTile(8, PEN.y1)).toBe(true);
    expect(isFenceTile(2, 2)).toBe(false);
  });

  it("knows water, crops and the lane in from the gate", () => {
    expect(tileKind(15, 2)).toBe("water");
    expect(tileKind(2, 9)).toBe("crop");
    expect(tileKind(GATE.x, 16)).toBe("path");
    expect(tileKind(9, 9)).toBe("grass");
  });

  it("keeps Purl inside the pasture but lets visitors roam the farm", () => {
    expect(isPurlWalkable(PEN.x0, 8)).toBe(false);
    expect(isPurlWalkable(9, 9)).toBe(true);
    expect(isPurlWalkable(1, 1)).toBe(false);
    expect(isDevWalkable(1, 1)).toBe(false);
    expect(isDevWalkable(GATE.x, GATE.y)).toBe(true);
    expect(isDevWalkable(15, 2)).toBe(false);
  });

  it("puts the pen's own furniture out of bounds", () => {
    expect(isPurlWalkable(5, 5)).toBe(false);
    expect(isPurlWalkable(11, 11)).toBe(false);
    expect(isPurlWalkable(6, 11)).toBe(false);
    expect(isPurlWalkable(12, 5)).toBe(false);
  });
});

describe("Purl's spots", () => {
  it("starts at home and accepts visitors at the bottom of the lane", () => {
    expect(isInsidePen(PURL_HOME.x, PURL_HOME.y)).toBe(true);
    expect(inPasture(PURL_HOME.x, PURL_HOME.y)).toBe(true);
    expect(VISITOR_SPAWN.y).toBeGreaterThan(PEN.y1);
    expect(Math.floor(VISITOR_SPAWN.x)).toBe(GATE.x);
  });

  it("clamps any outside point back to a walkable pen tile", () => {
    const points: [number, number][] = [
      [0, 0],
      [GRID, GRID],
      [9.5, 30],
      [-4, 9],
      [5.6, 5.2],
    ];
    for (const [x, y] of points) {
      const spot = nearestPurlSpot(x, y);
      expect(isInsidePen(spot.x, spot.y)).toBe(true);
      expect(isPurlWalkable(Math.floor(spot.x), Math.floor(spot.y))).toBe(true);
    }
  });

  it.each([
    [9.5, 16.5],
    [6.4, 8.6],
    [12, 12],
    [2, 2],
  ])("drops a kit at a reachable spot from (%s, %s)", (x, y) => {
    const random = mulberry32(x * 100 + y);
    for (let index = 0; index < 12; index += 1) {
      const spot = feedSpotFor(x, y, random);
      expect(isInsidePen(spot.x, spot.y)).toBe(true);
      expect(isPurlWalkable(Math.floor(spot.x), Math.floor(spot.y))).toBe(true);
    }
  });
});
