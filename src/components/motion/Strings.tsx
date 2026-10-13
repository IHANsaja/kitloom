"use client";

import { useEffect, useRef } from "react";

import { mountStrings, type StringsOptions } from "@/components/motion/stringEngine";
import { cx } from "@/components/ui/styles";

/**
 * Everything drawn with the string engine (rules: design.md §7.2 and "Page margins").
 * All of it is decorative, silent, and still under reduced motion.
 */

const stringClass = "stroke-line transition-[stroke] duration-300 ease-kit [&.is-live]:stroke-lime [&.is-live]:duration-75";

interface StringFieldProps extends StringsOptions {
  count: number;
  className?: string;
  /** Stroke class for strings at rest, when `stroke-line` is too faint for the context. */
  restClass?: string;
}

function StringField({ count, className, restClass, ...options }: StringFieldProps) {
  const ref = useRef<SVGSVGElement>(null);
  const { pointer, reach, push, broken, liveAt } = options;
  const intervalMs = options.auto?.intervalMs;
  const strength = options.auto?.strength;
  const order = options.auto?.order;

  useEffect(() => {
    if (!ref.current) return;
    const auto = intervalMs !== undefined && strength !== undefined && order !== undefined ? { intervalMs, strength, order } : undefined;
    return mountStrings(ref.current, { pointer, reach, push, broken, liveAt, auto });
  }, [pointer, reach, push, broken, liveAt, intervalMs, strength, order]);

  return (
    <svg ref={ref} aria-hidden="true" focusable="false" fill="none" width="100%" height="100%" className={className}>
      {Array.from({ length: count }, (_, index) => (
        <path
          key={index}
          data-string
          strokeWidth={index % 3 === 1 ? 1.5 : 1}
          strokeLinecap="round"
          className={index === broken ? "stroke-lime" : cx(stringClass, restClass)}
        />
      ))}
      {broken !== undefined ? <path data-tail strokeWidth={1.5} strokeLinecap="round" className="stroke-lime" /> : null}
      {pointer ? <rect data-knot width={6} height={6} className="fill-lime opacity-0 transition-opacity duration-200" /> : null}
    </svg>
  );
}

/**
 * The margins outside the page frame on wide screens, strung like a loom and playable:
 * strings bow away from the cursor, are plucked when it sweeps across them, and pass some
 * of the movement to their neighbours. Hidden below 1520px.
 */
export function Gutters() {
  return (
    <>
      {(["left-0", "right-0"] as const).map((side) => (
        <div
          key={side}
          aria-hidden="true"
          className={cx("pointer-events-none fixed top-14 bottom-0 -z-10 hidden w-[calc((100vw-1360px)/2)] min-[1520px]:block", side)}
        >
          <StringField count={9} pointer className="[mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]" />
        </div>
      ))}
    </>
  );
}

/** Loading indicator: a wave of plucks running along a short row of strings. */
export function StringLoader({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx("inline-block h-[18px] w-[34px] shrink-0", className)}>
      <StringField count={5} restClass="stroke-line-control" liveAt={0.5} auto={{ intervalMs: 150, strength: 2.6, order: "sequence" }} />
    </span>
  );
}

/** A status line with the loader, for anything fetched from the database. */
export function LoadingLine({ children, className }: { children: string; className?: string }) {
  return (
    <p role="status" className={cx("flex items-center gap-3 font-mono text-xs text-fg-2", className)}>
      <StringLoader />
      {children}
    </p>
  );
}

/**
 * Not found: the thread you were following has snapped. One string hangs in two loose
 * halves and sways; the rest still ring now and then, and all of them can be played.
 */
export function SnappedStrings({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cx("h-[220px] w-[300px] max-w-full shrink-0 overflow-hidden border-y border-line", className)}>
      <StringField
        count={9}
        broken={4}
        pointer
        reach={60}
        push={20}
        restClass="stroke-line-control"
        auto={{ intervalMs: 1300, strength: 11, order: "random" }}
      />
    </div>
  );
}
