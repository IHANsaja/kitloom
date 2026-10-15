"use client";

import { useEffect, useRef } from "react";

import { cx } from "@/components/ui/styles";
import { PURL_CHEER } from "@/components/pet/cheer";
import { PixelEffect } from "@/components/pet/PurlSprite";
import { PurlActor, usePurlActor } from "@/components/pet/usePurlActor";
import { HEIGHT, WIDTH } from "@/components/pet/sprites";

/**
 * Account page: Purl beside your spool with a ball of yarn. It says hello with a hop, then
 * chases the ball back and forth, nudging it so it rolls; stops to watch the cursor; naps
 * when left alone; and celebrates (hop, hearts) when you save your profile or password.
 */

const BALL = 18; // px
const NAP_AFTER_MS = 25_000;
const between = (min: number, max: number) => min + Math.random() * (max - min);

export function PurlYarnBall({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLSpanElement>(null);
  const cheers = useRef(0);

  useEffect(() => {
    const onCheer = () => {
      cheers.current += 1;
    };
    window.addEventListener(PURL_CHEER, onCheer);
    return () => window.removeEventListener(PURL_CHEER, onCheer);
  }, []);

  const actor = usePurlActor(
    stageRef,
    async (a) => {
      const ball = ballRef.current;
      if (!ball) return;
      const width = () => a.stage.clientWidth;
      const floor = () => a.stage.clientHeight - HEIGHT;
      // The ball stays where Purl can always reach either side of it.
      const minBall = () => WIDTH + 4;
      const maxBall = () => width() - WIDTH - BALL - 4;
      let ballX = (minBall() + maxBall()) / 2;
      let spin = 0;
      let seen = cheers.current;

      const roll = (to: number) => {
        spin += (to - ballX) * 4;
        ballX = to;
        ball.style.transform = `translateX(${ballX}px) rotate(${spin}deg)`;
      };
      const celebrate = async () => {
        a.pose({ face: "happy", ears: "perk" }, { motion: "none", zzz: false });
        a.hearts(4);
        await a.hop(16, 420);
        await a.hop(10, 340);
        a.pose({ face: "open", ears: "down" }, { motion: "bob" });
      };
      const cheered = () => cheers.current !== seen;

      roll(ballX);
      a.place(4, floor());
      await celebrate(); // hello

      for (;;) {
        if (cheered()) {
          seen = cheers.current;
          await celebrate();
          continue;
        }
        if (a.idleMs > NAP_AFTER_MS) {
          a.pose({ face: "sleep", legs: "none", lying: true }, { motion: "none", zzz: true });
          await a.wait(60_000, () => a.idleMs < 1000 || cheered());
          a.pose({ face: "open", legs: "stand", lying: false }, { zzz: false, bang: true });
          await a.hop(8, 320);
          a.pose({}, { bang: false });
          continue;
        }

        // Chase: go round to the far side of the ball, nudge it towards the open side,
        // watch it roll away.
        const fromLeft = maxBall() - ballX > ballX - minBall();
        const target = fromLeft ? ballX - WIDTH + 6 : ballX + BALL - 6;
        await a.walkTo(Math.max(0, Math.min(width() - WIDTH, target)), floor(), { speed: 55 });
        a.pose({ face: "happy" });
        const push = between(30, 90);
        roll(Math.max(minBall(), Math.min(maxBall(), fromLeft ? ballX + push : ballX - push)));
        await a.hop(6, 260);
        a.pose({ face: fromLeft ? "lookRight" : "lookLeft" }, { motion: "bob" });
        await a.wait(between(1400, 2600), cheered);
        a.pose({ face: "open" });
        await a.wait(between(600, 1800), cheered);
      }
    },
    { still: (stage) => ({ x: 4, y: stage.clientHeight - HEIGHT }) },
  );

  return (
    <div ref={stageRef} aria-hidden="true" className={cx("relative h-[84px] w-[260px] shrink-0", className)}>
      <span
        ref={ballRef}
        className="kl-yarn-ball absolute bottom-0 left-0"
        style={{ width: BALL, transform: `translateX(${(WIDTH + 4 + 260 - WIDTH - BALL - 4) / 2}px)` }}
      >
        <PixelEffect name="ball" size={3} />
      </span>
      <PurlActor actor={actor} />
      <span className="absolute inset-x-0 bottom-0 h-px bg-line" />
    </div>
  );
}
