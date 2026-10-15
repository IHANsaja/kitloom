"use client";

import { useRef, useState } from "react";

import { cx } from "@/components/ui/styles";
import { PixelEffect } from "@/components/pet/PurlSprite";
import { PurlActor, usePurlActor } from "@/components/pet/usePurlActor";
import { HEIGHT, PX } from "@/components/pet/sprites";

/**
 * About header: Purl's workshop, the whole Kitloom idea as a pixel diorama. Purl fetches
 * yarn from the basket, carries it to the loom, the lime shuttle weaves the cloth row by
 * row, the finished cloth becomes a kit, and Purl files the kit on the shelf (the
 * directory). Three kits fill the shelf; then it is cleared and the work starts again.
 *
 * Drawn in sprite pixels (3px), 140 × 56. With reduced motion it is a still picture.
 */

const COLS = 140;
const ROWS = 56;
const FLOOR = 54; // sprite px: the row Purl stands on
const ROWS_PER_CLOTH = 4;
const SHELF_SLOTS = 3;
const SHUTTLE_MS = 900;

// Where Purl stands, in sprite px (left edge).
const AT_BASKET = 18;
const AT_LOOM = 30;
const AT_SHELF = 86;

type Carry = "none" | "yarn" | "kit";

/** A rectangle of pixels in sprite units. */
function Px({ x, y, w = 1, h = 1, className }: { x: number; y: number; w?: number; h?: number; className: string }) {
  return <rect x={x} y={y} width={w} height={h} className={className} />;
}

/** A small kit folder, 8 × 6 sprite px. */
function Kit({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <Px x={x} y={y} w={4} h={1} className="fill-fg-2" />
      <Px x={x} y={y + 1} w={8} h={5} className="fill-fg-2" />
      <Px x={x + 1} y={y + 2} w={6} h={3} className="fill-carbon" />
      <Px x={x + 2} y={y + 3} w={4} h={1} className="fill-lime" />
    </g>
  );
}

