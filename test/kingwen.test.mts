/**
 * kingwen.test.mts — the King Wen sequence data McKenna's derivation rests on.
 *
 * 1. Structure: 64 distinct hexagrams, the pair rule (each even hexagram is
 *    its predecessor rotated 180°, or line-complemented when palindromic),
 *    and McKenna's observed first-order-of-difference properties.
 * 2. Independence: data/kingwen.json binaries match an independently sourced
 *    transcription (test/fixtures/kingwen-independent.json) entry-by-entry.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { firstOrderDifferences } from "../src/timewave.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

interface Hexagram { kw: number; lines: number[]; binary: string }
const { hexagrams } = JSON.parse(readFileSync(join(root, "data/kingwen.json"), "utf8")) as
  { hexagrams: Hexagram[] };

const rev = (l: readonly number[]): number[] => [...l].reverse();
const comp = (l: readonly number[]): number[] => l.map((b) => 1 - b);
const eq = (a: readonly number[], b: readonly number[]): boolean => a.join() === b.join();

describe("King Wen structure", () => {
  it("has 64 hexagrams, kw numbered 1..64 in order", () => {
    expect(hexagrams).toHaveLength(64);
    expect(hexagrams.map((h) => h.kw)).toEqual(
      Array.from({ length: 64 }, (_, i) => i + 1),
    );
  });

  it("64 distinct hexagrams", () => {
    expect(new Set(hexagrams.map((h) => h.binary)).size).toBe(64);
  });

  it("binary is lines joined bottom-to-top, six lines of 0/1", () => {
    for (const h of hexagrams) {
      expect(h.lines).toHaveLength(6);
      expect(h.lines.every((b) => b === 0 || b === 1)).toBe(true);
      expect(h.binary).toBe(h.lines.join(""));
    }
  });

  it("exactly 8 palindromic hexagrams: 1,2,27,28,29,30,61,62", () => {
    const palindromes = hexagrams.filter((h) => eq(h.lines, rev(h.lines))).map((h) => h.kw);
    expect(palindromes).toEqual([1, 2, 27, 28, 29, 30, 61, 62]);
  });

  it.each(Array.from({ length: 32 }, (_, p) => [2 * p + 1, 2 * p + 2] as const))(
    "pair rule for %i/%i (invert, or complement if palindromic)",
    (kwA, kwB) => {
      const a = hexagrams[kwA - 1]!.lines;
      const b = hexagrams[kwB - 1]!.lines;
      const expected = eq(a, rev(a)) ? comp(a) : rev(a);
      expect(b).toEqual(expected);
    },
  );
});

describe("first order of difference (McKenna's starting point)", () => {
  const fod = firstOrderDifferences(hexagrams);
  const count = (n: number): number => fod.filter((d) => d === n).length;

  it("matches the sequence verified against Meyer/Watkins 1996 C code", () => {
    expect(fod).toEqual([
      6, 2, 4, 4, 4, 3, 2, 4, 2, 4, 6, 2, 2, 4, 2, 2,
      6, 3, 4, 3, 2, 2, 2, 3, 4, 2, 6, 2, 6, 3, 2, 3,
      4, 4, 4, 2, 4, 6, 4, 3, 2, 4, 2, 3, 4, 3, 2, 3,
      4, 4, 4, 1, 6, 2, 2, 3, 4, 3, 2, 1, 6, 3, 6, 3,
    ]);
  });

  it("48 even / 16 odd (3:1 ratio)", () => {
    expect(fod.filter((d) => d % 2 === 0)).toHaveLength(48);
    expect(fod.filter((d) => d % 2 === 1)).toHaveLength(16);
  });

  it("fourteen 3s and two 1s", () => {
    expect(count(3)).toBe(14);
    expect(count(1)).toBe(2);
  });

  it("no fives, no zeroes", () => {
    expect(count(5)).toBe(0);
    expect(count(0)).toBe(0);
  });
});

describe("independent cross-check (test/fixtures/kingwen-independent.json)", () => {
  interface IndepHexagram { kw: number; binary: string }
  const indep = JSON.parse(
    readFileSync(join(root, "test/fixtures/kingwen-independent.json"), "utf8"),
  ) as { hexagrams: IndepHexagram[] };

  it("covers all 64 hexagrams", () => {
    expect(indep.hexagrams).toHaveLength(64);
  });

  it.each(hexagrams.map((h) => [h.kw] as const))(
    "kw %i binary matches the independent source",
    (kw) => {
      const ours = hexagrams[kw - 1]!;
      const theirs = indep.hexagrams[kw - 1]!;
      expect(theirs.kw).toBe(kw);
      expect(ours.binary).toBe(theirs.binary);
    },
  );
});
