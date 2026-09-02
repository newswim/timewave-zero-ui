/**
 * derivation.test.mts — proves the derivation pipeline reproduces the
 * shipped 384-value number sets (data/numbersets.json = Peter Meyer's
 * DATA.TW1-TW3, byte-identical) from the King Wen hexagrams alone.
 *
 * Status of each derivation:
 *  - watkins: EXACT, 384/384 (untwisted Watkins formula, full b-term).
 *  - kelley:  383/384 from the twisted formula; the sole deviation is
 *    stored index 119 (formula 32, shipped 22, unacknowledged by any
 *    source) — the default "shipped" policy patches it, so the exported
 *    deriveKelley reproduces the historical artifact bit-for-bit.
 *  - sheliak: PARTIAL, 382/384 from the faithful 1998 construction;
 *    first divergence at stored index 63 (construction 34, shipped 19),
 *    second at 187 (8 vs 2). The "shipped" policy patches both.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  firstOrderDifferencesFromLines,
  deriveWatkins,
  deriveKelley,
  deriveSheliak,
  deriveSeed,
  KELLEY_DISCREPANCY,
  SHELIAK_DISCREPANCIES,
} from "../src/derivation.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

interface Hexagram { kw: number; lines: number[] }
const { hexagrams } = JSON.parse(readFileSync(join(root, "data/kingwen.json"), "utf8")) as
  { hexagrams: Hexagram[] };
const { sets } = JSON.parse(readFileSync(join(root, "data/numbersets.json"), "utf8")) as
  { sets: Record<"kelley" | "watkins" | "sheliak" | "huangti", number[]> };

/** h[1..64] exactly as hard-coded in reference/original-c/datapoints-watkins.c. */
const C_FOD = [
  6, 2, 4, 4, 4, 3, 2, 4, 2, 4, 6, 2, 2, 4, 2, 2, 6, 3, 4, 3, 2, 2, 2, 3, 4, 2, 6, 2, 6, 3, 2, 3,
  4, 4, 4, 2, 4, 6, 4, 3, 2, 4, 2, 3, 4, 3, 2, 3, 4, 4, 4, 1, 6, 2, 2, 3, 4, 3, 2, 1, 6, 3, 6, 3,
];

const fod = firstOrderDifferencesFromLines(hexagrams);

const diffIndices = (a: readonly number[], b: readonly number[]): number[] =>
  a.map((v, i) => (v === b[i] ? -1 : i)).filter((i) => i >= 0);

describe("firstOrderDifferencesFromLines", () => {
  it("computed from kingwen.json lines, equals the h[] table in the C source", () => {
    expect(fod).toEqual(C_FOD);
  });

  it("wrap transition 64 -> 1 gives h[64] = h[0] = 3", () => {
    expect(fod[63]).toBe(3);
  });
});

describe("deriveWatkins (no half twist)", () => {
  it("reproduces the shipped watkins set exactly, 384/384", () => {
    expect(deriveWatkins(fod)).toEqual(sets.watkins);
  });

  it("bTerm 'cCommaBug' (the C file's comma-operator typo, 6x divergence dead) matches no shipped set", () => {
    const bug = deriveWatkins(fod, { bTerm: "cCommaBug" });
    // Empirical counts documenting that the comma at datapoints-watkins.c
    // line ~106 must be a typo for '+': with the b-term truncated the
    // output reproduces none of the four historical sets.
    expect(diffIndices(bug, sets.watkins)).toHaveLength(347);
    expect(diffIndices(bug, sets.kelley)).toHaveLength(352);
    expect(bug).not.toEqual(sets.sheliak);
    expect(bug).not.toEqual(sets.huangti);
  });
});

