# Timewave Zero — a restoration

**Live: [timewave-zero-ui.vercel.app](https://timewave-zero-ui.vercel.app)**

A recapitulation of Terence McKenna's *Timewave Zero* — the fractal "map of
novelty" he derived from the King Wen sequence of the I Ching and ran as
software from 1974 until his death in 2000 — rebuilt with modern web
technology as a working, historically honest, explorable artifact.

This is neither a debunking nor a revival. It is a **museum restoration**:
the instrument runs again, bit-exact against the original software; the
story around it — including the mathematical objection that wounded it and
the 2012 date that refuted it — is part of the exhibit.

- [docs/assessment.md](docs/assessment.md) — what the theory is, what is
  genuinely there, what is broken, and the case for restoring it anyway
- [docs/research.md](docs/research.md) — the dossier: history, exact
  mathematics, the four number sets, the critiques, primary sources

## Status

**Phase 3 (done): the explorer is built.** `npm install && npm run dev` —
a full-bleed, zoomable wave from the 72-Gyr top cycle down to the final
minutes before 2012-12-21 06:00. Drag to pan, scroll to zoom, `R` /
`Shift+R` for resonance jumps (×64 about the zero date — the identical
waveform, relabeled by history), four number sets, ~100 curated events
with a violet McKenna layer, the hexagram band at fine zoom, and the
void after zero with "you are here." **Your wave** (`Y`) turns the
instrument on your own life: a birthday re-anchors zero to one full cycle
(24,576 days) after your birth, your own events overlay the curve, and a
slide-the-anchor control demonstrates the theory's central flaw on the
most persuasive possible subject — your events fit anywhere. Personal
data lives in localStorage only (JSON export/import; never in URLs).
Explorer code: [src/ui/](src/ui/).
Deployed at [timewave-zero-ui.vercel.app](https://timewave-zero-ui.vercel.app)
(Vercel, framework preset Vite, `npm run build` → `dist/`).

**Phase 1 (done): the engine is recapitulated and validated.**

- [src/timewave.mts](src/timewave.mts) — dependency-free ES module port of
  Peter Meyer's public-domain C implementation (the code that powered the
  original *Timewave Zero* / *Fractal Time* software)
- [data/numbersets.json](data/numbersets.json) — all four historical
  384-value data sets (Kelley, Watkins, Sheliak, Huang Ti)
- [data/kingwen.json](data/kingwen.json) — the 64 hexagrams in King Wen
  order: lines, trigrams, names, Unicode
- [test/](test/) — a 206-test Vitest suite proving fidelity: matches
  Meyer's compiled C program across ~1,900 reference points × 4 number
  sets (from 17 hours to 4.4 billion years before zero); verifies the
  King Wen structural claims McKenna's derivation rests on, plus an
  independent cross-check fixture; proves exact 64× self-similarity in
  ideal mode; and proves the derivation results below

```bash
npm test
```

## Roadmap

- **Phase 2 — derivation pipeline.** ✅ Done ([src/derivation.mts](src/derivation.mts)):
  the 384 numbers are now *derived* from the hexagrams, not transcribed.
  The Watkins set reproduces exactly (384/384) from Watkins' closed
  formula; the Kelley set reproduces at 383/384 — the shipped historical
  data deviates from the formula at exactly one point (index 119: 22 vs
  a computed 32), an apparently unrecorded 50-year-old anomaly; Sheliak's
  1998 construction was recovered from his paper and reproduces 382/384.
  McKenna's "1 in 3770" Monte Carlo claim replicates within its own
  sampling error ([scripts/montecarlo.mts](scripts/montecarlo.mts)).
  Full findings in [docs/research.md](docs/research.md).
- **Phase 3 — the explorer.** ✅ Built (see Status above).
- **Phase 4 — the history layer.** A starter set of ~100 tiered events
  ships with the explorer; remaining: a richer curated set and a
  "McKenna's readings" layer of the correlations he actually claimed in
  lectures, cited to recordings.
- **Phase 5 — the exhibit.** The story as an explorable essay woven into
  the instrument, ending in **critique mode**: drag the zero date and
  watch every historical "fit" survive the move — the strongest objection
  to the theory, made tactile. Then deploy as a static site.

## Principles

1. **Fidelity** — every wave value traceable to the original software and
   primary documents; discrepancies documented, never smoothed over.
2. **Context** — the Watkins Objection, Sheliak's repair, Meyer's own
   late critique, and the uneventful passage of 2012-12-21 are shown in
   the artifact, not hidden in a footnote.
3. **Play** — the seduction of the idea is real and worth experiencing;
   people should be able to *feel* why a generation took it seriously,
   inside an object that is honest about why it failed.
