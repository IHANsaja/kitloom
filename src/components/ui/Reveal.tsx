"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /**
   * "load": entrance for content at the top of a page. Descendants marked with
   *         `data-reveal-item` are pre-hidden by CSS (see globals.css) and staggered in.
   * "scroll": reveals once when scrolled into view. Only applies if the element starts
   *         below the fold, so nothing visible on arrival ever flashes.
   */
  mode?: "load" | "scroll";
  /** Total time spread across all items, in seconds. */
  spread?: number;
}

/** The one shared entrance animation. Rules: design.md §7. */
export function Reveal({ children, className, mode = "scroll", spread = 0.4 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = ref.current;
      if (!element) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const items = gsap.utils.toArray<HTMLElement>("[data-reveal-item]", element);
        const targets = items.length > 0 ? items : [element];

        if (mode === "load") {
          gsap.fromTo(
            targets,
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: { amount: spread }, clearProps: "transform" },
          );
          return;
        }

        if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return;
        gsap.set(targets, { opacity: 0, y: 16 });
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power3.out",
          stagger: { amount: spread },
          clearProps: "transform",
          scrollTrigger: { trigger: element, start: "top 88%", once: true },
        });
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} data-reveal={mode} className={className}>
      {children}
    </div>
  );
}
