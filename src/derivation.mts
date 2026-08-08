/**
 * derivation.mts — derive the 384-value timewave number sets FROM the
 * King Wen hexagram sequence, instead of treating them as opaque tables.
 *
 * Sources:
 *  - Matthew Watkins, "Autopsy for a Mathematical Hallucination?"
 *    (fourmilab.ch/rpkp/autopsy.html): the closed formula for the 384
 *    data points (in Maple notation), plus the verbatim TimeExplorer
 *    manual footnote (p.79 n.22) defining the "half twist":
 *    "For 1 <= j <= 32: angle_lin[j] = -angle_lin[j]".
 *  - Ian Bell, "McKenna's TimeWave Examined": independent statement of
 *    the same formula, and of the equivalence between the half twist and
 *    the three alternating-sign factors ("The powers of -1 in this
 *    expression stem from ... the (notorious) half twist").
 *  - Peter Meyer's C transcription of Watkins' formula
 *    (reference/original-c/datapoints-watkins.c, 1996). NOTE: as shipped
 *    that file has two defects — a comma-operator typo that makes the 6×
 *    divergence term dead code (line ~106; clang warns "expression result
 *    unused"), and it retains the twist sign factors despite its
 *    "without the half-twist" comment. Compiled as-is it reproduces NONE
 *    of the four historical data sets. See deriveWatkins options.
 *  - John Sheliak, "A Mathematical and Philosophical Re-Examination of
 *    the Foundations of TimeWave Zero" (1998;
 *    reference/sheliak-1998-decoded.txt): the vector re-derivation
 *    behind the 1998 "sheliak" set.
 *
 * Every derivation here is validated against Peter Meyer's shipped DATA
 * files (byte-identical to data/numbersets.json):
 *  - deriveWatkins === watkins set, 384/384 exact.
 *  - deriveKelley  === kelley set at 383/384; the sole deviation is
 *    stored index 119 (formula 32, shipped 22) — see KELLEY_DISCREPANCY.
 *  - deriveSheliak === sheliak set at 382/384; deviations at stored
 *    indices 63 and 187 — see SHELIAK_DISCREPANCIES.
 *
 * Index conventions (established empirically, corroborated by Sheliak's
 * reversal remark): formula index k = 0..383 runs in the same direction
 * as the stored data sets (McKenna's "position 383 down to position 0"
 * software order); k = 383 corresponds to Sheliak's x = 1. h is the
 * first order of differences taken cyclically mod 64 with h[0] = h[64]
 * = 3 (the wrap transition hexagram 64 → 1).
 */

import { firstOrderDifferences } from "./timewave.mts";

/**
 * First order of differences of a hexagram sequence: the number of the
 * six lines that change at each transition, cyclically (the step from
 * hexagram 64 back to hexagram 1 is included as the final value).
 *
 * Returned as f[0..63] where f[i] is the transition i+1 → i+2; this is
 * exactly h[1..64] of Meyer/Watkins' 1996 C code (so f[63] = h[64] =
 * h[0] = 3 for the King Wen sequence).
 *
 * @param hexagrams length-64 array in sequence order (King Wen for the
 *   kelley/watkins/sheliak sets); lines[0] is the bottom line, 1 = yang
 */
export function firstOrderDifferencesFromLines(
  hexagrams: readonly { lines: readonly number[] }[],
): number[] {
  return firstOrderDifferences(hexagrams);
}

/** Cyclic accessor over the FOD: h(0) = h(64) = fod[63], h(i) = fod[i-1]. */
function makeH(fod: readonly number[]): (i: number) => number {
  if (fod.length !== 64) {
    throw new Error(`first order of differences must have 64 values, got ${fod.length}`);
  }
  return (i: number): number => {
    const m = ((i % 64) + 64) % 64;
    return m === 0 ? fod[63]! : fod[m - 1]!;
  };
}

/**
 * Meyer's exp_minus_one(trunc(n)): (-1)^|trunc(n)| with C truncation
 * toward zero (Maple trunc == C integer division for these operands).
 */
function altSign(n: number): 1 | -1 {
  return Math.abs(Math.trunc(n)) % 2 === 1 ? -1 : 1;
}

