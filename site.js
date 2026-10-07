// FT2 results site: full screen and chunky. Built from FT2 parts (raised panels,
// sunken wells, pushbuttons, PATTEXT on black) in FT2 pixel units, laid out on a stage of
// (viewport / k) and zoomed by an integer k, so text, buttons and logos render at FT2's size x k.
// Every page fills the viewport; only inner wells scroll.
import { FB, PAL } from "./core/fb.js";
import { drawPatternFit, drawScopes } from "./core/pattern.js";
import { Player } from "./core/player.js";
import { loadXM, loadTrace, prefetchXM, mediaUrl, money, usd, tokens, mmss, rankingRows } from "./core/data.js";
import { h, badge, dropdown, makerItems, modelItems, scoreColor } from "./core/ui.js";
import { SCORING, SCORING_NOTES, DISCLAIMER, KEYGEN, OVERVIEW, SETUP, PROMPTS, SUPPORT, SITE, PAGES } from "./core/content.js";
import { fmt } from "./core/xm.js";
import { slide, TRANSITION_CSS } from "./core/transitions.js";
import { MARKERS, MARKER_CSS, CONSISTENCY_HELP, consistencyTitle } from "./core/consistency.js";
import { linkIcon } from "./core/logos.js";

const SHORT = { SUSTAINED_NOISE: "NOISE", PHRASE_SAMPLE: "PHRASE", SAMPLE_HEAVY: "SMP", TAIL_SILENCE: "TAIL", MASKED: "MASK", SILENCE: "SIL" };
const upperCostText = (range) => money(Math.ceil(range.max * 100) / 100);
const costText = (run) => run.cost_range_usd ? upperCostText(run.cost_range_usd) : run.cost_usd != null ? money(run.cost_usd) : "Unknown";
const modelCostText = (model) => costText(model.totalCost);
const spendText = (ledger, amount) => ledger.recorded_usage_cost_range_usd ? upperCostText(ledger.recorded_usage_cost_range_usd) : amount != null ? money(amount) : "Unknown";


