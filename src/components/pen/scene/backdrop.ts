import { mixHex, normalizeMinutes, phaseOf, type SkyPalette, type Weather } from "@/lib/pen/clock";
import { hash2, mulberry32 } from "@/lib/pen/iso";

import { RAIN, STAR } from "@/components/pen/scene/palette";

/**
 * Everything behind the island: sky, sun and moon, stars, clouds, hills and the windmill.
 * It is drawn in screen space so the phone camera can crop the farm without cropping the sky.
 */

export interface BackdropInput {
  width: number;
  height: number;
  minutes: number;
  weather: Weather;
  now: number;
  palette: SkyPalette;
  reducedMotion: boolean;
}

const starRandom = mulberry32(1977);
const STARS = Array.from({ length: 84 }, () => ({
  x: starRandom(),
  y: starRandom() * 0.62,
  size: starRandom() > 0.9 ? 2 : 1,
  phase: starRandom() * 10,
}));

const CLOUDS = [
  { x: 0.08, y: 58, scale: 2.2, speed: 2.4 },
  { x: 0.42, y: 36, scale: 1.4, speed: 1.7 },
  { x: 0.68, y: 82, scale: 2.8, speed: 2.9 },
  { x: 0.88, y: 48, scale: 1.7, speed: 2.1 },
] as const;

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, colour: string): void {
  ctx.fillStyle = colour;
  const blocks: readonly [number, number, number, number][] = [
    [0, 8, 22, 5],
    [4, 4, 12, 6],
    [14, 6, 10, 5],
    [7, 1, 7, 5],
    [19, 9, 9, 4],
  ];
  for (const [dx, dy, w, h] of blocks) {
    ctx.fillRect(Math.round(x + dx * scale), Math.round(y + dy * scale), Math.round(w * scale), Math.round(h * scale));
  }
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, palette: SkyPalette): void {
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 74);
  glow.addColorStop(0, palette.sun);
  glow.addColorStop(0.28, `${palette.sun}55`);
  glow.addColorStop(1, `${palette.sun}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(x - 80, y - 80, 160, 160);
  ctx.fillStyle = palette.sun;
  ctx.fillRect(Math.round(x) - 10, Math.round(y) - 10, 20, 20);
  ctx.fillStyle = mixHex(palette.sun, "#ffffff", 0.35);
  ctx.fillRect(Math.round(x) - 6, Math.round(y) - 6, 8, 8);
}

function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const glow = ctx.createRadialGradient(x, y, 3, x, y, 56);
  glow.addColorStop(0, "#dfe6d8aa");
  glow.addColorStop(1, "#dfe6d800");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 60, y - 60, 120, 120);
  ctx.fillStyle = "#dfe6d8";
  ctx.fillRect(Math.round(x) - 8, Math.round(y) - 8, 16, 16);
  ctx.fillStyle = "#b9c3b5";
  ctx.fillRect(Math.round(x) - 4, Math.round(y) - 5, 4, 3);
  ctx.fillRect(Math.round(x) + 2, Math.round(y) + 2, 3, 3);
  ctx.fillRect(Math.round(x) - 6, Math.round(y) + 3, 2, 2);
}

function drawWindmill(ctx: CanvasRenderingContext2D, x: number, baseY: number, angle: number, palette: SkyPalette): void {
  const body = mixHex(palette.hillNear, "#05080b", 0.15);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - 10, baseY);
  ctx.lineTo(x - 5, baseY - 48);
  ctx.lineTo(x + 5, baseY - 48);
  ctx.lineTo(x + 10, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = mixHex(body, palette.horizon, 0.25);
  ctx.fillRect(x - 9, baseY - 36, 7, 4);
  ctx.beginPath();
  ctx.moveTo(x - 13, baseY - 46);
  ctx.lineTo(x, baseY - 56);
  ctx.lineTo(x + 13, baseY - 46);
  ctx.closePath();
  ctx.fillStyle = mixHex(palette.hillFar, "#05080b", 0.2);
  ctx.fill();

  ctx.save();
  ctx.translate(Math.round(x), Math.round(baseY - 52));
  ctx.rotate(angle);
  ctx.fillStyle = mixHex(palette.cloud, "#05080b", 0.2);
  for (let blade = 0; blade < 4; blade += 1) {
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(-2, -2, 4, 26);
    ctx.fillRect(-5, -2, 10, 6);
  }
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
  ctx.fillStyle = FIREFLY_LAMP;
  ctx.fillRect(Math.round(x) - 1, Math.round(baseY - 40), 2, 2);
}

const FIREFLY_LAMP = "#ffcf7a";

function drawHills(ctx: CanvasRenderingContext2D, width: number, palette: SkyPalette, motion: number): void {
  const far = palette.hillFar;
  ctx.fillStyle = far;
  ctx.beginPath();
  ctx.moveTo(0, 276);
  for (let index = 0; index <= 18; index += 1) {
    const x = (index / 18) * width;
    const y = 208 - hash2(index, 3, 7) * 42 - Math.sin(index * 0.7) * 6;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, 276);
  ctx.closePath();
  ctx.fill();

  // Spruce silhouettes along the far ridge.
  ctx.fillStyle = far;
  for (let index = 0; index < 14; index += 1) {
    if (hash2(index, 8, 2) < 0.4) continue;
    const x = hash2(index, 9, 4) * width;
    const y = 210 + hash2(index, 10, 5) * 20;
    const height = 8 + hash2(index, 11, 6) * 12;
    ctx.beginPath();
    ctx.moveTo(x - height * 0.35, y);
    ctx.lineTo(x, y - height);
    ctx.lineTo(x + height * 0.35, y);
    ctx.closePath();
    ctx.fill();
  }

  const near = palette.hillNear;
  ctx.fillStyle = near;
  ctx.beginPath();
  ctx.moveTo(0, 296);
  for (let index = 0; index <= 14; index += 1) {
    const x = (index / 14) * width;
    const y = 246 - hash2(index, 5, 11) * 26 - Math.sin(index * 0.9 + 1.4) * 4;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, 296);
  ctx.closePath();
  ctx.fill();

  drawWindmill(ctx, width * 0.84, 244, motion / (motion > 0 ? 2400 : 1), palette);
}

function drawFields(ctx: CanvasRenderingContext2D, width: number, palette: SkyPalette): void {
  ctx.fillStyle = palette.field;
  ctx.fillRect(0, 250, width, 70);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = mixHex(palette.field, palette.hillNear, 0.6);
  for (let row = 0; row < 5; row += 1) {
    ctx.fillRect(0, 258 + row * 11, width, 1);
  }
  ctx.globalAlpha = 1;
}

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, flap: number, colour: string): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(x) - 4, Math.round(y) - flap);
  ctx.lineTo(Math.round(x), Math.round(y));
  ctx.lineTo(Math.round(x) + 4, Math.round(y) - flap);
  ctx.stroke();
}

export function drawBackdrop(ctx: CanvasRenderingContext2D, input: BackdropInput): void {
  const { width, height, palette, weather } = input;
  const minutes = normalizeMinutes(input.minutes);
  const motion = input.reducedMotion ? 0 : input.now;
  const night = palette.night;
  const rain = weather === "rain";

  const sky = ctx.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, palette.top);
  sky.addColorStop(0.55, palette.mid);
  sky.addColorStop(1, palette.horizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, 304);
  ctx.fillStyle = palette.below;
  ctx.fillRect(0, 290, width, height - 290);

  if (night > 0.02) {
    for (const star of STARS) {
      const twinkle = 0.55 + 0.45 * Math.sin(motion / 900 + star.phase);
      ctx.globalAlpha = Math.min(1, night * twinkle);
      ctx.fillStyle = STAR;
      ctx.fillRect(Math.round(star.x * width), Math.round(star.y * 260), star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  const dayPhase = phaseOf(minutes) !== "night";
  const dawn = 5.6 * 60;
  const dusk = 20.4 * 60;
  if (dayPhase) {
    const progress = Math.max(0, Math.min(1, (minutes - dawn) / (dusk - dawn)));
    drawSun(ctx, 66 + progress * 588, 206 - Math.sin(progress * Math.PI) * 126, palette);
  } else {
    const nightLength = 24 * 60 - dusk + dawn;
    const elapsed = minutes >= dusk ? minutes - dusk : minutes + (24 * 60 - dusk);
    const progress = elapsed / nightLength;
    drawMoon(ctx, 66 + progress * 588, 198 - Math.sin(progress * Math.PI) * 112);
  }

  if (rain) {
    ctx.fillStyle = mixHex(palette.mid, "#26323b", 0.45);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 0, width, 300);
    ctx.globalAlpha = 1;
  }

  const speed = weather === "wind" ? 5.5 : weather === "rain" ? 3.6 : 1;
  for (const entry of CLOUDS) {
    const span = width + 220;
    const x = (entry.x * span + ((motion / 1000) * entry.speed * speed) % span + span) % span - 110;
    ctx.globalAlpha = rain ? 0.75 : 0.55;
    cloud(ctx, x, entry.y, entry.scale, rain ? mixHex(palette.cloud, "#3a4650", 0.5) : palette.cloud);
  }
  ctx.globalAlpha = 1;

  drawHills(ctx, width, palette, motion);
  drawFields(ctx, width, palette);

  if (!input.reducedMotion && !rain) {
    const birdColour = mixHex(palette.cloud, palette.top, 0.35);
    for (let index = 0; index < 3; index += 1) {
      const phase = (motion / 1000) * (7 + index * 2) + index * 220;
      const x = ((phase + index * 260) % (width + 120)) - 60;
      const y = 70 + index * 20 + Math.sin(phase / 9) * 5;
      drawBird(ctx, x, y, (Math.floor(motion / (260 + index * 40)) % 2) * 3, birdColour);
    }
  }

  // Haze where the fields meet the sky.
  const haze = ctx.createLinearGradient(0, 210, 0, 300);
  haze.addColorStop(0, `${palette.horizon}00`);
  haze.addColorStop(0.7, `${palette.horizon}33`);
  haze.addColorStop(1, `${palette.horizon}00`);
  ctx.fillStyle = haze;
  ctx.fillRect(0, 210, width, 90);

  if (rain) {
    ctx.fillStyle = RAIN;
    ctx.globalAlpha = 0.05;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }
}
