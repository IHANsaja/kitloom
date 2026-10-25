import type { Weather } from "@/lib/pen/clock";
import { hash2, project } from "@/lib/pen/iso";
import { GATE, PEN, type Prop } from "@/lib/pen/world";

import { FARM, PURL_FILL } from "@/components/pen/scene/palette";

/**
 * Farm objects, drawn in painter's order with the living characters. Each draw starts from
 * the object's anchor on the ground and builds upward in whole stage pixels.
 */

export interface PropDrawContext {
  now: number;
  night: number;
  weather: Weather;
  reducedMotion: boolean;
}

interface Point {
  x: number;
  y: number;
}

function at(x: number, y: number, up = 0): Point {
  const point = project(x, y);
  return { x: point.sx, y: point.sy - up };
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number, h: number, top: string, left: string, right: string): void {
  const a = at(x, y);
  const b = at(x + w, y);
  const c = at(x + w, y + d);
  const e = at(x, y + d);

  ctx.fillStyle = left;
  ctx.beginPath();
  ctx.moveTo(Math.round(e.x), Math.round(e.y));
  ctx.lineTo(Math.round(c.x), Math.round(c.y));
  ctx.lineTo(Math.round(c.x), Math.round(c.y - h));
  ctx.lineTo(Math.round(e.x), Math.round(e.y - h));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = right;
  ctx.beginPath();
  ctx.moveTo(Math.round(c.x), Math.round(c.y));
  ctx.lineTo(Math.round(b.x), Math.round(b.y));
  ctx.lineTo(Math.round(b.x), Math.round(b.y - h));
  ctx.lineTo(Math.round(c.x), Math.round(c.y - h));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(Math.round(a.x), Math.round(a.y - h));
  ctx.lineTo(Math.round(b.x), Math.round(b.y - h));
  ctx.lineTo(Math.round(c.x), Math.round(c.y - h));
  ctx.lineTo(Math.round(e.x), Math.round(e.y - h));
  ctx.closePath();
  ctx.fill();
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha = 0.26): void {
  const point = project(x, y);
  ctx.fillStyle = `rgba(6, 8, 10, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(Math.round(point.sx), Math.round(point.sy), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function barn(ctx: CanvasRenderingContext2D, prop: Prop, context: PropDrawContext): void {
  const x0 = prop.x - 2.45;
  const y0 = prop.y - 2.4;
  const w = 2.6;
  const d = 2.5;
  const h = 30;
  shadow(ctx, prop.x - 0.9, prop.y - 0.6, 54, 16, 0.32);
  box(ctx, x0, y0, w, d, h, FARM.barnRoof, FARM.barnDark, FARM.barnWall);

  const center = at(x0 + w / 2, y0 + d / 2);
  const apex = { x: center.x, y: center.y - h - 26 };
  const eave = [
    at(x0, y0, h),
    at(x0 + w, y0, h),
    at(x0 + w, y0 + d, h),
    at(x0, y0 + d, h),
  ];

  ctx.fillStyle = FARM.barnRoof;
  ctx.beginPath();
  ctx.moveTo(Math.round(apex.x), Math.round(apex.y));
  ctx.lineTo(Math.round(eave[0]?.x ?? 0), Math.round(eave[0]?.y ?? 0));
  ctx.lineTo(Math.round(eave[1]?.x ?? 0), Math.round(eave[1]?.y ?? 0));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(Math.round(apex.x), Math.round(apex.y));
  ctx.lineTo(Math.round(eave[3]?.x ?? 0), Math.round(eave[3]?.y ?? 0));
  ctx.lineTo(Math.round(eave[0]?.x ?? 0), Math.round(eave[0]?.y ?? 0));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = FARM.barnRoofLight;
  ctx.beginPath();
  ctx.moveTo(Math.round(apex.x), Math.round(apex.y));
  ctx.lineTo(Math.round(eave[1]?.x ?? 0), Math.round(eave[1]?.y ?? 0));
  ctx.lineTo(Math.round(eave[2]?.x ?? 0), Math.round(eave[2]?.y ?? 0));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = FARM.barnRoof;
  ctx.beginPath();
  ctx.moveTo(Math.round(apex.x), Math.round(apex.y));
  ctx.lineTo(Math.round(eave[2]?.x ?? 0), Math.round(eave[2]?.y ?? 0));
  ctx.lineTo(Math.round(eave[3]?.x ?? 0), Math.round(eave[3]?.y ?? 0));
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = FARM.barnDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(apex.x), Math.round(apex.y));
  ctx.lineTo(Math.round(eave[2]?.x ?? 0), Math.round(eave[2]?.y ?? 0));
  ctx.stroke();

  // The big door and a loft window on the wall facing the pen.
  const doorTop = at(x0 + w, y0 + 1.75, 20);
  const doorBottom = at(x0 + w, y0 + 1.75, 0);
  const doorNear = at(x0 + w, y0 + 0.55, 20);
  const doorNearBottom = at(x0 + w, y0 + 0.55, 0);
  ctx.fillStyle = FARM.barnDark;
  ctx.beginPath();
  ctx.moveTo(Math.round(doorNear.x), Math.round(doorNear.y));
  ctx.lineTo(Math.round(doorTop.x), Math.round(doorTop.y));
  ctx.lineTo(Math.round(doorBottom.x), Math.round(doorBottom.y));
  ctx.lineTo(Math.round(doorNearBottom.x), Math.round(doorNearBottom.y));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FARM.barnTrim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(doorNear.x), Math.round(doorNear.y));
  ctx.lineTo(Math.round(doorTop.x), Math.round(doorTop.y));
  ctx.lineTo(Math.round(doorBottom.x), Math.round(doorBottom.y));
  ctx.stroke();
  ctx.fillStyle = FARM.woodLight;
  ctx.fillRect(Math.round((doorNear.x + doorTop.x) / 2) - 3, Math.round((doorNear.y + doorTop.y) / 2) - 2, 3, 1);

  const window = at(x0 + w, y0 + 1.1, 24);
  ctx.fillStyle = context.night > 0.25 ? FARM.window : FARM.barnTrim;
  ctx.fillRect(Math.round(window.x) - 5, Math.round(window.y), 6, 5);
  ctx.fillStyle = FARM.barnDark;
  ctx.fillRect(Math.round(window.x) - 2, Math.round(window.y), 1, 5);
}

function coop(ctx: CanvasRenderingContext2D, prop: Prop): void {
  const w = 1.2;
  const d = 1.1;
  const h = 11;
  const x0 = prop.x - w / 2;
  const y0 = prop.y - d / 2;
  shadow(ctx, prop.x, prop.y, 24, 8);
  box(ctx, x0, y0, w, d, h, FARM.woodWorn, FARM.woodDark, FARM.wood);
  const center = at(prop.x, prop.y - d / 2 + d / 2);
  const apex = { x: center.x, y: center.y - h - 13 };
  const eaveRight = at(x0 + w, y0 + d / 2, h);
  const eaveLeft = at(x0, y0 + d / 2, h);
  ctx.fillStyle = FARM.barnRoofLight;
  ctx.beginPath();
  ctx.moveTo(Math.round(eaveLeft.x), Math.round(eaveLeft.y));
  ctx.lineTo(Math.round(apex.x), Math.round(apex.y));
  ctx.lineTo(Math.round(eaveRight.x), Math.round(eaveRight.y));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = FARM.barnRoof;
  ctx.beginPath();
  ctx.moveTo(Math.round(apex.x), Math.round(apex.y));
  ctx.lineTo(Math.round(eaveRight.x), Math.round(eaveRight.y));
  ctx.lineTo(Math.round(at(x0 + w, y0 + d, h * 0.4).x), Math.round(at(x0 + w, y0 + d, h * 0.4).y));
  ctx.closePath();
  ctx.fill();

  const door = at(x0 + w, y0 + d * 0.7, 5);
  ctx.fillStyle = FARM.ink;
  ctx.beginPath();
  ctx.ellipse(Math.round(door.x), Math.round(door.y), 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FARM.woodWorn;
  ctx.fillRect(Math.round(door.x) - 1, Math.round(door.y) + 6, 2, 8);
  ctx.fillRect(Math.round(door.x) - 4, Math.round(door.y) + 13, 8, 1);
}

function tree(ctx: CanvasRenderingContext2D, prop: Prop, context: PropDrawContext): void {
  const point = project(prop.x, prop.y);
  const sway = context.reducedMotion ? 0 : Math.sin(context.now / (context.weather === "wind" ? 420 : 1300) + prop.x * 2) * (context.weather === "wind" ? 3 : 1);
  const baseX = Math.round(point.sx);
  const baseY = Math.round(point.sy);
  shadow(ctx, prop.x, prop.y, 30, 9, 0.3);
  ctx.fillStyle = FARM.woodDark;
  ctx.fillRect(baseX - 2, baseY - 20, 4, 20);
  ctx.fillStyle = FARM.wood;
  ctx.fillRect(baseX - 1, baseY - 20, 2, 20);
  const crown = baseX + Math.round(sway);
  const top = baseY - 58;
  const variant = prop.variant % 3;
  ctx.fillStyle = FARM.leafDark;
  ctx.fillRect(crown - 18, top + 12 + variant * 2, 36, 20);
  ctx.fillRect(crown - 22, top + 20, 44, 12);
  ctx.fillStyle = FARM.leaf;
  ctx.fillRect(crown - 14, top + 8, 28, 24);
  ctx.fillRect(crown - 20, top + 18, 40, 12);
  ctx.fillStyle = FARM.leafLight;
  ctx.fillRect(crown - 10, top + 9, 12, 8);
  ctx.fillRect(crown + 4, top + 14, 9, 7);
  ctx.fillStyle = FARM.leafSun;
  ctx.fillRect(crown - 7, top + 11, 5, 4);
  ctx.fillRect(crown + 8, top + 25, 6, 3);
  if (variant === 1) {
    ctx.fillStyle = FARM.red;
    ctx.fillRect(crown + 10, top + 19, 2, 2);
    ctx.fillRect(crown - 13, top + 28, 2, 2);
  }
}

function shelter(ctx: CanvasRenderingContext2D, prop: Prop): void {
  const x0 = prop.x - 1.1;
  const y0 = prop.y - 0.7;
  const w = 2.1;
  const d = 1.7;
  shadow(ctx, prop.x, prop.y, 42, 12, 0.24);
  // Straw bed.
  ctx.fillStyle = FARM.hayDark;
  ctx.beginPath();
  ctx.ellipse(Math.round(project(prop.x, prop.y + 0.3).sx), Math.round(project(prop.x, prop.y + 0.3).sy), 30, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FARM.hay;
  ctx.beginPath();
  ctx.ellipse(Math.round(project(prop.x, prop.y + 0.25).sx), Math.round(project(prop.x, prop.y + 0.25).sy), 24, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const posts = [at(x0, y0), at(x0 + w, y0), at(x0, y0 + d), at(x0 + w, y0 + d)];
  ctx.fillStyle = FARM.wood;
  for (const post of posts) {
    ctx.fillRect(Math.round(post.x), Math.round(post.y - 30), 2, 30);
    ctx.fillStyle = FARM.woodDark;
    ctx.fillRect(Math.round(post.x) + 1, Math.round(post.y - 30), 1, 30);
    ctx.fillStyle = FARM.wood;
  }

  const backLeft = at(x0, y0, 29);
  const backRight = at(x0 + w, y0, 36);
  const frontLeft = at(x0, y0 + d, 40);
  const frontRight = at(x0 + w, y0 + d, 33);
  ctx.fillStyle = FARM.woodWorn;
  ctx.beginPath();
  ctx.moveTo(Math.round(backLeft.x), Math.round(backLeft.y));
  ctx.lineTo(Math.round(backRight.x), Math.round(backRight.y));
  ctx.lineTo(Math.round(frontRight.x), Math.round(frontRight.y));
  ctx.lineTo(Math.round(frontLeft.x), Math.round(frontLeft.y));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FARM.woodDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(backRight.x), Math.round(backRight.y));
  ctx.lineTo(Math.round(frontRight.x), Math.round(frontRight.y));
  ctx.stroke();
  ctx.fillStyle = FARM.leafDark;
  ctx.fillRect(Math.round(frontLeft.x) + 1, Math.round(frontLeft.y) + 2, 5, 2);
}

function trough(ctx: CanvasRenderingContext2D, prop: Prop): void {
  shadow(ctx, prop.x, prop.y, 20, 6);
  box(ctx, prop.x - 0.55, prop.y - 0.45, 1.1, 0.9, 6, FARM.water, FARM.woodDark, FARM.wood);
  const water = at(prop.x, prop.y);
  ctx.fillStyle = FARM.waterLight;
  ctx.fillRect(Math.round(water.x) - 8, Math.round(water.y) - 8, 16, 2);
  ctx.fillStyle = FARM.woodLight;
  ctx.fillRect(Math.round(water.x) - 9, Math.round(water.y) - 5, 18, 1);
}

function hay(ctx: CanvasRenderingContext2D, prop: Prop): void {
  shadow(ctx, prop.x, prop.y, 24, 8);
  box(ctx, prop.x - 0.9, prop.y - 0.8, 1.5, 1.2, 12, FARM.hayLight, FARM.hayDark, FARM.hay);
  box(ctx, prop.x - 0.7, prop.y - 0.6, 1.2, 1, 10, FARM.hayLight, FARM.hayDark, FARM.hay);
  const tip = at(prop.x - 0.1, prop.y - 0.1, 24);
  ctx.fillStyle = FARM.hay;
  ctx.fillRect(Math.round(tip.x) - 6, Math.round(tip.y), 9, 2);
  ctx.fillStyle = FARM.hayLight;
  ctx.fillRect(Math.round(tip.x) - 3, Math.round(tip.y) - 2, 4, 2);
}

function basket(ctx: CanvasRenderingContext2D, prop: Prop): void {
  shadow(ctx, prop.x, prop.y, 18, 6);
  const base = project(prop.x, prop.y);
  const x = Math.round(base.sx);
  const y = Math.round(base.sy);
  ctx.fillStyle = FARM.woodDark;
  ctx.fillRect(x - 10, y - 10, 20, 10);
  ctx.fillStyle = FARM.wood;
  ctx.fillRect(x - 9, y - 11, 18, 9);
  ctx.fillStyle = FARM.woodLight;
  for (let row = 0; row < 3; row += 1) ctx.fillRect(x - 8, y - 9 + row * 3, 16, 1);
  ctx.fillStyle = FARM.leafDark;
  ctx.beginPath();
  ctx.ellipse(x, y - 11, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PURL_FILL.S;
  ctx.fillRect(x - 6, y - 16, 5, 5);
  ctx.fillRect(x + 1, y - 15, 4, 4);
  ctx.fillStyle = PURL_FILL.h;
  ctx.fillRect(x - 5, y - 15, 2, 2);
  ctx.fillStyle = PURL_FILL.S;
  ctx.fillRect(x - 2, y - 12, 5, 1);
}

function lamp(ctx: CanvasRenderingContext2D, prop: Prop): void {
  shadow(ctx, prop.x, prop.y, 12, 4, 0.3);
  const base = project(prop.x, prop.y);
  const x = Math.round(base.sx);
  const y = Math.round(base.sy);
  ctx.fillStyle = FARM.woodDark;
  ctx.fillRect(x - 1, y - 30, 3, 30);
  ctx.fillStyle = FARM.wood;
  ctx.fillRect(x, y - 30, 1, 30);
  ctx.fillStyle = FARM.ink;
  ctx.fillRect(x - 4, y - 37, 9, 8);
  ctx.fillStyle = FARM.lamp;
  ctx.fillRect(x - 3, y - 36, 7, 6);
  ctx.fillStyle = FARM.cream;
  ctx.fillRect(x - 2, y - 35, 3, 3);
  ctx.fillStyle = FARM.ink;
  ctx.fillRect(x - 5, y - 39, 11, 2);
  ctx.fillRect(x - 3, y - 29, 7, 1);
}

function scarecrow(ctx: CanvasRenderingContext2D, prop: Prop, context: PropDrawContext): void {
  shadow(ctx, prop.x, prop.y, 16, 5);
  const base = project(prop.x, prop.y);
  const x = Math.round(base.sx);
  const y = Math.round(base.sy);
  const sway = context.reducedMotion ? 0 : Math.sin(context.now / 1800 + prop.x) * 1;
  ctx.fillStyle = FARM.woodDark;
  ctx.fillRect(x - 1, y - 38, 3, 38);
  ctx.fillRect(x - 13, y - 30, 27, 3);
  ctx.fillStyle = FARM.barnWall;
  ctx.beginPath();
  ctx.moveTo(x - 9 + sway, y - 30);
  ctx.lineTo(x + 9 + sway, y - 30);
  ctx.lineTo(x + 7 + sway, y - 17);
  ctx.lineTo(x - 7 + sway, y - 17);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = FARM.hay;
  ctx.fillRect(x - 5 + sway, y - 44, 11, 9);
  ctx.fillStyle = FARM.ink;
  ctx.fillRect(x - 3 + sway, y - 41, 2, 2);
  ctx.fillRect(x + 2 + sway, y - 41, 2, 2);
  ctx.fillStyle = FARM.woodDark;
  ctx.fillRect(x - 9 + sway, y - 47, 19, 3);
  ctx.fillRect(x - 5 + sway, y - 52, 11, 6);
}

function bush(ctx: CanvasRenderingContext2D, prop: Prop): void {
  const point = project(prop.x, prop.y);
  shadow(ctx, prop.x, prop.y, 20, 6, 0.2);
  const x = Math.round(point.sx);
  const y = Math.round(point.sy);
  ctx.fillStyle = FARM.leafDark;
  ctx.fillRect(x - 12, y - 12, 24, 10);
  ctx.fillRect(x - 8, y - 17, 17, 12);
  ctx.fillStyle = FARM.leaf;
  ctx.fillRect(x - 9, y - 14, 19, 9);
  ctx.fillRect(x - 5, y - 18, 11, 6);
  ctx.fillStyle = FARM.leafLight;
  ctx.fillRect(x - 3, y - 16, 6, 3);
  if (prop.variant === 1) {
    ctx.fillStyle = FARM.red;
    ctx.fillRect(x - 6, y - 12, 2, 2);
    ctx.fillRect(x + 5, y - 10, 2, 2);
  }
}

function rock(ctx: CanvasRenderingContext2D, prop: Prop): void {
  const point = project(prop.x, prop.y);
  shadow(ctx, prop.x, prop.y, 16, 5, 0.24);
  const x = Math.round(point.sx);
  const y = Math.round(point.sy);
  ctx.fillStyle = FARM.stoneDark;
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 1);
  ctx.lineTo(x - 7, y - 10);
  ctx.lineTo(x + 3, y - 13);
  ctx.lineTo(x + 11, y - 5);
  ctx.lineTo(x + 8, y - 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = FARM.stone;
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 9);
  ctx.lineTo(x + 2, y - 12);
  ctx.lineTo(x + 8, y - 5);
  ctx.lineTo(x - 1, y - 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = FARM.stoneLight;
  ctx.fillRect(x - 3, y - 10, 4, 2);
}

export function drawProp(ctx: CanvasRenderingContext2D, prop: Prop, context: PropDrawContext): void {
  switch (prop.kind) {
    case "barn":
      barn(ctx, prop, context);
      return;
    case "coop":
      coop(ctx, prop);
      return;
    case "tree":
      tree(ctx, prop, context);
      return;
    case "shelter":
      shelter(ctx, prop);
      return;
    case "trough":
      trough(ctx, prop);
      return;
    case "hay":
      hay(ctx, prop);
      return;
    case "basket":
      basket(ctx, prop);
      return;
    case "lamp":
      lamp(ctx, prop);
      return;
    case "scarecrow":
      scarecrow(ctx, prop, context);
      return;
    case "bush":
      bush(ctx, prop);
      return;
    case "rock":
      rock(ctx, prop);
      return;
  }
}

export interface FenceSegment {
  from: { x: number; y: number };
  to: { x: number; y: number };
  depth: number;
}

/** Rails on the outside edge of the fence tiles, with an open gap at the gate. */
export function fenceSegments(): FenceSegment[] {
  const segments: FenceSegment[] = [];
  const add = (x1: number, y1: number, x2: number, y2: number) => {
    segments.push({ from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, depth: (x1 + x2) / 2 + (y1 + y2) / 2 });
  };
  for (let i: number = PEN.x0; i < PEN.x1; i += 1) {
    add(i, PEN.y0, i + 1, PEN.y0);
    if (i !== GATE.x) add(i, PEN.y1 + 1, i + 1, PEN.y1 + 1);
  }
  for (let j: number = PEN.y0; j < PEN.y1; j += 1) {
    add(PEN.x0, j, PEN.x0, j + 1);
    add(PEN.x1 + 1, j, PEN.x1 + 1, j + 1);
  }
  return segments;
}

export function drawFence(ctx: CanvasRenderingContext2D, segment: FenceSegment): void {
  const a = project(segment.from.x, segment.from.y);
  const b = project(segment.to.x, segment.to.y);
  for (const height of [7, 13]) {
    ctx.fillStyle = height === 7 ? FARM.woodDark : FARM.wood;
    ctx.beginPath();
    ctx.moveTo(Math.round(a.sx), Math.round(a.sy - height));
    ctx.lineTo(Math.round(b.sx), Math.round(b.sy - height));
    ctx.lineTo(Math.round(b.sx), Math.round(b.sy - height + 3));
    ctx.lineTo(Math.round(a.sx), Math.round(a.sy - height + 3));
    ctx.closePath();
    ctx.fill();
  }
  for (const point of [a, b]) {
    ctx.fillStyle = FARM.woodDark;
    ctx.fillRect(Math.round(point.sx) - 1, Math.round(point.sy - 18), 3, 18);
    ctx.fillStyle = FARM.woodLight;
    ctx.fillRect(Math.round(point.sx), Math.round(point.sy - 18), 1, 18);
    ctx.fillStyle = FARM.wood;
    ctx.fillRect(Math.round(point.sx) - 1, Math.round(point.sy - 19), 3, 2);
  }
}

/** Warm pools of light cast by the two lanterns after dusk. */
export function lampGlow(ctx: CanvasRenderingContext2D, prop: Prop, night: number): void {
  if (night < 0.08) return;
  const point = project(prop.x, prop.y);
  const x = Math.round(point.sx);
  const y = Math.round(point.sy - 33);
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 54);
  glow.addColorStop(0, `rgba(255, 207, 122, ${0.34 * night})`);
  glow.addColorStop(0.45, `rgba(255, 185, 92, ${0.12 * night})`);
  glow.addColorStop(1, "rgba(255, 185, 92, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 56, y - 56, 112, 112);
  ctx.fillStyle = `rgba(255, 220, 150, ${0.55 * night})`;
  ctx.fillRect(x - 2, y - 1, 4, 3);
}

/** Small window and lantern gleams that must survive the night tint. */
export function glowSources(): { x: number; y: number; kind: "window" | "lamp" }[] {
  return [
    { x: 3.6, y: 2.2, kind: "window" },
    { x: 8.3, y: 14.6, kind: "lamp" },
    { x: 13.7, y: 14.4, kind: "lamp" },
  ];
}

export function treeSway(prop: Prop, now: number, weather: Weather, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  return Math.sin(now / (weather === "wind" ? 380 : 1200) + hash2(Math.floor(prop.x), Math.floor(prop.y), 3) * 6);
}
