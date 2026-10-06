// Preloader: a keygen-style cracktro (starfield, chrome keygen logo) on one
// low-resolution canvas. It covers the page while app.js loads results and fonts and mounts the site,
// shows that progress as a serial number decoding, then reveals the page with an ordered-dither raster
// sweep. A classic script, so it paints before the module graph arrives; its own 5x7 font avoids
// waiting for the FT2 fonts it is covering for.
// app.js drives it through globalThis.bootIntro:
//   track(promise, label)  returns the same promise; the label shows while it is pending
//   done()                 the site is mounted: finish decoding and reveal it
//   fail()                 loading failed: reveal the error message
(() => {
  const C = { dark: "#20283D", pin: "#325E9F", desk: "#4D619A", light: "#82A6FF", text: "#92BEFF", white: "#FFFFFF" };
  // A character, then its seven rows of five pixels as base-32 digits (bit 4 is the leftmost pixel).
  const GLYPHS = " 0000000AehhvhhhBuhhuhhuCehgggheDuhhhhhuEvgguggvFvggugggGehgnhhfHhhhvhhhIe44444eJ7222iicKhikokihLggggggvMhrllhhhNhhpljhhOehhhhhePuhhugggQehhhlidRuhhukihSehge1heTv444444UhhhhhheVhhhhha4WhhhlllaXhha4ahhYhha4444Zv1248gv0ehjlphe14c4444e2eh1248v3v2421he426aiv225vgu11he668guhhe7v1248888ehhehhe9ehhf12c-000e000.0000004,0000048!4444404:0040040*0level0";
  const FONT = new Map();
  for (let i = 0; i < GLYPHS.length; i += 8) FONT.set(GLYPHS[i], [...GLYPHS.slice(i + 1, i + 8)].map((d) => parseInt(d, 32)));
  const glyph = (ch) => FONT.get(ch) ?? FONT.get(" ");

  const SERIAL = "KGB0-FT2X-M0D5-1337";
  const SLOTS = [...SERIAL].flatMap((ch, i) => (ch === "-" ? [] : [i]));
  // Angular italic logo letters in units of a 30x30 cell, as polygons; buildLogo rasterises them without
  // antialiasing and paints a keygen-style chrome ramp with a white top/left edge.
  const STROKES = {
    K: [[0, 0, 6, 0, 6, 30, 0, 30], [5, 13, 22, 0, 30, 0, 13, 15, 30, 30, 21, 30, 5, 17]],
    E: [[0, 0, 30, 0, 30, 6, 6, 6, 6, 12, 25, 12, 25, 18, 6, 18, 6, 24, 30, 24, 30, 30, 0, 30]],
    Y: [[0, 0, 7, 0, 15, 11, 23, 0, 30, 0, 18, 18, 18, 30, 12, 30, 12, 18]],
    G: [[0, 0, 30, 0, 30, 6, 6, 6, 6, 24, 24, 24, 24, 18, 16, 18, 16, 12, 30, 12, 30, 30, 0, 30]],
    N: [[0, 0, 6, 0, 6, 30, 0, 30], [24, 0, 30, 0, 30, 30, 24, 30], [4, 0, 11, 0, 26, 25, 26, 30, 19, 30, 4, 5]],
    B: [[0, 0, 6, 0, 6, 30, 0, 30], [6, 0, 25, 0, 30, 5, 30, 12, 25, 15, 30, 18, 30, 25, 25, 30, 6, 30, 6, 24, 24, 24, 24, 18, 6, 18, 6, 12, 24, 12, 24, 6, 6, 6]],
    C: [[0, 0, 30, 0, 30, 6, 6, 6, 6, 24, 30, 24, 30, 30, 0, 30]],
    H: [[0, 0, 6, 0, 6, 12, 24, 12, 24, 0, 30, 0, 30, 30, 24, 30, 24, 18, 6, 18, 6, 30, 0, 30]],
  };
  const CHROME = ["#FFFFFF", "#EEEEEE", "#DDDDDD", "#BBBBBB", "#999999", "#777777", "#555555", "#333333", "#BBBBBB", "#EEEEEE", "#FFFFFF"];
  const HEX = "0123456789ABCDEF";
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const STARS = [{ speed: 6, color: C.pin, len: 1 }, { speed: 15, color: C.light, len: 1 }, { speed: 34, color: C.white, len: 2 }];
  const FLASH_MS = 200, DISSOLVE_MS = 560;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let seen = false;
  try { seen = sessionStorage.getItem("intro-seen") === "1"; } catch {}
  // The first load of a session plays at least this long; later loads only cover the actual loading.
  let minMs = seen || reduce ? 0 : 1300;

  const root = document.createElement("div");
  root.id = "intro";
  root.setAttribute("role", "status");
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "intro-sr";
  label.textContent = "Loading Keygen Bench";
  root.append(canvas, label);
  document.body.prepend(root);
  const g = canvas.getContext("2d");

  const hash = (n) => {
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const width = (str) => str.length * 6 - 1;

  // Row-major so each row needs one fillStyle.
  function text(str, x, y, color) {
    g.fillStyle = color;
    for (let r = 0; r < 7; r++) {
      for (let i = 0; i < str.length; i++) {
        const cx = x + i * 6, bits = glyph(str[i])[r];
        if (!bits || cx >= W || cx + 5 <= 0) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) g.fillRect(cx + c, y + r, 1, 1);
      }
    }
  }

  // KEYGEN over BENCH in the STROKES letters, sheared into italics and sized to about two thirds of the width.
  // A white copy of the same mask draws the shine.
  function buildLogo() {
    const lines = ["KEYGEN", "BENCH"];
    const size = Math.max(16, Math.min(36, Math.floor((W * 0.66) / 7.4)));
    const adv = Math.round((size * 44) / 36), slant = Math.ceil(size / 7);
    const lineW = (n) => n * adv - (adv - size) + slant;
    const w = lineW(6) + 2, h = adv + size + 2;
    const mask = new Uint8Array(w * h);
    const inside = (pts, x, y) => {
      let hit = false;
      for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
        const ax = pts[i], ay = pts[i + 1], bx = pts[j], by = pts[j + 1];
        if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) hit = !hit;
      }
      return hit;
    };
    lines.forEach((line, row) => {
      const left = Math.floor((lineW(6) - lineW(line.length)) / 2);
      for (let i = 0; i < line.length; i++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        if (!STROKES[line[i]].some((p) => inside(p, ((x + 0.5) * 30) / size, ((y + 0.5) * 30) / size))) continue;
        mask[(row * adv + y) * w + left + i * adv + x + Math.floor((size - 1 - y) / 7)] = 1;
      }
    });
    const lit = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
    const draw = (white) => {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const x = c.getContext("2d");
      for (const pass of white ? ["fill"] : ["shadow", "fill"]) {
        for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
          if (!lit(px, py)) continue;
          if (pass === "shadow") { x.fillStyle = "#000"; x.fillRect(px + 2, py + 2, 1, 1); continue; }
          const band = Math.min(CHROME.length - 1, Math.floor(((py % adv) * CHROME.length) / size));
          x.fillStyle = white || !lit(px, py - 1) || !lit(px - 1, py) ? C.white : CHROME[band];
          x.fillRect(px, py, 1, 1);
        }
      }
      return c;
    };
    return { img: draw(false), white: draw(true), w, h };
  }

  let W = 0, H = 0, logo = null, stars = [];
  function fit() {
    const k = Math.max(innerWidth >= 360 ? 2 : 1, Math.floor(Math.min(innerWidth / 320, innerHeight / 200)));
    W = Math.ceil(innerWidth / k);
    H = Math.ceil(innerHeight / k);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = W * k + "px";
    canvas.style.height = H * k + "px";
    root.style.setProperty("--k", k + "px");
    root.style.setProperty("--scan", Math.floor(k / 2) + "px");
    logo = buildLogo();
    stars = Array.from({ length: Math.round((W * H) / 700) }, (_, i) => ({ x: Math.random() * W, y: (Math.random() * H) | 0, layer: i % 3 }));
  }

  function drawStars(t) {
    STARS.forEach(({ speed, color, len }, layer) => {
      g.fillStyle = color;
      for (const s of stars) if (s.layer === layer) g.fillRect(Math.floor((((s.x - t * speed) % W) + W) % W), s.y, len, 1);
    });
  }

  // Each scanline of the logo starts on a wide sine swing that settles flat within a second.
  // split (0..1) slides even and odd scanlines apart for the exit; shineX is the diagonal band's position.
  function drawLogo(t, y, split, shineX) {
    const x = Math.round((W - logo.w) / 2);
    const amp = reduce ? 0 : 20 * Math.exp(-t * 4);
    for (let r = 0; r < logo.h; r++) {
      const dx = Math.round(Math.sin(t * 5 + r * 0.3) * amp + (r & 1 ? 1 : -1) * split * split * W);
      g.drawImage(logo.img, 0, r, logo.w, 1, x + dx, y + r, logo.w, 1);
      if (shineX === null) continue;
      const s0 = Math.max(0, Math.round(shineX - r * 0.6)), s1 = Math.min(logo.w, s0 + 7);
      if (s1 > s0) g.drawImage(logo.white, s0, r, s1 - s0, 1, x + dx + s0, y + r, s1 - s0, 1);
    }
  }

  // Keygen serial field: decoded characters lock in white, the rest cycle through hex digits.
  function drawSerial(y, now, locked, flash) {
    const bw = width(SERIAL) + 8, bx = Math.round((W - bw) / 2);
    g.fillStyle = flash ? C.text : "#000";
    g.fillRect(bx, y, bw, 13);
    g.fillStyle = C.dark;
    g.fillRect(bx, y, bw, 1);
    g.fillRect(bx, y, 1, 13);
    g.fillStyle = C.light;
    g.fillRect(bx, y + 12, bw, 1);
    g.fillRect(bx + bw - 1, y, 1, 13);
    const tick = Math.floor(now / 60);
    SLOTS.forEach((pos, s) => {
      const cx = bx + 4 + pos * 6;
      if (s < locked) {
        const fresh = !reduce && now - lockedAt[s] < 110;
        if (fresh) { g.fillStyle = C.white; g.fillRect(cx - 1, y + 2, 7, 9); }
        text(SERIAL[pos], cx, y + 3, flash || fresh ? "#000" : C.white);
      } else {
        text(reduce ? "." : HEX[(hash(tick * 31 + s * 977) * 16) | 0], cx, y + 3, C.pin);
      }
    });
    for (const pos of [4, 9, 14]) text("-", bx + 4 + pos * 6, y + 3, flash ? "#000" : C.desk);
  }

  // Reveal: clear 4px cells once the sweep passes their row, staggered within the sweep by a 4x4 Bayer matrix.
  function dissolve(p) {
    const cols = Math.ceil(W / 4), rows = Math.ceil(H / 4);
    for (let y = 0; y < rows; y++) {
      const base = (y / rows) * 0.6;
      if (p < base) break;
      for (let x = 0; x < cols; x++) if (p >= base + (BAYER[(y & 3) * 4 + (x & 3)] / 16) * 0.4) g.clearRect(x * 4, y * 4, 4, 4);
    }
  }

  const tasks = [];
  const lockedAt = [];
  let outcome = null, shown = 0, locked = 0, start = 0, last = 0, exitAt = 0, shineAt = 0;

  function status(now) {
    if (exitAt) return [outcome === "ok" ? "REGISTERED!" : "LOAD FAILED", ""];
    const pending = tasks.find((task) => !task.settled);
    const base = tasks.length === 0 ? "BOOTING" : pending ? pending.label : "PATCHING TRACKER";
    return [base, reduce ? "..." : ".".repeat(Math.floor(now / 250) % 4)];
  }

  function frame(now) {
    if (!start) start = last = shineAt = now;
    const t = (now - start) / 1000, dt = Math.min(0.05, (now - last) / 1000), motion = reduce ? 0 : t;
    last = now;

    if (!exitAt) {
      // Locked characters only ever reflect settled steps (tracked loads, then the mount); the chase toward
      // that target just staggers the locks instead of snapping a whole step's share at once.
      const settled = tasks.filter((task) => task.settled).length;
      const target = outcome === "ok" ? 1 : settled / (tasks.length + 1);
      if (outcome !== "fail") shown = Math.max(shown, shown + (target - shown) * Math.min(1, dt * (outcome ? 9 : 6)));
      if (outcome === "ok" && shown > 0.995) shown = 1;
      const next = Math.floor(shown * SLOTS.length + 1e-9);
      for (; locked < next; locked++) lockedAt[locked] = now;
      if (outcome === "fail" || (outcome === "ok" && locked === SLOTS.length && now - start >= minMs)) {
        exitAt = shineAt = now;
        root.classList.add("out");
        removeEventListener("pointerdown", skip);
        removeEventListener("keydown", skip);
        if (reduce) { root.classList.add("fade"); setTimeout(finish, 220); return; }
      }
    }
    const e = exitAt ? now - exitAt : 0, flashMs = outcome === "ok" ? FLASH_MS : 0;
    const p = exitAt ? Math.min(1, Math.max(0, (e - flashMs) / DISSOLVE_MS)) : 0;

    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    drawStars(motion);
    const top = Math.max(4, Math.round(H * 0.5 - (logo.h + 34) / 2));
    const sweep = (now - shineAt) % 2800;
    drawLogo(motion, top, p, reduce || sweep > 600 ? null : (sweep / 600) * (logo.w + logo.h) - 7);
    drawSerial(top + logo.h + 12, now, locked, exitAt && e < flashMs);
    const [base, dots] = status(now);
    text(base + dots, Math.round((W - width(base)) / 2), top + logo.h + 31, exitAt ? C.white : C.text);
    if (p > 0) dissolve(p);
    if (p >= 1) { finish(); return; }
    requestAnimationFrame(frame);
  }

  function finish() {
    removeEventListener("resize", fit);
    root.remove();
    if (outcome === "ok") try { sessionStorage.setItem("intro-seen", "1"); } catch {}
  }

  const skip = () => { minMs = 0; };
  addEventListener("pointerdown", skip);
  addEventListener("keydown", skip);
  addEventListener("resize", fit);
  fit();
  requestAnimationFrame(frame);

  globalThis.bootIntro = {
    track(promise, label) {
      const task = { label, settled: false };
      tasks.push(task);
      return promise.finally(() => { task.settled = true; });
    },
    done() { outcome ??= "ok"; },
    fail() { outcome ??= "fail"; },
  };
})();
