// 1-bit glyph atlases + a tiny software framebuffer that draws FT2 primitives with crisp pixels.
// Geometry and palette follow ft2-clone (drawFramework, drawPushButton, palTable[10] "Why colors", the classic FT2 preset).

export const PAL = {
  bckgrnd: "#000000", pattext: "#92BEFF", blckmrk: "#242441", blcktxt: "#FFFFFF",
  desktop: "#4D619A", forgrnd: "#FFFFFF", buttons: "#9E9E9E", btntext: "#000000",
  dsktop2: "#20283D", dsktop1: "#82A6FF", button2: "#3D3D3D", button1: "#FFFFFF", looppin: "#325E9F",
};

const rgbCache = new Map();
function rgb(hex) {
  let v = rgbCache.get(hex);
  if (v === undefined) {
    const n = parseInt(hex.slice(1), 16);
    v = (0xff << 24) | ((n & 0xff) << 16) | (n & 0xff00) | (n >> 16);
    rgbCache.set(hex, v >>> 0);
    v >>>= 0;
  }
  return v;
}

// ---- Original FastTracker II bitmap fonts (ft2-clone src/gfxdata/bmp, Vogue/8bitbubsy, CC BY-NC-SA 4.0) ----
class BitFont {
  constructor(h, glyphs, advance) { this.h = h; this.glyphs = glyphs; this.advance = advance; this.fixed = advance > 0; this.capH = h; }
  width(s) {
    if (this.fixed) return s.length * this.advance;
    let w = 0;
    for (const ch of s) w += (this.glyphs.get(ch) ?? this.glyphs.get(ch.toUpperCase()) ?? this.glyphs.get(" ")).adv;
    return Math.max(0, w - 1); // FT2 textWidth drops the trailing spacer pixel
  }
}

async function atlas(name) {
  const img = new Image();
  img.src = new URL(`./ft2gfx/${name}.png`, import.meta.url).href;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data;
  return { w: img.width, h: img.height, on: (x, y) => d[(y * img.width + x) * 4 + 3] > 127 };
}
// Collect set pixels of a cell as a flat [x,y,...] list.
function cell(a, x0, y0, w, h) {
  const px = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a.on(x0 + x, y0 + y)) px.push(x, y);
  return px;
}

export const fonts = {};
export const ft2 = {}; // raw glyph access for pattern drawing: ft2.font4[variant][index], ft2.font5[variant][index]
export async function loadFonts() {
  if (fonts.f1) return fonts;
  const [a1, a2, a3, a4, a6, a7, tables] = await Promise.all([
    atlas("font1"), atlas("font2"), atlas("font3"), atlas("font4"), atlas("font6"), atlas("font7"),
    fetch(new URL("./ft2gfx/tables.json", import.meta.url)).then((r) => r.json()),
  ]);
  // font1: 8x10 cells indexed by ASCII (chr & 0x7F), proportional widths from font1Widths.
  const g1 = new Map(), g2 = new Map();
  for (let c = 32; c < 128; c++) {
    const ch = String.fromCharCode(c);
    g1.set(ch, { px: cell(a1, c * 8, 0, 8, 10), adv: tables.font1[c] });
    g2.set(ch, { px: cell(a2, c * 16, 0, 16, 20), adv: tables.font2[c] });
  }
  fonts.f1 = new BitFont(10, g1, 0); fonts.f1.capH = 8;
  fonts.f2 = new BitFont(20, g2, 0); fonts.f2.capH = 16;
  // font3: 4x7, glyphs 0-9 A-Z (then symbols). FT2's textOutTiny maps letters case-insensitively.
  const g3 = new Map();
  const tiny = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < tiny.length; i++) g3.set(tiny[i], { px: cell(a3, i * 4, 0, 4, 7), adv: 4 });
  g3.set(" ", { px: [], adv: 4 });
  g3.set("-", { px: cell(a3, 36 * 4, 0, 4, 7), adv: 4 });
  for (const [ch, i] of [["#", 37], [".", 42]]) g3.set(ch, { px: cell(a3, i * 4, 0, 4, 7), adv: 4 });
  fonts.micro = new BitFont(7, g3, 4); fonts.micro.capH = 7; // font3: tiny tags only (no $ . / etc.)
  // font6: 7x8 hex digits used by hexOut.
  const g6 = new Map();
  for (let i = 0; i < 16; i++) g6.set("0123456789ABCDEF"[i], { px: cell(a6, i * 7, 0, 7, 8), adv: 7 });
  g6.set(" ", { px: [], adv: 7 });
  fonts.f6 = new BitFont(8, g6, 7);
  // font4 (8x8, 4 variants stacked, 78 glyphs) and font5 (16x8, double-wide, variants 4..7), raw by index.
  ft2.font4 = [0, 1, 2, 3].map((v) => Array.from({ length: 78 }, (_, i) => cell(a4, i * 8, v * 8, 8, 8)));
  ft2.font5 = [0, 1, 2, 3].map((v) => Array.from({ length: 39 }, (_, i) => cell(a4, i * 16, (4 + v) * 8, 16, 8)));
  ft2.font3 = Array.from({ length: 43 }, (_, i) => cell(a3, i * 4, 0, 4, 7));
  ft2.font7 = Array.from({ length: 23 }, (_, i) => cell(a7, i * 6, 0, 6, 7));
  ft2.noteTab1 = tables.noteTab1; ft2.noteTab2 = tables.noteTab2;
  // Pattern text font: font4 variant 0 as a fixed 8px BitFont for hex and letters (index 0-35 = 0-9A-Z).
  const gp = new Map();
  for (let i = 0; i < 36; i++) gp.set(tiny[i], { px: ft2.font4[0][i], adv: 8 });
  gp.set(" ", { px: [], adv: 8 });
  fonts.pat = new BitFont(8, gp, 8);
  fonts.small = fonts.f1; // FT2 UI text is font1 throughout
  return fonts;
}

