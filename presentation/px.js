'use strict';
/* Shared pixel-art core for "The Shop That Opens Once" (v2). Every image is authored in code.
   Defines window.PX: the palette, canvas and sprite helpers, integer raster primitives,
   a tiny sign font, and Stage (crisp, integer-scaled display of a native-resolution scene). */
(() => {
  // Bright, light palette. Ramps run light -> dark; shadows lean cool/violet, highlights warm.
  const PAL = {
    // outline / ink
    ink: '#2a1b22', ink2: '#3d2a2e', pupil: '#1b1016',
    // grass
    grass0: '#e7f59a', grass1: '#b6e36b', grass2: '#86cc55', grass3: '#5aac4c', grass4: '#3d8a4a', grass5: '#2c6448',
    // tree foliage (a touch deeper/cooler than grass so trees separate from the ground)
    leaf0: '#d8f28a', leaf1: '#9fd65e', leaf2: '#6dbb4e', leaf3: '#4a9848', leaf4: '#347647', leaf5: '#255443', leaf6: '#1b3b3c',
    // dirt / sand path
    dirt0: '#fff1d2', dirt1: '#f5dcaa', dirt2: '#e6c286', dirt3: '#c99f66', dirt4: '#9c774e',
    // stone (cool, slightly lavender)
    stone0: '#f4f3f7', stone1: '#d9d8e6', stone2: '#b3b3cb', stone3: '#8b8aa8', stone4: '#65627f', stone5: '#46425a',
    // water
    water0: '#f2feff', water1: '#b3f1f5', water2: '#6fd8ea', water3: '#3db3e0', water4: '#2c86c7', water5: '#255fa3', water6: '#1f437a',
    // honey wood
    wood0: '#ffd9a0', wood1: '#eeb06e', wood2: '#cf8a4c', wood3: '#a8643a', wood4: '#7a452e', wood5: '#4f2d25',
    // roofs: terracotta, slate blue, teal
    roofR0: '#ffb08a', roofR1: '#f47f5e', roofR2: '#d65c48', roofR3: '#a8403e', roofR4: '#742d35',
    roofB0: '#b4c8ff', roofB1: '#8aa2f0', roofB2: '#6a7fd6', roofB3: '#5060b0', roofB4: '#3a4585',
    roofG0: '#9ee6c4', roofG1: '#5cc9a3', roofG2: '#3aa287', roofG3: '#2b7a6c', roofG4: '#1f5552',
    // plaster / cream walls
    wall0: '#fffcf2', wall1: '#fff0d4', wall2: '#f2d9ae', wall3: '#d9b884', wall4: '#b08e62',
    // flowers
    pink: '#ff9fd0', rose: '#ff6f8f', red: '#f2545b', yellow: '#ffe066', orange: '#ffa94d', white: '#ffffff', lilac: '#c3a2ff', blue: '#7ab8ff',
    // lantern light
    light0: '#fffbe6', light1: '#fff0a8', light2: '#ffd86a', light3: '#ffb347', light4: '#f28c38',
    // iron and brass
    iron0: '#dfe4ee', iron1: '#aab3c5', iron2: '#7a8398', iron3: '#525970', iron4: '#353a4d',
    brass0: '#fff0b3', brass1: '#f7cf6a', brass2: '#d9a443', brass3: '#a8732f', brass4: '#6f4722',
    // ant body
    ant0: '#ffb08a', ant1: '#f27a4a', ant2: '#d9542e', ant3: '#a93a24', ant4: '#72261c',
    // courier green (cap, bag)
    cap0: '#c9f28c', cap1: '#86d964', cap2: '#4fb34f', cap3: '#34884a', cap4: '#255e3d',
    // cream (eye whites, patches, paper)
    cream0: '#fffaf0', cream1: '#f5e6c8', cream2: '#e3cfa6',
    // day sky and clouds
    sky0: '#fff8e6', sky1: '#e4f4ff', sky2: '#c2e6ff', sky3: '#9fd3fb', sky4: '#7cbdf2',
    cloud0: '#ffffff', cloud1: '#f1f4ff', cloud2: '#d6def5', cloud3: '#b9c3e6',
    // dusk sky (still light: peach, rose, lilac)
    dusk0: '#fff0cf', dusk1: '#ffd3a8', dusk2: '#ffb3a0', dusk3: '#e79ab5', dusk4: '#b893d6', dusk5: '#8f8ad6',
    // hard-edged cast shadow (cool violet, translucent)
    shadow: 'rgba(60,50,110,0.28)',
  };
  const col = c => (typeof c === 'string' && c in PAL ? PAL[c] : c);

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
    const x = c.getContext('2d', { willReadFrequently: false }); x.imageSmoothingEnabled = false;
    return [c, x];
  }

  // ASCII sprite. rows: equal-length strings; key: { char: paletteKey | '#hex' }. '.' and ' ' are transparent.
  function sprite(rows, key) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const [c, x] = canvas(w, h);
    rows.forEach((r, y) => {
      let i = 0;
      while (i < r.length) {
        const k = r[i];
        if (k === '.' || k === ' ') { i++; continue; }
        let j = i + 1; while (j < r.length && r[j] === k) j++;
        const v = key[k]; if (v == null) throw new Error(`PX.sprite: no color for '${k}'`);
        x.fillStyle = col(v); x.fillRect(i, y, j - i, 1); i = j;
      }
    });
    return c;
  }

  // 1px outline around opaque pixels. The result is 2px larger in each dimension (offset by 1).
  // diagonal: also fill diagonal neighbours (rounder, heavier outline).
  function outline(src, color, diagonal = false) {
    const w = src.width, h = src.height, [c, x] = canvas(w + 2, h + 2);
    const s = src.getContext('2d').getImageData(0, 0, w, h).data;
    const a = (i, j) => i >= 0 && j >= 0 && i < w && j < h && s[(j * w + i) * 4 + 3] > 0;
    x.fillStyle = col(color);
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
      if (a(i, j)) continue;
      if (a(i - 1, j) || a(i + 1, j) || a(i, j - 1) || a(i, j + 1) ||
          (diagonal && (a(i - 1, j - 1) || a(i + 1, j - 1) || a(i - 1, j + 1) || a(i + 1, j + 1)))) x.fillRect(i + 1, j + 1, 1, 1);
    }
    x.drawImage(src, 1, 1);
    return c;
  }

  const flips = new WeakMap();
  function flip(src) {
    let f = flips.get(src); if (f) return f;
    const [c, x] = canvas(src.width, src.height); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
    flips.set(src, c); return c;
  }

  const hexRGB = h => { h = col(h).replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  // Exact colour swap: map { fromKeyOrHex: toKeyOrHex }.
  function recolor(src, map) {
    const [c, x] = canvas(src.width, src.height); x.drawImage(src, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    const m = new Map(Object.entries(map).map(([f, t]) => [hexRGB(f).join(','), hexRGB(t)]));
    for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const t = m.get(p[i] + ',' + p[i + 1] + ',' + p[i + 2]); if (t) { p[i] = t[0]; p[i + 1] = t[1]; p[i + 2] = t[2]; } }
    x.putImageData(d, 0, 0); return c;
  }

  // Deterministic PRNG (mulberry32). Never use Math.random for art.
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // Integer raster primitives (always crisp).
  const rect = (x, px, py, w, h, c) => { x.fillStyle = col(c); x.fillRect(Math.round(px), Math.round(py), Math.round(w), Math.round(h)); };
  const dot = (x, px, py, c) => rect(x, px, py, 1, 1, c);
  function line(x, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    x.fillStyle = col(c);
    for (;;) { x.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  // Filled ellipse centred on (cx, cy) with integer radii; symmetric rows, no anti-aliasing.
  function ellipse(x, cx, cy, rx, ry, c) {
    x.fillStyle = col(c); cx = Math.round(cx); cy = Math.round(cy);
    for (let dy = -ry; dy <= ry; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))));
      if (hw >= 0) x.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
  }
  // Hard-edged translucent cast shadow.
  const shadow = (x, cx, cy, rx, ry) => ellipse(x, cx, cy, rx, ry, PAL.shadow);

  // Tiny sign font (3x5 caps, digits, a little punctuation). Width 3 unless noted.
  const G = {
    A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.', E: '###|#..|##.|#..|###',
    F: '###|#..|##.|#..|#..', G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#', I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.',
    K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###', M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.',
    P: '##.|#.#|##.|#..|#..', Q: '.#.|#.#|#.#|##.|.##', R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.',
    U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#.#|#.#|###|###|#.#', X: '#.#|#.#|.#.|#.#|#.#', Y: '#.#|#.#|.#.|.#.|.#.',
    Z: '###|..#|.#.|#..|###', 0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###', 2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.',
    4: '#.#|#.#|###|..#|..#', 5: '###|#..|##.|..#|##.', 6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.', 8: '###|#.#|###|#.#|###',
    9: '###|#.#|###|..#|##.', ':': '.|#|.|#|.', '.': '.|.|.|.|#', ',': '.|.|.|#|#', "'": '#|#|.|.|.', '!': '#|#|#|.|#',
    '?': '##.|..#|.#.|...|.#.', '-': '...|...|###|...|...', '/': '..#|..#|.#.|#..|#..', '&': '.#.|#.#|.#.|#.#|.##', ' ': '..|..|..|..|..',
  };
  const glyph = ch => G[ch] || G[ch.toUpperCase()] || G['?'];
  const textWidth = s => [...s].reduce((w, ch) => w + glyph(ch).split('|')[0].length + 1, 0) - 1;
  function text(x, s, px, py, c) {
    x.fillStyle = col(c); let cx = Math.round(px); const y0 = Math.round(py);
    for (const ch of s) { const rows = glyph(ch).split('|'); rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') x.fillRect(cx + i, y0 + j, 1, 1); }); cx += rows[0].length + 1; }
    return cx - 1 - Math.round(px);
  }

  /* Stage: shows a scene crisply. The visible canvas is sized to its CSS box in device pixels;
     the scene is drawn at native resolution into a buffer and blitted at an integer scale S. */
  class Stage {
    constructor(el, opts = {}) {
      this.el = el; this.ctx = el.getContext('2d');
      this.area = opts.area || 340 * 190;   // target visible art-pixel area; S follows from it
      this.fixed = opts.scale || 0;         // force a CSS-pixel scale instead (x devicePixelRatio)
      this.fit = opts.fit || null;          // [w, h]: largest integer scale that shows this whole area
      [this.buf, this.bx] = canvas(1, 1);
      this.resize();
    }
    resize() {
      const r = this.el.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      const dw = Math.min(8192, Math.max(1, Math.round(r.width * dpr))), dh = Math.min(8192, Math.max(1, Math.round(r.height * dpr))); // cap guards against layout feedback
      if (this.el.width !== dw) this.el.width = dw;
      if (this.el.height !== dh) this.el.height = dh;
      const S = this.fixed ? Math.round(this.fixed * dpr) : this.fit ? Math.floor(Math.min(dw / this.fit[0], dh / this.fit[1])) : Math.round(Math.sqrt((dw * dh) / this.area));
      this.S = Math.max(1, S); this.dpr = dpr;
      this.vw = Math.ceil(dw / this.S); this.vh = Math.ceil(dh / this.S);
      this.buf.width = this.vw; this.buf.height = this.vh; this.bx.imageSmoothingEnabled = false;
    }
    // cam: world point to centre on. Returns the view that was drawn.
    render(scene, cam, t, state = {}, actors = [], overlay = null) {
      const vw = this.vw, vh = this.vh;
      let x = Math.round(cam.x - vw / 2), y = Math.round(cam.y - vh / 2);
      x = scene.w <= vw ? Math.round((scene.w - vw) / 2) : Math.max(0, Math.min(scene.w - vw, x));
      y = scene.h <= vh ? Math.round((scene.h - vh) / 2) : Math.max(0, Math.min(scene.h - vh, y));
      const view = { x, y, w: vw, h: vh, t, state };
      const b = this.bx;
      b.setTransform(1, 0, 0, 1, 0, 0); b.fillStyle = scene.bg || '#1b1016'; b.fillRect(0, 0, vw, vh);
      b.setTransform(1, 0, 0, 1, -x, -y);
      scene.draw(b, view, actors);
      if (overlay) overlay(b, view); // page-owned things drawn on top of the scene, in world coords
      const c = this.ctx; c.imageSmoothingEnabled = false; c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(this.buf, 0, 0, vw * this.S, vh * this.S);
      this.view = view; return view;
    }
    // Client (CSS px) coordinates -> world coordinates of the last rendered view.
    toWorld(clientX, clientY) {
      const r = this.el.getBoundingClientRect(), v = this.view; if (!v) return [0, 0];
      return [v.x + ((clientX - r.left) * this.dpr) / this.S, v.y + ((clientY - r.top) * this.dpr) / this.S];
    }
  }

  window.PX = { PAL, col, canvas, sprite, outline, flip, recolor, rng, rect, dot, line, ellipse, shadow, text, textWidth, Stage };
})();
