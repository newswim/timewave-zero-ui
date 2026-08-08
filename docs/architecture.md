# Architecture: rendering & stack decisions

*Decided 2026-07-24 (Phase 3 planning). Revisit triggers are listed per
decision.*

## Summary

Fully static site. TypeScript everywhere — run natively by Node for
dev/tests (type stripping, Node ≥ 23.6; this repo uses `.mts`), bundled
by Vite for the browser. **Canvas 2D** renders the explorer core behind
a small renderer seam; WebGL2/WebGPU reserved for an optional beauty
pass later. No UI framework until the chrome earns one. Host on GitHub
Pages or Vercel — there is no server-side anything.

## Can this run in a browser? Comfortably.

Measured on this machine (Node 25, single thread, the exact `.mts`
engine): **~2.5M wave evaluations/sec** across the full 10¹²-day input
range. A worst-case frame — 4K display, ~4,000 pixel columns, 2×
supersampling, main curve plus two resonance-ghost curves — needs ~25k
evaluations ≈ **10 ms cold**, and curves are cached between camera
changes, so steady-state cost is near zero. Total data payload: 24 KB
of JSON (8 KB number sets + 16 KB hexagrams). No WASM, no GPU compute,
no workers required (OffscreenCanvas remains an escape hatch).

## Why Canvas 2D first (and not WebGPU yet)

1. **Compute is not the bottleneck** — see above. The GPU would be
   accelerating a solved problem.
2. **Precision is the actual hard problem, and it favors the CPU.** The
   explorer spans ~72 Gyr down to minutes: ~10¹⁵ dynamic range. GPU
   vertex pipelines are float32 (24-bit mantissa ≈ 1 part in 1.7×10⁷) —
   deep zoom in float32 produces the classic coordinate-jitter problem,
   solvable only with camera-relative re-basing tricks. Canvas 2D
   consumes float64 path coordinates directly; sampling f(x) in JS
   float64 and drawing the polyline sidesteps the entire issue.
3. **Reach.** WebGPU reached [Baseline in January 2026](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)
   (Chrome/Edge 113+, Safari 26+, Firefox 141+ on Windows), but the tail
   is real in mid-2026: Firefox on Linux/Android/Intel-Mac is
   [still rolling out](https://www.utsubo.com/blog/frontier-web-apis-2026-production-ready).
   Canvas 2D is universal, including old mobile Safari. For an art
   piece meant to be linked around, the tail matters.
4. **The fractal is its own LOD scheme.** Because f(64x) = 64·f(x),
   structure at scales below one pixel column contributes at most
   ~1/64 of the locally dominant amplitude per level — the waveform is
   effectively band-limited at every zoom. Naive per-column sampling at
   2–4× density is visually exact; no min/max decimation pyramid, no
   precomputed mip levels. (This is the theory's one true property
   doing our engineering for us.)

**Where a GPU pass would genuinely earn its place** (Phase 5+, optional,
behind capability detection, never required for content): bloom/glow on
the curve, animated "flowing time" shader aesthetics, instanced
rendering if the event layer grows past ~10k simultaneous glyphs,
animated morphing between the four number sets. Plan: define a small
`WaveRenderer` interface now; implement `Canvas2DRenderer`; a
`WebGPURenderer` (WebGL2 fallback) can slot in later purely additively.

## Camera model (the part to get right early)

- State: `{ centerDays: f64, log2Span: f64, yMode: "auto" | "log" }`.
  Zoom lives in **log space**; never accumulate a multiplicative
  transform (the span ratio ~6×10¹⁴ is representable in float64, but
  compounding transforms erode it).
- x = days-before-zero (float64) is the single source of truth;
  Date conversion only at the label/formatting edge (deep time needs
  "65 Mya"-style formatting anyway, not Date objects).
- Hybrid draw: canvas for wave/bands/ghosts; positioned DOM for
  interactive labels, hexagram glyphs (䷀–䷿ are just text), and
  accessibility.

## Framework: none yet — agreed

The explorer core is imperative canvas + pure functions and would be
framework-inert anyway. Panels, layer toggles, and the essay chrome
start as plain DOM + a tiny hand-rolled store. **Revisit trigger:**
when ≥3 stateful panels interact (layer manager + essay mode + critique
mode is the likely moment), adopt something that compiles away —
Svelte 5 or Solid — without letting it touch the render loop. React is
the wrong shape for this project (its scheduling buys nothing here and
its ecosystem gravity pulls toward chart libraries we must not use —
the wave must come from *our* validated engine, not a plotting
package's resampler).

## Tooling

- **Node ≥ 23.6 native TS**: `.mts` sources, erasable syntax only —
  enforced via `erasableSyntaxOnly` in [tsconfig.json](../tsconfig.json).
  Tests run under Vitest (`npm test`); standalone scripts run directly
  (`node scripts/montecarlo.mts`), no build step.
- **TypeScript 7** (native compiler) for `npm run typecheck`.
- **Vite** (added when the site lands in Phase 3): serves `.mts`
  unchanged, bundles for production, base-path config for GitHub Pages.
- **Deploy**: GitHub Actions → Pages (or Vercel; decide when Phase 3
  ships something worth hosting). Everything is static files.
