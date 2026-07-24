# Research dossier

Primary-source research conducted 2026-07-24. Everything below is either
verified computationally in this repo (marked ✓) or cited to a source in
[Sources](#sources). Local study copies of key texts are in
[../reference/](../reference/).

## Chronology

| When | What |
|---|---|
| 1971 (Feb–Mar) | "The experiment at La Chorrera," Colombian Amazon: Terence and Dennis McKenna's psilocybin/ayahuasca experiment; Terence's "Logos" contact seeds the idea that time has a knowable structure keyed to the I Ching |
| 1974–75 | Royce Kelley and Leon Taylor compute the wave in FORTRAN on a CDC 6400 at Berkeley ("64 tables of 384 terms"); *The Invisible Landscape* (1975, with Dennis) publishes the theory |
| 1978–79 | Peter Broadwell's Apple II+ BASIC version — first graphical display |
| 1981 | Klaus Scharff's independent Pascal version (Germany) |
| 1986–87 | Peter Meyer meets McKenna (1985), writes the Apple //e version; visits McKenna in Hawaii 1987, meeting twice weekly |
| 1989–91 | Meyer rewrites in C for MS-DOS (*Timewave Zero*); extends range to 4.5 billion years; Dec 21 2012 becomes the default zero date (Dec 1990); German edition for Gaia Media |
| 1993 | Revised *Invisible Landscape* (HarperSanFrancisco) with Meyer's appendix "The Mathematics of Timewave Zero"; *True Hallucinations* tells the La Chorrera story |
| 1993–94 | Meyer's WEN_SRCH / WEN_GRPH tools: generate 384-sets from *any* hexagram sequence |
| 1996 | Matthew Watkins (mathematician, Exeter) meets McKenna, produces the "Watkins Objection" ("Autopsy for a Mathematical Hallucination?"); McKenna endorses its publication |
| 1997–98 | John Sheliak's vector-formalized reconstruction ("Timewave One"); Meyer's *Fractal Time* software ships all number sets (Kelley, Watkins, Sheliak, Huang Ti) |
| 1999 | McKenna diagnosed with glioblastoma multiforme (May 22) |
| 2000 | McKenna dies, April 3, San Rafael CA, age 53 |
| 2012 | December 21: nothing happens |

## The mathematics, exactly

### From the King Wen sequence

The **first order of difference (FOD)**: the number of lines (1–6) that
change at each transition between successive King Wen hexagrams,
including the wrap from #64 back to #1. ✓ Computed from
[data/kingwen.json](../data/kingwen.json):

```
6,2,4,4,4,3,2,4,2,4,6,2,2,4,2,2,6,3,4,3,2,2,2,3,4,2,6,2,6,3,2,3,
4,4,4,2,4,6,4,3,2,4,2,3,4,3,2,3,4,4,4,1,6,2,2,3,4,3,2,1,6,3,6,3
```

Verified structural properties (the observations McKenna's derivation
essay opens with): ✓ every even-numbered hexagram is its predecessor
rotated 180°, except the eight palindromic hexagrams (1, 2, 27, 28, 29,
30, 61, 62), whose partners are line-complements. ✓ 48 even / 16 odd
differences — exactly 3:1. ✓ The odd values are fourteen 3s and two 1s
(the single-line transitions are 52→53 and 60→61); no value 5 occurs.
McKenna reports a ~27,000-sequence Monte Carlo giving 1-in-3770 odds
for these properties in comparable random sequences (unreplicated here
— a Phase 2 target).

### From FOD to the 384 numbers

McKenna's procedure (his derivation essay, with Watkins' reconstruction
filling gaps): superimpose the 64-value FOD graph on its own 180°
rotation ("closure" at the ends); treat the resulting bidirectional
64-unit wave as one *line* of a hexagram and build three nested copies —
**linear** (six copies, 64 units each), **trigrammatic** (two copies,
tripled), **hexagrammatic** (one copy, sextupled) — each running forward
and backward across the same 384-unit span. Quantify each position for
line-length/skew (13 discrete values, signed by direction) and for
divergence/overlap between the forward and reverse waves (values ×3 on
the trigrammatic level, ×6 on the hexagrammatic); combine levels;
take absolute values. Somewhere in the middle sits the **half twist** —
a sign reversal applied to half the linear-level values (Watkins:
`for 1 ≤ j ≤ 32, angle_lin[j] = −angle_lin[j]`), present in the
original computation, admitted in the TimeExplorer manual (its
footnote 22) as "not well understood."

The output is Table 2 of McKenna's essay: 384 integers beginning
`0,0,0,2,7,4,3,2,6,8,13,5,26,25,24,…` ✓ **Verified identical to the
Kelley set shipped in Meyer's software** (`DATA.TW1`), digit for digit.

