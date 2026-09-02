/** A small spotlight tour: dims the page, cuts a window around one element
 * or region at a time, and explains it in a card. No dependencies; builds
 * its own DOM and removes it completely when finished. */

export interface Rect { left: number; top: number; width: number; height: number }

export interface TourHooks {
  /** Snap the camera to a named preset before a step is shown. */
  goView(name: "history" | "modern" | "terminus"): void;
  /** Rectangles for canvas regions that have no DOM element. */
  rectFor(zone: "plot" | "band" | "terminus"): Rect;
  onDone(): void;
}

interface Step {
  title: string;
  body: string;
  target?: string | "plot" | "band" | "terminus";  // selector, canvas zone, or none (centered)
  view?: "history" | "modern" | "terminus";
  links?: boolean;
}

const STEPS: Step[] = [
  {
    title: "The timewave",
    body: "One line, from the age of the universe down to December 21, 2012. When the line is high, McKenna said, the world runs on habit; when it falls, novelty is pouring in. This tour takes about a minute.",
  },
  {
    title: "Four thousand years",
    view: "history",
    target: "plot",
    body: "This is the span McKenna showed most often: a Bronze Age peak, a long decline, and the final drop toward zero at the right edge. Drag to move through time. Scroll or pinch to zoom. That is the whole interface.",
  },
  {
    title: "Prepared views",
    target: "#presets",
    body: "Six saved viewpoints. History is home base; if you ever feel lost, press it. The void shows what comes after the end.",
  },
  {
    title: "The readout",
    target: "plot",
    body: "Rest your cursor anywhere on the wave and a small card appears with the date, the wave's value there, and the day's hexagram from the I Ching.",
  },
  {
    title: "Temporal resonance",
    view: "modern",
    target: "#resonance",
    body: "You are now at the final 67 years, 1945 to 2012. After the tour, press ⇡64: the view will widen 64 times and the curve will keep its exact shape. The wave repeats inside itself at every scale — McKenna called this temporal resonance, and it holds exactly; it is a provable property of the mathematics.",
  },
  {
    title: "Five versions of the numbers",
    target: "#sets",
    body: "The wave's 384 numbers were computed four times between 1975 and 1998, with real disagreements along the way, and all four grew from one seed: the raw King Wen wave, shown here in purple. Each button redraws the curve from one set; the card at the top right says what that set did to the seed.",
  },
  {
    title: "The last days",
    view: "terminus",
    target: "band",
    body: "Near the end, this strip names each six-day span after a hexagram. The sequence runs out on number 64, Before Completion, and the wave touches zero on the morning of December 21, 2012.",
  },
  {
    title: "Wander",
    body: "That's everything you need. The story, the mathematics, and the sources are on the About page; a printable walkthrough is in the Visitor's Guide.",
    links: true,
  },
];

let active = false;

export function startTour(hooks: TourHooks): void {
  if (active) return;
  active = true;

  const root = document.createElement("div");
  root.id = "tour";
  root.innerHTML = `
    <div class="tour-spot"></div>
    <div class="tour-card" role="dialog" aria-label="Tour">
      <h3></h3>
      <p></p>
      <p class="tour-links" hidden>
        <a href="/about.html">About the timewave</a> ·
        <a href="/guide.html">Visitor's Guide</a>
      </p>
      <div class="tour-nav">
        <span class="tour-dots"></span>
        <span class="tour-btns">
          <button class="tour-back">Back</button>
          <button class="tour-next">Next</button>
          <button class="tour-skip">Skip</button>
        </span>
      </div>
    </div>`;
  document.body.appendChild(root);

  const spot = root.querySelector<HTMLElement>(".tour-spot")!;
  const card = root.querySelector<HTMLElement>(".tour-card")!;
  const h3 = card.querySelector("h3")!;
  const p = card.querySelector("p")!;
  const links = card.querySelector<HTMLElement>(".tour-links")!;
  const dots = card.querySelector<HTMLElement>(".tour-dots")!;
  const back = card.querySelector<HTMLButtonElement>(".tour-back")!;
  const next = card.querySelector<HTMLButtonElement>(".tour-next")!;

  let i = 0;

  const rectOf = (step: Step): Rect | null => {
    if (!step.target) return null;
    if (step.target === "plot" || step.target === "band" || step.target === "terminus") {
      return hooks.rectFor(step.target);
    }
    const el = document.querySelector(step.target);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left - 6, top: r.top - 6, width: r.width + 12, height: r.height + 12 };
  };

  const show = (idx: number): void => {
    i = Math.max(0, Math.min(STEPS.length - 1, idx));
    const step = STEPS[i]!;
    if (step.view) hooks.goView(step.view);

    h3.textContent = step.title;
    p.textContent = step.body;
    links.hidden = !step.links;
    back.disabled = i === 0;
    next.textContent = i === STEPS.length - 1 ? "Done" : "Next";
    dots.textContent = `${i + 1} / ${STEPS.length}`;

    const r = rectOf(step);
    const W = window.innerWidth, H = window.innerHeight;
    if (r) {
      spot.style.left = `${r.left}px`;
      spot.style.top = `${r.top}px`;
      spot.style.width = `${r.width}px`;
      spot.style.height = `${r.height}px`;
    } else {
      spot.style.left = `${W / 2}px`;
      spot.style.top = `${H * 0.4}px`;
      spot.style.width = "0px";
      spot.style.height = "0px";
    }

    // place the card: below the spotlight if there is room, else above,
    // else centered; keep it inside the viewport horizontally
    card.style.visibility = "hidden";
    requestAnimationFrame(() => {
      const cw = card.offsetWidth, ch = card.offsetHeight;
      let x: number, y: number;
      if (!r) {
        x = (W - cw) / 2; y = Math.max(24, H * 0.4 - ch / 2);
      } else if (r.top + r.height + ch + 16 < H) {
        x = r.left + r.width / 2 - cw / 2; y = r.top + r.height + 12;
      } else if (r.top - ch - 16 > 0) {
        x = r.left + r.width / 2 - cw / 2; y = r.top - ch - 12;
      } else {
        x = (W - cw) / 2; y = (H - ch) / 2;
      }
      card.style.left = `${Math.max(12, Math.min(W - cw - 12, x))}px`;
      card.style.top = `${Math.max(12, Math.min(H - ch - 12, y))}px`;
      card.style.visibility = "visible";
    });
  };

  const finish = (): void => {
    active = false;
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    root.remove();
    hooks.onDone();
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") finish();
    else if (e.key === "ArrowRight" || e.key === "Enter") i === STEPS.length - 1 ? finish() : show(i + 1);
    else if (e.key === "ArrowLeft") show(i - 1);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };
  const onResize = (): void => show(i);

  back.addEventListener("click", () => show(i - 1));
  next.addEventListener("click", () => (i === STEPS.length - 1 ? finish() : show(i + 1)));
  root.querySelector(".tour-skip")!.addEventListener("click", finish);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", onResize);

  show(0);
}
