/** camera.test.mts — the log-space camera: anchored zoom, span clamps,
 * resonance jumps, animation convergence, and the void-range center clamp. */
import { describe, expect, it } from "vitest";
import { Camera, SPAN_MIN, SPAN_MAX } from "../src/ui/camera.mts";

/** Run the animation until it reports settled (tick returns false). */
function settle(cam: Camera): void {
  for (let i = 0; i < 10_000; i++) {
    if (!cam.tick(16)) return;
  }
  throw new Error("camera did not settle within 10000 ticks");
}

function makeCam(center: number, span: number): Camera {
  const cam = new Camera(center, span);
  cam.width = 1000;
  return cam;
}

describe("zoomAt", () => {
  it.each([
    [-1, 300],  // zoom in, cursor left of center
    [-2.5, 800],
    [1, 300],   // zoom out
    [2, 640],
  ] as const)("dLog2=%s keeps the day under px=%s fixed", (dLog2, px) => {
    const cam = makeCam(7.9e5, 1.62e6);
    const anchor = cam.xAt(px);
    cam.zoomAt(px, dLog2);
    settle(cam);
    expect(cam.span / 1.62e6).toBeCloseTo(2 ** dLog2, 9);
    expect(Math.abs(cam.xAt(px) - anchor)).toBeLessThan(cam.span * 1e-9);
  });

  it("clamps span at SPAN_MAX", () => {
    const cam = makeCam(7.9e5, 1.62e6);
    cam.zoomAt(500, 1000);
    settle(cam);
    expect(cam.span / SPAN_MAX).toBeCloseTo(1, 12);
    expect(cam.span).toBeLessThanOrEqual(SPAN_MAX * (1 + 1e-12));
  });

  it("clamps span at SPAN_MIN", () => {
    const cam = makeCam(7.9e5, 1.62e6);
    cam.zoomAt(500, -1000);
    settle(cam);
    expect(cam.span / SPAN_MIN).toBeCloseTo(1, 12);
    expect(cam.span).toBeGreaterThanOrEqual(SPAN_MIN * (1 - 1e-12));
  });
});

describe("resonate", () => {
  it("resonate(1) multiplies target center by 64 and adds 6 to target log2Span", () => {
    const cam = makeCam(1e4, 1e5);
    cam.resonate(1);
    settle(cam);
    expect(cam.center).toBe(1e4 * 64);
    expect(cam.log2Span).toBe(Math.log2(1e5) + 6);
  });

  it("resonate(-1) divides target center by 64 and subtracts 6", () => {
    const cam = makeCam(64e4, 6.4e6);
    cam.resonate(-1);
    settle(cam);
    expect(cam.center).toBe(1e4);
    expect(cam.log2Span).toBe(Math.log2(6.4e6) - 6);
  });

  it("resonate up then down is an exact round trip", () => {
    const cam = makeCam(1e4, 1e5);
    cam.resonate(1);
    cam.resonate(-1);
    settle(cam);
    expect(cam.center).toBeCloseTo(1e4, 9);
    expect(cam.log2Span).toBeCloseTo(Math.log2(1e5), 12);
  });
});

describe("tick", () => {
  it("converges to the target and returns false once settled", () => {
    const cam = makeCam(1000, 2000);
    settle(cam); // constructor state is already at target
    cam.setView(5000, 8000);
    expect(cam.tick(16)).toBe(true); // moving toward target
    settle(cam);
    expect(cam.center).toBe(5000);   // snapped exactly on settle
    expect(cam.log2Span).toBe(Math.log2(8000));
    expect(cam.tick(16)).toBe(false); // stays settled
  });

  it("monotonically approaches the target center", () => {
    const cam = makeCam(0, 1000);
    settle(cam);
    cam.setView(10_000, 1000);
    let prev = cam.center;
    for (let i = 0; i < 50; i++) {
      cam.tick(16);
      expect(cam.center).toBeGreaterThanOrEqual(prev);
      expect(cam.center).toBeLessThanOrEqual(10_000);
      prev = cam.center;
    }
  });
});

describe("center clamp", () => {
  it("permits the negative (void) range down to -0.45 × span", () => {
    const cam = makeCam(0, 10_000);
    cam.setView(-4000, 10_000, true); // inside the void allowance
    expect(cam.center).toBe(-4000);
  });

  it("clamps below -0.45 × span", () => {
    const cam = makeCam(0, 10_000);
    cam.setView(-1e9, 10_000, true);
    // clamp floor is computed from the log2-roundtripped span, so compare to it
    expect(cam.center).toBe(-0.45 * cam.span);
    expect(cam.center).toBeCloseTo(-4500, 6);
  });

  it("clamps the far past at 0.85 × SPAN_MAX", () => {
    const cam = makeCam(0, 1e6);
    cam.setView(1e20, 1e6, true);
    expect(cam.center).toBe(SPAN_MAX * 0.85);
  });

  it("panPx shifts the target center by pixels × days-per-pixel", () => {
    const cam = makeCam(5000, 1000);
    cam.panPx(100); // 100 px × (1000 days / 1000 px) = 100 days
    settle(cam);
    expect(cam.center).toBe(5100);
  });
});
