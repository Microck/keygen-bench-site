// Data access for the FT2 site.
import { parseXM } from "./xm.js";

export async function loadData(base = "./dist/") {
  const res = await fetch(base + "data.json");
  if (!res.ok) throw new Error("Website data is missing. Build a publication with web/classic/build.py and serve its output directory.");
  const data = await res.json();
  data.base = base;
  const spend = await fetch(base + "spend.json");
  if (!spend.ok && spend.status !== 404) throw new Error(`Could not load spend data (${spend.status}).`);
  data.spend = spend.ok ? await spend.json() : null;
  const metadata = await fetch(base + "model-metadata.json");
  if (!metadata.ok && metadata.status !== 404) throw new Error(`Could not load model metadata (${metadata.status}).`);
  data.modelMetadata = metadata.ok ? await metadata.json() : {};
  groupAttempts(data);
  const byMaker = new Map();
  for (const r of data.runs) {
    if (!byMaker.has(r.maker)) byMaker.set(r.maker, []);
    byMaker.get(r.maker).push(r);
  }
  // Company menus list the makers with the most benchmarked models first; ties by best score, then name.
  data.makers = [...byMaker.entries()]
    .map(([name, runs]) => ({ name, runs, models: [...new Set(runs.map((r) => r.model))], best: Math.max(...runs.map((r) => r.score)) }))
    .sort((a, b) => b.models.length - a.models.length || b.best - a.best || a.name.localeCompare(b.name));
  data.bySlug = Object.fromEntries(data.runs.map((r) => [r.slug, r]));
  return data;
}

// Extract model names and ordinals from older snapshots that embed them in the name.
const attemptSuffix = /\s*\((?:(.*?)\s*,\s*)?attempt\s+(\d+)\)\s*$/i;

// One model = all its attempts. The ranked row is the model's best-scoring attempt; every row carries the
// model's attempt list (including failed and unstarted slots from the repetition group) for the
// consistency marker. Older snapshots (one run per model, `rank` already set) pass through unchanged.
function groupAttempts(data) {
  const groups = Object.fromEntries((data.repetition_groups ?? []).map((g) => [g.model_key, g]));
  const byModel = new Map();
  for (const r of data.runs) {
    const suffix = r.name.match(attemptSuffix);
    r.label = r.name.replace(attemptSuffix, "");
    r.attempt = r.provenance?.attempt_ordinal ?? (suffix ? Number(suffix[2]) : 1);
    const key = r.model_key ?? r.slug;
    if (!byModel.has(key)) byModel.set(key, []);
    byModel.get(key).push(r);
  }
  const models = [...byModel.entries()].map(([key, runs]) => {
    const scored = runs.filter((r) => !r.failed).sort((a, b) => a.attempt - b.attempt);
    const g = groups[key];
    // Slots: the group's declared attempts when it has one, else just the published runs.
    const slots = g ? g.attempts.map((a) => ({ ordinal: a.ordinal, score: a.eligible ? a.score : null, slug: a.slug ?? null,
      state: a.eligible ? "ok" : a.status === "RUNNING" || a.queue_pending || (!a.attempted && !a.stopped_by && g.pending) ? "pending" : a.attempted ? "failed" : "skipped",
      status: a.failure_category ?? a.status }))
      : scored.map((r) => ({ ordinal: r.attempt, score: r.score, slug: r.slug, state: "ok", status: r.status }));
    slots.sort((a, b) => a.ordinal - b.ordinal);
    const scores = scored.map((r) => r.score);
    const mean = scores.reduce((s, v) => s + v, 0) / (scores.length || 1);
    const sd = Math.sqrt(scores.reduce((s, v) => s + (v - mean) ** 2, 0) / (scores.length || 1));
    const best = scored.reduce((b, r) => (!b || r.score > b.score ? r : b), null) ?? runs[0];
    // Release metadata is about the model, never the campaign or attempt timestamp.
    const date = runs.find((r) => r.release_date)?.release_date ?? data.modelMetadata[key]?.release_date;
    const releaseDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? date : null;
    const model = { key, runs: scored, slots, best, releaseDate, n: scores.length, declared: slots.length,
      min: Math.min(...scores), max: Math.max(...scores), mean, sd };
    let costMin = 0, costMax = 0, costed = 0, bounded = false;
    const costAttempts = g ? g.attempts.map((a) => runs.find((r) => r.slug === a.slug) ?? a) : runs;
    for (const attempt of costAttempts) {
      if (attempt.cost_usd != null) {
        costMin += attempt.cost_usd; costMax += attempt.cost_usd; costed++;
      } else if (attempt.cost_range_usd) {
        costMin += attempt.cost_range_usd.min; costMax += attempt.cost_range_usd.max; costed++; bounded = true;
      }
    }
    model.totalCost = {
      cost_usd: costed && !bounded ? costMin : null,
      cost_range_usd: costed && bounded ? { min: costMin, max: costMax, reason: "Sum of the recorded ordinal attempt cost bounds." } : null,
      partial: costed < costAttempts.length,
      reason: `Total of ${costed}/${costAttempts.length} ordinal attempts with recorded costs. Failed attempts are included when their costs are known. Missing costs are excluded.`,
    };
    // Average only the eligible end of each predetermined ordinal's retry chain.
    // Keep run-based consistency statistics unchanged, including legacy snapshots.
    const averageScores = slots.filter((s) => s.state === "ok" && Number.isFinite(s.score) && !runs.find((r) => r.slug === s.slug)?.exhibition).map((s) => s.score);
    model.scoredSlots = averageScores.length;
    model.averageScore = averageScores.length ? averageScores.reduce((sum, score) => sum + score, 0) / averageScores.length : null;
    model.averageComplete = model.declared > 0 && model.scoredSlots === model.declared && !best.exhibition;
    for (const r of runs) { r.model = model; r.isBest = r === best; }
    return model;
  });
  data.byModel = Object.fromEntries(models.map((m) => [m.key, m]));
  models.filter((m) => m.averageComplete).sort((a, b) => b.averageScore - a.averageScore || a.key.localeCompare(b.key))
    .forEach((m, i) => { m.averageRank = i + 1; });
  if (data.runs.some((r) => r.rank)) return; // legacy snapshot: keep its ranks
  models.filter((m) => !m.best.failed && !m.best.exhibition).sort((a, b) => b.best.score - a.best.score)
    .forEach((m, i) => { m.best.rank = i + 1; });
}

