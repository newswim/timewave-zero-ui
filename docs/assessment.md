# An assessment of Timewave Zero

*Written 2026-07-24, after recapitulating the software and reading the
primary sources. This is the project's founding read on the theory — the
argument for why it deserves restoration and what honesty about it
requires. Facts and citations are in [research.md](research.md).*

## What it actually is

Strip the mystique and Timewave Zero is an algorithm, and a fully
specified one — which already distinguishes it from nearly everything
else on the New Age shelf:

1. Take the 64 hexagrams in King Wen order. Count the lines that change
   at each of the 64 successive transitions (wrapping around) — the
   *first order of difference*, e.g. `6,2,4,4,4,3,2,4,…`
2. Through a geometric procedure — the difference graph superimposed on
   its own 180° rotation, copied at three scales (line, trigram,
   hexagram), quantified for skew and divergence — produce 384 integers.
   McKenna published them as Table 2 of his derivation essay; our
   validator confirms they are exactly the software's data.
3. Treat those 384 values as one period of a waveform, nest it in
   itself at scale ratio 64 (384 days, then 67.29 years, then 4,306
   years, then 275,586 years… up past the age of the universe), and sum
   the levels. The result is a single function `f(x)` of days-before-zero.
4. Read `f` as a graph of *habit* (high) versus *novelty* (low) across
   all of time, sliding toward a singularity — `f = 0`, infinite novelty,
   the eschaton — on December 21, 2012.

The number 384 is where the seduction starts: 64 hexagrams × 6 lines;
also 13 lunar months to within two hours. The whole construction has
this texture — correspondences that feel load-bearing and are not.

## What is genuinely there

**The King Wen sequence really is a designed object.** Our checks
confirm what McKenna noticed: every second hexagram is its
predecessor's 180° rotation (or line-complement for the eight
palindromes); the 64 difference values split exactly 48 even / 16 odd —
a perfect 3:1 — with the odd values being fourteen 3s and two 1s and
*no* fives. Whoever fixed this ordering three thousand years ago was
making choices. McKenna stared at a genuinely understudied combinatorial
artifact, asked a quantitative question about it, and even ran a
27,000-sequence Monte Carlo experiment (in the 1970s, as a psychedelic
ethnobotanist) to show the properties were rare. That is real, if
amateur, mathematics driven by real curiosity.

**The wave is a genuine fractal, early.** The construction defines an
exactly self-similar function — we prove `f(64x) = 64·f(x)` to machine
precision. The McKennas were building nested self-similar time out of a
divination text in 1971–74; Mandelbrot's word "fractal" appeared in
print in 1975. The mathematics is valid throughout (Meyer, who
formalized it, always maintained this) — it is the *interpretation*
that fails. Wrong theories built from sound mathematics are rare and
interesting objects.

**It is philosophy wearing a lab coat, and it says so.** "Novelty,"
"concrescence," "the ingression of novelty into time" — this is Alfred
North Whitehead's process philosophy, cited openly, wired to an
intuition that history accelerates toward a phase transition. A
generation later the same intuition, with silicon substituted for
psilocybin, became respectable as singularity discourse — Kurzweil's
asymptote in 2045 rhymes with McKenna's in 2012. Timewave Zero is the
psychedelic prefiguration of the Singularity, and seeing the two side
by side is clarifying about both.

**It is the taproot of "2012".** The Invisible Landscape (1975) and the
software carried the date into culture years before the Maya-calendar
industry existed; the pop-eschatology of the 2000s was substantially
downstream of this one man's lecture circuit. The theory is a
load-bearing artifact of late-20th-century counterculture — and,
unusually for a prophecy, it carried a falsification date and was
falsified on schedule, publicly, cleanly.

