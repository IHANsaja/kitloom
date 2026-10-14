"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";

/**
 * Shared hover for a group of items: one highlight that travels from item to item instead
 * of each item lighting up on its own (design.md §7.1, "Glide").
 *
 * The highlight moves like a thread being pulled: its leading edge reaches the new item
 * first and the trailing edge follows, so it stretches across the gap and settles. On
 * arrival its lime edge is plucked and rings briefly. Keyboard focus moves it too.
 *
 * Usage: put the returned callback ref on the container (it may mount later, e.g. after
 * data loads) and `data-glide` on each item. Items keep their own
 * hover styles; while the glide is active the container gets `data-glide-on`, and
 * globals.css turns their hover backgrounds off so the two do not double up. With touch
 * input or reduced motion nothing is attached and the items' own hover styles apply.
 */

export type GlideEdge = "left" | "bottom" | "corners";

const PAD = "pointer-events-none absolute top-0 left-0 z-[1] bg-fg/[0.045] opacity-0 will-change-transform";

const EDGES: Record<GlideEdge, string> = {
  left: '<span data-glide-edge class="absolute inset-y-0 left-0 w-0.5 origin-center bg-lime"></span>',
  bottom: '<span data-glide-edge class="absolute inset-x-3 bottom-0 h-0.5 origin-center bg-lime"></span>',
  corners: [
    "top-0 left-0 border-t-2 border-l-2",
    "top-0 right-0 border-t-2 border-r-2",
    "bottom-0 left-0 border-b-2 border-l-2",
    "bottom-0 right-0 border-b-2 border-r-2",
  ]
    .map((place) => `<span data-glide-edge class="absolute size-2 border-lime ${place}"></span>`)
    .join(""),
};

const CAN_GLIDE = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

export function useGlide<T extends HTMLElement>(edge: GlideEdge = "left") {
  const [root, setRoot] = useState<T | null>(null);

  useEffect(() => {
    if (!root || !window.matchMedia(CAN_GLIDE).matches) return;

    root.setAttribute("data-glide-root", "");
    root.setAttribute("data-glide-on", "");
    const restorePosition = getComputedStyle(root).position === "static";
    if (restorePosition) root.style.setProperty("position", "relative");

    const pad = document.createElement("div");
    pad.setAttribute("aria-hidden", "true");
    pad.className = PAD;
    pad.innerHTML = EDGES[edge];
    root.append(pad);
    const edges = pad.querySelectorAll<HTMLElement>("[data-glide-edge]");

    const box: Box = { l: 0, t: 0, r: 0, b: 0 };
    let current: HTMLElement | null = null;
    let shown = false;
    let hideTimer = 0;

    const render = () => {
      pad.style.transform = `translate3d(${box.l}px, ${box.t}px, 0)`;
      pad.style.width = `${Math.max(0, box.r - box.l)}px`;
      pad.style.height = `${Math.max(0, box.b - box.t)}px`;
    };

    const measure = (item: HTMLElement): Box => {
      const a = item.getBoundingClientRect();
      const c = root.getBoundingClientRect();
      const x = c.left + root.clientLeft - root.scrollLeft;
      const y = c.top + root.clientTop - root.scrollTop;
      return { l: a.left - x, t: a.top - y, r: a.right - x, b: a.bottom - y };
    };

    // The lime edge is plucked when the highlight lands.
    const pluck = () => {
      if (edge === "corners") {
        gsap.fromTo(edges, { scale: 1.9 }, { scale: 1, duration: 0.55, ease: "elastic.out(1, 0.45)", overwrite: true });
      } else {
        gsap.fromTo(edges, edge === "left" ? { scaleY: 0.35 } : { scaleX: 0.35 }, {
          scaleY: 1,
          scaleX: 1,
          duration: 0.6,
          ease: "elastic.out(1, 0.4)",
          overwrite: true,
        });
      }
    };

    // Is `node` inside an item that belongs to this container (not to a nested one)?
    const itemFrom = (node: EventTarget | null): HTMLElement | null => {
      let item = node instanceof Element ? node.closest<HTMLElement>("[data-glide]") : null;
      while (item && item.closest("[data-glide-root]") !== root) {
        item = item.parentElement?.closest<HTMLElement>("[data-glide]") ?? null;
      }
      return item && root.contains(item) ? item : null;
    };

    const moveTo = (item: HTMLElement) => {
      window.clearTimeout(hideTimer);
      if (item === current && shown) return;
      const next = measure(item);
      current = item;
      gsap.killTweensOf(box);

      if (!shown) {
        Object.assign(box, next);
        render();
        gsap.fromTo(pad, { opacity: 0, scale: 0.985 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out", overwrite: true });
        shown = true;
        pluck();
        return;
      }

      // Leading edges move quickly, trailing edges lag: the highlight stretches, then settles.
      const lead = 0.22;
      const trail = 0.46;
      const right = next.l > box.l;
      const down = next.t > box.t;
      const tween = (prop: keyof Box, value: number, duration: number) =>
        gsap.to(box, { [prop]: value, duration, ease: "power3.out", onUpdate: render });
      tween("r", next.r, right ? lead : trail);
      tween("l", next.l, right ? trail : lead);
      tween("b", next.b, down ? lead : trail);
      tween("t", next.t, down ? trail : lead);
      pluck();
    };

    const hide = () => {
      window.clearTimeout(hideTimer);
      // A short grace period, so crossing the 1px rule between items never flickers.
      hideTimer = window.setTimeout(() => {
        gsap.to(pad, { opacity: 0, duration: 0.22, ease: "power1.out", overwrite: true });
        shown = false;
        current = null;
      }, 90);
    };

    const onOver = (event: PointerEvent) => {
      const item = itemFrom(event.target);
      if (item) moveTo(item);
    };
    const onFocus = (event: FocusEvent) => {
      const item = itemFrom(event.target);
      if (item) moveTo(item);
    };
    const onBlur = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node) || !root.contains(event.relatedTarget)) hide();
    };

    // Content can change under the pointer (a filter click re-sorts the grid): follow it.
    const resize = new ResizeObserver(() => {
      if (!shown || !current) return;
      if (!current.isConnected || !root.contains(current)) {
        hide();
        return;
      }
      gsap.killTweensOf(box);
      Object.assign(box, measure(current));
      render();
    });
    resize.observe(root);

    root.addEventListener("pointerover", onOver);
    root.addEventListener("pointerleave", hide);
    root.addEventListener("focusin", onFocus);
    root.addEventListener("focusout", onBlur);

    return () => {
      window.clearTimeout(hideTimer);
      resize.disconnect();
      root.removeEventListener("pointerover", onOver);
      root.removeEventListener("pointerleave", hide);
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("focusout", onBlur);
      gsap.killTweensOf([box, pad, ...edges]);
      pad.remove();
      root.removeAttribute("data-glide-root");
      root.removeAttribute("data-glide-on");
      if (restorePosition) root.style.removeProperty("position");
    };
  }, [root, edge]);

  return setRoot;
}
