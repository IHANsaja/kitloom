"use client";

import { drawable, gsap, motionSvg, useSvgMotion } from "@/components/motion/useSvgMotion";
import { cx } from "@/components/ui/styles";

/**
 * Ambient, structural animations: backgrounds, dividers, loaders. All decorative
 * (aria-hidden) and drawn only with design tokens.
 */

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

/** Hero backdrop: a faint loom of warp and weft, with lime shuttles passing through it. */
export function WeaveField({ className }: { className?: string }) {
  const ref = useSvgMotion(
    (tl, q) => {
      q("[data-m=weft]").forEach((el, i) => {
        tl.fromTo(el, { x: -140, opacity: 0 }, { x: 760, opacity: 0.85, duration: 3.4 + i * 0.8, ease: "none" }, i * 1.3);
      });
      q("[data-m=warp]").forEach((el, i) => {
        tl.fromTo(el, { y: -140, opacity: 0 }, { y: 560, opacity: 0.6, duration: 4 + i * 0.7, ease: "none" }, 0.8 + i * 1.7);
      });
      tl.fromTo(q("[data-m=knot]"), { opacity: 0, scale: 0, transformOrigin: "center" }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.5, ease: "back.out(3)" }, 1.2).to(
        q("[data-m=knot]"),
        { opacity: 0, duration: 0.8, stagger: 0.5 },
        3.2,
      );
    },
    { repeatDelay: 0.2 },
  );

  return (
    <svg
      ref={ref}
      {...motionSvg} viewBox="0 0 640 440"
      preserveAspectRatio="xMidYMid slice"
      className={cx("pointer-events-none", className)}
    >
      <g className="stroke-line-subtle" strokeWidth={1}>
        {range(17).map((i) => (
          <path key={`v${i}`} d={`M${i * 40} 0V440`} />
        ))}
        {range(12).map((i) => (
          <path key={`h${i}`} d={`M0 ${i * 40}H640`} />
        ))}
      </g>
      <g strokeWidth={1.5} strokeLinecap="round">
        {[80, 200, 320].map((y) => (
          <path key={y} data-m="weft" d={`M0 ${y}h110`} className="stroke-lime" opacity={0} />
        ))}
        {[200, 480].map((x) => (
          <path key={x} data-m="warp" d={`M${x} 0v110`} className="stroke-fg-2" opacity={0} />
        ))}
      </g>
      {[
        [200, 80],
        [480, 200],
        [200, 320],
        [480, 320],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} data-m="knot" x={(x ?? 0) - 3} y={(y ?? 0) - 3} width={6} height={6} className="fill-lime" opacity={0} />
      ))}
    </svg>
  );
}

