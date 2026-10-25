import { skyFor } from "@/lib/pen/clock";
import { GRID, TILE_H, TILE_W, hash2, project, type Camera, type WorldPoint } from "@/lib/pen/iso";
import type { DevFrame, PeerInfo, SharedKit, SharedState } from "@/lib/pen/protocol";
import { type PurlAction } from "@/lib/pen/purl";
import { PROPS, isInsidePen, tileKind } from "@/lib/pen/world";

import { drawBackdrop } from "@/components/pen/scene/backdrop";
import { drawChickens, drawDeveloper, drawDuck, drawKit, drawPurl, kitScreen } from "@/components/pen/scene/actors";
import { groundCanvas } from "@/components/pen/scene/ground";
import { FARM, FIREFLY, PURL_FILL } from "@/components/pen/scene/palette";
import { drawFence, drawProp, fenceSegments, lampGlow } from "@/components/pen/scene/props";
import { EFFECTS } from "@/components/pet/sprites";
import { colorFor } from "@/lib/pen/protocol";

/**
 * The pen's canvas. It owns only presentation: smoothing, particles, weather and the
 * painter's-order walk. The simulation stays in src/lib/pen/simulation.ts and the network
 * state arrives as plain snapshots.
 */

export interface PenView {
  snapshot: SharedState;
  local: DevFrame;
  remote: DevFrame[];
  peers: PeerInfo[];
  localId: string;
  camera: Camera;
  hover: WorldPoint | null;
  feedMode: boolean;
  now: number;
  dt: number;
  reducedMotion: boolean;
}

interface DisplayDev {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  dir: number;
  action: DevFrame["action"];
  moving: boolean;
  color: number;
  local: boolean;
  seen: number;
}

type ParticleKind = "heart" | "note" | "sparkle" | "dust" | "crumb";

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  born: number;
  life: number;
  seed: number;
}

interface Throw {
  from: WorldPoint;
  to: WorldPoint;
  born: number;
  life: number;
}

interface Drawable {
  depth: number;
  draw: () => void;
}

const FENCES = fenceSegments();

const rainRandom = (() => {
  let seed = 991;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
})();
const RAIN_DROPS = Array.from({ length: 88 }, () => ({
  x: rainRandom() * 760,
  phase: rainRandom() * 500,
  speed: 420 + rainRandom() * 320,
  length: 4 + rainRandom() * 7,
}));
const FIREFLIES = Array.from({ length: 20 }, () => ({
  x: 4.2 + rainRandom() * 10.2,
  y: 4.4 + rainRandom() * 10,
  phase: rainRandom() * 10,
  radius: 0.25 + rainRandom() * 0.5,
}));

function diamond(ctx: CanvasRenderingContext2D, sx: number, sy: number, inset = 0): void {
  ctx.beginPath();
  ctx.moveTo(Math.round(sx), Math.round(sy - TILE_H / 2) + inset);
  ctx.lineTo(Math.round(sx + TILE_W / 2) - inset, Math.round(sy));
  ctx.lineTo(Math.round(sx), Math.round(sy + TILE_H / 2) - inset);
  ctx.lineTo(Math.round(sx - TILE_W / 2) + inset, Math.round(sy));
  ctx.closePath();
}

function pixel(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, scale: number, colour: string): void {
  ctx.fillStyle = colour;
  rows.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column += 1) {
      if (row[column] === "#" || row[column] === "B" || row[column] === "W" || row[column] === "S") {
        ctx.fillRect(Math.round(x + column * scale), Math.round(y + rowIndex * scale), scale, scale);
      }
    }
  });
}

export class PenScene {
  private readonly canvas: HTMLCanvasElement;
  private purlX = 0;
  private purlY = 0;
  private started = false;
  private lastAction: PurlAction | null = null;
  private particles: Particle[] = [];
  private throws: Throw[] = [];
  private devs = new Map<string, DisplayDev>();
  private knownKits = new Map<string, SharedKit>();
  private crumbClock = 0;
  private dustClock = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  throwKit(from: WorldPoint, to: WorldPoint, now: number): void {
    this.throws.push({ from, to, born: now, life: 760 });
  }