const CSS = `
.vb { position: fixed; left: 0; top: 0; transform-origin: 0 0; display: flex; flex-direction: column; gap: 1px; padding: 1px; background: var(--desktop); overflow: hidden; }
.vb .bar { flex: none; display: flex; align-items: center; height: 24px; padding: 0 3px; gap: 2px; }
.vb .logo { display: flex; align-items: center; gap: 6px; padding-left: 3px; min-width: 0; overflow: hidden; }
.vb .logo b { font-family: "FT2 Big"; font-size: 20px; line-height: 20px; font-weight: normal; color: #fff; text-shadow: 1px 1px 0 var(--dsktop2); white-space: nowrap; position: relative; top: 2px; }
.vb .links { display: flex; gap: 3px; align-items: center; position: relative; top: 2px; }
.vb .links a { display: block; width: 12px; height: 12px; outline-offset: 1px; }
.vb .links a:hover img { filter: brightness(1.3); }
.vb .links img { display: block; width: 12px; height: 12px; image-rendering: pixelated; }
.vb table.lb .try { color: var(--dim); flex: none; }
.vb .attempts { display: grid; grid-template-columns: auto 1fr auto; gap: 1px 6px; padding: 3px 4px; align-items: center; }
.vb .attempts .on { color: #fff; }
.vb .attempts button { height: 12px; min-width: 0; padding: 0 3px; }
.vb pre.prompt { margin: 0 0 7px; padding: 3px 4px; font: inherit; color: #fff; white-space: pre-wrap; max-width: 96ch; }
.vb .embed { display: grid; gap: 3px; padding: 4px 5px; margin: 0 0 7px; max-width: 86ch; color: #fff; }
.vb .embed .row { min-height: 16px; }
.vb .embed .row:has(> .grow) { flex-wrap: wrap; row-gap: 2px; }
.vb .embed .row > :not(.grow) { flex: none; }
.vb .embed .row > .grow { min-width: min(100%, 72px); overflow-wrap: anywhere; }
.vb .dist { position: relative; height: 9px; }
.vb .dist button { appearance: none; position: absolute; top: 1px; bottom: 0; width: 2px; min-width: 0; height: auto; margin: 0 0 0 -1px; padding: 0; border: 0; cursor: pointer; }
.vb .dist button::before { content: ""; position: absolute; inset: -2px -2px; }
.vb .dist button:hover { background: #fff !important; }
.vb .dist button:focus-visible { outline: 2px solid var(--forgrnd); outline-offset: 1px; z-index: 1; }
.vb .tabs { display: flex; gap: 1px; margin-left: auto; }
.vb .tabs .btn { height: 18px; min-width: 62px; }
.vb .page { flex: 1; min-height: 0; display: grid; gap: 1px; }
.vb .panel { padding: 3px; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 2px; }
.vb .panel > h2 { margin: 0; padding: 1px 1px 0; font-size: 10px; line-height: 11px; font-weight: normal; color: #fff; text-shadow: 1px 1px 0 var(--dsktop2); white-space: nowrap; overflow: hidden; }
.vb .well { padding: 3px 4px; color: #fff; overflow: auto; min-height: 0; }
.vb .well p { margin: 0 0 7px; max-width: 86ch; }
.vb .row { display: flex; gap: 3px; align-items: center; min-width: 0; }
.vb .grow { flex: 1; min-width: 0; }
.vb .kv { display: grid; grid-template-columns: auto 1fr; gap: 1px 8px; margin: 0; padding: 3px 4px; align-content: start; }
.vb .kv dt { color: var(--pattext); white-space: nowrap; }
.vb .kv dd { margin: 0; color: #fff; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vb .meter { height: 7px; position: relative; }
.vb .meter i { position: absolute; left: 1px; top: 1px; bottom: 0; background: var(--pattext); }
.vb canvas.px { display: block; image-rendering: pixelated; }
.vb .fill { position: relative; flex: 1; min-height: 0; min-width: 0; }
.vb .fill > canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.vb table.lb { width: 100%; border-collapse: collapse; table-layout: fixed; }
.vb table.lb td.nm { overflow: hidden; }
.vb table.lb .nmc { display: flex; gap: 4px; align-items: center; min-width: 0; }
.vb table.lb .nmt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 0 1 auto; }
.vb table.lb .flag { flex: none; }
.vb .model-select { appearance: none; width: 100%; height: 18px; margin: 0; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.vb .podium-choice { appearance: none; margin: 0; border: 0; color: inherit; font: inherit; text-align: left; }
.vb .model-select:focus-visible, .vb .podium-choice:focus-visible, .vb .seek:focus-visible { outline: 2px solid var(--forgrnd); outline-offset: -2px; }
.vb .picker-field, .vb .playback-actions, .vb .channel-nav { display: contents; }
.vb table.lb col.c-rank { width: 28px; } .vb table.lb col.c-score { width: 72px; } .vb table.lb col.c-cost { width: 104px; } .vb table.lb col.c-out { width: 50px; } .vb table.lb col.c-min { width: 34px; }
.vb .rank-mode { display: flex; gap: 1px; flex: none; margin-left: auto; }
.vb .rank-mode .btn { height: 16px; min-width: 34px; }
.vb table.lb td.num, .vb table.lb th.num { padding-right: 6px; }
.vb table.lb th { position: sticky; top: 0; z-index: 1; background: var(--desktop); color: #fff; text-shadow: 1px 1px 0 var(--dsktop2); font-weight: normal; text-align: left; padding: 2px 4px; cursor: pointer; white-space: nowrap; box-shadow: inset 0 -1px 0 var(--dsktop2); }
.vb table.lb th.num, .vb table.lb td.num { text-align: right; }
.vb table.lb th[aria-sort] { color: var(--pattext); }
.vb table.lb td { padding: 0 4px; height: 18px; color: var(--pattext); white-space: nowrap; }
.vb table.lb td .badge { vertical-align: -4px; }
.vb table.lb tbody tr { cursor: pointer; }
.vb table.lb tbody tr:hover td { background: var(--blckmrk); }
.vb table.lb tbody tr.sel td { background: var(--desktop); color: #fff; }
.vb table.lb tr.exh td { color: var(--dim); }
.vb .sbar { display: inline-block; height: 7px; vertical-align: 0; margin-right: 4px; }
.vb .flag { color: #FFAA00; cursor: help; }
.vb .flag:hover { color: #FFFF55; text-decoration: underline; }
.vb .big { font-family: "FT2 Big"; font-size: 20px; line-height: 20px; color: #fff; text-shadow: 1px 1px 0 var(--looppin); }
.vb .toc .btn { justify-content: flex-start; height: 24px; width: 100%; padding-left: 5px; }
.vb .toc { gap: 2px; }
.vb pre.formula { margin: 0 0 7px; color: var(--pattext); font: inherit; }
.vb table.plain { border-collapse: collapse; margin-bottom: 7px; }
.vb table.plain td { padding: 0 10px 0 0; color: var(--pattext); }
.vb table.plain tr:first-child td { color: #fff; }
.vb .cta { height: 22px; min-width: 120px; }
.vb .dd { height: 14px; }
.vb .dd-pop { max-height: 60vh; }
.vb .dd-pop .list-row { height: 17px; line-height: 17px; }
.vb .dd-face .badge, .vb .dd-pop .badge { width: 12px !important; height: 12px !important; }
/* The face is 14px with a 1px sunken border and 2px top padding: lift the 12px logo onto the inner box so it never covers the bottom border. */
.vb .dd-face .badge { position: relative; top: -1px; }
.vb .list-row { height: 10px; line-height: 10px; }
.vb .tracker-entry { appearance: none; display: block; width: 100%; margin: 0; padding: 0 0 0 2px; border: 0; background: transparent; color: var(--pattext); font-family: inherit; font-size: inherit; text-align: left; }
.vb .tracker-entry.sel { background: var(--pattext); color: #000; }
.vb .tracker-entry:focus-visible { outline: 2px solid var(--forgrnd); outline-offset: -2px; }
.vb .tbtn { height: 16px; }
.vb .detail > section { flex: none; }
.vb .note { margin: 0; padding: 0 2px; color: var(--dim); white-space: normal; }
.vb .card-name { white-space: normal; overflow-wrap: anywhere; }
.vb .kv dd.wrap { white-space: normal; }
.vb .pod-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vb .seek > i::after { content: ""; position: absolute; right: -1px; top: -1px; bottom: 0; width: 2px; background: #fff; }
.vb .seek:hover { box-shadow: inset 1px 1px 0 var(--dsktop2), inset -1px -1px 0 var(--dsktop1), inset 0 0 0 1px var(--looppin); }
/* Fixed-width readouts: font1 digits are 7px, ':' 3px; min-width in ch + tabular glyphs => no jitter. */
.vb .lcd { flex: none; height: 14px; padding: 2px 0 0; white-space: nowrap; color: #fff; display: inline-flex; justify-content: center; overflow: hidden; }
.vb .lcd .c { display: inline-block; width: 8px; text-align: center; }
.vb .lcd .c.n { width: 4px; }
.vb .page { position: relative; }

/* Hover note: anchored to its row (position: relative) so it spans the row and stays inside the well. */
.vb .hint { color: #FFFF55; cursor: help; padding: 0 2px; outline: none; }
/* Wanted table: one grid for header and rows so the columns line up. Each model is two lines:
   logo, name, price, estimate; then a full-width funding bar under the name. */
.vb .wanted { display: grid; grid-template-columns: 16px minmax(0, 1fr) 72px 44px; gap: 1px 4px; align-items: center; position: relative; }
.vb .wanted + .wanted { margin-top: 5px; }
.vb .wanted > .badge { grid-row: span 2; align-self: start; margin-top: 1px; }
.vb .wanted .wn { white-space: nowrap; line-height: 14px; }
.vb .wanted .we { text-align: right; }
.vb .wanted .fund { grid-column: 2 / -1; }
/* Funding bar: sunken well, PATTEXT fill, amount printed on top (like FT2's sample-editor readouts). */
.vb .fund { position: relative; height: 12px; overflow: hidden; }
.vb .fund i { position: absolute; left: 1px; top: 1px; bottom: 1px; background: var(--pattext); max-width: calc(100% - 2px); }
.vb .fund b { position: relative; display: block; font-weight: normal; line-height: 12px; text-align: center; color: #fff; text-shadow: 1px 1px 0 #000; white-space: nowrap; overflow: hidden; }
/* Fold-out note: summary is a pushbutton with a play-arrow; body text white, headings PATTEXT blue. */
.vb .fold { margin-top: 8px; }
.vb .fold > summary { list-style: none; display: inline-flex; height: 16px; padding: 0 5px; gap: 4px; }
.vb .fold > summary::-webkit-details-marker { display: none; }
.vb .fold > summary::before { content: "\\25B6"; font-size: 7px; }
.vb .fold[open] > summary::before { content: "\\25BC"; }
.vb .fold[open] > summary { box-shadow: inset 1px 1px 0 var(--button2); padding: 1px 4px 0 6px; }
.vb .fold-h { color: var(--pattext); margin: 8px 0 2px; }
.vb .fold p { margin: 0 0 4px; }
/* Last rows: open the note upward so the well's bottom edge doesn't cut it off. */
.vb .wanted:nth-last-of-type(-n+2) .hint:hover::after, .vb .wanted:nth-last-of-type(-n+2) .hint:focus::after { top: auto; bottom: 17px; }
.vb .hint.goal { color: #fff; padding: 0; text-decoration: underline dotted; text-underline-offset: 2px; }
.vb .hint:hover::after, .vb .hint:focus::after { content: attr(data-tip); position: absolute; left: 18px; right: 0; top: 17px; z-index: 60; white-space: pre-line; padding: 4px 6px; background: var(--buttons); color: #000; text-shadow: none; text-decoration: none; font-weight: normal; box-shadow: inset 1px 1px 0 var(--btnlght, #fff), inset -1px -1px 0 var(--btnshdw, #000), 0 0 0 1px #000; line-height: 12px; text-align: left; }
.vb .tabs .btn[aria-current="page"] { animation: vb-tab 260ms steps(4, end); }
@keyframes vb-tab { 0% { background: #fff; } 50% { background: var(--dsktop1); } 100% { background: var(--buttons); } }
/* Phones keep the FT2 controls, but stack panels rather than compressing their columns. */
@media (max-width: 599px) {
  .vb { overflow-y: auto; }
  .vb .bar { height: auto; min-height: 24px; flex-wrap: wrap; }
  .vb .tabs { flex-wrap: wrap; }
  .vb[data-page="viewer"] .page, .vb[data-page="ranking"] .page, .vb[data-page="support"] .page { flex: none; grid-template-columns: minmax(0, 1fr) !important; grid-template-rows: none !important; grid-auto-rows: auto; }
  .vb .tracker-pickers { flex-wrap: wrap; }
  .vb .tracker-pickers > .grow { display: none; }
  .vb .picker-field { display: flex; gap: 4px; align-items: center; max-width: 100%; }
  .vb .picker-field > .shadow-text { flex: none; }
  .vb .picker-field > .dd { flex: none; }
  .vb .transport { flex-wrap: wrap; }
  .vb .playback-actions { display: flex; flex: 1 0 100%; gap: 3px; align-items: center; }
  .vb .channel-nav { display: flex; flex: none; gap: 3px; align-items: center; }
  .vb .transport .seek { height: 24px !important; }
  .vb .transport .tbtn, .vb .transport .lcd { height: 24px; }
  .vb .tracker-pickers .btn { min-height: 24px; }
  .vb .channel-nav .tbtn { width: 24px !important; }
  .vb .tracker-pickers .dd, .vb .tracker-pickers .dd-face, .vb .tracker-pickers .dd-arrow { height: 24px; }
  .vb .tracker-pickers .dd-pop { top: 24px; }
  .vb .tracker-pattern { height: max(240px, 40vh); }
  .vb .tracker-side { grid-column: 1 !important; grid-row: auto !important; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: auto 140px !important; }
  .vb .tracker-side > :first-child { grid-column: 1 / -1; }
  .vb .rank-detail { grid-column: 1 !important; grid-row: auto !important; overflow-y: visible !important; }
  .vb .rank-table { height: min(420px, 55vh); }
  .vb table.lb { min-width: 526px; }
  .vb[data-page="support"] .panel { min-height: auto; }
  .vb[data-page="support"] .well, .vb .support-list { flex: none !important; overflow: visible !important; }
  .vb[data-page="support"] .panel > h2 { white-space: normal; }
  .vb .donation-links { flex-wrap: wrap; }
  .vb .spend-row { display: grid; grid-template-columns: 16px minmax(0, 1fr) 48px 92px; height: auto !important; min-height: 24px; gap: 3px; }
  .vb .spend-model { overflow-wrap: anywhere; }
  .vb .wanted .wn { white-space: normal; overflow-wrap: anywhere; }
}
`;

// Integer zoom (the FT2 screen is 632x400 at k x). A 1280x640 laptop viewport still gets 2x (640x320 FT2 px stage).
function pickScale() {
  return Math.max(1, Math.floor(Math.min(innerWidth / 600, innerHeight / 320)));
}

