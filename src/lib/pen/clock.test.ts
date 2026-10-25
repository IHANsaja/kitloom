import { describe, expect, it } from "vitest";

import { clockLabel, mixHex, normalizeMinutes, phaseOf, skyFor } from "@/lib/pen/clock";

describe("pen clock", () => {
  it("wraps minutes into one day", () => {
    expect(normalizeMinutes(-30)).toBe(1410);
    expect(normalizeMinutes(1440)).toBe(0);
    expect(normalizeMinutes(1500.5)).toBe(60.5);
  });

  it("labels the time of day in 24-hour form", () => {
    expect(clockLabel(0)).toBe("00:00");
    expect(clockLabel(7 * 60 + 5)).toBe("07:05");
    expect(clockLabel(23 * 60 + 59)).toBe("23:59");
    expect(clockLabel(1440 + 65)).toBe("01:05");
  });

  it("names the phases of the day from the shared clock", () => {
    expect(phaseOf(2 * 60)).toBe("night");
    expect(phaseOf(6.5 * 60)).toBe("dawn");
    expect(phaseOf(12 * 60)).toBe("day");
    expect(phaseOf(18 * 60)).toBe("dusk");
    expect(phaseOf(21 * 60)).toBe("night");
  });

  it("interpolates the sky between keyframes", () => {
    const night = skyFor(0);
    const noon = skyFor(12.5 * 60);
    expect(night.night).toBe(1);
    expect(night.ambientAlpha).toBeGreaterThan(0.3);
    expect(noon.night).toBe(0);
    expect(noon.ambientAlpha).toBeLessThan(0.05);
    expect(skyFor(1440).top).toBe(night.top);
    expect(skyFor(7.8 * 60).sun).not.toBe(night.sun);
  });

  it("reads the clock in minutes, not hours", () => {
    const morning = skyFor(7 * 60 + 44);
    expect(morning.night).toBeLessThan(0.1);
    expect(morning.top).not.toBe(skyFor(0).top);
    expect(phaseOf(7 * 60 + 44)).toBe("dawn");
  });

  it("mixes hex colours without leaving gamut", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#000000", "#ffffff", -4)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 9)).toBe("#ffffff");
    expect(mixHex("#d9ff72", "#111318", 0.5)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
