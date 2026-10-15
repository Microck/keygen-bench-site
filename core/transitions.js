// Page transition ("slide deck"). The old page is a frozen ghost copy laid over the new one.
// Old panels slide off sideways in a wave; new panels slide in from the other side, row by row, left
// column first. Panels fade while travelling 16px, so a panel crossing into its neighbour's box is still
// mostly transparent there; no clipping, so nothing appears out of a hard edge. steps() keeps motion on
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
  for (const el of outs) { el.style.setProperty("--d", ro(el) * 30 + "ms"); el.classList.add("t-slide-out"); }
  for (const el of ins) {
    const d = 90 + ri(el) * 45 + lead(el);
    last = Math.max(last, d);
    el.style.setProperty("--d", d + "ms");
    el.classList.add("t-slide-in");
  }
  return last + 260;
}

export const TRANSITION_CSS = `
.vb .ghost { pointer-events: none; z-index: 5; display: grid; gap: 1px; background: transparent; }
.vb .ghost > :not(.panel):not(.toc) { background: transparent; }
.vb .t-slide-in { animation: t-slide-in 240ms steps(8, end) var(--d, 0ms) both; }
.vb .t-slide-out { animation: t-slide-out 180ms steps(6, end) var(--d, 0ms) both; }
@keyframes t-slide-in { from { transform: translateX(calc(var(--dir, 1) * 16px)); opacity: 0; } 60% { opacity: 1; } to { transform: none; } }
@keyframes t-slide-out { to { transform: translateX(calc(var(--dir, 1) * -16px)); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .vb .t-slide-in, .vb .t-slide-out { animation: none !important; } }
`;
