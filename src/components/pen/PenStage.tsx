"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";

import { PenScene } from "@/components/pen/scene/scene";
import { cx } from "@/components/ui/styles";
import { STAGE_H, STAGE_W, cameraFor, fromCamera, unproject, type Camera, type WorldPoint } from "@/lib/pen/iso";
import type { KitChoice, PenApi } from "@/lib/pen/usePenRoom";

interface PenStageProps {
  api: PenApi;
  kit: KitChoice;
  feedMode: boolean;
  reducedMotion: boolean;
  onFed: () => void;
  className?: string;
}

/**
 * The canvas is decorative to assistive tech: every action it offers (walking aside) has a
 * real button below. Clicking the pasture is an enhancement for pointer users.
 */
export function PenStage({ api, kit, feedMode, reducedMotion, onFed, className }: PenStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera>({ scale: 1, ox: 0, oy: 0 });
  const hoverRef = useRef<WorldPoint | null>(null);
  const feedRef = useRef(feedMode);
  const motionRef = useRef(reducedMotion);

  useEffect(() => {
    feedRef.current = feedMode;
  }, [feedMode]);

  useEffect(() => {
    motionRef.current = reducedMotion;
  }, [reducedMotion]);

  const loopRef = api.loop;
  const { pet, moveTo, feed, takeEffects } = api;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new PenScene(canvas);
    let camera = cameraFor(canvas.getBoundingClientRect().width || STAGE_W);
    cameraRef.current = camera;
    const measure = () => {
      camera = cameraFor(canvas.getBoundingClientRect().width || STAGE_W);
      cameraRef.current = camera;
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(canvas);

    let onScreen = true;
    const visible = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true;
    });
    visible.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(120, Math.max(0, now - last));
      last = now;
      if (document.hidden || !onScreen) return;
      const loop = loopRef.current;
      if (!loop) return;
      for (const effect of takeEffects()) scene.throwKit(effect.from, effect.to, now);
      scene.render({
        snapshot: loop.snapshot,
        local: loop.local,
        remote: loop.remote,
        peers: loop.peers,
        localId: loop.localId,
        camera,
        hover: hoverRef.current,
        feedMode: feedRef.current,
        now,
        dt,
        reducedMotion: motionRef.current,
      });
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      visible.disconnect();
    };
    // The room hook owns this ref for the life of the page; re-running the effect would
    // reset the scene's particles and smoothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takeEffects]);

  const worldAt = useCallback((event: PointerEvent<HTMLCanvasElement>): WorldPoint => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const sx = ((event.clientX - rect.left) / rect.width) * STAGE_W;
    const sy = ((event.clientY - rect.top) / rect.height) * STAGE_H;
    const stage = fromCamera(cameraRef.current, sx, sy);
    return unproject(stage.sx, stage.sy);
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType !== "mouse") return;
      const world = worldAt(event);
      const inGrid = world.x >= 0 && world.y >= 0 && world.x < 18 && world.y < 18;
      hoverRef.current = inGrid ? world : null;
    },
    [worldAt],
  );

  const onPointerLeave = useCallback(() => {
    hoverRef.current = null;
  }, []);

  const onClick = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const world = worldAt(event);
      if (world.x < 0 || world.y < 0 || world.x >= 18 || world.y >= 18) return;
      const purl = loopRef.current?.snapshot.purl;
      if (purl && Math.hypot(purl.x - world.x, purl.y - world.y) <= 0.85) {
        pet();
        return;
      }
      if (feedRef.current) {
        feed(kit, world);
        onFed();
        return;
      }
      moveTo(world);
    },
    [feed, kit, loopRef, moveTo, onFed, pet, worldAt],
  );

  return (
    <div className={cx("relative overflow-hidden border border-line bg-carbon", className)}>
      <canvas
        ref={canvasRef}
        width={STAGE_W}
        height={STAGE_H}
        onClick={onClick}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className={cx(
          "block w-full [image-rendering:pixelated] touch-manipulation select-none",
          feedMode ? "cursor-crosshair" : "cursor-pointer",
        )}
        style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
        aria-hidden="true"
      />
      <p
        className={cx(
          "pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-carbon/85 to-transparent px-3 pt-8 pb-2 font-mono text-[0.6875rem] text-fg-2",
          "max-sm:pb-1.5",
        )}
      >
        <span>{feedMode ? "Choose a spot in the pasture to toss the kit." : "Click the pasture to walk. Click Purl to pet."}</span>
        <span className="hidden text-fg-3 sm:inline">{feedMode ? "Esc to cancel" : "Everyone here is real"}</span>
      </p>
    </div>
  );
}
