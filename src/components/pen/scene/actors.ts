import { COLS, EFFECTS, ROWS, composePose, toRuns, type Run } from "@/components/pet/sprites";
import type { DevAction, SharedKit, SharedPurl } from "@/lib/pen/protocol";
import { project } from "@/lib/pen/iso";

import { FARM, PURL_FILL, peerStyle } from "@/components/pen/scene/palette";

/** Purl, visitors, kits and the farm's small residents, all drawn in stage pixels. */

const PURL_PX = 2;
const purlCache = new Map<string, Run[]>();

function runsFor(purl: SharedPurl): Run[] {
  const key = `${purl.face}/${purl.ears}/${purl.legs}/${purl.lying ? 1 : 0}`;
  let runs = purlCache.get(key);
  if (!runs) {
    runs = toRuns(composePose({ face: purl.face, ears: purl.ears, legs: purl.legs, lying: purl.lying, puff: false }));
    purlCache.set(key, runs);
  }
  return runs;
}

export function drawPurl(ctx: CanvasRenderingContext2D, purl: SharedPurl, now: number, reducedMotion: boolean): void {
  const point = project(purl.x, purl.y);
  const sx = Math.round(point.sx);
  const sy = Math.round(point.sy);
  const runs = runsFor(purl);

  let bob = 0;
  if (!reducedMotion && !purl.lying) {
    if (purl.step && (purl.action === "wander" || purl.action === "seek" || purl.action === "zoomies")) bob = 1;
    else if (purl.action === "idle" || purl.action === "graze" || purl.action === "bleat") bob = Math.floor(now / 520) % 2;
  }
  if (purl.lying) bob = reducedMotion ? 0 : Math.floor(now / 1500) % 2;

  ctx.fillStyle = "rgba(5, 8, 7, 0.34)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3, 21, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const left = sx - (COLS * PURL_PX) / 2;
  const top = sy + 4 - ROWS * PURL_PX - purl.lift - bob;
  for (const run of runs) {
    ctx.fillStyle = PURL_FILL[run.code];
    ctx.fillRect(Math.round(left + run.x * PURL_PX), Math.round(top + run.y * PURL_PX), run.width * PURL_PX, PURL_PX);
  }

  if (purl.action === "nap") drawSleep(ctx, sx + 14, top - 2, now, reducedMotion);
}

function pixelSprite(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  x: number,
  y: number,
  scale: number,
  colours: Record<string, string>,
): void {
  rows.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column += 1) {
      const code = row[column];
      if (!code || code === ".") continue;
      const colour = colours[code];
      if (!colour) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(Math.round(x + column * scale), Math.round(y + rowIndex * scale), scale, scale);
    }
  });
}

function drawSleep(ctx: CanvasRenderingContext2D, x: number, y: number, now: number, reducedMotion: boolean): void {
  const palette = { W: "#dfe6d8", ".": "" };
  for (let index = 0; index < 3; index += 1) {
    const phase = reducedMotion ? index * 0.7 + 0.2 : ((now / 1100 + index * 0.8) % 2.4);
    const alpha = Math.max(0, 1 - phase / 2.4);
    ctx.globalAlpha = alpha * 0.85;
    pixelSprite(ctx, EFFECTS.z, x + phase * 7 + index * 2, y - phase * 11 - index * 4, 2, palette);
  }
  ctx.globalAlpha = 1;
}

export function kitScreen(kit: SharedKit): { sx: number; sy: number } {
  const point = project(kit.x, kit.y);
  return { sx: Math.round(point.sx), sy: Math.round(point.sy) };
}

export function drawKit(ctx: CanvasRenderingContext2D, kit: SharedKit, now: number, reducedMotion: boolean): void {
  const { sx, sy } = kitScreen(kit);
  const bob = reducedMotion ? 0 : Math.round(Math.sin(now / 520 + kit.x + kit.y) * 2);

  ctx.fillStyle = "rgba(5, 8, 7, 0.3)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (kit.state === "eating") {
    ctx.fillStyle = FARM.hayLight;
    ctx.fillRect(sx - 6, sy - 2, 2, 1);
    ctx.fillRect(sx + 4, sy - 4, 1, 1);
    ctx.fillRect(sx + 1, sy + 1, 2, 1);
    return;
  }

  const glow = ctx.createRadialGradient(sx, sy - 8, 1, sx, sy - 8, 22);
  glow.addColorStop(0, "rgba(217, 255, 114, 0.22)");
  glow.addColorStop(1, "rgba(217, 255, 114, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 24, sy - 32, 48, 48);

  const x = sx - 6;
  const y = sy - 22 + bob;
  ctx.fillStyle = FARM.cream;
  ctx.fillRect(x, y, 12, 15);
  ctx.fillStyle = "#cfc5b1";
  ctx.beginPath();
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + 12, y + 4);
  ctx.lineTo(x + 8, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PURL_FILL.S;
  ctx.fillRect(x + 2, y + 2, 3, 1);
  ctx.fillStyle = FARM.stone;
  ctx.fillRect(x + 2, y + 6, 8, 1);
  ctx.fillRect(x + 2, y + 9, 6, 1);
  ctx.fillRect(x + 2, y + 12, 7, 1);
}

