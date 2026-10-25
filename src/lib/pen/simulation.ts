import { MINUTES_PER_MS, normalizeMinutes, type Weather } from "@/lib/pen/clock";
import { clamp, type WorldPoint } from "@/lib/pen/iso";
import { findPath } from "@/lib/pen/path";
import type { PenEvent, SharedKit, SharedState } from "@/lib/pen/protocol";
import { clamp01, chooseActivity, moodOf, poseFor, type Needs, type PurlAction } from "@/lib/pen/purl";
import {
  GRAZE_SPOTS,
  PEN,
  PURL_HOME,
  SHELTER_SPOT,
  isPurlWalkable,
  nearestPurlSpot,
} from "@/lib/pen/world";

/**
 * The pen's shared life. Exactly one visitor (the host) runs this; everybody else draws the
 * snapshots it broadcasts. Keeping the brain here, with no DOM, means the whole personality
 * can be tested in milliseconds.
 */

const MAX_KITS = 8;
const EAT_MS = 3400;
const WEATHER_MIN_MS = 38_000;
const WEATHER_MAX_MS = 92_000;

export interface PenSimOptions {
  random?: () => number;
  /** Minutes past midnight. Defaults to a bright mid-morning. */
  clock?: number;
  weather?: Weather;
  needs?: Partial<Needs>;
}

const START_NEEDS: Needs = { hunger: 0.34, energy: 0.82, joy: 0.64 };

function speedFor(action: PurlAction): number {
  switch (action) {
    case "seek":
      return 3.1;
    case "zoomies":
      return 5.4;
    case "play":
      return 2.4;
    case "wander":
      return 1.35;
    default:
      return 1.7;
  }
}

export class PenSimulation {
  private readonly random: () => number;
  private t = 0;
  private clock: number;
  private weather: Weather;
  private needs: Needs;
  private x = PURL_HOME.x;
  private y = PURL_HOME.y;
  private dir = 1;
  private action: PurlAction = "idle";
  private since = 0;
  private until = Number.POSITIVE_INFINITY;
  private path: WorldPoint[] = [];
  private arrival: PurlAction | null = null;
  private step = false;
  private stride = 0;
  private lift = 0;
  private lookSegment = 0;
  private eating: string | null = null;
  private kits: SharedKit[] = [];
  private weatherClock = 0;
  private weatherEvery: number;

  constructor(options: PenSimOptions = {}) {
    this.random = options.random ?? Math.random;
    this.clock = normalizeMinutes(options.clock ?? 7 * 60 + 40);
    this.weather = options.weather ?? "clear";
    this.needs = { ...START_NEEDS, ...options.needs };
    this.weatherEvery = this.rand(WEATHER_MIN_MS, WEATHER_MAX_MS);
    this.settle("idle", this.rand(1200, 2600));
  }

  /** Advance the whole farm. `dt` is milliseconds; long gaps are clamped by the caller. */
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const seconds = dt / 1000;
    this.t += dt;
    this.since += dt;
    this.clock = normalizeMinutes(this.clock + dt * MINUTES_PER_MS);
    this.needs = {
      hunger: clamp01(this.needs.hunger + (this.action === "graze" || this.action === "eat" ? -0.006 : 0.0022) * seconds),
      energy: clamp01(
        this.needs.energy +
          (this.action === "nap" ? 0.035 : this.action === "play" || this.action === "zoomies" ? -0.004 : -0.0009) * seconds,
      ),
      joy: clamp01(
        this.needs.joy +
          (this.action === "nuzzle" ? 0.012 : this.action === "play" || this.action === "zoomies" ? 0.0035 : -0.0014) * seconds,
      ),
    };
    this.advanceWeather(dt);

    if (this.path.length > 0) {
      this.walk(dt);
    } else if (this.arrival) {
      this.reachTarget();
    } else if (this.t >= this.until) {
      this.finishAction();
      this.planNext();
    }