  /** A little burst for local UI feedback (petting, waving). */
  burst(kind: ParticleKind, x: number, y: number, now: number, count = 4): void {
    for (let index = 0; index < count; index += 1) {
      this.particles.push({
        kind,
        x: x + (Math.random() - 0.5) * 0.8,
        y: y + (Math.random() - 0.5) * 0.6,
        born: now + index * 90,
        life: kind === "heart" ? 1500 : 1000,
        seed: Math.random() * 10,
      });
    }
  }

  render(view: PenView): void {
    const canvas = this.canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const now = view.now;
    const dt = Math.max(0, Math.min(120, view.dt));
    const palette = skyFor(view.snapshot.clock);
    const weather = view.snapshot.weather;
    const night = palette.night;

    this.smoothPurl(view, dt);
    this.react(view, now);
    this.syncDevs(view, now);
    this.updateParticles(now);
    this.updateThrows(now);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawBackdrop(ctx, {
      width,
      height,
      minutes: view.snapshot.clock,
      weather,
      now,
      palette,
      reducedMotion: view.reducedMotion,
    });

    ctx.setTransform(view.camera.scale, 0, 0, view.camera.scale, Math.round(view.camera.ox), Math.round(view.camera.oy));
    ctx.drawImage(groundCanvas(), 0, 0);
    this.drawWater(ctx, now, view.reducedMotion);
    this.drawHover(ctx, view);

    const drawables: Drawable[] = [];
    for (const prop of PROPS) {
      drawables.push({
        depth: prop.x + prop.y,
        draw: () => drawProp(ctx, prop, { now, night, weather, reducedMotion: view.reducedMotion }),
      });
    }
    for (const fence of FENCES) {
      drawables.push({ depth: fence.depth, draw: () => drawFence(ctx, fence) });
    }
    drawables.push({ depth: 8.6, draw: () => drawChickens(ctx, now, view.reducedMotion) });
    drawables.push({ depth: 15 + 2, draw: () => drawDuck(ctx, now, view.reducedMotion) });

    for (const kit of view.snapshot.kits) {
      drawables.push({ depth: kit.x + kit.y, draw: () => drawKit(ctx, kit, now, view.reducedMotion) });
    }

    const purl = {
      ...view.snapshot.purl,
      x: this.purlX,
      y: this.purlY,
    };
    drawables.push({
      depth: this.purlX + this.purlY,
      draw: () => drawPurl(ctx, purl, now, view.reducedMotion),
    });

    const names = new Map(view.peers.map((peer) => [peer.id, peer.name]));
    for (const [devId, dev] of this.devs) {
      const name = dev.local ? (names.get(view.localId) ?? "you") : (names.get(devId) ?? "visitor");
      drawables.push({
        depth: dev.x + dev.y,
        draw: () =>
          drawDeveloper(
            ctx,
            {
              id: dev.local ? view.localId : devId,
              name,
              x: dev.x,
              y: dev.y,
              dir: dev.dir,
              action: dev.action,
              moving: dev.moving,
              color: dev.color,
              local: dev.local,
            },
            now,
            view.reducedMotion,
          ),
      });
    }

    drawables.sort((a, b) => a.depth - b.depth);
    for (const drawable of drawables) drawable.draw();

    this.drawParticles(ctx, now);
    this.drawThrows(ctx, now);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (night > 0.01) {
      ctx.globalAlpha = palette.ambientAlpha;
      ctx.fillStyle = palette.ambient;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }

    ctx.setTransform(view.camera.scale, 0, 0, view.camera.scale, Math.round(view.camera.ox), Math.round(view.camera.oy));
    this.drawGlow(ctx, view, night);
    if (night > 0.15 && !view.reducedMotion) this.drawFireflies(ctx, view, night);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (!view.reducedMotion) this.drawWeather(ctx, view, width, height, now);
    this.drawVignette(ctx, width, height);
  }

  private smoothPurl(view: PenView, dt: number): void {
    const target = view.snapshot.purl;
    if (!this.started) {
      this.purlX = target.x;
      this.purlY = target.y;
      this.started = true;
      return;
    }
    const distance = Math.hypot(target.x - this.purlX, target.y - this.purlY);
    if (distance > 4) {
      this.purlX = target.x;
      this.purlY = target.y;
      return;
    }
    const alpha = 1 - Math.exp(-dt / 70);
    this.purlX += (target.x - this.purlX) * alpha;
    this.purlY += (target.y - this.purlY) * alpha;
  }

