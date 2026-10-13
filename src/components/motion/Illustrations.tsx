"use client";

import { drawable, motionSvg, useSvgMotion } from "@/components/motion/useSvgMotion";

/**
 * Page illustrations. Each one explains something about the page it sits on, in the same
 * vocabulary: threads, looms, knots, kits. All are decorative (aria-hidden), drawn with
 * design tokens only, and complete as static artwork when motion is off.
 */

interface ArtProps {
  className?: string;
}

const svgProps = motionSvg;
const range = (count: number) => Array.from({ length: count }, (_, index) => index);

/** Home, "By agent": threads from several agents run into one kit. */
export function AgentThreads({ className }: ArtProps) {
  const paths = [
    "M12 10C80 10 110 45 196 45",
    "M12 27C80 27 120 45 196 45",
    "M12 45H196",
    "M12 63C80 63 120 45 196 45",
    "M12 80C80 80 110 45 196 45",
  ];
  const ref = useSvgMotion((tl, q) => {
    q("[data-m=pulse]").forEach((el, i) => {
      tl.fromTo(
        el,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: "none" },
        i * 0.35,
      )
        .to(el, { motionPath: { path: paths[i] ?? "" }, duration: 1.6, ease: "power1.inOut" }, i * 0.35)
        .to(el, { opacity: 0, duration: 0.2 }, i * 0.35 + 1.45);
    });
    tl.fromTo(q("[data-m=kit]"), { scale: 1, transformOrigin: "center" }, { scale: 1.12, duration: 0.25, yoyo: true, repeat: 5, repeatDelay: 0.1 }, 1.5);
  });
  return (
    <svg ref={ref} {...svgProps} viewBox="0 0 220 90" className={className}>
      <g className="stroke-line-control" strokeWidth={1}>
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {[10, 27, 45, 63, 80].map((y) => (
        <circle key={y} cx={10} cy={y} r={3.5} className="fill-carbon stroke-fg-2" strokeWidth={1.5} />
      ))}
      <rect data-m="kit" x={194} y={34} width={22} height={22} className="fill-carbon stroke-lime" strokeWidth={1.5} />
      <path d="M200 45h10M205 40v10" className="stroke-lime" strokeWidth={1.5} />
      {paths.map((d) => (
        <rect key={d} data-m="pulse" x={-3} y={-3} width={6} height={6} className="fill-lime" opacity={0} />
      ))}
    </svg>
  );
}

/** Publishing: files leave a repository and are packed into a ZIP, by GitHub, on demand. */
export function RepoToZip({ className }: ArtProps) {
  const lane = "M74 45H186";
  const ref = useSvgMotion((tl, q) => {
    q("[data-m=file]").forEach((el, i) => {
      tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "none" }, i * 0.45)
        .to(el, { motionPath: { path: lane }, duration: 1.1, ease: "power1.in" }, i * 0.45)
        .to(el, { opacity: 0, duration: 0.1 }, i * 0.45 + 1.05);
    });
    tl.fromTo(q("[data-m=fill]"), { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 1.6, ease: "steps(3)" }, 1.1)
      .fromTo(q("[data-m=zip]"), { y: 0 }, { y: 4, duration: 0.18, yoyo: true, repeat: 1 }, 2.8)
      .to(q("[data-m=fill]"), { opacity: 0, duration: 0.4 }, 3.4)
      .set(q("[data-m=fill]"), { opacity: 1, scaleY: 0 });
  });
  return (
    <svg ref={ref} {...svgProps} viewBox="0 0 260 90" className={className}>
      <rect x={10} y={18} width={62} height={54} className="stroke-fg-2" strokeWidth={1.5} />
      <path d="M10 30h62" className="stroke-fg-2" strokeWidth={1.5} />
      <path d="M20 42h34M20 51h42M20 60h26" className="stroke-line-control" strokeWidth={1.5} />
      <circle cx={17} cy={24} r={1.6} className="fill-fg-2" />
      <path d={lane} className="stroke-line" strokeWidth={1} strokeDasharray="3 5" />
      <path d="M180 39l7 6-7 6" className="stroke-line-control" strokeWidth={1.5} />
      <g data-m="zip">
        <rect data-m="fill" x={198} y={24} width={48} height={48} className="fill-lime/25" />
        <rect x={198} y={24} width={48} height={48} className="stroke-lime" strokeWidth={1.5} />
        <path d="M222 24v6m0 4v6m0 4v6" className="stroke-lime" strokeWidth={2} />
        <rect x={218} y={52} width={8} height={10} className="stroke-lime" strokeWidth={1.5} />
      </g>
      {range(3).map((i) => (
        <rect key={i} data-m="file" x={-5} y={-6} width={10} height={12} className="fill-carbon stroke-fg" strokeWidth={1.5} opacity={0} />
      ))}
    </svg>
  );
}

