/** The five number sets as *derivations*: what each one does to McKenna's
 * seed, in the words and order the explorer's context panel shows them.
 * Pure data and pure functions — the panel DOM lives in main.mts. */

export type SetName = "seed" | "kelley" | "watkins" | "sheliak" | "huangti";

/** Lineage order: the seed, then the historical constructions by date. */
export const SET_ORDER: readonly SetName[] = ["seed", "kelley", "watkins", "sheliak", "huangti"];

/** One step of the construction; `on` = this set applies it. */
export interface Step { label: string; on: boolean }

export interface Derivation {
  /** Button / panel name. */
  name: string;
  /** Who, when, and what it is called. */
  era: string;
  /** Two to four plain sentences: what was done to the seed, and why it matters. */
  body: string;
  /** The recipe, as the same four ingredients for every set. */
  steps: Step[];
}

const steps = (order: string, nest: boolean, skew: boolean, twist: boolean): Step[] => [
  { label: order, on: true },
  { label: "three scales", on: nest },
  { label: "skew scores", on: skew },
  { label: "half twist", on: twist },
];

export const DERIVATIONS: Record<SetName, Derivation> = {
  seed: {
    name: "Seed",
    era: "McKenna, c. 1974 · the raw material",
    body:
      "Count how many lines change between each King Wen hexagram and the next, " +
      "then lay that graph over its own 180° rotation. The gap between the two " +
      "curves is the wave. They meet at four adjacent points, so the gap rests at " +
      "zero six times per cycle. Nothing else has been done yet: every other set " +
      "was built from this.",
    steps: steps("King Wen order", false, false, false),
  },
  kelley: {
    name: "Kelley",
    era: "Kelley & Taylor, 1975 · McKenna's Table 2",
    body:
      "The seed nested at three scales (lines ×1, trigrams ×3, hexagram ×6), each " +
      "position scored for skew and for divergence, the two summed. Along the way " +
      "the sign of half the linear values is flipped: the half twist, which the " +
      "manual admits it cannot explain. The set McKenna published and ran for " +
      "twenty years.",
    steps: steps("King Wen order", true, true, true),
  },
  watkins: {
    name: "Watkins",
    era: "Meyer, 1996 · after Watkins' objection",
    body:
      "The Kelley construction with the half twist removed. Watkins compressed the " +
      "whole procedure into one formula and showed that the twist was the step " +
      "that cut the wave loose from the geometry it claimed to encode. McKenna " +
      "endorsed publishing the objection.",
    steps: steps("King Wen order", true, true, false),
  },
  sheliak: {
    name: "Sheliak",
    era: "Sheliak, 1998 · “Timewave One”",
    body:
      "The nesting rebuilt in vector form from the divergence between the seed and " +
      "its rotation alone: no skew scores, no twist. The cycle is zero at both " +
      "ends. McKenna adopted it, saying it fit history better. That three quite " +
      "different curves each “fit” is the point of this exhibit.",
    steps: steps("King Wen order", true, false, false),
  },
  huangti: {
    name: "Huang Ti",
    era: "Meyer, 1990s · a different hexagram order",
    body:
      "The Watkins construction run on an alternative ordering of the 64 hexagrams, " +
      "attributed to Huang Ti, instead of King Wen. The sequence's provenance is " +
      "unresolved, but it is the control: it shows how much of the shape comes from " +
      "the recipe and how much from the sequence it is fed.",
    steps: steps("Huang Ti order", true, true, false),
  },
};

/**
 * SVG path for one 384-value cycle, drawn the way the explorer draws it:
 * index 383 (oldest) at the left, index 0 (the zero) at the right, values
 * normalized to the set's own maximum so shape, not amplitude, is compared.
 * Returns "" for an empty or all-zero set.
 */
export function cyclePath(values: readonly number[], w: number, h: number, pad = 1): string {
  const n = values.length;
  const max = Math.max(0, ...values);
  if (n < 2 || !(max > 0)) return "";
  const innerH = h - 2 * pad;
  const parts: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const x = ((n - 1 - i) / (n - 1)) * w;
    const y = pad + innerH - (values[i]! / max) * innerH;
    parts.push(`${i === n - 1 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join("");
}

export interface SetStats {
  min: number;
  max: number;
  mean: number;
  /** Number of the 384 positions where this set differs from the reference. */
  differs: number;
}

/** Range, mean and point-wise disagreement against a reference set. */
export function setStats(values: readonly number[], ref: readonly number[]): SetStats {
  let min = Infinity, max = -Infinity, sum = 0, differs = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    if (v !== ref[i]) differs++;
  }
  return { min, max, mean: values.length ? sum / values.length : NaN, differs };
}
