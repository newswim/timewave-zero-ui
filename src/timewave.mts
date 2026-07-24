/**
 * timewave.mts — the Timewave Zero fractal function, ported exactly from
 * Peter Meyer's public-domain C implementation (twz-generator.c, last mod
 * 1998-01-05; via github.com/kl4yfd/timewave_z3r0).
 *
 * The wave value at x days before the zero date is
 *
 *     f(x) = ( Σ_{i≥0, 64^i ≤ x} 64^i · v(x / 64^i)   ← calendar-scale terms
 *            + Σ_{i≥1}           v(x · 64^i) / 64^i ) ← sub-day terms
 *            / 64³                                     ← display calibration
 *
 * where v is linear interpolation over one of the 384-value data sets,
 * taken cyclically (mod 384). Because every data set begins 0,0,0, the
 * upper sum terminates exactly (terms with 64^i > x interpolate inside the
 * flat zero segment), and f(0) = 0: the wave touches zero only at the end.
 * Consequently f(64·x) = 64·f(x) — the wave is exactly self-similar with
 * period ratio 64 ("temporal resonance").
 */

export const DAY_MS = 86_400_000;

/** 2012-12-21 06:00 at La Chorrera, Colombia (UTC-5) — McKenna's zero date. */
export const ZERO_DATE_MS: number = Date.UTC(2012, 11, 21, 11, 0, 0);

/** Days before the zero date for a JS Date or epoch-ms timestamp. */
export function daysBeforeZero(date: Date | number): number {
  const t = date instanceof Date ? date.getTime() : date;
  return (ZERO_DATE_MS - t) / DAY_MS;
}

/** Inverse of daysBeforeZero. */
export function dateAtDaysBeforeZero(x: number): Date {
  return new Date(ZERO_DATE_MS - x * DAY_MS);
}

const N = 384;
const MAX_LEVELS = 64; // powers table size, as in the C original
const MAX_SUBDAY_ITER = 1_000_002; // C's CALC_PREC + 2 safety cap

export interface WaveOptions {
  /**
   * Sub-day series handling. "meyer" (default) reproduces the original C
   * program exactly: the sub-day loop exits at the first term that fails
   * to grow the sum — including exact-zero terms — so the ideal identity
   * f(64x) = 64·f(x) holds only to ~1e-2. "ideal" sums the series far
   * past underflow, restoring exact self-similarity.
   */
  subDay?: "meyer" | "ideal";
}

export interface Wave {
  /** f(x): wave value at x days before the zero date. NaN for x < 0. */
  (x: number): number;
  /** The base waveform: linear interpolation over the data set, cyclic mod 384. */
  v(y: number): number;
}

/**
 * Build a timewave evaluator for a 384-value data set.
 * @param data one of the four number sets (length 384)
 * @param waveFactor scale ratio between nested levels (default 64;
 *   the original software accepted 2–10000)
 */
export function makeWave(
  data: readonly number[],
  waveFactor = 64,
  { subDay = "meyer" }: WaveOptions = {},
): Wave {
  if (!Array.isArray(data) || data.length !== N) {
    throw new Error(`data set must have exactly ${N} values`);
  }
  const powers = new Float64Array(MAX_LEVELS);
  powers[0] = 1;
  for (let i = 1; i < MAX_LEVELS; i++) powers[i] = powers[i - 1]! * waveFactor;

  const v = (y: number): number => {
    const i = Math.trunc(y % N);
    const j = (i + 1) % N;
    const z = y - Math.floor(y);
    return z === 0 ? data[i]! : (data[j]! - data[i]!) * z + data[i]!;
  };

  const f = (x: number): number => {
    if (x < 0) return NaN; // the wave is defined up to the zero date only
    if (x === 0) return 0;
    let sum = 0;

    for (let i = 0; i < MAX_LEVELS && x >= powers[i]!; i++) {
      sum += powers[i]! * v(x / powers[i]!);
    }

    if (subDay === "ideal") {
      for (let i = 1; i < 40; i++) sum += v(x * powers[i]!) / powers[i]!;
    } else {
      let i = 0;
      let last: number;
      do {
        if (++i > MAX_SUBDAY_ITER || i >= MAX_LEVELS) break;
        last = sum;
        sum += v(x * powers[i]!) / powers[i]!;
      } while (sum === 0 || sum > last);
    }

    return sum / powers[3]!; // Meyer: matches the Apple // version's y-axis
  };

  return Object.assign(f, { v });
}

/**
 * First order of difference of a hexagram sequence: how many of the six
 * lines change from each hexagram to the next (cyclically, so the step
 * from the 64th back to the 1st is included). McKenna's starting point.
 * @param hexagrams length-64 array in King Wen order
 * @returns 64 values in 1..6
 */
export function firstOrderDifferences(
  hexagrams: readonly { lines: readonly number[] }[],
): number[] {
  return hexagrams.map((h, k) => {
    const next = hexagrams[(k + 1) % hexagrams.length]!;
    return h.lines.reduce((n, line, m) => n + (line !== next.lines[m] ? 1 : 0), 0);
  });
}
