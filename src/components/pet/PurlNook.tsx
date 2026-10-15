"use client";

import { useEffect, useId, useRef, useState } from "react";

import { cx } from "@/components/ui/styles";
import { PixelEffect, PurlSprite } from "@/components/pet/PurlSprite";
import { HEIGHT, RESTING_POSE, WIDTH, type Pose } from "@/components/pet/sprites";

/**
 * Where Purl lives (design.md §7.2).
 *
 * - `gap`: the empty space under a sticky sidebar. Purl measures the room between the
 *   sidebar (the element marked `data-pet-roof` in the same column) and the bottom of the
 *   column, live as the page scrolls. Plenty of room: Purl wanders, blinks, flicks an ear,
 *   watches the cursor and dozes off when left alone. Room closing in: alarm, then scared and
 *   trembling. Room almost gone: squashed flat to fit. Room back: a hop of relief.
 * - `lane`: a fixed strip (the footer) where Purl just wanders.
 *
 * Hovering Purl makes it happy (hearts). It is decorative: hidden from assistive tech,
 * never in the way of a control, and still when motion is not welcome.
 */

type Mode = "gap" | "lane";
type Room = "free" | "scared" | "squished" | "hidden";
type Motion = "none" | "bob" | "tremble";
type Activity = "idle" | "walk" | "sleep";

interface View {
  pose: Pose;
  motion: Motion;
  zzz: boolean;
  bang: boolean;
  drop: boolean;
  /** Knitting (About): the needles click in front of Purl. */
  needles: boolean;
}

interface Heart {
  id: number;
  left: number;
}

/** Space kept between Purl and the edges of its room, in px. */
const EDGE = 12;
const FLOOR = 8;
/** Below this much spare height above Purl, it gets scared. */
const SCARE_BAND = 44;
/** Squashed flatter than this, Purl ducks out of sight. */
const MIN_SQUASH = 0.28;
const WALK_SPEED = 26; // px per second
const STEP_MS = 150;
const SLEEP_AFTER_MS = 25_000;
const HEART_EVERY_MS = 480;

const STILL: View = { pose: RESTING_POSE, motion: "none", zzz: false, bang: false, drop: false, needles: false };

function viewKey(view: View): string {
  const { pose } = view;
  return `${pose.face}|${pose.ears}|${pose.legs}|${pose.puff}|${pose.lying}|${view.motion}|${view.zzz}|${view.bang}|${view.drop}|${view.needles}`;
}

