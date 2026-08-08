/** format.test.mts — deep-time axis formatting: value labels, cursor
 * readout granularity, and tick generation across every zoom regime. */
import { describe, expect, it } from "vitest";
import { daysBeforeZero } from "../src/timewave.mts";
import { fmtValue, fmtDateAt, siYears, yearLabel, ticks, dateOf, YEAR, type Tick } from "../src/ui/format.mts";

describe("fmtValue", () => {
  it.each([
    [0, "0"],
    [5e-6, "5µ"],
    [0.015, "0.015"],
    [101.4, "101"],
    [9.5e6, "9.5M"],
    [1500, "1.5k"],
    [-2.5, "-2.5"],
    [0.9951, "0.995"],
    [3e-12, "3.00e-12"],
  ] as const)("fmtValue(%s) = %j", (v, expected) => {
    expect(fmtValue(v)).toBe(expected);
  });

  it.each([NaN, Infinity, -Infinity])("non-finite %s renders as em dash", (v) => {
    expect(fmtValue(v)).toBe("—");
  });
});

describe("siYears / yearLabel", () => {
  it.each([
    [13.8e9, "13.8 Gy"],
    [66e6, "66 My"],
    [300e3, "300 ky"],
    [1969, "1,969 y"],
  ] as const)("siYears(%s) = %j", (y, expected) => {
    expect(siYears(y)).toBe(expected);
  });

  it("yearLabel maps astronomical year to BCE convention", () => {
    expect(yearLabel(2012)).toBe("2012");
    expect(yearLabel(1)).toBe("1");
    expect(yearLabel(0)).toBe("1 BCE");
    expect(yearLabel(-999)).toBe("1000 BCE");
  });
});

describe("fmtDateAt granularity regimes", () => {
  const hiroshima = daysBeforeZero(Date.UTC(1945, 7, 6, 8, 15));

  it("deep time by position: years before zero", () => {
    expect(fmtDateAt(13.8e9 * YEAR, 1e6)).toBe("13.8 Gy before zero");
  });

  it("deep time by span: even a recent date renders in years before zero", () => {
    expect(fmtDateAt(1000, 2.1e5 * YEAR)).toBe("3 y before zero");
  });

  it("BCE date renders with the BCE year label", () => {
    const x = daysBeforeZero(Date.UTC(-999, 5, 15)); // astronomical -999 = 1000 BCE
    expect(fmtDateAt(x, 1e5)).toBe("1000 BCE");
  });

  it("post-zero (void) date: full date plus days after zero", () => {
    expect(fmtDateAt(-1, 10)).toBe("2012-12-22 · 1 days after zero");
    expect(fmtDateAt(-100.5, 400)).toBe("2013-03-31 · 100 days after zero");
  });

  it("year regime (span > 3e4 days)", () => {
    expect(fmtDateAt(hiroshima, 5e4)).toBe("1945");
  });

  it("month regime (150 < span <= 3e4)", () => {
    expect(fmtDateAt(hiroshima, 1000)).toBe("Aug 1945");
  });

  it("day regime (3 < span <= 150)", () => {
    expect(fmtDateAt(hiroshima, 30)).toBe("1945-08-06");
  });

  it("minute regime (0.12 < span <= 3)", () => {
    expect(fmtDateAt(hiroshima, 1)).toBe("Aug 6, 08:15 UTC");
  });

  it("second regime (span <= 0.12)", () => {
    expect(fmtDateAt(hiroshima, 0.05)).toBe("Aug 6, 08:15:00 UTC");
  });
});

