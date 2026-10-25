/**
 * The pen's shared clock and sky. A full day takes eight minutes, so a visit can pass from
 * morning to dusk. The host advances the clock and broadcasts it, so every visitor sees the
 * same light.
 */

export type Weather = "clear" | "wind" | "rain";
export type Phase = "night" | "dawn" | "day" | "dusk";

export interface SkyPalette {
  top: string;
  mid: string;
  horizon: string;
  below: string;
  sun: string;
  cloud: string;
  hillFar: string;
  hillNear: string;
  field: string;
  ambient: string;
  ambientAlpha: number;
  night: number;
}

export const DAY_LENGTH_MS = 8 * 60 * 1000;
export const MINUTES_PER_MS = 1440 / DAY_LENGTH_MS;

interface SkyKey extends Omit<SkyPalette, "night" | "ambientAlpha"> {
  at: number;
  night: number;
  ambientAlpha: number;
}

const KEYS: readonly SkyKey[] = [
  {
    at: 0,
    top: "#070b12",
    mid: "#0c141f",
    horizon: "#131d27",
    below: "#070a0f",
    sun: "#dfe6d8",
    cloud: "#253141",
    hillFar: "#101c25",
    hillNear: "#0a141a",
    field: "#0b1418",
    ambient: "#0a1730",
    ambientAlpha: 0.34,
    night: 1,
  },
  {
    at: 5.2,
    top: "#080d16",
    mid: "#101a27",
    horizon: "#1a2531",
    below: "#080b10",
    sun: "#e4e8da",
    cloud: "#2a3747",
    hillFar: "#14212b",
    hillNear: "#0c161c",
    field: "#0c1519",
    ambient: "#0b1830",
    ambientAlpha: 0.3,
    night: 0.9,
  },
  {
    at: 6.4,
    top: "#151525",
    mid: "#3e2c34",
    horizon: "#8a5a3f",
    below: "#1a1318",
    sun: "#ffd08a",
    cloud: "#684b4d",
    hillFar: "#2c2731",
    hillNear: "#1a1a21",
    field: "#16191b",
    ambient: "#3b2332",
    ambientAlpha: 0.16,
    night: 0.34,
  },
  {
    at: 7.8,
    top: "#1b2933",
    mid: "#2f4953",
    horizon: "#93804f",
    below: "#1a2024",
    sun: "#ffe9a8",
    cloud: "#6d7c80",
    hillFar: "#354d46",
    hillNear: "#223430",
    field: "#17231f",
    ambient: "#2b3b2b",
    ambientAlpha: 0.06,
    night: 0.04,
  },
  {
    at: 12.5,
    top: "#203540",
    mid: "#38565f",
    horizon: "#aa935a",
    below: "#1c2526",
    sun: "#fff3c4",
    cloud: "#8b989b",
    hillFar: "#3e5c52",
    hillNear: "#2b463c",
    field: "#19271f",
    ambient: "#26352d",
    ambientAlpha: 0.03,
    night: 0,
  },
  {
    at: 17.2,
    top: "#232d37",
    mid: "#414a54",
    horizon: "#a47d4e",
    below: "#1e2122",
    sun: "#ffdf9a",
    cloud: "#7b8183",
    hillFar: "#3e534a",
    hillNear: "#293c34",
    field: "#18241e",
    ambient: "#342b22",
    ambientAlpha: 0.06,
    night: 0.04,
  },
  {
    at: 18.7,
    top: "#1e1a2c",
    mid: "#4d303c",
    horizon: "#b46c43",
    below: "#1b171b",
    sun: "#ffb877",
    cloud: "#6c4c4b",
    hillFar: "#383037",
    hillNear: "#232027",
    field: "#16191b",
    ambient: "#49282e",
    ambientAlpha: 0.19,
    night: 0.42,
  },
  {
    at: 20.4,
    top: "#0b0f18",
    mid: "#111a2a",
    horizon: "#1d2a39",
    below: "#080b10",
    sun: "#e6e8d8",
    cloud: "#283647",
    hillFar: "#17252f",
    hillNear: "#0e171e",
    field: "#0b1519",
    ambient: "#0d1a31",
    ambientAlpha: 0.31,
    night: 0.92,
  },
  {
    at: 24,
    top: "#070b12",
    mid: "#0c141f",
    horizon: "#131d27",
    below: "#070a0f",
    sun: "#dfe6d8",
    cloud: "#253141",
    hillFar: "#101c25",
    hillNear: "#0a141a",
    field: "#0b1418",
    ambient: "#0a1730",
    ambientAlpha: 0.34,
    night: 1,
  },
];

export function normalizeMinutes(minutes: number): number {
  return ((minutes % 1440) + 1440) % 1440;
}

export function phaseOf(minutes: number): Phase {
  const hours = normalizeMinutes(minutes) / 60;
  if (hours < 5.6 || hours >= 20.4) return "night";
  if (hours < 8) return "dawn";
  if (hours < 17.4) return "day";
  return "dusk";
}

export function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string): [number, number, number] => {
    const value = Number.parseInt(hex.replace("#", ""), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const k = Math.max(0, Math.min(1, t));
  const channel = (from: number, to: number) => Math.round(from + (to - from) * k).toString(16).padStart(2, "0");
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
}

/** The sky, hills and light for a time of day, interpolated between hand-picked keyframes. */
export function skyFor(minutes: number): SkyPalette {
  const m = normalizeMinutes(minutes) / 60;
  const first = KEYS[0];
  const last = KEYS[KEYS.length - 1];
  if (!first || !last) throw new Error("The sky has no keyframes.");
  let from = first;
  let to = last;
  for (let index = 0; index < KEYS.length - 1; index += 1) {
    const a = KEYS[index];
    const b = KEYS[index + 1];
    if (a && b && m >= a.at && m <= b.at) {
      from = a;
      to = b;
      break;
    }
  }
  const span = Math.max(1, to.at - from.at);
  const t = (m - from.at) / span;
  const mix = (a: string, b: string) => mixHex(a, b, t);
  return {
    top: mix(from.top, to.top),
    mid: mix(from.mid, to.mid),
    horizon: mix(from.horizon, to.horizon),
    below: mix(from.below, to.below),
    sun: mix(from.sun, to.sun),
    cloud: mix(from.cloud, to.cloud),
    hillFar: mix(from.hillFar, to.hillFar),
    hillNear: mix(from.hillNear, to.hillNear),
    field: mix(from.field, to.field),
    ambient: mix(from.ambient, to.ambient),
    ambientAlpha: from.ambientAlpha + (to.ambientAlpha - from.ambientAlpha) * t,
    night: from.night + (to.night - from.night) * t,
  };
}

/** "07:20" for the pen's status line. */
export function clockLabel(minutes: number): string {
  const m = Math.floor(normalizeMinutes(minutes));
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}
