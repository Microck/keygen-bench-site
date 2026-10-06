// Port of ft2-clone's pattern editor drawing (ft2_pattern_draw.c) with the original
// font3/font4/font5/font7 glyphs, chanWidths, column offsets and colours, plus FT2-style scopes.
import { PAL, fonts, ft2 } from "./fb.js";
import { cellAt } from "./xm.js";

const CHAN_WIDTHS = [141, 141, 93, 69, 45, 45];
const VOL1 = [39, 0, 1, 2, 3, 4, 36, 52, 53, 54, 28, 31, 25, 58, 59, 22];
const VOL2 = [42, 0, 1, 2, 3, 4, 36, 37, 38, 39, 28, 31, 25, 40, 41, 22];
const SHARP1_MED = [12, 12, 13, 13, 14, 15, 15, 16, 16, 10, 10, 11];
const SHARP2_MED = [36, 37, 36, 37, 36, 36, 37, 36, 37, 36, 37, 36];
const SHARP1_SMALL = [8, 8, 9, 9, 10, 11, 11, 12, 12, 13, 13, 14];
const SHARP2_SMALL = [16, 15, 16, 15, 16, 16, 15, 16, 15, 16, 15, 16];

const font4 = (i) => ft2.font4[0][i];
const font5 = (i) => ft2.font5[0][i];


function note(fb, x, y, n, chans, color) {
  x += 3;
  if (chans <= 4) {
    if (n <= 0 || n > 97) { for (let k = 0; k < 6; k++) fb.glyph(x + k * 8, y, font4(67 + k), color); return; }
    if (n === 97) { for (let k = 0; k < 6; k++) fb.glyph(x + k * 8, y, font4(61 + k), color); return; }
    const k = n - 1, nt = ft2.noteTab1[k], oct = ft2.noteTab2[k];
    fb.glyph(x, y, font5(SHARP1_MED[nt]), color);
    fb.glyph(x + 16, y, font5(SHARP2_MED[nt]), color);
    fb.glyph(x + 32, y, font5(oct), color);
    return;
  }
  if (n <= 0 || n > 97) { for (let k = 0; k < 3; k++) fb.glyph(x + k * 8, y, font4(43 + k), color); return; }
  if (n === 97) { for (let k = 0; k < 3; k++) fb.glyph(x + k * 8, y, font4(40 + k), color); return; }
  const k = n - 1, nt = ft2.noteTab1[k], oct = ft2.noteTab2[k];
  fb.glyph(x, y, font4(SHARP1_MED[nt]), color);
  fb.glyph(x + 8, y, font4(SHARP2_MED[nt]), color);
  fb.glyph(x + 16, y, font4(oct), color);
}

