// Page copy. Scoring text is condensed from benchmark/README.md.

export const SITE = {
  title: "KEYGEN BENCH",
  repo: "https://github.com/Microck/keygen-bench",
  twitter: "https://x.com/JustMicrock",
  sponsors: "https://github.com/sponsors/Microck",
  kofi: "https://ko-fi.com/microck",
  contributorGuide: "https://github.com/Microck/keygen-bench/blob/main/CONTRIBUTING-RUNS.md",
};

export const PAGES = [
  { id: "viewer", label: "Tracker", key: "F1" },
  { id: "ranking", label: "Rankings", key: "F2" },
  { id: "scoring", label: "Scoring", key: "F3" },
  { id: "support", label: "Support", key: "F4" },
];

// Scoring page copy. Plain language first; exact thresholds live in the collapsible "details" lines.
// Numbers match the scorer in benchmark/score*.py.
// Sources: README.md "Core finding"; patch, "The Soundtrack of Online Piracy" (2025), youtu.be/zHgcrdv8zpM.
export const KEYGEN = {
  title: "What is a keygen?",
  lines: [
    "A keygen (key generator) is a small program that makes serial numbers for paid software. Cracking groups from the warez scene released them through the 1990s and 2000s.",
    "Most keygens started playing music the moment they opened. The habit came from cracktros: short intros that groups put in front of cracked games on the Commodore 64 and Amiga in the 1980s, showing the group's name, greetings and a catchy tune.",
    "The tunes were tracker modules (MOD, XM, S3M, IT). A module stores a few short samples plus a note-by-note score, and a tiny player inside the program mixes it live. A whole song fits in tens of kilobytes, small enough to ride along inside a download.",
    "This benchmark asks AI models to write one of those tunes from scratch in FastTracker II, one of the trackers the scene used, and then scores what they made.",
  ],
};

export const DISCLAIMER = {
  title: "Treat it as a guide",
  lines: [
    "Music can't be judged objectively. One person's favourite tune can grate on someone else, and both are right.",
    "The score measures pitched clarity, development, loudness variation and technical properties of the audio and module. It does not measure listener preference.",
    "The rules favor some kinds of music. Comparing them with reference tracks does not prove that the ranking is fair. Use the score as a guide, and listen for yourself.",
  ],
};

export const OVERVIEW = [
  "A score has two parts. First the tune earns up to 100 content points. Then signal integrity and loop continuity can reduce the total.",
  "The total is multiplied by a signal factor between 0 and 1 and a loop factor between 0.75 and 1. Two artifact caps can limit the result further.",
  "These fixed rules measure properties of the audio and module, not how good the music sounds to a listener.",
];

