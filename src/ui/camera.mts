/** Log-space camera over x = days before zero. Zoom state is log2(span) so a
 * ~6e14 zoom ratio never lives in one multiplicative transform; pan and zoom
 * animate by critically-damped approach to a target. */

export const SPAN_MIN = 0.0006;          // ~52 seconds
export const SPAN_MAX = 3.2e13;          // beyond the 72.2 Gyr top cycle
const LOG_MIN = Math.log2(SPAN_MIN);
const LOG_MAX = Math.log2(SPAN_MAX);

export class Camera {
  width = 1000;
  center: number;
  log2Span: number;
  private tCenter: number;
  private tLog2Span: number;

  constructor(center = 7.9e5, span = 1.62e6) {
    this.center = this.tCenter = center;
    this.log2Span = this.tLog2Span = Math.log2(span);
    this.clampTarget();
  }

  get span(): number { return 2 ** this.log2Span; }
  get targetSpan(): number { return 2 ** this.tLog2Span; }
  get daysPerPx(): number { return this.span / this.width; }

  /** x at a screen column; time flows left→right toward zero at the right. */
  xAt(px: number): number { return this.center + (this.width / 2 - px) * this.daysPerPx; }
  pxAt(x: number): number { return this.width / 2 - (x - this.center) / this.daysPerPx; }

  private xAtTarget(px: number): number {
    return this.tCenter + (this.width / 2 - px) * (this.targetSpan / this.width);
  }

  private clampTarget(): void {
    this.tLog2Span = Math.min(LOG_MAX, Math.max(LOG_MIN, this.tLog2Span));
    const span = this.targetSpan;
    const lo = -0.45 * span;              // allow drifting into the void
    const hi = SPAN_MAX * 0.85;
    this.tCenter = Math.min(hi, Math.max(lo, this.tCenter));
  }

  panPx(dpx: number): void {
    this.tCenter += dpx * (this.targetSpan / this.width);
    this.clampTarget();
  }

  /** Zoom by dLog2 keeping the day under `px` fixed. */
  zoomAt(px: number, dLog2: number): void {
    const anchor = this.xAtTarget(px);
    this.tLog2Span = Math.min(LOG_MAX, Math.max(LOG_MIN, this.tLog2Span + dLog2));
    this.tCenter = anchor - (this.width / 2 - px) * (this.targetSpan / this.width);
    this.clampTarget();
  }

  /** Resonance jump: scale everything ×64^dir about the zero date —
   * lands on the identical waveform (f(64x) = 64·f(x)). */
  resonate(dir: 1 | -1): void {
    this.tCenter *= 64 ** dir;
    this.tLog2Span += 6 * dir;
    this.clampTarget();
  }

  setView(center: number, span: number, snap = false): void {
    this.tCenter = center;
    this.tLog2Span = Math.log2(span);
    this.clampTarget();
    if (snap) {
      this.center = this.tCenter;
      this.log2Span = this.tLog2Span;
    }
  }

  /** Advance the animation; returns true while still moving. */
  tick(dtMs: number): boolean {
    const k = 1 - Math.exp(-dtMs / 90);
    this.log2Span += (this.tLog2Span - this.log2Span) * k;
    // interpolate center in units of current span so pan and zoom stay in step
    this.center += (this.tCenter - this.center) * k;
    const spanClose = Math.abs(this.tLog2Span - this.log2Span) < 1e-4;
    const centerClose = Math.abs(this.tCenter - this.center) < this.span * 1e-4;
    if (spanClose && centerClose) {
      this.log2Span = this.tLog2Span;
      this.center = this.tCenter;
      return false;
    }
    return true;
  }
}