function cellData(fb, x, y, c, chans, color) {
  const [n, ins, vol, eff, par] = c;
  if (chans > 8) { // showNoteNumNoVolColumn & co: font7 small note, font3 instrument/effect, no volume column
    const xx = x + 3;
    if (n <= 0 || n > 97) for (let k = 0; k < 3; k++) fb.glyph(xx + k * 6, y, ft2.font7[18 + k], color);
    else if (n === 97) for (let k = 0; k < 2; k++) fb.glyph(xx + 2 + k * 6, y, ft2.font7[21 + k], color);
    else { const k = n - 1, nt = ft2.noteTab1[k]; fb.glyph(xx, y, ft2.font7[SHARP1_SMALL[nt]], color); fb.glyph(xx + 6, y, ft2.font7[SHARP2_SMALL[nt]], color); fb.glyph(xx + 10, y, ft2.font7[ft2.noteTab2[k]], color); }
    const i1 = ins >> 4, i2 = ins & 15;
    if (i1 > 0) fb.glyph(x + 23, y, ft2.font3[i1], color);
    if (i1 > 0 || i2 > 0) fb.glyph(x + 27, y, ft2.font3[i2], color);
    fb.glyph(x + 31, y, ft2.font3[eff], color); fb.glyph(x + 35, y, ft2.font3[par >> 4], color); fb.glyph(x + 39, y, ft2.font3[par & 15], color);
    return;
  }
  note(fb, x, y, n, chans, color);
  const small = chans > 6;
  const g = small ? (i) => ft2.font3[i] : font4;
  const cw = small ? 4 : 8;
  const insX = x + (chans <= 4 ? 67 : chans <= 6 ? 27 : 31);
  const volX = x + (chans <= 4 ? 91 : chans <= 6 ? 51 : 43);
  const effX = x + (chans <= 4 ? 115 : chans <= 6 ? 67 : 55);
  // instrument: hide leading zero nibble; blank when 0
  const i1 = ins >> 4, i2 = ins & 15;
  if (i1 > 0) fb.glyph(insX, y, g(i1), color);
  if (i1 > 0 || i2 > 0) fb.glyph(insX + cw, y, g(i2), color);
  // volume column
  const tab = small ? VOL2 : VOL1;
  const v1 = tab[vol >> 4], v2 = vol < 0x10 ? (small ? 42 : 39) : vol & 15;
  fb.glyph(volX, y, g(v1), color);
  fb.glyph(volX + cw, y, g(v2), color);
  // effect
  fb.glyph(effX, y, g(eff), color);
  fb.glyph(effX + cw, y, g(par >> 4), color);
  fb.glyph(effX + cw * 2, y, g(par & 15), color);
}

