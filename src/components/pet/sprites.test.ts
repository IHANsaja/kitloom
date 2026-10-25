import { describe, expect, it } from "vitest";

import { COLS, composePose, EAR_NAMES, EFFECTS, FACE_NAMES, LEG_NAMES, PIXEL_CLASS, ROWS, toRuns } from "@/components/pet/sprites";

const KNOWN = new Set([".", ...Object.keys(PIXEL_CLASS)]);

describe("Purl sprites", () => {
  it("composes every pose to a full grid of known pixels", () => {
    const problems: string[] = [];
    for (const face of FACE_NAMES)
      for (const ears of EAR_NAMES)
        for (const legs of LEG_NAMES)
          for (const puff of [false, true])
            for (const lying of [false, true]) {
              const rows = composePose({ face, ears, legs, puff, lying });
              const valid = rows.length === ROWS && rows.every((row) => row.length === COLS && [...row].every((pixel) => KNOWN.has(pixel)));
              if (!valid) problems.push(`${face}/${ears}/${legs}/${puff}/${lying}`);
            }
    expect(problems).toEqual([]);
  });

  it("gives every expression its own face", () => {
    const faces = FACE_NAMES.map((face) => composePose({ face, ears: "down", legs: "stand", puff: false, lying: false }).join("\n"));
    expect(new Set(faces).size).toBe(FACE_NAMES.length);
  });

  it("keeps lime to the scarf and cheeks", () => {
    const rows = composePose({ face: "open", ears: "down", legs: "stand", puff: false, lying: false });
    const lime = rows.join("").split("").filter((pixel) => pixel === "S" || pixel === "B").length;
    expect(lime).toBeLessThan(20);
  });

  it("merges runs without losing pixels", () => {
    const rows = composePose({ face: "happy", ears: "wiggle", legs: "stepA", puff: false, lying: false });
    const painted = rows.join("").split("").filter((pixel) => pixel !== ".").length;
    expect(toRuns(rows).reduce((sum, run) => sum + run.width, 0)).toBe(painted);
  });

  it("draws effects from known pixels on rectangular grids", () => {
    for (const rows of Object.values(EFFECTS)) {
      for (const row of rows) {
        expect(row).toHaveLength(rows[0].length);
        for (const pixel of row) expect(KNOWN.has(pixel)).toBe(true);
      }
    }
  });
});