/**
 * The Watkins closed formula, k = 0..383 (all h-indices cyclic mod 64):
 *
 *   w[k] = |a(k)| + |b(k)|
 *   a(k) = s1·L(k) + 3·s3·T(k) + 6·s6·X(k)          — "skew"/"angle" term
 *   b(k) = D(k) + 3·D(k/3) + 6·D(k/6)               — "divergence" term
 *
 * with q3 = trunc(k/3), q6 = trunc(k/6),
 *   L(k) = h(k-1) - h(k-2) + h(-k) - h(1-k)  (T, X: same with q3, q6),
 *   D(q) = 9 - h(-q) - h(q-1),
 * and the twist sign factors
 *   s1 = (-1)^trunc((k-1)/32), s3 = (-1)^trunc((k-3)/96),
 *   s6 = (-1)^trunc((k-6)/192).
 *
 * twist=true keeps all three sign factors → the Kelley (half-twist) set.
 * twist=false replaces them with +1 → the Watkins (no-twist) set.
 * (All-(-1) is observationally identical under the outer |·|; mixed
 * per-level assignments were ruled out numerically — only all-on vs
 * all-off reproduces a historical set. Although the manual's footnote
 * flips only angle_lin, the twist propagates to the tri/hex levels
 * because those arrays are expansions of the already-twisted linear
 * array.)
 *
 * bFull=false reproduces the C comma-operator bug (6× divergence term
 * discarded); that variant matches NO historical set and exists only to
 * document the transcription typo empirically. (The C file as compiled
 * — twist retained AND truncated b — gives 351 diffs vs watkins and 347
 * vs kelley; also no match.)
 */
function watkinsFormula(fod: readonly number[], twist: boolean, bFull: boolean): number[] {
  const h = makeH(fod);
  const w: number[] = [];
  for (let k = 0; k < 384; k++) {
    const q3 = Math.trunc(k / 3);
    const q6 = Math.trunc(k / 6);
    const skew = (q: number): number => h(q - 1) - h(q - 2) + h(-q) - h(1 - q);
    const div = (q: number): number => 9 - h(-q) - h(q - 1);
    const a =
      (twist ? altSign((k - 1) / 32) : 1) * skew(k) +
      3 * (twist ? altSign((k - 3) / 96) : 1) * skew(q3) +
      6 * (twist ? altSign((k - 6) / 192) : 1) * skew(q6);
    const b = div(k) + 3 * div(q3) + (bFull ? 6 * div(q6) : 0);
    w.push(Math.abs(a) + Math.abs(b));
  }
  return w;
}

export interface WatkinsOptions {
  /**
   * "full" (default): the published formula — the divergence term
   * includes the 6·(9 - h(-k/6) - h(k/6-1)) component, as printed by
   * both Watkins and Bell (whose "90 - ..." form requires it, 90 =
   * 9·(1+3+6)). This reproduces the shipped watkins set 384/384.
   *
   * "cCommaBug": the b-term as datapoints-watkins.c actually computes
   * it — the comma operator at line ~106 discards the 6× component.
   * Matches no historical set (untwisted, as here: 347 diffs vs
   * watkins, 352 vs kelley); provided to document that the comma is a
   * transcription typo for '+'.
   */
  bTerm?: "full" | "cCommaBug";
}

/**
 * Derive the Watkins (no-half-twist) number set — numbersets.json
 * "watkins", Meyer's DATA.TW2 — from a first order of differences.
 * The twist sign factors are omitted (all +1); the divergence term is
 * untouched by the twist. Exact: 384/384 against the shipped set.
 */
export function deriveWatkins(
  fod: readonly number[],
  { bTerm = "full" }: WatkinsOptions = {},
): number[] {
  return watkinsFormula(fod, false, bTerm === "full");
}

/**
 * The single point where the twisted Watkins formula deviates from the
 * shipped Kelley data (DATA.TW1 = McKenna's Table 2, byte-identical):
 * stored index 119, formula value 32 (L=-6, T=4, X=-2, b=14: a =
 * (-1)(-6) + 3(-1)(4) + 6(+1)(-2) = -18 → 18+14), shipped value 22.
 * No source acknowledges the deviation; whether 22 is an Apple II-era
 * transcription/computation error propagated into Table 2, or a genuine
 * divergence of the closed formula from the original stepwise
 * procedure, is unresolved.
 */
export const KELLEY_DISCREPANCY = { index: 119, formula: 32, shipped: 22 } as const;

export interface KelleyOptions {
  /**
   * "shipped" (default): patch index 119 to 22, reproducing the
   * historical artifact (DATA.TW1 / McKenna Table 2) bit-for-bit.
   * "formula": emit the closed formula's value (32) unmodified.
   * The patch is only meaningful for the King Wen FOD.
   */
  policy?: "shipped" | "formula";
}

/**
 * Derive the Kelley number set — the original 1975 set WITH the "half
 * twist" (numbersets.json "kelley", Meyer's DATA.TW1, McKenna's Table
 * 2) — from a first order of differences.
 *
 * The half twist is the TimeExplorer manual's one-time sign flip of the
 * first half of the 64-element linear skew array ("The reason for this
 * is not well understood at present"); in closed form it is exactly the
 * presence of the three alternating-sign factors s1, s3, s6 on the skew
 * components (Bell). Verified: 383/384 against the shipped set, the sole
 * exception being KELLEY_DISCREPANCY (handled per `policy`).
 */