export class FB {
  constructor(canvas, w, h) {
    this.canvas = canvas;
    canvas.width = w; canvas.height = h;
    this.w = w; this.h = h;
    this.ctx = canvas.getContext("2d");
    this.img = this.ctx.createImageData(w, h);
    this.px = new Uint32Array(this.img.data.buffer);
  }
  flush() { this.ctx.putImageData(this.img, 0, 0); }
  fill(x, y, w, h, c) {
    const v = rgb(c);
    const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(this.w, x + w), y1 = Math.min(this.h, y + h);
    for (let yy = y0; yy < y1; yy++) this.px.fill(v, yy * this.w + x0, yy * this.w + x1);
  }
  hline(x, y, w, c) { this.fill(x, y, w, 1, c); }
  vline(x, y, h, c) { this.fill(x, y, 1, h, c); }
  dot(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = rgb(c); }
  // drawFramework: covers (w+1)x(h+1) like FT2. type 1 raised, 2 sunken.
  frame(x, y, w, h, type = 1) {
    if (type === 1) {
      this.fill(x + 1, y + 1, w - 1, h - 1, PAL.desktop);
      this.hline(x, y, w, PAL.dsktop1); this.vline(x, y + 1, h - 1, PAL.dsktop1);
      this.hline(x, y + h, w, PAL.dsktop2); this.vline(x + w, y, h + 1, PAL.dsktop2);
    } else {
      this.fill(x + 1, y + 1, w - 1, h - 1, PAL.bckgrnd);
      this.hline(x, y, w + 1, PAL.dsktop2); this.vline(x, y + 1, h, PAL.dsktop2);
      this.hline(x + 1, y + h, w, PAL.dsktop1); this.vline(x + w, y + 1, h - 1, PAL.dsktop1);
    }
  }
  button(x, y, w, h, caption, pressed = false, font = fonts.f1) {
    this.fill(x, y, w, h, "#000000");
    this.fill(x + 1, y + 1, w - 2, h - 2, PAL.buttons);
    if (pressed) {
      this.hline(x + 1, y + 1, w - 2, PAL.button2); this.vline(x + 1, y + 2, h - 3, PAL.button2);
    } else {
      this.hline(x + 1, y + 1, w - 3, PAL.button1); this.vline(x + 1, y + 2, h - 4, PAL.button1);
      this.hline(x + 1, y + h - 2, w - 2, PAL.button2); this.vline(x + w - 2, y + 1, h - 3, PAL.button2);
    }
    const o = pressed ? 1 : 0;
    this.text(x + ((w - font.width(caption)) >> 1) + o, y + ((h - font.capH) >> 1) + o, caption, PAL.btntext, font);
  }
  // Draw a raw FT2 glyph (flat [x,y,...] list) at x,y.
  glyph(x, y, px, c) {
    const v = rgb(c);
    for (let i = 0; i < px.length; i += 2) {
      const xx = x + px[i], yy = y + px[i + 1];
      if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h) this.px[yy * this.w + xx] = v;
    }
  }
  text(x, y, s, c, font = fonts.f1, shadow = null) {
    if (shadow) this.text(x + 1, y + 1, s, shadow, font);
    const v = rgb(c);
    let cx = x;
    for (const ch of String(s)) {
      const g = font.glyphs.get(ch) ?? font.glyphs.get(ch.toUpperCase()) ?? font.glyphs.get(" ");
      if (g) {
        const p = g.px;
        for (let i = 0; i < p.length; i += 2) {
          const xx = cx + p[i], yy = y + p[i + 1];
          if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h) this.px[yy * this.w + xx] = v;
        }
      }
      cx += font.fixed ? font.advance : (g ? g.adv : 4);
    }
    return cx;
  }
  // FT2 shadow text: FORGRND with DSKTOP2 shadow at +1,+1.
  label(x, y, s, font = fonts.f1) { return this.text(x, y, s, PAL.forgrnd, font, PAL.dsktop2); }
  // Integer-scaled text (logos, big numbers).
  big(x, y, s, c, scale = 2, font = fonts.f1, shadow = null) {
    if (shadow) this.big(x + scale, y + scale, s, shadow, scale, font);
    let cx = x;
    for (const ch of String(s)) {
      const g = font.glyphs.get(ch) ?? font.glyphs.get("?");
      const p = g.px;
      for (let i = 0; i < p.length; i += 2) this.fill(cx + p[i] * scale, y + p[i + 1] * scale, scale, scale, c);
      cx += (font.fixed ? font.advance : g.adv) * scale;
    }
    return cx;
  }
  // Filled triangle arrow, 7 wide x 4 tall (up/down) or 4x7 (left/right), centred on cx,cy.
  arrow(cx, cy, dir, c = PAL.btntext) {
    for (let i = 0; i < 4; i++) {
      const len = 7 - i * 2;
      if (dir === "up") this.hline(cx - (len >> 1), cy - 2 + (3 - i) + 0, len, c);
      if (dir === "down") this.hline(cx - (len >> 1), cy - 2 + i, len, c);
      if (dir === "left") this.vline(cx - 2 + (3 - i), cy - (len >> 1), len, c);
      if (dir === "right") this.vline(cx - 2 + i, cy - (len >> 1), len, c);
    }
  }
  arrowButton(x, y, w, h, dir, pressed = false) {
    this.button(x, y, w, h, "", pressed);
    const o = pressed ? 1 : 0;
    this.arrow(x + (w >> 1) + o, y + (h >> 1) + o, dir);
  }
}