// id, title, max (points or "x1.0" multiplier), plain summary, what earns credit, what loses it, details.
export const SCORING = [
  {
    id: "tonal", kind: "points", max: 50, title: "Pitched clarity",
    plain: "How much of the sound has a clear pitch?",
    good: "Clearly pitched sound, including slow notes, chromatic melodies and sustained tones.",
    bad: "Little detectable pitched sound. Noise-based music can score lower without being defective.",
    details: "The detector measures captured harmonic power in short audio windows and averages it over active time. Half the power earns full credit. Key concentration and pitch variety are diagnostics, not penalties. A stationary tone can earn full clarity credit, but this says nothing about its development or musical merit.",
  },
  {
    id: "development", kind: "points", max: 40, title: "Development",
    plain: "Do related ideas change across short and long passages?",
    good: "Recognizable note and rhythm shapes with contrasting passages, including sparse ideas and ideas handed between channels.",
    bad: "An unchanged short cycle provides no longer-scale development. Channel numbers, instrument slots and nonzero volume changes do not earn credit.",
    details: "The scorer compares complete 4-, 8- and 16-beat passages. Each voice earns credit for its relationship to a changed idea and its contrast with the rest of the tune. Its contribution is squared similarity times contrast, averaged equally across voices, passages and the three passage lengths. Exact copies supply no transformation evidence. A steady accompaniment cannot establish development in an unrelated melody. Incomplete passages supply no evidence. Changes in timbre and music without recurring ideas can be missed.",
  },
  {
    id: "dynamics", kind: "points", max: 10, title: "Dynamics",
    plain: "Does the loudness move?",
    good: "Some contrast between quieter and louder moments.",
    bad: "The same level from start to end (flagged FLAT), or wild jumps.",
    details: "Two ranges, weighted 25% and 75%: full credit for a 3 to 18 dB range between short moments, and for a 1 to 10 dB range across 3-second stretches. Under 2 dB between short moments is flagged FLAT.",
  },
  {
    id: "integrity", kind: "multiplier", title: "Clean sound",
    plain: "Does it play without technical faults?",
    good: "No clipping, no long silences, a sensible loudness.",
    bad: "Distortion from clipping, dead air, or a tune so quiet it is barely there.",
    details: "Weighs clipping (35%), the share of silence (25%), DC offset (15%), the longest silent gap (15%) and peak level (10%). Loudness gets full credit from -30 LUFS up and falls to nothing at -60 LUFS; louder earns nothing extra.",
  },
  {
    id: "loop", kind: "multiplier", title: "Clean loop",
    plain: "Keygen tunes repeat forever. Does the restart sound seamless?",
    good: "The end flows back into the start without a click, gap, volume jump or broken rhythm.",
    bad: "A click, silence or stumble every time it restarts.",
    details: "FT2 plays each tune continuously and every restart is measured for clicks, gaps, level jumps, broken rhythm and tone change. The worst one counts. A tune that never restarts gets the lowest loop quality. This check can take away at most a quarter of the score.",
  },
  {
    id: "caps", kind: "cap", title: "Caps",
    plain: "Two faults set a ceiling on the score instead of a multiplier.",
    good: "A tune that is mostly not silent, built from instruments playing patterns.",
    bad: "A tune that is 99% silence scores 0. A tune that looks like one long pre-recorded sample playing back (a sample over 8 seconds while the patterns cover under a quarter of the song) is capped at 40.",
    details: "Run details show the uncapped score next to the final one. The score is rounded once, to 0.1, at the end.",
  },
];

export const SCORING_NOTES = [
  { id: "calibration", title: "Reference measurements", text: "The pitched-power, DC-offset and loop level and tone bounds come from archived keygen tunes, not listener ratings. A clear sustained tone can earn all 50 pitched-clarity points without development credit. Duration, sustained noisiness, key concentration and pitch variety are diagnostics, with no separate score multiplier." },
  { id: "judges", title: "No judges", text: "No people and no AI rate the tunes. The same fixed rules score every model, with no special cases." },
  { id: "flags", title: "Flags are notes, not penalties", text: "Flags point out something worth listening for, like a masked melody. Only the checks and caps above change the score." },
  { id: "cost", title: "How cost is estimated", text: "Estimated from the tokens each run used, at the maker prices supplied with the publication. It's what the run would cost at those prices, not what was billed. Models without a published API price show n/a." },
];

