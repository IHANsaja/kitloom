import { describe, expect, it } from "vitest";

import { advanceNeeds, chooseActivity, describeAction, moodOf, poseFor, PURL_ACTIONS } from "@/lib/pen/purl";

const needs = { hunger: 0.3, energy: 0.8, joy: 0.6 };
const roll = (value: number) => () => value;

describe("Purl's mood", () => {
  it("reads needs in priority order", () => {
    expect(moodOf({ hunger: 0.9, energy: 0.1, joy: 0.1 })).toBe("sleepy");
    expect(moodOf({ hunger: 0.9, energy: 0.8, joy: 0.1 })).toBe("peckish");
    expect(moodOf({ hunger: 0.2, energy: 0.8, joy: 0.9 })).toBe("delighted");
    expect(moodOf(needs)).toBe("content");
  });
});

describe("Purl's choices", () => {
  const situation = { hasKit: false, raining: false };

  it("sleeps when exhausted, before anything else", () => {
    expect(chooseActivity({ hunger: 1, energy: 0.1, joy: 0 }, { hasKit: true, raining: false }, roll(0.99))).toBe("nap");
  });

  it("eats a kit whenever one is around and hunger is above zero", () => {
    expect(chooseActivity(needs, { hasKit: true, raining: false }, roll(0.99))).toBe("eat");
    expect(chooseActivity({ ...needs, hunger: 0.05 }, { hasKit: true, raining: false }, roll(0.99))).not.toBe("eat");
  });

  it("grazes when hungry and shelters when it rains", () => {
    expect(chooseActivity({ ...needs, hunger: 0.7 }, situation, roll(0.99))).toBe("graze");
    expect(chooseActivity(needs, { hasKit: false, raining: true }, roll(0.99))).toBe("nap");
  });

  it("gets the zoomies when joy is low", () => {
    expect(chooseActivity({ ...needs, joy: 0.1 }, situation, roll(0.2))).toBe("zoomies");
    expect(chooseActivity({ ...needs, joy: 0.1 }, situation, roll(0.8))).toBe("play");
  });

  it("wanders, idles and stretches across the whole random range", () => {
    const picked = new Set(Array.from({ length: 20 }, (_, index) => chooseActivity(needs, situation, roll(index / 20))));
    expect(picked).toEqual(new Set(["graze", "wander", "idle", "stretch", "play", "zoomies"]));
  });
});

describe("Purl's needs", () => {
  it("gets hungrier and sleepier while awake", () => {
    const later = advanceNeeds(needs, 60, "idle");
    expect(later.hunger).toBeGreaterThan(needs.hunger);
    expect(later.energy).toBeLessThan(needs.energy);
    expect(later.joy).toBeLessThan(needs.joy);
  });

  it("recovers while grazing and napping", () => {
    expect(advanceNeeds(needs, 60, "graze").hunger).toBeLessThan(needs.hunger);
    expect(advanceNeeds(needs, 60, "nap").energy).toBeGreaterThan(needs.energy);
    expect(advanceNeeds(needs, 60, "nuzzle").joy).toBeGreaterThan(needs.joy);
  });

  it("never leaves the zero-to-one range", () => {
    const spent = advanceNeeds({ hunger: 1, energy: 0, joy: 0 }, 1_000_000, "zoomies");
    expect(spent).toEqual({ hunger: 1, energy: 0, joy: 1 });
    const rested = advanceNeeds({ hunger: 0, energy: 1, joy: 1 }, 1_000_000, "nap");
    expect(rested).toEqual({ hunger: 1, energy: 1, joy: 0 });
  });
});

describe("Purl's poses", () => {
  const view = { dir: 1, step: false, since: 0, lift: 0 };

  it("has a distinct pose for every action except the two walks", () => {
    const poses = PURL_ACTIONS.map((action) => JSON.stringify(poseFor(action, view)));
    expect(new Set(poses).size).toBe(PURL_ACTIONS.length - 1);
    expect(poseFor("seek", view)).toEqual(poseFor("wander", view));
  });

  it("lies down only for a nap", () => {
    for (const action of PURL_ACTIONS) {
      expect(poseFor(action, view).lying).toBe(action === "nap");
    }
  });

  it("faces the way it walks", () => {
    expect(poseFor("wander", { ...view, dir: -1 }).face).toBe("lookLeft");
    expect(poseFor("wander", { ...view, dir: 1, step: true }).legs).toBe("stepA");
    expect(poseFor("wander", { ...view, dir: 1, step: false }).legs).toBe("stepB");
  });

  it("describes each action in a sentence", () => {
    for (const action of PURL_ACTIONS) {
      expect(describeAction(action, "saffron", "content").length).toBeGreaterThan(8);
    }
    expect(describeAction("eat", "Saffron", "content")).toContain("Saffron");
  });
});