/** Explore: a shuttle carries the weft back and forth through the warp, row by row. */
export function Shuttle({ className }: ArtProps) {
  const ref = useSvgMotion((tl, q) => {
    const rows = q("[data-m=row]");
    const shuttle = q("[data-m=shuttle]");
    tl.set(rows, { strokeDashoffset: 1 }).set(shuttle, { x: 0, y: 0 });
    rows.forEach((row, i) => {
      const leftToRight = i % 2 === 0;
      tl.set(shuttle, { y: i * 16 })
        .fromTo(shuttle, { x: leftToRight ? 0 : 196 }, { x: leftToRight ? 196 : 0, duration: 1, ease: "power2.inOut" })
        .fromTo(row, { strokeDashoffset: leftToRight ? 1 : -1 }, { strokeDashoffset: 0, duration: 1, ease: "power2.inOut" }, "<");
    });
    tl.to(rows, { opacity: 0, duration: 0.5, stagger: 0.08 }, "+=0.6").set(rows, { opacity: 1, strokeDashoffset: 1 });
  });
  return (
    <svg ref={ref} {...svgProps} viewBox="0 0 240 90" className={className}>
      <g className="stroke-line-control" strokeWidth={1}>
        {range(13).map((i) => (
          <path key={i} d={`M${24 + i * 16} 8v74`} />
        ))}
      </g>
      <path d="M12 8h216M12 82h216" className="stroke-fg-2" strokeWidth={1.5} />
      {range(4).map((i) => (
        <path key={i} data-m="row" d={`M22 ${21 + i * 16}h196`} className="stroke-lime" strokeWidth={2} {...drawable} />
      ))}
      <path data-m="shuttle" d="M12 21q10-7 20 0q-10 7-20 0z" className="fill-carbon stroke-fg" strokeWidth={1.5} />
    </svg>
  );
}

