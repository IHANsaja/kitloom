import { EAR_NAMES, FACE_NAMES, LEG_NAMES, type Ears, type Face, type Legs } from "@/components/pet/sprites";
import { GRID, clamp, isFiniteNumber } from "@/lib/pen/iso";
import { type Mood, type Needs, PURL_ACTIONS, type PurlAction, clamp01 } from "@/lib/pen/purl";
import type { Weather } from "@/lib/pen/clock";

/**
 * Everything that crosses the realtime channel is untrusted. A public Supabase channel can
 * be joined by anyone with the publishable key, so each payload is rebuilt from known fields
 * with ranges, enum checks and length limits before the pen ever sees it.
 */

export const PEER_COLORS = 6;

export const DEV_ACTIONS = ["idle", "walk", "pet", "wave", "feed"] as const;
export type DevAction = (typeof DEV_ACTIONS)[number];

export interface PeerInfo {
  id: string;
  name: string;
  color: number;
  joinedAt: number;
  x: number;
  y: number;
}

export interface DevFrame {
  id: string;
  x: number;
  y: number;
  dir: number;
  action: DevAction;
  moving: boolean;
  t: number;
}

export interface KitPayload {
  id: string;
  slug: string;
  title: string;
  owner: string;
}

export type PenEvent =
  | { type: "pet"; from: string; x: number; y: number }
  | { type: "call"; from: string; x: number; y: number }
  | { type: "wave"; from: string; x: number; y: number }
  | { type: "feed"; from: string; x: number; y: number; kit: KitPayload; tx: number; ty: number };

export interface SharedKit {
  id: string;
  x: number;
  y: number;
  title: string;
  owner: string;
  state: "fresh" | "eating";
}

export interface SharedPurl {
  x: number;
  y: number;
  dir: number;
  action: PurlAction;
  since: number;
  lift: number;
  step: boolean;
  face: Face;
  ears: Ears;
  legs: Legs;
  lying: boolean;
}

export interface SharedState {
  t: number;
  clock: number;
  weather: Weather;
  mood: Mood;
  needs: Needs;
  purl: SharedPurl;
  kits: SharedKit[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) return null;
  return trimmed;
}

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function cleanName(value: unknown): string {
  return text(value, 24);
}

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  return isFiniteNumber(value) ? clamp(value, min, max) : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function moodIn(value: unknown): Mood | null {
  const mood = oneOf(value, ["content", "peckish", "sleepy", "delighted"] as const);
  return mood;
}

function weatherIn(value: unknown): Weather | null {
  return oneOf(value, ["clear", "wind", "rain"] as const);
}

export function colorFor(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % PEER_COLORS;
}

export function sanitizePeer(value: unknown): PeerInfo | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  if (!id) return null;
  const name = cleanName(value.name);
  return {
    id,
    name: name || "guest",
    color: Math.round(numberIn(value.color, 0, PEER_COLORS - 1, colorFor(id))),
    joinedAt: numberIn(value.joinedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    x: numberIn(value.x, -2, GRID + 2, 9.5),
    y: numberIn(value.y, -2, GRID + 2, 16.5),
  };
}

export function sanitizeDevFrame(value: unknown): DevFrame | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  if (!id) return null;
  const action = oneOf(value.action, DEV_ACTIONS);
  if (!action) return null;
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return null;
  return {
    id,
    x: clamp(value.x, -2, GRID + 2),
    y: clamp(value.y, -2, GRID + 2),
    dir: value.dir === -1 ? -1 : 1,
    action,
    moving: value.moving === true,
    t: numberIn(value.t, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

export function sanitizeKit(value: unknown): KitPayload | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  if (!id) return null;
  return {
    id,
    slug: text(value.slug, 64),
    title: text(value.title, 80) || "a plain kit",
    owner: text(value.owner, 40),
  };
}

export function sanitizeEvent(value: unknown): PenEvent | null {
  if (!isRecord(value)) return null;
  const from = safeId(value.from);
  if (!from || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return null;
  const x = clamp(value.x, -2, GRID + 2);
  const y = clamp(value.y, -2, GRID + 2);
  const type = oneOf(value.type, ["pet", "call", "wave", "feed"] as const);
  if (type === "pet" || type === "call" || type === "wave") return { type, from, x, y };
  if (type === "feed") {
    const kit = sanitizeKit(value.kit);
    if (!kit || !isFiniteNumber(value.tx) || !isFiniteNumber(value.ty)) return null;
    return {
      type,
      from,
      x,
      y,
      kit,
      tx: clamp(value.tx, 4.2, 13.8),
      ty: clamp(value.ty, 4.2, 13.8),
    };
  }
  return null;
}

export function sanitizeSharedKit(value: unknown): SharedKit | null {
  if (!isRecord(value)) return null;
  const id = safeId(value.id);
  if (!id || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return null;
  const state = oneOf(value.state, ["fresh", "eating"] as const);
  if (!state) return null;
  return {
    id,
    x: clamp(value.x, 4, 14),
    y: clamp(value.y, 4, 14),
    title: text(value.title, 80) || "a plain kit",
    owner: text(value.owner, 40),
    state,
  };
}

export function sanitizeSharedState(value: unknown): SharedState | null {
  if (!isRecord(value) || !isRecord(value.purl) || !isRecord(value.needs)) return null;
  const action = oneOf(value.purl.action, PURL_ACTIONS);
  const face = oneOf(value.purl.face, FACE_NAMES);
  const ears = oneOf(value.purl.ears, EAR_NAMES);
  const legs = oneOf(value.purl.legs, LEG_NAMES);
  const weather = weatherIn(value.weather);
  const mood = moodIn(value.mood);
  if (!action || !face || !ears || !legs || !weather || !mood) return null;
  if (!isFiniteNumber(value.purl.x) || !isFiniteNumber(value.purl.y)) return null;

  const kits: SharedKit[] = [];
  if (Array.isArray(value.kits)) {
    for (const raw of value.kits.slice(0, 8)) {
      const kit = sanitizeSharedKit(raw);
      if (kit) kits.push(kit);
    }
  }

  return {
    t: numberIn(value.t, 0, Number.MAX_SAFE_INTEGER, 0),
    clock: numberIn(value.clock, 0, 1440, 480),
    weather,
    mood,
    needs: {
      hunger: clamp01(numberIn(value.needs.hunger, 0, 1, 0.3)),
      energy: clamp01(numberIn(value.needs.energy, 0, 1, 0.8)),
      joy: clamp01(numberIn(value.needs.joy, 0, 1, 0.6)),
    },
    purl: {
      x: clamp(value.purl.x, 4, 14),
      y: clamp(value.purl.y, 4, 14),
      dir: value.purl.dir === -1 ? -1 : 1,
      action,
      since: numberIn(value.purl.since, 0, 10_000_000, 0),
      lift: numberIn(value.purl.lift, 0, 24, 0),
      step: value.purl.step === true,
      face,
      ears,
      legs,
      lying: value.purl.lying === true,
    },
    kits,
  };
}
