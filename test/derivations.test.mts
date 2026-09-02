import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cyclePath, setStats, DERIVATIONS, SET_ORDER } from "../src/ui/derivations.mts";
import { deriveSeed, firstOrderDifferencesFromLines } from "../src/derivation.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { sets } = JSON.parse(readFileSync(join(root, "data/numbersets.json"), "utf8")) as
  { sets: Record<string, number[]> };
const { hexagrams } = JSON.parse(readFileSync(join(root, "data/kingwen.json"), "utf8")) as
  { hexagrams: { lines: number[] }[] };

describe("cyclePath", () => {
  it("draws index 383 at the left edge and index 0 (the zero) at the right, on the baseline", () => {
    const d = cyclePath(sets.kelley!, 300, 48);
    expect(d.startsWith("M0.0 ")).toBe(true);          // values[383] = 10 sits at x = 0
    expect(d.endsWith("L300.0 47.0")).toBe(true);      // values[0] = 0 → bottom, minus 1px pad
    expect(d.split("L")).toHaveLength(384);            // one M plus 383 L segments
  });

  it("normalizes to the set's own maximum, so every set reaches the top", () => {
    for (const name of ["kelley", "watkins", "sheliak", "huangti"]) {
      const d = cyclePath(sets[name]!, 300, 48);
      expect(d).toContain(" 1.0");                     // max value → y = pad
    }
  });

  it("returns an empty path for degenerate input", () => {
    expect(cyclePath([], 300, 48)).toBe("");
    expect(cyclePath([0, 0, 0], 300, 48)).toBe("");
  });
});

describe("setStats", () => {
  it("matches the figures in docs/research.md", () => {
    const k = sets.kelley!;
    expect(setStats(k, k)).toMatchObject({ min: 0, max: 79, differs: 0 });
    expect(setStats(sets.watkins!, k)).toMatchObject({ max: 84, differs: 202 });
    expect(setStats(sets.sheliak!, k)).toMatchObject({ max: 43, differs: 369 });
    expect(setStats(sets.huangti!, k)).toMatchObject({ max: 82, differs: 376 });
    expect(setStats(k, k).mean).toBeCloseTo(36.4, 1);
  });

  it("the seed spans 0..7 and differs from Kelley almost everywhere", () => {
    const seed = deriveSeed(firstOrderDifferencesFromLines(hexagrams));
    const s = setStats(seed, sets.kelley!);
    expect(s.min).toBe(0);
    expect(s.max).toBe(5);
    expect(s.differs).toBeGreaterThan(300);
  });
});

describe("DERIVATIONS", () => {
  it("covers every set in lineage order, each with the same four recipe steps", () => {
    expect(SET_ORDER).toEqual(["seed", "kelley", "watkins", "sheliak", "huangti"]);
    for (const name of SET_ORDER) {
      const d = DERIVATIONS[name];
      expect(d.steps).toHaveLength(4);
      expect(d.steps.map((s) => s.label.replace(/^.* order$/, "order")))
        .toEqual(["order", "three scales", "skew scores", "half twist"]);
      expect(d.body.length).toBeLessThan(420);
    }
  });

  it("encodes the lineage: only Kelley has the twist, only the seed lacks the nesting, only Huang Ti changes the order", () => {
    const on = (n: keyof typeof DERIVATIONS, i: number): boolean => DERIVATIONS[n].steps[i]!.on;
    expect(SET_ORDER.filter((n) => on(n, 3))).toEqual(["kelley"]);
    expect(SET_ORDER.filter((n) => !on(n, 1))).toEqual(["seed"]);
    expect(SET_ORDER.filter((n) => on(n, 2))).toEqual(["kelley", "watkins", "huangti"]);
    expect(DERIVATIONS.huangti.steps[0]!.label).toBe("Huang Ti order");
  });
});