/** Section accent: a thread is pulled taut and knotted when its section scrolls into view. */
export function ThreadTick({ className }: { className?: string }) {
  const ref = useSvgMotion(
    (tl, q) => {
      tl.fromTo(q("[data-m=line]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: "power3.out" }).fromTo(
        q("[data-m=knot]"),
        { scale: 0, transformOrigin: "center" },
        { scale: 1, duration: 0.35, ease: "back.out(4)" },
        "-=0.15",
      );
    },
    { once: true },
  );
  return (
    <svg ref={ref} {...motionSvg} viewBox="0 0 56 8" width={56} height={8} className={className}>
      <path data-m="line" d="M0 4h46" className="stroke-line-control" strokeWidth={1} {...drawable} />
      <rect data-m="knot" x={47} y={1} width={6} height={6} className="fill-lime" />
    </svg>
  );
}

// Indent level and bar length of each placeholder row: the outline of a small kit.
const TREE_ROWS: readonly (readonly [number, number])[] = [
  [0, 132],
  [1, 84],
  [2, 118],
  [3, 96],
  [2, 74],
  [1, 108],
  [2, 136],
  [2, 90],
  [1, 70],
  [0, 112],
  [0, 88],
];

/**
 * Loading state for a whole file-tree panel: the outline of a kit is ruled in row by row,
 * a lime marker stepping down beside it, then it clears and starts again. It fills its
 * container, so the panel keeps its size while the real file list is fetched.
 */
export function TreeLoader({ className }: { className?: string }) {
  const ref = useSvgMotion(
    (tl, q) => {
      const rows = q("[data-m=row]");
      const icons = q("[data-m=icon]");
      const marker = q("[data-m=marker]");
      tl.set(rows, { strokeDashoffset: 1 }).set(icons, { opacity: 0 }).set(marker, { y: 0, opacity: 1 });
      rows.forEach((row, index) => {
        const at = index * 0.13;
        tl.to(marker, { y: index * 24, duration: 0.13, ease: "power1.inOut" }, at)
          .to(icons[index] ?? [], { opacity: 1, duration: 0.12 }, at)
          .to(row, { strokeDashoffset: 0, duration: 0.42, ease: "power2.out" }, at + 0.04);
      });
      tl.to(marker, { opacity: 0, duration: 0.2 }, ">-0.1")
        .to([...rows, ...icons], { opacity: 0.25, duration: 0.5, stagger: { amount: 0.3 } }, "+=0.5")
        .set(rows, { opacity: 1 })
        .set(icons, { opacity: 1 });
    },
    { repeatDelay: 0.15 },
  );
  return (
    <svg ref={ref} {...motionSvg} viewBox="0 0 320 276" preserveAspectRatio="xMinYMin meet" className={className}>
      <g className="stroke-line-subtle" strokeWidth={1}>
        <path d="M21 26V230M43 50V206M65 74V98" />
      </g>
      {TREE_ROWS.map(([level, width], index) => {
        const x = 16 + level * 22;
        const y = 14 + index * 24;
        return (
          <g key={index}>
            <rect data-m="icon" x={x} y={y - 5} width={10} height={10} className="stroke-line-control" strokeWidth={1.5} />
            <path data-m="row" d={`M${x + 20} ${y}h${width}`} className="stroke-line-control" strokeWidth={6} strokeLinecap="butt" {...drawable} />
          </g>
        );
      })}
      <rect data-m="marker" x={2} y={10} width={4} height={8} className="fill-lime" opacity={0} />
    </svg>
  );
}

/** Footer band: a row of warp ends with a slow wave travelling along it. */
export function WeftWave({ className }: { className?: string }) {
  const ref = useSvgMotion(
    (tl, q) => {
      tl.to(q("[data-m=end]"), {
        scaleY: 2.6,
        transformOrigin: "50% 100%",
        duration: 0.5,
        ease: "sine.inOut",
        stagger: { each: 0.035, yoyo: true, repeat: 1 },
      }).to(q("[data-m=bead]"), { x: 1188, duration: 4.2, ease: "none" }, 0);
    },
    { repeatDelay: 0.8 },
  );
  return (
    <svg ref={ref} {...motionSvg} viewBox="0 0 1200 28" preserveAspectRatio="none" className={cx("block h-7 w-full", className)}>
      <path d="M0 27.5H1200" className="stroke-line" strokeWidth={1} />
      {range(75).map((i) => (
        <path key={i} data-m="end" d={`M${8 + i * 16} 27v-7`} className={i % 5 === 0 ? "stroke-line-control" : "stroke-line"} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
      <rect data-m="bead" x={0} y={24} width={12} height={3} className="fill-lime" />
    </svg>
  );
}

/** About page: a thread that is let out as the reader scrolls through the page. */
export function ScrollThread({ target, className }: { target: string; className?: string }) {
  const ref = useSvgMotion(
    (_tl, q) => {
      const section = document.querySelector(target);
      if (!section) return;
      // Scrubbed by scroll position rather than played on the looping timeline.
      const scrollTrigger = { trigger: section, start: "top 30%", end: "bottom 70%", scrub: 0.4 };
      gsap.fromTo(q("[data-m=thread]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none", scrollTrigger });
      gsap.fromTo(q("[data-m=bob]"), { y: 0 }, { y: 148, ease: "none", scrollTrigger });
    },
    { once: true },
  );
  return (
    <svg ref={ref} {...motionSvg} viewBox="0 0 16 160" width={16} height={160} className={className}>
      <path d="M8 4v152" className="stroke-line" strokeWidth={1} />
      <path data-m="thread" d="M8 4v152" className="stroke-lime" strokeWidth={1.5} {...drawable} />
      <rect data-m="bob" x={4} y={0} width={8} height={8} className="fill-lime" />
    </svg>
  );
}