  private syncDevs(view: PenView, now: number): void {
    const peers = new Map(view.peers.map((peer) => [peer.id, peer]));
    const seen = new Set<string>();

    const touch = (frame: DevFrame, local: boolean) => {
      if (frame.id !== view.localId && local) return;
      if (frame.id === view.localId && !local) return;
      seen.add(frame.id);
      const peer = peers.get(frame.id);
      const existing = this.devs.get(frame.id);
      const color = peer?.color ?? colorFor(frame.id);
      if (!existing) {
        this.devs.set(frame.id, {
          x: frame.x,
          y: frame.y,
          targetX: frame.x,
          targetY: frame.y,
          dir: frame.dir,
          action: frame.action,
          moving: frame.moving,
          color,
          local,
          seen: now,
        });
        return;
      }
      existing.targetX = frame.x;
      existing.targetY = frame.y;
      existing.dir = frame.dir;
      existing.action = frame.action;
      existing.moving = frame.moving;
      existing.color = color;
      existing.local = local;
      existing.seen = now;
    };

    touch(view.local, true);
    for (const frame of view.remote) touch(frame, false);

    for (const peer of view.peers) {
      if (peer.id === view.localId || seen.has(peer.id)) continue;
      const existing = this.devs.get(peer.id);
      if (existing) {
        existing.seen = now;
      } else {
        this.devs.set(peer.id, {
          x: peer.x,
          y: peer.y,
          targetX: peer.x,
          targetY: peer.y,
          dir: 1,
          action: "idle",
          moving: false,
          color: peer.color,
          local: false,
          seen: now,
        });
      }
      seen.add(peer.id);
    }

    for (const [id, dev] of this.devs) {
      if (now - dev.seen > 3000) {
        this.devs.delete(id);
        continue;
      }
      const distance = Math.hypot(dev.targetX - dev.x, dev.targetY - dev.y);
      if (distance > 6) {
        dev.x = dev.targetX;
        dev.y = dev.targetY;
        continue;
      }
      const alpha = 1 - Math.exp(-16 / 120);
      dev.x += (dev.targetX - dev.x) * alpha;
      dev.y += (dev.targetY - dev.y) * alpha;
    }
  }

  private react(view: PenView, now: number): void {
    const action = view.snapshot.purl.action;
    const { x, y } = view.snapshot.purl;

    if (this.lastAction !== null && action !== this.lastAction) {
      if (action === "nuzzle") this.burst("heart", x, y, now, 4);
      else if (action === "bleat") this.burst("note", x, y, now, 2);
      else if (action === "play") this.burst("sparkle", x, y, now, 2);
      else if (action === "zoomies") this.burst("dust", x, y, now, 4);
    }
    this.lastAction = action;

    if (action === "eat") {
      this.crumbClock += view.dt;
      if (this.crumbClock > 380) {
        this.crumbClock = 0;
        this.particles.push({ kind: "crumb", x, y: y + 0.25, born: now, life: 700, seed: Math.random() * 10 });
      }
    } else {
      this.crumbClock = 0;
    }
    if (action === "zoomies") {
      this.dustClock += view.dt;
      if (this.dustClock > 190) {
        this.dustClock = 0;
        this.particles.push({ kind: "dust", x, y, born: now, life: 600, seed: Math.random() * 10 });
      }
    } else {
      this.dustClock = 0;
    }

    const current = new Map(view.snapshot.kits.map((kit) => [kit.id, kit]));
    for (const [id, kit] of this.knownKits) {
      if (!current.has(id)) {
        this.particles.push({ kind: "sparkle", x: kit.x, y: kit.y, born: now, life: 900, seed: 1 });
        this.particles.push({ kind: "sparkle", x: kit.x + 0.15, y: kit.y - 0.1, born: now + 80, life: 900, seed: 4 });
      }
    }
    this.knownKits = current;
  }

  private updateParticles(now: number): void {
    this.particles = this.particles.filter((particle) => now < particle.born + particle.life);
  }

