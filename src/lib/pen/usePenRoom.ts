"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { findPath } from "@/lib/pen/path";
import { clamp, type WorldPoint } from "@/lib/pen/iso";
import { PenRoom, type RoomStatus } from "@/lib/pen/net";
import {
  cleanName,
  type DevAction,
  type DevFrame,
  type KitPayload,
  type PeerInfo,
  type PenEvent,
  type SharedState,
} from "@/lib/pen/protocol";
import { PenSimulation } from "@/lib/pen/simulation";
import { VISITOR_SPAWN, feedSpotFor, isDevWalkable, nearestWalkableTile } from "@/lib/pen/world";
import { useSession } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

/**
 * The local developer plus the shared room.
 *
 * Visitors are not simulated on the host: each browser walks its own little developer and
 * broadcasts a frame ten times a second. Purl's brain runs only on the host, chosen by
 * presence. Everything a visitor does is an event; the host decides what it means.
 */

const ID_KEY = "kl-pen-id";
const NAME_KEY = "kl-pen-name";
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const DEV_SPEED = 2.55; // tiles per second
const FRAME_MS = 90;
const STATE_MS = 100;
const UI_MS = 180;
const PET_REACH = 2.4;
const PET_TRY_MS = 12_000;
const REMOTE_FRAME_TTL = 2_600;

export interface KitChoice {
  slug: string;
  title: string;
  owner: string;
}

/** A kit that is not tied to a published setup: visitors can always feed Purl something. */
export const PLAIN_KIT: KitChoice = { slug: "", title: "a plain kit", owner: "Kitloom" };

export interface PenEffect {
  kind: "throw";
  from: WorldPoint;
  to: WorldPoint;
  at: number;
}

/** Read by the canvas every animation frame, outside React's render cycle. */
export interface PenLoop {
  snapshot: SharedState;
  local: DevFrame;
  remote: DevFrame[];
  peers: PeerInfo[];
  localId: string;
}

export interface PenNotice {
  id: number;
  text: string;
}

export interface PenApi {
  id: string;
  name: string;
  status: RoomStatus;
  host: boolean;
  snapshot: SharedState;
  peers: PeerInfo[];
  notice: PenNotice | null;
  loop: RefObject<PenLoop>;
  moveTo: (point: WorldPoint) => void;
  pet: () => void;
  callPurl: () => void;
  wave: () => void;
  feed: (kit: KitChoice, point: WorldPoint) => void;
  rename: (name: string) => void;
  takeEffects: () => PenEffect[];
}

interface LocalDev {
  x: number;
  y: number;
  dir: number;
  action: DevAction;
  actionUntil: number;
  path: WorldPoint[];
  moving: boolean;
  intent: { kind: "pet"; until: number; nextPathAt: number } | null;
}

interface RemoteFrame {
  frame: DevFrame;
  at: number;
}

function makeId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(12);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function readId(): string {
  try {
    const saved = window.sessionStorage.getItem(ID_KEY);
    if (saved && SAFE_ID.test(saved)) return saved;
    const made = makeId();
    window.sessionStorage.setItem(ID_KEY, made);
    return made;
  } catch {
    return makeId();
  }
}

function readSavedName(): string | null {
  try {
    return cleanName(window.localStorage.getItem(NAME_KEY)) || null;
  } catch {
    return null;
  }
}

function nameFromSession(session: Session | null): string {
  if (!session) return "guest";
  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  for (const key of ["display_name", "full_name", "name", "user_name", "preferred_username"]) {
    const value = meta[key];
    if (typeof value === "string") {
      const cleaned = cleanName(value);
      if (cleaned) return cleaned;
    }
  }
  return cleanName(session.user.email?.split("@")[0] ?? "") || "guest";
}

function shortText(value: string, max: number): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function frameFor(local: LocalDev, id: string, t: number): DevFrame {
  return {
    id,
    x: local.x,
    y: local.y,
    dir: local.dir,
    action: local.action,
    moving: local.moving,
    t,
  };
}

function walkableSpot(point: WorldPoint): WorldPoint | null {
  const tile = nearestWalkableTile(Math.floor(point.x), Math.floor(point.y), isDevWalkable);
  return tile ? { x: tile.i + 0.5, y: tile.j + 0.5 } : null;
}

/** Walks a visitor along their path for one tick. Returns true when they moved. */
function walk(local: LocalDev, dt: number): boolean {
  let budget = DEV_SPEED * (dt / 1000);
  let moved = 0;
  while (budget > 0) {
    const next = local.path[0];
    if (!next) break;
    const dx = next.x - local.x;
    const dy = next.y - local.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1e-4) {
      local.path.shift();
      continue;
    }
    const take = Math.min(distance, budget);
    local.x = clamp(local.x + (dx / distance) * take, 0.04, 17.96);
    local.y = clamp(local.y + (dy / distance) * take, 0.04, 17.96);
    budget -= take;
    moved += take;
    if (take >= distance - 1e-6) local.path.shift();
  }
  if (moved > 0) {
    const next = local.path[0];
    if (next) {
      const screenDx = next.x - local.x - (next.y - local.y);
      if (Math.abs(screenDx) > 0.02) local.dir = screenDx > 0 ? 1 : -1;
    }
  }
  return moved > 0;
}

