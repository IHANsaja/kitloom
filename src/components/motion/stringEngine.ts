/**
 * The string engine: a row of vertical strings, each a damped spring, drawn into an SVG.
 * It powers the playable page margins, the loading indicator and the not-found page, so
 * all three move with the same physics.
 *
 * The SVG must contain one `<path data-string>` per string, and may contain
 * `<path data-tail>` (the lower half of a snapped string) and `<rect data-knot>` (a marker
 * that rides the string nearest the cursor).
 */

const STIFFNESS = 0.085;
const DAMPING = 0.9;
const COUPLING = 0.035; // how much movement leaks to neighbouring strings
const REST = 0.02;

export interface StringsOptions {
  /** React to the cursor: strings bow away from it and are plucked when it crosses them. */
  pointer?: boolean;
  /** How close the cursor must be for a string to bow, and how far it bows, in px. */
  reach?: number;
  push?: number;
  /** Pluck strings on a timer: in order (a travelling wave) or at random. */
  auto?: { intervalMs: number; strength: number; order: "sequence" | "random" };
  /** Index of a string that has snapped: drawn as two loose halves that sway. */
  broken?: number;
  /** Offset in px beyond which a string counts as moving and is drawn lime. */
  liveAt?: number;
}

interface StringState {
  offset: number;
  velocity: number;
  target: number;
  /** Where along its length (0–1) the string is being touched. */
  grip: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Draws the strings and, when motion is welcome, brings them to life. Returns a cleanup. */
export function mountStrings(svg: SVGSVGElement, options: StringsOptions = {}): () => void {
  const { pointer = false, reach = 76, push = 24, auto, broken, liveAt = 1.4 } = options;
  const paths = Array.from(svg.querySelectorAll<SVGPathElement>("[data-string]"));
  const tail = svg.querySelector<SVGPathElement>("[data-tail]");
  const knot = svg.querySelector<SVGRectElement>("[data-knot]");
  const strings: StringState[] = paths.map(() => ({ offset: 0, velocity: 0, target: 0, grip: 0.5 }));
  const count = paths.length;

  let bounds = svg.getBoundingClientRect();
  const xOf = (index: number) => (bounds.width * (index + 1)) / (count + 1);

  const render = () => {
    const height = bounds.height;
    strings.forEach((string, index) => {
      const x = xOf(index);
      const path = paths[index];
      if (!path) return;
      if (index === broken) {
        // A snapped string: the two halves hang from their anchors and swing apart.
        const swing = string.offset * 2.6;
        path.setAttribute("d", `M${x} 0Q${x + swing * 0.4} ${height * 0.22} ${x + swing} ${height * 0.42}`);
        tail?.setAttribute("d", `M${x} ${height}Q${x - swing * 0.4} ${height * 0.8} ${x - swing} ${height * 0.6}`);
        return;
      }
      // An intact string: anchored top and bottom, pulled sideways at the grip point.
      path.setAttribute("d", `M${x} 0Q${x + string.offset * 2} ${string.grip * height} ${x} ${height}`);
      path.classList.toggle("is-live", Math.abs(string.offset) > liveAt);
    });
  };
  render();

  const measure = new ResizeObserver(() => {
    bounds = svg.getBoundingClientRect();
    render();
  });
  measure.observe(svg);

  // Without motion the strings are drawn once and left alone.
  if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return () => measure.disconnect();

  let frame = 0;
  const step = () => {
    let energy = 0;
    strings.forEach((string, index) => {
      const left = strings[index - 1]?.offset ?? 0;
      const right = strings[index + 1]?.offset ?? 0;
      const neighbours = index === broken ? 0 : (left + right - 2 * string.offset) * COUPLING;
      string.velocity += (string.target - string.offset) * STIFFNESS + neighbours;
      string.velocity *= DAMPING;
    });
    for (const string of strings) {
      string.offset += string.velocity;
      energy += Math.abs(string.velocity) + Math.abs(string.target - string.offset);
    }
    render();
    frame = energy > REST ? requestAnimationFrame(step) : 0;
  };
  const wake = () => {
    if (frame === 0) frame = requestAnimationFrame(step);
  };
  const pluck = (index: number, strength: number, grip?: number) => {
    const string = strings[index];
    if (!string) return;
    string.velocity += strength;
    if (grip !== undefined) string.grip = grip;
    wake();
  };

  const cleanups: (() => void)[] = [() => measure.disconnect(), () => frame !== 0 && cancelAnimationFrame(frame)];

  if (auto) {
    let next = 0;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const index = auto.order === "sequence" ? next++ % count : Math.floor(Math.random() * count);
      const direction = auto.order === "sequence" ? 1 : Math.random() < 0.5 ? -1 : 1;
      pluck(index, auto.strength * direction, 0.3 + Math.random() * 0.4);
    }, auto.intervalMs);
    cleanups.push(() => window.clearInterval(timer));
  }

  if (pointer && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let lastX: number | null = null;
    const release = () => {
      for (const string of strings) string.target = 0;
      lastX = null;
      if (knot) knot.style.opacity = "0";
      wake();
    };
    const onMove = (event: PointerEvent) => {
      // Re-measure here: unlike the fixed margins, an in-page panel moves when you scroll.
      bounds = svg.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      if (x < 0 || x > bounds.width || y < 0 || y > bounds.height) {
        if (lastX !== null) release();
        return;
      }
      const grip = clamp(y / bounds.height, 0.06, 0.94);
      let nearest = 0;
      strings.forEach((string, index) => {
        const stringX = xOf(index);
        const gap = stringX - x;
        const distance = Math.abs(gap);
        if (distance < Math.abs(xOf(nearest) - x)) nearest = index;
        if (distance < reach) {
          string.target = Math.sign(gap || 1) * (1 - distance / reach) ** 2 * push;
          string.grip = grip;
        } else {
          string.target = 0;
        }
        // The cursor crossed this string since the last event: pluck it, harder if faster.
        if (lastX !== null && (lastX - stringX) * (x - stringX) < 0) {
          string.velocity += clamp((x - lastX) * 0.9, -24, 24);
          string.grip = grip;
        }
      });
      if (knot && nearest !== broken) {
        knot.style.opacity = "1";
        knot.style.transform = `translate(${xOf(nearest) + (strings[nearest]?.offset ?? 0) - 3}px, ${y - 3}px)`;
      }
      lastX = x;
      wake();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);
    window.addEventListener("blur", release);
    cleanups.push(() => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", release);
      window.removeEventListener("blur", release);
    });
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}
