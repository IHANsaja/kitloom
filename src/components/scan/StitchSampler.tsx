import { cx } from "@/components/ui/styles";
import type { Severity, StageId, Verdict } from "@/lib/scan/types";

/**
 * The scan, sewn as a cross-stitch sampler. Each stitch stands for a slice of the
 * repository's files. A lime needle runs back and forth along the rows, like one thread
 * worked across the cloth, and sews a stitch for every slice that has actually been read.
 * Slices with findings are stitched in the finding's colour. When the scan ends, the needle
 * is parked and a rule is drawn under the sampler in the verdict's colour.
 *
 * Driven entirely by React and CSS: positions come from real progress, and motion is CSS
 * transitions and keyframes (globals.css, "Stitch sampler"). No timeline, no selectors, so
 * nothing can go missing, and the drawing is correct even if animation frames pause.
 */

const COLS = 36;
const ROWS = 6;
const STITCHES = COLS * ROWS;
const WIDTH = 560;
const HEIGHT = 150;
const CELL = 14;
const LEFT = (WIDTH - (COLS - 1) * CELL) / 2;
const TOP = 30;
const ROW_GAP = 16;
const ARM = 4;

const RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

const STITCH_TONE: Record<Severity, string> = {
  critical: "stroke-danger",
  high: "stroke-danger",
  medium: "stroke-warning",
  low: "stroke-info",
  info: "stroke-fg-3",
};

const VERDICT_TONE: Record<Verdict, string> = {
  clear: "bg-success",
  review: "bg-info",
  caution: "bg-warning",
  danger: "bg-danger",
};

/** Stitch k sits on row k / COLS; odd rows run right to left, as one thread would. */
function place(k: number): { x: number; y: number } {
  const row = Math.floor(k / COLS);
  const step = k % COLS;
  const col = row % 2 === 0 ? step : COLS - 1 - step;
  return { x: LEFT + col * CELL, y: TOP + row * ROW_GAP };
}

interface StitchSamplerProps {
  stage: StageId | "done" | "idle";
  /** 0–1 share of the files read so far. */
  progress: number;
  /** Every file path in tree order, so each maps to a stitch. */
  paths: readonly string[];
  flagged: ReadonlyMap<string, Severity>;
  verdict: Verdict | null;
  className?: string;
}

export function StitchSampler({ stage, progress, paths, flagged, verdict, className }: StitchSamplerProps) {
  const running = stage !== "done" && stage !== "idle";
  const share = stage === "done" ? 1 : stage === "read" || stage === "config" || stage === "weigh" ? progress : 0;
  const sewn = Math.min(STITCHES, Math.round(share * STITCHES));

  // Worst severity per stitch.
  const severity: (Severity | null)[] = Array.from({ length: STITCHES }, () => null);
  if (paths.length > 0) {
    paths.forEach((path, index) => {
      const found = flagged.get(path);
      if (!found) return;
      const k = Math.min(STITCHES - 1, Math.floor((index * STITCHES) / paths.length));
      const current = severity[k];
      if (current === null || current === undefined || RANK[found] < RANK[current]) severity[k] = found;
    });
  }

  // The needle waits at the start while the commit and tree are fetched, then follows the stitching.
  const needle = place(Math.min(sewn, STITCHES - 1));
  const thread = Array.from({ length: sewn }, (_, k) => place(k))
    .map(({ x, y }) => `${x},${y}`)
    .join(" ");

  return (
    <div className={cx("relative", className)}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full" aria-hidden="true" focusable="false" fill="none">
        {/* The hoop: a ruled frame with corner pins */}
        <rect x={10} y={10} width={WIDTH - 20} height={HEIGHT - 20} className="stroke-line" />
        {[
          [10, 10],
          [WIDTH - 10, 10],
          [10, HEIGHT - 10],
          [WIDTH - 10, HEIGHT - 10],
        ].map(([x = 0, y = 0]) => (
          <rect key={`${x}-${y}`} x={x - 2.5} y={y - 2.5} width={5} height={5} className="fill-carbon stroke-line-control" />
        ))}

        {/* The thread running back through every stitch sewn so far */}
        {sewn > 1 ? <polyline points={thread} className="stroke-lime" strokeWidth={1} opacity={0.22} strokeLinejoin="round" /> : null}

        {/* Stitches: a dot waiting to be sewn, or a cross whose two legs draw themselves in */}
        {Array.from({ length: STITCHES }, (_, k) => {
          const { x, y } = place(k);
          if (k >= sewn) {
            return <rect key={k} x={x - 1} y={y - 1} width={2} height={2} className="fill-line-control" />;
          }
          const tone = severity[k];
          const leg = {
            className: cx("kl-stitch", tone ? STITCH_TONE[tone] : "stroke-fg-2"),
            strokeWidth: tone ? 1.8 : 1.2,
            strokeLinecap: "square" as const,
            pathLength: 1,
            strokeDasharray: 1,
          };
          // Two legs, sewn one after the other, as a cross-stitch is.
          return (
            <g key={`s${k}`}>
              <path d={`M${x - ARM} ${y + ARM}L${x + ARM} ${y - ARM}`} {...leg} />
              <path d={`M${x - ARM} ${y - ARM}L${x + ARM} ${y + ARM}`} {...leg} style={{ animationDelay: "0.14s" }} />
            </g>
          );
        })}

        {/* The needle: eases to the next stitch, bobs while it works, parks when done */}
        <g className="kl-follow" style={{ transform: `translate(${needle.x}px, ${needle.y}px)`, opacity: running ? 1 : 0 }}>
          <g className={running ? "kl-needle-bob" : undefined}>
            <path d="M0 0L11 -15" className="stroke-lime" strokeWidth={1.6} strokeLinecap="round" />
            <rect x={9.5} y={-19} width={3.5} height={5} transform="rotate(36 11 -16.5)" className="stroke-lime" strokeWidth={1} />
          </g>
        </g>
      </svg>

      {/* Finished: a rule in the verdict's colour is drawn under the sampler */}
      <div className="mx-[1.8%] -mt-px h-0.5 overflow-hidden">
        <div
          className={cx("kl-follow h-full origin-left", verdict ? VERDICT_TONE[verdict] : "bg-lime")}
          style={{ transform: `scaleX(${stage === "done" ? 1 : running ? share : 0})`, opacity: stage === "done" ? 1 : 0.5 }}
        />
      </div>
    </div>
  );
}
