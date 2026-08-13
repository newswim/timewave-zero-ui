/** "Your wave" — the personal overlay, pure logic (no DOM).
 *
 * The wave itself is untouched: f(x) still maps days-before-zero to a
 * value. Personal mode changes only which *date* counts as zero. The
 * default anchor gives you the same span McKenna gave history's final
 * cycle: your zero falls 24,576 days (384·64 ≈ 67.29 years) after your
 * birth, making your life one complete cycle of the wave.
 *
 * The anchor is deliberately slidable (`slideDays`). That control is
 * the critique made tactile: your events will find fitting dips and
 * peaks wherever the anchor sits — which is the lesson, and the fun.
 *
 * Privacy: personal state lives in localStorage only (plus explicit
 * JSON export/import). It never enters the URL or leaves the browser.
 */
import { DAY_MS, ZERO_DATE_MS } from "../timewave.mts";

/** 384·64 days — one full base cycle, McKenna's "final 67.29 years". */
export const CYCLE_DAYS = 24_576;

const MAX_EVENTS = 500;
const MAX_SLIDE_DAYS = 36_525; // ±100 years
/** JS Date's representable range (±8.64e15 ms); anything outside would make
 * toISOString throw — and a bad stored value would brick the app at boot. */
const MAX_ABS_MS = 8.64e15;

export interface PersonalEvent {
  label: string;
  t: number; // epoch ms (UTC)
}

export interface PersonalState {
  birthMs: number;
  slideDays: number; // anchor adjustment relative to birth + CYCLE_DAYS
  events: PersonalEvent[];
  /** last camera position in the personal frame, restored on return */
  view?: { c: number; s: number };
}

const validMs = (v: unknown): v is number =>
  Number.isFinite(v) && Math.abs(v as number) <= MAX_ABS_MS;

/** The personal zero date: birth + one full cycle, plus any slide. */
export const personalZeroMs = (s: PersonalState): number =>
  s.birthMs + (CYCLE_DAYS + s.slideDays) * DAY_MS;

/** Add this to a McKenna-epoch x to get the same real date's x under `epochMs`. */
export const epochShiftDays = (epochMs: number): number =>
  (epochMs - ZERO_DATE_MS) / DAY_MS;

/** Days before `epochMs` for a real timestamp. */
export const xForDate = (tMs: number, epochMs: number): number =>
  (epochMs - tMs) / DAY_MS;

export const clampSlide = (days: number): number =>
  Math.max(-MAX_SLIDE_DAYS, Math.min(MAX_SLIDE_DAYS, Math.round(days)));

export function serialize(s: PersonalState): string {
  return JSON.stringify({ v: 1, ...s });
}

/** Strict parse of persisted/imported state; null on anything malformed. */
export function deserialize(json: string): PersonalState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!validMs(o.birthMs)) return null;
  const slideDays = Number.isFinite(o.slideDays) ? clampSlide(o.slideDays as number) : 0;
  const events: PersonalEvent[] = [];
  if (Array.isArray(o.events)) {
    for (const e of o.events.slice(0, MAX_EVENTS)) {
      if (typeof e !== "object" || e === null) continue;
      const ev = e as Record<string, unknown>;
      if (typeof ev.label !== "string" || !validMs(ev.t)) continue;
      const label = ev.label.trim().slice(0, 120);
      if (label) events.push({ label, t: ev.t as number });
    }
  }
  events.sort((a, b) => a.t - b.t);
  const out: PersonalState = { birthMs: o.birthMs, slideDays, events };
  const v = o.view as Record<string, unknown> | undefined;
  if (typeof v === "object" && v !== null &&
      Number.isFinite(v.c) && Number.isFinite(v.s) && (v.s as number) > 0) {
    out.view = { c: v.c as number, s: v.s as number };
  }
  return out;
}
