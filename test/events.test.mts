/** events.test.mts — sanity of the curated event layer. */
import { describe, expect, it } from "vitest";
import { EVENTS } from "../src/ui/events.mts";

describe("EVENTS", () => {
  it("is non-empty and every x is finite", () => {
    expect(EVENTS.length).toBeGreaterThan(0);
    for (const e of EVENTS) expect(Number.isFinite(e.x)).toBe(true);
  });

  it("is sorted descending by x (deep past first)", () => {
    for (let i = 1; i < EVENTS.length; i++) {
      expect(EVENTS[i]!.x).toBeLessThanOrEqual(EVENTS[i - 1]!.x);
    }
  });

  it("tiers are integers in 0..3", () => {
    for (const e of EVENTS) {
      expect(Number.isInteger(e.tier)).toBe(true);
      expect(e.tier).toBeGreaterThanOrEqual(0);
      expect(e.tier).toBeLessThanOrEqual(3);
    }
  });

  it("labels are unique and non-empty", () => {
    const labels = EVENTS.map((e) => e.label);
    expect(labels.every((l) => typeof l === "string" && l.trim().length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("void flag matches sign: v ⟺ x < 0", () => {
    for (const e of EVENTS) {
      expect(e.v === true, `${e.label} (x=${e.x})`).toBe(e.x < 0);
    }
  });

  it("tier-0 anchors are present", () => {
    const tier0 = new Set(EVENTS.filter((e) => e.tier === 0).map((e) => e.label));
    for (const anchor of ["Big Bang", "Hiroshima", "Moon landing", "McKenna dies"]) {
      expect(tier0, `missing tier-0 anchor: ${anchor}`).toContain(anchor);
    }
  });
});
