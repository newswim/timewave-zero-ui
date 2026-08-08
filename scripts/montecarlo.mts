/**
 * Monte Carlo replication of McKenna's rarity claim for the King Wen sequence.
 *
 * In "Where Did the Timewave Come From?" (reference/mckenna-derivation-waveexplain.txt)
 * McKenna reports generating 27,000+ random hexagram sequences -- "all sequences having
 * the property possessed by the King Wen sequence that every second hexagram is either
 * the inverse or the complement of its predecessor" -- and finding only ~1 in 3770 with
 * all three properties:
 *   (a) a 3:1 even:odd ratio of first-order differences (48 even / 16 odd),
 *   (b) no transitions of value five,
 *   (c) "closure": the FOD graph, superimposed on its own 180-degree rotation, closes
 *       at four adjacent points at the conventional beginning/end of the sequence.
 *
 * ---------------------------------------------------------------------------
 * SAMPLING SPACE (documented decisions)
 * ---------------------------------------------------------------------------
 * "Inverse" = the hexagram turned upside down (line order reversed); "complement" =
 * every line flipped. The constraint applies within pairs (positions 1-2, 3-4, ...).
 *
 * MODEL A (primary, "KW-pairs permutation"): the 32 canonical King Wen pairs
 * (partner = reverse of the first hexagram; when the hexagram is palindromic --
 * reverse = itself -- the partner is its complement). A random sequence is a uniform
 * random permutation of these 32 pairs, with each pair's internal order flipped
 * independently with p = 0.5. Space size: 32! * 2^32. This is the natural reading of
 * "randomly arranged sequences obeying the King Wen pairing rule".
 *
 * MODEL B (secondary, "free pairing"): McKenna's stated rule ("either the inverse OR
 * the complement") does not force the canonical pair partition. Under the two
 * commuting involutions R (reverse) and C (complement) the 64 hexagrams fall into
 * orbits: 8 palindromic hexagrams (R = id, partner forced to C), 8 antipalindromic
 * hexagrams (R = C, partner forced), and 12 orbits of size 4 {A, R(A), C(A), RC(A)}
 * each admitting exactly two valid pairings ({A-R(A), C(A)-RC(A)} or
 * {A-C(A), R(A)-RC(A)}; A-RC(A) is neither inverse nor complement). So there are
 * 2^12 = 4096 valid pair partitions, the King Wen partition being one of them.
 * Model B picks each free orbit's pairing with p = 0.5, then permutes and flips as in
 * Model A. Space size: 2^12 * 32! * 2^32.
 *
 * ---------------------------------------------------------------------------
 * CRITERIA (documented operationalizations)
 * ---------------------------------------------------------------------------
 * FOD is cyclic: fod[i] = hamming(h[i], h[(i+1) mod 64]), i = 0..63 (transition
 * t = i+1 runs hexagram t -> t+1; transition 64 wraps to hexagram 1). Sanity-checked
 * against the Meyer/Watkins-verified King Wen FOD hardcoded below.
 *
 * (a) EXACT: 48 even, 16 odd. (Within-pair transitions are always even -- reversal
 *     changes lines in symmetric pairs, complementation changes all six -- so this is
 *     equivalent to exactly 16 of the 32 between-pair transitions being odd.)
 * (b) EXACT: no fod value equals 5.
 * (c) CLOSURE: operationalized per Sheliak's 1998 formalization of McKenna's
 *     Figures 2-3 (reference/sheliak-1998-decoded.txt, Definition 3 and Eq. 9-10,
 *     OCR digits corrected): the reverse wave is the forward FOD graph rotated 180
 *     degrees in the plane and slid to fit -- rev(t) = K - fod(63 - t), where the
 *     x-alignment (opposite transitions sum to 63, i.e. opposite hexagram POSITIONS
 *     sum to 64, exactly McKenna's "positions summed equal sixty-four") is fixed by
 *     the structure and the vertical offset K is the free fitting parameter of the
 *     superimposition. "Closure at four adjacent points" = forward and reverse waves
 *     coincide at the four cyclically-adjacent boundary transitions {62, 63, 64, 1}.
 *     Since closure at t implies closure at 63-t, this reduces to two sum conditions:
 *         fod[1] + fod[62] = K   and   fod[63] + fod[64] = K      (1-indexed)
 *     PRIMARY test (free K, faithful to McKenna's visual "fitted against it to
 *     achieve closure"):  fod[1]+fod[62] == fod[63]+fod[64].
 *     STRICT variant (canonical K = 9, Sheliak's fitted value for King Wen):
 *     both sums equal 9.
 *     The King Wen sequence passes both (sums are 9 and 9); it also has two
 *     incidental interior touches (transitions 17/46), which are wave crossings, not
 *     endpoint closure, and are not disqualifying (King Wen itself has them).
 *
 * PRNG: mulberry32, SEED below -- fully reproducible.
 * Run: node scripts/montecarlo.mts   (~1M trials per model, well under 2 minutes)
 *
 * NOTE: scripts/ is outside tsconfig's include (src, test) by design; this file is
 * kept clean under the same strict options but is not part of `npx tsc` scope.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = 0x5eed1975; // fixed for reproducibility (1975: year of the original set)
const TRIALS_PER_MODEL = 1_000_000;

// Meyer/Watkins-verified King Wen cyclic FOD (transition i+1 = fod[i]; last wraps 64->1)
const KNOWN_KW_FOD = [
  6, 2, 4, 4, 4, 3, 2, 4, 2, 4, 6, 2, 2, 4, 2, 2, 6, 3, 4, 3, 2, 2, 2, 3, 4, 2, 6, 2, 6, 3, 2, 3,
  4, 4, 4, 2, 4, 6, 4, 3, 2, 4, 2, 3, 4, 3, 2, 3, 4, 4, 4, 1, 6, 2, 2, 3, 4, 3, 2, 1, 6, 3, 6, 3,
];

// ---------------------------------------------------------------------------
// Hexagram codes and involutions (6-bit ints; bit i = lines[i], lines[0] = bottom)
// ---------------------------------------------------------------------------

interface Hexagram {
  kw: number;
  lines: number[];
}

const kingwen = JSON.parse(
  readFileSync(join(ROOT, "data", "kingwen.json"), "utf8"),
) as { hexagrams: Hexagram[] };

const kwCodes: number[] = kingwen.hexagrams.map((h) =>
  h.lines.reduce((acc, bit, i) => acc | (bit << i), 0),
);
if (kwCodes.length !== 64) throw new Error("expected 64 hexagrams");

function reverse6(x: number): number {
  let r = 0;
  for (let i = 0; i < 6; i++) if (x & (1 << i)) r |= 1 << (5 - i);
  return r;
}
const complement6 = (x: number): number => x ^ 0b111111;

const POPCOUNT: number[] = Array.from({ length: 64 }, (_, x) => {
  let n = 0;
  for (let i = 0; i < 6; i++) if (x & (1 << i)) n++;
  return n;
});

// ---------------------------------------------------------------------------
// Canonical King Wen pairs (Model A) -- verify the pairing rule while building
// ---------------------------------------------------------------------------

const kwPairs: [number, number][] = [];
for (let p = 0; p < 32; p++) {
  const a = kwCodes[2 * p];
  const b = kwCodes[2 * p + 1];
  if (a === undefined || b === undefined) throw new Error("bad pair index");
  const ok = b === reverse6(a) || b === complement6(a);
  if (!ok) throw new Error(`KW pair ${p + 1} violates inverse-or-complement rule`);
  kwPairs.push([a, b]);
}

// ---------------------------------------------------------------------------
// Orbit decomposition for Model B
// ---------------------------------------------------------------------------

const forcedPairs: [number, number][] = [];
const freeOrbits: { m1: [number, number][]; m2: [number, number][] }[] = [];
{
  const seen = new Set<number>();
  for (const a of kwCodes) {
    if (seen.has(a)) continue;
    const r = reverse6(a);
    const c = complement6(a);
    const rc = reverse6(c);
    const orbit = new Set([a, r, c, rc]);
    for (const x of orbit) seen.add(x);
    if (orbit.size === 2) {
      // palindromic (r === a, partner c) or antipalindromic (r === c)
      forcedPairs.push([a, r === a ? c : r]);
    } else if (orbit.size === 4) {
      freeOrbits.push({
        m1: [[a, r], [c, rc]], // pair by inversion
        m2: [[a, c], [r, rc]], // pair by complementation
      });
    } else {
      throw new Error(`unexpected orbit size ${orbit.size}`);
    }
  }
  if (forcedPairs.length !== 8 || freeOrbits.length !== 12) {
    throw new Error(
      `orbit decomposition: expected 8 forced pairs + 12 free orbits, got ${forcedPairs.length} + ${freeOrbits.length}`,
    );
  }
}

// ---------------------------------------------------------------------------
// PRNG (mulberry32) and helpers
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Criteria on a 64-element cyclic FOD array
// ---------------------------------------------------------------------------

function fodOf(seq: number[], out: number[]): number[] {
  for (let i = 0; i < 64; i++) {
    const a = seq[i]!;
    const b = seq[(i + 1) & 63]!;
    out[i] = POPCOUNT[a ^ b]!;
  }
  return out;
}

interface CritResult {
  ratio31: boolean; // (a) 48 even / 16 odd
  noFives: boolean; // (b) no value-5 transitions
  closureFreeK: boolean; // (c) primary: four-point closure, fitted K
  closureK9: boolean; //     strict: four-point closure at canonical K = 9
}

function criteria(fod: number[]): CritResult {
  let odd = 0;
  let fives = 0;
  for (let i = 0; i < 64; i++) {
    const v = fod[i]!;
    odd += v & 1;
    if (v === 5) fives++;
  }
  const s1 = fod[0]! + fod[61]!; // transitions 1 + 62
  const s2 = fod[62]! + fod[63]!; // transitions 63 + 64
  return {
    ratio31: odd === 16,
    noFives: fives === 0,
    closureFreeK: s1 === s2,
    closureK9: s1 === 9 && s2 === 9,
  };
}

// ---------------------------------------------------------------------------
// Sanity check: the real King Wen sequence must pass everything
// ---------------------------------------------------------------------------

{
  const fod = fodOf(kwCodes, new Array<number>(64));
  for (let i = 0; i < 64; i++) {
    if (fod[i] !== KNOWN_KW_FOD[i]) {
      throw new Error(`FOD mismatch at transition ${i + 1}: ${fod[i]} != ${KNOWN_KW_FOD[i]}`);
    }
  }
  const c = criteria(fod);
  if (!(c.ratio31 && c.noFives && c.closureFreeK && c.closureK9)) {
    throw new Error(`King Wen sequence fails its own criteria: ${JSON.stringify(c)}`);
  }
  console.log("[sanity] King Wen FOD matches Meyer/Watkins values; passes (a), (b), (c) [free-K and K=9]");
}

// ---------------------------------------------------------------------------
// Monte Carlo
// ---------------------------------------------------------------------------

interface Tally {
  ratio31: number;
  noFives: number;
  closureFreeK: number;
  closureK9: number;
  jointFreeK: number; // a & b & c(free K)  -- primary headline number
  jointK9: number; // a & b & c(K = 9)
}

function runModel(name: string, trials: number, rand: () => number, freePairing: boolean): Tally {
  const t: Tally = { ratio31: 0, noFives: 0, closureFreeK: 0, closureK9: 0, jointFreeK: 0, jointK9: 0 };
  const pairs: [number, number][] = new Array(32);
  const seq = new Array<number>(64);
  const fod = new Array<number>(64);
  const t0 = performance.now();

  for (let trial = 0; trial < trials; trial++) {
    // assemble the 32 pairs
    let n = 0;
    if (freePairing) {
      for (const fp of forcedPairs) pairs[n++] = fp;
      for (const orb of freeOrbits) {
        const m = rand() < 0.5 ? orb.m1 : orb.m2;
        pairs[n++] = m[0]!;
        pairs[n++] = m[1]!;
      }
    } else {
      for (const p of kwPairs) pairs[n++] = p;
    }
    // Fisher-Yates shuffle of pair order
    for (let i = 31; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = pairs[i]!;
      pairs[i] = pairs[j]!;
      pairs[j] = tmp;
    }
    // lay out sequence, flipping each pair's internal order with p = 0.5
    for (let p = 0; p < 32; p++) {
      const pair = pairs[p]!;
      const flip = rand() < 0.5;
      seq[2 * p] = flip ? pair[1] : pair[0];
      seq[2 * p + 1] = flip ? pair[0] : pair[1];
    }

    const c = criteria(fodOf(seq, fod));
    if (c.ratio31) t.ratio31++;
    if (c.noFives) t.noFives++;
    if (c.closureFreeK) t.closureFreeK++;
    if (c.closureK9) t.closureK9++;
    if (c.ratio31 && c.noFives && c.closureFreeK) t.jointFreeK++;
    if (c.ratio31 && c.noFives && c.closureK9) t.jointK9++;
  }

  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  const pct = (k: number) => `${((k / trials) * 100).toFixed(4)}%`;
  const oneIn = (k: number) => (k === 0 ? "n/a (0 hits)" : `1 in ${Math.round(trials / k).toLocaleString("en-US")}`);

  console.log(`\n=== ${name} — ${trials.toLocaleString("en-US")} trials, seed 0x${SEED.toString(16)}, ${secs}s ===`);
  console.log(`  (a) 3:1 even:odd (48/16):        ${t.ratio31.toLocaleString("en-US").padStart(9)}  ${pct(t.ratio31)}  (${oneIn(t.ratio31)})`);
  console.log(`  (b) no fives:                    ${t.noFives.toLocaleString("en-US").padStart(9)}  ${pct(t.noFives)}  (${oneIn(t.noFives)})`);
  console.log(`  (c) closure, free K [primary]:   ${t.closureFreeK.toLocaleString("en-US").padStart(9)}  ${pct(t.closureFreeK)}  (${oneIn(t.closureFreeK)})`);
  console.log(`  (c') closure, K = 9 [strict]:    ${t.closureK9.toLocaleString("en-US").padStart(9)}  ${pct(t.closureK9)}  (${oneIn(t.closureK9)})`);
  console.log(`  JOINT a+b+c (free K):            ${t.jointFreeK.toLocaleString("en-US").padStart(9)}  ${pct(t.jointFreeK)}  (${oneIn(t.jointFreeK)})`);
  console.log(`  JOINT a+b+c' (K = 9):            ${t.jointK9.toLocaleString("en-US").padStart(9)}  ${pct(t.jointK9)}  (${oneIn(t.jointK9)})`);
  return t;
}

const rand = mulberry32(SEED);
const tallyA = runModel("Model A: KW-pairs permutation (primary)", TRIALS_PER_MODEL, rand, false);
const tallyB = runModel("Model B: free inverse-or-complement pairing", TRIALS_PER_MODEL, rand, true);

// ---------------------------------------------------------------------------
// Comparison with McKenna's claim
// ---------------------------------------------------------------------------

console.log(`\n=== Comparison with McKenna's claim ===`);
console.log(`  McKenna: 4 hits in 27,000+ trials => "1 in 3770" (i.e. rate ~ ${(1 / 3770 * 100).toFixed(4)}%)`);
for (const [label, t] of [["Model A", tallyA], ["Model B", tallyB]] as const) {
  const rFree = t.jointFreeK / TRIALS_PER_MODEL;
  const rK9 = t.jointK9 / TRIALS_PER_MODEL;
  const fmt = (r: number) => (r === 0 ? "no hits" : `1 in ${Math.round(1 / r).toLocaleString("en-US")}`);
  console.log(`  ${label}: joint free-K ${fmt(rFree)}; joint K=9 ${fmt(rK9)}`);
}
console.log(
  `\n  Note: with only 4 hits McKenna's own estimate carries huge sampling error\n` +
    `  (95% CI on 4/27000 spans roughly 1-in-2600 to 1-in-25000), so agreement within\n` +
    `  a small factor is the most that can be expected; his exact closure test and\n` +
    `  sampling procedure were never published.`,
);
