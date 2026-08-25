import "./style.css";
import { makeWave, daysBeforeZero, type Wave } from "../timewave.mts";
import { Camera } from "./camera.mts";
import { Renderer, type PlacedEv, type Hexagram } from "./render.mts";
import { startTour } from "./tour.mts";
import { fmtDateAt, fmtValue } from "./format.mts";
import numbersetsJson from "../../data/numbersets.json";
import kingwenJson from "../../data/kingwen.json";

type SetName = "kelley" | "watkins" | "sheliak" | "huangti";
const SETS = numbersetsJson.sets as Record<SetName, number[]>;
const HEXAGRAMS = kingwenJson.hexagrams as Hexagram[];
const HUES: Record<SetName, string> = {
  kelley: "#c98500", watkins: "#199e70", sheliak: "#d95926", huangti: "#3987e5",
};
const VIEWS: Record<string, { c: number; s: number }> = {
  all: { c: 1.35e13, s: 2.9e13 },
  history: { c: 7.9e5, s: 1.63e6 },
  modern: { c: 12100, s: 26200 },
  year: { c: 190, s: 405 },
  terminus: { c: 1.55, s: 3.5 },
  void: { c: -1750, s: 7600 },
};

const canvas = document.getElementById("wave") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const cam = new Camera(VIEWS.history!.c, VIEWS.history!.s);

const waves = new Map<SetName, Wave>();
const waveFor = (s: SetName): Wave => {
  let w = waves.get(s);
  if (!w) { w = makeWave(SETS[s]); waves.set(s, w); }
  return w;
};

const state = {
  set: "kelley" as SetName,
  hover: null as { px: number; x: number } | null,
  hoverEv: null as PlacedEv | null,
  ghost: null as { canvas: HTMLCanvasElement; t0: number } | null,
  dirty: true,
};
let placed: PlacedEv[] = [];

// ---------- hash state ----------
function readHash(): boolean {
  const m = new URLSearchParams(location.hash.slice(1));
  const x = Number(m.get("x")), s = Number(m.get("s"));
  const set = m.get("set") as SetName | null;
  if (set && SETS[set]) selectSet(set, false);
  if (Number.isFinite(x) && Number.isFinite(s) && s > 0) {
    cam.setView(x, s, true);
    return true;
  }
  return false;
}
let hashTimer = 0;
function writeHash(): void {
  clearTimeout(hashTimer);
  hashTimer = window.setTimeout(() => {
    const h = `x=${cam.center.toPrecision(8)}&s=${cam.span.toPrecision(5)}&set=${state.set}`;
    history.replaceState(null, "", `#${h}`);
  }, 500);
}

// ---------- sizing ----------
function resize(): void {
  const w = window.innerWidth, h = window.innerHeight;
  cam.width = w;
  renderer.resize(w, h, Math.min(2.5, window.devicePixelRatio || 1));
  state.dirty = true;
}
window.addEventListener("resize", resize);

// ---------- render loop ----------
function drawScene(ghostLive = false): void {
  placed = renderer.draw(cam, {
    wave: waveFor(state.set),
    hue: HUES[state.set],
    hexagrams: HEXAGRAMS,
    nowX: daysBeforeZero(Date.now()),
    hover: state.hover,
    hoverEv: state.hoverEv,
    ghost: ghostLive ? state.ghost : null,
  });
  state.dirty = false;
}

let last = performance.now();
function frame(now: number): void {
  const dt = now - last;   // unclamped: exponential approach is stable for any dt
  last = now;
  const moving = cam.tick(dt);
  const ghostLive = !!state.ghost && now - state.ghost.t0 < 1400;
  if (moving || renderer.unsettled || ghostLive || state.dirty) {
    drawScene(ghostLive);
    if (!moving) writeHash();
    if (!ghostLive) state.ghost = null;
  }
  requestAnimationFrame(frame);
}

// debug/automation hook
Object.assign(window as unknown as Record<string, unknown>, {
  __twz: {
    cam, state, selectSet,
    snap(c: number, s: number): void { cam.setView(c, s, true); drawScene(); },
    draw(): void { drawScene(); },
  },
});

// ---------- readout ----------
const ro = {
  box: document.getElementById("readout")!,
  date: document.getElementById("ro-date")!,
  val: document.getElementById("ro-val")!,
  hex: document.getElementById("ro-hex")!,
  res: document.getElementById("ro-res")!,
  ev: document.getElementById("ro-ev")!,
};
function updateReadout(): void {
  const h = state.hover;
  if (!h) { ro.box.hidden = true; return; }
  ro.box.hidden = false;
  const x = h.x, span = cam.span;
  ro.date.textContent = fmtDateAt(x, span);
  if (x >= 0) {
    ro.val.textContent = `wave value ${fmtValue(waveFor(state.set)(x))}`;
    const p = 383 - (Math.floor(x) % 384);
    const hex = HEXAGRAMS[Math.floor(p / 6)]!;
    ro.hex.textContent = `${hex.unicode} ${hex.kw} ${hex.pinyin} · ${hex.english} — line ${(p % 6) + 1}`;
    ro.res.textContent = `resonates ⇡64 ${fmtDateAt(x * 64, span * 64)} · ⇣64 ${fmtDateAt(x / 64, span / 64)}`;
  } else {
    ro.val.textContent = "the wave is not defined after zero";
    ro.hex.textContent = "—";
    ro.res.textContent = "";
  }
  if (state.hoverEv) {
    ro.ev.hidden = false;
    const e = state.hoverEv.ev;
    ro.ev.textContent = `${e.mk ? "◆" : "●"} ${e.label} — ${fmtDateAt(e.x, 40)}`;
  } else ro.ev.hidden = true;
}

