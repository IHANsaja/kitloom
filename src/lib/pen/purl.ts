import type { Ears, Face, Legs } from "@/components/pet/sprites";

/**
 * Purl's brain: a small, readable needs system. The host runs it; every other visitor sees
 * the result through the shared snapshot. Nothing here touches the DOM.
 */

export const PURL_ACTIONS = [
  "idle",
  "graze",
  "wander",
  "nap",
  "play",
  "zoomies",
  "eat",
  "seek",
  "nuzzle",
  "bleat",
  "stretch",
] as const;

export type PurlAction = (typeof PURL_ACTIONS)[number];

export interface Needs {
  /** 0 is full, 1 is very hungry. */
  hunger: number;
  /** 0 is exhausted, 1 is wide awake. */
  energy: number;
  /** 0 is glum, 1 is delighted. */
  joy: number;
}

export type Mood = "content" | "peckish" | "sleepy" | "delighted";

export interface PoseView {
  dir: number;
  step: boolean;
  since: number;
  lift: number;
}

export interface Pose {
  face: Face;
  ears: Ears;
  legs: Legs;
  lying: boolean;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function moodOf(needs: Needs): Mood {
  if (needs.energy < 0.24) return "sleepy";
  if (needs.hunger > 0.62) return "peckish";
  if (needs.joy > 0.76) return "delighted";
  return "content";
}

export function moodLabel(mood: Mood): string {
  switch (mood) {
    case "sleepy":
      return "sleepy";
    case "peckish":
      return "peckish";
    case "delighted":
      return "delighted";
    default:
      return "content";
  }
}

/** Needs drift with time and with what Purl is doing. */
export function advanceNeeds(needs: Needs, seconds: number, action: PurlAction): Needs {
  const hungerRate = action === "graze" ? -0.009 : 0.003;
  const energyRate = action === "nap" ? 0.04 : action === "play" || action === "zoomies" ? -0.004 : -0.0012;
  const joyRate = action === "nuzzle" ? 0.01 : action === "play" || action === "zoomies" ? 0.004 : -0.0017;
  return {
    hunger: clamp01(needs.hunger + hungerRate * seconds),
    energy: clamp01(needs.energy + energyRate * seconds),
    joy: clamp01(needs.joy + joyRate * seconds),
  };
}

export interface Situation {
  hasKit: boolean;
  raining: boolean;
}

/**
 * Weighted, needs-first choice of what to do next. It is deliberately a plain function of
 * its arguments plus `random`, so the whole brain can be tested without a browser.
 */
export function chooseActivity(needs: Needs, situation: Situation, random: () => number): PurlAction {
  if (needs.energy < 0.2) return "nap";
  if (situation.hasKit && needs.hunger > 0.1) return "eat";
  if (needs.hunger > 0.58) return "graze";
  if (situation.raining) return "nap";
  if (needs.joy < 0.28) return random() < 0.5 ? "zoomies" : "play";
  const roll = random();
  if (roll < 0.28) return "graze";
  if (roll < 0.54) return "wander";
  if (roll < 0.74) return "idle";
  if (roll < 0.85) return "stretch";
  if (roll < 0.95) return "play";
  return "zoomies";
}

/** The pose a state's action is drawn in. Clients derive the same pose from the snapshot. */
export function poseFor(action: PurlAction, view: PoseView): Pose {
  const look = view.dir < 0 ? "lookLeft" : "lookRight";
  const stepLegs = view.step ? "stepA" : "stepB";
  switch (action) {
    case "graze":
      return { face: "graze", ears: "down", legs: "stand", lying: false };
    case "wander":
    case "seek":
      return { face: look, ears: "down", legs: stepLegs, lying: false };
    case "nap":
      return { face: "sleep", ears: "down", legs: "none", lying: true };
    case "play":
      return {
        face: "happy",
        ears: view.since % 560 < 280 ? "wiggle" : "down",
        legs: view.lift > 0 ? "tuck" : "stand",
        lying: false,
      };
    case "zoomies":
      return { face: "happy", ears: "perk", legs: stepLegs, lying: false };
    case "eat":
      return { face: Math.floor(view.since / 240) % 2 === 0 ? "open" : "happy", ears: "down", legs: "stand", lying: false };
    case "nuzzle":
      return { face: "love", ears: "wiggle", legs: "stand", lying: false };
    case "bleat":
      return { face: "eager", ears: "perk", legs: "stand", lying: false };
    case "stretch":
      return { face: "happy", ears: "down", legs: "splay", lying: false };
    case "idle":
      return {
        face: "open",
        ears: view.since % 9000 < 320 ? "wiggle" : "down",
        legs: "stand",
        lying: false,
      };
    default:
      return { face: "open", ears: "down", legs: "stand", lying: false };
  }
}

/** A plain sentence for the pen's status line. */
export function describeAction(action: PurlAction, eating: string | null, mood: Mood): string {
  switch (action) {
    case "nap":
      return mood === "sleepy" ? "Purl is dozing in the straw." : "Purl is resting under the lean-to.";
    case "eat":
      return eating ? `Purl is eating ${eating}.` : "Purl is chewing a kit.";
    case "graze":
      return "Purl is grazing by the clover.";
    case "play":
      return "Purl is bouncing about.";
    case "zoomies":
      return "Purl has the zoomies.";
    case "seek":
      return "Purl is trotting over.";
    case "nuzzle":
      return "Purl is nuzzling you.";
    case "bleat":
      return "Purl bleats hello.";
    case "wander":
      return "Purl is wandering the pasture.";
    case "stretch":
      return "Purl is having a good stretch.";
    default:
      return mood === "delighted" ? "Purl is delighted with the company." : "Purl is watching the farm.";
  }
}