// FT2 pattern-editor drawing rules (ft2_pattern_draw.c), sized to fill an arbitrary w x h canvas: more rows when taller, and every
// channel the width allows, at the widest FT2 cell layout (big/medium/small) that fits all of them.
// Row geometry mirrors pattCoordTable: 8px rows, a 9px DESKTOP current-row bar, wells above/below it.
export function drawPatternFit(fb, song, pattern, curRow, w, h, opts = {}) {
  const rowNumW = 25; // left well; right well is 26
  const inner = w - 2 - rowNumW - 1 - 26 - 2 - 1;
  // FT2 chanWidths by numChannelsShown: <=4 big (141), <=6 medium (93), <=8 small (69), 10-12 no vol column (45)
  const layouts = [{ max: 4, cw: 141, lc: 4 }, { max: 6, cw: 93, lc: 6 }, { max: 8, cw: 69, lc: 8 }, { max: 99, cw: 45, lc: 12 }];
  const need = song.channels + (song.channels & 1);
  let L = null, chans = need;
  for (const l of layouts) if (need <= l.max && need * (l.cw + 3) <= inner) { L = l; break; }
  if (!L) { // does not all fit: widest layout that shows the most channels, scrolled
    L = layouts.reduce((best, l) => { const n = Math.min(need, Math.floor(inner / (l.cw + 3))); return n > best.n || (n === best.n && l.cw > best.l.cw) ? { l, n } : best; }, { l: layouts[3], n: 0 }).l;
    chans = Math.max(1, Math.min(need, Math.floor(inner / (L.cw + 3))));
  }
  const layoutChans = L.lc; // selects font/offsets like numChannelsShown
  // FT2's fixed chanWidths leave dead space on wide canvases: spread the leftover over the channel wells
  // (content keeps FT2's offsets inside each cell; only the well gets wider). Right well hugs the edge.
  const rightX = w - 28;
  const avail = rightX - 1 - 28;
  const chanWidth = Math.max(L.cw, Math.floor(avail / chans) - 3), step = chanWidth + 3;
  const pad = Math.floor((chanWidth - L.cw) / 2); // centre FT2's cell layout in the wider well
  const first = Math.max(0, Math.min(opts.firstChannel ?? 0, song.channels - chans));
  // vertical: top frame 1px, wells start at y=2, current bar in the middle
  const wellTop = 2, wellBot = h - 3;
  const nUpper = Math.max(1, Math.floor((wellBot - wellTop - 9) / 2 / 8) - 0);
  const barY = wellTop + 1 + nUpper * 8 + 1;          // upper well: rows start at wellTop+2
  const lowerY = barY + 9;                              // lower well top
  const nLower = Math.max(1, Math.floor((wellBot - lowerY - 1) / 8));
  fb.fill(0, 0, w, h, PAL.desktop);
  fb.hline(0, 0, w - 1, PAL.dsktop1); fb.vline(0, 1, h - 2, PAL.dsktop1);
  fb.vline(w - 1, 0, h, PAL.dsktop2); fb.hline(0, h - 1, w, PAL.dsktop2);
  const uH = barY - wellTop - 1, lH = wellBot - lowerY;
  fb.frame(2, wellTop, rowNumW, uH, 2); fb.frame(rightX, wellTop, 26, uH, 2);
  fb.frame(2, lowerY, rowNumW, lH, 2); fb.frame(rightX, lowerY, 26, lH, 2);
  let xo = 28;
  for (let i = 0; i < chans; i++) { fb.frame(xo, wellTop, chanWidth + 2, uH, 2); fb.frame(xo, lowerY, chanWidth + 2, lH, 2); xo += step; }
  const p = song.patterns[pattern] ?? { rows: 64 };
  const drawRow = (row, y, sel) => {
    const color = sel ? PAL.forgrnd : !(row & 3) ? PAL.blcktxt : PAL.pattext;
    for (const x of [8, rightX + 6]) { fb.glyph(x, y, font4(row >> 4), color); fb.glyph(x + 8, y, font4(row & 15), color); }
    const cc = sel ? PAL.forgrnd : PAL.pattext;
    let x = 29 + pad;
    for (let j = 0; j < chans; j++, x += step) { const c = cellAt(song, pattern, row, first + j); if (c) cellData(fb, x, y, c, layoutChans, cc); }
  };
  for (let k = 0; k < nUpper; k++) { const r = curRow - nUpper + k; if (r >= 0) drawRow(r, wellTop + 2 + k * 8, false); }
  drawRow(curRow, barY, true);
  for (let k = 0; k < nLower; k++) { const r = curRow + 1 + k; if (r < p.rows) drawRow(r, lowerY + 2 + k * 8, false); }
  let cx = 30;
  for (let j = 0; j < chans; j++, cx += step) {
    const s = String(first + j + 1);
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) fb.text(cx + ox, wellTop + 2 + oy, s, "#000000", fonts.f1);
    fb.text(cx, wellTop + 2, s, PAL.forgrnd, fonts.f1);
  }
  return { chans, first, total: song.channels };
}

export function drawScopes(fb, player, st, x, y, w, h) {
  // FT2: panel 0,92,291,81; scopes are sunken frames, 2 rows, waveform PATTEXT on black.
  fb.frame(x, y, w - 1, h - 1, 1);
  const n = player.song?.channels ?? 0;
  if (!n) return;
  const perRow = Math.ceil(n / 2);
  const len = Math.floor((w - 3 - perRow * 3) / perRow);
  const sh = Math.floor((h - 8) / 2) - 2;
  for (let c = 0; c < n; c++) {
    const r = c < perRow ? 0 : 1, col = c % perRow;
    const sx = x + 3 + col * (len + 3), sy = y + 3 + r * (sh + 3);
    fb.frame(sx, sy, len + 1, sh + 1, 2);
    const mid = sy + 1 + (sh >> 1);
    const wave = player.scope(c, len, st);
    if (!wave) { fb.hline(sx + 1, mid, len, PAL.pattext); continue; }
    const amp = (sh >> 1) - 1;
    let prev = mid;
    for (let k = 0; k < len; k++) {
      const yy = Math.round(mid - wave[k] * amp);
      const a = Math.min(prev, yy), b = Math.max(prev, yy);
      fb.vline(sx + 1 + k, a, Math.max(1, b - a), PAL.pattext);
      prev = yy;
    }
  }
}
