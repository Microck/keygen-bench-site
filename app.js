// Router. Clean paths:
//   /tracker[/<model>[/<attempt>]]   /rankings[/<model>[/<attempt>]]   /scoring   /support
// <model> is the model key (e.g. gpt-5.5); without <attempt> it means the model's best attempt. "/" is the tracker.
import { loadData } from "./core/data.js";
import { loadFonts } from "./core/fb.js";
import { mount } from "./site.js";
import { modelItems } from "./core/ui.js";

const app = document.getElementById("app");
let data, site = null;

const SEG = { viewer: "tracker", ranking: "rankings", scoring: "scoring", support: "support" };
const PAGE = Object.fromEntries(Object.entries(SEG).map(([k, v]) => [v, k]));

function params() {
  const [seg, model, attempt] = location.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const page = PAGE[seg] ?? "viewer";
  const m = data.byModel[model];
  const mode = new URLSearchParams(location.search).get("mode") === "average" ? "average" : "best";
  const leader = mode === "average" && page === "ranking" ? Object.values(data.byModel).find((model) => model.averageRank === 1)?.best : null;
  // Information pages keep their originating attempt in this history entry.
  const remembered = page === "scoring" || page === "support" ? data.bySlug[history.state?.run] : null;
  // The bare tracker opens the first entry of its own menus: the top company and its newest model.
  const firstMaker = data.makers[0];
  const opening = page === "viewer" && firstMaker ? data.bySlug[modelItems(data, firstMaker.name, null)[0]?.value] : null;
  const run = (m && (attempt ? m.runs.find((r) => String(r.attempt) === attempt) : m.best)) ?? remembered ?? leader ?? opening ?? data.runs.find((r) => r.rank === 1) ?? data.runs[0];
  return { page, run: run.slug, mode };
}

// Path for a page + run. Model-specific only on the pages that show one run.
export function pathFor(page, slug, mode = "best") {
  const r = data.bySlug[slug];
  const base = "/" + SEG[page];
  const path = !r || (page !== "viewer" && page !== "ranking") ? base
    : `${base}/${encodeURIComponent(r.model.key)}${r.isBest ? "" : "/" + r.attempt}`;
  return path + (mode === "average" ? "?mode=average" : "");
}

// next: { page?, run?, mode? }. replace rewrites the URL; silent skips rendering.
function go(next, { replace = false, silent = false } = {}) {
  const cur = params();
  const page = next.page ?? cur.page, run = next.run ?? cur.run, mode = next.mode ?? cur.mode;
  history[replace ? "replaceState" : "pushState"]({ run }, "", pathFor(page, run, mode));
  if (!silent) render();
}

async function render() {
  const p = params();
  if (site) { site.update(p); return; }
  app.replaceChildren();
  site = await mount(app, { data, ...p, go, pathFor });
}

addEventListener("popstate", render);

// core/intro.js covers the page while it loads and mounts, then reveals it; without it the page appears once mounted.
const intro = globalThis.bootIntro;
const step = (promise, label) => intro ? intro.track(promise, label) : promise;

try {
  [data] = await Promise.all([
    step(loadData("/dist/"), "READING RESULTS"),
    step(Promise.all([loadFonts(), document.fonts.load('10px "FT2"'), document.fonts.load('20px "FT2 Big"'), document.fonts.load('7px "FT2 Tiny"')]), "LOADING FT2 FONTS"),
  ]);
  await render();
  intro?.done();
} catch (err) {
  app.innerHTML = `<div id="boot">${String(err.message || err)}</div>`;
  intro?.fail();
  throw err;
}
