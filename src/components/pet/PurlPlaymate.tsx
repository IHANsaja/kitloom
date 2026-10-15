"use client";

import { useRef, type ReactNode } from "react";

import { Interrupted, PurlActor, usePurlActor, type Actor } from "@/components/pet/usePurlActor";
import { HEIGHT, WIDTH } from "@/components/pet/sprites";

/**
 * Agents page: Purl plays with the agent logos. It sits on an agent's tile; hover another
 * row and it drops what it is doing and flies straight there in one hop — faster the
 * further it goes, and re-aimed mid-air if the cursor moves on. On each tile it plays one
 * game: bounces on it (the tile squashes), spins it (lands dizzy), boops it (it wobbles)
 * or hugs it (hearts, the logo lights up). Left alone, it wanders to other tiles on screen
 * and naps on one when the cursor is still. Tiles are `[data-agent-mark]`, rows
 * `[data-agent-row]`.
 */

type Game = "bounce" | "spin" | "boop" | "hug";
const GAMES: Game[] = ["bounce", "hug", "spin", "boop"];
const NAP_AFTER_MS = 25_000;

function box(stage: HTMLElement, mark: HTMLElement) {
  const s = stage.getBoundingClientRect();
  const m = mark.getBoundingClientRect();
  return { left: m.left - s.left, top: m.top - s.top, bottom: m.bottom - s.top, width: m.width };
}
const onTop = (stage: HTMLElement, mark: HTMLElement) => {
  const b = box(stage, mark);
  return { x: b.left + b.width / 2 - WIDTH / 2, y: b.top - HEIGHT + 3 };
};
const beside = (stage: HTMLElement, mark: HTMLElement) => {
  const b = box(stage, mark);
  return { x: b.left - WIDTH - 4, y: b.bottom - HEIGHT };
};

