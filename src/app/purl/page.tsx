import type { Metadata } from "next";

import { PurlPen } from "@/components/pen/PurlPen";
import { PurlSprite } from "@/components/pet/PurlSprite";
import { Band } from "@/components/ui/Frame";

export const metadata: Metadata = {
  title: "Purl’s pen",
  description:
    "A live, shared isometric sheep pen. Visit Purl, pet her, wave, or throw a real Kitloom setup into the pasture and watch her eat the file icon.",
  alternates: { canonical: "/purl" },
};

const NOTES = [
  {
    title: "One shared Purl",
    body: "Her hunger, energy, mood and the weather live on one visitor’s browser and are shared with everyone in the pen. She keeps grazing, napping and getting the zoomies whether or not you touch anything.",
  },
  {
    title: "Real visitors",
    body: "The developers in the pasture are other people on this page. Presence and movement use Supabase Realtime; no account is needed to visit, and no histories are kept.",
  },
  {
    title: "Real kits",
    body: "A thrown kit is any published setup on Kitloom. Purl eats the little file icon, not the download and not the repository the setup belongs to.",
  },
] as const;

export default function PurlPage() {
  return (
    <>
      <Band as="div">
        <div className="cell-x flex items-center justify-between gap-10 py-8 lg:py-10">
          <div>
            <p className="eyebrow text-fg-3">Purl’s pen</p>
            <h1 className="mt-2 max-w-[22ch] text-h1 text-balance">Come and sit in the pasture</h1>
            <p className="mt-3 max-w-[62ch] text-fg-2 text-pretty">
              Purl has a fenced corner of Kitloom, a lean-to, a pond and opinions about lunch. Walk
              over, scratch her wool, or toss in a kit. Other visitors are here at the same time,
              and she remembers what all of you did.
            </p>
          </div>
          <div aria-hidden="true" className="hidden shrink-0 md:block">
            <PurlSprite pose={{ face: "happy", ears: "perk", legs: "stand", puff: false, lying: false }} className="h-auto w-[132px]" />
          </div>
        </div>
      </Band>

      <Band as="div">
        <PurlPen />
      </Band>

      <Band as="div">
        <div className="cell-x grid gap-6 py-8 md:grid-cols-3">
          {NOTES.map((note) => (
            <div key={note.title}>
              <h2 className="text-h2">{note.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-2">{note.body}</p>
            </div>
          ))}
        </div>
        <div className="cell-x border-t border-line-subtle py-4">
          <p className="max-w-[78ch] text-xs leading-relaxed text-fg-3">
            The pen is decorative, but the buttons are not: every action works with a keyboard and
            a screen reader. Motion is reduced automatically when your device asks for it. Names
            are visible to other visitors while you are on this page.
          </p>
        </div>
      </Band>
    </>
  );
}