  private updateThrows(now: number): void {
    const finished: Throw[] = [];
    this.throws = this.throws.filter((effect) => {
      if (now < effect.born + effect.life) return true;
      finished.push(effect);
      return false;
    });
    for (const effect of finished) {
      this.burst("sparkle", effect.to.x, effect.to.y, now, 4);
    }
  }

  private drawWater(ctx: CanvasRenderingContext2D, now: number, reducedMotion: boolean): void {
    ctx.fillStyle = FARM.water;
    for (let j = 1; j <= 3; j += 1) {
      for (let i = 14; i <= 16; i += 1) {
        const point = project(i + 0.5, j + 0.5);
        diamond(ctx, point.sx, point.sy);
        ctx.fill();
        const drift = reducedMotion ? 0 : ((now / 1500 + i * 0.37 + j * 0.61) % 1);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = FARM.waterLight;
        ctx.fillRect(Math.round(point.sx - 11 + drift * 13), Math.round(point.sy - 2), 7, 1);
        ctx.fillRect(Math.round(point.sx - 3 - drift * 9), Math.round(point.sy + 3), 5, 1);
        ctx.fillStyle = FARM.foam;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(Math.round(point.sx + 2 + drift * 7), Math.round(point.sy - 4), 3, 1);
        ctx.globalAlpha = 1;
        ctx.fillStyle = FARM.water;
      }
    }
  }

