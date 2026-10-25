import { describe, expect, it } from "vitest";

import {
  GRID,
  ORIGIN_X,
  ORIGIN_Y,
  STAGE_H,
  TILE_H,
  TILE_W,
  applyCamera,
  cameraFor,
  fromCamera,
  hash2,
  mulberry32,
  project,
  tileAt,
  unproject,
} from "@/lib/pen/iso";

describe("isometric projection", () => {
  it("round-trips world points through the screen", () => {
    for (const point of [
      { x: 0, y: 0 },
      { x: 9.5, y: 9.5 },
      { x: 17, y: 3.25 },
      { x: 4.125, y: 12.75 },
    ]) {
      const screen = project(point.x, point.y);
      const back = unproject(screen.sx, screen.sy);
      expect(back.x).toBeCloseTo(point.x, 9);
      expect(back.y).toBeCloseTo(point.y, 9);
    }
  });

  it("puts tile (0,0) at the top corner and keeps every tile on the stage", () => {
    expect(project(0, 0)).toEqual({ sx: ORIGIN_X, sy: ORIGIN_Y });
    const bottom = project(GRID, GRID);
    expect(bottom.sx).toBe(ORIGIN_X);
    expect(bottom.sy).toBeLessThan(STAGE_H);
    expect(project(GRID, 0).sx).toBe(ORIGIN_X + (TILE_W / 2) * GRID);
    expect(project(0, GRID).sy - project(0, 0).sy).toBe((TILE_H / 2) * GRID);
  });

  it("maps stage pixels back to the tile under them", () => {
    expect(tileAt(ORIGIN_X, ORIGIN_Y)).toEqual({ i: 0, j: 0 });
    const centre = project(9.5, 9.5);
    expect(tileAt(centre.sx, centre.sy)).toEqual({ i: 9, j: 9 });
    const far = project(16.4, 2.2);
    expect(tileAt(far.sx, far.sy)).toEqual({ i: 16, j: 2 });
  });
});

describe("deterministic noise", () => {
  it("hashes the same cell to the same value", () => {
    expect(hash2(3, 4, 7)).toBe(hash2(3, 4, 7));
    expect(hash2(3, 4, 7)).not.toBe(hash2(4, 3, 7));
    expect(hash2(3, 4, 7)).toBeGreaterThanOrEqual(0);
    expect(hash2(3, 4, 7)).toBeLessThan(1);
  });

  it("seeds a repeatable random stream in range", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const values = Array.from({ length: 32 }, () => a());
    expect(values).toEqual(Array.from({ length: 32 }, () => b()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(8);
  });
});

describe("camera", () => {
  it("shows the whole farm on a wide stage", () => {
    expect(cameraFor(720)).toEqual({ scale: 1, ox: 0, oy: 0 });
  });

  it("zooms toward the pen on a phone, without losing the round trip", () => {
    const camera = cameraFor(390);
    expect(camera.scale).toBeGreaterThan(1);
    const pen = project(9, 9);
    const onScreen = applyCamera(camera, pen);
    // Internal stage pixels: the pen sits in the middle of the 720-wide stage, which the
    // browser then displays at 390 CSS pixels.
    expect(onScreen.sx).toBeCloseTo(360, 0);
    expect(onScreen.sy).toBeGreaterThan(0);
    expect(onScreen.sy).toBeLessThan(430);
    const back = fromCamera(camera, onScreen.sx, onScreen.sy);
    expect(back.sx).toBeCloseTo(pen.sx, 9);
    expect(back.sy).toBeCloseTo(pen.sy, 9);
  });
});
