/**
 * validate.mts — proves the recapitulation is faithful.
 *
 * 1. King Wen structure: the pair rule (each even hexagram is its
 *    predecessor rotated 180°, or line-complemented when palindromic),
 *    and McKenna's observed first-order-of-difference properties.
 * 2. Wave fidelity: f(x) for all four number sets against CSV output of
 *    Peter Meyer's original C program (test/oracle/*, compiled locally).
 * 3. Structural properties: f(0) = 0 and exact 64× self-similarity.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { makeWave, firstOrderDifferences, daysBeforeZero, type Wave } from "../src/timewave.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

interface Hexagram { kw: number; lines: number[]; binary: string }
const { hexagrams } = JSON.parse(readFileSync(join(root, "data/kingwen.json"), "utf8")) as
  { hexagrams: Hexagram[] };
const { sets } = JSON.parse(readFileSync(join(root, "data/numbersets.json"), "utf8")) as
  { sets: Record<string, number[]> };

let failures = 0;
const check = (label: string, ok: boolean, detail = ""): void => {
  console.log(`${ok ? "  ok " : "FAIL "} ${label}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

// ---------- 1. King Wen structure ----------
console.log("King Wen sequence (data/kingwen.json):");
const bin = hexagrams.map((h) => h.binary);
check("64 distinct hexagrams", new Set(bin).size === 64);

const rev = (l: readonly number[]) => [...l].reverse();
const comp = (l: readonly number[]) => l.map((b) => 1 - b);
const eq = (a: readonly number[], b: readonly number[]) => a.join() === b.join();
const palindromes = hexagrams.filter((h) => eq(h.lines, rev(h.lines))).map((h) => h.kw);
check(
  "8 palindromic hexagrams: 1,2,27,28,29,30,61,62",
  palindromes.join() === "1,2,27,28,29,30,61,62",
  `got ${palindromes.join()}`
);
let pairRule = true;
for (let k = 0; k < 64; k += 2) {
  const a = hexagrams[k]!.lines, b = hexagrams[k + 1]!.lines;
  const expected = eq(a, rev(a)) ? comp(a) : rev(a);
  if (!eq(b, expected)) { pairRule = false; console.log(`   pair rule broken at ${k + 1}/${k + 2}`); }
}
check("pair rule (invert, or complement if palindromic) for all 32 pairs", pairRule);

const fod = firstOrderDifferences(hexagrams);
const count = (n: number) => fod.filter((d) => d === n).length;
check("FOD: 48 even / 16 odd (3:1)", fod.filter((d) => d % 2 === 0).length === 48,
  `even=${fod.filter((d) => d % 2 === 0).length}`);
check("FOD: fourteen 3s and two 1s", count(3) === 14 && count(1) === 2,
  `threes=${count(3)} ones=${count(1)}`);
check("FOD: no fives, no zeroes", count(5) === 0 && count(0) === 0);
console.log(`   FOD sequence: ${fod.join(",")}`);

// ---------- 2. Wave vs original C program ----------
console.log("\nWave fidelity vs Meyer's C program:");
const names = ["kelley", "watkins", "sheliak", "huangti"] as const;
const waves: Record<string, Wave> =
  Object.fromEntries(names.map((n) => [n, makeWave(sets[n]!)]));
for (const name of names) {
  check(`${name}: begins 0,0,0 (convergence/eschaton condition)`,
    sets[name]![0] === 0 && sets[name]![1] === 0 && sets[name]![2] === 0);
}

for (const file of ["last67y.csv", "final2d.csv", "deeptime.csv"]) {
  const rows = readFileSync(join(root, "test/oracle", file), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[\d.]/.test(l))
    .map((l) => l.split(",").map(Number).filter((x) => !Number.isNaN(x)));
  // The C program prints 16 decimals (absolute), so references carry
  // ±5e-17 print noise; allow 1e-9 relative or a 5e-13 absolute floor.
  let worst = 0;
  for (const [x, ...vals] of rows) {
    names.forEach((name, s) => {
      const mine = waves[name]!(x!);
      const ref = vals[s]!;
      const err = Math.abs(mine - ref) / Math.max(1e-9 * Math.abs(ref), 5e-13);
      worst = Math.max(worst, err);
    });
  }
  check(`${file}: ${rows.length} rows × 4 sets match`, worst < 1,
    `worst err ${(worst * 100).toFixed(4)}% of tolerance`);
}

// ---------- 3. Structural properties ----------
console.log("\nStructural properties:");
check("f(0) = 0 for all sets", names.every((n) => waves[n]!(0) === 0));

// In the ideal doubly-infinite series, f(64x) = 64·f(x) exactly. Meyer's
// implementation truncates the sub-day series at the first term that fails
// to grow the sum — including exact-zero terms — which perturbs the
// identity at up to the ~1e-2 level. Both facts are asserted: the faithful
// port carries the truncation artifact; "ideal" mode restores exactness.
const ideal = makeWave(sets.kelley!, 64, { subDay: "ideal" });
let worstIdeal = 0, worstMeyer = 0;
for (let t = 0; t < 500; t++) {
  const x = Math.exp(Math.random() * 20) + 1; // 1 .. ~4.8e8 days
  worstIdeal = Math.max(worstIdeal,
    Math.abs(ideal(64 * x) - 64 * ideal(x)) / (64 * ideal(x)));
  worstMeyer = Math.max(worstMeyer,
    Math.abs(waves.kelley!(64 * x) - 64 * waves.kelley!(x)) / (64 * waves.kelley!(x)));
}
check("exact self-similarity f(64x) = 64·f(x) in ideal mode", worstIdeal < 1e-10,
  `max rel dev ${worstIdeal.toExponential(2)}`);
check("Meyer-mode truncation artifact stays bounded", worstMeyer < 0.05,
  `max rel dev ${worstMeyer.toExponential(2)}`);

// ---------- 4. Landmark values (for the essay; not assertions) ----------
console.log("\nLandmarks (Kelley set, days before 2012-12-21 06:00 UTC-5):");
const landmarks: [string, number][] = [
  ["Hiroshima bombing", Date.UTC(1945, 7, 6, 8, 15)],
  ["La Chorrera experiment", Date.UTC(1971, 2, 4)],
  ["Moon landing", Date.UTC(1969, 6, 20, 20, 17)],
  ["McKenna's death", Date.UTC(2000, 3, 3)],
  ["Fall of Constantinople", Date.UTC(1453, 4, 29)],
];
for (const [label, t] of landmarks) {
  const x = daysBeforeZero(t);
  console.log(`   ${label.padEnd(24)} x=${x.toFixed(1).padStart(9)}  f=${waves.kelley!(x).toFixed(6)}`);
}

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
