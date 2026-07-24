/** Deep-time axis formatting: 72 Gyr down to seconds, in one coordinate —
 * x = days before the zero date. */
import { ZERO_DATE_MS, DAY_MS } from "../timewave.mts";

export const YEAR = 365.2425;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const dateOf = (x: number): Date => new Date(ZERO_DATE_MS - x * DAY_MS);

/** UTC start-of-year timestamp, correct for years 0–99 and negative years. */
function utcYear(y: number): number {
  const d = new Date(0);
  d.setUTCFullYear(y, 0, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}
const xOfMs = (ms: number): number => (ZERO_DATE_MS - ms) / DAY_MS;

const trim = (n: number): string => {
  const s = n >= 100 ? Math.round(n).toString() : n.toPrecision(3);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
};

/** "13.8 Gy" | "66 My" | "300 ky" — years rendered at astronomical scale. */
export function siYears(y: number): string {
  if (y >= 995e6) return `${trim(y / 1e9)} Gy`;
  if (y >= 995e3) return `${trim(y / 1e6)} My`;
  if (y >= 9950) return `${trim(y / 1e3)} ky`;
  return `${Math.round(y).toLocaleString()} y`;
}

export const yearLabel = (astro: number): string =>
  astro <= 0 ? `${1 - astro} BCE` : `${astro}`;

/** Wave-value formatting for axis and readout. */
export function fmtValue(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 995e3) return `${trim(v / 1e6)}M`;
  if (a >= 995) return `${trim(v / 1e3)}k`;
  if (a >= 995e-6) return trim(v);
  if (a >= 995e-9) return `${trim(v * 1e6)}µ`;
  return v.toExponential(2);
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** Human date for the cursor readout, granularity chosen by the visible span. */
export function fmtDateAt(x: number, spanDays: number): string {
  const years = x / YEAR;
  if (years > 25e4 || spanDays / YEAR > 2e5) return `${siYears(years)} before zero`;
  const d = dateOf(x);
  const y = d.getUTCFullYear();
  const yl = yearLabel(y);
  if (x < 0) {
    const days = Math.floor(-x);
    return `${yl}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} · ${days.toLocaleString()} days after zero`;
  }
  if (spanDays > 3e4) return yl;
  if (spanDays > 150) return `${MONTHS[d.getUTCMonth()]} ${yl}`;
  if (spanDays > 3) return `${yl}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  if (spanDays > 0.12) return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${hm} UTC`;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${hm}:${pad(d.getUTCSeconds())} UTC`;
}

export interface Tick { x: number; label: string; major: boolean }

const niceOf = (raw: number, choices: number[]): number =>
  choices.find((c) => c >= raw) ?? choices[choices.length - 1]!;

function nice125(raw: number): number {
  const mag = 10 ** Math.floor(Math.log10(raw));
  const m = raw / mag;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * mag;
}

/** Ticks for the visible window [x1, x0] (x0 = left/older edge), ~110px apart. */
export function ticks(x0: number, x1: number, widthPx: number): Tick[] {
  const span = x0 - x1;
  const target = Math.max(2, widthPx / 110);
  const out: Tick[] = [];
  const ySpan = span / YEAR;

  if (ySpan > 2e5) {
    const stepY = nice125(ySpan / target);
    const step = stepY * YEAR;
    // enough decimals that adjacent ticks stay distinct (e.g. 20.05 Gy vs 20.1 Gy)
    const unit = (y: number): [number, string] =>
      y >= 995e6 ? [1e9, "Gy"] : y >= 995e3 ? [1e6, "My"] : y >= 9950 ? [1e3, "ky"] : [1, "y"];
    for (let m = Math.ceil(x1 / step); m * step <= x0; m++) {
      if (m <= 0) { if (m === 0) out.push({ x: 0, label: "zero", major: true }); continue; }
      const y = m * stepY;
      const [u, suffix] = unit(y);
      const dec = Math.min(3, Math.max(0, Math.ceil(-Math.log10(stepY / u))));
      out.push({ x: m * step, label: `${(y / u).toFixed(dec)} ${suffix}`, major: true });
    }
    return out;
  }

  const msLeft = ZERO_DATE_MS - x0 * DAY_MS;
  const msRight = ZERO_DATE_MS - x1 * DAY_MS;

  if (ySpan > 8) {
    const stepY = Math.max(1, nice125(ySpan / target));
    const yA = dateOf(x0).getUTCFullYear() - 1;
    const yB = dateOf(x1).getUTCFullYear() + 1;
    for (let y = Math.ceil(yA / stepY) * stepY; y <= yB; y += stepY) {
      const x = xOfMs(utcYear(y));
      if (x <= x0 && x >= x1)
        out.push({ x, label: yearLabel(y), major: y % (stepY * 5) === 0 });
    }
    return out;
  }

  if (span > 60) {
    const stepM = niceOf((span / 30.44) / target, [1, 2, 3, 6]);
    const d = new Date(msLeft);
    d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0);
    while (d.getTime() <= msRight) {
      const mo = d.getUTCMonth();
      if (mo % stepM === 0) {
        const x = xOfMs(d.getTime());
        if (x <= x0 && x >= x1)
          out.push({
            x,
            label: mo === 0 ? yearLabel(d.getUTCFullYear()) : MONTHS[mo]!,
            major: mo === 0,
          });
      }
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    return out;
  }

  if (span > 2.5) {
    const stepD = niceOf(span / target, [1, 2, 4, 7, 14]);
    const d = new Date(msLeft);
    d.setUTCHours(0, 0, 0, 0);
    while (d.getTime() <= msRight) {
      const dom = d.getUTCDate();
      if ((dom - 1) % stepD === 0 && !(stepD > 1 && dom >= 29)) {
        const x = xOfMs(d.getTime());
        if (x <= x0 && x >= x1)
          out.push({
            x,
            label: dom === 1 ? `${MONTHS[d.getUTCMonth()]} ${yearLabel(d.getUTCFullYear())}` : `${dom}`,
            major: dom === 1,
          });
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return out;
  }

  const stepMin = span > 0.12
    ? niceOf((span * 1440) / target, [60, 120, 180, 360, 720])
    : niceOf((span * 1440) / target, [0.25, 0.5, 1, 2, 5, 10, 15, 30]);
  const stepMs = stepMin * 60_000;
  for (let t = Math.ceil(msLeft / stepMs) * stepMs; t <= msRight; t += stepMs) {
    const d = new Date(t);
    const midnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
    const label = midnight
      ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
      : stepMin < 1
        ? `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
        : `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    out.push({ x: xOfMs(t), label, major: midnight });
  }
  return out;
}
