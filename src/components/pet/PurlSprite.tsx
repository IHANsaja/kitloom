import { memo, type CSSProperties } from "react";

import { cx } from "@/components/ui/styles";
import { composePose, EFFECTS, HEIGHT, PIXEL_CLASS, PX, toRuns, WIDTH, type Pose } from "@/components/pet/sprites";

/** Purl drawn in one pose. Crisp pixels, colours from the theme tokens. Server-safe. */
export function PurlPixels({ pose, className }: { pose: Pose; className?: string }) {
  const runs = toRuns(composePose(pose));
  return (
    <svg
      viewBox={`0 0 ${WIDTH / PX} ${HEIGHT / PX}`}
      width={WIDTH}
      height={HEIGHT}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={cx("block", className)}
    >
      {runs.map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.width} height={1} className={PIXEL_CLASS[run.code]} />
      ))}
    </svg>
  );
}

/** The same drawing, memoised for the animated pets that re-render often. */
export const PurlSprite = memo(PurlPixels);

/** One of Purl's little effects (heart, Z, alarm mark, sweat drop) as pixels. */
export function PixelEffect({
  name,
  size = PX,
  className,
  style,
}: {
  name: keyof typeof EFFECTS;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const rows = EFFECTS[name];
  const runs = toRuns([...rows]);
  const width = rows[0].length;
  return (
    <svg
      viewBox={`0 0 ${width} ${rows.length}`}
      width={width * size}
      height={rows.length * size}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={cx("block", className)}
      style={style}
    >
      {runs.map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.width} height={1} className={PIXEL_CLASS[run.code]} />
      ))}
    </svg>
  );
}