describe("deriveKelley (with the half twist)", () => {
  it("reproduces the shipped kelley set exactly, 384/384 (default 'shipped' policy)", () => {
    expect(deriveKelley(fod)).toEqual(sets.kelley);
  });

  it("'formula' policy deviates from the shipped data only at stored index 119 (32 vs 22)", () => {
    const pure = deriveKelley(fod, { policy: "formula" });
    expect(diffIndices(pure, sets.kelley)).toEqual([KELLEY_DISCREPANCY.index]);
    expect(pure[KELLEY_DISCREPANCY.index]).toBe(KELLEY_DISCREPANCY.formula);
    expect(sets.kelley[KELLEY_DISCREPANCY.index]).toBe(KELLEY_DISCREPANCY.shipped);
  });

  it("the twist touches only the skew term: both sets start 0,0,0 and end at 10", () => {
    const kelley = deriveKelley(fod);
    const watkins = deriveWatkins(fod);
    expect(kelley.slice(0, 3)).toEqual([0, 0, 0]);
    expect(watkins.slice(0, 3)).toEqual([0, 0, 0]);
    expect(kelley[383]).toBe(10);
    expect(watkins[383]).toBe(10);
  });
});

describe("deriveSheliak (1998 vector re-derivation)", () => {
  it("faithful construction matches the shipped sheliak set at 382/384 points, diverging exactly at indices 63 and 187", () => {
    const constructed = deriveSheliak(fod);
    expect(diffIndices(constructed, sets.sheliak)).toEqual(
      SHELIAK_DISCREPANCIES.map((d) => d.index),
    );
    for (const d of SHELIAK_DISCREPANCIES) {
      expect(constructed[d.index]).toBe(d.construction);
      expect(sets.sheliak[d.index]).toBe(d.shipped);
    }
  });

  it("'shipped' policy reproduces the shipped sheliak set exactly, 384/384", () => {
    expect(deriveSheliak(fod, { policy: "shipped" })).toEqual(sets.sheliak);
  });

  it("the revised wave is zero at both ends (unlike the standard sets' closing 10)", () => {
    const constructed = deriveSheliak(fod);
    expect(constructed[0]).toBe(0);
    expect(constructed[383]).toBe(0);
  });
});

describe("deriveSeed (McKenna's simple wave: the FOD against its own 180° rotation)", () => {
  const seed = deriveSeed(fod);

  it("has 384 values, all integers in 0..5 for King Wen", () => {
    expect(seed).toHaveLength(384);
    for (const v of seed) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it("equals Sheliak's linear complex wave |r(x) - f(x)| in stored order (an independent formulation)", () => {
    // Sheliak: F(i) = 9 - h(-1-i) - h(i), stored[k] = |F(384 - k)|, h cyclic mod 64.
    const h = (i: number): number => {
      const m = ((i % 64) + 64) % 64;
      return m === 0 ? C_FOD[63]! : C_FOD[m - 1]!;
    };
    const sheliakLinear = Array.from({ length: 384 }, (_, k) => {
      const x = 384 - k;
      return Math.abs(9 - h(-1 - x) - h(x));
    });
    expect(seed).toEqual(sheliakLinear);
  });

  it("begins 0,0,0 like every historical set, so the fractal sum converges the same way", () => {
    expect(seed.slice(0, 3)).toEqual([0, 0, 0]);
  });

  it("is 64-periodic: the simple wave repeats six times across the 384-unit cycle", () => {
    for (let k = 64; k < 384; k++) expect(seed[k]).toBe(seed[k - 64]);
  });

  it("closes at four adjacent points per period (McKenna's Figure 2 claim) and crosses zero at two isolated points besides", () => {
    // Per 64-unit period: the closure run k = 63, 0, 1, 2 where the forward
    // FOD graph and its 180° rotation coincide, plus two isolated crossings
    // at k = 18 and 47 (the curves intersect there without running together).
    const zeros = seed.map((v, k) => (v === 0 ? k : -1)).filter((k) => k >= 0);
    const expected: number[] = [];
    for (let m = 0; m < 6; m++) expected.push(...[0, 1, 2, 18, 47, 63].map((r) => 64 * m + r));
    expect(zeros).toEqual(expected.sort((a, b) => a - b));
    // the closure run is the only place the wave RESTS at zero (>= 2 adjacent zeros)
    const runs = zeros.filter((k) => seed[(k + 1) % 384] === 0);
    expect(runs).toEqual([0, 1, 63, 64, 65, 127, 128, 129, 191, 192, 193, 255, 256, 257, 319, 320, 321, 383]);
  });

  it("is a genuine function of the hexagram data: perturbing one FOD value changes it", () => {
    const perturbed = [...fod];
    perturbed[10] = perturbed[10] === 4 ? 2 : 4;
    expect(deriveSeed(perturbed)).not.toEqual(seed);
  });
});
