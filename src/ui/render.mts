/** Canvas 2D renderer for the timewave explorer. All coordinates arrive as
 * x = days before zero (float64); the fractal's self-similarity band-limits
 * sub-pixel structure (each level below pixel scale contributes ≤ ~1/64 of
 * local amplitude), so per-column sampling needs no decimation pyramid. */
import type { Camera } from "./camera.mts";
import type { Wave } from "../timewave.mts";
import { ticks, fmtValue } from "./format.mts";
import { EVENTS, type Ev } from "./events.mts";
import { epochShiftDays, xForDate, type PersonalEvent } from "./personal.mts";

export interface Hexagram {
  kw: number; unicode: string; pinyin: string; english: string;
}

export interface Scene {
  wave: Wave;
  hue: string;
  hexagrams: Hexagram[];
  nowX: number;                     // today, in days before the zero epoch (negative if past it)
  epochMs: number;                  // which date is "zero": McKenna's, or a personal one
  zeroLabel: string;                // terminus caption
  voidTitle: string;                // caption for the region past zero
  voidSub: string;
  personalEvents?: PersonalEvent[] | null;
  hover?: { px: number } | null;
  hoverEv?: PlacedEv | null;
  ghost?: { canvas: HTMLCanvasElement; t0: number } | null;
}

/** A drawn marker: either a curated historical event or a user's own. */
export interface PlacedEv { ev?: Ev; user?: PersonalEvent; px: number; py: number }

const USER = "#d55181";

const INK = "#f2f4fa";
const INK2 = "#c3c7d4";
const MUTED = "#8a8fa3";
const MK = "#9085e9";
const TOP = 56;
const AXIS = 44;                    // bottom axis strip height
const BAND = 30;                    // hexagram band height

