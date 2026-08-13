import "./style.css";
import { makeWave, DAY_MS, ZERO_DATE_MS, type Wave } from "../timewave.mts";
import { Camera } from "./camera.mts";
import { Renderer, type PlacedEv, type Hexagram } from "./render.mts";
import { fmtDateAt, fmtValue, dateOf, isoDate, parseIsoUtc } from "./format.mts";
import {
  personalZeroMs, clampSlide, serialize, deserialize,
  type PersonalState,
} from "./personal.mts";
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
  personal: null as PersonalState | null,
  personalOn: false,
};
let placed: PlacedEv[] = [];

// ---------- "your wave" state ----------
const PKEY = "twz-your-wave-v1";
const activePersonal = (): PersonalState | null =>
  state.personalOn ? state.personal : null;
const epochMs = (): number => {
  const p = activePersonal();
  return p ? personalZeroMs(p) : ZERO_DATE_MS;
};

// the zero-terminus caption only changes when the epoch does
let zeroLabelCache = { ep: NaN, label: "" };
const zeroLabelFor = (ep: number): string => {
  if (zeroLabelCache.ep !== ep) {
    zeroLabelCache = { ep, label: `Y O U R  Z E R O · ${isoDate(ep)}` };
  }
  return zeroLabelCache.label;
};

function savePersonal(): void {
  if (!state.personal) return;
  if (state.personalOn) state.personal.view = { c: cam.center, s: cam.span };
  localStorage.setItem(PKEY, JSON.stringify({ v: 1, on: state.personalOn, ...state.personal }));
}

function loadPersonal(): void {
  const raw = localStorage.getItem(PKEY);
  if (!raw) return;
  const p = deserialize(raw);
  if (!p) return;
  state.personal = p;
  try {
    state.personalOn = (JSON.parse(raw) as { on?: unknown }).on === true;
  } catch { /* mode stays off */ }
}

/** Change the zero epoch while keeping the same real dates in view. */
function withStableDates(mutate: () => void): void {
  const before = epochMs();
  mutate();
  const shift = (epochMs() - before) / DAY_MS;
  if (shift !== 0) cam.setView(cam.center + shift, cam.span, true);
  state.hover = null;   // a hover x means something else under a new epoch
  state.hoverEv = null;
  updateReadout();      // hide the readout too — its text belonged to the old epoch
  savePersonal();
  state.dirty = true;
}

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
    // checked at fire time, not schedule time: a timer armed just before
    // entering personal mode must not leak personal-frame coordinates
    if (state.personalOn) { savePersonal(); return; } // persist the personal view instead
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
  const ep = epochMs();
  const yours = activePersonal();
  placed = renderer.draw(cam, {
    wave: waveFor(state.set),
    hue: HUES[state.set],
    hexagrams: HEXAGRAMS,
    nowX: (ep - Date.now()) / DAY_MS,
    epochMs: ep,
    zeroLabel: yours ? zeroLabelFor(ep) : "Z E R O · 2012-12-21",
    voidTitle: yours ? "beyond your cycle" : "the void",
    voidSub: yours ? "the wave ends; you continue" : "after the end of history",
    personalEvents: yours ? yours.events : null,
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
  const x = h.x, span = cam.span, ep = epochMs();
  ro.date.textContent = fmtDateAt(x, span, ep);
  if (x >= 0) {
    ro.val.textContent = `wave value ${fmtValue(waveFor(state.set)(x))}`;
    const p = 383 - (Math.floor(x) % 384);
    const hex = HEXAGRAMS[Math.floor(p / 6)]!;
    ro.hex.textContent = `${hex.unicode} ${hex.kw} ${hex.pinyin} · ${hex.english} — line ${(p % 6) + 1}`;
    ro.res.textContent = `resonates ⇡64 ${fmtDateAt(x * 64, span * 64, ep)} · ⇣64 ${fmtDateAt(x / 64, span / 64, ep)}`;
  } else {
    ro.val.textContent = state.personalOn
      ? "beyond your cycle — the wave has ended"
      : "the wave is not defined after zero";
    ro.hex.textContent = "—";
    ro.res.textContent = "";
  }
  if (state.hoverEv?.ev) {
    const e = state.hoverEv.ev;
    ro.ev.hidden = false;
    // real calendar date, epoch-free — "days after zero" phrasing would be
    // ambiguous when a personal zero and McKenna's share the panel
    ro.ev.textContent = `${e.mk ? "◆" : "●"} ${e.label} — ${isoDate(ZERO_DATE_MS - e.x * DAY_MS)}`;
  } else if (state.hoverEv?.user) {
    const u = state.hoverEv.user;
    ro.ev.hidden = false;
    ro.ev.textContent = `■ ${u.label} — ${isoDate(u.t)} · click to edit`;
  } else ro.ev.hidden = true;
}

// ---------- pointer interaction ----------
const pointers = new Map<number, { x: number; y: number }>();
let dragging = false;
let dragMoved = false;

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  dragging = true;
  dragMoved = false;
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
    if (Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y) > 2) dragMoved = true;
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