Reproducing this pipeline in code — with the twist (Kelley), without it
(Watkins), and per Sheliak's vector formalization — is **Phase 2**; the
recipe texts are in [../reference/](../reference/).

### The four number sets

✓ All stats computed from [data/numbersets.json](../data/numbersets.json):

| Set | Origin | Range | Mean | vs Kelley |
|---|---|---|---|---|
| **Kelley** | Original 1975 derivation (Kelley/Taylor), *with* half twist; = McKenna's Table 2 | 0–79 | 36.4 | — |
| **Watkins** | Meyer, 1994–96: the algorithm *without* the half twist (named for Watkins, who condensed the construction into one MAPLE formula) | 0–84 | 36.2 | differs at 202/384 points |
| **Sheliak** | 1998 vector re-derivation ("Timewave One"); claimed improved historical fit | 0–43 | 23.1 | differs at 369/384 points |
| **Huang Ti** | Same machinery applied to an alternative hexagram sequence, no twist | 0–82 | 27.2 | differs at 376/384 points |

All four begin `0,0,0` — the property that makes the fractal sum
converge and the wave touch zero exactly once, at the zero date. ✓

### The fractal function

From Meyer's public-domain C (`twz-generator.c`, 1998-01-05 — our
[src/timewave.mts](../src/timewave.mts) is an exact port; see
[../reference/original-c/](../reference/original-c/)):

```
x = days before the zero date;  v = linear interpolation over the
384 values, cyclic mod 384;  wave factor 64 (user-settable 2–10000)

f(x) = [  Σ_{i≥0, 64^i ≤ x}  64^i · v(x / 64^i)      ← calendar scales
        + Σ_{i≥1}            v(x · 64^i) / 64^i  ]    ← sub-day scales
       / 64³                                          ← display calibration
```

- **Zero date:** 2012-12-21, 06:00, La Chorrera time (UTC−5) — i.e.
  11:00 UTC. Default since Dec 1990.
- **Scale ladder (wave factor 64):** one data step = 1 day; one full
  cycle = 384 days; then 67.29 years, 4,306 years, 275,586 years,
  17.6 Myr, 1.13 Gyr, 72.2 Gyr. The upward sum self-truncates because
  higher levels interpolate inside the leading `0,0,0` — elegance note:
  the same three zeros that create the eschaton guarantee convergence.
- **Self-similarity:** in the ideal series, f(64x) = 64·f(x) *exactly*
  ("temporal resonance" is a theorem, not a metaphor). ✓ to 3.6e-16.
- **Implementation quirk (preserved):** Meyer's sub-day loop exits at
  the first term that fails to grow the sum — including exact-zero
  terms (e.g. any integer x divisible by 6 gets *no* sub-day terms), so
  the shipped software honors the identity only to ~1e-2. Our port
  reproduces this faithfully by default; `{subDay:"ideal"}` restores
  exactness. ✓
- **Fidelity:** ✓ matches the compiled original across 1,902 reference
  points × 4 sets, from x = 0.0007 days to x = 1.6e12 days (~4.4 Gyr),
  within 1e-9 relative (5e-13 absolute floor for print-noise).
  Oracle CSVs and generation commands: [test/oracle/](../test/oracle/).

## The critiques

**The Watkins Objection (1996).** Watkins reverse-engineered the full
construction from the TimeExplorer manual, condensed it to a closed
formula, and showed the half twist makes the final wave fail to reflect
the "local geometry" of the underlying structure it supposedly encodes —
the published wave does not follow from the stated principles, and the
step that breaks it is the one the manual admits it cannot explain. He
concluded the wave cannot legitimately represent any quantity, novelty
included. By his account McKenna, pressed in person at Palenque,
conceded the construction had "no basis in rational thought";
in public McKenna praised the formula's correctness and endorsed
publishing the objection. (Note the historiography: the concession
quote is Watkins' report; McKenna's publicly recorded stance was
engagement without retraction.)

**The Sheliak repair (1998).** Sheliak ("Delineation, Specification,
and Formalization of the TWZ Data Set Generation Process" — decoded
text in [../reference/](../reference/)) rebuilt the pipeline with
vector notation, confirmed Watkins' finding of a procedural error,
removed it, and produced a mathematically clean 384-set. McKenna
adopted it enthusiastically ("Timewave One"), citing improved fit —
e.g. around WWII. That three very different curves each "fit history"
is this project's central exhibit on the theory's unfalsifiability.

**Meyer's own verdict (post-2012).** The man who wrote the software:
the mathematics is valid, *and* "the Timewave theory does not specify
the zero point" — there was never a basis for reading Hiroshima as the
final cycle's opening, hence never a derived end date, hence no
prediction. The theory's sole empirical anchor was a free parameter.

