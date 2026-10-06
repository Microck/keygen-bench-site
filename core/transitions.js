// Page transition ("slide deck"). The old page is a frozen ghost copy laid over the new one.
// Old panels wipe off sideways in a wave; new panels wipe in from the other side, row by row, left
// column first. A wipe clips each panel inside its own box instead of moving it, so a panel never
// slides over its neighbour or gets cut by its column's edge mid-animation. steps() keeps the edge on
// whole FT2 pixels. Returns the total duration in ms.
//   outs: top-level panels of the ghost, reading order
//   ins:  top-level panels of the new page, reading order
//   dir:  +1 moving to a later tab, -1 moving back
//   root: the new page element

const rowIndex = (els) => {
  const tops = [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().top / 8)))].sort((a, b) => a - b);
  return (el) => tops.indexOf(Math.round(el.getBoundingClientRect().top / 8));
};

export function slide({ outs, ins, dir, root }) {
  root.style.setProperty("--dir", dir);
  const ro = rowIndex(outs), ri = rowIndex(ins);
  const lead = (el) => { const r = el.getBoundingClientRect(); return (dir > 0 ? r.left : innerWidth - r.right) / 40; };
  let last = 0;
  const way = dir > 0 ? "fwd" : "back";
  for (const el of outs) { el.style.setProperty("--d", ro(el) * 30 + "ms"); el.classList.add("t-slide-out", "t-" + way); }
  for (const el of ins) {
    const d = 90 + ri(el) * 45 + lead(el);
    last = Math.max(last, d);
    el.style.setProperty("--d", d + "ms");
    el.classList.add("t-slide-in", "t-" + way);
  }
  return last + 260;
}

export const TRANSITION_CSS = `
.vb .ghost { pointer-events: none; z-index: 5; display: grid; gap: 1px; background: transparent; }
.vb .ghost > :not(.panel):not(.toc) { background: transparent; }
.vb .t-slide-in { animation: 240ms steps(8, end) var(--d, 0ms) both; }
.vb .t-slide-out { animation: 180ms steps(6, end) var(--d, 0ms) both; }
.vb .t-slide-in.t-fwd { animation-name: t-wipe-in-fwd; }
.vb .t-slide-in.t-back { animation-name: t-wipe-in-back; }
.vb .t-slide-out.t-fwd { animation-name: t-wipe-out-fwd; }
.vb .t-slide-out.t-back { animation-name: t-wipe-out-back; }
@keyframes t-wipe-in-fwd { from { clip-path: inset(0 0 0 100%); } to { clip-path: inset(0); } }
@keyframes t-wipe-in-back { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0); } }
@keyframes t-wipe-out-fwd { from { clip-path: inset(0); } to { clip-path: inset(0 100% 0 0); } }
@keyframes t-wipe-out-back { from { clip-path: inset(0); } to { clip-path: inset(0 0 0 100%); } }
@media (prefers-reduced-motion: reduce) { .vb .t-slide-in, .vb .t-slide-out { animation: none !important; } }
`;
