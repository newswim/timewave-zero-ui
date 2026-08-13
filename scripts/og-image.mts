/** Generates the Open Graph card (1200×630) as SVG on stdout: the History
 * view's great arc, rendered from the real engine — the same curve the
 * site draws, not an illustration of it.
 *
 *   node scripts/og-image.mts > og.svg
 *   qlmanage -t -s 1200 -o . og.svg   # macOS: rasterize → og.svg.png
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { makeWave } from "../src/timewave.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { sets } = JSON.parse(readFileSync(join(root, "data/numbersets.json"), "utf8")) as
  { sets: Record<string, number[]> };
const f = makeWave(sets.kelley!);

const W = 1200, H = 630;
const TOP = 150, BOT = 560;                    // plot band, headroom for the title
const X0 = 1_600_000, X1 = -20_000;            // the History preset window, in days before zero

const px = (x: number): number => ((X0 - x) / (X0 - X1)) * W;

const n = 1400;
const pts: [number, number][] = [];
let max = 0;
for (let i = 0; i <= n; i++) {
  const x = X0 - ((X0 - X1) * i) / n;
  if (x < 0) break;
  const v = f(x);
  pts.push([px(x), v]);
  if (v > max) max = v;
}
const py = (v: number): number => BOT - (v / max) * (BOT - TOP) * 0.96;

const path = pts.map(([x, v], i) => `${i ? "L" : "M"}${x.toFixed(1)},${py(v).toFixed(1)}`).join("");
const zeroPx = px(0).toFixed(1);
const area = `${path}L${zeroPx},${BOT}L0,${BOT}Z`;

// --square: letterbox the card inside a 1200×1200 canvas (Quick Look's
// qlmanage rasterizes SVGs square; crop the middle 630 rows afterwards:
//   sips -c 630 1200 og.svg.png --out og.png
const square = process.argv.includes("--square");
const canvasH = square ? W : H;
const yOff = square ? (W - H) / 2 : 0;

process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${canvasH}" viewBox="0 0 ${W} ${canvasH}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d1120"/><stop offset="1" stop-color="#0a0d18"/>
    </linearGradient>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e2a223" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#e2a223" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop offset="0" stop-color="#e2a223" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#e2a223" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${canvasH}" fill="url(#bg)"/>
  <g transform="translate(0,${yOff})">
  <rect x="${zeroPx}" y="0" width="${(W - Number(zeroPx)).toFixed(1)}" height="${H}" fill="rgb(3,5,11)" fill-opacity="0.55"/>
  <circle cx="${zeroPx}" cy="${py(0).toFixed(1)}" r="130" fill="url(#glow)"/>
  <path d="${area}" fill="url(#fill)"/>
  <path d="${path}" fill="none" stroke="#e2a223" stroke-width="10" stroke-opacity="0.08" stroke-linejoin="round"/>
  <path d="${path}" fill="none" stroke="#e2a223" stroke-width="4.5" stroke-opacity="0.18" stroke-linejoin="round"/>
  <path d="${path}" fill="none" stroke="#e2a223" stroke-width="2.4" stroke-linejoin="round"/>
  <line x1="${zeroPx}" y1="0" x2="${zeroPx}" y2="${H}" stroke="#ffffff" stroke-opacity="0.3"/>
  <text x="60" y="104" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="58" font-weight="700"
        fill="#f2f4fa" style="letter-spacing:14px">TIMEWAVE ZERO</text>
  <text x="63" y="146" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="25"
        fill="#8a8fa3" style="letter-spacing:3px">a restoration</text>
  <text x="${W - 60}" y="112" text-anchor="end" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="72" fill="#c98500" fill-opacity="0.85">䷿</text>
  <text x="60" y="${H - 36}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="21"
        fill="#8a8fa3">McKenna's map of novelty, running again — honestly labeled</text>
  </g>
</svg>
`);
