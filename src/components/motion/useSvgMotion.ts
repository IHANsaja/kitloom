"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger, MotionPathPlugin);

const MOTION_OK = "(prefers-reduced-motion: no-preference)";

let refreshWatcher: ResizeObserver | null = null;

/**
 * Scroll-linked animations (section reveals, the About scroll thread) do depend on measured
 * positions. Listings arrive after the page loads and change its height, so re-measure
 * whenever the document resizes. One observer for the whole app, debounced.
 */
export function keepScrollTriggersFresh() {
  if (refreshWatcher || typeof ResizeObserver === "undefined") return;
  let timer = 0;
  refreshWatcher = new ResizeObserver(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
  });
  refreshWatcher.observe(document.body);
}

export type Select =(selector: string) => SVGElement[];

interface Options {
  /** Loop forever (default) or play once when the drawing first scrolls into view. */
  once?: boolean;
  /** Pause between loops, in seconds. */
  repeatDelay?: number;
}

/**
 * The engine behind every SVG illustration (rules: design.md §7).
 *
 * - The markup is the finished drawing. Animation only adds to it, so visitors without
 *   JavaScript, and visitors who prefer reduced motion, see complete, static artwork.
 * - A looping timeline only runs while its SVG is on screen; it is paused otherwise.
 * - Everything is created inside useGSAP + matchMedia, so it is reverted on unmount and
 *   when the motion preference changes.
 */
export function useSvgMotion(build: (tl: gsap.core.Timeline, q: Select, svg: SVGSVGElement) => void, options: Options = {}) {
  const ref = useRef<SVGSVGElement>(null);
  const { once = false, repeatDelay = 0.6 } = options;

  useGSAP(
    () => {
      const svg = ref.current;
      if (!svg) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const q: Select = (selector) => gsap.utils.toArray<SVGElement>(selector, svg);
        const tl = gsap.timeline({
          paused: true,
          repeat: once ? 0 : -1,
          repeatDelay,
          defaults: { ease: "power2.inOut" },
        });
        // The SVG is pre-hidden by CSS while scripts are on (globals.css), so it never
        // flashes its finished state before the first frame of animation.
        gsap.to(svg, { opacity: 1, duration: 0.5, ease: "power1.out" });
        build(tl, q, svg);
        // Visibility comes from IntersectionObserver, not from scroll positions measured at
        // mount: pages grow after listings load, and a measured position would go stale.
        const observer = new IntersectionObserver((entries) => {
          const visible = entries.some((entry) => entry.isIntersecting);
          if (visible) {
            void tl.play();
            if (once) observer.disconnect();
          } else if (!once) {
            tl.pause();
          }
        });
        observer.observe(svg);
        keepScrollTriggersFresh();
        return () => observer.disconnect();
      });
    },
    { scope: ref },
  );

  return ref;
}

/** Shared attributes for every animated illustration: decorative, and marked for CSS. */
export const motionSvg = { "data-motion": "", "aria-hidden": true, focusable: false, fill: "none" } as const;

/** Props for a stroke that can be "drawn": animate strokeDashoffset from 1 to 0. */
export const drawable = { pathLength: 1, strokeDasharray: 1 } as const;

export { gsap, ScrollTrigger };
