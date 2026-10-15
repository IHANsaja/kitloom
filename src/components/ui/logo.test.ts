import { describe, expect, it } from "vitest";

import { MARK, MARK_GRID } from "@/components/ui/logo";

describe("Kitloom mark", () => {
  it("starts with the full lime tile so everything else draws on top of it", () => {
    expect(MARK[0]).toMatchObject({ el: "rect", tone: "tile", attrs: { width: MARK_GRID, height: MARK_GRID } });
    expect(MARK.slice(1).some((shape) => shape.tone === "tile")).toBe(false);
  });

  it("keeps every circle inside the tile", () => {
    for (const { el, attrs } of MARK) {
      if (el !== "circle") continue;
      const [cx, cy, r] = [Number(attrs.cx), Number(attrs.cy), Number(attrs.r)];
      expect(cx - r).toBeGreaterThanOrEqual(0);
      expect(cy - r).toBeGreaterThanOrEqual(0);
      expect(cx + r).toBeLessThanOrEqual(MARK_GRID);
      expect(cy + r).toBeLessThanOrEqual(MARK_GRID);
    }
  });

  it("strokes only paths, and only with a positive width", () => {
    for (const shape of MARK) {
      if (shape.stroke === undefined) continue;
      expect(shape.el).toBe("path");
      expect(shape.stroke).toBeGreaterThan(0);
    }
  });
});
