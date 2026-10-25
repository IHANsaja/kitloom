"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { PenStage } from "@/components/pen/PenStage";
import { peerStyle } from "@/components/pen/scene/palette";
import { buttonClass, cx, inputClass } from "@/components/ui/styles";
import { useSetups } from "@/lib/community/useSetups";
import { clockLabel } from "@/lib/pen/clock";
import type { RoomStatus } from "@/lib/pen/net";
import { describeAction, moodLabel } from "@/lib/pen/purl";
import { PLAIN_KIT, usePenRoom, type KitChoice } from "@/lib/pen/usePenRoom";

/**
 * Purl's pen. The canvas is the toy; everything it can do is also a button, so the page works
 * without a pointer. The room hook owns the network and the host's simulation; this file owns
 * only presentation and the choice of kit.
 */

const emptySubscribe = () => () => {};
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void): () => void {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const WEATHER = { clear: "clear skies", wind: "a warm wind", rain: "rain" } as const;

const STATUS = {
  connecting: { label: "joining the pasture", dot: "bg-warning" },
  live: { label: "live", dot: "bg-success" },
  offline: { label: "reconnecting", dot: "bg-warning" },
  solo: { label: "single-player", dot: "bg-fg-3" },
} satisfies Record<RoomStatus, { label: string; dot: string }>;

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-fg-2">{label}</span>
        <span className="font-mono text-[0.625rem] text-fg-3">{percent}%</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div className={cx("h-full rounded-full transition-[width] duration-500 ease-kit", color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function PurlPen() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );

  const api = usePenRoom();
  const { setups, state: setupsState } = useSetups();
  const [feedMode, setFeedMode] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const selectedSetup = useMemo(
    () => (selectedSlug ? setups.find((setup) => setup.slug === selectedSlug) : undefined),
    [selectedSlug, setups],
  );
  const kit = useMemo<KitChoice>(
    () =>
      selectedSetup
        ? { slug: selectedSetup.slug, title: selectedSetup.name, owner: selectedSetup.creatorName }
        : PLAIN_KIT,
    [selectedSetup],
  );

  useEffect(() => {
    if (!feedMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFeedMode(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [feedMode]);

  const onFed = useCallback(() => setFeedMode(false), []);

  const tossAtPurl = useCallback(() => {
    const purl = api.loop.current?.snapshot.purl;
    if (!purl) return;
    api.feed(kit, { x: purl.x, y: purl.y });
    setFeedMode(false);
  }, [api, kit]);

  if (!mounted) {
    return (
      <div className="cell-x py-8 lg:py-10">
        <div className="aspect-[720/460] w-full border border-line bg-surface" />
        <p className="mt-3 font-mono text-xs text-fg-3">Waking Purl…</p>
      </div>
    );
  }

  const { snapshot } = api;
  const status = STATUS[api.status];
  const eating = snapshot.kits.find((entry) => entry.state === "eating")?.title ?? null;
  const action = describeAction(snapshot.purl.action, eating, snapshot.mood);
  const count = Math.max(1, api.peers.length);
  const hostNote =
    api.status === "solo"
      ? "Realtime is not configured for this build, so the pen is yours alone."
      : api.status === "connecting"
        ? "Joining the shared pasture…"
        : api.status === "offline"
          ? "The shared pasture is unreachable. Purl is still here, just for you."
          : api.host
            ? "Purl’s brain is running in this tab, shared with everyone in the pasture."
            : "Another visitor hosts Purl’s brain; her state is shared with everyone here.";

  return (
    <div className="cell-x py-6 lg:py-8">
      <div className="flex flex-col gap-5">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-2 border border-line bg-surface px-2 py-1 font-mono text-[0.6875rem] text-fg-2">
              <span aria-hidden="true" className={cx("h-1.5 w-1.5 rounded-full", status.dot)} />
              {status.label}
            </span>
            <span className="font-mono text-[0.6875rem] text-fg-3">
              {clockLabel(snapshot.clock)} · {WEATHER[snapshot.weather]}
            </span>
            <span className="font-mono text-[0.6875rem] text-fg-3">
              {count} {count === 1 ? "visitor" : "visitors"} in the pen
            </span>
            <span className="ml-auto border border-line px-2 py-1 font-mono text-[0.6875rem] text-lime">mood: {moodLabel(snapshot.mood)}</span>
          </div>

          <PenStage
            api={api}
            kit={kit}
            feedMode={feedMode}
            reducedMotion={reducedMotion}
            onFed={onFed}
            className="rounded-xs"
          />

          <div className="mt-3 flex flex-col gap-3 border border-line bg-surface px-3 py-3">
            <p className="text-sm text-fg-2">
              <span className="text-fg">{action}</span>
              {api.notice ? <span className="ml-2 text-xs text-fg-3">{api.notice.text}</span> : null}
            </p>
            <p role="status" aria-live="polite" className="sr-only">
              {api.notice?.text ?? ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={api.pet} className={buttonClass("primary", "md")}>
                Pet Purl
              </button>
              <button type="button" onClick={api.callPurl} className={buttonClass("secondary", "md")}>
                Call her over
              </button>
              <button type="button" onClick={api.wave} className={buttonClass("secondary", "md")}>
                Wave
              </button>
              <button
                type="button"
                aria-pressed={feedMode}
                onClick={() => setFeedMode((value) => !value)}
                className={buttonClass("secondary", "md", feedMode ? "border-lime text-lime" : undefined)}
              >
                {feedMode ? "Cancel throw" : "Throw a kit"}
              </button>
            </div>
            {feedMode ? (
              <div className="flex flex-wrap items-center gap-3 border border-lime/40 bg-lime/5 px-3 py-2.5">
                <p className="min-w-[12rem] flex-1 text-xs leading-relaxed text-fg-2">
                  Click a spot in the pasture to toss <span className="text-fg">{kit.title}</span>, or send it straight to Purl.
                </p>
                <button type="button" onClick={tossAtPurl} className={buttonClass("secondary", "sm")}>
                  Toss to Purl
                </button>
              </div>
            ) : null}
            <p className="text-[0.6875rem] leading-relaxed text-fg-3">
              Petting walks your developer to Purl if you are far away. Every visitor in the pen is a real
              person on this page right now.
            </p>
          </div>
        </div>

        <aside className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Pen details">
          <section className="border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="eyebrow text-fg-3">In the pasture</h2>
              <span className="font-mono text-[0.6875rem] text-fg-3">{count}</span>
            </div>
            <ul className="divide-y divide-line-subtle">
              {api.peers.map((peer) => (
                <li key={peer.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: peerStyle(peer.color).shirt }}
                  />
                  <span className={cx("truncate text-sm", peer.id === api.id ? "text-fg" : "text-fg-2")}>{peer.name}</span>
                  {peer.id === api.id ? <span className="ml-auto font-mono text-[0.625rem] text-fg-3">you</span> : null}
                </li>
              ))}
              {api.peers.length === 0 ? <li className="px-4 py-2.5 text-sm text-fg-3">Joining the pasture…</li> : null}
            </ul>
            <p className="border-t border-line-subtle px-4 py-2.5 text-[0.6875rem] leading-relaxed text-fg-3">{hostNote}</p>
          </section>

          <section className="border border-line bg-surface">
            <h2 className="eyebrow border-b border-line px-4 py-3 text-fg-3">Purl right now</h2>
            <div className="flex flex-col gap-3 px-4 py-3.5">
              <Meter label="Full" value={1 - snapshot.needs.hunger} color="bg-lime" />
              <Meter label="Rested" value={snapshot.needs.energy} color="bg-info" />
              <Meter label="Happy" value={snapshot.needs.joy} color="bg-success" />
            </div>
          </section>

          <section className="border border-line bg-surface">
            <h2 className="eyebrow border-b border-line px-4 py-3 text-fg-3">The kit you throw</h2>
            <div className="flex flex-col gap-2.5 px-4 py-3.5">
              <label htmlFor="pen-kit" className="text-xs text-fg-2">
                Choose a published setup
              </label>
              <select
                id="pen-kit"
                value={selectedSlug ?? ""}
                onChange={(event) => setSelectedSlug(event.target.value || null)}
                className={inputClass("text-sm")}
              >
                <option value="">a plain kit</option>
                {setups.slice(0, 80).map((setup) => (
                  <option key={setup.slug} value={setup.slug}>
                    {setup.name} — {setup.creatorName}
                  </option>
                ))}
              </select>
              <p className="text-[0.6875rem] leading-relaxed text-fg-3">
                {setupsState === "loading"
                  ? "Loading published kits…"
                  : setupsState === "error"
                    ? "Kits could not be loaded, so Purl gets a plain kit."
                    : setupsState === "ready" && setups.length === 0
                      ? "Nothing is published yet, so Purl gets a plain kit."
                      : "Purl eats the little file icon, not the download. The setup stays in the directory."}
              </p>
            </div>
          </section>

          <section className="border border-line bg-surface">
            <h2 className="eyebrow border-b border-line px-4 py-3 text-fg-3">Your name in the pen</h2>
            <form
              className="flex gap-2 px-4 py-3.5"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                api.rename(String(data.get("name") ?? ""));
              }}
            >
              <label htmlFor="pen-name" className="sr-only">
                Your name in the pen
              </label>
              <input
                key={api.name}
                id="pen-name"
                name="name"
                defaultValue={api.name}
                maxLength={24}
                autoComplete="nickname"
                spellCheck={false}
                className={inputClass("min-w-0 flex-1 text-sm")}
              />
              <button type="submit" className={buttonClass("secondary", "md", "shrink-0")}>
                Save
              </button>
            </form>
          </section>

          <p className="text-[0.6875rem] leading-relaxed text-fg-3 sm:col-span-2 xl:col-span-4">
            New to Kitloom?{" "}
            <Link href="/explore" className="link">
              Explore setups
            </Link>{" "}
            or{" "}
            <Link href="/publish" className="link">
              publish your own
            </Link>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
