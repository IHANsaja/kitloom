import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  cleanName,
  colorFor,
  sanitizeDevFrame,
  sanitizeEvent,
  sanitizePeer,
  sanitizeSharedState,
  type DevFrame,
  type PenEvent,
  type PeerInfo,
  type SharedState,
} from "@/lib/pen/protocol";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * One Supabase Realtime channel for the pen.
 *
 * Presence decides which browser hosts Purl's brain: the visitor who arrived first, with the
 * client id as a stable tie-break. The host broadcasts a small snapshot ten times a second;
 * everyone broadcasts their developer's little frame. Everything inbound is sanitised here,
 * before a snapshot or an event can reach the simulation.
 */

export type RoomStatus = "connecting" | "live" | "solo" | "offline";

export interface PenRoomHandlers {
  onStatus: (status: RoomStatus) => void;
  onPeers: (peers: PeerInfo[]) => void;
  onHost: (host: boolean) => void;
  onState: (state: SharedState) => void;
  onEvent: (event: PenEvent) => void;
  onDev: (frame: DevFrame) => void;
}

export interface PenRoomOptions {
  id: string;
  name: string;
  handlers: PenRoomHandlers;
}

const CHANNEL_NAME = "kitloom-pen";
const EVENT_GAP_MS = 180;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function newestFirst(a: PeerInfo, b: PeerInfo): number {
  if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
  return a.id.localeCompare(b.id);
}

/** The visitor who has been in the pasture longest hosts the simulation. */
export function hostOf(peers: readonly PeerInfo[]): string | null {
  return [...peers].sort(newestFirst)[0]?.id ?? null;
}

export class PenRoom {
  private readonly id: string;
  private readonly handlers: PenRoomHandlers;
  private readonly joinedAt = Date.now();
  private name: string;
  private channel: RealtimeChannel | null = null;
  private status: RoomStatus = "connecting";
  private host = true;
  private remote: PeerInfo[] = [];
  private lastSnapshot: SharedState | null = null;
  private closed = false;
  private reconnectTimer: number | null = null;
  private attempts = 0;
  private x = 9.5;
  private y = 16.5;
  private lastEventAt = new Map<string, number>();

  constructor(options: PenRoomOptions) {
    this.id = options.id;
    this.name = cleanName(options.name) || "guest";
    this.handlers = options.handlers;
  }

  get hostId(): string | null {
    return hostOf(this.roster);
  }

  get isHost(): boolean {
    return this.host;
  }

  get lastState(): SharedState | null {
    return this.lastSnapshot;
  }

  get peers(): PeerInfo[] {
    return [...this.remote].sort(newestFirst);
  }

  get self(): PeerInfo {
    return {
      id: this.id,
      name: this.name,
      color: colorFor(this.id),
      joinedAt: this.joinedAt,
      x: this.x,
      y: this.y,
    };
  }

  get roster(): PeerInfo[] {
    return [this.self, ...this.remote].sort(newestFirst);
  }

  connect(): void {
    this.closed = false;
    if (!isSupabaseConfigured) {
      this.setStatus("solo");
      this.handlers.onPeers(this.roster);
      this.handlers.onHost(true);
      return;
    }
    this.open();
  }

  disconnect(): void {
    this.closed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const channel = this.channel;
    this.channel = null;
    if (channel) void getSupabaseClient().removeChannel(channel);
  }

  private open(): void {
    const client = getSupabaseClient();
    const channel = client.channel(CHANNEL_NAME, {
      config: { broadcast: { self: false }, presence: { key: this.id } },
    });
    this.channel = channel;

    channel
      .on("broadcast", { event: "state" }, (message: { payload: unknown }) => {
        if (this.closed || this.channel !== channel) return;
        if (!isRecord(message.payload) || message.payload.from === this.id) return;
        const state = sanitizeSharedState(message.payload.state);
        if (!state) return;
        this.lastSnapshot = state;
        this.handlers.onState(state);
      })
      .on("broadcast", { event: "dev" }, (message: { payload: unknown }) => {
        if (this.closed || this.channel !== channel) return;
        if (!isRecord(message.payload)) return;
        const frame = sanitizeDevFrame(message.payload.frame);
        if (!frame || frame.id === this.id) return;
        this.handlers.onDev(frame);
      })
      .on("broadcast", { event: "event" }, (message: { payload: unknown }) => {
        if (this.closed || this.channel !== channel) return;
        if (!isRecord(message.payload)) return;
        const event = sanitizeEvent(message.payload.event);
        if (!event || event.from === this.id) return;
        const now = Date.now();
        const last = this.lastEventAt.get(event.from) ?? 0;
        if (now - last < EVENT_GAP_MS) return;
        this.lastEventAt.set(event.from, now);
        this.handlers.onEvent(event);
      })
      .on("presence", { event: "sync" }, () => this.syncPresence(channel))
      .on("presence", { event: "join" }, () => this.syncPresence(channel))
      .on("presence", { event: "leave" }, () => this.syncPresence(channel));

    channel.subscribe((status) => {
      if (this.closed || this.channel !== channel) return;
      if (status === "SUBSCRIBED") {
        this.attempts = 0;
        this.setStatus("live");
        void this.track().then(() => this.syncPresence(channel));
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        this.setStatus("offline");
        this.remote = [];
        this.handlers.onPeers(this.roster);
        if (!this.host) {
          this.host = true;
          this.handlers.onHost(true);
        }
        this.scheduleReconnect();
      }
    });
  }

  /** A dropped socket should not end the visit: rejoin with a short backoff. */
  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer !== null) return;
    this.attempts += 1;
    const delay = Math.min(15_000, 1_500 * 2 ** Math.min(4, this.attempts - 1));
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.closed) return;
      const old = this.channel;
      this.channel = null;
      if (old) void getSupabaseClient().removeChannel(old);
      this.open();
    }, delay);
  }

  rename(name: string): void {
    const cleaned = cleanName(name);
    if (!cleaned) return;
    this.name = cleaned;
    this.handlers.onPeers(this.roster);
    void this.track();
  }

  sendState(state: SharedState): void {
    this.send("state", { from: this.id, state });
  }

  sendDev(frame: DevFrame): void {
    this.send("dev", { from: this.id, frame });
  }

  sendEvent(event: PenEvent): void {
    this.send("event", { from: this.id, event });
  }

  private send(event: string, payload: unknown): void {
    if (!this.channel || this.status !== "live") return;
    void this.channel.send({ type: "broadcast", event, payload }).catch(() => undefined);
  }

  private async track(): Promise<void> {
    if (!this.channel || this.status !== "live") return;
    await this.channel
      .track({ id: this.id, name: this.name, color: colorFor(this.id), joinedAt: this.joinedAt, x: this.x, y: this.y })
      .catch(() => undefined);
  }

  private syncPresence(channel?: RealtimeChannel): void {
    if (!this.channel || (channel && this.channel !== channel)) return;
    const state = this.channel.presenceState();
    const found: PeerInfo[] = [];
    for (const entries of Object.values(state)) {
      for (const entry of entries) {
        const peer = sanitizePeer(entry);
        if (!peer || peer.id === this.id) continue;
        found.push(peer);
      }
    }
    const unique = new Map(found.map((peer) => [peer.id, peer]));
    this.remote = [...unique.values()].sort(newestFirst);
    this.handlers.onPeers(this.roster);
    const hostId = hostOf(this.roster);
    const host = hostId === null || hostId === this.id;
    if (host !== this.host) {
      this.host = host;
      this.handlers.onHost(host);
    }
  }

  private setStatus(status: RoomStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.handlers.onStatus(status);
  }
}