// Setup page copy. Sources: benchmark/run.py, benchmark/Dockerfile, benchmark/campaign.py, benchmark/README.md,
// the current launch config (limits) and benchmark/prompts/*.txt.
export const SETUP = [
  { title: "Who plays", lines: [
    "Every model runs in the same harness: mini-swe-agent 2.4.6, with one bash tool. Each reply is one step, and every command in it runs in order in a fresh shell in /workspace. Files and the running FastTracker II session persist between commands.",
    "Command output over 20,000 bytes shows only its first and last 10,000 bytes. Every result ends with the minutes left.",
  ] },
  { title: "Where it runs", lines: [
    "An offline Docker container (Debian bookworm-slim, pinned): no network, no credentials, no coding-agent client, no skills. It has bash, Python 3, NumPy and FastTracker II.",
    "FastTracker II is the ft2-clone, built from a pinned commit, driven through an ft2 command that exposes samples, named instruments, patterns, order, tempo, save and render. Envelopes and note-to-sample mapping aren't available, so sounds are shaped in the sample data itself.",
    "The model can't hear anything. It can render to WAV and inspect the audio with NumPy.",
  ] },
  { title: "The task", lines: [
    "Save an editable FastTracker II module (XM) to /workspace/submission/tune.xm, then submit. If time runs out, whatever tune.xm is saved at that moment is collected. There is no repair after submitting.",
  ] },
  { title: "Limits", table: [
    ["Time", "120 minutes wall clock"],
    ["Steps", "no limit"],
    ["One command", "120 seconds, then it is stopped"],
    ["One model request", "60 minutes"],
    ["Submission folder", "128 MiB, 4096 files"],
    ["Attempts", "up to 3 per model"],
  ] },
  { title: "Models and effort", lines: [
    "Each model runs at the highest reasoning setting documented for its exact route (for example max, xhigh, high or thinking-on). These levels are vendor-specific, so equal names don't mean equal compute.",
  ] },
  { title: "Rendering and scoring", lines: [
    "After the run, a trusted process renders the submitted XM with the same pinned FT2 at 44.1 kHz, 16-bit. That WAV is what gets scored (the MP3 is a listening copy).",
    "For the loop check, FT2 plays the module continuously without resetting, and every restart is measured.",
  ] },
  { title: "Attempts and ranking", lines: [
    "Each model gets up to three independent attempts under the same conditions. The Rankings page ranks each model by its best-scoring attempt and says how many attempts it was the best of.",
    "Models with more attempts have more chances at a high score, so the Cons. column shows how much the attempts agree. Show: All attempts lists every one.",
  ] },
];

// Prompts, verbatim (benchmark/prompts/system.txt and task.txt), with this campaign's limits filled in.
export const PROMPTS = [
  { title: "System prompt", text: `You are composing music in an isolated workspace. Use the bash tool to run commands and complete the task.
Each command runs in /workspace in a fresh bash shell; files and the FT2 session persist between commands. Budget: no limit on steps, 120 minutes; a step is one reply, and every tool call in it runs in order. Every tool result ends with <time_left>, the minutes remaining.
A command still running after 120 seconds is stopped and returns exit code 124 (137 if it had to be killed). Command output over 20,000 bytes shows only its first and last 10,000 bytes.
The \`ft2 list\` command describes the tracker tools. \`ft2 call TOOL 'JSON_OBJECT'\` calls one tool. \`ft2 batch FILE.json\` executes a list of {"name": TOOL, "arguments": {...}} calls in order.
This FT2 build exposes samples, instruments by name, patterns, order, tempo, save and render. Envelopes and note-to-sample mapping are unavailable; shape sounds in the sample data itself.
Python 3 and NumPy are available for creating original sound material, editing files, and analyzing renders. Writing the XM bytes yourself is allowed. Keep it a real tracker module, with instruments and patterns doing the work, not one long pre-rendered sample.
The workspace is offline: no network, no coding-agent client, no skill library. You cannot hear audio; render to WAV with module_render and inspect the result with NumPy to check your work, then revise.
A keygen tune plays in a loop. Compose so the module loops cleanly from its end back to its restart position.
Save the final editable module as /workspace/submission/tune.xm. A WAV preview and source scripts may accompany it. The submission directory may hold at most 128 MiB in at most 4096 regular files (subdirectories are fine; links and special files are not). If the accompanying files break these limits they are dropped and only tune.xm is kept. A trusted process renders the final XM separately.
If the time budget runs out, the session stops and the tune.xm saved at that moment is collected as the submission.
Submit by running exactly this command:
echo COMPLETE_TASK_AND_SUBMIT_FINAL_OUTPUT
Submission ends the session. There is no second attempt or post-submission repair.` },
  { title: "Task prompt", text: `You have FastTracker II and Python/NumPy at your disposal. Make an original keygen tune. Music only.
Choose the sound, tempo, harmony, rhythm, instruments, length and arrangement yourself.` },
];