function nice125(raw: number): number {
  if (!(raw > 0)) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const m = raw / mag;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * mag;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private yLo = 0;
  private yHi = 1;
  private inited = false;
  width = 0;
  height = 0;
  dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  resize(w: number, h: number, dpr: number): void {
    this.width = w; this.height = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  /** True while the y-range is still easing toward its target. */
  unsettled = false;

  draw(cam: Camera, s: Scene): PlacedEv[] {
    const { ctx } = this;
    const W = this.width, H = this.height;
    const plotTop = TOP, plotBot = H - AXIS;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0d1120");
    bg.addColorStop(1, "#0a0d18");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ---- sample the wave ----
    const n = Math.max(64, Math.ceil(W * 1.5));
    const xs = new Float64Array(n + 1);
    const vs = new Float64Array(n + 1);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= n; i++) {
      const px = (i / n) * W;
      const x = cam.xAt(px);
      xs[i] = x;
      const v = x >= 0 ? s.wave(x) : NaN;
      vs[i] = v;
      if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; }
    }
    if (Number.isFinite(lo)) {
      const px0 = cam.pxAt(0);
      const zeroVisible = px0 >= -40 && px0 <= W + 40;
      let tLo: number, tHi: number;
      const pad = (hi - lo) * 0.1 + hi * 0.02 + 1e-12;
      if (zeroVisible || lo < 0.18 * hi) { tLo = 0; tHi = hi + pad; }
      else { tLo = Math.max(0, lo - pad); tHi = hi + pad; }
      const far = !this.inited || tHi < this.yLo || tLo > this.yHi ||
        tHi > this.yHi * 3 || tHi < this.yHi / 3;
      if (far) { this.yLo = tLo; this.yHi = tHi; this.inited = true; }
      else {
        this.yLo += (tLo - this.yLo) * 0.22;
        this.yHi += (tHi - this.yHi) * 0.22;
      }
      this.unsettled =
        Math.abs(tLo - this.yLo) > (tHi - tLo) * 1e-3 ||
        Math.abs(tHi - this.yHi) > (tHi - tLo) * 1e-3;
    }
    const yLo = this.yLo, yHi = Math.max(this.yHi, yLo + 1e-12);
    const yPx = (v: number): number =>
      plotBot - ((v - yLo) / (yHi - yLo)) * (plotBot - plotTop);

    const x0 = cam.xAt(0), x1 = cam.xAt(W);   // left (older) / right (newer)

    // ---- horizontal value grid ----
    const step = nice125((yHi - yLo) / 4);
    ctx.font = "10px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    for (let v = Math.ceil(yLo / step) * step; v <= yHi; v += step) {
      const y = yPx(v);
      if (y < plotTop + 8 || y > plotBot - 4) continue;
      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      if (v > 0) {
        ctx.fillStyle = MUTED; ctx.globalAlpha = 0.8; ctx.textAlign = "left";
        ctx.fillText(fmtValue(v), 8, y - 7);
        ctx.globalAlpha = 1;
      }
    }
    // habit/novelty orientation cue
    ctx.fillStyle = MUTED; ctx.globalAlpha = 0.75;
    ctx.textAlign = "right";
    ctx.fillText("habit ↑", W - 10, plotTop + 34);
    ctx.fillText("novelty ↓", W - 10, plotBot - (cam.daysPerPx <= 0.8 ? 40 : 14));
    ctx.globalAlpha = 1;

    // ---- cycle boundaries (the 64× ladder) ----
    for (let k = 0; k <= 7; k++) {
      const cyc = 384 * 64 ** k;
      const pxPer = cyc / cam.daysPerPx;
      if (pxPer < 48 || pxPer > W * 64) continue;
      const alpha = Math.min(0.16, 0.05 + k * 0.02);
      ctx.strokeStyle = `rgba(160,175,220,${alpha})`;
      ctx.lineWidth = 1;
      for (let m = Math.max(1, Math.ceil(x1 / cyc)); m * cyc <= x0; m++) {
        const px = cam.pxAt(m * cyc);
        ctx.beginPath(); ctx.moveTo(px, plotTop); ctx.lineTo(px, plotBot); ctx.stroke();
      }
    }

    // ---- time axis ----
    ctx.textAlign = "center";
    for (const t of ticks(x0, x1, W, s.epochMs)) {
      const px = cam.pxAt(t.x);
      if (px < -60 || px > W + 60) continue;
      ctx.strokeStyle = t.major ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)";
      ctx.beginPath(); ctx.moveTo(px, plotBot); ctx.lineTo(px, plotBot + 6); ctx.stroke();
      if (t.major) {
        ctx.strokeStyle = "rgba(255,255,255,0.035)";
        ctx.beginPath(); ctx.moveTo(px, plotTop); ctx.lineTo(px, plotBot); ctx.stroke();
      }
      ctx.fillStyle = t.major ? INK2 : MUTED;
      ctx.font = t.major ? "10.5px system-ui, sans-serif" : "10px system-ui, sans-serif";
      ctx.fillText(t.label, px, plotBot + 18);
    }

    // ---- the void (after zero) ----
    const px0 = cam.pxAt(0);
    if (px0 < W) {
      const vx = Math.max(0, px0);
      ctx.fillStyle = "rgba(3,5,11,0.55)";
      ctx.fillRect(vx, plotTop, W - vx, plotBot - plotTop);
      if (W - vx > 130) {
        ctx.fillStyle = MUTED; ctx.globalAlpha = 0.85;
        ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
        const cx = (vx + W) / 2;
        ctx.fillText(s.voidTitle, cx, plotTop + 30);
        ctx.globalAlpha = 0.55;
        ctx.font = "10px system-ui, sans-serif";
        ctx.fillText(s.voidSub, cx, plotTop + 46);
        ctx.globalAlpha = 1;
      }
    }

    // ---- wave: under-fill, glow passes, core line ----
    const wavePath = new Path2D();
    let started = false;
    let lastPx = 0;
    for (let i = 0; i <= n; i++) {
      const v = vs[i]!;
      if (!Number.isFinite(v)) continue;
      const px = (i / n) * W;
      const py = Math.min(plotBot + 2, Math.max(plotTop - 2, yPx(v)));
      if (!started) { wavePath.moveTo(px, py); started = true; }
      else wavePath.lineTo(px, py);
      lastPx = px;
    }
    if (px0 >= 0 && px0 <= W + 2) { wavePath.lineTo(px0, yPx(0)); lastPx = px0; }
    if (started) {
      const fill = new Path2D(wavePath);
      fill.lineTo(lastPx, plotBot); fill.lineTo(0, plotBot); fill.closePath();
      const fg = ctx.createLinearGradient(0, plotTop, 0, plotBot);
      fg.addColorStop(0, s.hue + "26");
      fg.addColorStop(1, s.hue + "00");
      ctx.fillStyle = fg;
      ctx.fill(fill);
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.strokeStyle = s.hue;
      ctx.globalAlpha = 0.07; ctx.lineWidth = 7; ctx.stroke(wavePath);
      ctx.globalAlpha = 0.16; ctx.lineWidth = 3; ctx.stroke(wavePath);
      ctx.globalAlpha = 1; ctx.lineWidth = 1.5; ctx.stroke(wavePath);
    }

    // ---- terminus ----
    if (px0 > -80 && px0 < W + 80) {
      const gy = yPx(0);
      const glow = ctx.createRadialGradient(px0, gy, 0, px0, gy, 110);
      glow.addColorStop(0, s.hue + "2e");
      glow.addColorStop(1, s.hue + "00");
      ctx.fillStyle = glow;
      ctx.fillRect(px0 - 110, gy - 110, 220, 220);
      ctx.strokeStyle = "rgba(255,255,255,0.32)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px0, plotTop); ctx.lineTo(px0, plotBot); ctx.stroke();
      ctx.fillStyle = INK; ctx.globalAlpha = 0.9;
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.textAlign = px0 > W - 170 ? "right" : "left";
      ctx.fillText(s.zeroLabel, px0 + (px0 > W - 170 ? -8 : 8), plotTop + 14);
      ctx.globalAlpha = 1;
    }

    // ---- hexagram band ----
    if (cam.daysPerPx <= 0.8) this.hexBand(cam, s, plotBot);

    // ---- events ----
    const placed = this.events(cam, s, yPx, plotTop, plotBot);

    // ---- hover crosshair ----
    if (s.hover) {
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(s.hover.px, plotTop); ctx.lineTo(s.hover.px, plotBot); ctx.stroke();
    }
    if (s.hoverEv) {
      ctx.strokeStyle = s.hue; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.hoverEv.px, s.hoverEv.py, 6.5, 0, Math.PI * 2); ctx.stroke();
    }

    // ---- resonance ghost (proof of self-similarity) ----
    if (s.ghost) {
      const t = (performance.now() - s.ghost.t0) / 1400;
      if (t < 1) {
        ctx.globalAlpha = 0.4 * (1 - t);
        ctx.drawImage(s.ghost.canvas, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
    return placed;
  }

  private hexBand(cam: Camera, s: Scene, plotBot: number): void {
    const { ctx } = this;
    const W = this.width;
    const top = plotBot - BAND;
    const dpp = cam.daysPerPx;
    const dA = Math.max(0, Math.floor(cam.xAt(W)));       // newest visible day
    const dB = Math.max(0, Math.ceil(cam.xAt(0)));        // oldest visible day
    if (dB - dA > 4000) return;
    ctx.font = "14px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let d = dA;
    while (d <= dB) {
      const p = 383 - (d % 384);
      const h = Math.floor(p / 6);                         // 0..63 → King Wen h+1
      const line = p % 6;                                  // 0 = bottom line of cell
      const cellStartDay = d - (5 - line);                 // newest day of this hexagram cell
      const cellEndDay = cellStartDay + 6;
      const pxR = cam.pxAt(Math.max(cellStartDay, 0));
      const pxL = cam.pxAt(cellEndDay);
      const wPx = pxR - pxL;
      if (pxL < W && pxR > 0) {
        ctx.fillStyle = h % 2 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)";
        ctx.fillRect(pxL, top, wPx, BAND);
        const hex = s.hexagrams[h];
        if (hex && wPx >= 20) {
          // center the glyph in the *visible* portion of a partially clipped cell
          const gx = (Math.max(pxL, 0) + Math.min(pxR, W)) / 2;
          ctx.fillStyle = INK2; ctx.globalAlpha = 0.85;
          ctx.font = "14px system-ui, sans-serif";
          ctx.fillText(hex.unicode, gx, top + (wPx >= 84 ? 10 : BAND / 2));
          if (wPx >= 84) {
            ctx.globalAlpha = 0.6; ctx.font = "9px system-ui, sans-serif";
            ctx.fillStyle = MUTED;
            ctx.fillText(`${hex.kw} · ${hex.pinyin}`, gx, top + 22);
          }
          ctx.globalAlpha = 1;
        }
        if (dpp < 0.06) {                                   // per-day (yao) separators
          ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
          for (let dd = Math.max(cellStartDay, 0); dd < cellEndDay; dd++) {
            const px = cam.pxAt(dd);
            ctx.beginPath(); ctx.moveTo(px, top + BAND - 6); ctx.lineTo(px, top + BAND); ctx.stroke();
          }
        }
      }
      d = cellEndDay;
    }
    ctx.textBaseline = "alphabetic";
  }

  private events(
    cam: Camera, s: Scene,
    yPx: (v: number) => number, plotTop: number, plotBot: number,
  ): PlacedEv[] {
    const { ctx } = this;
    const W = this.width;
    const x0 = cam.xAt(0), x1 = cam.xAt(W);
    const placed: PlacedEv[] = [];
    const rects: [number, number, number, number][] = [];
    let labels = Math.max(10, Math.min(30, Math.floor(W / 70)));
    let dots = 170;
    const voidBase = plotTop + (plotBot - plotTop) * 0.6;
    // historical events keep their real dates; under a personal epoch their
    // wave-position shifts by the difference between the two zeros
    const shift = epochShiftDays(s.epochMs);

    const tryLabel = (text: string, px: number, py: number, font: string, fill: string): void => {
      if (labels <= 0 || px <= 4 || px >= W - 4) return;
      ctx.font = font;
      const w = ctx.measureText(text).width;
      // clamp the label box inside the canvas; the leader still points at the dot
      const cx = Math.min(W - 4 - w / 2, Math.max(4 + w / 2, px));
      for (const dy of [-18, -34, -50, 22, 38]) {
        const rx = cx - w / 2 - 3, ry = py + dy - 11, rw = w + 6, rh = 15;
        if (ry < plotTop + 2 || ry + rh > plotBot - 2) continue;
        if (rects.some(([ax, ay, aw, ah]) => rx < ax + aw && rx + rw > ax && ry < ay + ah && ry + rh > ay)) continue;
        ctx.fillStyle = fill;
        ctx.fillText(text, cx, ry + 11);
        ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = 1;
        ctx.beginPath();
        if (dy < 0) { ctx.moveTo(px, py - 6); ctx.lineTo(px, ry + rh - 2); }
        else { ctx.moveTo(px, py + 6); ctx.lineTo(px, ry + 1); }
        ctx.stroke();
        rects.push([rx, ry, rw, rh]);
        labels--;
        break;
      }
    };

    const candidates = EVENTS
      .filter((e) => e.x + shift <= x0 && e.x + shift >= x1)
      .sort((a, b) => a.tier - b.tier || b.x - a.x);

    // "you are here" — on the wave before the zero epoch, in the void after it
    if (s.nowX >= x1 && s.nowX <= x0) {
      const px = cam.pxAt(s.nowX);
      const py = s.nowX >= 0
        ? Math.min(plotBot - 4, Math.max(plotTop + 4, yPx(s.wave(s.nowX))))
        : voidBase;
      ctx.textAlign = "center";
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
      tryLabel("you are here", px, py, "600 10.5px system-ui, sans-serif", INK);
    }

    ctx.textAlign = "center";

    // the user's own events, drawn first so their labels win placement —
    // but bounded, so an imported list can't starve the historical layer
    let userLabels = Math.min(12, labels);
    for (const ue of s.personalEvents ?? []) {
      if (dots-- <= 0) break;
      const ux = xForDate(ue.t, s.epochMs);
      if (ux > x0 || ux < x1) continue;
      const px = cam.pxAt(ux);
      const py = ux >= 0
        ? Math.min(plotBot - 4, Math.max(plotTop + 4, yPx(s.wave(ux))))
        : voidBase;
      ctx.fillStyle = USER;
      ctx.fillRect(px - 3, py - 3, 6, 6);
      placed.push({ user: ue, px, py });
      if (userLabels > 0) {
        tryLabel(ue.label, px, py, "600 11px system-ui, sans-serif", USER);
        userLabels--;
      }
    }

    for (const ev of candidates) {
      if (dots-- <= 0) break;
      const ex = ev.x + shift;
      const inVoid = ex < 0;
      const px = cam.pxAt(ex);
      const py = inVoid
        ? voidBase
        : Math.min(plotBot - 4, Math.max(plotTop + 4, yPx(s.wave(ex))));
      ctx.globalAlpha = inVoid ? 0.55 : 1;
      if (ev.mk) {
        ctx.fillStyle = MK;
        ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 4);
        const r = ev.tier === 0 ? 3.4 : 2.6;
        ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore();
      } else {
        ctx.fillStyle = ev.tier === 0 ? INK : INK2;
        ctx.beginPath(); ctx.arc(px, py, ev.tier === 0 ? 3.2 : 2.4, 0, Math.PI * 2); ctx.fill();
      }
      placed.push({ ev, px, py });

      const big = ev.tier === 0;
      tryLabel(ev.label, px, py,
        big ? "600 11.5px system-ui, sans-serif" : "10.5px system-ui, sans-serif",
        big ? "#e6e9f2" : ev.tier === 1 ? INK2 : MUTED);
      ctx.globalAlpha = 1;
    }
    return placed;
  }
}