canvas.addEventListener("click", (e) => {
  const p = activePersonal();
  if (dragMoved || !p) return;
  // radius matches the hover hit test, so "click to edit" is never a lie
  const hit = placed.find((q) => q.user && Math.hypot(q.px - e.clientX, q.py - e.clientY) < 13);
  if (hit?.user) {
    openEventDialog(hit.user.t, p.events.indexOf(hit.user));
  } else if (e.shiftKey) {
    openEventDialog(dateOf(cam.xAt(e.clientX), epochMs()).getTime(), null);
  }
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

// ---------- your wave: UI ----------
const ywBtn = document.getElementById("your-wave-btn")!;
const panel = document.getElementById("personal")!;
const pBirth = document.getElementById("p-birth") as HTMLInputElement;
const pZero = document.getElementById("p-zero")!;
const pDialog = document.getElementById("p-dialog")!;
const pEvDate = document.getElementById("p-ev-date") as HTMLInputElement;
const pEvLabel = document.getElementById("p-ev-label") as HTMLInputElement;
const pEvDelete = document.getElementById("p-ev-delete")!;
let editIndex: number | null = null;

function updatePersonalUi(): void {
  const p = state.personal;
  pBirth.value = p ? isoDate(p.birthMs) : "";
  pZero.textContent = p
    ? `your zero: ${isoDate(personalZeroMs(p))}` +
      (p.slideDays ? ` (anchor slid ${p.slideDays > 0 ? "+" : ""}${p.slideDays}d)` : "") +
      ` · ${p.events.length} event${p.events.length === 1 ? "" : "s"}`
    : "enter a birthday — your zero lands one full cycle (24,576 days) later";
  ywBtn.classList.toggle("on", state.personalOn);
}

function setPersonalMode(on: boolean): void {
  if (on && !state.personal) {
    panel.hidden = false;
    updatePersonalUi();
    pBirth.focus();
    return; // engages for real once a birthday is entered
  }
  withStableDates(() => { state.personalOn = on; });
  panel.hidden = !on;
  updatePersonalUi();
  updateReadout();
}
// one toggle rule everywhere: the panel visible (mode on, or setup pending)
// means the next press closes it — keyboard and button must agree
ywBtn.addEventListener("click", () => setPersonalMode(panel.hasAttribute("hidden")));
document.getElementById("p-exit")!.addEventListener("click", () => setPersonalMode(false));

pBirth.addEventListener("change", () => {
  const t = parseIsoUtc(pBirth.value);
  if (!Number.isFinite(t)) return;
  withStableDates(() => {
    if (state.personal) state.personal.birthMs = t;
    else state.personal = { birthMs: t, slideDays: 0, events: [] };
    state.personalOn = true;
  });
  updatePersonalUi();
});

for (const b of panel.querySelectorAll<HTMLButtonElement>("[data-slide]")) {
  b.addEventListener("click", () => {
    if (!state.personal) return;
    withStableDates(() => {
      state.personal!.slideDays = clampSlide(state.personal!.slideDays + Number(b.dataset.slide));
    });
    updatePersonalUi();
  });
}
document.getElementById("p-reset")!.addEventListener("click", () => {
  if (!state.personal) return;
  withStableDates(() => { state.personal!.slideDays = 0; });
  updatePersonalUi();
});

function openEventDialog(dateMs: number, index: number | null): void {
  // deep-time clicks (e.g. shift-click at the "All time" zoom) map to dates
  // no Date can represent; isoDate would throw, so decline quietly
  if (!Number.isFinite(dateMs) || Math.abs(dateMs) > 8.64e15) return;
  editIndex = index;
  document.getElementById("p-dialog-title")!.textContent = index === null ? "Add event" : "Edit event";
  pEvDelete.hidden = index === null;
  pEvDate.value = isoDate(dateMs);
  pEvLabel.value = index !== null ? state.personal?.events[index]?.label ?? "" : "";
  pDialog.hidden = false;
  pEvLabel.focus();
}
function closeEventDialog(): void { pDialog.hidden = true; editIndex = null; }

document.getElementById("p-ev-save")!.addEventListener("click", () => {
  if (!state.personal) return;
  const t = parseIsoUtc(pEvDate.value);
  const label = pEvLabel.value.trim().slice(0, 120);
  if (!Number.isFinite(t) || !label) return;
  if (editIndex !== null) state.personal.events[editIndex] = { label, t };
  else state.personal.events.push({ label, t });
  state.personal.events.sort((a, b) => a.t - b.t);
  savePersonal();
  state.dirty = true;
  closeEventDialog();
  updatePersonalUi();
});
document.getElementById("p-ev-cancel")!.addEventListener("click", closeEventDialog);
pEvDelete.addEventListener("click", () => {
  if (state.personal && editIndex !== null) {
    state.personal.events.splice(editIndex, 1);
    savePersonal();
    state.dirty = true;
  }
  closeEventDialog();
  updatePersonalUi();
});
document.getElementById("p-add")!.addEventListener("click", () => {
  if (!state.personal) { pBirth.focus(); return; }
  openEventDialog(dateOf(cam.center, epochMs()).getTime(), null);
});
document.getElementById("p-export")!.addEventListener("click", () => {
  if (!state.personal) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([serialize(state.personal)], { type: "application/json" }));
  a.download = "your-wave.json";
  a.click();
  URL.revokeObjectURL(a.href);
});
const pFile = document.getElementById("p-file") as HTMLInputElement;
document.getElementById("p-import")!.addEventListener("click", () => pFile.click());
pFile.addEventListener("change", async () => {
  const f = pFile.files?.[0];
  pFile.value = "";
  if (!f) return;
  const p = deserialize(await f.text());
  if (!p) { pZero.textContent = "couldn't read that file"; return; }
  withStableDates(() => { state.personal = p; state.personalOn = true; });
  panel.hidden = false;
  updatePersonalUi();
});

// ---------- keyboard ----------
window.addEventListener("keydown", (e) => {
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
    if (e.key === "Escape") closeEventDialog();
    return;
  }
  if (e.key === "Escape") {
    if (!pDialog.hidden) closeEventDialog();
    else if (!about.hidden) openAbout(false);
    else if (!panel.hidden) setPersonalMode(false);
    return;
  }
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
  else if (e.key === "y") setPersonalMode(panel.hasAttribute("hidden"));
  else return;
  e.preventDefault();
});

// ---------- boot ----------
resize();
loadPersonal();
const hadHash = readHash();
if (state.personalOn && state.personal) {
  if (hadHash) {
    // an explicit shared link wins: its coordinates are historical-epoch,
    // so shift the same real dates into the personal frame
    cam.setView(cam.center + (epochMs() - ZERO_DATE_MS) / DAY_MS, cam.span, true);
  } else if (state.personal.view) {
    cam.setView(state.personal.view.c, state.personal.view.s, true);
  } else {
    cam.setView(VIEWS.history!.c + (epochMs() - ZERO_DATE_MS) / DAY_MS, VIEWS.history!.s, true);
  }
  panel.hidden = false;
} else if (!hadHash) {
  presetBtns.find((b) => b.dataset.view === "history")?.classList.add("on");
}
updatePersonalUi();
selectSet(state.set, false);
if (!localStorage.getItem("twz-seen")) {
  openAbout(true);
  localStorage.setItem("twz-seen", "1");
}
requestAnimationFrame(frame);
