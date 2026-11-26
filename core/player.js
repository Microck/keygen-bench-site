// Plays the canonical FT2 render (mp3) and maps audio time -> executed order/row using the
// FT2 row trace captured during scoring. Scopes are emulated from pattern data + sample PCM (visual only).
// Loop mode switches to the lossless render (WAV, or FLAC on static hosts) through Web Audio and repeats from the module's restart
// position to the end of the first pass, sample-accurately, the way the tune loops in a keygen.
import { cellAt } from "./xm.js";
import { mediaUrl } from "./data.js";

const RATE = 44100;

// Minimal HTMLMediaElement stand-in (currentTime/duration/paused/readyState/play/pause + events) over an
// AudioBufferSourceNode. With `loop` on it repeats loopStart..loopEnd; with it off it plays to the end.
class LoopAudio extends EventTarget {
  constructor(url, loopStart, loopEnd) {
    super();
    this.loopStart = loopStart; this.loopEnd = loopEnd; this.loop = true;
    this.paused = true; this.offset = 0; this.buffer = null; this.node = null;
    this.ctx = new AudioContext();
    this.ready = fetch(url).then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b)).then((buf) => {
      this.buffer = buf;
      this.loopEnd = Math.min(this.loopEnd, buf.duration);
      this.dispatchEvent(new Event("loadedmetadata")); this.dispatchEvent(new Event("canplay"));
    });
  }
  get readyState() { return this.buffer ? 4 : 0; }
  get duration() { return this.loopEnd; }
  get currentTime() {
    if (this.paused) return this.offset;
    const t = this.offset + this.ctx.currentTime - this.t0, span = this.loopEnd - this.loopStart;
    if (!this.loop) return Math.min(t, this.loopEnd);
    return t < this.loopEnd || span <= 0 ? t : this.loopStart + ((t - this.loopStart) % span);
  }
  set currentTime(t) {
    const playing = !this.paused;
    if (playing) this.halt();
    this.offset = Math.max(0, Math.min(t, this.loopEnd - 0.001));
    if (playing) this.start();
    this.dispatchEvent(new Event("seeked"));
  }
  // Flip looping in place: restart the source at the exact current offset with the new flag.
  setLoop(on) {
    if (on === this.loop) return;
    if (this.paused) { this.loop = on; return; }
    this.halt(); this.loop = on; this.start();
  }
  start() {
    const n = this.ctx.createBufferSource();
    n.buffer = this.buffer; n.loop = this.loop; n.loopStart = this.loopStart; n.loopEnd = this.loopEnd;
    n.connect(this.ctx.destination);
    n.onended = () => {
      if (this.node !== n) return; // stopped by halt(), not by reaching the end
      this.node = null; this.paused = true; this.offset = 0;
      this.dispatchEvent(new Event("ended"));
    };
    n.start(0, this.offset, this.loop ? undefined : Math.max(0, this.loopEnd - this.offset));
    this.node = n; this.t0 = this.ctx.currentTime; this.paused = false;
  }
  halt() { const n = this.node; this.offset = this.currentTime; this.node = null; this.paused = true; n?.stop(); n?.disconnect(); }
  async play() {
    await this.ready; await this.ctx.resume();
    if (!this.paused) return;
    this.start(); this.dispatchEvent(new Event("play"));
  }
  pause() { if (this.paused) return; this.halt(); this.dispatchEvent(new Event("pause")); }
  close() { this.halt(); this.ctx.close(); }
}

