"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { WeaveField } from "@/components/motion/Ambient";
import type { SceneHandle, SceneName } from "@/components/motion/tsl/scenes";
import { cx } from "@/components/ui/styles";

interface TslSceneProps {
  name: SceneName;
  /** Must establish positioning (`relative` or `absolute`) and a size. */
  className: string;
  /** The SVG shown until the scene is ready, and for good if it never is. */
  fallback: ReactNode;
}

/**
 * Progressive enhancement from an SVG illustration to a WebGL scene (rules: design.md §7).
 *
 * The SVG is always rendered. three.js is only downloaded when all of these hold: the
 * scene has scrolled into view, the viewport is at least tablet width, motion is welcome,
 * and the visitor has not asked to save data. The scene renders only while on screen and
 * while the tab is visible. If anything fails, the SVG simply stays.
 */
function TslScene({ name, fallback, className }: TslSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    if (!window.matchMedia("(min-width: 768px)").matches || connection?.saveData) return;

    let disposed = false;
    let loading = false;
    let onScreen = false;
    let handle: SceneHandle | null = null;
    const sync = () => handle?.setRunning(onScreen && !document.hidden);

    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
        sync();
        if (!onScreen || handle || loading) return;
        loading = true;
        import("@/components/motion/tsl/scenes")
          .then((module) => module.mountScene(name, element))
          .then((mounted) => {
            if (disposed) {
              mounted.dispose();
              return;
            }
            handle = mounted;
            sync();
            setReady(true);
          })
          .catch((error: unknown) => {
            // No WebGL, or the chunk failed to load: the SVG fallback stays in place.
            if (process.env.NODE_ENV !== "production") console.warn(`[kitloom] scene "${name}" fell back to SVG:`, error);
          });
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);

    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      handle?.dispose();
    };
  }, [name]);

  return (
    <div aria-hidden="true" className={className}>
      <div className={cx("absolute inset-0 transition-opacity duration-700 ease-kit", ready && "opacity-0")}>{fallback}</div>
      <div ref={host} className={cx("absolute inset-0 transition-opacity duration-700 ease-kit", ready ? "opacity-100" : "opacity-0")} />
    </div>
  );
}

/** Home hero backdrop: the SVG loom, upgraded to a rippling woven sheet. */
export function HeroBackdrop() {
  return <TslScene name="loom" className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_right,transparent_18%,black_88%)]" fallback={<WeaveField className="h-full w-full" />} />;
}