  private drawHover(ctx: CanvasRenderingContext2D, view: PenView): void {
    if (!view.hover) return;
    const i = Math.floor(view.hover.x);
    const j = Math.floor(view.hover.y);
    if (i < 0 || j < 0 || i >= GRID || j >= GRID) return;
    if (tileKind(i, j) === "water") return;
    const point = project(i + 0.5, j + 0.5);
    const inside = isInsidePen(i + 0.5, j + 0.5);
    diamond(ctx, point.sx, point.sy);
    ctx.fillStyle = inside ? "rgba(217, 255, 114, 0.10)" : "rgba(242, 243, 245, 0.06)";
    ctx.fill();
    ctx.strokeStyle = inside ? "rgba(217, 255, 114, 0.65)" : "rgba(167, 171, 181, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (view.feedMode && inside) {
      drawKit(
        ctx,
        { id: "ghost", x: i + 0.5, y: j + 0.5, title: "", owner: "", state: "fresh" },
        view.now,
        view.reducedMotion,
      );
    }
  }

  private drawGlow(ctx: CanvasRenderingContext2D, view: PenView, night: number): void {
    if (night < 0.08) return;
    for (const prop of PROPS) {
      if (prop.kind === "lamp") lampGlow(ctx, prop, night);
    }
    const window = project(3.5, 2.2);
    const glow = ctx.createRadialGradient(window.sx, window.sy - 24, 2, window.sx, window.sy - 24, 30);
    glow.addColorStop(0, `rgba(255, 207, 122, ${0.22 * night})`);
    glow.addColorStop(1, "rgba(255, 207, 122, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(window.sx - 32, window.sy - 56, 64, 64);
    for (const kit of view.snapshot.kits) {
      if (kit.state !== "fresh") continue;
      const point = kitScreen(kit);
      const glowKit = ctx.createRadialGradient(point.sx, point.sy - 10, 1, point.sx, point.sy - 10, 18);
      glowKit.addColorStop(0, `rgba(217, 255, 114, ${0.16 * (0.4 + night)})`);
      glowKit.addColorStop(1, "rgba(217, 255, 114, 0)");
      ctx.fillStyle = glowKit;
      ctx.fillRect(point.sx - 20, point.sy - 30, 40, 40);
    }
  }

  private drawFireflies(ctx: CanvasRenderingContext2D, view: PenView, night: number): void {
    for (const fly of FIREFLIES) {
      const bx = fly.x + Math.sin(view.now / 2400 + fly.phase) * fly.radius;
      const by = fly.y + Math.cos(view.now / 3100 + fly.phase * 1.3) * fly.radius;
      const point = project(bx, by);
      const pulse = 0.35 + 0.65 * Math.abs(Math.sin(view.now / 900 + fly.phase));
      ctx.globalAlpha = pulse * night;
      ctx.fillStyle = FIREFLY;
      ctx.fillRect(Math.round(point.sx) - 2, Math.round(point.sy) - 2, 5, 5);
      ctx.globalAlpha = pulse * night * 0.35;
      ctx.fillRect(Math.round(point.sx) - 4, Math.round(point.sy) - 4, 9, 9);
    }
    ctx.globalAlpha = 1;
  }

  private drawParticles(ctx: CanvasRenderingContext2D, now: number): void {
    for (const particle of this.particles) {
      const age = Math.max(0, now - particle.born) / particle.life;
      if (age < 0 || age > 1) continue;
      const point = project(particle.x, particle.y);
      const alpha = 1 - age;
      ctx.globalAlpha = alpha;
      const drift = Math.sin(particle.seed + age * 3.2) * 3;
      const x = Math.round(point.sx + drift);
      const y = Math.round(point.sy);
      switch (particle.kind) {
        case "heart":
          pixel(ctx, EFFECTS.heart, x - 4, y - 30 - age * 20, 2, PURL_FILL.B);
          break;
        case "note":
          pixel(ctx, EFFECTS.note, x + 3, y - 34 - age * 22, 2, PURL_FILL.S);
          break;
        case "sparkle":
          pixel(ctx, EFFECTS.sparkle, x - 4, y - 14 - age * 14, 2, PURL_FILL.h);
          break;
        case "dust":
          ctx.globalAlpha = alpha * 0.45;
          ctx.fillStyle = FARM.hayLight;
          ctx.fillRect(x - 3, y - 3 - age * 4, 3, 2);
          ctx.fillRect(x + 2, y - 1 - age * 5, 2, 2);
          break;
        case "crumb":
          ctx.globalAlpha = alpha * 0.8;
          ctx.fillStyle = FARM.hay;
          ctx.fillRect(x + Math.round(drift), y - 8 + age * 10, 2, 1);
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawThrows(ctx: CanvasRenderingContext2D, now: number): void {
    for (const effect of this.throws) {
      const t = Math.max(0, Math.min(1, (now - effect.born) / effect.life));
      const from = project(effect.from.x, effect.from.y);
      const to = project(effect.to.x, effect.to.y);
      const x = from.sx + (to.sx - from.sx) * t;
      const y = from.sy + (to.sy - from.sy) * t - Math.sin(t * Math.PI) * 48;
      ctx.fillStyle = FARM.cream;
      ctx.fillRect(Math.round(x) - 5, Math.round(y) - 14, 10, 12);
      ctx.fillStyle = PURL_FILL.S;
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 12, 3, 1);
      ctx.fillStyle = FARM.stone;
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 8, 6, 1);
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 5, 4, 1);
    }
  }

  private drawWeather(ctx: CanvasRenderingContext2D, view: PenView, width: number, height: number, now: number): void {
    if (view.snapshot.weather === "rain") {
      ctx.strokeStyle = "rgba(159, 182, 191, 0.46)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const drop of RAIN_DROPS) {
        const travel = (drop.phase + (now / 1000) * drop.speed) % 500;
        const x = (drop.x + travel * 0.14) % (width + 40);
        const y = travel - 20;
        ctx.moveTo(Math.round(x), Math.round(y));
        ctx.lineTo(Math.round(x - 3), Math.round(y + drop.length));
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(159, 182, 191, 0.10)";
      for (let index = 0; index < 12; index += 1) {
        const x = (hash2(index, 4, 8) * width + now / 20) % width;
        const y = 300 + hash2(index, 9, 2) * 130;
        ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
      }
    } else if (view.snapshot.weather === "wind") {
      ctx.fillStyle = FARM.leafLight;
      for (let index = 0; index < 14; index += 1) {
        const speed = 46 + hash2(index, 3, 9) * 60;
        const x = (hash2(index, 7, 1) * width + (now / 1000) * speed) % (width + 80) - 40;
        const y = 120 + hash2(index, 11, 5) * 280 + Math.sin(now / 900 + index) * 10;
        ctx.globalAlpha = 0.35 + hash2(index, 13, 6) * 0.3;
        ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.32, width / 2, height / 2, height * 0.92);
    vignette.addColorStop(0, "rgba(5, 7, 9, 0)");
    vignette.addColorStop(1, "rgba(5, 7, 9, 0.46)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
}