// Both modes retain the same individual attempts and usage fields.
// Average changes the ranking metric, never the selected view or attempt score.
export function rankingRows(data, { mode = "best", maker = "All", view = "best", exhibitions = true, sort = "score", asc = false } = {}) {
  const average = mode === "average";
  const rows = data.runs.filter((r) => (exhibitions || !r.exhibition) && (view === "all" || (view === "first"
    ? r.attempt === Math.min(...r.model.runs.map((run) => run.attempt)) : r.isBest)))
    .map((r) => average ? { ...r, average: true, rank: r.exhibition || !r.isBest ? r.rank : r.model.averageRank ?? null } : r);
  const value = (r) => {
    switch (sort) {
      case "rank": return average ? r.rank : r.model.best.rank ?? null;
      case "name": return r.label;
      case "cons": return r.model.n > 1 ? r.model.max - r.model.min : null;
      case "cost": return r.model.totalCost.cost_range_usd?.max ?? r.model.totalCost.cost_usd ?? null;
      case "out": return r.usage.completion_tokens ?? null;
      case "min": return r.usage.wall_minutes ?? null;
      default: return average ? r.model.averageScore : r.score;
    }
  };
  return rows.filter((r) => maker === "All" || r.maker === maker).sort((a, b) => {
    if (average && a.model.averageComplete !== b.model.averageComplete) return a.model.averageComplete ? -1 : 1;
    const x = value(a), y = value(b);
    const aScore = average ? a.model.averageScore : a.score, bScore = average ? b.model.averageScore : b.score;
    const fallback = (aScore == null) - (bScore == null) || (bScore ?? 0) - (aScore ?? 0)
      || a.model.key.localeCompare(b.model.key) || b.score - a.score || a.attempt - b.attempt || a.slug.localeCompare(b.slug);
    // Unknown costs, usage and consistency stay last in either direction.
    if (x == null || y == null) return (x == null) - (y == null) || fallback;
    const direction = x < y ? -1 : x > y ? 1 : 0;
    return (asc ? direction : -direction) || fallback;
  });
}

// One fetch + parse per module, shared by the tracker and prefetches. A failed fetch is forgotten so
// a later load retries it.
const xmCache = new Map();
export function loadXM(data, run, priority = "high") {
  if (!run?.media.xm) return Promise.resolve(null);
  if (!xmCache.has(run.slug)) {
    const song = fetch(mediaUrl(data, run.media.xm), { priority })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
      .then(parseXM);
    song.catch(() => xmCache.delete(run.slug));
    xmCache.set(run.slug, song);
  }
  return xmCache.get(run.slug);
}
// A static export moves each run's playback trace out of data.json into media.trace (fetched when the
// tracker opens the run); served publications keep it inline. Resolves once run.trace is set.
const traceCache = new Map();
export function loadTrace(data, run, priority = "high") {
  if (!run || Array.isArray(run.trace) || !run.media.trace) return Promise.resolve();
  if (!traceCache.has(run.slug)) {
    const trace = fetch(mediaUrl(data, run.media.trace), { priority })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((t) => { run.trace = t; });
    trace.catch(() => traceCache.delete(run.slug));
    traceCache.set(run.slug, trace);
  }
  return traceCache.get(run.slug);
}
// Warm the caches for a run the visitor is likely to open next, without competing with visible work.
export function prefetchXM(data, run) {
  if (run?.media.xm && !xmCache.has(run.slug)) loadXM(data, run, "low").catch(() => {});
  loadTrace(data, run, "low").catch(() => {});
}

// Media paths are relative to data.json, or absolute when a publication serves media from another host.
export const mediaUrl = (data, path) => (/^https?:\/\//.test(path) ? path : data.base + path);

export const money = (v) => (v == null ? "n/a" : v < 0.01 ? "<$0.01" : "$" + v.toFixed(2));
export const usd = (v) => "$" + Math.round(v).toLocaleString("en-US");
export const tokens = (v) => (v == null ? "n/a" : v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? Math.round(v / 1e3) + "k" : String(v));
export const mmss = (s) => (s == null ? "--:--" : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`);