export async function mount(root, ctx) {
  const { data } = ctx;
  let { page, run: slug } = ctx;
  root.append(h("style", {}, CSS + TRANSITION_CSS + MARKER_CSS));
  const main = h("main", { class: "page" });
  const tabs = h("nav", { class: "tabs", "aria-label": "Pages" });
  const bar = h("header", { class: "bar raised" },
    h("div", { class: "logo" }, h("b", {}, "KEYGEN BENCH"),
      h("nav", { class: "links", "aria-label": "Links" },
        h("a", { href: SITE.twitter, target: "_blank", rel: "noopener", title: "@JustMicrock on X", "aria-label": "@JustMicrock on X" }, h("img", { src: linkIcon("x"), alt: "" })),
        h("a", { href: SITE.repo, target: "_blank", rel: "noopener", title: "Microck/keygen-bench on GitHub", "aria-label": "Source on GitHub" }, h("img", { src: linkIcon("github"), alt: "" })))), tabs);
  const shell = h("div", { class: "ft2 vb" }, bar, main);
  root.append(shell);
  let raf = 0, k = 1;
  const cmParam = new URLSearchParams(location.search).get("cm");
  const S = { sort: "score", asc: false, maker: "All", sel: slug, exh: true, scoringTab: "keygen", view: "best", mode: ctx.mode ?? "best", cm: MARKERS.some((m) => m.id === cmParam) ? cmParam : MARKERS[0].id };
  const ranked = () => data.runs.filter((x) => x.rank).length;
  const rankText = (r) => r.rank ? `${r.rank} of ${ranked()}` : r.failed ? "failed" : r.exhibition ? "exhibition" : `ranked by #${r.model.best.attempt}`;
  const nameOf = (r) => r.label;
  const bestRankHelp = "Rank of the model's best attempt, not its Average position. This rank does not change with the ordering mode.";
  const attemptScoreTitle = (r) => {
    const score = `Attempt #${r.attempt} score: ${r.score == null ? "n/a" : r.score.toFixed(1)}.`;
    if (S.mode !== "average") return score + " Best ordering uses each model's best attempt.";
    const m = r.model;
    return score + ` Average ordering uses the model's ordinal mean: ${m.averageScore == null ? "n/a" : m.averageScore.toFixed(1)} (${m.scoredSlots}/${m.declared} scored slots).` + (m.averageComplete ? "" : " Incomplete models follow complete models and have no Average rank.");
  };

  const fit = () => {
    k = pickScale();
    shell.style.zoom = k;
    shell.style.width = innerWidth / k + "px";
    shell.style.height = innerHeight / k + "px";
    shell.dataset.scale = k;
  };
  fit();
  addEventListener("resize", fit);

  function renderTabs() {
    tabs.replaceChildren(...PAGES.map((p) => h("button", { class: "btn", "aria-current": p.id === page ? "page" : null, onclick: () => ctx.go({ page: p.id }) }, p.label)));
  }
  const meter = (v, max, color) => h("div", { class: "meter sunken" }, h("i", { style: { width: `calc(${Math.max(0, Math.min(1, v / max)) * 100}% - 1px)`, background: color ?? "var(--pattext)" } }));

  function scoreCard(r, { compact = false } = {}) {
    const parts = [["Tonal", r.parts.tonal_organization, 50], ["Develop.", r.parts.development, 40], ["Dynamics", r.parts.dynamics, 10]];
    const f = r.factors;
    return [
      h("div", { class: "row", style: { gap: "4px", padding: "1px 1px 0" } },
        badge(r.maker), h("span", { class: "grow" }), h("span", { class: "big", title: attemptScoreTitle(r), "aria-label": attemptScoreTitle(r) }, r.score.toFixed(1))),
      h("div", { class: "shadow-text card-name", style: { padding: "0 1px" } }, nameOf(r)),
      h("div", { class: "sunken", style: { padding: "3px 4px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "2px 6px", alignItems: "center" } },
        ...parts.flatMap(([kk, v, m]) => [h("span", { class: "muted" }, kk), meter(v, m), h("span", { style: { textAlign: "right" } }, `${v.toFixed(1)}/${m}`)]),
        ...[["Signal", f.signal_integrity], ["Noise", f.noise_integrity], ["Loop", f.loop_continuity], ["Duration", f.duration_sufficiency]]
          .flatMap(([kk, v]) => [h("span", { class: "muted" }, kk), meter(v, 1, v < 0.8 ? "#FFAA00" : null), h("span", { style: { textAlign: "right" } }, "x" + v.toFixed(3))])),
      compact ? null : h("dl", { class: "kv sunken" },
        h("dt", { title: bestRankHelp }, "Best rank"), h("dd", { title: bestRankHelp }, rankText(r)),
        h("dt", {}, "Est. cost"), h("dd", { title: r.cost_range_usd?.reason }, costText(r)),
        h("dt", {}, "Wall time"), h("dd", {}, r.usage.wall_minutes + " min"),
        h("dt", {}, "Flags"), h("dd", { style: { color: r.flags.length ? "#FFAA00" : "#fff" } }, r.flags.length ? r.flags.map((x) => SHORT[x.id] ?? x.id).join(" ") : "none")),
    ];
  }

  // ---------------- Tracker ----------------
  // Built once; switching tunes swaps data in place (no DOM teardown, no blank frame).
  let V = null;
  function buildViewer() {
    const playBtn = h("button", { class: "btn tbtn", style: { width: "44px" } }, "Play");
    const stopBtn = h("button", { class: "btn tbtn", style: { width: "40px" } }, "Stop");
    const loopBtn = h("button", { class: "btn tbtn", style: { width: "40px" }, "aria-pressed": "false", title: "Loop: play the restart seamlessly, forever, the way a keygen does" }, "Loop");
    const time = h("span", { class: "sunken lcd", style: { width: "44px" } });
    const pos = h("span", { class: "sunken lcd", title: "Position : pattern : row", style: { width: "64px" } });
    const seek = h("div", { class: "sunken seek", role: "slider", tabindex: "0", "aria-label": "Playback position", "aria-orientation": "horizontal", "aria-valuemin": "0", "aria-valuemax": "0", "aria-valuenow": "0", "aria-valuetext": "00:00 of 00:00", style: { flex: "1", minWidth: "40px", height: "14px", position: "relative", cursor: "pointer", touchAction: "none" } });
    const seekFill = h("i", { style: { position: "absolute", left: "1px", top: "1px", bottom: "0", width: "0", background: "var(--pattext)" } });
    seek.append(seekFill);
    const chL = h("button", { class: "btn tbtn", style: { width: "18px" }, "aria-label": "Scroll channels left" }, "<");
    const chR = h("button", { class: "btn tbtn", style: { width: "18px" }, "aria-label": "Scroll channels right" }, ">");
    const chLbl = h("span", { class: "sunken lcd", style: { width: "72px" } });
    const scopeC = h("canvas", { class: "px", "aria-label": "Channel scopes" });
    const patC = h("canvas", { class: "px", "aria-label": "Pattern editor" });
    const orderList = h("div", { class: "sunken ft2-scroll", style: { position: "relative", flex: "1", minHeight: "0", overflowY: "auto", padding: "1px" } });
    const insList = h("div", { class: "sunken ft2-scroll", style: { flex: "1", minHeight: "0", overflowY: "auto", padding: "1px" } });
    insList.addEventListener("click", (e) => {
      const el = e.target.closest(".instrument-entry");
      if (!el || !insList.contains(el)) return;
      const previous = insList.querySelector(".sel");
      previous?.classList.remove("sel");
      previous?.setAttribute("aria-pressed", "false");
      el.classList.add("sel");
      el.setAttribute("aria-pressed", "true");
    });
    const pickHost = h("div", { class: "row tracker-pickers", style: { gap: "4px" } });
    const infoHost = h("div", { class: "sunken", style: { width: "clamp(120px, 34%, 200px)", padding: "3px 4px", display: "grid", alignContent: "center", gap: "2px", whiteSpace: "nowrap", overflow: "hidden" } });
    const cardHost = h("section", { class: "panel raised" });
    const side = h("div", { class: "tracker-side", style: { gridColumn: "2", gridRow: "1 / span 3", display: "grid", gridTemplateRows: "auto minmax(0,1fr) minmax(0,1fr)", gap: "1px", minHeight: "0" } },
      cardHost,
      h("section", { class: "panel raised" }, h("h2", {}, "Instruments"), insList),
      h("section", { class: "panel raised" }, h("h2", {}, "Order list"), orderList));
    const nodes = [
      h("section", { class: "panel raised", style: { gridColumn: "1" } }, pickHost),
      h("section", { class: "panel raised", style: { gridColumn: "1" } },
        h("div", { class: "row transport" }, h("div", { class: "playback-actions" }, playBtn, stopBtn, loopBtn, time, pos), seek, h("div", { class: "channel-nav" }, chL, chLbl, chR)),
        h("div", { class: "row", style: { alignItems: "stretch", gap: "3px" } }, h("div", { class: "fill", style: { height: "64px" } }, scopeC), infoHost)),
      h("section", { class: "panel raised tracker-pattern", style: { gridColumn: "1", padding: "0" } }, h("div", { class: "fill" }, patC)),
      side,
    ];
    const v = { nodes, playBtn, stopBtn, loopBtn, time, pos, seek, seekFill, chL, chR, chLbl, scopeC, patC, orderList, insList, pickHost, infoHost, cardHost,
      first: 0, shown: 0, patFB: null, scopeFB: null, lastOrder: -1, lastLbl: "", lastTime: "", lastPos: "", run: null, song: null, player: null, loadToken: 0, loop: false, resume: false, loading: false };
    // While a run loads there is no player yet; Play then toggles whether the new tune starts when ready.
    playBtn.onclick = () => { if (v.player) v.player.toggle(); else { v.resume = !v.resume; drawViewer(); } };
    stopBtn.onclick = () => { v.seeking = false; v.seekT = null; v.resume = false; v.player?.stop(); drawViewer(); };
    // The button shows the requested state at once; the player catches up (first time: WAV download).
    loopBtn.onclick = () => {
      if (!v.player?.canLoop) return;
      v.loop = !v.loop;
      syncLoop();
      v.player.setLoop(v.loop);
    };
    chL.onclick = () => { v.first = Math.max(0, v.first - 1); };
    chR.onclick = () => { v.first = Math.min((v.song?.channels ?? 1) - v.shown, v.first + 1); };
    // Pointer and keyboard seeking share the same media path without starting playback.
    const seekDuration = () => {
      const duration = v.player?.state().duration ?? v.run?.audio.duration ?? 0;
      return Number.isFinite(duration) ? Math.max(0, duration) : 0;
    };
    const seekToTime = (target) => {
      if (!v.player || !v.run.media.audio) return;
      const t = Math.max(0, Math.min(seekDuration(), target));
      v.player.audio.currentTime = t;
      v.seekT = v.player.audio.currentTime;
      v.player.emit();
      drawViewer();
    };
    const seekTo = (e) => {
      const b = seek.getBoundingClientRect();
      if (b.width) seekToTime(((e.clientX - b.left) / b.width) * seekDuration());
    };
    seek.addEventListener("pointerdown", (e) => { seek.setPointerCapture(e.pointerId); v.seeking = true; seekTo(e); });
    seek.addEventListener("pointermove", (e) => { if (v.seeking) seekTo(e); });
    const endSeek = () => { v.seeking = false; };
    seek.addEventListener("pointerup", endSeek); seek.addEventListener("pointercancel", endSeek);
    seek.addEventListener("keydown", (e) => {
      const time = v.player?.audio.currentTime ?? 0;
      let target;
      if (e.key === "Home") target = 0;
      else if (e.key === "End") target = seekDuration();
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") target = time + 5;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") target = time - 5;
      else return;
      e.preventDefault(); e.stopPropagation();
      seekToTime(target);
    });
    patC.addEventListener("wheel", (e) => {
      const song = v.song; if (!song) return; e.preventDefault();
      const d = Math.sign(e.deltaX || (e.shiftKey ? e.deltaY : 0));
      if (d) v.first = Math.max(0, Math.min(song.channels - v.shown, v.first + d));
      else if (e.deltaY) v.player?.seekOrder(Math.max(0, Math.min(song.songLength - 1, v.player.state().order + Math.sign(e.deltaY))));
    }, { passive: false });
    return v;
  }
  const sized = (fbo, c) => { const w = Math.max(40, Math.floor(c.parentElement.clientWidth)), hh = Math.max(20, Math.floor(c.parentElement.clientHeight)); return fbo && fbo.w === w && fbo.h === hh ? fbo : new FB(c, w, hh); };
  // Readouts: one fixed 8px cell per glyph (font1 digits are 7px, A-F 8px), ':'/'-'/'/' get 4px. Box width is
  // fixed too, so nothing next to it moves when the numbers change.
  function setText(el, key, val) {
    if (V[key] === val) return;
    V[key] = val;
    el.replaceChildren(...[...val].map((ch) => h("span", { class: /[:\-/ ]/.test(ch) ? "c n" : "c" }, ch)));
  }
  function drawViewer() {
    const v = V, player = v.player, song = v.song;
    const st = player ? player.state() : { time: 0, duration: v.run?.audio.duration ?? 0, playing: false, order: 0, pattern: song?.orders[0] ?? 0, row: 0, traceIndex: -1 };
    const playing = st.playing || (!player && v.resume);
    v.playBtn.textContent = playing ? "Pause" : "Play";
    v.playBtn.classList.toggle("pressed", playing);
    setText(v.time, "lastTime", mmss(st.time));
    v.time.title = mmss(st.time) + " / " + mmss(st.duration);
    setText(v.pos, "lastPos", `${fmt.hex2(st.order)}:${fmt.hex2(st.pattern)}:${fmt.hex2(st.row)}`);
    const duration = Number.isFinite(st.duration) ? Math.max(0, st.duration) : 0;
    const shownT = Math.max(0, Math.min(duration, v.seeking && v.seekT != null ? v.seekT : st.time));
    if (!v.seeking) v.seekT = null;
    v.seekFill.style.width = `calc(${(shownT / (duration || 1)) * 100}% - 1px)`;
    v.seek.setAttribute("aria-valuemax", String(duration));
    v.seek.setAttribute("aria-valuenow", String(shownT));
    v.seek.setAttribute("aria-valuetext", `${mmss(shownT)} of ${mmss(duration)}`);
    v.seek.setAttribute("aria-disabled", String(!player || !v.run?.media.audio || !duration));
    if (st.order !== v.lastOrder) {
      const previous = v.orderList.querySelector(".sel");
      previous?.classList.remove("sel");
      previous?.setAttribute("aria-pressed", "false");
      const el = v.orderList.querySelector(`[data-o="${st.order}"]`);
      el?.classList.add("sel");
      el?.setAttribute("aria-pressed", "true");
      if (el) {
        if (el.offsetTop < v.orderList.scrollTop) v.orderList.scrollTop = el.offsetTop;
        else if (el.offsetTop + el.offsetHeight > v.orderList.scrollTop + v.orderList.clientHeight) v.orderList.scrollTop = el.offsetTop + el.offsetHeight - v.orderList.clientHeight;
      }
      v.lastOrder = st.order;
    }
    v.scopeFB = sized(v.scopeFB, v.scopeC);
    v.scopeFB.fill(0, 0, v.scopeFB.w, v.scopeFB.h, PAL.desktop);
    // Until the player exists (module downloading, or audio still buffering before a resumed play), draw
    // idle scopes at the run's channel count, like a stopped tune.
    const scopes = player ?? (v.run?.media.xm && (v.loading || song) ? { song: { channels: song?.channels ?? (v.run.module.channels || 8) }, scope: () => null } : null);
    if (scopes) drawScopes(v.scopeFB, scopes, st, 0, 0, v.scopeFB.w, v.scopeFB.h); else v.scopeFB.frame(0, 0, v.scopeFB.w - 1, v.scopeFB.h - 1, 1);
    v.scopeFB.flush();
    v.patFB = sized(v.patFB, v.patC);
    // While the module downloads, draw the empty pattern editor at the run's channel count (from
    // data.json), so the view is already the tracker and the notes simply appear.
    const shape = song ?? (v.loading && v.run?.media.xm ? { channels: v.run.module.channels || 8, patterns: [], orders: [0] } : null);
    if (shape) {
      const out = drawPatternFit(v.patFB, shape, song ? st.pattern : 0, song ? st.row : 0, v.patFB.w, v.patFB.h, { firstChannel: v.first });
      v.first = out.first; v.shown = out.chans;
      setText(v.chLbl, "lastLbl", out.chans >= shape.channels ? `${shape.channels}ch` : `${out.first + 1}-${out.first + out.chans}/${shape.channels}`);
      v.chL.disabled = !song || out.first <= 0; v.chR.disabled = !song || out.first + out.chans >= shape.channels;
    } else if (v.run) {
      v.patFB.fill(0, 0, v.patFB.w, v.patFB.h, PAL.desktop);
      v.patFB.frame(0, 0, v.patFB.w - 1, v.patFB.h - 1, 1);
      v.patFB.text(20, v.patFB.h >> 1, !v.run.media.xm ? "No module: this run failed to produce one." : "The module could not be loaded.", PAL.forgrnd);
      setText(v.chLbl, "lastLbl", "--"); v.chL.disabled = v.chR.disabled = true;
    }
    v.patFB.flush();
  }
  function viewerChrome(r) {
    const m = r.module;
    V.pickHost.replaceChildren(
      h("div", { class: "picker-field" }, h("span", { class: "shadow-text" }, "Company"),
        dropdown({ label: "Company", items: makerItems(data), value: r.maker, width: 120, onChange: (mk) => ctx.go({ run: newestOf(mk).slug }), onHover: (mk) => prefetchXM(data, newestOf(mk)) })),
      h("div", { class: "picker-field" }, h("span", { class: "shadow-text" }, "Model"),
        dropdown({ label: "Model", items: modelItems(data, r.maker, r.slug), value: r.slug, width: 170, onChange: (s2) => ctx.go({ run: s2 }), onHover: (s2) => prefetchXM(data, data.bySlug[s2]) })),
      h("span", { class: "grow" }),
      ...(r.media.xm ? [h("a", { class: "btn", href: mediaUrl(data, r.media.xm), download: r.slug + ".xm", style: { height: "14px" } }, ".XM")] : []),
      ...(r.media.audio ? [h("a", { class: "btn", href: mediaUrl(data, r.media.audio), download: r.slug + ".mp3", style: { height: "14px" } }, ".MP3")] : []));
    V.infoHost.replaceChildren(
      h("div", { style: { color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, `"${m.name || "untitled"}"`),
      h("div", { class: "muted" }, `${m.channels ?? "-"} ch | ${m.bpm ?? "-"} bpm | spd ${m.speed ?? "-"}`),
      h("div", { class: "muted" }, `${m.song_length ?? "-"} pos | ${(r.audio.duration ?? 0).toFixed(1)}s | ${r.audio.lufs ?? "-"} LU`),
      h("div", { class: "muted" }, `${r.maker} | effort ${effort(r)}`));
    V.cardHost.replaceChildren(...scoreCard(r));
  }
  // "declared tier: max, 128k output" -> "max".
  const effort = (r) => String(r.tier ?? "-").replace(/^.*tier:\s*/i, "").split(",")[0].trim();
  // A company pick opens its newest model (the first Model menu entry), at that model's best attempt.
  const newestOf = (maker) => data.bySlug[modelItems(data, maker, null)[0].value];
  // Switch the viewer to run `s2`. The pickers, info and score card come from data.json, so they switch at
  // once; the old tune stops and the pattern editor shows the new run's empty channels until its module is
  // parsed (usually already cached by a prefetch). The MP3 downloads alongside the module. If a tune was
  // playing (or Play was pressed meanwhile), the new one starts when it can play.
  async function loadRun(s2) {
    const r = data.bySlug[s2];
    const tok = ++V.loadToken;
    V.resume ||= !!V.player?.playing;
    V.player?.destroy();
    V.player = null; V.song = null; V.run = r; V.loading = true; V.first = 0; V.lastOrder = -1;
    V.seeking = false; V.seekT = null;
    viewerChrome(r);
    syncLoop();
    V.orderList.replaceChildren();
    V.insList.replaceChildren();
    drawViewer();
    const audio = new Audio();
    audio.preload = "auto";
    if (r.media.audio) audio.src = mediaUrl(data, r.media.audio);
    const [song] = await Promise.all([r.media.xm ? loadXM(data, r).catch(() => null) : null, loadTrace(data, r).catch(() => {})]);
    if (tok !== V.loadToken) { audio.src = ""; return; }
    V.song = song; V.loading = false;
    const orders = song ? song.orders.slice(0, song.songLength) : [];
    V.orderList.replaceChildren(...orders.map((p, i) => h("button", { class: "list-row tracker-entry order-entry", type: "button", "data-o": i, "aria-label": `Order ${fmt.hex2(i)}, pattern ${fmt.hex2(p)}`, "aria-pressed": "false", onclick: () => V.player?.seekOrder(i) }, fmt.hex2(i) + "  " + fmt.hex2(p))));
    V.insList.replaceChildren(...(song?.instruments ?? []).map((ins, i) => h("button", { class: "list-row tracker-entry instrument-entry", type: "button", "data-i": i + 1, "aria-label": `Instrument ${fmt.hex2(i + 1)}${ins.name ? ", " + ins.name : ""}`, "aria-pressed": "false" }, fmt.hex2(i + 1) + " " + (ins.name || ""))));
    const next = new Player(data, r, song ?? { channels: 0, instruments: [], patterns: [], orders: [0] }, audio);
    if (V.loop && next.canLoop) await next.setLoop(true);
    else if (V.resume && r.media.audio) await new Promise((ok) => { if (next.audio.readyState >= 2) ok(); else { next.audio.addEventListener("canplay", ok, { once: true }); setTimeout(ok, 1500); } });
    if (tok !== V.loadToken) { next.destroy(); return; }
    V.player = next;
    syncLoop();
    drawViewer();
    if (V.resume) next.play().catch(() => {});
    V.resume = false;
    prefetchNeighbours(r);
  }
  // Once a run is up, warm the modules one click away: the models above and below it in the Model list and
  // its model's other attempts.
  function prefetchNeighbours(r) {
    const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 200));
    idle(() => {
      const items = modelItems(data, r.maker, r.slug), i = items.findIndex((it) => it.value === r.slug);
      for (const it of [items[i + 1], items[i - 1]]) if (it) prefetchXM(data, data.bySlug[it.value]);
      for (const s of r.model.slots ?? []) if (s.slug) prefetchXM(data, data.bySlug[s.slug]);
    });
  }
  // Loop button: pressed while looping; disabled when the run has no WAV or never reaches its restart position.
  function syncLoop() {
    const p = V.player, ok = !!p?.canLoop;
    V.loopBtn.disabled = !ok;
    V.loopBtn.title = ok ? "Loop: play the restart seamlessly, forever, the way a keygen does" : "This tune has no restart point to loop";
    V.loopBtn.setAttribute("aria-pressed", String(ok && V.loop));
    V.loopBtn.classList.toggle("pressed", ok && V.loop);
  }
  function viewer() {
    main.style.gridTemplateColumns = "minmax(0,1fr) clamp(150px, 28%, 220px)";
    main.style.gridTemplateRows = "auto auto minmax(0,1fr)";
    if (!V) V = buildViewer();
    main.replaceChildren(...V.nodes);
    if (V.run?.slug !== slug) loadRun(slug);
    const loop = () => { drawViewer(); raf = requestAnimationFrame(loop); };
    cancelAnimationFrame(raf);
    loop();
  }

  // ---------------- Rankings ----------------
  const marker = () => MARKERS.find((m) => m.id === S.cm);
  const COLS = [
    { k: "rank", l: "#", num: true, cell: (r) => (r.rank ?? (r.failed ? "--" : r.exhibition ? "EX" : "")), cls: "rk" },
    { k: "name", l: "Model", cls: "nm", cell: (r, onSelect) => h("button", { class: "nmc model-select", type: "button", "data-slug": r.slug, "aria-pressed": String(r.slug === S.sel), "aria-label": `Select ${r.label}, attempt #${r.attempt}`, title: nameOf(r), onclick: (e) => { e.stopPropagation(); onSelect(r); } }, badge(r.maker), h("span", { class: "nmt" }, r.label + (r.exhibition ? " *" : "")),
      S.view !== "best" && r.model.declared > 1 ? h("span", { class: "try" }, "#" + r.attempt) : null) },
    { k: "score", l: "Attempt", num: true, help: "Attempt score. Values always belong to the displayed individual attempt. Best/Average changes model ordering, not these scores.", cell: (r) => h("span", { title: attemptScoreTitle(r), "aria-label": attemptScoreTitle(r) }, ...(r.score == null ? ["n/a"] : [h("span", { class: "sbar", style: { width: Math.round(r.score * 0.34) + "px", background: scoreColor(r.score) } }), r.score.toFixed(1)])) },
    { k: "cons", l: "Cons.", help: CONSISTENCY_HELP, cell: (r) => h("span", { title: consistencyTitle(r.model) }, marker().render(r.model)) },
    { k: "cost", l: "Cost", num: true, help: "Estimated total cost of the model's ordinal attempts, including known failed-attempt costs. Uses the upper value when pricing has a range. Missing costs are excluded; details are in the tooltip. Sort by the displayed estimate.", cell: (r) => h("span", { title: r.model.totalCost.reason }, modelCostText(r.model)) },
    { k: "out", l: "Out tok", num: true, cell: (r) => (r.usage.completion_tokens == null ? "n/a" : tokens(r.usage.completion_tokens)) },
    { k: "min", l: "Min", num: true, cell: (r) => r.usage.wall_minutes == null ? "n/a" : Math.round(r.usage.wall_minutes) },
  ];
  const VIEWS = [
    { value: "best", label: "Best attempt" },
    { value: "first", label: "First attempt" },
    { value: "all", label: "All attempts" },
  ];
  function ranking() {
    main.style.gridTemplateColumns = "minmax(0,1fr) clamp(160px, 27%, 200px)";
    main.style.gridTemplateRows = "auto auto minmax(0,1fr)";
    const average = S.mode === "average";
    const cols = COLS;
    const makerDD = dropdown({ label: "Company", items: [{ value: "All", label: "All companies" }, ...makerItems(data)], value: S.maker, width: 100, onChange: (mk) => { S.maker = mk; renderTable(); } });
    const modeButtons = h("div", { class: "rank-mode", role: "group", "aria-label": "Model ordering" },
      ...["best", "average"].map((mode) => h("button", { class: "btn" + (mode === S.mode ? " pressed" : ""), type: "button", "aria-pressed": String(mode === S.mode), title: mode === "average" ? "Order models by their mean score across predetermined ordinal slots. Attempt scores and selected-attempt details stay unchanged." : "Order models by their best-attempt score. Attempt scores and selected-attempt details stay unchanged.",
        onclick: () => {
          if (mode === S.mode) return;
          const pane = main.querySelector("table.lb").parentElement;
          const scrollTop = pane.scrollTop, scrollLeft = pane.scrollLeft;
          ctx.go({ mode }, { silent: true });
          S.mode = mode;
          S.sort = "score"; S.asc = false;
          ranking();
          const nextPane = main.querySelector("table.lb").parentElement;
          nextPane.scrollTop = scrollTop; nextPane.scrollLeft = scrollLeft;
          main.querySelector(`[data-mode="${mode}"]`)?.focus({ preventScroll: true });
        }, "data-mode": mode }, mode === "best" ? "Best" : "Average")));
    const viewDD = dropdown({ label: "Show", items: VIEWS, value: S.view, width: 102, onChange: (v) => { S.view = v; renderTable(); renderDetail(); } });
    const cmDD = dropdown({ label: "Marker", items: MARKERS.map((m) => ({ value: m.id, label: m.label })), value: S.cm, width: 84, onChange: (v) => { S.cm = v; renderTable(); } });
    const tbody = h("tbody"), thead = h("thead");
    const sortHelp = h("div", { class: "note", hidden: true, role: "status", title: CONSISTENCY_HELP });
    const detail = h("div", { class: "ft2-scroll detail rank-detail", style: { gridColumn: "2", gridRow: "1 / span 3", display: "flex", flexDirection: "column", gap: "1px", minHeight: "0", overflowY: "auto" } });
    const top3 = h("section", { style: { gridColumn: "1", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "1px" } });
    main.replaceChildren(
      h("section", { class: "panel raised", style: { gridColumn: "1" } },
        h("div", { class: "row", style: { gap: "4px", flexWrap: "wrap" } }, h("span", { class: "shadow-text" }, "Company"), makerDD,
          h("span", { class: "shadow-text" }, "Show"), viewDD,
          h("span", { class: "shadow-text" }, "Marker"), cmDD, h("span", { class: "grow" }), modeButtons), sortHelp),
      top3,
      h("section", { class: "panel raised rank-table", style: { gridColumn: "1" } }, h("div", { class: "sunken ft2-scroll", style: { flex: "1", minHeight: "0", overflow: "auto" } }, h("table", { class: "lb" }, h("colgroup", {}, ...cols.map((c) => h("col", { class: "c-" + c.k }))), thead, tbody))),
      detail);
    function renderTable(preserveSelection = false) {
      const list = rankingRows(data, { mode: S.mode, maker: S.maker, view: S.view, exhibitions: S.exh, sort: S.sort, asc: S.asc });
      if (!preserveSelection && !average && !list.some((r) => r.slug === S.sel)) {
        const visibleAttempt = list.find((r) => r.model === data.bySlug[S.sel]?.model);
        if (visibleAttempt) select(visibleAttempt.slug);
      }
      sortHelp.hidden = S.sort !== "cons";
      sortHelp.textContent = `Cons.: ${S.asc ? "most consistent first (smallest score spread)" : "least consistent first (largest score spread)"}; unknown spread last.`;
      const toggleSort = (c) => {
        if (S.sort === c.k) S.asc = !S.asc;
        else { S.sort = c.k; S.asc = ["rank", "name", "cons", "cost", "min", "out"].includes(c.k); }
        renderTable();
        thead.querySelector(`[data-sort="${c.k}"]`)?.focus({ preventScroll: true });
      };
      thead.replaceChildren(h("tr", {}, ...cols.map((c) => {
        const direction = c.k !== S.sort ? "" : c.k === "cons"
          ? ` Currently showing ${S.asc ? "most consistent first (smallest spread)" : "least consistent first (largest spread)"}.`
          : ` Currently sorted ${S.asc ? "ascending" : "descending"}.`;
        const metric = average ? "the model's ordinal mean" : "the model's best-attempt score";
        const help = c.k === "score" ? `${c.help} Ordering by ${metric}.${direction} Activate to change the sort direction.`
          : c.k === "rank" ? `Model position under ${S.mode === "average" ? "Average" : "Best"} ordering.${direction}`
          : c.help ? c.help + direction + " Activate to change the sort direction." : `Sort by ${c.l}.${direction}`;
        return h("th", {
          class: c.num ? "num" : null, "aria-sort": c.k === S.sort ? (S.asc ? "ascending" : "descending") : null,
          title: help, "aria-label": c.k === "cons" || c.k === "score" || c.k === "rank" ? help : null, tabindex: "0", "data-sort": c.k,
          onclick: () => toggleSort(c),
          onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSort(c); } },
        }, c.l + (c.k === S.sort ? (S.asc ? " \u25B2" : " \u25BC") : ""));
      })));
      const selectRow = (r) => {
        const active = document.activeElement;
        const focusSelector = active?.classList.contains("model-select") ? ".model-select" : active?.classList.contains("podium-choice") ? ".podium-choice" : null;
        select(r.slug); renderTable(); renderDetail();
        if (focusSelector) [...main.querySelectorAll(focusSelector)].find((el) => el.dataset.slug === r.slug)?.focus({ preventScroll: true });
      };
      tbody.replaceChildren(...list.map((r) => h("tr", { class: (r.slug === S.sel ? "sel " : "") + (r.exhibition ? "exh" : ""), onclick: () => selectRow(r), ondblclick: () => ctx.go({ page: "viewer", run: r.slug }) },
        ...cols.map((c) => h("td", { class: [c.num ? "num" : "", c.cls ?? ""].join(" ") }, c.cell(r, selectRow))))));
      const podium = average ? rankingRows(data, { mode: S.mode, maker: S.maker, sort: "rank", asc: true }).filter((r) => r.rank)
        : data.runs.filter((r) => r.rank && (S.maker === "All" || r.maker === S.maker)).sort((a, b) => a.rank - b.rank);
      top3.replaceChildren(...podium.slice(0, 3).map((r) => h("button", { class: "panel raised podium-choice", type: "button", "data-slug": r.slug, title: `${S.mode === "average" ? "Average" : "Best"} position ${r.rank}. ${attemptScoreTitle(r)}`, "aria-label": `Select ${r.label}. ${S.mode === "average" ? "Average" : "Best"} position ${r.rank}. ${attemptScoreTitle(r)}`, style: { flexDirection: "row", alignItems: "center", gap: "5px", cursor: "pointer" }, onclick: () => selectRow(r) },
        h("div", { class: "grow", style: { display: "grid", gap: "2px", minWidth: "0" } },
          h("div", { class: "row", style: { gap: "4px" } },
            h("span", { class: "big" }, String(r.rank)),
            h("img", { class: "badge", src: badge(r.maker).src, style: { width: "20px", height: "20px" }, alt: "" }),
            h("span", { class: "grow" }), h("span", { class: "big" }, r.score.toFixed(1))),
          h("div", { class: "shadow-text pod-name" }, r.label),
          h("div", { style: { color: "var(--dim)", whiteSpace: "nowrap" }, title: r.model.totalCost.reason }, `${modelCostText(r.model)} | ${Math.round(r.usage.wall_minutes)} min`)))));
    }
    function renderDetail() {
      const r = data.bySlug[S.sel];
      prefetchXM(data, r); // "Open in tracker" then opens with its module already parsed
      const kv = (pairs) => h("dl", { class: "kv sunken" }, ...pairs.flatMap(([a, b]) => [h("dt", {}, a), h("dd", {}, b ?? "-")]));
      const nf = (v) => (v == null ? "n/a" : "$" + v);
      const m = r.model;
      detail.replaceChildren(
        h("section", { class: "panel raised" }, ...scoreCard(r, { compact: true }),
          h("button", { class: "btn", style: { height: "16px" }, onclick: () => ctx.go({ page: "viewer", run: r.slug }) }, "Open in tracker")),
        ...(m.declared > 1 ? [h("section", { class: "panel raised" }, h("h2", {}, "Attempts"),
          h("div", { class: "attempts sunken", title: consistencyTitle(m) },
            ...m.slots.flatMap((s) => [
              s.slug ? h("button", { class: "btn", "aria-pressed": String(s.slug === r.slug), onclick: () => { select(s.slug); if (!average && S.view === "best" && !data.bySlug[s.slug].isBest) S.view = "all"; ranking(); } }, "#" + s.ordinal) : h("span", { class: "muted" }, "#" + s.ordinal),
              h("span", { class: s.state === "ok" ? "on" : "muted" }, s.state === "ok" ? (s.slug === m.best.slug ? "best" : "") : s.state === "failed" ? `failed (${s.status.toLowerCase().replaceAll("_", " ")})` : s.state),
              h("span", { class: "on", style: { textAlign: "right" } }, s.state === "ok" ? s.score.toFixed(1) : "")])),
          h("div", { class: "row", style: { padding: "0 2px" } }, h("span", { class: "muted grow" }, "Consistency"), marker().render(m)))] : []),
        h("section", { class: "panel raised" }, h("h2", {}, "Run"),
          kv([
            [h("span", { title: bestRankHelp }, "Best rank"), h("span", { title: bestRankHelp }, rankText(r))],
            ["Maker", r.maker], ["Effort", effort(r)], ["Wall time", r.usage.wall_minutes + " min"],
            ...(r.exhibition ? [["Chat turns", r.usage.turns], ["Commands", r.usage.commands]] : [["Requests", r.usage.requests], ["Commands", r.usage.commands]]),
            ["In tokens", tokens(r.usage.prompt_tokens)], ["- cached", tokens(r.usage.cached_tokens)],
            ["Out tokens", tokens(r.usage.completion_tokens)], ["- reasoning", tokens(r.usage.reasoning_tokens)],
            ["Est. cost", h("span", { title: r.cost_range_usd?.reason }, costText(r))],
          ]),
          r.exhibition ? h("p", { class: "note" }, "Run by hand in the chat app: it reports no token counts and has no per-token price. Not ranked.") : null),
        h("section", { class: "panel raised" }, h("h2", {}, "Price"),
          kv([
            ["$/M in", nf(r.price.input_usd_per_m)], ["$/M cached", nf(r.price.cached_input_usd_per_m)], ["$/M out", nf(r.price.output_usd_per_m)],
          ])));
    }
    renderTable(true); renderDetail();
    tbody.querySelector("tr.sel")?.scrollIntoView({ block: "nearest" });
  }

  // ---------------- Scoring ----------------
  // Help-screen layout (like FT2's Help): a few big subject buttons on the left; the right well shows
  // only the chosen subject.
  function scoring() {
    main.style.gridTemplateColumns = "150px minmax(0,1fr)";
    main.style.gridTemplateRows = "minmax(0,1fr)";
    const body = h("div", { class: "well sunken ft2-scroll", style: { flex: "1" } });
    const title = h("h2", {}, "");
    const head = (text) => h("h2", { class: "big", style: { fontSize: "20px", margin: "8px 0 6px", fontWeight: "normal" } }, text);
    const para = (t) => h("p", {}, t);
    const measure = (m) => [head(m.kind === "points" ? `${m.title} (${m.max} points)` : m.title), para(m.plain),
      h("table", { class: "plain" },
        h("tr", {}, h("td", { style: { color: "#55FF55", whiteSpace: "nowrap", verticalAlign: "top" } }, "Scores well"), h("td", { style: { color: "#fff" } }, m.good)),
        h("tr", {}, h("td", { style: { color: "#FFAA00", whiteSpace: "nowrap", verticalAlign: "top" } }, "Loses points"), h("td", { style: { color: "#fff" } }, m.bad))),
      embed(m),
      h("p", { class: "muted" }, m.details)];
    // Live embed under each measure: where every ranked model lands on it, plus the extremes to listen to.
    const MEASURE = {
      tonal: (r) => r.parts.tonal_organization, development: (r) => r.parts.development, dynamics: (r) => r.parts.dynamics,
      integrity: (r) => r.factors.signal_integrity, noise: (r) => r.factors.noise_integrity,
      loop: (r) => r.factors.loop_continuity, duration: (r) => r.factors.duration_sufficiency,
    };
    function embed(m) {
      const pool = data.runs.filter((r) => r.rank);
      if (m.id === "caps") {
        const capped = data.runs.filter((r) => r.caps?.length);
        return h("div", { class: "embed sunken" }, h("div", { class: "muted" }, capped.length ? `Capped runs in this snapshot (${capped.length}):` : `No run in this snapshot was capped (${data.runs.length} runs).`),
          ...capped.map((r) => h("div", { class: "row" }, badge(r.maker), h("span", { class: "grow" }, nameOf(r)), h("span", {}, `${r.uncapped?.toFixed(1)} > ${r.score.toFixed(1)}`), listen(r))));
      }
      const get = MEASURE[m.id];
      if (!get || !pool.length) return null;
      const max = m.kind === "points" ? m.max : 1;
      const fmtV = (v) => (m.kind === "points" ? `${v.toFixed(1)}/${m.max}` : "x" + v.toFixed(2));
      const sorted = pool.slice().sort((a, b) => get(b) - get(a));
      const hi = sorted[0], lo = sorted.at(-1);
      const full = pool.filter((r) => get(r) >= max - 1e-9).length;
      const pct = (v) => `${(Math.max(0, Math.min(1, v / max)) * 100).toFixed(1)}%`;
      // Hover or focus names the model(s) at that value; native button activation opens the tracker.
      let focused = null;
      const readout = h("span", { class: "grow", style: { color: "#fff", minWidth: "0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 6px" } });
      const at = (r) => pool.filter((x) => Math.abs(get(x) - get(r)) < 1e-9);
      const names = (xs) => xs.length > 2 ? `${xs.slice(0, 2).map((x) => x.label).join(", ")} +${xs.length - 2} more` : xs.map((x) => x.label).join(", ");
      const show = (r) => readout.replaceChildren(...(r ? [`${names(at(r))} ${fmtV(get(r))}`] : []));
      return h("div", { class: "embed sunken" },
        h("div", { class: "dist sunken", onmouseleave: () => show(focused) },
          ...pool.map((r) => h("button", { type: "button", style: { left: pct(get(r)), background: scoreColor((get(r) / max) * 100) }, "aria-label": `${r.label}, ${m.title}: ${fmtV(get(r))}. Open in the tracker.`,
            onmouseenter: () => show(r), onfocus: () => { focused = r; show(r); }, onblur: () => { focused = null; show(null); },
            onclick: () => ctx.go({ page: "viewer", run: r.slug }) }))),
        h("div", { class: "row muted", style: { justifyContent: "space-between" } }, h("span", {}, m.kind === "points" ? "0" : "x0"), readout, h("span", {}, m.kind === "points" ? String(m.max) : "x1")),
        ...(get(hi) === get(lo) ? [h("div", { class: "muted" }, `Every ranked model gets ${fmtV(get(hi))} here.`)] : [["Highest", hi], ["Lowest", lo]].map(([k, r]) => h("div", { class: "row" }, h("span", { class: "muted", style: { width: "44px" } }, k), badge(r.maker), h("span", { class: "grow" }, r.label), h("span", {}, fmtV(get(r))), listen(r)))));
    }
    const listen = (r) => h("button", { class: "btn", style: { height: "14px" }, title: "Open in the tracker", onclick: () => ctx.go({ page: "viewer", run: r.slug }) }, "Listen");
    const exampleRun = () => (data.bySlug[slug].failed ? data.runs.find((r) => r.name === "minimax-m3") ?? data.runs[0] : data.bySlug[slug]);
    const subjects = [
      { id: "keygen", label: "What is a keygen?", render: () => [head(KEYGEN.title), ...KEYGEN.lines.map(para), head(DISCLAIMER.title), ...DISCLAIMER.lines.map(para)] },
      { id: "setup", label: "Setup", render: () => SETUP.flatMap((s) => [head(s.title), ...(s.lines ?? []).map(para),
        s.table ? h("table", { class: "plain" }, ...s.table.map(([a, b]) => h("tr", {}, h("td", { style: { whiteSpace: "nowrap", verticalAlign: "top" } }, a), h("td", { style: { color: "#fff" } }, b)))) : null]) },
      { id: "prompts", label: "Prompts", render: () => [head("Prompts"), para("Every model gets exactly these two prompts, word for word, with this campaign's limits filled in."),
        ...PROMPTS.flatMap((p) => [head(p.title), h("pre", { class: "prompt sunken" }, p.text)])] },
      { id: "overview", label: "How it works", render: () => [head("How it works"), ...OVERVIEW.map(para),
        h("pre", { class: "formula" }, ["score = music points (up to 100)", "        x clean sound", "        x no broken samples", "        x clean loop", "        x long enough", "        then caps, rounded to 0.1"].join("\n"))] },
      { id: "points", label: "What earns points", render: () => SCORING.filter((m) => m.kind === "points").flatMap(measure) },
      { id: "checks", label: "What costs points", render: () => SCORING.filter((m) => m.kind !== "points").flatMap(measure) },
      { id: "example", label: "Example run", render: () => [head("Example run"), para("Every run's score, step by step. Pick any run."), worked(exampleRun())] },
      { id: "notes", label: "Caveats", render: () => SCORING_NOTES.flatMap((n) => [head(n.title), para(n.text),
        n.id === "flags" ? h("table", { class: "plain" }, ...Object.entries(data.flag_rules).filter(([kk]) => kk !== "RAW_XM").map(([kk, v]) => h("tr", {}, h("td", { style: { color: "#FFAA00", whiteSpace: "nowrap", verticalAlign: "top" } }, SHORT[kk] ?? kk), h("td", { style: { color: "#fff" } }, v)))) : null]) },
    ];
    const toc = h("nav", { class: "panel raised toc", "aria-label": "Sections" }, h("h2", {}, "Help subjects"));
    const show = (id) => {
      const sub = subjects.find((x) => x.id === id) ?? subjects[0];
      S.scoringTab = sub.id;
      title.textContent = sub.label;
      body.replaceChildren(...sub.render().filter(Boolean));
      body.scrollTop = 0;
      toc.querySelectorAll(".btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.s === sub.id)));
    };
    toc.append(...subjects.map((t) => h("button", { class: "btn", "data-s": t.id, onclick: () => show(t.id) }, t.label)));
    main.replaceChildren(toc, h("section", { class: "panel raised" }, title, body));
    show(S.scoringTab);
  }
  function worked(r0) {
    const holder = h("div", { style: { marginBottom: "8px" } });
    const render = (run) => {
      const f = run.factors;
      const rows = [
        ["Tonal structure", `${run.parts.tonal_organization.toFixed(1)} / 50`],
        ["Development", `${run.parts.development.toFixed(1)} / 40`],
        ["Dynamics", `${run.parts.dynamics.toFixed(1)} / 10`],
        ["= music points", `${run.content.toFixed(1)} / 100`],
        ["Clean sound", "x" + f.signal_integrity.toFixed(2)],
        ["No broken samples", "x" + f.noise_integrity.toFixed(2)],
        ["Clean loop", "x" + f.loop_continuity.toFixed(2)],
        ["Long enough", "x" + f.duration_sufficiency.toFixed(2) + ` (${(run.audio.duration ?? 0).toFixed(0)} s)`],
        ...(run.caps.length && run.uncapped != null ? [["Before caps", run.uncapped.toFixed(1)]] : []),
        ["= score", run.score.toFixed(1) + (run.caps.length ? " (capped)" : "")],
      ];
      holder.replaceChildren(
        h("div", { class: "row", style: { gap: "4px", margin: "2px 0 6px" } }, h("span", {}, "Pick a run:"),
          dropdown({ label: "Example run", items: data.runs.filter((x) => !x.failed).map((x) => ({ value: x.slug, label: nameOf(x), badge: x.maker, right: x.score.toFixed(1) })), value: run.slug, width: 220, onChange: (s2) => render(data.bySlug[s2]) })),
        h("table", { class: "plain" }, ...rows.map(([a, b]) => h("tr", {},
          h("td", { style: { color: a.startsWith("=") ? "#fff" : null } }, a),
          h("td", { style: { color: "#fff", textAlign: "right" } }, b)))));
    };
    render(r0);
    return holder;
  }

  // ---------------- Support ----------------
  // Hover note for the spend total: the attempt count, the ledger's basis, then coverage and the price caveat.
  const spendTip = (l) => [
    `Every run I've paid for: ${l.runs} in total.`,
    "That includes failed, retried, unpublished and older runs, not just the ones on the board.",
    "",
    "Cost = tokens used x published API price.",
    "Some runs went through subscriptions (OAuth) instead of the paid API, so they cost me less than this. A subscription still costs money, though.",
    "",
    "An estimate at list price, not an actual bill.",
  ].join("\n");
  function support() {
    main.style.gridTemplateColumns = "minmax(0,1fr) minmax(0,1fr)";
    main.style.gridTemplateRows = "auto auto minmax(0,1fr)";
    // An optional explicit ledger; otherwise estimate only the published attempts.
    const ledger = data.spend ?? (() => {
      const by = new Map();
      for (const r of data.runs) {
        const m = by.get(r.model) ?? { name: r.label, maker: r.maker, runs: 0, usd: null, unpriced_runs: 0, bounded_runs: 0, unknown_cost_runs: 0, recorded_usage_cost_range_usd: null };
        m.runs++; if (r.cost_usd == null) m.unpriced_runs++; else m.usd = (m.usd ?? 0) + r.cost_usd;
        const bounds = r.cost_usd != null ? { min: r.cost_usd, max: r.cost_usd } : r.cost_range_usd;
        if (bounds) {
          const range = m.recorded_usage_cost_range_usd ??= { min: 0, max: 0 };
          range.min += bounds.min; range.max += bounds.max;
          if (r.cost_usd == null) m.bounded_runs++;
        } else m.unknown_cost_runs++;
        by.set(r.model, m);
      }
      const models = [...by.values()].sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1));
      const priced = models.filter((m) => m.usd != null);
      const bounds = models.filter((m) => m.recorded_usage_cost_range_usd);
      return { models, runs: data.runs.length, total_usd: priced.length ? priced.reduce((s, m) => s + m.usd, 0) : null,
        recorded_usage_cost_range_usd: bounds.length ? {
          min: bounds.reduce((s, m) => s + m.recorded_usage_cost_range_usd.min, 0),
          max: bounds.reduce((s, m) => s + m.recorded_usage_cost_range_usd.max, 0),
        } : null,
        bounded_runs: models.reduce((s, m) => s + m.bounded_runs, 0),
        unknown_cost_runs: models.reduce((s, m) => s + m.unknown_cost_runs, 0),
        unpriced_runs: models.reduce((s, m) => s + m.unpriced_runs, 0), basis: "Published attempts only. Token usage times the supplied maker list prices." };
    })();
    main.replaceChildren(
      h("section", { class: "panel raised", style: { gridColumn: "1 / -1" } },
        h("div", { class: "big", style: { textAlign: "center", padding: "6px 0 4px" } }, SUPPORT.heading.toUpperCase()),
        h("div", { class: "well sunken" }, ...SUPPORT.paragraphs.map((p) => h("p", { style: { margin: "0 auto 7px" } }, p)))),
      h("section", { class: "panel raised" }, h("h2", {}, "Fund benchmark runs"),
        h("div", { class: "well sunken", style: { flex: "1", display: "flex", flexDirection: "column" } },
          h("p", {}, "Fund a specific model: pick one from the wanted list and name it in your donation note."),
          h("p", {}, "Monthly support pays for testing new releases. One-off donations help keep future runs going."),
          h("div", { class: "row donation-links", style: { marginTop: "auto" } }, h("a", { class: "btn cta", href: SITE.sponsors, target: "_blank", rel: "noopener" }, "GitHub Sponsors"), h("a", { class: "btn cta", href: SITE.kofi, target: "_blank", rel: "noopener" }, "Ko-fi"), h("a", { class: "btn cta", href: "/crypto", target: "_blank", rel: "noopener" }, "Crypto")))),
      h("section", { class: "panel raised" }, h("h2", {}, SUPPORT.contribution.heading),
        h("div", { class: "well sunken", style: { flex: "1", display: "flex", flexDirection: "column" } },
          ...SUPPORT.contribution.paragraphs.map((p) => h("p", {}, p)),
          h("div", { class: "row", style: { marginTop: "auto" } }, h("a", { class: "btn cta", href: SITE.contributorGuide, target: "_blank", rel: "noopener" }, SUPPORT.contribution.button)))),
      h("section", { class: "panel raised" }, h("h2", {}, "Wanted: untested models"),
        h("div", { class: "sunken ft2-scroll support-list", style: { flex: "1", padding: "2px", overflow: "auto" } },
          h("div", { class: "muted wanted" }, h("span", { style: { gridColumn: "1 / span 2" } }, "Model"), h("span", {}, "Price in/out"), h("span", { class: "we" }, "Est.")),
          ...SUPPORT.wanted.map((w) => {
            const range = `3 typical runs ${usd(w.typical)}. 3 long runs ${usd(w.est)} (the estimate). 3 heavy runs ${usd(w.heavy)}.`;
            const pct = Math.min(100, (w.raised / w.est) * 100);
            const raised = `${usd(w.raised)} of ${usd(w.est)} raised`;
            return h("div", { class: "wanted" },
              badge(w.maker),
              h("span", { class: "wn" }, w.model,
                w.tip ? h("span", { class: "hint", tabindex: "0", "aria-label": w.tip, "data-tip": w.tip }, "*") : null),
              h("span", { class: "muted" }, w.price),
              h("span", { class: "hint goal we", tabindex: "0", "aria-label": range, "data-tip": range }, usd(w.est)),
              h("span", { class: "fund sunken", role: "progressbar", "aria-label": raised, "aria-valuemin": "0", "aria-valuemax": String(w.est), "aria-valuenow": String(w.raised), title: raised },
                h("i", { style: { width: pct + "%" } }),
                h("b", {}, raised)));
          }),
          h("details", { class: "fold" },
            h("summary", { class: "btn" }, SUPPORT.costHelp.summary),
            ...SUPPORT.costHelp.sections.flatMap((g) => [
              h("div", { class: "fold-h" }, g.title),
              ...g.lines.map((l) => h("p", {}, l)),
            ])))),
      h("section", { class: "panel raised" }, h("h2", { style: { position: "relative", overflow: "visible" } },
        h("span", { class: "hint goal", tabindex: "0", style: { color: "#fff" }, "data-tip": spendTip(ledger), "aria-label": spendTip(ledger) }, `Estimated spend: ${spendText(ledger, ledger.total_usd)}`)),
        h("div", { class: "sunken ft2-scroll support-list", style: { flex: "1", overflow: "auto", padding: "2px" } },
          ...ledger.models.map((m) => h("div", { class: "row spend-row", style: { height: "18px" }, title: spendTip(m) },
            badge(m.maker), h("span", { class: "grow muted spend-model" }, m.name), h("span", { class: "muted", style: { width: "48px", textAlign: "right" } }, `${m.runs} run${m.runs === 1 ? "" : "s"}`),
            h("span", { style: { minWidth: "92px", textAlign: "right" } }, spendText(m, m.usd)))))));
  }

  // Rankings selection is part of the URL (/rankings/<model>[/<attempt>]) without re-rendering the page.
  function select(s2) {
    S.sel = slug = s2;
    ctx.go({ page: "ranking", run: s2, mode: S.mode }, { replace: true, silent: true });
  }
  const favicon = document.querySelector("link[rel=icon]");
  function renderPage() {
    cancelAnimationFrame(raf);
    shell.dataset.page = page;
    renderTabs();
    if (favicon) favicon.href = page === "support" ? "/core/icons/smiley.png" : "/core/icons/keys.png";
    if (page === "ranking") { S.sel = slug; if (S.mode === "best" && S.view === "best" && !data.bySlug[slug].isBest) S.view = "all"; }
    if (page === "viewer") viewer();
    else if (page === "ranking") ranking();
    else if (page === "scoring") scoring();
    else support();
  }
  // Page change: freeze the old page as a ghost over the new one, then run the slide-deck transition
  // (core/transitions.js) on both panel lists. A new change mid-transition cancels the old one.
  let lastPage = page, fxRun = 0;
  const topPanels = (root) => [...root.querySelectorAll(".panel, .toc")].filter((el) => !el.parentElement.closest(".panel, .toc"))
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .sort((a, b) => (Math.abs(a.r.top - b.r.top) < 4 ? a.r.left - b.r.left : a.r.top - b.r.top)).map((x) => x.el);
  function transition(forceDir) {
    const dir = forceDir ?? (PAGES.findIndex((p) => p.id === page) >= PAGES.findIndex((p) => p.id === lastPage) ? 1 : -1);
    lastPage = page;
    const my = ++fxRun;
    shell.querySelectorAll(".ghost").forEach((g) => g.remove());
    main.querySelectorAll("[class*=' t-'], [class^='t-']").forEach((el) => [...el.classList].filter((c) => c.startsWith("t-")).forEach((c) => el.classList.remove(c)));
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { renderPage(); return; }
    const ghost = main.cloneNode(true);
    ghost.classList.add("ghost");
    const srcC = main.querySelectorAll("canvas");
    ghost.querySelectorAll("canvas").forEach((c, i) => { const s2 = srcC[i]; if (s2?.width) { c.width = s2.width; c.height = s2.height; c.getContext("2d").drawImage(s2, 0, 0); } });
    // cloneNode resets scroll positions: copy them so scrolled lists (Rankings) leave from where they were.
    const scrolled = [...main.querySelectorAll("*")].map((el, i) => [i, el.scrollTop, el.scrollLeft]).filter(([, t, l]) => t || l);
    ghost.style.cssText = main.style.cssText + `;position:absolute;left:${main.offsetLeft}px;top:${main.offsetTop}px;width:${main.offsetWidth}px;height:${main.offsetHeight}px;`;
    shell.append(ghost);
    const ghostAll = ghost.querySelectorAll("*");
    for (const [i, t, l] of scrolled) { ghostAll[i].scrollTop = t; ghostAll[i].scrollLeft = l; }
    renderPage();
    const total = slide({ outs: topPanels(ghost), ins: topPanels(main), dir, root: main });
    setTimeout(() => {
      if (my !== fxRun) return;
      ghost.remove();
      for (const el of main.querySelectorAll("*")) for (const c of [...el.classList]) if (c.startsWith("t-")) el.classList.remove(c);
    }, total);
  }
  renderPage();
  return {
    update(p) {
      const pageChanged = p.page !== page, runChanged = p.run !== slug, modeChanged = p.mode !== S.mode;
      page = p.page; slug = p.run; S.mode = p.mode ?? "best";
      if (pageChanged) transition();
      else if (runChanged && page === "viewer") loadRun(slug);
      else if (runChanged || modeChanged) renderPage();
    },
    destroy() { cancelAnimationFrame(raf); V?.player?.destroy(); removeEventListener("resize", fit); },
  };
}
