// Minimal FastTracker II .xm reader (patterns, instruments, samples, envelopes).
// Layout per the XM 1.04 spec as loaded by FT2; enough for display and scope emulation, not playback.

export function parseXM(buf) {
  const v = new DataView(buf);
  const u8 = new Uint8Array(buf);
  const str = (o, n) => String.fromCharCode(...u8.subarray(o, o + n)).replace(/\0.*$/s, "").trimEnd();
  if (String.fromCharCode(...u8.subarray(0, 17)) !== "Extended Module: ") throw new Error("Not an XM file");
  const hdrSize = v.getUint32(60, true);
  const song = {
    name: str(17, 20),
    tracker: str(38, 20),
    songLength: v.getUint16(64, true),
    restart: v.getUint16(66, true),
    channels: v.getUint16(68, true),
    numPatterns: v.getUint16(70, true),
    numInstruments: v.getUint16(72, true),
    linear: (v.getUint16(74, true) & 1) === 1,
    speed: v.getUint16(76, true),
    bpm: v.getUint16(78, true),
    orders: Array.from(u8.subarray(80, 80 + 256)),
    patterns: [],
    instruments: [],
  };
  let o = 60 + hdrSize;
  for (let p = 0; p < song.numPatterns; p++) {
    const len = v.getUint32(o, true);
    const rows = v.getUint16(o + 5, true) || 64;
    const packed = v.getUint16(o + 7, true);
    o += len;
    // cell: [note, instr, vol, eff, param]; note 0 = empty, 97 = key-off
    const cells = new Uint8Array(rows * song.channels * 5);
    if (packed) {
      let i = o, c = 0;
      const end = o + packed;
      while (i < end && c < rows * song.channels) {
        const b = u8[i++];
        const at = c * 5;
        if (b & 0x80) {
          if (b & 1) cells[at] = u8[i++];
          if (b & 2) cells[at + 1] = u8[i++];
          if (b & 4) cells[at + 2] = u8[i++];
          if (b & 8) cells[at + 3] = u8[i++];
          if (b & 16) cells[at + 4] = u8[i++];
        } else {
          cells[at] = b;
          cells[at + 1] = u8[i++]; cells[at + 2] = u8[i++]; cells[at + 3] = u8[i++]; cells[at + 4] = u8[i++];
        }
        c++;
      }
    }
    o += packed;
    song.patterns.push({ rows, cells });
  }
  // FT2 shows an empty 64-row pattern for order entries past the stored ones.
  for (let i = 0; i < song.songLength; i++) {
    const n = song.orders[i];
    while (song.patterns.length <= n) song.patterns.push({ rows: 64, cells: new Uint8Array(64 * song.channels * 5) });
  }
  for (let n = 0; n < song.numInstruments; n++) {
    const start = o;
    const size = v.getUint32(o, true);
    const ins = { name: str(o + 4, 22), samples: [], keymap: new Uint8Array(96), volEnv: null, fadeout: 0 };
    const numSamples = v.getUint16(o + 27, true);
    let sampleHdrSize = 40;
    if (numSamples > 0) {
      sampleHdrSize = v.getUint32(o + 29, true) || 40;
      ins.keymap.set(u8.subarray(o + 33, o + 33 + 96));
      const pts = [];
      for (let k = 0; k < 12; k++) pts.push([v.getUint16(o + 129 + k * 4, true), v.getUint16(o + 131 + k * 4, true)]);
      const nVol = u8[o + 225];
      const type = u8[o + 233];
      if (type & 1 && nVol > 0) {
        ins.volEnv = { points: pts.slice(0, Math.min(12, nVol)), sustain: type & 2 ? u8[o + 227] : -1,
          loopStart: type & 4 ? u8[o + 228] : -1, loopEnd: type & 4 ? u8[o + 229] : -1 };
      }
      ins.fadeout = v.getUint16(o + 239, true);
    }
    o = start + size;
    const headers = [];
    for (let s = 0; s < numSamples; s++) {
      const h = o + s * sampleHdrSize;
      const type = u8[h + 14];
      headers.push({
        length: v.getUint32(h, true), loopStart: v.getUint32(h + 4, true), loopLength: v.getUint32(h + 8, true),
        volume: u8[h + 12], finetune: v.getInt8(h + 13), loop: type & 3, is16: (type & 16) !== 0,
        pan: u8[h + 15], relNote: v.getInt8(h + 16), name: str(h + 18, 22),
      });
    }
    o += numSamples * sampleHdrSize;
    for (const h of headers) {
      const bytes = Math.min(h.length, buf.byteLength - o);
      const count = h.is16 ? bytes >> 1 : bytes;
      const data = new Float32Array(count);
      let acc = 0;
      if (h.is16) {
        for (let k = 0; k < count; k++) { acc = (acc + v.getInt16(o + k * 2, true)) << 16 >> 16; data[k] = acc / 32768; }
      } else {
        for (let k = 0; k < count; k++) { acc = (acc + v.getInt8(o + k)) << 24 >> 24; data[k] = acc / 128; }
      }
      o += h.length;
      const div = h.is16 ? 2 : 1;
      ins.samples.push({ ...h, data, loopStart: h.loopStart / div, loopLength: h.loopLength / div });
    }
    song.instruments.push(ins);
  }
  return song;
}

export function cellAt(song, pattern, row, ch) {
  const p = song.patterns[pattern];
  if (!p || row >= p.rows) return null;
  const at = (row * song.channels + ch) * 5;
  return p.cells.subarray(at, at + 5);
}

const NOTE_NAMES_SHARP = ["C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-"];
const HEX = "0123456789ABCDEF";
const EFF = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const VOLFX = "0123456789-+DUSVPLRM"; // index: vol>>4 (6..F map to -,+,D,U,S,V,P,L,R,M)

export const fmt = {
  note(n) {
    if (n === 0) return "---";
    if (n === 97) return "==="; // key-off
    const k = n - 1;
    return NOTE_NAMES_SHARP[k % 12] + Math.floor(k / 12);
  },
  instr(i) { return i === 0 ? "  " : (i >> 4 ? HEX[i >> 4] : " ") + HEX[i & 15]; },
  vol(v) {
    if (v < 0x10) return "--";
    if (v <= 0x50) { const x = v - 0x10; return HEX[x >> 4] + HEX[x & 15]; }
    return VOLFX[(v >> 4) + 4] + HEX[v & 15];
  },
  eff(e, p) { return EFF[e] + HEX[p >> 4] + HEX[p & 15]; },
  hex2(n) { return HEX[(n >> 4) & 15] + HEX[n & 15]; },
  hex3(n) { return HEX[(n >> 8) & 15] + HEX[(n >> 4) & 15] + HEX[n & 15]; },
};