**The zero date paper trail (Meyer, 1999/2006).** Hiroshima
(1945-08-06) + 67.29 years → mid-November 2012 (McKenna's 66th birthday
was 2012-11-16); learning that Maya Long Count scholarship put the
13-b'aktun end at late December 2012, McKenna moved to Dec 22, then
(~1991) Dec 21. The move broke the Hiroshima alignment: with zero at
Dec 21 2012, the final 67.29-year cycle opens 1945-09-08 — a month
*after* the bomb. Wikipedia adds the standard external critiques:
eye-fit correlations, Eurocentric event selection, chronology errors
(e.g. *Homo sapiens*' emergence off by tens of millennia).

## Repository ↔ source map

| This repo | Derived from |
|---|---|
| `src/timewave.mts` | `twz-generator.c` (Meyer, public domain, via kl4yfd/timewave_z3r0) |
| `data/numbersets.json` | `DATA/DATA.TW1–4` (same source) |
| `data/kingwen.json` | Standard King Wen order; structure validated against McKenna's claimed properties + Wikipedia's King Wen article ✓ |
| `test/oracle/*.csv` | Output of the original C, compiled locally (clang, macOS) |
| `reference/` | Local study copies: McKenna's derivation essay (with Table 2), Sheliak's paper (font-decoded), original C + data |

## Open questions / next research targets

1. Replicate the 384-derivation pipeline (Phase 2) and McKenna's
   1-in-3770 Monte Carlo claim.
2. The exact Kelley "half twist" recipe end-to-end — Watkins' PDF
   (`McKenna's TimeWave Examined.pdf` in the kl4yfd repo) has the full
   formula; needs OCR-quality extraction.
3. The Huang Ti hexagram sequence's identity and provenance.
4. McKenna's *own* claimed historical correlations, from lecture
   recordings and the TWZ manual's example screens — the future
   "McKenna's readings" data layer, with citations per event.
5. The original DOS software (archive.org has `twz_20200405`) run in
   DOSBox for UI reference: screen layouts, resonance displays, the
   trigrammatic/hexagrammatic resonance features Meyer added in 1991.
6. Watkins' 2010 retrospective ("Autopsy" hosting at fourmilab; his
   later notes) and Dennis McKenna's post-mortem view of the theory.

## Sources

Primary:
- Peter Meyer, [The Mathematical Definition of the Timewave](https://www.fractal-timewave.com/articles/math_10.html); [The Four Number Sets](https://www.fractal-timewave.com/articles/four_number_sets.htm); [History of the Timewave Zero Software](https://fractal-timewave.com/articles/hist.html); [The Zero Date](https://www.fractal-timewave.com/articles/zerodate_10.html); [Timewave Zero — the Final Explanation](https://www.fractal-timewave.com/articles/timewave-zero-final-explanation.htm); [The Mathematics of Timewave Zero](https://www.fractal-timewave.com/articles/math_twz_10.htm) (full text also as [PDF](https://priory-of-sion.com/biblios/links/zero.pdf))
- Terence McKenna, *Derivation of the Timewave from the King Wen Sequence of Hexagrams* (levity.com/eschaton/waveexplain.html; local copy in reference/)
- Matthew Watkins, [Autopsy for a Mathematical Hallucination?](https://www.fourmilab.ch/rpkp/autopsy.html) (also [at fractal-timewave.com](https://fractal-timewave.com/articles/autopsy_10.html))
- John Sheliak, *Delineation, Specification, and Formalization of the TWZ Data Set Generation Process* ([levity.com/eschaton/sheliak/](http://www.levity.com/eschaton/sheliak/) — TLS-broken; local decoded copy in reference/)
- John A. Phelps (kl4yfd), [timewave_z3r0](https://github.com/kl4yfd/timewave_z3r0) — public-domain release of Meyer's C code + the four data sets + reference PDFs
- [Time Wave Zero software on archive.org](https://archive.org/details/twz_20200405)

Secondary:
- [Terence McKenna — Wikipedia](https://en.wikipedia.org/wiki/Terence_McKenna) (biography, La Chorrera, reception/criticism)
- [King Wen sequence — Wikipedia](https://en.wikipedia.org/wiki/King_Wen_sequence) (pairing rules, transition statistics)
- [The Watkins Objection — Reality Sandwich](https://realitysandwich.com/watkins_objection/); [RPKP Update No. 7](https://www.fourmilab.ch/rpkp/update7.html) (McKenna's "the formula produces correct values")
- [Novelty Theory Bombshell — Levity](http://www.levity.com/eschaton/bombshell.html); [Sheliak foreword](http://www.levity.com/eschaton/sheliak/foreword.html)