/** Replays a CSS reaction on a tile. */
function react(mark: HTMLElement, reaction: string, ms = 1000) {
  mark.classList.remove(reaction);
  void mark.offsetWidth;
  mark.classList.add(reaction);
  window.setTimeout(() => mark.classList.remove(reaction), ms);
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

export function PurlPlaymate({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  /** The agent row under the cursor, or null. */
  const hovered = useRef<string | null>(null);

  const actor = usePurlActor(
    stageRef,
    async (a: Actor) => {
      const stage = a.stage;
      const marks = () => [...stage.querySelectorAll<HTMLElement>("[data-agent-mark]")];
      const markFor = (id: string) => marks().find((mark) => mark.dataset.agentMark === id) ?? null;
      const visible = () =>
        marks().filter((mark) => {
          const r = mark.getBoundingClientRect();
          return r.top > 64 && r.bottom < window.innerHeight - 16;
        });

      // Which row is under the cursor, kept right while the page scrolls under a still cursor.
      const pointer = { x: -1, y: -1 };
      const track = () => {
        if (pointer.x < 0) return;
        const under = document.elementFromPoint(pointer.x, pointer.y);
        const row = under instanceof Element ? under.closest<HTMLElement>("[data-agent-row]") : null;
        hovered.current = row && stage.contains(row) ? (row.dataset.agentRow ?? null) : null;
      };
      const onMove = (event: PointerEvent) => {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        track();
      };
      const onOut = () => {
        pointer.x = -1;
        hovered.current = null;
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("scroll", track, { passive: true });
      document.documentElement.addEventListener("pointerleave", onOut);
      a.onCleanup(() => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", track);
        document.documentElement.removeEventListener("pointerleave", onOut);
      });

      const first = marks()[0];
      if (!first) return;
      let current: HTMLElement = first;
      let seat: "top" | "side" = "top";
      let turn = 0;
      let visits = 0;
      const seatSpot = () => (seat === "top" ? onTop(stage, current) : beside(stage, current));

      // Listings load and rows grow under Purl: keep it seated on its tile.
      const follow = new ResizeObserver(() => {
        if (a.busy) return;
        const spot = seatSpot();
        a.place(spot.x, spot.y);
      });
      follow.observe(stage);
      a.onCleanup(() => follow.disconnect());

      /** Stop whatever is happening when the cursor picks a different agent than `aim`. */
      const aimAt = (aim: string | undefined) => a.interruptWhen(() => hovered.current !== null && hovered.current !== aim);

      // One hop straight to the target, fast. Re-aimed if the cursor moves on mid-flight.
      const flyTo = async (destination: HTMLElement) => {
        let target = destination;
        for (;;) {
          aimAt(target.dataset.agentMark);
          const spot = onTop(stage, target);
          const distance = Math.hypot(spot.x - a.x, spot.y - a.y);
          try {
            await a.walkTo(spot.x, spot.y, { lift: Math.min(70, 18 + distance * 0.12), speed: 420 + distance * 1.4 });
            current = target;
            seat = "top";
            return;
          } catch (error) {
            if (!(error instanceof Interrupted) || !hovered.current) throw error;
            const next = markFor(hovered.current);
            if (!next) throw error;
            target = next;
          }
        }
      };

      const play = async (game: Game) => {
        const mark = current;
        if (game === "bounce") {
          a.pose({ face: "happy" }, { motion: "none" });
          for (let i = 0; i < 3; i += 1) {
            await a.hop(14, 360);
            react(mark, "kl-mark-squash", 420);
          }
        } else if (game === "spin") {
          a.pose({ face: "happy", ears: "perk" });
          react(mark, "kl-mark-spin", 900);
          await a.hop(22, 700);
          a.pose({ face: "squished", ears: "down" }, { motion: "tremble" });
          await a.wait(800);
        } else {
          const side = beside(stage, mark);
          await a.walkTo(side.x, side.y, { lift: 16, speed: 220 });
          seat = "side";
          if (game === "boop") {
            a.pose({ face: "lookRight" });
            await a.walkTo(side.x + 6, side.y, { speed: 60 });
            react(mark, "kl-mark-boop", 700);
            a.pose({ face: "happy" });
            await a.walkTo(side.x, side.y, { speed: 50 });
            await a.wait(400);
          } else {
            a.pose({ face: "love", ears: "wiggle" }, { motion: "bob" });
            a.hearts(3);
            react(mark, "kl-mark-glow", 1400);
            await a.wait(1400);
          }
          const top = onTop(stage, mark);
          await a.walkTo(top.x, top.y, { lift: 16, speed: 220 });
          seat = "top";
        }
      };

      a.place(onTop(stage, current).x, onTop(stage, current).y);
      a.pose({ face: "open" }, { motion: "bob" });

      for (;;) {
        try {
          const wanted = hovered.current ? markFor(hovered.current) : null;
          if (wanted && wanted !== current) {
            await flyTo(wanted);
          } else if (!wanted && visits >= 2) {
            const options = visible().filter((mark) => mark !== current);
            const next = options[Math.floor(Math.random() * options.length)];
            if (next) await flyTo(next);
            visits = 0;
          } else if (seat === "top") {
            // Re-seat on the tile: the page may have moved under Purl.
            const spot = onTop(stage, current);
            if (Math.abs(spot.x - a.x) > 2 || Math.abs(spot.y - a.y) > 2) a.place(spot.x, spot.y);
          }

          aimAt(current.dataset.agentMark);
          if (a.idleMs > NAP_AFTER_MS && !hovered.current) {
            a.pose({ face: "sleep", legs: "none", lying: true }, { motion: "none", zzz: true });
            await a.wait(60_000, () => a.idleMs < 1000);
            a.pose({ face: "open", lying: false, legs: "stand" }, { zzz: false, bang: true });
            await a.hop(10, 360);
            a.pose({}, { bang: false });
            continue;
          }

          await play(GAMES[turn % GAMES.length] ?? "bounce");
          turn += 1;
          visits += 1;
          a.pose({ face: "open", ears: "down", legs: "stand", lying: false }, { motion: "bob" });
          await a.wait(between(1600, 3200));
        } catch (error) {
          if (!(error instanceof Interrupted)) throw error;
          // Dropped everything for a new agent: look up, then go (next turn of the loop).
          a.pose({ face: "open", ears: "perk", legs: "stand", lying: false }, { motion: "none", zzz: false, bang: false });
        }
      }
    },
    {
      still: (stage) => {
        const first = stage.querySelector<HTMLElement>("[data-agent-mark]");
        return first ? onTop(stage, first) : { x: 0, y: 0 };
      },
    },
  );

  return (
    <div ref={stageRef} className="relative">
      {children}
      <PurlActor actor={actor} className="z-10 hidden lg:block" />
    </div>
  );
}