**It is software history.** The wave existed *as programs* for 25
years: FORTRAN on a CDC 6400 (~1974), Applesoft BASIC on an Apple II+
(1978–79), Meyer's Apple //e version (1987), the DOS `TIMEWAVE.EXE`
(1989–91), *Fractal Time* for Windows (1997–98). An eschatology
distributed as shareware is, as far as I can tell, a category with one
member. The platforms are dead; the C source survives, public domain.
Porting it faithfully is legitimate digital preservation.

## What is broken

**The construction contains an admitted arbitrary step.** The "half
twist" — a sign reversal applied to half the data mid-construction —
appears in the original algorithm with a footnote conceding its reason
"is not well understood." Matthew Watkins showed in 1996 that it is not
merely unexplained but *destroys* the geometric correspondence McKenna
claimed the construction preserved; the published wave does not follow
from the published procedure. McKenna, to his credit, engaged Watkins
seriously and conceded the mathematical point, then commissioned John
Sheliak's repair — and called the repaired wave an improvement.

**The repair is the tell.** Remove the half twist and 202 of the 384
values change. Sheliak's reconstruction differs from the original at
369 of 384 points, with a different range and mean. Three substantially
different waves — and each, in turn, was declared to fit history well.
A fitting procedure that cannot be failed by replacing the curve is not
measuring the curve.

**"Novelty" is never operationalized.** No units, no measurement
protocol, no pre-registered mapping from events to values. Fit was
judged by eye, by the theory's author, on log-scaled plots, with the
liberty to rescale and re-anchor. Under those liberties any quasi-random
self-similar curve "fits" any history.

**The zero date is imported, not derived.** The wave's shape fixes no
endpoint; the theory has one free parameter, and everything empirical
hangs on it. McKenna anchored it by declaring Hiroshima the opening of
the final 67.29-year cycle, landing in mid-November 2012 — days from
his own 66th birthday — then *moved* it to December 21, 2012 upon
learning that Maya Long Count scholarship placed the 13th b'aktun's end
there. The alignment that made the theory famous was an edit. (Moving
the date also quietly broke the Hiroshima calibration: the final cycle
now begins September 8, 1945, a month after the bomb.) Peter Meyer —
the man who wrote the software — reached the same verdict: the theory
does not specify its own zero point, and so predicts nothing.

**And the date passed.** December 21, 2012, 06:00, La Chorrera time:
no concrescence. McKenna had said for years that this was the risk a
real theory must take. He was twelve years dead when it took it.

## Verdict, and the case for restoration

As science, Timewave Zero is dead — refuted the honest way, by its own
date. As an artwork it was never more alive: a genuine fractal grown
from a 3,000-year-old text; a real mathematical controversy with an
objection, a concession, and a repair; Whitehead, the Amazon, DOS
shareware, and the fin-de-siècle hunger for an ending; all of it
authored by one of the great vernacular lecturers of the century, who
built a machine that said history stops in 2012 and then died in 2000
at fifty-three.

The right model is the museum's: restore it like an orrery or an
astrolabe — a beautiful, wrong model of the cosmos, running again at
full fidelity, labeled truthfully. Let people wind it. An orrery is not
diminished by heliocentrism being false to it; the timewave is not
served by pretending 2012 is still coming, nor by being reduced to a
cautionary tale. It is served by being *explorable* — because its one
true property, exact self-similarity, is an interface property. Zoom
is not chrome on this artifact; zoom is the thesis. An explorer whose
core verb is zooming — from the age of the universe down to the last
384 days, the same shape at every altitude, history pinned along the
descent — does not illustrate Timewave Zero. It *is* Timewave Zero,
finally in the medium it always wanted.

And the critique belongs inside the instrument, not beside it: a mode
where you drag the zero date and watch the "fit" survive — every event
still finding its dip, on any anchoring — teaches more epistemology in
ten seconds than an essay can. The restoration is honest exactly where
the original was not, and generous exactly where debunkings are not.

That is the project: fidelity, context, play. A working monument to the
edges of a mind worth keeping explorable.