/** Setup detail: a kit opens and its files rise out to be read. */
export function KitUnfold({ className }: ArtProps) {
  const ref = useSvgMotion(
    (tl, q) => {
      tl.fromTo(q("[data-m=sheet]"), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.14, ease: "back.out(1.6)" })
        .fromTo(q("[data-m=ink]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4, stagger: 0.07 }, "-=0.2")
        .fromTo(q("[data-m=flap]"), { scaleY: 1, transformOrigin: "50% 100%" }, { scaleY: 0.82, duration: 0.3, yoyo: true, repeat: 1 }, 0)
        .to(q("[data-m=sheet]"), { y: 26, opacity: 0, duration: 0.4, stagger: { each: 0.08, from: "end" }, ease: "power2.in" }, "+=1.8");
    },
    { repeatDelay: 0.5 },
  );
  return (
    <svg ref={ref} {...svgProps} viewBox="0 0 140 100" className={className}>
      {[
        [30, 14],
        [56, 8],
        [82, 16],
      ].map(([x, y], i) => (
        <g key={i} data-m="sheet">
          <rect x={x} y={y} width={30} height={40} className={i === 1 ? "fill-carbon stroke-lime" : "fill-carbon stroke-fg-2"} strokeWidth={1.5} />
          <path data-m="ink" d={`M${(x ?? 0) + 6} ${(y ?? 0) + 10}h18`} className="stroke-line-control" strokeWidth={1.5} {...drawable} />
          <path data-m="ink" d={`M${(x ?? 0) + 6} ${(y ?? 0) + 18}h12`} className="stroke-line-control" strokeWidth={1.5} {...drawable} />
          <path data-m="ink" d={`M${(x ?? 0) + 6} ${(y ?? 0) + 26}h16`} className="stroke-line-control" strokeWidth={1.5} {...drawable} />
        </g>
      ))}
      <path data-m="flap" d="M14 46h40l8 8h64v38H14z" className="fill-carbon stroke-fg" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M26 74h88" className="stroke-line-control" strokeWidth={1.5} strokeDasharray="4 4" />
    </svg>
  );
}

/** Publish: a needle stitches a seam, one stitch per step. */
export function Stitch({ className }: ArtProps) {
  const seam = "M10 62C40 20 70 20 100 46S160 72 190 46S220 24 250 40";
  const ref = useSvgMotion((tl, q) => {
    tl.fromTo(q("[data-m=seam]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 3.2, ease: "none" })
      .fromTo(q("[data-m=needle]"), { opacity: 1 }, { motionPath: { path: seam, autoRotate: true }, duration: 3.2, ease: "none" }, 0)
      .fromTo(q("[data-m=hole]"), { scale: 0, transformOrigin: "center" }, { scale: 1, duration: 0.2, stagger: 0.62, ease: "back.out(4)" }, 0.1)
      .to(q("[data-m=seam]"), { opacity: 0.25, duration: 0.5 }, "+=1")
      .set(q("[data-m=seam]"), { opacity: 1 });
  });
  return (
    <svg ref={ref} {...svgProps} viewBox="0 0 260 84" className={className}>
      <path d={seam} className="stroke-line" strokeWidth={1} />
      <path data-m="seam" d={seam} className="stroke-lime" strokeWidth={2} strokeLinecap="round" {...drawable} />
      {[
        [10, 62],
        [70, 24],
        [130, 62],
        [190, 46],
        [250, 40],
      ].map(([x, y]) => (
        <circle key={x} data-m="hole" cx={x} cy={y} r={3} className="fill-carbon stroke-fg-2" strokeWidth={1.5} />
      ))}
      <g data-m="needle">
        <path d="M0 0h26" className="stroke-fg" strokeWidth={2} strokeLinecap="round" />
        <circle cx={3} cy={0} r={1.2} className="fill-carbon" />
      </g>
    </svg>
  );
}

/** Sign in: a single thread loops through a latch. No key, no password. */
export function Latch({ className }: ArtProps) {
  const orbit = "M60 18a42 42 0 1 1 0 84a42 42 0 1 1 0-84";
  const ref = useSvgMotion((tl, q) => {
    tl.fromTo(q("[data-m=loop]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, ease: "power1.inOut" })
      .fromTo(q("[data-m=bead]"), { opacity: 1 }, { motionPath: { path: orbit }, duration: 2.2, ease: "power1.inOut" }, 0)
      .fromTo(q("[data-m=bar]"), { x: -10 }, { x: 0, duration: 0.35, ease: "back.out(3)" }, 2.1)
      .fromTo(q("[data-m=ok]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.35 }, 2.35)
      .to(q("[data-m=loop], [data-m=ok]"), { strokeDashoffset: -1, duration: 0.9, ease: "power1.in" }, "+=1.6");
  });
  return (
    <svg ref={ref} {...svgProps} viewBox="0 0 120 120" className={className}>
      <path d={orbit} className="stroke-line" strokeWidth={1} />
      <path data-m="loop" d={orbit} className="stroke-lime" strokeWidth={2} {...drawable} />
      <rect x={42} y={46} width={36} height={30} className="fill-carbon stroke-fg" strokeWidth={1.5} />
      <path data-m="bar" d="M32 61h20" className="stroke-fg" strokeWidth={3} />
      <path data-m="ok" d="M53 61l5 5 9-10" className="stroke-lime" strokeWidth={2} {...drawable} />
      <rect data-m="bead" x={-4} y={-4} width={8} height={8} className="fill-lime" />
    </svg>
  );
}

/** Account: thread winds onto your spool, one turn per setup. */
export function Spool({ className }: ArtProps) {
  const ref = useSvgMotion((tl, q) => {
    tl.fromTo(q("[data-m=turn]"), { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.3, stagger: 0.16, ease: "power2.out" })
      .fromTo(q("[data-m=tail]"), { strokeDashoffset: 0 }, { strokeDashoffset: -1, duration: 1.4, ease: "none" }, 0)
      .to(q("[data-m=turn]"), { scaleX: 0, transformOrigin: "100% 50%", duration: 0.25, stagger: { each: 0.08, from: "end" }, ease: "power2.in" }, "+=1.4");
  });
  return (
    <svg ref={ref} {...svgProps} viewBox="0 0 120 100" className={className}>
      <path data-m="tail" d="M4 20c20 0 26 14 36 14" className="stroke-lime" strokeWidth={1.5} pathLength={1} strokeDasharray="0.5 0.5" />
      <path d="M32 16h56M32 84h56" className="stroke-fg" strokeWidth={3} strokeLinecap="round" />
      <path d="M44 16v68M76 16v68" className="stroke-fg-2" strokeWidth={1.5} />
      {range(8).map((i) => (
        <path key={i} data-m="turn" d={`M40 ${26 + i * 7}h40`} className={i % 3 === 0 ? "stroke-lime" : "stroke-line-control"} strokeWidth={3} />
      ))}
    </svg>
  );
}

/** Empty states: a threaded loom with one weft waiting to be thrown. */
export function EmptyLoom({ className }: ArtProps) {
  const ref = useSvgMotion((tl, q) => {
    tl.fromTo(q("[data-m=weft]"), { y: 0 }, { y: 30, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: 1 }).fromTo(
      q("[data-m=warp]"),
      { scaleY: 1, transformOrigin: "50% 0%" },
      { scaleY: 0.96, duration: 0.7, stagger: { each: 0.05, yoyo: true, repeat: 1 }, ease: "sine.inOut" },
      0,
    );
  });
  return (
    <svg ref={ref} {...svgProps} viewBox="0 0 140 84" className={className}>
      <rect x={6} y={6} width={128} height={72} className="stroke-fg-2" strokeWidth={1.5} />
      {range(9).map((i) => (
        <path key={i} data-m="warp" d={`M${22 + i * 12} 6v72`} className="stroke-line-control" strokeWidth={1} />
      ))}
      <path data-m="weft" d="M6 26h128" className="stroke-lime" strokeWidth={2} strokeDasharray="6 6" />
    </svg>
  );
}

/**
 * Agents: a loom harness with one heddle per agent. Alternate heddles lift to open a shed,
 * a lime shuttle passes through, and the sets swap — every agent takes the same thread.
 */
export function Harness({ className }: ArtProps) {
  const ref = useSvgMotion(
    (tl, q) => {
      const odd = q("[data-m=odd]");
      const even = q("[data-m=even]");
      const shuttle = q("[data-m=shuttle]");
      const picks = q("[data-m=pick]");
      const pass = (from: number, to: number, pick: SVGElement | undefined, at: string) => {
        tl.fromTo(shuttle, { x: from, opacity: 1 }, { x: to, duration: 1.1, ease: "power2.inOut" }, at);
        if (pick) tl.fromTo(pick, { strokeDashoffset: from < to ? 1 : -1, opacity: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, "<");
      };
      tl.set(picks, { opacity: 0 }).set(shuttle, { opacity: 0 });
      tl.to(odd, { y: -11, duration: 0.45, stagger: 0.03 }).to(even, { y: 11, duration: 0.45, stagger: 0.03 }, "<");
      pass(-34, 250, picks[0], ">");
      tl.to(odd, { y: 11, duration: 0.5, stagger: 0.03 }, ">0.15").to(even, { y: -11, duration: 0.5, stagger: 0.03 }, "<");
      pass(250, -34, picks[1], ">");
      tl.to([...odd, ...even], { y: 0, duration: 0.5 }, ">0.15").to(picks, { opacity: 0, duration: 0.6 }, ">1");
    },
    { repeatDelay: 0.4 },
  );
  return (
    <svg ref={ref} {...svgProps} viewBox="0 0 250 120" className={className}>
      <path d="M8 12h234M8 108h234" className="stroke-fg-2" strokeWidth={1.5} />
      <path data-m="pick" d="M14 54h222" className="stroke-lime" strokeWidth={2} {...drawable} />
      <path data-m="pick" d="M14 66h222" className="stroke-lime" strokeWidth={2} {...drawable} />
      {range(9).map((i) => {
        const x = 29 + i * 24;
        return (
          <g key={i} data-m={i % 2 === 0 ? "odd" : "even"}>
            <path d={`M${x} 12v96`} className="stroke-line-control" strokeWidth={1} />
            <rect x={x - 3.5} y={55} width={7} height={10} rx={1} className={i === 4 ? "fill-carbon stroke-lime" : "fill-carbon stroke-fg-2"} strokeWidth={1.5} />
          </g>
        );
      })}
      <path data-m="shuttle" d="M0 60q17-9 34 0q-17 9-34 0z" className="fill-carbon stroke-lime" strokeWidth={1.5} opacity={0} />
    </svg>
  );
}
