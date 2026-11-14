// Dates mark source PR merges, historical snapshots, or the latest date by
// which a run was archived. They are not model release dates or verified first
// website addition dates. Unknown models remain in the undated group.
export const MODEL_HISTORY = [
  { date: "2026-11-12", kind: "repository", commits: ["8deb1eba8702"], keys: ["gemini-4-hydrogen"], note: "Run archive added; publication date may differ" },
  { date: "2026-11-12", kind: "repository", commits: ["e57951647cdc"], keys: ["gpt-6.1-sol-pro"], note: "Run archive added; publication date may differ" },
  { date: "2026-11-12", kind: "repository", commits: ["f534816fd924"], keys: ["gpt-6-sol-pro"], note: "Run archive added; publication date may differ" },
  { date: "2026-11-11", kind: "repository", commits: ["1d156389a579"], keys: ["gpt-6-luna-pro"], note: "Run archive added; publication date may differ" },
  { date: "2026-11-10", kind: "repository", commits: ["0a0dae9"], keys: ["gemini-4-carbon"], note: "Run archive added; publication date may differ" },
  { date: "2026-11-10", kind: "repository", commits: ["675d5cda8791"], keys: ["claude-fable-5-2"], note: "Run archive added; publication date may differ" },
  { date: "2026-11-09", kind: "repository", commits: ["1085e05cecd6"], keys: ["o3"], note: "Run archive added; publication date may differ" },
  { date: "2026-11-09", kind: "repository", commits: ["8abea8ebbd9e"], keys: ["gpt-5"], note: "Run archive added; publication date may differ" },
  { date: "2026-11-09", kind: "repository", commits: ["992b284ab56b"], keys: ["gpt-5-mini"], note: "Run archive added; publication date may differ" },
  { date: "2026-11-09", kind: "repository", commits: ["30e43bdcf4cb"], keys: ["gpt-5-nano"], note: "Run archive added; publication date may differ" },
  { date: "2026-11-09", kind: "repository", commits: ["06cbabaf1253"], keys: ["gpt-5-pro"], note: "Run archive added; publication date may differ" },
  { date: "2026-11-08", kind: "repository", commits: ["c7605a0cde9c"], keys: ["gpt-6-pro"], note: "Run archive added; publication date may differ" },
  { date: "2026-10-28", pr: 124, keys: ["kimi-k3.1-pro"] },
  { date: "2026-10-26", pr: 121, keys: ["gpt-6.1-terra"], note: "Publication-ready results added" },
  { date: "2026-10-19", pr: 114, keys: ["minimax-m3.1-flash"], note: "Renamed from Space Bunny; new ranked results" },
  { date: "2026-10-13", pr: 105, keys: ["gemini-4-argon"] },
  { date: "2026-10-13", pr: 100, keys: ["longcat-2.5-preview", "mimo-v2.5"] },
  { date: "2026-10-12", pr: 97, keys: ["step-5-preview", "mimo-v2.6-flash"], note: "Ranked results added" },
  { date: "2026-10-12", pr: 92, keys: ["grok-4.20-0309-non-reasoning", "grok-4.20-0309-reasoning", "grok-4.3", "grok-build", "grok-build-0.1", "grok-composer-2.5-fast"] },
  { date: "2026-10-08", pr: 74, keys: ["claude-haiku-4-5-20251001", "claude-haiku-5-5"] },
  { date: "2026-10-07", pr: 67, keys: ["gpt-oss-20b", "hermes-4-405b", "qwen3.5-397b-a17b", "qwen3.8-27b"] },
  { date: "2026-10-06", kind: "repository", commits: ["75eb0823c894", "96594a429751", "d4d3e137125a", "a1220c33899c", "f8936910b2ea", "798f640b1113"], keys: ["command-a-plus-05-2026", "command-a-reasoning-08-2025", "mistral-large-4", "muse-glimmer-30b", "nemotron-3.5-lightning", "north-mini-code"] },
  { date: "2026-10-05", kind: "repository", commits: ["1fd64409c697", "465621850aed", "4ea80a049b19", "bbc82547c810"], keys: ["claude-opus-5-5", "deepseek-v4-flash", "glm-5-3", "glm-5-3-flash", "glm-5.2", "grok-4-5", "grok-4-7", "hy4-preview", "kimi-k2-6", "kimi-k2-7", "kimi-k3", "mimo-v2.6-pro", "minimax-m2.7", "minimax-m3", "nemotron-3-super-120b-a12b", "nemotron-3-ultra", "step-3.7-flash", "swe-1-6", "swe-1-7-lightning", "swe-2"] },
  { date: "2026-10-01", pr: 22, kind: "snapshot", note: "Documented in October 1 snapshots, including pilot entries; first addition dates are unverified", keys: [
    "claude-fable-5", "claude-fable-5-1", "claude-opus-4-5-20251101", "claude-opus-4-6", "claude-opus-4-7", "claude-opus-4-8", "claude-opus-5", "claude-sonnet-4-6", "claude-sonnet-5", "claude-sonnet-5-5",
    "deepseek-v4-1-flash", "deepseek-v4-pro", "gemini-3-flash-preview", "gemini-3.1-pro-preview", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash",
    "gpt-5-3-codex", "gpt-5-4", "gpt-5-4-mini", "gpt-5.5", "gpt-5.6-luna", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-6-astra", "gpt-6-luna", "gpt-6-sol", "gpt-6.1-sol", "gpt-oss-120b", "grok-4-6", "hy3", "inkling", "kimi-k2.7-code", "mercury-2.5", "muse-spark-1.2", "muse-spark-1.3", "qwen3.7-plus", "qwen3.8-flash",
  ] },
];

// Show only models in the loaded publication. An incomplete history never
// hides a current model or substitutes the model's release date.
export function modelChangelog(byModel, history = MODEL_HISTORY) {
  const seen = new Set();
  const dated = history.map((event) => ({ ...event, models: event.keys.flatMap((key) => {
    const model = byModel[key];
    if (!model || seen.has(key)) return [];
    seen.add(key);
    return [model];
  }) })).filter((event) => event.models.length);
  const undated = Object.values(byModel).filter((model) => !seen.has(model.key))
    .sort((a, b) => a.best.label.localeCompare(b.best.label));
  return { dated, undated };
}

// Group only for display; the underlying events retain their provenance.
export function groupChangelogDates(events) {
  const groups = new Map();
  for (const event of events) {
    if (!groups.has(event.date)) groups.set(event.date, []);
    groups.get(event.date).push(...event.models);
  }
  return Array.from(groups, ([date, models]) => ({ date, models }));
}