function between(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * `knit`: a selector for the content being read. Instead of wandering, Purl sits and knits,
 * and the scarf beside it grows with how far through that content the reader has scrolled.
 * At the end it holds the scarf up, happy. Used on About.
 */
export function PurlNook({ mode = "gap", knit, className }: { mode?: Mode; knit?: string; className?: string }) {
  const nookRef = useRef<HTMLDivElement>(null);
  const scarfRef = useRef<HTMLDivElement>(null);
  const stitch = useId();
  const petRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(STILL);
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    const nook = nookRef.current;
    const pet = petRef.current;
    const column = nook?.parentElement;
    if (!nook || !pet || !column) return;

    const roof = mode === "gap" ? column.querySelector<HTMLElement>("[data-pet-roof]") : null;
    const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    const content = knit ? document.querySelector<HTMLElement>(knit) : null;
    const scarf = scarfRef.current;

    // How far through the content the reader is, 0-1; the scarf is that long.
    let progress = 0;
    const measureKnit = () => {
      if (!content || !scarf) return;
      const box = content.getBoundingClientRect();
      progress = Math.max(0, Math.min(1, (window.innerHeight - box.top) / Math.max(1, box.height)));
      const lane = Math.max(0, nook.clientWidth - WIDTH - EDGE * 2 - 6);
      scarf.style.width = `${Math.round((progress * lane) / 6) * 6}px`;
    };

    // Spare height for Purl, in px. A lane always has enough.
    let room = Number.POSITIVE_INFINITY;
    const measure = () => {
      if (!roof) return;
      room = column.getBoundingClientRect().bottom - roof.getBoundingClientRect().bottom - FLOOR;
      if (!motionOk) pet.style.opacity = room >= HEIGHT ? "1" : "0";
      if (scarf) scarf.style.opacity = room >= 16 ? "1" : "0";
      measureKnit();
    };

    const cleanups: (() => void)[] = [];
    if (roof) {
      measure();
      window.addEventListener("scroll", measure, { passive: true });
      window.addEventListener("resize", measure);
      const observer = new ResizeObserver(measure);
      observer.observe(column);
      observer.observe(roof);
      cleanups.push(() => {
        window.removeEventListener("scroll", measure);
        window.removeEventListener("resize", measure);
        observer.disconnect();
      });
    }

    if (content && !roof) {
      measureKnit();
      window.addEventListener("scroll", measureKnit, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", measureKnit));
    }

    if (!motionOk) {
      pet.style.transform = `translate3d(${EDGE}px, 0, 0)`;
      if (!roof) pet.style.opacity = "1";
      return () => cleanups.forEach((cleanup) => cleanup());
    }

    const sim = {
      x: content ? 0 : Math.max(0, nook.clientWidth - WIDTH - EDGE * 2) * between(0.1, 0.5),
      target: 0,
      activity: "idle" as Activity,
      until: performance.now() + between(800, 2000),
      dir: 1,
      step: false,
      stepAt: 0,
      nextBlink: performance.now() + between(1500, 4000),
      blinkUntil: 0,
      nextWiggle: performance.now() + between(3000, 8000),
      wiggleUntil: 0,
      hopStart: -1,
      happyUntil: 0,
      bangUntil: 0,
      nextHeart: 0,
      lastPointer: performance.now(),
      pointerX: null as number | null,
      pointerY: null as number | null,
      prevRoom: "free" as Room,
      knitDone: false,
    };

    let heartId = 0;
    const heartTimers: number[] = [];
    const spawnHeart = () => {
      heartId += 1;
      const id = heartId;
      setHearts((list) => [...list.slice(-5), { id, left: between(8, WIDTH - 22) }]);
      heartTimers.push(window.setTimeout(() => setHearts((list) => list.filter((heart) => heart.id !== id)), 1500));
    };

    const onPointer = (event: PointerEvent) => {
      const now = performance.now();
      sim.lastPointer = now;
      sim.pointerX = event.clientX;
      sim.pointerY = event.clientY;
      if (sim.activity === "sleep") {
        const box = pet.getBoundingClientRect();
        const near = Math.hypot(event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height / 2)) < 220;
        if (near) {
          sim.activity = "idle";
          sim.until = now + between(1500, 3000);
          sim.hopStart = now;
        }
      }
    };
    const onLeave = () => {
      sim.pointerX = null;
      sim.pointerY = null;
    };
    // Scrolling is reading: it keeps Purl awake too.
    const onScroll = () => {
      sim.lastPointer = performance.now();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    cleanups.push(() => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    });

    // Purl never takes pointer events (it must not block anything), so hovering is worked
    // out from the cursor position, which also catches Purl walking under a still cursor.
    const isHovered = () => {
      if (sim.pointerX === null || sim.pointerY === null) return false;
      const box = pet.getBoundingClientRect();
      return sim.pointerX >= box.left && sim.pointerX <= box.right && sim.pointerY >= box.top - 6 && sim.pointerY <= box.bottom;
    };

    let lastKey = viewKey(STILL);
    let raf = 0;
    let last = performance.now();
    let running = false;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const lane = Math.max(0, nook.clientWidth - WIDTH - EDGE * 2);
      sim.x = Math.min(sim.x, lane);

      const state: Room =
        room < HEIGHT * MIN_SQUASH ? "hidden" : room < HEIGHT ? "squished" : room < HEIGHT + SCARE_BAND ? "scared" : "free";
      if (state !== sim.prevRoom) {
        const wasPressed = sim.prevRoom === "squished" || sim.prevRoom === "hidden";
        if (wasPressed && (state === "free" || state === "scared")) {
          sim.hopStart = now;
          sim.happyUntil = now + 1300;
        }
        if (sim.prevRoom === "free" && state !== "free") sim.bangUntil = now + 900;
        if (state !== "free") sim.activity = "idle";
        sim.prevRoom = state;
      }

      let pose: Pose = { ...RESTING_POSE };
      let motion: Motion = "none";
      let scaleX = 1;
      let scaleY = 1;
      let zzz = false;
      let drop = false;
      let needles = false;

      if (state === "hidden" || state === "squished") {
        const k = Math.max(MIN_SQUASH, Math.min(1, room / HEIGHT));
        scaleY = k;
        scaleX = 1 + (1 - k) * 0.6;
        pose = { face: "squished", ears: "down", legs: "splay", puff: false, lying: false };
      } else if (state === "scared") {
        pose = { face: "scared", ears: "perk", legs: "stand", puff: true, lying: false };
        motion = "tremble";
        drop = true;
      } else if (isHovered()) {
        sim.lastPointer = now;
        if (sim.activity === "sleep") sim.activity = "idle";
        pose = { face: "love", ears: now % 600 < 300 ? "wiggle" : "down", legs: "stand", puff: false, lying: false };
        motion = "bob";
        if (now >= sim.nextHeart) {
          sim.nextHeart = now + HEART_EVERY_MS;
          spawnHeart();
        }
      } else {
        if (sim.activity !== "sleep" && now >= sim.until) {
          if (now - sim.lastPointer > SLEEP_AFTER_MS) {
            sim.activity = "sleep";
          } else if (!content && Math.random() < 0.55 && lane > 40) {
            sim.activity = "walk";
            let target = between(0, lane);
            if (Math.abs(target - sim.x) < 40) target = sim.x > lane / 2 ? sim.x - between(40, sim.x) : sim.x + between(40, lane - sim.x);
            sim.target = Math.max(0, Math.min(lane, target));
            sim.until = now + 20_000;
          } else {
            sim.activity = "idle";
            sim.until = now + between(1500, 4500);
          }
        }

        if (sim.activity === "sleep") {
          pose = { face: "sleep", ears: "down", legs: "none", puff: false, lying: true };
          zzz = true;
        } else if (sim.activity === "walk") {
          const distance = sim.target - sim.x;
          sim.dir = Math.sign(distance) || sim.dir;
          sim.x += Math.sign(distance) * Math.min(Math.abs(distance), WALK_SPEED * dt);
          if (now - sim.stepAt > STEP_MS) {
            sim.step = !sim.step;
            sim.stepAt = now;
          }
          pose = { face: sim.dir < 0 ? "lookLeft" : "lookRight", ears: "down", legs: sim.step ? "stepA" : "stepB", puff: false, lying: false };
          if (Math.abs(sim.target - sim.x) < 0.5) {
            sim.activity = "idle";
            sim.until = now + between(1500, 4000);
          }
        } else {
          let face: Pose["face"] = "open";
          if (sim.pointerX !== null && now - sim.lastPointer < 4000) {
            const box = pet.getBoundingClientRect();
            const offset = sim.pointerX - (box.left + box.width / 2);
            if (offset < -48) face = "lookLeft";
            else if (offset > 48) face = "lookRight";
          }
          if (now >= sim.nextWiggle) {
            sim.wiggleUntil = now + 380;
            sim.nextWiggle = now + between(5000, 11000);
          }
          pose = { face, ears: now < sim.wiggleUntil ? "wiggle" : "down", legs: "stand", puff: false, lying: false };
          motion = "bob";
          if (content) {
            // Knitting: eyes on the work, needles clicking, the scarf held up at the end.
            pose = { ...pose, face: face === "open" ? "happy" : face };
            motion = "none";
            needles = true;
            if (progress >= 0.97 && !sim.knitDone) {
              sim.knitDone = true;
              sim.happyUntil = now + 2200;
              sim.hopStart = now;
              [0, 260, 520].forEach((delay) => heartTimers.push(window.setTimeout(spawnHeart, delay)));
            } else if (progress < 0.85) {
              sim.knitDone = false;
            }
          }
        }

        if (now >= sim.nextBlink) {
          sim.blinkUntil = now + 140;
          sim.nextBlink = now + between(2400, 6000);
        }
        if (now < sim.blinkUntil && (pose.face === "open" || pose.face === "lookLeft" || pose.face === "lookRight")) {
          pose = { ...pose, face: "blink" };
        }
      }

      if (now < sim.happyUntil && state === "free") pose = { ...pose, face: "happy", lying: false, legs: pose.legs === "none" ? "stand" : pose.legs };

      let lift = 0;
      if (sim.hopStart >= 0) {
        const progress = (now - sim.hopStart) / 420;
        if (progress >= 1) sim.hopStart = -1;
        else {
          lift = Math.sin(progress * Math.PI) * 10;
          pose = { ...pose, legs: "tuck", lying: false };
        }
      }

      pet.style.opacity = state === "hidden" ? "0" : "1";
      pet.style.transform = `translate3d(${EDGE + sim.x}px, ${-lift}px, 0) scale(${scaleX}, ${scaleY})`;

      const next: View = { pose, motion, zzz, bang: now < sim.bangUntil, drop, needles };
      const key = viewKey(next);
      if (key !== lastKey) {
        lastKey = key;
        setView(next);
      }
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Only alive while on screen and while the tab is visible.
    let onScreen = false;
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      if (onScreen) start();
      else stop();
    });
    visibility.observe(roof ? column : nook);
    const onVisibility = () => (document.hidden || !onScreen ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      heartTimers.forEach((timer) => window.clearTimeout(timer));
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [mode, knit]);

  return (
    <div
      ref={nookRef}
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute bottom-0 hidden lg:block",
        mode === "gap" ? "inset-x-0 h-0" : "top-0 right-0",
        className,
      )}
    >
      <div
        ref={petRef}
        className="kl-purl absolute left-0 origin-bottom opacity-0"
        style={{ bottom: FLOOR, width: WIDTH, height: HEIGHT }}
      >
        <div className={cx(view.motion === "bob" && "kl-purl-bob", view.motion === "tremble" && "kl-purl-tremble")}>
          <PurlSprite pose={view.pose} />
        </div>

        {view.needles ? <PixelEffect name="needles" size={2} className="kl-purl-knit absolute top-[31px] left-[24px]" /> : null}
        {view.bang ? <PixelEffect name="bang" className="kl-purl-bang absolute -top-5 left-1/2" /> : null}
        {view.drop ? <PixelEffect name="drop" size={2} className="kl-purl-drop absolute top-3 -right-1" /> : null}
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
      {knit ? (
        // The scarf Purl is knitting: rows of lime stitches, as long as the reading so far.
        <div ref={scarfRef} className="absolute h-3 w-0 overflow-hidden" style={{ left: EDGE + WIDTH + 6, bottom: FLOOR + 3 }}>
          <svg width="100%" height="12" shapeRendering="crispEdges">
            <defs>
              <pattern id={stitch} width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M0.5 0.5 L3 4.5 L5.5 0.5" fill="none" strokeWidth="1" className="stroke-lime" />
              </pattern>
            </defs>
            <rect width="100%" height="12" fill={`url(#${stitch})`} />
          </svg>
        </div>
      ) : null}
    </div>
  );
}
