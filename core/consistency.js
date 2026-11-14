// Consistency markers for the Rankings table: how much a model's attempts agree with each other.
// Several designs for comparison; pick one with ?cm=<id> or the Marker dropdown.
import { h, scoreColor } from "./ui.js";

const slotText = (s) => s.state === "ok" ? s.score.toFixed(1) : s.state === "pending" ? "pending" : s.state === "failed" ? `failed (${s.status.toLowerCase().replaceAll("_", " ")})` : "not run";
export const CONSISTENCY_HELP = "Consistency is the best score minus the worst score across at least two scored attempts. Lower spread means more consistent scores, not better music. Models with fewer than two scored attempts stay last in either direction. Colored attempt markers show scores (green higher, red lower), not consistency ranks.";

export function consistencyTitle(m) {
  const lines = m.slots.map((s) => `Attempt ${s.ordinal}: ${slotText(s)}`);
  if (m.n > 1) lines.push(`Score spread (best - worst): ${(m.max - m.min).toFixed(1)} points (${m.min.toFixed(1)}-${m.max.toFixed(1)}), mean ${m.mean.toFixed(1)}, sd ${m.sd.toFixed(1)}`);
  else lines.push(`${m.n} scored attempt${m.n === 1 ? "" : "s"}: at least two needed to compare consistency`);
  lines.push(CONSISTENCY_HELP);
  return lines.join("\n");
}

// Verdict from the score range across scored attempts.
export function verdict(m) {
  if (m.n < 2) return { text: m.declared > 1 ? `ONLY 1/${m.declared}` : "1 TRY", color: "var(--dim)" };
  const range = m.max - m.min;
  return range < 10 ? { text: "STEADY", color: "#55FF55" } : range < 25 ? { text: "MIXED", color: "#FFFF55" } : { text: "SWINGY", color: "#FFAA00" };
}

export const MARKERS = [
  {
    id: "pips", label: "Pips",
    // One LED per attempt slot, lit in the score colour; failures red, pending hollow, unstarted dim.
    render: (m) => h("span", { class: "cm cm-pips" }, ...m.slots.map((s) => h("i", {
      class: "pip " + s.state,
      style: s.state === "ok" ? { background: scoreColor(s.score) } : null,
    }))),
  },
  {
    id: "strip", label: "Range strip",
    // 0-100 track; shaded min-max range, one tick per scored attempt, white mean mark.
    render: (m) => {
      const pct = (v) => `${Math.max(0, Math.min(100, v))}%`;
      const ok = m.slots.filter((s) => s.state === "ok");
      return h("span", { class: "cm cm-strip sunken" },
        m.n > 1 ? h("b", { style: { left: pct(m.min), width: `calc(${pct(m.max - m.min)} + 1px)` } }) : null,
        ...ok.map((s) => h("i", { style: { left: pct(s.score), background: scoreColor(s.score) } })),
        m.n > 1 ? h("u", { style: { left: pct(m.mean) } }) : null);
    },
  },
  {
    id: "spread", label: "Spread +-",
    // Plus-minus half the score range, coloured like the verdict; models with one scored attempt show n/declared.
    render: (m) => {
      const v = verdict(m);
      return h("span", { class: "cm cm-spread", style: { color: v.color } }, m.n > 1 ? "\u00B1" + ((m.max - m.min) / 2).toFixed(1) : `${m.n}/${m.declared}`);
    },
  },
  {
    id: "verdict", label: "Verdict",
    // One word from the range: STEADY (<10 points), MIXED (<25), SWINGY (25+).
    render: (m) => { const v = verdict(m); return h("span", { class: "cm cm-verdict", style: { color: v.color } }, v.text); },
  },
];

export const MARKER_CSS = `
.vb table.lb col.c-cons { width: 58px; }
.vb .cm { display: inline-flex; align-items: center; vertical-align: -1px; }
.vb .cm-pips { gap: 2px; }
.vb .cm-pips .pip { width: 7px; height: 7px; box-sizing: border-box; display: inline-block; }
.vb .cm-pips .pip.failed { background: #AA0000; box-shadow: inset 0 0 0 1px #FF5555; }
.vb .cm-pips .pip.pending { box-shadow: inset 0 0 0 1px var(--pattext); }
.vb .cm-pips .pip.skipped { box-shadow: inset 0 0 0 1px var(--dim); opacity: .5; }
.vb .cm-strip { position: relative; width: 50px; height: 7px; }
.vb .cm-strip b { position: absolute; top: 1px; bottom: 0; background: var(--blckmrk); }
.vb .cm-strip i { position: absolute; top: 1px; bottom: 0; width: 2px; margin-left: -1px; }
.vb .cm-strip u { position: absolute; top: -1px; bottom: -1px; width: 1px; background: #fff; text-decoration: none; }
.vb .cm-spread { white-space: nowrap; }
`;