export function deriveKelley(
  fod: readonly number[],
  { policy = "shipped" }: KelleyOptions = {},
): number[] {
  const w = watkinsFormula(fod, true, true);
  if (policy === "shipped") w[KELLEY_DISCREPANCY.index] = KELLEY_DISCREPANCY.shipped;
  return w;
}

/**
 * The two points where the faithful Sheliak construction deviates from
 * the shipped sheliak data (DATA.TW3): stored indices 63 and 187
 * (Sheliak-x 321 and 197), construction |0+8+26| = 34 and |2+6+0| = 8,
 * shipped 19 and 2. No tested variant (offset combinations, per-level
 * abs, direct vs reversed order) closes the gap without breaking the
 * other 382 exact matches; whether TW3 as shipped contains two errors or
 * Sheliak's own numerics differed at these points is unresolved (his
 * paper tabulates no values to arbitrate).
 */
export const SHELIAK_DISCREPANCIES = [
  { index: 63, construction: 34, shipped: 19 },
  { index: 187, construction: 8, shipped: 2 },
] as const;

export interface SheliakOptions {
  /**
   * "construction" (default): the faithful output of Sheliak's 1998
   * pipeline (matches the shipped set at 382/384 points).
   * "shipped": additionally patch SHELIAK_DISCREPANCIES to reproduce
   * numbersets.json "sheliak" / DATA.TW3 bit-for-bit. The patch is only
   * meaningful for the King Wen FOD.
   */
  policy?: "construction" | "shipped";
}

/**
 * Derive the Sheliak (1998) number set — numbersets.json "sheliak",
 * Meyer's DATA.TW3 — from a first order of differences, following the
 * construction in Sheliak's paper (reference/sheliak-1998-decoded.txt):
 *
 *  1. Simple forward wave: piecewise-linear f through (i, h(i)),
 *     i = 0..64, h(0) = h(64) = 3, extended 64-periodically.
 *  2. Simple reverse wave via rotate-180°, translate x+64, y+9, and the
 *     "-1 x-shift" shift-register move; net closed form (his eqs
 *     [9]/[10]): r(x) = 9 - f(63 - x).
 *  3. Linear complex wave (eq [43]): lin(x) = r(x) - f(x); at integers
 *     lin(i) = 9 - h(-1-i) - h(i), interpolated piecewise-linearly (the
 *     interpolation is essential — the expansions sample at thirds and
 *     sixths).
 *  4. Trigrammatic expansion (eqs [50]-[59]): tri(x) = 3·lin((x+2)/3).
 *  5. Hexagrammatic expansion (eqs [72]-[61]): hex(x) = 6·lin((x+5)/6).
 *  6. Tri-level complex wave (eqs [64]/[67]): y(x) = lin + tri + hex;
 *     data set (eq [66]) = |y(x)| at integer x = 1..384.
 *  7. Reverse for the TWZ software ("data point 384 becomes data point
 *     1"): stored[i] = |y(384 - i)|.
 *
 * Equivalently Bell's one-liner: L(x) = F(x) + 3F(1+(x-1)/3) +
 * 6F(1+(x-1)/6) with F the interpolation of F(i) = 9 - h(-1-i) - h(i).
 * No half twist appears anywhere in this construction. All values are
 * integers (computed here in exact integer arithmetic, scaled by 6).
 * Verified: 382/384 against the shipped set (see SHELIAK_DISCREPANCIES,
 * handled per `policy`); every tested alternative offset/ordering is
 * drastically worse (≥ 324 diffs), so the pipeline is certainly the
 * intended construction.
 */
export function deriveSheliak(
  fod: readonly number[],
  { policy = "construction" }: SheliakOptions = {},
): number[] {
  const h = makeH(fod);
  /** lin at integers: F(i) = 9 - h(-1-i) - h(i), 64-periodic. */
  const F = (i: number): number => 9 - h(-1 - i) - h(i);
  /**
   * 6·lin(n/6) as an exact integer (lin is piecewise linear with
   * integer knots and 64-periodic, so 6·lin(n/6) has period 384 in n).
   */
  const lin6 = (n: number): number => {
    const m = ((n % 384) + 384) % 384;
    const i = Math.trunc(m / 6);
    const r = m - 6 * i;
    return 6 * F(i) + r * (F(i + 1) - F(i));
  };
  const out: number[] = [];
  for (let i = 0; i < 384; i++) {
    const x = 384 - i; // stored order reverses Sheliak's x (step 7)
    // 6·y(x) = 6·lin(x) + 6·3·lin((x+2)/3) + 6·6·lin((x+5)/6)
    const y6 = lin6(6 * x) + 3 * lin6(2 * x + 4) + 6 * lin6(x + 5);
    if (y6 % 6 !== 0) throw new Error(`non-integer Sheliak wave value at x=${x}`);
    out.push(Math.abs(y6 / 6));
  }
  if (policy === "shipped") {
    for (const d of SHELIAK_DISCREPANCIES) out[d.index] = d.shipped;
  }
  return out;
}
