import { GRID, STAGE_H, STAGE_W, hash2, project } from "@/lib/pen/iso";
import { tileKind } from "@/lib/pen/world";

import { FARM } from "@/components/pen/scene/palette";

/**
 * The island's static ground: soil skirt, 324 tiles and their small decorations. It never
 * changes, so it is drawn once into an offscreen canvas and blitted every frame. Water is
 * drawn alive on top of this.
 */

let cached: HTMLCanvasElement | null = null;

function canvas(): HTMLCanvasElement {
  const element = document.createElement("canvas");
  element.width = STAGE_W;
  element.height = STAGE_H;
  return element;
}

function diamond(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  ctx.beginPath();
  ctx.moveTo(Math.round(sx), Math.round(sy) - 10);
  ctx.lineTo(Math.round(sx) + 20, Math.round(sy));
  ctx.lineTo(Math.round(sx), Math.round(sy) + 10);
  ctx.lineTo(Math.round(sx) - 20, Math.round(sy));
  ctx.closePath();
}

function drawTile(ctx: CanvasRenderingContext2D, i: number, j: number): void {
  const { sx, sy } = project(i + 0.5, j + 0.5);
  const kind = tileKind(i, j);
  const noise = hash2(i, j, 3);
  diamond(ctx, sx, sy);
  if (kind === "water") {
    ctx.fillStyle = FARM.waterDeep;
  } else if (kind === "crop") {
    ctx.fillStyle = FARM.soil[Math.floor(noise * FARM.soil.length)] ?? FARM.soil[0];
  } else if (kind === "path") {
    ctx.fillStyle = FARM.path[Math.floor(noise * FARM.path.length)] ?? FARM.path[0];
  } else {
    ctx.fillStyle = FARM.grass[Math.floor(noise * FARM.grass.length)] ?? FARM.grass[0];
  }
  ctx.fill();

  const hx = sx + (hash2(i, j, 8) - 0.5) * 18;
  const hy = sy + (hash2(i, j, 9) - 0.5) * 8;

  if (kind === "grass") {
    // A few blade tufts, a little clover, and the rare pale flower.
    const tufts = hash2(i, j, 12) > 0.48 ? 2 : 1;
    for (let index = 0; index < tufts; index += 1) {
      const x = Math.round(sx + (hash2(i, j, 20 + index) - 0.5) * 24);
      const y = Math.round(sy + (hash2(i, j, 30 + index) - 0.5) * 10);
      ctx.fillStyle = hash2(i, j, 40 + index) > 0.6 ? FARM.tuft : FARM.tuftDark;
      ctx.fillRect(x, y, 1, 3);
      ctx.fillRect(x + 1, y + 1, 1, 2);
    }
    if (hash2(i, j, 50) > 0.88) {
      const x = Math.round(sx + (hash2(i, j, 51) - 0.5) * 22);
      const y = Math.round(sy + (hash2(i, j, 52) - 0.5) * 10);
      ctx.fillStyle = hash2(i, j, 53) > 0.5 ? FARM.clover : FARM.flower;
      ctx.fillRect(x, y, 2, 1);
      ctx.fillRect(x + 1, y - 1, 1, 1);
    }
  } else if (kind === "path") {
    ctx.fillStyle = FARM.pebble;
    ctx.fillRect(Math.round(hx), Math.round(hy + 2), 2, 1);
    if (noise > 0.62) ctx.fillRect(Math.round(hx) - 5, Math.round(hy - 2), 1, 1);
  } else if (kind === "crop") {
    ctx.strokeStyle = FARM.cropRow;
    ctx.lineWidth = 1;
    for (let row = 1; row <= 3; row += 1) {
      const offset = i + row * 0.24;
      const from = project(offset, j + 0.12);
      const to = project(offset, j + 0.88);
      ctx.beginPath();
      ctx.moveTo(Math.round(from.sx), Math.round(from.sy));
      ctx.lineTo(Math.round(to.sx), Math.round(to.sy));
      ctx.stroke();
      for (let sprout = 0; sprout < 3; sprout += 1) {
        const point = project(offset, j + 0.2 + sprout * 0.25);
        ctx.fillStyle = (sprout + row) % 2 === 0 ? FARM.sprout : FARM.sproutDark;
        ctx.fillRect(Math.round(point.sx), Math.round(point.sy) - 2, 1, 2);
        ctx.fillRect(Math.round(point.sx) - 1, Math.round(point.sy) - 1, 1, 1);
      }
    }
  } else {
    // Ripples and a lily pad or two will be animated; seed their positions statically here.
    if (hash2(i, j, 61) > 0.72) {
      ctx.fillStyle = FARM.leaf;
      ctx.fillRect(Math.round(hx), Math.round(hy), 4, 2);
      ctx.fillStyle = FARM.leafLight;
      ctx.fillRect(Math.round(hx) + 1, Math.round(hy) - 1, 2, 1);
    }
  }
}

function build(): HTMLCanvasElement {
  const element = canvas();
  const ctx = element.getContext("2d");
  if (!ctx) return element;

  const top = project(0, 0);
  const right = project(GRID, 0);
  const bottom = project(GRID, GRID);
  const left = project(0, GRID);
  const skirt = 18;

  // A soft grounding shadow under the floating island.
  const shadow = ctx.createRadialGradient(STAGE_W / 2, 380, 30, STAGE_W / 2, 380, 330);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0.38)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shadow;
  ctx.fillRect(0, 250, STAGE_W, STAGE_H - 250);

  // Earth skirt along the two lower edges.
  ctx.fillStyle = FARM.earthDark;
  ctx.beginPath();
  ctx.moveTo(left.sx, left.sy);
  ctx.lineTo(bottom.sx, bottom.sy);
  ctx.lineTo(right.sx, right.sy);
  ctx.lineTo(right.sx, right.sy + skirt);
  ctx.lineTo(bottom.sx, bottom.sy + skirt);
  ctx.lineTo(left.sx, left.sy + skirt);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = FARM.earth;
  ctx.beginPath();
  ctx.moveTo(left.sx, left.sy);
  ctx.lineTo(bottom.sx, bottom.sy);
  ctx.lineTo(right.sx, right.sy);
  ctx.lineTo(right.sx, right.sy + 10);
  ctx.lineTo(bottom.sx, bottom.sy + 10);
  ctx.lineTo(left.sx, left.sy + 10);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = FARM.earthLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left.sx + 2, left.sy + 5);
  ctx.lineTo(bottom.sx, bottom.sy + 5);
  ctx.lineTo(right.sx - 2, right.sy + 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(left.sx + 5, left.sy + 11);
  ctx.lineTo(bottom.sx, bottom.sy + 11);
  ctx.lineTo(right.sx - 5, right.sy + 11);
  ctx.stroke();

  // Grass cap.
  ctx.beginPath();
  ctx.moveTo(top.sx, top.sy);
  ctx.lineTo(right.sx, right.sy);
  ctx.lineTo(bottom.sx, bottom.sy);
  ctx.lineTo(left.sx, left.sy);
  ctx.closePath();
  ctx.fillStyle = FARM.grassEdge;
  ctx.fill();

  for (let j = 0; j < GRID; j += 1) {
    for (let i = 0; i < GRID; i += 1) drawTile(ctx, i, j);
  }

  // A crisp rim so the island reads against the sky.
  ctx.strokeStyle = FARM.grassEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left.sx, left.sy);
  ctx.lineTo(top.sx, top.sy);
  ctx.lineTo(right.sx, right.sy);
  ctx.stroke();

  return element;
}

export function groundCanvas(): HTMLCanvasElement {
  cached ??= build();
  return cached;
}
