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