export const SUPPORT = {
  heading: "Unlike keygens, this is not free to run",
  paragraphs: [
    "I pay for this benchmark myself, including API credits, subscriptions and compute for every run. Some models are too expensive for me to test out of pocket.",
    "Help fund a model you're curious about, support future testing, or contribute a benchmark run using your own model access.",
  ],
  contribution: {
    heading: "Contribute a benchmark run",
    paragraphs: [
      "Run the benchmark with your own model access and submit the results. Guided setup helps you configure a provider, check the environment and try a short run before all three official attempts.",
      "Use API keys, compatible custom endpoints, or Anthropic and Codex OAuth through your own authorized local bridge.",
    ],
    button: "View the contributor guide",
  },
  // Planning estimates = assumed token use x the listed price, rounded up to the next $5.
  // Prices checked 2026-10-06 against developers.openai.com/api/docs/pricing (Standard) and Anthropic's legacy price list.
  // Run sizes: typical 1.03M input / 125k output, long 3.5M / 270k, heavy 6.9M / 333k.
  // Models with a cached-input price assume 94.5% cached input; Pro models assume full-price input.
  // Every figure covers three attempts; est uses the long-run assumption. Update prices before fundraising.
  // raised: USD donated so far towards that model; update by hand.
  // tip: shows a hover asterisk with this note.
  wanted: [
    { model: "o1-pro", maker: "OpenAI", price: "$150/$600", typical: 690, est: 2065, heavy: 3705, raised: 0 },
    { model: "gpt-5.5-pro", maker: "OpenAI", price: "$30/$180", typical: 165, est: 465, heavy: 805, raised: 0 },
    { model: "gpt-5.4-pro", maker: "OpenAI", price: "$30/$180", typical: 165, est: 465, heavy: 805, raised: 0 },
    { model: "gpt-5.2-pro", maker: "OpenAI", price: "$21/$168", typical: 130, est: 360, heavy: 605, raised: 0 },
    { model: "o3-pro", maker: "OpenAI", price: "$20/$80", typical: 95, est: 275, heavy: 495, raised: 0 },
    { model: "gpt-5-pro", maker: "OpenAI", price: "$15/$120", typical: 95, est: 255, heavy: 435, raised: 0 },
    { model: "claude-3-opus", maker: "Anthropic", price: "$15/$75", typical: 40, est: 85, heavy: 125, raised: 0, tip: "I also need access to this model: it's retired and only open to researchers. If you can lend me a hand getting API access, it would be really appreciated." },
    // "GPT-6 Pro" is ChatGPT's name; the API has no gpt-6-pro ID: it is gpt-6-astra with reasoning.mode "pro", billed at Astra's rates
    // but doing several times the work. Tokens assumed 6x a normal run (gpt-5.5-pro's price is 6x gpt-5.5's).
    { model: "gpt-6-pro", maker: "OpenAI", price: "$10/$50", typical: 145, est: 340, heavy: 490, raised: 0 },
  ],
  // Collapsible note under the wanted list.
  costHelp: {
    summary: "How the estimate works",
    sections: [
      { title: "Where the estimate comes from", lines: [
        "Each estimate is what three longer-than-usual runs would cost at the model's public API price (shown as dollars per million tokens in/out).",
        "Runs vary a lot. The model decides how many turns it takes, from a dozen to several hundred, and every turn resends the whole conversation, so a long run costs far more than a short one.",
        "The planning assumptions per run are 1.03 million input and 125,000 output tokens for typical, 3.5 million and 270,000 for long, and 6.9 million and 333,000 for heavy. These are estimates, not limits or measured usage for a new model.",
        "Every model gets three attempts, so each figure is three runs of that size. The estimate is three long runs. Hover an estimate to see the other two.",
      ] },
      { title: "Chipping in", lines: [
        "You don't have to cover a whole run. Any amount counts, and the bar next to each model shows how much has been raised so far.",
        "You can also aim for a typical run instead, which is cheaper. I can't promise that will be enough to finish the benchmark; actual token use can exceed the estimate.",
      ] },
      { title: "What happens with the money", lines: [
        "Once a model reaches its estimate, I run its three attempts and publish the results, whatever they score.",
        "If the runs cost less, the rest goes to the next model on this list. If they cost more, I cover the difference from general support.",
        "The list-price estimate goes on the board next to the scores. It is not an actual provider bill.",
      ] },
    ],
  },
};