export interface DevDraw {
  id: string;
  name: string;
  x: number;
  y: number;
  dir: number;
  action: DevAction;
  moving: boolean;
  color: number;
  local: boolean;
}

export function drawDeveloper(ctx: CanvasRenderingContext2D, dev: DevDraw, now: number, reducedMotion: boolean): void {
  const style = peerStyle(dev.color);
  const point = project(dev.x, dev.y);
  const x = Math.round(point.sx);
  const y = Math.round(point.sy);
  const moving = dev.moving && !reducedMotion;
  const stride = moving ? Math.floor(now / 170) % 2 : 0;
  const breathing = reducedMotion ? 0 : Math.floor(now / 760) % 2;
  const bob = moving ? stride : breathing;

  ctx.fillStyle = dev.local ? "rgba(217, 255, 114, 0.22)" : "rgba(5, 8, 7, 0.3)";
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (dev.local) {
    ctx.strokeStyle = "rgba(217, 255, 114, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 15, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(dev.dir < 0 ? -1 : 1, 1);
  ctx.translate(-x, 0);

  // Feet and legs.
  const leftLift = stride === 0 ? 2 : 0;
  const rightLift = stride === 1 ? 2 : 0;
  ctx.fillStyle = style.pants;
  ctx.fillRect(x - 6, y - 11 - leftLift, 4, 9 + leftLift);
  ctx.fillRect(x + 2, y - 11 - rightLift, 4, 9 + rightLift);
  ctx.fillStyle = "#14171d";
  ctx.fillRect(x - 7, y - 3 - leftLift, 6, 3);
  ctx.fillRect(x + 1, y - 3 - rightLift, 6, 3);

  // Torso.
  const bodyTop = y - 27 - bob;
  ctx.fillStyle = style.shirt;
  ctx.fillRect(x - 7, bodyTop, 14, 14);
  ctx.fillStyle = style.shirtDark;
  ctx.fillRect(x + 4, bodyTop, 3, 14);
  ctx.fillStyle = style.accent;
  ctx.fillRect(x - 5, bodyTop + 5, 3, 2);

  // Arms.
  const armSwing = moving ? (stride === 0 ? 1 : -1) : 0;
  ctx.fillStyle = style.shirt;
  if (dev.action === "wave") {
    ctx.fillRect(x + 7, bodyTop - 6, 3, 12);
    ctx.fillStyle = style.skin;
    ctx.fillRect(x + 7, bodyTop - 9, 3, 4);
  } else if (dev.action === "pet") {
    ctx.fillRect(x + 6, bodyTop + 4, 8, 3);
    ctx.fillStyle = style.skin;
    ctx.fillRect(x + 13, bodyTop + 3, 3, 4);
  } else if (dev.action === "feed") {
    ctx.fillRect(x + 6, bodyTop + 2, 4, 3);
    ctx.fillStyle = style.skin;
    ctx.fillRect(x + 9, bodyTop, 3, 4);
    ctx.fillStyle = FARM.cream;
    ctx.fillRect(x + 13, bodyTop - 6, 7, 9);
    ctx.fillStyle = PURL_FILL.S;
    ctx.fillRect(x + 13, bodyTop - 6, 2, 2);
  } else {
    ctx.fillRect(x - 10, bodyTop + 2 + armSwing, 3, 10);
    ctx.fillRect(x + 7, bodyTop + 2 - armSwing, 3, 10);
    ctx.fillStyle = style.skin;
    ctx.fillRect(x - 10, bodyTop + 11 + armSwing, 3, 3);
    ctx.fillRect(x + 7, bodyTop + 11 - armSwing, 3, 3);
  }

  // Head, hair and face.
  const headTop = bodyTop - 12;
  ctx.fillStyle = style.skin;
  ctx.fillRect(x - 6, headTop, 12, 12);
  ctx.fillStyle = style.hair;
  ctx.fillRect(x - 6, headTop - 2, 12, 5);
  ctx.fillRect(x - 6, headTop + 2, 3, 4);
  if (dev.color % 3 === 0) ctx.fillRect(x + 5, headTop + 3, 1, 5);
  ctx.fillStyle = "#14171d";
  ctx.fillRect(x + 1, headTop + 6, 1, 2);
  ctx.fillRect(x + 5, headTop + 6, 1, 2);
  ctx.fillStyle = style.skin;
  ctx.fillRect(x + 6, headTop + 7, 2, 2);
  ctx.fillStyle = "#14171d";
  ctx.fillRect(x + 3, headTop + 9, 3, 1);
  ctx.fillStyle = style.accent;
  ctx.fillRect(x - 6, headTop + 12, 12, 2);

  ctx.restore();

  if (dev.name) {
    const label = dev.name.slice(0, 14);
    ctx.font = "500 9px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    const width = Math.ceil(ctx.measureText(label).width);
    ctx.fillStyle = "rgba(5, 8, 9, 0.74)";
    ctx.fillRect(Math.round(x - width / 2 - 3), y - 58, width + 6, 12);
    ctx.fillStyle = dev.local ? PURL_FILL.B : "#dfe6d8";
    ctx.fillText(label, x, y - 49);
    ctx.textAlign = "left";
  }
}

const CHICKENS = [
  { x: 5.15, y: 3.35, seed: 1.7, speed: 1 },
  { x: 6.45, y: 3.55, seed: 4.1, speed: -1 },
] as const;

export function drawChickens(ctx: CanvasRenderingContext2D, now: number, reducedMotion: boolean): void {
  for (const chicken of CHICKENS) {
    const drift = reducedMotion ? 0 : 0.3;
    const wx = chicken.x + Math.sin(now / 3600 + chicken.seed) * drift;
    const wy = chicken.y + Math.cos(now / 4400 + chicken.seed) * drift * 0.6;
    const point = project(wx, wy);
    const x = Math.round(point.sx);
    const y = Math.round(point.sy);
    const facing = Math.sin(now / 3600 + chicken.seed) > 0 ? 1 : -1;

    ctx.fillStyle = "rgba(5, 8, 7, 0.25)";
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(facing, 1);
    ctx.translate(-x, 0);
    ctx.fillStyle = "#d8cfbb";
    ctx.fillRect(x - 6, y - 8, 11, 7);
    ctx.fillRect(x + 2, y - 12, 6, 6);
    ctx.fillStyle = "#b5ab96";
    ctx.fillRect(x - 4, y - 6, 6, 4);
    ctx.fillStyle = FARM.red;
    ctx.fillRect(x + 3, y - 14, 3, 2);
    ctx.fillStyle = "#e3a955";
    ctx.fillRect(x + 8, y - 10, 3, 2);
    ctx.fillStyle = "#14171d";
    ctx.fillRect(x + 6, y - 11, 1, 1);
    ctx.fillStyle = "#c08a45";
    ctx.fillRect(x - 3, y - 1, 1, 3);
    ctx.fillRect(x + 2, y - 1, 1, 3);
    ctx.restore();
  }
}

export function drawDuck(ctx: CanvasRenderingContext2D, now: number, reducedMotion: boolean): void {
  const drift = reducedMotion ? 0 : 1;
  const angle = (now / 11_000) * Math.PI * 2 * drift;
  const wx = 15 + Math.cos(angle) * 0.8;
  const wy = 2 + Math.sin(angle) * 0.55;
  const point = project(wx, wy);
  const x = Math.round(point.sx);
  const y = Math.round(point.sy);
  const facing = Math.sin(angle) >= 0 ? 1 : -1;

  ctx.strokeStyle = "rgba(141, 177, 179, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 11, 3, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(facing, 1);
  ctx.translate(-x, 0);
  ctx.fillStyle = "#d9d3c2";
  ctx.fillRect(x - 7, y - 6, 12, 5);
  ctx.fillRect(x + 3, y - 10, 5, 5);
  ctx.fillStyle = "#b7ae99";
  ctx.fillRect(x - 5, y - 4, 5, 2);
  ctx.fillStyle = "#e3a955";
  ctx.fillRect(x + 8, y - 8, 3, 1);
  ctx.fillStyle = "#14171d";
  ctx.fillRect(x + 6, y - 9, 1, 1);
  ctx.restore();
}

export const PURL_PIXELS = { width: COLS * PURL_PX, height: ROWS * PURL_PX };
