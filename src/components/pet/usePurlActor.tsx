"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { cx } from "@/components/ui/styles";
import { PixelEffect, PurlSprite } from "@/components/pet/PurlSprite";
import { HEIGHT, RESTING_POSE, WIDTH, type Pose } from "@/components/pet/sprites";

/**
 * A small stage director for Purl's scripted scenes (Agents, About, Account).
 *
 * A scene is an async script: `await actor.walkTo(x, y)`, `actor.pose({...})`,
 * `await actor.wait(ms)`, `actor.hearts(3)`. Positions are in px relative to the stage, the
 * element the actor is absolutely positioned in. The script only runs while the stage is
 * on screen and the tab is visible, stops on unmount, and never runs with reduced motion
 * (the scene's still frame is shown instead).
 */

export type Motion = "none" | "bob" | "tremble";

export interface ActorView {
  pose: Pose;
  motion: Motion;
  zzz: boolean;
  bang: boolean;
}

interface Heart {
  id: number;
  left: number;
}

class Cancelled extends Error {}

/** Thrown out of a move or wait when the scene's interrupt condition turns true. */
export class Interrupted extends Error {}

export interface Actor {
  /** Current position (top-left of the sprite) in stage px. */
  readonly x: number;
  readonly y: number;
  readonly stage: HTMLElement;
  pose(next: Partial<Pose>, extra?: Partial<Omit<ActorView, "pose">>): void;
  /** Jump straight to a position without animating. */
  place(x: number, y: number): void;
  /** Walk with stepping legs, looking where it goes. `lift` turns it into a hop. */
  walkTo(x: number, y: number, options?: { speed?: number; lift?: number }): Promise<void>;
  /** A hop on the spot. */
  hop(height?: number, ms?: number): Promise<void>;
  /** Waits, cut short when `until` turns true. */
  wait(ms: number, until?: () => boolean): Promise<void>;
  hearts(count?: number): void;
  /** Is the pointer anywhere near Purl? */
  pointerNear(radius?: number): boolean;
  readonly idleMs: number;
  /** True while Purl is walking or hopping. */
  readonly busy: boolean;
  /** Runs when the scene stops (unmount). */
  onCleanup(cleanup: () => void): void;
  /**
   * While `when` is true, any move or wait stops at once with `Interrupted`, leaving Purl
   * where it is (mid-air included), so the scene can turn to something more urgent.
   */
  interruptWhen(when: (() => boolean) | null): void;
}

const STILL: ActorView = { pose: RESTING_POSE, motion: "none", zzz: false, bang: false };

function keyOf(view: ActorView): string {
  const { pose } = view;
  return `${pose.face}|${pose.ears}|${pose.legs}|${pose.puff}|${pose.lying}|${view.motion}|${view.zzz}|${view.bang}`;
}

