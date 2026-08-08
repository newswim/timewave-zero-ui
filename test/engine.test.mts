/**
 * engine.test.mts — proves the recapitulated wave engine is faithful.
 *
 * 1. Wave fidelity: f(x) for all four number sets against CSV output of
 *    Peter Meyer's original C program (test/oracle/*, compiled locally).
 * 2. Structural properties: f(0) = 0, exact 64× self-similarity in ideal
 *    mode, and the bounded truncation artifact of Meyer's sub-day loop.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeWave, type Wave } from "../src/timewave.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const { sets } = JSON.parse(readFileSync(join(root, "data/numbersets.json"), "utf8")) as
  { sets: Record<string, number[]> };

const names = ["kelley", "watkins", "sheliak", "huangti"] as const;
type SetName = (typeof names)[number];
const waves: Record<SetName, Wave> = Object.fromEntries(
  names.map((n) => [n, makeWave(sets[n]!)]),
) as Record<SetName, Wave>;

describe("number sets", () => {
  it.each(names)("%s has exactly 384 values", (name) => {
    expect(sets[name]).toHaveLength(384);
  });

  it.each(names)("%s begins 0,0,0 (convergence/eschaton condition)", (name) => {
    expect(sets[name]!.slice(0, 3)).toEqual([0, 0, 0]);
  });
});

describe("wave fidelity vs Meyer's C oracle", () => {
  // CSVs: header row, then 5 columns "Days to Zero, Kelley, Watkins, Sheliak, Huang Ti".
  // The C program prints 16 decimals (absolute), so references carry
  // ±5e-17 print noise; allow 1e-9 relative or a 5e-13 absolute floor.
  const tolerance = (ref: number): number => Math.max(1e-9 * Math.abs(ref), 5e-13);

  const parse = (file: string): number[][] =>
    readFileSync(join(root, "test/oracle", file), "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[\d.]/.test(l))
      .map((l) => l.split(",").map(Number).filter((x) => !Number.isNaN(x)));

  const files = ["last67y.csv", "final2d.csv", "deeptime.csv"] as const;

  describe.each(files)("%s", (file) => {
    const rows = parse(file);

    it("has 5-column rows", () => {
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(row).toHaveLength(5);
    });

    it.each(names.map((n, s) => [n, s + 1] as const))(
      "%s matches every row within tolerance",
      (name, col) => {
        let worst = 0;
        let worstX = NaN;
        for (const row of rows) {
          const [x] = row;
          const ref = row[col]!;
          const err = Math.abs(waves[name](x!) - ref) / tolerance(ref);
          if (err > worst) { worst = err; worstX = x!; }
        }
        // worst is the error as a fraction of tolerance; <= 1 everywhere
        expect(worst, `worst at x=${worstX}: ${(worst * 100).toFixed(4)}% of tolerance`)
          .toBeLessThanOrEqual(1);
      },
    );
  });
});

describe("structural properties", () => {
  it.each(names)("%s: f(0) = 0", (name) => {
    expect(waves[name](0)).toBe(0);
  });

  it.each(names)("%s: f(x) is NaN for x < 0 (wave undefined past zero)", (name) => {
    expect(waves[name](-1)).toBeNaN();
    expect(waves[name](-1e-9)).toBeNaN();
  });

  it("v is cyclic mod 384 and interpolates linearly", () => {
    const w = waves.kelley;
    const data = sets.kelley!;
    expect(w.v(384)).toBe(data[0]);
    expect(w.v(3)).toBe(data[3]);
    expect(w.v(3.5)).toBeCloseTo((data[3]! + data[4]!) / 2, 12);
  });

  it("rejects data sets that are not length 384", () => {
    expect(() => makeWave([0, 0, 0])).toThrow(/384/);
  });

  // Deterministic sample points on a log scale, 1 .. ~4.8e8 days
  // (mulberry32 PRNG with a fixed seed — no Math.random).
  const samplePoints = (n: number, seed: number): number[] => {
    let a = seed >>> 0;
    const next = (): number => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return Array.from({ length: n }, () => Math.exp(next() * 20) + 1);
  };
  const xs = samplePoints(500, 0xc0ffee);

  // In the ideal doubly-infinite series, f(64x) = 64·f(x) exactly. Meyer's
  // implementation truncates the sub-day series at the first term that fails
  // to grow the sum — including exact-zero terms — which perturbs the
  // identity at up to the ~1e-2 level. Both facts are asserted: the faithful
  // port carries the truncation artifact; "ideal" mode restores exactness.
  it("ideal mode: exact self-similarity f(64x) = 64·f(x)", () => {
    const ideal = makeWave(sets.kelley!, 64, { subDay: "ideal" });
    let worst = 0;
    for (const x of xs) {
      worst = Math.max(worst, Math.abs(ideal(64 * x) - 64 * ideal(x)) / (64 * ideal(x)));
    }
    expect(worst).toBeLessThan(1e-10);
  });

  it("meyer mode: truncation artifact stays bounded (< 5%)", () => {
    const f = waves.kelley;
    let worst = 0;
    for (const x of xs) {
      worst = Math.max(worst, Math.abs(f(64 * x) - 64 * f(x)) / (64 * f(x)));
    }
    expect(worst).toBeLessThan(0.05);
  });
});