    this.animate();
  }

  /** A visitor did something. Everyone's channel is public, so callers sanitise first. */
  applyEvent(event: PenEvent): void {
    switch (event.type) {
      case "pet": {
        if (this.distanceTo(event.x, event.y) > 2.6) return;
        this.faceToward(event.x, event.y);
        this.interrupt();
        this.settle("nuzzle", 2000);
        this.needs.joy = clamp01(this.needs.joy + 0.17);
        this.needs.energy = clamp01(this.needs.energy + 0.01);
        return;
      }
      case "call": {
        this.interrupt();
        this.walkTo(nearestPurlSpot(event.x, event.y), "nuzzle", "seek");
        this.needs.joy = clamp01(this.needs.joy + 0.045);
        return;
      }
      case "wave": {
        if (!this.availableForGreeting()) return;
        this.faceToward(event.x, event.y);
        this.interrupt();
        this.settle("bleat", 1500);
        this.needs.joy = clamp01(this.needs.joy + 0.03);
        return;
      }
      case "feed": {
        const spot = nearestPurlSpot(event.tx, event.ty);
        this.kits = this.kits.filter((kit) => kit.id !== event.kit.id);
        this.kits.push({
          id: event.kit.id,
          x: spot.x,
          y: spot.y,
          title: event.kit.title,
          owner: event.kit.owner,
          state: "fresh",
        });
        if (this.kits.length > MAX_KITS) this.kits.splice(0, this.kits.length - MAX_KITS);
        if (this.eating !== event.kit.id) {
          this.interrupt();
          this.walkTo(spot, "eat", "seek");
        }
        return;
      }
    }
  }

  /** The wire format: everything the renderer needs, and nothing else. */
  snapshot(): SharedState {
    const view = { dir: this.dir, step: this.step, since: Math.round(this.since), lift: Math.round(this.lift) };
    const pose = poseFor(this.action, view);
    return {
      t: Math.round(this.t),
      clock: this.clock,
      weather: this.weather,
      mood: moodOf(this.needs),
      needs: { ...this.needs },
      purl: {
        x: this.x,
        y: this.y,
        dir: view.dir,
        action: this.action,
        since: view.since,
        lift: view.lift,
        step: view.step,
        ...pose,
      },
      kits: this.kits.map((kit) => ({ ...kit })),
    };
  }

  /** Become the host of an already-living pen when the previous host leaves. */
  adopt(state: SharedState): void {
    this.x = state.purl.x;
    this.y = state.purl.y;
    this.dir = state.purl.dir;
    this.action = state.purl.action === "seek" ? "idle" : state.purl.action;
    this.since = 0;
    this.lift = 0;
    this.step = false;
    this.path = [];
    this.arrival = null;
    this.eating = null;
    this.clock = state.clock;
    this.weather = state.weather;
    this.needs = { ...state.needs };
    this.kits = state.kits.map((kit) => ({ ...kit, state: "fresh" }));
    this.settle(this.action, this.rand(900, 1800));
  }

  private walkTo(target: WorldPoint, arrival: PurlAction, travel: PurlAction): void {
    this.action = travel;
    this.since = 0;
    this.until = Number.POSITIVE_INFINITY;
    this.arrival = arrival;
    this.lookSegment = 0;
    this.faceToward(target.x, target.y);
    this.path = findPath({ x: this.x, y: this.y }, target, isPurlWalkable);
    if (this.path.length === 0) {
      if (Math.hypot(target.x - this.x, target.y - this.y) < 0.2) {
        this.x = target.x;
        this.y = target.y;
        this.reachTarget();
      } else {
        this.path = [target];
      }
    }
  }

  private walk(dt: number): void {
    let budget = speedFor(this.action) * (dt / 1000);
    let moved = 0;
    while (budget > 0) {
      const next = this.path[0];
      if (!next) break;
      const dx = next.x - this.x;
      const dy = next.y - this.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 1e-4) {
        this.path.shift();
        continue;
      }
      const take = Math.min(distance, budget);
      this.x = clamp(this.x + (dx / distance) * take, PEN.x0 + 1.02, PEN.x1 - 0.02);
      this.y = clamp(this.y + (dy / distance) * take, PEN.y0 + 1.02, PEN.y1 - 0.02);
      budget -= take;
      moved += take;
      if (take >= distance - 1e-6) this.path.shift();
    }
    if (moved > 0) {
      const screenDx = this.path[0] ? (this.path[0].x - this.x) - (this.path[0].y - this.y) : 0;
      if (Math.abs(screenDx) > 0.02) this.dir = screenDx > 0 ? 1 : -1;
      this.stride += moved * 2.6;
      if (this.stride >= 0.62) {
        this.stride %= 0.62;
        this.step = !this.step;
      }
    }
  }

  private reachTarget(): void {
    const arrival = this.arrival;
    this.arrival = null;
    this.path = [];
    switch (arrival) {
      case "graze":
        this.settle("graze", this.rand(5200, 9200));
        return;
      case "nap":
        this.settle("nap", this.rand(15_000, 24_000));
        return;
      case "eat": {
        const kit = this.closestKit();
        if (kit && Math.hypot(kit.x - this.x, kit.y - this.y) < 0.9) {
          kit.state = "eating";
          this.eating = kit.id;
          this.settle("eat", EAT_MS);
        } else {
          this.settle("idle", this.rand(700, 1400));
        }
        return;
      }
      case "play":
        this.settle("play", this.rand(2200, 3800));
        return;
      case "zoomies":
        this.settle("zoomies", this.rand(1500, 2800));
        return;
      case "nuzzle":
        this.settle("nuzzle", 1900);
        return;
      case "bleat":
        this.settle("bleat", 1400);
        return;
      default:
        this.settle("idle", this.rand(1800, 4200));
    }
  }

  private planNext(): void {
    const activity = chooseActivity(
      this.needs,
      { hasKit: this.kits.some((kit) => kit.state === "fresh"), raining: this.weather === "rain" },
      this.random,
    );
    switch (activity) {
      case "nap":
        this.walkTo(SHELTER_SPOT, "nap", "seek");
        return;
      case "eat": {
        const kit = this.closestKit();
        if (kit) {
          this.walkTo(kit, "eat", "seek");
          return;
        }
        this.settle("idle", this.rand(1600, 3000));
        return;
      }
      case "graze": {
        const spots = GRAZE_SPOTS.filter((spot) => isPurlWalkable(Math.floor(spot.x), Math.floor(spot.y)));
        const spot = spots[Math.floor(this.random() * spots.length)] ?? PURL_HOME;
        this.walkTo(spot, "graze", "wander");
        return;
      }
      case "wander": {
        this.walkTo(this.randomPenSpot(), "idle", "wander");
        return;
      }
      case "play": {
        const target = {
          x: clamp(this.x + (this.random() - 0.5) * 4, PEN.x0 + 1.02, PEN.x1 - 0.02),
          y: clamp(this.y + (this.random() - 0.5) * 4, PEN.y0 + 1.02, PEN.y1 - 0.02),
        };
        this.walkTo(nearestPurlSpot(target.x, target.y), "play", "play");
        return;
      }
      case "zoomies":
        this.walkTo(this.randomPenSpot(), "zoomies", "zoomies");
        return;
      case "stretch":
        this.settle("stretch", 1800);
        return;
      default:
        this.settle("idle", this.rand(2600, 6400));
    }
  }

  private settle(action: PurlAction, duration: number): void {
    this.action = action;
    this.since = 0;
    this.until = this.t + duration;
    this.path = [];
    this.arrival = null;
    this.lookSegment = 0;
    if (action === "nap") this.lift = 0;
  }

  /** Stop what Purl is doing without eating the kit in its mouth. */
  private interrupt(): void {
    if (this.eating) {
      const kit = this.kits.find((candidate) => candidate.id === this.eating);
      if (kit) kit.state = "fresh";
      this.eating = null;
    }
    this.path = [];
    this.arrival = null;
    this.until = Number.POSITIVE_INFINITY;
  }

  private finishAction(): void {
    if (this.action === "eat" && this.eating) {
      const index = this.kits.findIndex((kit) => kit.id === this.eating);
      if (index >= 0) {
        this.kits.splice(index, 1);
        this.needs.hunger = clamp01(this.needs.hunger - 0.44);
        this.needs.joy = clamp01(this.needs.joy + 0.1);
      }
      this.eating = null;
    }
  }

  private animate(): void {
    if (this.action === "play" || this.action === "zoomies") {
      const cycle = (this.since % 400) / 400;
      this.lift = Math.round(Math.sin(cycle * Math.PI) * 7);
    } else {
      this.lift = 0;
    }
    if ((this.action === "idle" || this.action === "graze") && this.since > 1600) {
      const segment = Math.floor(this.since / 2700);
      if (segment !== this.lookSegment) {
        this.lookSegment = segment;
        this.dir = this.dir === 1 ? -1 : 1;
      }
    }
  }

  private advanceWeather(dt: number): void {
    this.weatherClock += dt;
    if (this.weatherClock < this.weatherEvery) return;
    this.weatherClock = 0;
    this.weatherEvery = this.rand(WEATHER_MIN_MS, WEATHER_MAX_MS);
    const roll = this.random();
    this.weather = roll < 0.63 ? "clear" : roll < 0.87 ? "wind" : "rain";
  }

  private availableForGreeting(): boolean {
    if (this.path.length > 0) return false;
    return this.action === "idle" || this.action === "graze" || this.action === "stretch" || this.action === "bleat";
  }

  private closestKit(): SharedKit | null {
    let best: SharedKit | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const kit of this.kits) {
      if (kit.state !== "fresh") continue;
      const distance = Math.hypot(kit.x - this.x, kit.y - this.y);
      if (distance < bestDistance) {
        best = kit;
        bestDistance = distance;
      }
    }
    return best;
  }

  private randomPenSpot(): WorldPoint {
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const i = Math.floor(this.rand(PEN.x0 + 1, PEN.x1));
      const j = Math.floor(this.rand(PEN.y0 + 1, PEN.y1));
      if (isPurlWalkable(i, j)) return { x: i + 0.5, y: j + 0.5 };
    }
    return { ...PURL_HOME };
  }

  private faceToward(x: number, y: number): void {
    const screenDx = x - this.x - (y - this.y);
    if (Math.abs(screenDx) > 0.05) this.dir = screenDx > 0 ? 1 : -1;
  }

  private distanceTo(x: number, y: number): number {
    return Math.hypot(x - this.x, y - this.y);
  }

  private rand(min: number, max: number): number {
    return min + this.random() * (max - min);
  }
}