export function PurlWorkshop({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [cloth, setCloth] = useState(2);
  const [kits, setKits] = useState(1);
  const [carry, setCarry] = useState<Carry>("none");
  const [shuttle, setShuttle] = useState<{ pass: number; rightward: boolean } | null>(null);

  const floorY = (FLOOR - HEIGHT / PX + 1) * PX;

  const actor = usePurlActor(
    stageRef,
    async (a) => {
      let rows = 0;
      let shelf = 0;
      let pass = 0;
      setCloth(0);
      setKits(0);
      a.place(AT_BASKET * PX, floorY);

      for (;;) {
        if (a.idleMs > 30_000) {
          a.pose({ face: "sleep", legs: "none", lying: true }, { motion: "none", zzz: true });
          await a.wait(60_000, () => a.idleMs < 1000);
          a.pose({ face: "open", legs: "stand", lying: false }, { zzz: false, bang: true });
          await a.hop(8, 320);
          a.pose({}, { bang: false });
        }

        // Fetch yarn from the basket.
        await a.walkTo(AT_BASKET * PX, floorY, { speed: 60 });
        a.pose({ face: "happy" });
        await a.hop(8, 300);
        setCarry("yarn");
        await a.wait(300);

        // Carry it to the loom.
        await a.walkTo(AT_LOOM * PX, floorY, { speed: 55 });
        setCarry("none");
        a.pose({ face: "lookRight" }, { motion: "bob" });

        // Weave: the shuttle crosses once per row.
        while (rows < ROWS_PER_CLOTH) {
          pass += 1;
          const rightward = pass % 2 === 1;
          setShuttle({ pass, rightward });
          a.pose({ face: rightward ? "lookRight" : "lookLeft" });
          await a.wait(SHUTTLE_MS);
          rows += 1;
          setCloth(rows);
        }
        setShuttle(null);

        // The cloth comes off the loom as a kit.
        a.pose({ face: "happy", ears: "wiggle" }, { motion: "none" });
        await a.hop(12, 380);
        rows = 0;
        setCloth(0);
        setCarry("kit");
        a.pose({ ears: "down" });

        // File it on the shelf.
        await a.walkTo(AT_SHELF * PX, floorY, { speed: 55 });
        setCarry("none");
        shelf += 1;
        setKits(shelf);
        a.pose({ face: "love" }, { motion: "bob" });
        a.hearts(2);
        await a.wait(1400);

        if (shelf >= SHELF_SLOTS) {
          a.pose({ face: "happy" });
          await a.hop(14, 420);
          await a.wait(600);
          shelf = 0;
          setKits(0);
        }
        a.pose({ face: "open" });
      }
    },
    { still: () => ({ x: AT_LOOM * PX, y: floorY }) },
  );

  return (
    <div ref={stageRef} aria-hidden="true" className={cx("relative shrink-0", className)} style={{ width: COLS * PX, height: ROWS * PX }}>
      <svg viewBox={`0 0 ${COLS} ${ROWS}`} width={COLS * PX} height={ROWS * PX} shapeRendering="crispEdges" className="absolute inset-0">
        {/* Floor */}
        <Px x={0} y={FLOOR + 1} w={COLS} h={1} className="fill-line" />

        {/* Basket of yarn */}
        <Px x={4} y={44} w={6} h={5} className="fill-lime" />
        <Px x={9} y={43} w={6} h={6} className="fill-fg-2" />
        <Px x={5} y={45} w={1} h={1} className="fill-carbon" />
        <Px x={11} y={44} w={1} h={1} className="fill-carbon" />
        <Px x={2} y={48} w={15} h={7} className="fill-line-control" />
        {[3, 6, 9, 12, 15].map((x) => (
          <Px key={x} x={x} y={50} w={1} h={4} className="fill-carbon" />
        ))}
        <Px x={2} y={48} w={15} h={1} className="fill-fg-2" />

        {/* Loom: posts, beam, warp, and the cloth woven so far */}
        <Px x={54} y={20} w={2} h={35} className="fill-fg-2" />
        <Px x={82} y={20} w={2} h={35} className="fill-fg-2" />
        <Px x={52} y={20} w={34} h={2} className="fill-fg-2" />
        <Px x={56} y={46} w={26} h={1} className="fill-fg-2" />
        {Array.from({ length: 9 }, (_, index) => 58 + index * 3).map((x) => (
          <Px key={x} x={x} y={22} w={1} h={24} className="fill-line-control" />
        ))}
        {Array.from({ length: cloth }, (_, index) => (
          <Px key={index} x={57} y={44 - index * 2} w={24} h={2} className={index % 2 === 0 ? "fill-fg" : "fill-fg-2"} />
        ))}
        {shuttle ? (
          <rect
            key={shuttle.pass}
            x={0}
            y={43 - cloth * 2}
            width={4}
            height={2}
            className={cx("fill-lime", shuttle.rightward ? "kl-shuttle-right" : "kl-shuttle-left")}
          />
        ) : null}

        {/* Shelf: the directory, with the kits filed so far */}
        <Px x={110} y={41} w={28} h={1} className="fill-fg-2" />
        <Px x={111} y={42} w={1} h={13} className="fill-fg-2" />
        <Px x={136} y={42} w={1} h={13} className="fill-fg-2" />
        <Px x={110} y={52} w={28} h={1} className="fill-line-control" />
        {Array.from({ length: kits }, (_, index) => (
          <Kit key={index} x={112 + index * 8} y={35} />
        ))}
      </svg>

      <PurlActor actor={actor}>
        {carry === "yarn" ? <PixelEffect name="ball" size={PX} className="absolute -top-4 left-[24px]" /> : null}
        {carry === "kit" ? (
          <svg viewBox="0 0 8 6" width={8 * PX} height={6 * PX} shapeRendering="crispEdges" className="absolute -top-5 left-[21px]">
            <Kit x={0} y={0} />
          </svg>
        ) : null}
      </PurlActor>
    </div>
  );
}
