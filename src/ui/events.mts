/** Curated event layer, tier 0 (always shown) → 3 (fine zoom only).
 * mk marks McKenna's own story and readings; v marks post-zero (void) events. */
import { daysBeforeZero } from "../timewave.mts";
import { YEAR } from "./format.mts";

export interface Ev {
  label: string;
  x: number;       // days before zero
  tier: 0 | 1 | 2 | 3;
  mk?: boolean;    // McKenna layer
  v?: boolean;     // void (after zero)
}

const ya = (years: number): number => years * YEAR;               // years before zero
const iso = (s: string): number => daysBeforeZero(Date.parse(`${s}T00:00:00Z`));
function bce(yearBce: number): number {                            // mid-year is fine at this scale
  const d = new Date(0);
  d.setUTCFullYear(1 - yearBce, 5, 15);
  return daysBeforeZero(d.getTime());
}

const E = (label: string, x: number, tier: Ev["tier"], flags: Partial<Ev> = {}): Ev =>
  ({ label, x, tier, ...flags });

export const EVENTS: Ev[] = [
  // deep time
  E("Big Bang", ya(13.8e9), 0),
  E("Milky Way forms", ya(13.6e9), 2),
  E("Sun ignites", ya(4.6e9), 1),
  E("Earth forms", ya(4.54e9), 0),
  E("First life", ya(3.8e9), 0),
  E("Photosynthesis", ya(3.4e9), 2),
  E("Great Oxidation", ya(2.4e9), 1),
  E("Eukaryotic cells", ya(1.8e9), 2),
  E("Multicellular life", ya(600e6), 1),
  E("Cambrian explosion", ya(538e6), 0),
  E("Land plants", ya(470e6), 1),
  E("Tetrapods ashore", ya(375e6), 2),
  E("Permian extinction", ya(252e6), 1),
  E("First dinosaurs", ya(233e6), 2),
  E("End of the dinosaurs", ya(66e6), 0),
  E("First primates", ya(55e6), 1),
  E("Hominins diverge", ya(7e6), 1),
  E("Australopithecus", ya(3.9e6), 2),
  E("Homo erectus", ya(1.9e6), 2),
  E("Control of fire", ya(1e6), 1),
  E("Homo sapiens", ya(300e3), 0),
  E("Out of Africa", ya(70e3), 1),
  E("Cave painting", ya(40e3), 1),
  E("End of the Ice Age", ya(11700), 1),
  // history
  E("Göbekli Tepe", bce(9500), 2),
  E("Agriculture", ya(11500), 0),
  E("First cities", bce(4000), 1),
  E("Writing", bce(3200), 0),
  E("Great Pyramid", bce(2560), 1),
  E("Hammurabi's code", bce(1754), 2),
  E("King Wen orders the hexagrams (trad.)", bce(1050), 1, { mk: true }),
  E("The Buddha", bce(480), 1),
  E("Socrates dies", bce(399), 2),
  E("Alexander dies", bce(323), 2),
  E("Caesar assassinated", bce(44), 2),
  E("Constantine converts", iso("0312-10-28"), 2),
  E("Rome falls", iso("0476-09-04"), 1),
  E("The Hijra", iso("0622-07-16"), 2),
  E("Charlemagne crowned", iso("0800-12-25"), 2),
  E("Movable type (Bi Sheng)", iso("1045-06-15"), 2),
  E("Genghis Khan", iso("1206-06-15"), 2),
  E("Black Death", iso("1347-10-01"), 2),
  E("Constantinople falls", iso("1453-05-29"), 2),
  E("Gutenberg Bible", iso("1454-06-15"), 1),
  E("Columbus lands", iso("1492-10-12"), 1),
  E("Luther's theses", iso("1517-10-31"), 2),
  E("De revolutionibus", iso("1543-05-15"), 2),
  E("Principia", iso("1687-07-05"), 1),
  E("Watt's steam engine", iso("1769-01-05"), 2),
  E("US independence", iso("1776-07-04"), 2),
  E("French Revolution", iso("1789-07-14"), 1),
  E("First railway", iso("1825-09-27"), 2),
  E("Telegraph", iso("1844-05-24"), 2),
  E("On the Origin of Species", iso("1859-11-24"), 1),
  E("Telephone", iso("1876-03-10"), 2),
  E("Kitty Hawk", iso("1903-12-17"), 2),
  E("Special relativity", iso("1905-06-30"), 1),
  E("WWI begins", iso("1914-07-28"), 1),
  E("October Revolution", iso("1917-11-07"), 2),
  E("Penicillin", iso("1928-09-28"), 2),
  E("Turing's paper", iso("1936-05-28"), 2),
  E("WWII begins", iso("1939-09-01"), 1),
  E("Trinity test", iso("1945-07-16"), 1, { mk: true }),
  E("Hiroshima", iso("1945-08-06"), 0, { mk: true }),
  E("Transistor", iso("1947-12-16"), 2),
  E("Structure of DNA", iso("1953-04-25"), 1),
  E("Sputnik", iso("1957-10-04"), 1),
  E("Laser", iso("1960-05-16"), 2),
  E("JFK assassinated", iso("1963-11-22"), 2),
  E("Summer of Love", iso("1967-06-01"), 1, { mk: true }),
  E("Moon landing", iso("1969-07-20"), 0),
  E("ARPANET's first link", iso("1969-10-29"), 1),
  E("The experiment at La Chorrera", iso("1971-03-04"), 0, { mk: true }),
  E("The Invisible Landscape", iso("1975-06-15"), 1, { mk: true }),
  E("Apple II", iso("1977-06-10"), 2),
  E("IBM PC", iso("1981-08-12"), 2),
  E("Timewave Zero software", iso("1987-07-01"), 1, { mk: true }),
  E("Harmonic Convergence", iso("1987-08-16"), 2, { mk: true }),
  E("Berlin Wall falls", iso("1989-11-09"), 1),
  E("World Wide Web", iso("1991-08-06"), 1),
  E("The Watkins Objection", iso("1996-06-01"), 1, { mk: true }),
  E("Dolly the sheep", iso("1996-07-05"), 2),
  E("Fractal Time software", iso("1998-01-05"), 2, { mk: true }),
  E("Google", iso("1998-09-04"), 2),
  E("McKenna diagnosed", iso("1999-05-22"), 2, { mk: true }),
  E("McKenna dies", iso("2000-04-03"), 0, { mk: true }),
  E("9/11", iso("2001-09-11"), 1),
  E("iPhone", iso("2007-01-09"), 1),
  E("Financial crisis", iso("2008-09-15"), 2),
  E("Bitcoin genesis block", iso("2009-01-03"), 1),
  E("Higgs boson", iso("2012-07-04"), 1),
  // the void
  E("Gravitational waves", iso("2015-09-14"), 1, { v: true }),
  E("AlphaGo", iso("2016-03-15"), 2, { v: true }),
  E("COVID-19 pandemic", iso("2020-03-11"), 1, { v: true }),
  E("JWST launches", iso("2021-12-25"), 2, { v: true }),
  E("ChatGPT", iso("2022-11-30"), 1, { v: true }),
].sort((a, b) => b.x - a.x);