function route(local: LocalDev, target: WorldPoint): WorldPoint[] {
  return findPath({ x: local.x, y: local.y }, target, isDevWalkable);
}

export function usePenRoom(): PenApi {
  const session = useSession();
  const [id] = useState(() => readId());
  const [sim] = useState(() => new PenSimulation());

  const localRef = useRef<LocalDev>({
    x: VISITOR_SPAWN.x,
    y: VISITOR_SPAWN.y,
    dir: 1,
    action: "idle",
    actionUntil: 0,
    path: [],
    moving: false,
    intent: null,
  });

  const roomRef = useRef<PenRoom | null>(null);
  const hostRef = useRef(true);
  const statusRef = useRef<RoomStatus>(isSupabaseConfigured ? "connecting" : "solo");
  const peersRef = useRef<PeerInfo[]>([]);
  const remoteFrames = useRef(new Map<string, RemoteFrame>());
  const effectsRef = useRef<PenEffect[]>([]);
  const noticeId = useRef(0);

  const [snapshot, setSnapshot] = useState<SharedState>(() => sim.snapshot());
  const snapshotRef = useRef(snapshot);

  // A chosen name wins. Otherwise the signed-in visitor's name (or guest) is used.
  const [chosenName, setChosenName] = useState<string | null>(() => readSavedName());
  const name = chosenName ?? (session === "loading" ? "guest" : nameFromSession(session));
  const nameRef = useRef(name);
  const [status, setStatus] = useState<RoomStatus>(isSupabaseConfigured ? "connecting" : "solo");
  const [host, setHost] = useState(true);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [notice, setNotice] = useState<PenNotice | null>(null);

  const loopRef = useRef<PenLoop>({
    snapshot,
    local: {
      id,
      x: VISITOR_SPAWN.x,
      y: VISITOR_SPAWN.y,
      dir: 1,
      action: "idle",
      moving: false,
      t: 0,
    },
    remote: [],
    peers: [],
    localId: id,
  });

  const announce = useCallback((text: string) => {
    noticeId.current += 1;
    setNotice({ id: noticeId.current, text });
  }, []);

  const queueThrow = useCallback((from: WorldPoint, to: WorldPoint) => {
    effectsRef.current.push({ kind: "throw", from, to, at: performance.now() });
  }, []);

  const takeEffects = useCallback(() => {
    if (effectsRef.current.length === 0) return [];
    const effects = effectsRef.current;
    effectsRef.current = [];
    return effects;
  }, []);

  /** Apply locally when we are the brain, and tell everybody else either way. */
  const sendEvent = useCallback(
    (event: PenEvent) => {
      if (hostRef.current) sim.applyEvent(event);
      roomRef.current?.sendEvent(event);
    },
    [sim],
  );

  const moveTo = useCallback((point: WorldPoint) => {
    const local = localRef.current;
    local.intent = null;
    const target = walkableSpot(point);
    if (!target) return;
    local.path = route(local, target);
  }, []);

  const doPet = useCallback(() => {
    const local = localRef.current;
    local.path = [];
    local.intent = null;
    local.action = "pet";
    local.actionUntil = performance.now() + 900;
    sendEvent({ type: "pet", from: id, x: local.x, y: local.y });
    announce("You pet Purl. Her wool is very soft.");
  }, [announce, id, sendEvent]);

  const pet = useCallback(() => {
    const local = localRef.current;
    const purl = snapshotRef.current.purl;
    if (Math.hypot(purl.x - local.x, purl.y - local.y) <= PET_REACH) {
      doPet();
      return;
    }
    local.path = [];
    local.intent = { kind: "pet", until: performance.now() + PET_TRY_MS, nextPathAt: 0 };
  }, [doPet]);

  const callPurl = useCallback(() => {
    const local = localRef.current;
    local.path = [];
    local.intent = null;
    local.action = "wave";
    local.actionUntil = performance.now() + 1100;
    sendEvent({ type: "call", from: id, x: local.x, y: local.y });
    announce("You call Purl over.");
  }, [announce, id, sendEvent]);

  const wave = useCallback(() => {
    const local = localRef.current;
    local.path = [];
    local.intent = null;
    local.action = "wave";
    local.actionUntil = performance.now() + 1100;
    sendEvent({ type: "wave", from: id, x: local.x, y: local.y });
    announce("You wave at Purl.");
  }, [announce, id, sendEvent]);

  const feed = useCallback(
    (kit: KitChoice, point: WorldPoint) => {
      const local = localRef.current;
      const spot = feedSpotFor(point.x, point.y, Math.random);
      const payload: KitPayload = {
        id: `k${Date.now().toString(36)}${Math.floor(Math.random() * 46_656).toString(36)}`,
        slug: shortText(kit.slug, 64),
        title: shortText(kit.title, 80) || "a plain kit",
        owner: shortText(kit.owner, 40),
      };
      local.path = [];
      local.intent = null;
      local.action = "feed";
      local.actionUntil = performance.now() + 900;
      queueThrow({ x: local.x, y: local.y }, spot);
      sendEvent({ type: "feed", from: id, x: local.x, y: local.y, kit: payload, tx: spot.x, ty: spot.y });
      announce(`You toss ${payload.title} into the pen.`);
    },
    [announce, id, queueThrow, sendEvent],
  );

  const rename = useCallback(
    (next: string) => {
      const cleaned = cleanName(next);
      if (!cleaned) return;
      setChosenName(cleaned);
      try {
        window.localStorage.setItem(NAME_KEY, cleaned);
      } catch {
        // Storage blocked: the name still lasts for this visit.
      }
      roomRef.current?.rename(cleaned);
      announce(`You are now ${cleaned}.`);
    },
    [announce],
  );

  useEffect(() => {
    nameRef.current = name;
    roomRef.current?.rename(name);
  }, [name]);

  useEffect(() => {
    const room = new PenRoom({
      id,
      name: nameRef.current,
      handlers: {
        onStatus: (next) => {
          statusRef.current = next;
          setStatus(next);
        },
        onPeers: (next) => {
          peersRef.current = next;
          setPeers(next);
        },
        onHost: (next) => {
          hostRef.current = next;
          setHost(next);
          if (next) {
            const last = roomRef.current?.lastState;
            if (last) sim.adopt(last);
          }
        },
        onState: (next) => {
          hasRemote = true;
          if (hostRef.current) return;
          snapshotRef.current = next;
        },
        onEvent: (event) => {
          if (event.type === "feed") {
            queueThrow({ x: event.x, y: event.y }, { x: event.tx, y: event.ty });
            const peer = peersRef.current.find((candidate) => candidate.id === event.from);
            announce(`${peer?.name ?? "A visitor"} tossed ${event.kit.title} into the pen.`);
          }
          if (hostRef.current) sim.applyEvent(event);
        },
        onDev: (frame) => {
          remoteFrames.current.set(frame.id, { frame, at: performance.now() });
        },
      },
    });
    roomRef.current = room;
    room.connect();

    let last = performance.now();
    let lastState = 0;
    let lastFrame = 0;
    let lastUi = 0;
    let hasRemote = false;

    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.max(0, Math.min(300, now - last));
      last = now;
      const local = localRef.current;
      const isHost = hostRef.current;
      const live = statusRef.current === "live";

      if (local.intent) {
        const purl = snapshotRef.current.purl;
        const distance = Math.hypot(purl.x - local.x, purl.y - local.y);
        if (distance <= PET_REACH) {
          doPet();
        } else if (now > local.intent.until) {
          local.intent = null;
        } else if (local.path.length === 0 && now >= local.intent.nextPathAt) {
          local.intent.nextPathAt = now + 900;
          const target = walkableSpot(purl);
          if (target) local.path = route(local, target);
        }
      }

      const moved = walk(local, dt);
      local.moving = moved;
      if (moved) {
        if (now >= local.actionUntil) local.action = "walk";
      } else if (local.action === "walk") {
        local.action = "idle";
      } else if (now >= local.actionUntil && local.action !== "idle") {
        local.action = "idle";
      }

      if (isHost || !hasRemote) sim.update(dt);
      const state = isHost || !hasRemote ? sim.snapshot() : snapshotRef.current;
      snapshotRef.current = state;

      if (isHost && live && now - lastState >= STATE_MS) {
        lastState = now;
        room.sendState(state);
      }

      const frame = frameFor(local, id, Math.round(now));
      if (now - lastFrame >= FRAME_MS) {
        lastFrame = now;
        room.sendDev(frame);
      }

      const frames: DevFrame[] = [];
      for (const [peerId, entry] of remoteFrames.current) {
        if (now - entry.at > REMOTE_FRAME_TTL) remoteFrames.current.delete(peerId);
        else frames.push(entry.frame);
      }

      loopRef.current = {
        snapshot: state,
        local: frame,
        remote: frames,
        peers: peersRef.current,
        localId: id,
      };

      if (now - lastUi >= UI_MS) {
        lastUi = now;
        setSnapshot(state);
      }
    }, 40);

    return () => {
      window.clearInterval(timer);
      room.disconnect();
      roomRef.current = null;
    };
  }, [announce, doPet, id, queueThrow, sim]);

  return {
    id,
    name,
    status,
    host,
    snapshot,
    peers,
    notice,
    loop: loopRef,
    moveTo,
    pet,
    callPurl,
    wave,
    feed,
    rename,
    takeEffects,
  };
}