// ---------- pointer interaction ----------
const pointers = new Map<number, { x: number; y: number }>();
let dragging = false;

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  dragging = true;
  canvas.classList.add("dragging");
});
canvas.addEventListener("pointermove", (e) => {
  const prev = pointers.get(e.pointerId);
  if (prev && dragging) {
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const otherId = [...pointers.keys()].find((id) => id !== e.pointerId)!;
      const other = pointers.get(otherId)!;
      const d0 = Math.abs(a!.x - b!.x) || 1;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const d1 = Math.abs(e.clientX - other.x) || 1;
      const mid = (e.clientX + other.x) / 2;
      cam.zoomAt(mid, -Math.log2(d1 / d0));
    } else {
      cam.panPx(e.clientX - prev.x);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    clearPresetHighlight();
  }
  state.hover = { px: e.clientX, x: cam.xAt(e.clientX) };
  state.hoverEv =
    placed.find((p) => Math.hypot(p.px - e.clientX, p.py - e.clientY) < 13) ?? null;
  updateReadout();
  state.dirty = true;
});
const endPointer = (e: PointerEvent): void => {
  pointers.delete(e.pointerId);
  if (pointers.size === 0) { dragging = false; canvas.classList.remove("dragging"); }
};
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("pointerleave", () => {
  state.hover = null; state.hoverEv = null;
  updateReadout(); state.dirty = true;
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const dLog2 = e.deltaY * (e.ctrlKey ? 0.012 : 0.0028);
  cam.zoomAt(e.clientX, dLog2);
  clearPresetHighlight();
}, { passive: false });

canvas.addEventListener("dblclick", (e) => {
  cam.zoomAt(e.clientX, -1);
  clearPresetHighlight();
});

// ---------- resonance jump ----------
function resonate(dir: 1 | -1): void {
  const snap = document.createElement("canvas");
  snap.width = canvas.width; snap.height = canvas.height;
  snap.getContext("2d")!.drawImage(canvas, 0, 0);
  state.ghost = { canvas: snap, t0: performance.now() };
  cam.resonate(dir);
  clearPresetHighlight();
}
document.getElementById("res-up")!.addEventListener("click", () => resonate(1));
document.getElementById("res-down")!.addEventListener("click", () => resonate(-1));

// ---------- presets & sets ----------
const presetBtns = [...document.querySelectorAll<HTMLButtonElement>("#presets button")];
function clearPresetHighlight(): void {
  presetBtns.forEach((b) => b.classList.remove("on"));
}
for (const b of presetBtns) {
  b.addEventListener("click", () => {
    const v = VIEWS[b.dataset.view!]!;
    cam.setView(v.c, v.s);
    clearPresetHighlight();
    b.classList.add("on");
  });
}

const setBtns = [...document.querySelectorAll<HTMLButtonElement>("#sets button")];
function selectSet(s: SetName, redraw = true): void {
  state.set = s;
  document.documentElement.style.setProperty("--wave", HUES[s]);
  setBtns.forEach((b) => b.classList.toggle("on", b.dataset.set === s));
  if (redraw) { state.dirty = true; writeHash(); }
}
for (const b of setBtns) {
  b.addEventListener("click", () => selectSet(b.dataset.set as SetName));
}

// ---------- about ----------
const about = document.getElementById("about")!;
const openAbout = (open: boolean): void => { about.hidden = !open; };
document.getElementById("about-btn")!.addEventListener("click", () =>
  openAbout(about.hasAttribute("hidden")));
document.getElementById("about-close")!.addEventListener("click", () => openAbout(false));
about.addEventListener("click", (e) => { if (e.target === about) openAbout(false); });

// ---------- tour ----------
function launchTour(): void {
  openAbout(false);
  startTour({
    goView(name) {
      const v = VIEWS[name]!;
      cam.setView(v.c, v.s, true);
      clearPresetHighlight();
      state.dirty = true;
    },
    rectFor(zone) {
      const W = window.innerWidth, H = window.innerHeight;
      const plotTop = 56, axis = 44, band = 30;
      if (zone === "band") return { left: 0, top: H - axis - band - 10, width: W, height: band + 14 };
      if (zone === "terminus") {
        const px0 = cam.pxAt(0);
        return { left: px0 - 90, top: plotTop, width: 180, height: H - plotTop - axis };
      }
      return { left: 8, top: plotTop + 8, width: W - 16, height: H - plotTop - axis - 16 };
    },
    onDone() { localStorage.setItem("twz-toured", "1"); },
  });
}
document.getElementById("tour-btn")!.addEventListener("click", launchTour);

// ---------- keyboard ----------
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { openAbout(false); return; }
  if (!about.hidden) return;
  const views = ["all", "history", "modern", "year", "terminus", "void"];
  if (e.key >= "1" && e.key <= "6") {
    const v = VIEWS[views[Number(e.key) - 1]!]!;
    cam.setView(v.c, v.s); clearPresetHighlight();
  } else if (e.key === "r") resonate(1);
  else if (e.key === "R") resonate(-1);
  else if (e.key === "+" || e.key === "=") cam.zoomAt(cam.width / 2, -0.5);
  else if (e.key === "-") cam.zoomAt(cam.width / 2, 0.5);
  else if (e.key === "ArrowLeft") cam.panPx(cam.width / 8);
  else if (e.key === "ArrowRight") cam.panPx(-cam.width / 8);
  else if (e.key === "t") launchTour();
  else return;
  e.preventDefault();
});

// ---------- boot ----------
resize();
const hadHash = readHash();
if (!hadHash) presetBtns.find((b) => b.dataset.view === "history")?.classList.add("on");
selectSet(state.set, false);
if (!localStorage.getItem("twz-seen")) {
  openAbout(true);
  localStorage.setItem("twz-seen", "1");
}
requestAnimationFrame(frame);
