import { describe, expect, it } from "vitest";

import { MINUTES_PER_MS } from "@/lib/pen/clock";
import { mulberry32 } from "@/lib/pen/iso";
import { sanitizeSharedState } from "@/lib/pen/protocol";
import { PenSimulation } from "@/lib/pen/simulation";
import { PEN, isPurlWalkable } from "@/lib/pen/world";

function tick(sim: PenSimulation, milliseconds: number, step = 50): void {
  const count = Math.round(milliseconds / step);
  for (let index = 0; index < count; index += 1) sim.update(step);
}

const feed = {
  type: "feed" as const,
  from: "visitor",
  x: 9.5,
  y: 16.5,
  tx: 9.5,
  ty: 10.5,
  kit: { id: "kit-1", slug: "saffron", title: "Saffron", owner: "Ada" },
};

describe("PenSimulation", () => {
  it("moves the shared clock at the day's pace", () => {
    const sim = new PenSimulation({ random: mulberry32(1), clock: 7 * 60 });
    tick(sim, 60_000, 100);
    expect(sim.snapshot().clock).toBeCloseTo(420 + 60_000 * MINUTES_PER_MS, 6);
  });

  it("is fully deterministic for a seeded pen", () => {
    const a = new PenSimulation({ random: mulberry32(7) });
    const b = new PenSimulation({ random: mulberry32(7) });
    tick(a, 20_000);
    tick(b, 20_000);
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  it("keeps Purl inside the pasture and on walkable tiles for minutes", () => {
    const sim = new PenSimulation({ random: mulberry32(11) });
    for (let second = 0; second < 300; second += 1) {
      tick(sim, 1000, 100);
      const { purl, needs } = sim.snapshot();
      expect(purl.x).toBeGreaterThan(PEN.x0);
      expect(purl.y).toBeGreaterThan(PEN.y0);
      expect(purl.x).toBeLessThan(PEN.x1 + 1);
      expect(purl.y).toBeLessThan(PEN.y1 + 1);
      expect(isPurlWalkable(Math.floor(purl.x), Math.floor(purl.y))).toBe(true);
      expect(needs.hunger).toBeGreaterThanOrEqual(0);
      expect(needs.hunger).toBeLessThanOrEqual(1);
    }
  });

  it("nuzzles a nearby visitor and cheers up", () => {
    const sim = new PenSimulation({ random: mulberry32(3) });
    const before = sim.snapshot().needs.joy;
    sim.applyEvent({ type: "pet", from: "visitor", x: 9.5, y: 9.8 });
    const after = sim.snapshot();
    expect(after.purl.action).toBe("nuzzle");
    expect(after.purl.face).toBe("love");
    expect(after.needs.joy).toBeGreaterThan(before);
  });

  it("ignores a pet from across the farm", () => {
    const sim = new PenSimulation({ random: mulberry32(3) });
    sim.applyEvent({ type: "pet", from: "visitor", x: 1.5, y: 16.5 });
    expect(sim.snapshot().purl.action).not.toBe("nuzzle");
  });

  it("trots over when called", () => {
    const sim = new PenSimulation({ random: mulberry32(4) });
    sim.applyEvent({ type: "call", from: "visitor", x: 12.5, y: 12.5 });
    expect(sim.snapshot().purl.action).toBe("seek");
    tick(sim, 2200);
    const { purl } = sim.snapshot();
    expect(Math.hypot(purl.x - 12.5, purl.y - 12.5)).toBeLessThan(0.4);
  });

  it("walks to a thrown kit, eats it, and gets less hungry", () => {
    const sim = new PenSimulation({ random: mulberry32(5), needs: { hunger: 0.6 } });
    const before = sim.snapshot();
    sim.applyEvent(feed);
    tick(sim, 900);
    expect(sim.snapshot().kits[0]?.state).toBe("eating");
    tick(sim, 5000);
    const after = sim.snapshot();
    expect(after.kits).toEqual([]);
    expect(after.needs.hunger).toBeLessThan(before.needs.hunger);
    expect(after.purl.action).not.toBe("eat");
  });

  it("raises a fresh kit out of an interrupted meal", () => {
    const sim = new PenSimulation({ random: mulberry32(5), needs: { hunger: 0.6 } });
    sim.applyEvent(feed);
    tick(sim, 900);
    sim.applyEvent({ type: "pet", from: "visitor", x: 9.5, y: 10.6 });
    expect(sim.snapshot().kits[0]?.state).toBe("fresh");
  });

  it("changes the weather on its own schedule", () => {
    const sim = new PenSimulation({ random: mulberry32(9) });
    const seen = new Set<string>();
    for (let minute = 0; minute < 6; minute += 1) {
      seen.add(sim.snapshot().weather);
      tick(sim, 60_000, 500);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("broadcasts a snapshot that survives the wire sanitiser", () => {
    const sim = new PenSimulation({ random: mulberry32(13) });
    sim.applyEvent(feed);
    tick(sim, 1200);
    const snapshot = sim.snapshot();
    expect(sanitizeSharedState(snapshot)).toEqual(snapshot);
  });

  it("can take over a pen that is already living", () => {
    const oldHost = new PenSimulation({ random: mulberry32(21), needs: { hunger: 0.55 } });
    oldHost.applyEvent(feed);
    tick(oldHost, 5000);
    const handoff = oldHost.snapshot();

    const newHost = new PenSimulation({ random: mulberry32(22) });
    newHost.adopt(handoff);
    const adopted = newHost.snapshot();
    expect(adopted.clock).toBe(handoff.clock);
    expect(adopted.needs).toEqual(handoff.needs);
    expect(adopted.purl.x).toBeCloseTo(handoff.purl.x, 6);
    expect(adopted.purl.y).toBeCloseTo(handoff.purl.y, 6);
    expect(adopted.kits.map((kit) => kit.title)).toEqual(handoff.kits.map((kit) => kit.title));
  });
});