export function usePurlActor(
  stageRef: RefObject<HTMLElement | null>,
  script: (actor: Actor) => Promise<void>,
  options: { still?: (stage: HTMLElement) => { x: number; y: number } } = {},
) {
  const actorRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ActorView>(STILL);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const scriptRef = useRef(script);
  const stillRef = useRef(options.still);

  useEffect(() => {
    scriptRef.current = script;
    stillRef.current = options.still;
  });

  useEffect(() => {
    const stage = stageRef.current;
    const element = actorRef.current;
    if (!stage || !element) return;

    let x = 0;
    let y = 0;
    const draw = (lift = 0) => {
      element.style.transform = `translate3d(${x}px, ${y - lift}px, 0)`;
    };

    const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    if (!motionOk) {
      const spot = stillRef.current?.(stage) ?? { x: 0, y: 0 };
      x = spot.x;
      y = spot.y;
      draw();
      element.style.opacity = "1";
      return;
    }

    let alive = true;
    let onScreen = false;
    let wake: (() => void) | null = null;
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      if (onScreen) wake?.();
    });
    visibility.observe(stage);

    const pointer = { x: -1e6, y: -1e6, at: performance.now() };
    const onPointer = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.at = performance.now();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let current = STILL;
    let lastKey = keyOf(STILL);
    const commit = (next: ActorView) => {
      current = next;
      const key = keyOf(next);
      if (key !== lastKey) {
        lastKey = key;
        setView(next);
      }
    };

    const checkAlive = () => {
      if (!alive) throw new Cancelled();
    };
    const untilShown = async () => {
      while (alive && (!onScreen || document.hidden)) {
        await new Promise<void>((resolve) => {
          wake = resolve;
          window.setTimeout(resolve, 500);
        });
      }
      checkAlive();
    };
    const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

    let heartId = 0;
    const timers: number[] = [];
    const cleanups: (() => void)[] = [];
    let moving = 0;
    let interrupt: (() => boolean) | null = null;
    // Stop now: fold any hop height into the position so Purl stays exactly where it is seen.
    const checkInterrupt = (lift = 0) => {
      if (!interrupt?.()) return;
      y -= lift;
      draw();
      throw new Interrupted();
    };

    const actor: Actor = {
      get x() {
        return x;
      },
      get y() {
        return y;
      },
      stage,
      get idleMs() {
        return performance.now() - pointer.at;
      },
      get busy() {
        return moving > 0;
      },
      onCleanup(cleanup) {
        cleanups.push(cleanup);
      },
      interruptWhen(when) {
        interrupt = when;
      },
      pose(next, extra) {
        commit({ ...current, ...extra, pose: { ...current.pose, ...next } });
      },
      place(nextX, nextY) {
        x = nextX;
        y = nextY;
        draw();
      },
      async walkTo(toX, toY, { speed = 70, lift = 0 } = {}) {
        await untilShown();
        const fromX = x;
        const fromY = y;
        const distance = Math.hypot(toX - fromX, toY - fromY);
        if (distance < 0.5) return;
        const ms = Math.max(220, (distance / speed) * 1000);
        const face: Pose["face"] = toX < fromX - 2 ? "lookLeft" : toX > fromX + 2 ? "lookRight" : current.pose.face;
        const start = performance.now();
        let step = false;
        let stepAt = 0;
        let lastLift = 0;
        moving += 1;
        try {
          for (;;) {
            const now = await frame();
            checkAlive();
            checkInterrupt(lastLift);
            const progress = Math.min(1, (now - start) / ms);
            const eased = lift > 0 ? progress : progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
            x = fromX + (toX - fromX) * eased;
            y = fromY + (toY - fromY) * eased;
            if (lift > 0) {
              actor.pose({ face, legs: "tuck", lying: false }, { motion: "none", zzz: false });
            } else if (now - stepAt > 140) {
              step = !step;
              stepAt = now;
              actor.pose({ face, legs: step ? "stepA" : "stepB", lying: false }, { motion: "none", zzz: false });
            }
            lastLift = lift > 0 ? Math.sin(progress * Math.PI) * lift : 0;
            draw(lastLift);
            if (progress >= 1) break;
          }
        } finally {
          moving -= 1;
        }
        actor.pose({ legs: "stand" });
      },
      async hop(height = 10, ms = 380) {
        await untilShown();
        const start = performance.now();
        const legs = current.pose.legs;
        actor.pose({ legs: "tuck", lying: false });
        let hopLift = 0;
        moving += 1;
        try {
          for (;;) {
            const now = await frame();
            checkAlive();
            checkInterrupt(hopLift);
            const progress = Math.min(1, (now - start) / ms);
            hopLift = Math.sin(progress * Math.PI) * height;
            draw(hopLift);
            if (progress >= 1) break;
          }
        } finally {
          moving -= 1;
        }
        actor.pose({ legs: legs === "none" ? "stand" : legs });
      },
      async wait(ms, until) {
        await untilShown();
        const end = performance.now() + ms;
        while (performance.now() < end) {
          if (until?.()) return;
          checkInterrupt();
          await new Promise((resolve) => window.setTimeout(resolve, 60));
          checkAlive();
        }
      },
      hearts(count = 3) {
        for (let index = 0; index < count; index += 1) {
          timers.push(
            window.setTimeout(() => {
              heartId += 1;
              const id = heartId;
              setHearts((list) => [...list.slice(-5), { id, left: 6 + Math.random() * (WIDTH - 22) }]);
              timers.push(window.setTimeout(() => setHearts((list) => list.filter((heart) => heart.id !== id)), 1500));
            }, index * 260),
          );
        }
      },
      pointerNear(radius = 160) {
        const box = element.getBoundingClientRect();
        return Math.hypot(pointer.x - (box.left + box.width / 2), pointer.y - (box.top + box.height / 2)) < radius;
      },
    };

    const start = stillRef.current?.(stage) ?? { x: 0, y: 0 };
    actor.place(start.x, start.y);
    element.style.opacity = "1";
    scriptRef.current(actor).catch((error: unknown) => {
      if (!(error instanceof Cancelled) && !(error instanceof Interrupted)) throw error;
    });

    return () => {
      alive = false;
      wake?.();
      visibility.disconnect();
      window.removeEventListener("pointermove", onPointer);
      timers.forEach((timer) => window.clearTimeout(timer));
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [stageRef]);

  return { actorRef, view, hearts };
}

/** Renders the actor: the sprite plus its effects. Position comes from the hook. */
export function PurlActor({
  actor,
  className,
  children,
}: {
  actor: ReturnType<typeof usePurlActor>;
  className?: string;
  children?: ReactNode;
}) {
  const { view, hearts, actorRef } = actor;
  return (
    <div
      ref={actorRef}
      aria-hidden="true"
      className={cx("kl-purl pointer-events-none absolute top-0 left-0 opacity-0", className)}
      style={{ width: WIDTH, height: HEIGHT }}
    >
      <div className={cx(view.motion === "bob" && "kl-purl-bob", view.motion === "tremble" && "kl-purl-tremble")}>
        <PurlSprite pose={view.pose} />
      </div>
      {children}
      {view.bang ? <PixelEffect name="bang" className="kl-purl-bang absolute -top-5 left-1/2" /> : null}
      {view.zzz ? (
        <span className="absolute -top-3 right-0">
          {[0, 1, 2].map((index) => (
            <PixelEffect key={index} name="z" size={2} className="kl-purl-z absolute" />
          ))}
        </span>
      ) : null}
      {hearts.map((heart) => (
        <PixelEffect key={heart.id} name="heart" size={2} className="kl-purl-heart absolute -top-2" style={{ left: heart.left }} />
      ))}
    </div>
  );
}