describe("ticks", () => {
  const labels = (ts: Tick[]): string[] => ts.map((t) => t.label);
  const inWindow = (ts: Tick[], x0: number, x1: number): void => {
    for (const t of ts) {
      expect(t.x).toBeLessThanOrEqual(x0);
      expect(t.x).toBeGreaterThanOrEqual(x1);
    }
  };

  it("deep time, wide window: Gy steps plus the zero marker", () => {
    const ts = ticks(13.8e9 * YEAR, 0, 1000);
    expect(labels(ts)).toEqual(["zero", "2 Gy", "4 Gy", "6 Gy", "8 Gy", "10 Gy", "12 Gy"]);
    inWindow(ts, 13.8e9 * YEAR, 0);
  });

  it("deep time, narrow window: adaptive precision keeps adjacent labels distinct", () => {
    const ts = ticks(20.2e9 * YEAR, 19.8e9 * YEAR, 1000);
    const ls = labels(ts);
    expect(ls).toMatchInlineSnapshot(`
      [
        "19.80 Gy",
        "19.85 Gy",
        "19.90 Gy",
        "19.95 Gy",
        "20.00 Gy",
        "20.05 Gy",
        "20.10 Gy",
        "20.15 Gy",
        "20.20 Gy",
      ]
    `);
    expect(new Set(ls).size).toBe(ls.length);
    for (let i = 1; i < ls.length; i++) expect(ls[i]).not.toBe(ls[i - 1]);
  });

  it("year regime spanning the era boundary labels BCE years", () => {
    const x0 = daysBeforeZero(Date.UTC(-2999, 0, 1));
    const x1 = daysBeforeZero(Date.UTC(2000, 0, 1));
    const ts = ticks(x0, x1, 1000);
    expect(labels(ts)).toEqual(["2001 BCE", "1001 BCE", "1 BCE", "1000", "2000"]);
    inWindow(ts, x0, x1);
  });

  it("utcYear: two-digit years land on year 69, not 1969", () => {
    const a = new Date(0); a.setUTCFullYear(63, 0, 1);
    const b = new Date(0); b.setUTCFullYear(77, 0, 1);
    const ts = ticks(daysBeforeZero(a.getTime()), daysBeforeZero(b.getTime()), 1600);
    expect(labels(ts)).toContain("69");
    for (const t of ts) {
      // each tick sits exactly at Jan 1 00:00 UTC of its two-digit labeled year
      const d = dateOf(t.x);
      expect(d.getUTCFullYear()).toBe(Number(t.label));
      expect([d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()])
        .toEqual([0, 1, 0, 0]);
    }
  });

  it("month regime: month names, year at January, majors at year starts", () => {
    const x0 = daysBeforeZero(Date.UTC(1968, 5, 1));
    const x1 = daysBeforeZero(Date.UTC(1970, 5, 1));
    const ts = ticks(x0, x1, 1000);
    expect(labels(ts)).toMatchInlineSnapshot(`
      [
        "Jul",
        "Oct",
        "1969",
        "Apr",
        "Jul",
        "Oct",
        "1970",
        "Apr",
      ]
    `);
    for (const t of ts) expect(t.major).toBe(/^\d/.test(t.label));
    inWindow(ts, x0, x1);
  });

  it("day regime: day-of-month numbers, month+year major at the 1st", () => {
    const x0 = daysBeforeZero(Date.UTC(1969, 6, 1));
    const x1 = daysBeforeZero(Date.UTC(1969, 6, 31));
    const ts = ticks(x0, x1, 1000);
    expect(labels(ts)).toEqual(["Jul 1969", "5", "9", "13", "17", "21", "25"]);
    expect(ts[0]!.major).toBe(true);
    expect(ts.slice(1).every((t) => !t.major)).toBe(true);
  });

  it("minute regime: HH:MM labels around the moon landing", () => {
    const c = daysBeforeZero(Date.UTC(1969, 6, 20, 20, 17));
    const ts = ticks(c + 0.025, c - 0.025, 1000);
    expect(labels(ts)).toEqual(["19:50", "20:00", "20:10", "20:20", "20:30", "20:40", "20:50"]);
  });

  it("hour steps label midnight with the date as a major tick", () => {
    const c = daysBeforeZero(Date.UTC(1969, 6, 20, 20, 17));
    const ts = ticks(c + 0.5, c - 0.5, 1000);
    expect(labels(ts)).toEqual(["09:00", "12:00", "15:00", "18:00", "21:00", "Jul 21", "03:00", "06:00"]);
    expect(ts.filter((t) => t.major).map((t) => t.label)).toEqual(["Jul 21"]);
  });

  it("sub-minute steps render HH:MM:SS, all distinct", () => {
    const c = daysBeforeZero(Date.UTC(1969, 6, 20, 20, 17));
    const ts = ticks(c + 0.0005, c - 0.0005, 1000);
    const ls = labels(ts);
    expect(ls.length).toBeGreaterThanOrEqual(4);
    for (const l of ls) expect(l).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(new Set(ls).size).toBe(ls.length);
  });
});
