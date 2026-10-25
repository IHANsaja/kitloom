import { describe, expect, it } from "vitest";

import {
  PEER_COLORS,
  cleanName,
  colorFor,
  sanitizeDevFrame,
  sanitizeEvent,
  sanitizePeer,
  sanitizeSharedState,
} from "@/lib/pen/protocol";

const goodState = {
  t: 1200,
  clock: 600,
  weather: "clear",
  mood: "content",
  needs: { hunger: 0.2, energy: 0.8, joy: 0.6 },
  purl: {
    x: 9.5,
    y: 9.5,
    dir: 1,
    action: "graze",
    since: 300,
    lift: 0,
    step: false,
    face: "graze",
    ears: "down",
    legs: "stand",
    lying: false,
  },
  kits: [{ id: "kit-1", x: 9.5, y: 10.5, title: "Rust forge", owner: "Ada", state: "fresh" }],
};

describe("untrusted peer payloads", () => {
  it("cleans display names", () => {
    expect(cleanName("  Ada\n  Lovelace  ")).toBe("Ada Lovelace");
    expect(cleanName("a\u0000b\u001fc")).toBe("abc");
    expect(cleanName("x".repeat(80))).toHaveLength(24);
    expect(cleanName(42)).toBe("");
  });

  it("accepts safe ids and rejects everything else", () => {
    expect(sanitizePeer({ id: "abc_123-XY", name: "Ada" })?.id).toBe("abc_123-XY");
    expect(sanitizePeer({ id: "../etc", name: "Ada" })).toBeNull();
    expect(sanitizePeer({ id: "", name: "Ada" })).toBeNull();
    expect(sanitizePeer({ id: "ok", name: "" })?.name).toBe("guest");
  });

  it("gives every id a stable colour in range", () => {
    for (const id of ["a", "ada", "grace-hopper", "x".repeat(64)]) {
      const colour = colorFor(id);
      expect(colour).toBe(colorFor(id));
      expect(colour).toBeGreaterThanOrEqual(0);
      expect(colour).toBeLessThan(PEER_COLORS);
    }
  });

  it("drops developer frames that are not finite or not a known action", () => {
    expect(sanitizeDevFrame({ id: "ada", x: 5, y: 5, action: "walk", dir: -1, moving: true, t: 10 })).toEqual({
      id: "ada",
      x: 5,
      y: 5,
      dir: -1,
      action: "walk",
      moving: true,
      t: 10,
    });
    expect(sanitizeDevFrame({ id: "ada", x: Number.NaN, y: 5, action: "walk" })).toBeNull();
    expect(sanitizeDevFrame({ id: "ada", x: 5, y: 5, action: "sleep" })).toBeNull();
    expect(sanitizeDevFrame({ id: "ada", x: 40, y: -9, action: "idle" })?.x).toBe(20);
  });
});

describe("untrusted pen events", () => {
  it("keeps simple reactions and clamps their position", () => {
    expect(sanitizeEvent({ type: "pet", from: "ada", x: 99, y: -4 })).toEqual({ type: "pet", from: "ada", x: 20, y: -2 });
    expect(sanitizeEvent({ type: "wave", from: "ada", x: 9, y: 9 })).toEqual({ type: "wave", from: "ada", x: 9, y: 9 });
    expect(sanitizeEvent({ type: "dance", from: "ada", x: 9, y: 9 })).toBeNull();
  });

  it("requires a complete, clean kit to feed Purl", () => {
    const feed = sanitizeEvent({
      type: "feed",
      from: "ada",
      x: 9.5,
      y: 16.5,
      tx: 1,
      ty: 99,
      kit: { id: "kit-9", slug: "rust", title: "  Rust forge  ", owner: "Ada" },
    });
    expect(feed).toEqual({
      type: "feed",
      from: "ada",
      x: 9.5,
      y: 16.5,
      tx: 4.2,
      ty: 13.8,
      kit: { id: "kit-9", slug: "rust", title: "Rust forge", owner: "Ada" },
    });
    expect(sanitizeEvent({ type: "feed", from: "ada", x: 9, y: 9, kit: null, tx: 9, ty: 9 })).toBeNull();
    expect(sanitizeEvent({ type: "feed", from: "ada", x: 9, y: 9, kit: { id: "k" } })).toBeNull();
  });
});

describe("untrusted world snapshots", () => {
  it("rebuilds a valid snapshot untouched", () => {
    expect(sanitizeSharedState(goodState)).toEqual(goodState);
  });

  it("rejects snapshots with unknown poses or weather", () => {
    expect(sanitizeSharedState({ ...goodState, purl: { ...goodState.purl, action: "dance" } })).toBeNull();
    expect(sanitizeSharedState({ ...goodState, purl: { ...goodState.purl, face: "smug" } })).toBeNull();
    expect(sanitizeSharedState({ ...goodState, weather: "snow" })).toBeNull();
    expect(sanitizeSharedState({ ...goodState, needs: null })).toBeNull();
  });

  it("clamps positions, needs and kit counts", () => {
    const wild = sanitizeSharedState({
      ...goodState,
      clock: 9000,
      needs: { hunger: 8, energy: -2, joy: 0.5 },
      purl: { ...goodState.purl, x: -90, y: 90 },
      kits: Array.from({ length: 30 }, (_, index) => ({ ...goodState.kits[0], id: `kit-${index}` })),
    });
    expect(wild).not.toBeNull();
    expect(wild?.clock).toBe(1440);
    expect(wild?.needs).toEqual({ hunger: 1, energy: 0, joy: 0.5 });
    expect(wild?.purl.x).toBe(4);
    expect(wild?.purl.y).toBe(14);
    expect(wild?.kits).toHaveLength(8);
  });

  it("drops malformed kits instead of failing the whole snapshot", () => {
    const state = sanitizeSharedState({ ...goodState, kits: [goodState.kits[0], { id: "broken" }, "nope"] });
    expect(state?.kits).toHaveLength(1);
  });
});
