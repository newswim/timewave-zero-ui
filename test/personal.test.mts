/** "Your wave" personal-overlay logic: anchor math, persistence, and
 * the epoch-parameterized date formatting it relies on. */
import { describe, it, expect } from "vitest";
import { DAY_MS, ZERO_DATE_MS } from "../src/timewave.mts";
import {
  CYCLE_DAYS, personalZeroMs, epochShiftDays, xForDate, clampSlide,
  serialize, deserialize, type PersonalState,
} from "../src/ui/personal.mts";
import { fmtDateAt, ticks, dateOf } from "../src/ui/format.mts";

const BIRTH = Date.UTC(1985, 5, 15); // 1985-06-15
const base: PersonalState = { birthMs: BIRTH, slideDays: 0, events: [] };

describe("anchor math", () => {
  it("one full cycle is 384·64 days", () => {
    expect(CYCLE_DAYS).toBe(384 * 64);
  });

  it("personal zero = birth + 24,576 days (± slide)", () => {
    expect(personalZeroMs(base)).toBe(BIRTH + 24_576 * DAY_MS);
    expect(personalZeroMs({ ...base, slideDays: -365 })).toBe(BIRTH + 24_211 * DAY_MS);
    // 1985-06-15 + 24,576 days = 2052-09-27
    expect(new Date(personalZeroMs(base)).toISOString().slice(0, 10)).toBe("2052-09-27");
  });

  it("epoch shift converts historical x to personal x", () => {
    const ep = personalZeroMs(base);
    const shift = epochShiftDays(ep);
    // Hiroshima keeps its real date under any epoch:
    const hiroshima = Date.UTC(1945, 7, 6);
    const xStd = (ZERO_DATE_MS - hiroshima) / DAY_MS;
    expect(xStd + shift).toBeCloseTo(xForDate(hiroshima, ep), 9);
  });

  it("birth sits exactly one cycle before the personal zero", () => {
    expect(xForDate(BIRTH, personalZeroMs(base))).toBe(CYCLE_DAYS);
  });

  it("clampSlide bounds and rounds", () => {
    expect(clampSlide(12.6)).toBe(13);
    expect(clampSlide(1e9)).toBe(36_525);
    expect(clampSlide(-1e9)).toBe(-36_525);
  });
});

describe("persistence", () => {
  it("round-trips through serialize/deserialize", () => {
    const s: PersonalState = {
      birthMs: BIRTH,
      slideDays: 42,
      events: [
        { label: "first bicycle", t: Date.UTC(1991, 3, 2) },
        { label: "moved west", t: Date.UTC(2011, 8, 1) },
      ],
    };
    expect(deserialize(serialize(s))).toEqual(s);
  });

  it("rejects garbage and malformed shapes", () => {
    expect(deserialize("not json")).toBeNull();
    expect(deserialize("null")).toBeNull();
    expect(deserialize("[1,2,3]")).toBeNull();
    expect(deserialize('{"slideDays":3}')).toBeNull(); // no birthMs
    expect(deserialize('{"birthMs":"soon"}')).toBeNull();
  });

  it("rejects timestamps outside the representable Date range (would brick isoDate at boot)", () => {
    expect(deserialize(JSON.stringify({ birthMs: 1e18, slideDays: 0, events: [] }))).toBeNull();
    const p = deserialize(JSON.stringify({
      birthMs: BIRTH, slideDays: 0,
      events: [{ label: "fine", t: 0 }, { label: "impossible", t: 9e15 }],
    }));
    expect(p!.events).toEqual([{ label: "fine", t: 0 }]);
  });

  it("round-trips a saved camera view and drops malformed ones", () => {
    const s: PersonalState = { ...base, view: { c: 12_000, s: 26_000 } };
    expect(deserialize(serialize(s))).toEqual(s);
    const bad = deserialize(JSON.stringify({
      birthMs: BIRTH, slideDays: 0, events: [], view: { c: "x", s: -5 },
    }));
    expect(bad).not.toBeNull();
    expect(bad!.view).toBeUndefined();
  });

  it("sanitizes events: drops malformed, trims labels, sorts by date, caps length", () => {
    const parsed = deserialize(JSON.stringify({
      birthMs: BIRTH,
      slideDays: "bad",
      events: [
        { label: "  b  ", t: 200 },
        { label: "a", t: 100 },
        { label: "", t: 300 },          // empty label dropped
        { label: "no date" },            // missing t dropped
        42,                              // non-object dropped
      ],
    }));
    expect(parsed).not.toBeNull();
    expect(parsed!.slideDays).toBe(0);
    expect(parsed!.events).toEqual([{ label: "a", t: 100 }, { label: "b", t: 200 }]);
  });

  it("ignores unknown keys (forward compatibility with the stored 'on' flag)", () => {
    const stored = JSON.stringify({ on: true, v: 1, birthMs: BIRTH, slideDays: 0, events: [] });
    expect(deserialize(stored)).toEqual(base);
  });
});

describe("epoch-parameterized formatting", () => {
  const ep = personalZeroMs(base); // 2052-09-27

  it("defaults to McKenna's zero", () => {
    expect(fmtDateAt(0, 40)).toBe("2012-12-21");
  });

  it("labels x=0 as the personal zero under a personal epoch", () => {
    expect(fmtDateAt(0, 40, ep)).toBe("2052-09-27");
    expect(dateOf(CYCLE_DAYS, ep).toISOString().slice(0, 10)).toBe("1985-06-15");
  });

  it("post-zero dates count days after the personal zero", () => {
    expect(fmtDateAt(-10, 40, ep)).toBe("2052-10-07 · 10 days after zero");
  });

  it("year ticks follow the epoch", () => {
    // a ~40-year window ending at the personal zero
    const t = ticks(15_000, 0, 1200, ep);
    const labels = t.map((k) => k.label);
    expect(labels).toContain("2050");
    expect(labels).not.toContain("2010"); // that year isn't in this window
    // and the same window under the default epoch stays in the 20th century
    const std = ticks(15_000, 0, 1200).map((k) => k.label);
    expect(std).toContain("2010");
  });
});