export class Player {
  // `audio`: the element the caller already pointed at run.media.audio, so the MP3 downloads while the
  // module is still loading.
  constructor(data, run, song, audio) {
    this.data = data;
    this.run = run;
    this.song = song;
    this.trace = run.trace ?? [];
    this.listeners = new Set();
    this.raf = 0;
    this.looping = false;
    this.attach(audio);
    this.chanState = song ? this.buildChannelState() : [];
  }
  attach(audio) {
    this.audio = audio;
    audio.addEventListener("play", () => this.loop());
    for (const ev of ["pause", "ended", "seeked", "loadedmetadata"]) audio.addEventListener(ev, () => this.emit());
  }
  // Loop region: from the first time playback reaches the restart position to the end of the first pass.
  loopPoints() {
    const end = this.run.audio.duration;
    const restart = this.song?.restart ?? 0;
    const tr = this.trace;
    const i = tr.findIndex((t, k) => k < tr.length - 1 && t[1] === restart && t[2] === 0);
    return end && i >= 0 && tr[i][0] / RATE < end ? { start: tr[i][0] / RATE, end } : null;
  }
  get canLoop() { return !!(this.run.media.wav && this.loopPoints()); }
  // Loop on: the first time, decode the WAV while the MP3 keeps playing, then hand over at the same
  // position. After that the WAV engine stays and the toggle only flips its loop flag, so on/off is instant.
  async setLoop(on) {
    if (on && !this.canLoop) return;
    this.looping = on;
    if (this.audio instanceof LoopAudio) { this.audio.setLoop(on); this.emit(); return; }
    if (!on || this.pending) return;
    const p = this.loopPoints();
    const next = this.pending = new LoopAudio(mediaUrl(this.data, this.run.media.wav), p.start, p.end);
    await next.ready.catch(() => {});
    this.pending = null;
    if (!next.buffer || this.destroyed) { next.close(); this.looping = false; this.emit(); return; }
    const old = this.audio, wasPlaying = !old.paused;
    next.loop = this.looping;
    next.offset = Math.min(old.currentTime || 0, next.duration - 0.001);
    this.attach(next);
    old.pause(); old.src = "";
    if (wasPlaying) await next.play().catch(() => {});
    this.emit();
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { const s = this.state(); for (const fn of this.listeners) fn(s); }
  loop() {
    cancelAnimationFrame(this.raf);
    const tick = () => { this.emit(); if (!this.audio.paused) this.raf = requestAnimationFrame(tick); };
    tick();
  }
  get playing() { return !this.audio.paused; }
  toggle() { this.audio.paused ? this.audio.play() : this.audio.pause(); }
  play() { return this.audio.play(); }
  stop() { this.audio.pause(); this.audio.currentTime = 0; this.emit(); }
  seekOrder(order) {
    const i = this.trace.findIndex((t) => t[1] === order);
    if (i >= 0) { this.audio.currentTime = this.trace[i][0] / RATE; this.emit(); }
  }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.raf); this.audio.pause(); if (this.audio instanceof LoopAudio) this.audio.close(); else this.audio.src = ""; this.listeners.clear(); }

  traceIndex(t) {
    // Media clocks round seek times; map them back to the nearest captured sample.
    const f = Math.round(t * RATE), tr = this.trace;
    let lo = 0, hi = tr.length - 1;
    if (hi < 0) return -1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (tr[mid][0] <= f) lo = mid; else hi = mid - 1; }
    return lo;
  }
  state() {
    const t = this.audio.currentTime || 0;
    const i = this.traceIndex(t);
    const row = i >= 0 ? this.trace[i] : [0, 0, 0, this.song?.orders[0] ?? 0];
    const next = this.trace[i + 1];
    const rowFrac = next ? Math.max(0, Math.min(1, (t * RATE - row[0]) / (next[0] - row[0]))) : 0;
    return {
      time: t, duration: this.audio.duration || this.run.audio.duration || 0, playing: this.playing,
      traceIndex: i, order: row[1], row: row[2], pattern: row[3], rowFrac,
      bpm: this.song?.bpm, speed: this.song?.speed,
    };
  }

  // Per trace row, per channel: the note currently sounding [instrument, note, startFrame, volume 0..64].
  buildChannelState() {
    const song = this.song, n = song.channels;
    const cur = Array.from({ length: n }, () => null);
    const out = [];
    for (const [frame, , row, pattern] of this.trace) {
      for (let c = 0; c < n; c++) {
        const cell = cellAt(song, pattern, row, c);
        if (!cell) continue;
        const [note, ins, vol, eff, param] = cell;
        const delayed = eff === 14 && param >> 4 === 13; // EDx note delay: still triggers this row
        if (note === 97) cur[c] = null;
        else if (note > 0 && note < 97) {
          const insNo = ins || cur[c]?.ins || 0;
          const inst = song.instruments[insNo - 1];
          const smpNo = inst ? inst.keymap[note - 1] ?? 0 : 0;
          const smp = inst?.samples[smpNo];
          cur[c] = smp && smp.data.length ? { ins: insNo, note, smp, start: frame, vol: smp.volume, delayed } : null;
        }
        if (cur[c]) {
          if (vol >= 0x10 && vol <= 0x50) cur[c].vol = vol - 0x10;
          if (eff === 12) cur[c].vol = Math.min(64, param);
        }
      }
      out.push(cur.map((s) => (s ? { ...s } : null)));
    }
    return out;
  }

  // Waveform window for channel c at the current time: returns Float32 samples (len) or null if silent.
  scope(c, len, st) {
    const snap = this.chanState[st.traceIndex]?.[c];
    if (!snap || !st.playing) return null;
    const { smp, note, start } = snap;
    const period = 2 ** ((note - 1 + smp.relNote - 48 + smp.finetune / 128) / 12); // step relative to C-4 @ 8363 Hz
    const step = (period * 8363) / RATE;
    let pos = (st.time * RATE - start) * step;
    const L = smp.data.length, ls = smp.loopStart, ll = smp.loopLength;
    const out = new Float32Array(len);
    const gain = Math.min(1, Math.sqrt(snap.vol / 64) * 1.2); // FT2 scopes read near full height
    const zoom = 1; // one output sample per scope pixel: ~1.5 ms across a 69 px scope, like FT2
    for (let k = 0; k < len; k++) {
      let p = pos + k * step * zoom;
      if (p >= L) {
        if (!smp.loop || ll <= 0) { out[k] = 0; continue; }
        p = ls + ((p - ls) % ll);
      }
      out[k] = smp.data[p | 0] * gain;
    }
    return out;
  }
}
