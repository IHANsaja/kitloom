/**
 * Isometric projection for Purl's pen.
 *
 * The stage is drawn at a fixed internal resolution (720 × 460) and scaled up with
 * `image-rendering: pixelated`, so every coordinate here is in whole stage pixels. A tile
 * is twice as wide as it is tall, the classic 2:1 pixel-art isometric diamond.
 */

export const TILE_W = 40;
export const TILE_H = 20;
export const GRID = 18;
export const STAGE_W = TILE_W * GRID; // 720
export const STAGE_H = 460;
export const ORIGIN_X = STAGE_W / 2;
export const ORIGIN_Y = 70;

export interface ScreenPoint {
  sx: number;
  sy: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

/** World tiles (continuous units) → stage pixels. Integer points are tile corners. */
export function project(x: number, y: number): ScreenPoint {
  return {
    sx: ORIGIN_X + (x - y) * (TILE_W / 2),
    sy: ORIGIN_Y + (x + y) * (TILE_H / 2),
  };
}

/** Stage pixels → world tiles. The inverse of `project`. */
export function unproject(sx: number, sy: number): WorldPoint {
  const dx = (sx - ORIGIN_X) / (TILE_W / 2);
  const dy = (sy - ORIGIN_Y) / (TILE_H / 2);
  return { x: (dx + dy) / 2, y: (dy - dx) / 2 };
}

/** The tile a stage pixel falls on. */
export function tileAt(sx: number, sy: number): { i: number; j: number } {
  const { x, y } = unproject(sx, sy);
  return { i: Math.floor(x), j: Math.floor(y) };
}

/** Painter's-order key. Larger is nearer the camera. */
export function depthOf(x: number, y: number): number {
  return x + y;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Deterministic 0..1 noise for a tile or sprite cell. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A small seeded random generator, so the farm can be drawn deterministically. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Camera {
  scale: number;
  ox: number;
  oy: number;
}

/**
 * The whole farm is visible on a wide stage. Narrow screens zoom into the pen, because a
 * 720px-wide world squeezed into a phone would make Purl a thumbnail.
 */
export function cameraFor(stageWidth: number): Camera {
  if (stageWidth >= 680) return { scale: 1, ox: 0, oy: 0 };
  const scale = 1.24;
  const focus = project(9, 9);
  return {
    scale,
    ox: STAGE_W / 2 - focus.sx * scale,
    oy: 238 - focus.sy * scale,
  };
}

export function applyCamera(camera: Camera, point: ScreenPoint): ScreenPoint {
  return { sx: point.sx * camera.scale + camera.ox, sy: point.sy * camera.scale + camera.oy };
}

export function fromCamera(camera: Camera, sx: number, sy: number): ScreenPoint {
  return { sx: (sx - camera.ox) / camera.scale, sy: (sy - camera.oy) / camera.scale };
}
