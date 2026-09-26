'use strict';
/* Interiors, props, keepsake items and UI icons for "The Shop That Opens Once" (v2).
   Every pixel is authored here in code on top of px.js (no image files).
   window.INTERIORS = { createShop, createStation }     ART.md scene contract
   window.IT        = { item(name, size, variant), icon(name) }   ART.md items contract */
(() => {
  const P = PX.PAL;
  const { canvas, sprite, rect, dot, line, ellipse, text, textWidth, rng } = PX;
  const C = c => PX.col(c);

  // Extra colours for this module, hue-shifted from PX.PAL ramps.
  const X = {
    sg0: '#e3f6e6', sg1: '#bde6cf', sg2: '#93cfb6', sg3: '#6cae9b',   // sage-teal paint (roofG lifted toward cream)
    pkL: '#f6c586', pkD: '#e3a262',                                    // floor plank tones between wood0/1 and wood1/2
    wp: '#fae5c3',                                                     // wallpaper stripe (between wall1 and wall2)
    lil0: '#e6dbff',                                                   // lilac highlight (lilac ramp top)
    glow: 'rgba(255,196,92,0.24)', glow2: 'rgba(255,236,150,0.42)',    // warm light bands (light2 / light1), stacked into stepped pools
    glint: 'rgba(255,255,255,0.5)',                                    // glass glints
    shade: 'rgba(92,64,150,0.18)',                                     // soft violet cast shade
    dusk: 'rgba(255,160,130,0.13)',                                    // warm peach tint for the dusk variant
  };

  /* ---------------------------------------------------------------- helpers */
  const S = (str, key) => sprite(str.trim().split('\n').map(r => r.trim()), key);
  function silhouette(src, color) {
    const [c, x] = canvas(src.width, src.height);
    x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = C(color); x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  // Filled polygon sampled at pixel centres (crisp, integer spans).
  function poly(x, pts, c) {
    x.fillStyle = C(c);
    const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y < y1; y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const a = Math.round(xs[k]), b = Math.round(xs[k + 1]); if (b > a) x.fillRect(a, y, b - a, 1); }
    }
  }
  // Per-pixel disc. fn(d, lit, dx, dy) -> colour | null; lit is +1 on the rim facing the top-left light, -1 opposite.
  function disc(x, cx, cy, r, fn) {
    const X0 = Math.floor(cx - r) - 1, X1 = Math.ceil(cx + r) + 1;
    for (let j = Math.floor(cy - r) - 1; j <= Math.ceil(cy + r); j++) {
      let run = null, rs = X0;
      for (let i = X0; i <= X1 + 1; i++) {
        let c = null;
        if (i <= X1) { const dx = i + 0.5 - cx, dy = j + 0.5 - cy, d = Math.hypot(dx, dy); if (d <= r) c = fn(d, d ? -(dx + dy) / (d * Math.SQRT2) : 1, dx, dy); }
        if (c !== run) { if (run) { x.fillStyle = C(run); x.fillRect(rs, j, i - rs, 1); } run = c; rs = i; }
      }
    }
  }
  // Cel-shade a silhouette: 1px outline (lighter on lit edges), top-left highlight band, bottom-right shade band.
  function bevel(src, r, hl = 1, sh = 2) {
    const w = src.width, h = src.height, a = src.getContext('2d').getImageData(0, 0, w, h).data;
    const M = (i, j) => i >= 0 && j >= 0 && i < w && j < h && a[(j * w + i) * 4 + 3] > 0;
    const [c, x] = canvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!M(i, j)) continue;
      const up = !M(i, j - 1), lf = !M(i - 1, j), dn = !M(i, j + 1), rt = !M(i + 1, j);
      let k;
      if (up || lf || dn || rt) k = r.ol && (up || lf) && !dn && !rt ? r.ol : r.o;
      else {
        let tl = 9, br = 9;
        for (let s = 2; s <= 6; s++) {
          if (tl === 9 && (!M(i - s, j) || !M(i, j - s) || !M(i - s + 1, j - s + 1))) tl = s;
          if (br === 9 && (!M(i + s, j) || !M(i, j + s) || !M(i + s - 1, j + s - 1))) br = s;
        }
        k = br <= sh + 1 && br <= tl ? r.s : tl <= hl + 1 ? r.h : r.b;
      }
      x.fillStyle = C(k); x.fillRect(i, j, 1, 1);
    }
    return c;
  }
  const mask = (w, h, f) => { const [c, x] = canvas(w, h); x.fillStyle = '#000'; f(x); return c; };
  // Pointed lens (leaf / ear) from a base point along an angle, filled at pixel centres.
  function lens(x, bx, by, ang, L, Wd, c, pow = 0.75) {
    const ca = Math.cos(ang), sa = Math.sin(ang), R0 = Math.ceil(L) + 2;
    x.fillStyle = C(c);
    for (let j = Math.floor(by - R0); j <= by + R0; j++) for (let i = Math.floor(bx - R0); i <= bx + R0; i++) {
      const dx = i + 0.5 - bx, dy = j + 0.5 - by, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      if (u < 0.5 || u > L) continue;
      if (Math.abs(v) <= Wd * Math.pow(Math.sin(Math.PI * Math.pow(u / L, pow)), 0.8) + 0.25) x.fillRect(i, j, 1, 1);
    }
  }
  // Engrave a 1-bit glyph map: groove pixels in `groove`, lit lip below-right in `lip`.
  function engrave(x, rows, px, py, groove, lip) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') { const nb = (rows[j + 1] || '')[i + 1] === '#'; if (!nb) dot(x, px + i + 1, py + j + 1, lip); } });
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') dot(x, px + i, py + j, groove); });
  }
  // Prop drawn in world coordinates into its own canvas; sorted with actors by its base line y.
  function prop(x0, y0, w, h, y, f, dyn) {
    const [c, x] = canvas(w, h); x.translate(-x0, -y0); f(x);
    return { y, c, x0, y0, draw: dyn ? (g, t) => { g.drawImage(c, x0, y0); dyn(g, t); } : g => g.drawImage(c, x0, y0) };
  }
  // Draw sorted props and actors (actors win ties so they stand in front of same-line props).
  function drawSorted(g, list, actors, t) {
    const all = list.slice();
    for (const a of actors || []) all.push({ y: a.y + 0.01, actor: a });
    all.sort((a, b) => a.y - b.y);
    for (const it of all) it.actor ? it.actor.draw(g) : it.draw(g, t);
  }
  // Scaled sign text (each font pixel becomes an s x s block).
  function bigText(x, s, px, py, c, k) {
    const w = textWidth(s), [tc, tx] = canvas(w, 5); text(tx, s, 0, 0, c);
    x.imageSmoothingEnabled = false; x.drawImage(tc, 0, 0, w, 5, Math.round(px), Math.round(py), w * k, 5 * k);
    return w * k;
  }
  // Soft puffy cloud from stacked flat ellipses: [top, mid, underside] colours.
  function puffCloud(x, cx, cy, w, [top, mid, bot]) {
    const h = Math.max(4, Math.round(w / 4));
    ellipse(x, cx + (w >> 1), cy + h - 2, (w >> 1), 2, bot);
    ellipse(x, cx + (w >> 1), cy + h - 3, (w >> 1) - 1, 2, mid);
    ellipse(x, cx + Math.round(w * 0.35), cy + 1, Math.round(w * 0.22), Math.round(h * 0.55), mid);
    ellipse(x, cx + Math.round(w * 0.62), cy + 2, Math.round(w * 0.2), Math.round(h * 0.45), mid);
    ellipse(x, cx + Math.round(w * 0.35), cy, Math.round(w * 0.18), Math.round(h * 0.45), top);
    ellipse(x, cx + Math.round(w * 0.6), cy + 1, Math.round(w * 0.15), Math.round(h * 0.35), top);
  }
  const step = (t, fps) => Math.floor(t * fps);
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; };

  // Material ramps [highlight, base, shade, outline]
  const R = {
    rose: ['roofR0', 'roofR1', 'roofR2', 'roofR3'], teal: ['roofG0', 'roofG1', 'roofG2', 'roofG3'],
    blue: ['roofB0', 'roofB1', 'roofB2', 'roofB3'], mustard: ['brass0', 'brass1', 'brass2', 'brass3'],
    lilac: [X.lil0, 'lilac', 'dusk5', 'roofB3'], cream: ['cream0', 'cream1', 'cream2', 'wood3'],
    green: ['cap0', 'cap1', 'cap2', 'cap3'], red: ['roofR1', 'red', 'roofR2', 'roofR4'], sage: [X.sg0, X.sg1, X.sg2, 'roofG3'],
    wood: ['wood1', 'wood2', 'wood3', 'wood4'],
  };

  /* ================================================================ ITEMS & ICONS (filled below) */
  const itemCache = new Map();
  function item(name, size = 'sm', variant) {
    const key = name + '|' + size + '|' + (variant || '');
    let c = itemCache.get(key);
    if (!c) { const f = (size === 'lg' ? LG : size === 'xs' ? XS : SM)[name]; if (!f) throw new Error(`IT.item: no ${size} ${name}`); c = f(variant); itemCache.set(key, c); }
    return c;
  }
  const SM = {}, LG = {}, XS = {};
  const iconCache = new Map();
  function icon(name) {
    let c = iconCache.get(name);
    if (!c) { const f = ICONS[name]; if (!f) throw new Error('IT.icon: unknown icon ' + name); c = f(); iconCache.set(name, c); }
    return c;
  }
  const ICONS = {};

  /* ================================================================ SHOP */
  function createShop() {
    const W = 360, H = 240, FY = 124;                 // FY: wall / floor line
    const LX = i => 36 + 48 * i, LY = 41;             // lantern glass centres
    const SHELF = 20;                                  // keepsakes stand on this line (cushions on the beam top)
    const CX = 180, CY = 74, CR = 18;                  // clock
    const anchors = { marlow: [200, 158], customer: [156, 186], door: [180, 234], clock: [CX, CY] };
    for (let i = 0; i < 7; i++) { anchors['lantern' + i] = [LX(i), LY]; anchors['slot' + i] = [LX(i), SHELF]; }
    const WINS = [[100, 55], [216, 55]], WW = 44, WH = 39;

    /* ---------- trinket sprites */
    const T = shopTrinkets();

    /* ---------- static layers. A: the wall surface, lit by the lantern pools. B: furniture and floor, drawn over the pools. */
    const [bgA, a] = canvas(W, FY);
    const [bg, b] = canvas(W, H);
    // plaster + wallpaper
    rect(a, 0, 0, W, FY, 'wall1');
    for (let i = 2; i < W; i += 14) { rect(a, i, 5, 3, FY - 5, X.wp); }
    for (let i = 9, k = 0; i < W; i += 14, k++) for (let j = 38 + (k % 2) * 9; j < 100; j += 18) { rect(a, i, j, 1, 3, X.wp); rect(a, i - 1, j + 1, 3, 1, X.wp); }
    // crown moulding
    rect(a, 0, 0, W, 3, 'wood2'); rect(a, 0, 0, W, 1, 'wood1'); rect(a, 0, 3, W, 1, 'wood4');
    // soft shade just under the crown
    rect(a, 0, 4, W, 2, X.shade);
    // wainscot and the beam shelf across the top
    wainscot(a);
    beam(a);

    // windows (glass is cut out of both layers so the sky layer shows through)
    const poolClip = new Path2D(); poolClip.rect(0, 0, W, FY);
    for (const [wx, wy] of WINS) windowFrame(b, wx, wy);
    // bookcases
    bookcase(b, 6, 54, 82, 70, T.left);
    bookcase(b, 272, 54, 82, 70, T.right);
    // little wall pictures in the gaps beside the clock
    frame(b, 152, 62, 8, 10, 'teal'); frame(b, 201, 68, 8, 7, 'mustard');
    // clock body (face and case; hands and pendulum are dynamic)
    clockBody(b);
    // floor, rug, light
    floor(b); rug(b, 118, 178, 124, 42); braidedRug(b, 52, 180, 46, 15); lightPatches(b); doorway(b);
    // side wall caps
    for (const sx of [0, W - 4]) { rect(b, sx, FY, 4, H - FY, 'wood2'); rect(b, sx + (sx ? 0 : 3), FY, 1, H - FY, 'wood4'); rect(b, sx + (sx ? 1 : 0), FY, 1, H - FY, 'wood1'); }

    function windowFrame(x, wx, wy) {
      // outer frame
      rect(x, wx - 1, wy - 1, WW + 2, WH + 2, 'roofG3');
      rect(x, wx, wy, WW, WH, X.sg1);
      rect(x, wx, wy, WW, 1, X.sg0); rect(x, wx, wy, 1, WH, X.sg0);
      rect(x, wx, wy + WH - 1, WW, 1, X.sg2); rect(x, wx + WW - 1, wy, 1, WH, X.sg2);
      // panes cut out
      const px = [wx + 4, wx + 23], py = [wy + 4, wy + 21], pw = 17, ph = 14;
      for (const ax of px) for (const ay of py) {
        rect(x, ax - 1, ay - 1, pw + 2, ph + 2, X.sg3);
        x.clearRect(ax, ay, pw, ph); a.clearRect(ax, ay, pw, ph); poolClip.rect(ax, ay, pw, ph);
        // glass glints (clusters, top-left of each pane)
        rect(x, ax + 2, ay + 2, 3, 1, X.glint); rect(x, ax + 2, ay + 3, 1, 2, X.glint);
        rect(x, ax + pw - 5, ay + ph - 3, 2, 1, X.glint);
      }
      // curtain rod with finials
      rect(x, wx - 6, wy - 4, WW + 12, 2, 'brass2'); rect(x, wx - 6, wy - 4, WW + 12, 1, 'brass1');
      rect(x, wx - 8, wy - 5, 3, 4, 'brass3'); rect(x, wx + WW + 5, wy - 5, 3, 4, 'brass3');
      dot(x, wx - 7, wy - 5, 'brass1'); dot(x, wx + WW + 6, wy - 5, 'brass1');
      // curtains gathered at the sides
      curtain(x, wx - 5, wy - 2, 1); curtain(x, wx + WW - 5, wy - 2, -1);
      // a little pot on each sill
      const pot = wx === WINS[0][0] ? T.sillA : T.sillB;
      x.drawImage(pot, wx + 30, wy + WH + 1 - pot.height);
      // sill
      rect(x, wx - 4, wy + WH, WW + 8, 5, 'wood4');
      rect(x, wx - 3, wy + WH, WW + 6, 2, 'wood0'); rect(x, wx - 3, wy + WH + 2, WW + 6, 2, 'wood2');
      rect(x, wx - 3, wy + WH + 4, WW + 6, 1, 'wood3');
    }
    function curtain(x, cx, cy, dir) {
      // a drape tied back to the side: wide under the rod, pinched at the tie, flared down to the sill
      const w = [11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 5, 5, 5, 6, 6, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
      for (let j = 0; j < w.length; j++) {
        const n = w[j], x0 = dir > 0 ? cx : cx + 11 - n;
        rect(x, x0, cy + j, n, 1, 'roofR3');
        rect(x, x0 + (dir > 0 ? 0 : 1), cy + j, n - 1, 1, 'dusk2');
        // folds: two soft ridges that follow the drape
        const f1 = x0 + Math.round(n * 0.3), f2 = x0 + Math.round(n * 0.65);
        dot(x, f1, cy + j, 'roofR0'); dot(x, f2, cy + j, 'roofR1');
        if (dir > 0) dot(x, x0, cy + j, 'roofR1'); else dot(x, x0 + n - 1, cy + j, 'roofR1');
      }
      // hem at the bottom
      rect(x, dir > 0 ? cx : cx + 1, cy + w.length - 1, 10, 1, 'roofR3');
      // tie: a gold cord wrapped around the pinch, with a little tassel
      const ty = cy + 13, tx = dir > 0 ? cx : cx + 6;
      rect(x, tx, ty, 5, 2, 'brass3'); rect(x, tx, ty, 5, 1, 'brass1'); dot(x, tx + (dir > 0 ? 1 : 3), ty, 'brass0');
      rect(x, tx + (dir > 0 ? 4 : 0), ty + 2, 1, 3, 'brass2'); dot(x, tx + (dir > 0 ? 4 : 0), ty + 5, 'brass3');
    }
    function wainscot(x) {
      const y0 = 98;
      rect(x, 0, y0, W, 3, 'wood2'); rect(x, 0, y0, W, 1, 'wood0'); rect(x, 0, y0 + 2, W, 1, 'wood3');   // chair rail
      rect(x, 0, y0 + 3, W, FY - y0 - 3, X.sg1);
      for (let px = 4; px < W - 4; px += 30) {
        const x0 = px + 2, y1 = y0 + 6, w = 24, h = 12;
        rect(x, x0, y1, w, h, X.sg2); rect(x, x0 + 1, y1 + 1, w - 2, h - 2, X.sg1);
        rect(x, x0, y1, w, 1, X.sg3); rect(x, x0, y1, 1, h, X.sg3);               // recessed edge in shadow (top-left)
        rect(x, x0 + 1, y1 + h - 1, w - 1, 1, X.sg0); rect(x, x0 + w - 1, y1 + 1, 1, h - 1, X.sg0);  // lit bottom-right lip
      }
      rect(x, 0, y0 + 3, W, 1, X.sg3);   // shadow under the rail
      // baseboard
      rect(x, 0, FY - 5, W, 5, 'wood2'); rect(x, 0, FY - 5, W, 1, 'wood1'); rect(x, 0, FY - 1, W, 1, 'wood4');
    }
    function frame(x, fx, fy, w, h, ramp) {
      const r = R[ramp];
      rect(x, fx + 1, fy + 1, w, h, X.shade);
      rect(x, fx, fy, w, h, 'wood4'); rect(x, fx + 1, fy + 1, w - 2, h - 2, 'brass2'); rect(x, fx + 1, fy + 1, w - 2, 1, 'brass1');
      rect(x, fx + 2, fy + 2, w - 4, h - 4, C(r[0]));
      rect(x, fx + 2, fy + 2 + ((h - 4) >> 1), w - 4, (h - 4) - ((h - 4) >> 1), C(r[1]));
      dot(x, fx + (w >> 1), fy - 2, 'wood4'); line(x, fx + 1, fy, fx + (w >> 1), fy - 2, 'wood4'); line(x, fx + w - 2, fy, fx + (w >> 1), fy - 2, 'wood4');
    }
    function bookcase(x, bx, by, bw, bh, shelves) {
      const n = shelves.length, top = 4, base = 5, board = 3, cav = Math.floor((bh - top - base - board * (n - 1)) / n);
      // cast shadow on the wall (to the right)
      rect(x, bx + bw, by + 3, 3, bh - 3, X.shade);
      rect(x, bx, by, bw, bh, 'wood4');
      rect(x, bx + 1, by + 1, bw - 2, bh - 1, 'wood2');
      rect(x, bx + 1, by + 1, bw - 2, 1, 'wood0'); rect(x, bx + 1, by + 2, bw - 2, 1, 'wood1'); rect(x, bx + 1, by + 3, bw - 2, 1, 'wood3');
      rect(x, bx + 1, by + 1, 1, bh - 1, 'wood1');           // lit left edge
      rect(x, bx + bw - 2, by + 4, 1, bh - 4, 'wood3');      // shaded right edge
      let cy = by + top;
      shelves.forEach((items, k) => {
        const ix = bx + 4, iw = bw - 8;
        rect(x, ix, cy, iw, cav, X.sg2);
        rect(x, ix, cy, iw, 2, X.sg3); rect(x, ix, cy, 2, cav, X.sg3);     // shade from the board above and the left side
        rect(x, ix - 1, cy, 1, cav, 'wood4'); rect(x, ix + iw, cy, 1, cav, 'wood4');
        // items stand on the cavity floor
        const floorY = cy + cav;
        for (const [spr, dx, dy = 0] of items) {
          const sx = ix + dx, sy = floorY - spr.height + dy;
          x.drawImage(silhouette(spr, X.sg3), sx + 2, sy);
          x.drawImage(spr, sx, sy);
        }
        cy += cav;
        if (k < n - 1) {
          rect(x, bx + 1, cy, bw - 2, board, 'wood2'); rect(x, bx + 1, cy, bw - 2, 1, 'wood1'); rect(x, bx + 1, cy + board - 1, bw - 2, 1, 'wood3');
          rect(x, bx + 1, cy, 1, board, 'wood1');
          cy += board;
        }
      });
      // plinth
      const py = by + bh - base;
      rect(x, bx + 1, py, bw - 2, base, 'wood3'); rect(x, bx + 1, py, bw - 2, 1, 'wood1'); rect(x, bx + 2, py + 2, bw - 4, 2, 'wood2');
    }
    function clockBody(x) {
      // pendulum case hanging below the dial
      const kx = CX - 12, ky = CY + 14, kw = 25, kh = 34;
      rect(x, kx + 2, ky + 2, kw, kh, X.shade);
      rect(x, kx, ky, kw, kh, 'wood4');
      rect(x, kx + 1, ky + 1, kw - 2, kh - 2, 'wood2');
      rect(x, kx + 1, ky + 1, 1, kh - 2, 'wood1'); rect(x, kx + kw - 2, ky + 1, 1, kh - 2, 'wood3');
      // glass door showing the case back
      rect(x, kx + 4, ky + 6, kw - 8, kh - 12, 'wood4');
      rect(x, kx + 5, ky + 7, kw - 10, kh - 14, 'cream1');
      rect(x, kx + 5, ky + 7, kw - 10, 2, 'cream2'); rect(x, kx + 5, ky + 7, 1, kh - 14, 'cream2');
      // base moulding and a finial
      rect(x, kx - 1, ky + kh - 4, kw + 2, 4, 'wood4'); rect(x, kx, ky + kh - 4, kw, 1, 'wood1'); rect(x, kx, ky + kh - 3, kw, 2, 'wood2');
      rect(x, CX - 3, ky + kh, 7, 2, 'wood4'); rect(x, CX - 2, ky + kh, 5, 1, 'wood2'); dot(x, CX, ky + kh + 2, 'wood4');
      // dial: brass rim, cream face, ticks and a few numerals
      disc(x, CX + 1.5, CY + 1.5, CR, () => X.shade);
      disc(x, CX + 0.5, CY + 0.5, CR, (d, lit) => d > CR - 1 ? 'brass4' : d > CR - 4 ? (lit > 0.55 ? 'brass0' : lit > 0 ? 'brass1' : lit > -0.55 ? 'brass2' : 'brass3') : d > CR - 5 ? 'brass3' : (d > CR - 7 && lit > 0.35 ? 'cream2' : d > CR - 7 && lit > -0.1 ? 'cream1' : 'cream0'));
      for (let h = 0; h < 12; h++) {
        if (h % 3 === 0) continue;   // numerals stand at 12, 3, 6 and 9
        const a = (h / 12) * Math.PI * 2, s = Math.sin(a), c = -Math.cos(a);
        line(x, CX + s * (CR - 6), CY + c * (CR - 6), CX + s * (CR - 7), CY + c * (CR - 7), 'wood3');
      }
      text(x, '12', CX - 3, CY - 11, 'wood4'); text(x, '6', CX - 1, CY + 7, 'wood4');
      text(x, '3', CX + 8, CY - 2, 'wood4'); text(x, '9', CX - 10, CY - 2, 'wood4');
      // keyhole and brass trim on the pendulum door
      rect(x, CX + 7, ky + 18, 1, 2, 'brass3'); dot(x, CX + 7, ky + 17, 'brass1');
      rect(x, kx + 4, ky + 5, kw - 8, 1, 'brass2');
    }
    function beam(x) {
      const y = 20;
      rect(x, 0, y + 12, W, 2, X.shade);                     // shadow under the beam
      rect(x, 0, y, W, 12, 'wood4');
      rect(x, 0, y, W, 3, 'wood0'); rect(x, 0, y + 2, W, 1, 'wood1');   // top face (keepsakes stand here)
      rect(x, 0, y + 3, W, 8, 'wood2'); rect(x, 0, y + 3, W, 1, 'wood1'); rect(x, 0, y + 10, W, 1, 'wood3');
      // grain clusters on the front face
      const r = rng(31);
      for (let k = 0; k < 26; k++) { const gx = Math.floor(r() * (W - 20)), gy = y + 5 + Math.floor(r() * 4), gl = 5 + Math.floor(r() * 12); rect(x, gx, gy, gl, 1, 'wood3'); if (r() < 0.4) rect(x, gx + 2, gy - 1, gl - 4, 1, 'wood1'); }
      // brass number plates, iron hooks and a velvet cushion for each night's keepsake
      for (let i = 0; i < 7; i++) {
        const px = LX(i) - 5;
        rect(x, px, y + 4, 11, 7, 'brass3'); rect(x, px + 1, y + 5, 9, 5, 'brass1'); rect(x, px + 1, y + 5, 9, 1, 'brass0'); rect(x, px + 1, y + 5, 1, 5, 'brass0');
        text(x, String(i + 1), LX(i) - 1, y + 5, 'brass4');
        rect(x, LX(i) - 1, y + 11, 3, 1, 'iron3');
        const cx = LX(i) - 6;
        rect(x, cx + 1, y - 3, 11, 1, 'roofG3'); rect(x, cx, y - 2, 13, 3, 'roofG3');
        rect(x, cx + 1, y - 2, 11, 1, 'roofG1'); rect(x, cx + 1, y - 1, 11, 1, 'roofG2'); rect(x, cx + 2, y - 2, 3, 1, 'roofG0');
        dot(x, cx, y - 2, 'brass1'); dot(x, cx + 12, y - 2, 'brass1');
      }
      // end brackets
      for (const ex of [0, W - 8]) { rect(x, ex, y + 11, 8, 8, 'wood4'); rect(x, ex + 1, y + 11, 6, 6, 'wood2'); rect(x, ex + 1, y + 11, 6, 1, 'wood1'); rect(x, ex + (ex ? 1 : 0), y + 17, 7, 1, X.shade); }
    }
    function floor(x) {
      const r = rng(7), tones = [X.pkL, 'wood1', 'wood1', X.pkD], dark = { [X.pkL]: 'wood1', wood1: X.pkD, [X.pkD]: 'wood2' };
      for (let y = FY; y < H; y += 8) {
        let px = -Math.floor(r() * 50);
        while (px < W) {
          const len = 40 + Math.floor(r() * 46), tone = tones[Math.floor(r() * tones.length)];
          rect(x, px, y, len, 7, tone);
          const g = dark[tone];
          // grain streaks and the odd knot, as clusters
          if (r() < 0.8) { const gx = px + 4 + Math.floor(r() * (len - 20)), gy = y + 2 + Math.floor(r() * 3); rect(x, gx, gy, 6 + Math.floor(r() * 10), 1, g); }
          if (r() < 0.5) { const gx = px + 6 + Math.floor(r() * (len - 18)), gy = y + 1 + Math.floor(r() * 5); rect(x, gx, gy, 4 + Math.floor(r() * 6), 1, g); }
          if (r() < 0.18) { const kx = px + 8 + Math.floor(r() * (len - 16)), ky = y + 2; rect(x, kx, ky, 3, 2, g); rect(x, kx + 1, ky, 1, 1, 'wood3'); rect(x, kx - 2, ky + 2, 7, 1, g); }
          rect(x, px + len - 1, y, 1, 7, 'wood3');
          px += len;
        }
        rect(x, 0, y + 7, W, 1, 'wood3');
      }
      // contact shade along the wall
      rect(x, 0, FY, W, 2, X.shade);
    }
    function rug(x, rx, ry, w, h) {
      for (let j = ry + 2; j < ry + h - 2; j += 2) { rect(x, rx - 3, j, 3, 1, 'cream1'); rect(x, rx + w, j, 3, 1, 'cream1'); dot(x, rx - 3, j, 'cream2'); dot(x, rx + w + 2, j, 'cream2'); }
      rect(x, rx + 2, ry + h, w, 2, X.shade);
      rect(x, rx, ry, w, h, 'roofG4');
      rect(x, rx + 1, ry + 1, w - 2, h - 2, 'roofG2');
      rect(x, rx + 5, ry + 5, w - 10, h - 10, 'roofG3');
      rect(x, rx + 6, ry + 6, w - 12, h - 12, 'roofG1');
      // border motif: cream diamonds along the band
      for (let k = rx + 6; k < rx + w - 6; k += 8) { rect(x, k, ry + 3, 3, 1, 'cream0'); dot(x, k + 1, ry + 2, 'cream0'); dot(x, k + 1, ry + 4, 'cream0'); rect(x, k, ry + h - 4, 3, 1, 'cream0'); dot(x, k + 1, ry + h - 5, 'cream0'); dot(x, k + 1, ry + h - 3, 'cream0'); }
      for (let k = ry + 9; k < ry + h - 8; k += 8) { rect(x, rx + 2, k, 3, 1, 'cream0'); dot(x, rx + 3, k - 1, 'cream0'); dot(x, rx + 3, k + 1, 'cream0'); rect(x, rx + w - 5, k, 3, 1, 'cream0'); dot(x, rx + w - 4, k - 1, 'cream0'); dot(x, rx + w - 4, k + 1, 'cream0'); }
      // central medallion
      const mx = rx + (w >> 1), my = ry + (h >> 1);
      poly(x, [[mx, my - 13], [mx + 26, my + 0.5], [mx, my + 14], [mx - 26, my + 0.5]], 'roofG3');
      poly(x, [[mx, my - 12], [mx + 24, my + 0.5], [mx, my + 13], [mx - 24, my + 0.5]], 'cream1');
      poly(x, [[mx, my - 9], [mx + 18, my + 0.5], [mx, my + 10], [mx - 18, my + 0.5]], 'roofR1');
      poly(x, [[mx, my - 5], [mx + 10, my + 0.5], [mx, my + 6], [mx - 10, my + 0.5]], 'yellow');
      rect(x, mx - 1, my - 1, 3, 3, 'roofR2');
      // corner flowers
      for (const [fx, fy] of [[rx + 14, ry + 12], [rx + w - 15, ry + 12], [rx + 14, ry + h - 13], [rx + w - 15, ry + h - 13]]) { rect(x, fx - 1, fy, 3, 1, 'roofR0'); rect(x, fx, fy - 1, 1, 3, 'roofR0'); dot(x, fx, fy, 'yellow'); }
    }
    function braidedRug(x, cx, cy, rx, ry) {
      const rings = ['roofG3', X.sg2, 'cream0', X.sg1, 'roofR0', 'cream0', X.sg2, 'cream1', X.sg0, 'cream0'];
      ellipse(x, cx + 2, cy + 2, rx, ry, X.shade);
      rings.forEach((c, k) => ellipse(x, cx, cy, rx - k * 3, Math.max(1, ry - k), c));
      // braid ticks on the outer rings
      for (let a = 0; a < Math.PI * 2; a += 0.21) { dot(x, cx + Math.round(Math.cos(a) * (rx - 2)), cy + Math.round(Math.sin(a) * (ry - 1)), 'roofG2'); }
    }
    function lightPatches(x) {
      // window light falls on the floor below each window, skewed right (light from top-left); mullions leave dark bars
      for (const [wx] of WINS) {
        for (const [a, b] of [[4, 21], [23, 40]]) for (const [y0, y1] of [[FY + 2, FY + 13], [FY + 15, FY + 26]]) {
          const pts = [[wx + a + (y0 - FY) * 0.5, y0], [wx + b + (y0 - FY) * 0.5, y0], [wx + b + (y1 - FY) * 0.5, y1], [wx + a + (y1 - FY) * 0.5, y1]];
          poly(x, pts, X.glow2);
        }
      }
    }
    function doorway(x) {
      const dx = 166, dw = 28;
      // warm light spilling in through the open door (stepped bands)
      poly(x, [[dx - 14, 196], [dx + dw + 14, 196], [dx + dw + 2, H], [dx - 2, H]], X.glow);
      poly(x, [[dx - 6, 210], [dx + dw + 6, 210], [dx + dw, H], [dx, H]], X.glow);
      // doormat
      rect(x, dx + 1, 223, dw - 2, 11, 'dirt4'); rect(x, dx + 2, 224, dw - 4, 9, 'dirt2');
      for (let k = dx + 3; k < dx + dw - 3; k += 3) rect(x, k, 225, 1, 7, 'dirt3');
      rect(x, dx + 2, 224, dw - 4, 1, 'dirt1');
      // front wall cap with the doorway gap
      for (const [a, bw] of [[0, dx - 2], [dx + dw + 2, W - dx - dw - 2]]) { rect(x, a, 234, bw, 6, 'wood3'); rect(x, a, 234, bw, 2, 'wood1'); rect(x, a, 236, bw, 1, 'wood2'); rect(x, a, 239, bw, 1, 'wood4'); }
      // door posts and threshold
      for (const px of [dx - 4, dx + dw]) { rect(x, px, 228, 4, 12, 'wood4'); rect(x, px + 1, 228, 2, 12, 'wood2'); dot(x, px + 1, 228, 'wood0'); }
      rect(x, dx, 236, dw, 4, 'brass3'); rect(x, dx, 236, dw, 1, 'brass1'); rect(x, dx, 237, dw, 2, 'brass2');
    }

    /* ---------- window sky (static bands + drifting clouds + rooftops) */
    const SKX = 100, SKY = 52, SKW = 160, SKH = 42;
    const [sky, sk] = canvas(SKW, SKH);
    {
      const bands = [['dusk4', 0, 6], ['dusk3', 6, 9], ['dusk2', 15, 11], ['dusk1', 26, 9], ['dusk0', 35, 7]];
      for (const [c, y, h] of bands) rect(sk, 0, y, SKW, h, c);
      // low sun behind the right window's rooftops
      const sx = 146, sy = 36;
      ellipse(sk, sx, sy, 9, 8, 'dusk0'); ellipse(sk, sx, sy, 6, 6, 'light1'); ellipse(sk, sx, sy, 4, 4, 'light0');
    }
    const [roofs, rf] = canvas(SKW, SKH);
    {
      const far = 'dusk3', mid = 'dusk4', near = 'dusk5', rim = 'dusk2';
      // far hills
      for (let i = 0; i < SKW; i++) { const h = Math.round(4 + 2 * Math.sin(i * 0.07) + 1.5 * Math.sin(i * 0.19 + 1)); rect(rf, i, SKH - 10 - h, 1, h + 10, far); }
      // rooftops: [x, width, wall height, roof height]
      const houses = [[2, 16, 5, 7], [20, 12, 7, 6], [36, 10, 4, 5], [118, 14, 6, 7], [134, 18, 4, 8], [152, 10, 6, 5]];
      for (const [hx, w, wh, rh] of houses) {
        const base = SKH, top = base - wh;
        rect(rf, hx, top, w, wh, mid);
        poly(rf, [[hx - 1, top], [hx + w / 2, top - rh], [hx + w + 1, top]], near);
        line(rf, hx - 1, top - 1, hx + w / 2, top - rh, rim);
        rect(rf, hx + w - 5, top - rh + 1, 2, rh - 1, near);                 // chimney
        rect(rf, hx + 3, top + 2, 2, 2, 'light2'); if (w > 12) rect(rf, hx + w - 5, top + 2, 2, 2, 'light2');
      }
      // bell tower in the right window
      rect(rf, 124, 18, 6, 24, near); poly(rf, [[123, 18], [127, 11], [131, 18]], near); rect(rf, 126, 21, 2, 3, 'light2'); line(rf, 123, 17, 127, 11, rim);
      // round trees
      for (const [tx, ty, r] of [[48, 34, 5], [110, 33, 5], [104, 35, 4]]) { ellipse(rf, tx, ty, r, r, near); rect(rf, tx - r + 1, ty - r + 1, 2, 1, rim); }
    }
    const clouds = [[10, 6, 24], [80, 3, 18], [128, 11, 28], [40, 17, 16]];
    const cloud = (x, cx, cy, w) => puffCloud(x, cx, cy, w, ['cloud0', 'dusk0', 'dusk1']);

    /* ---------- props sorted with actors */
    const props = [];
    // counter (with bell, ledger, tray and lamp on top)
    const CT = { x0: 124, x1: 244, top: 148, front: 157, base: 171 };
    props.push(prop(118, 124, 134, 52, CT.base, counter, (g, t) => {
      const f = step(t, 8), lx = 235, ly = CT.top - 11;
      rect(g, lx - 1, ly + (f % 3 === 0 ? 1 : 0), 3, f % 3 === 0 ? 3 : 4, 'light3'); rect(g, lx, ly + 2, 1, 2, 'light0');
    }));
    function counter(x) {
      const { x0, x1, top, front, base } = CT, w = x1 - x0;
      // cast shadow (down-right)
      poly(x, [[x0 + 4, base], [x1 + 6, base], [x1 + 6, front + 2], [x1, front - 2], [x1, base]], X.shade);
      rect(x, x0 + 3, base, w, 2, X.shade);
      rect(x, x0, top, w, base - top, 'wood4');
      // top slab: planks seen from above, a lit front nosing
      rect(x, x0 + 1, top + 1, w - 2, front - top - 2, 'wood1');
      for (let k = x0 + 30; k < x1 - 4; k += 30) rect(x, k, top + 1, 1, front - top - 2, 'wood2');
      rect(x, x0 + 1, top + 1, w - 2, 1, 'wood2');
      rect(x, x0 + 1, front - 1, w - 2, 1, 'wood0');
      rect(x, x0 + 1, front, w - 2, 1, 'wood3');
      // front face: raised sage panels in a honey frame
      rect(x, x0 + 1, front + 1, w - 2, base - front - 2, 'wood2');
      rect(x, x0 + 1, front + 1, 1, base - front - 2, 'wood1');
      for (let k = 0; k < 4; k++) {
        const px = x0 + 4 + k * 29, pw = 25, py = front + 3, ph = base - front - 7;
        rect(x, px, py, pw, ph, 'wood3');
        rect(x, px + 1, py + 1, pw - 2, ph - 2, X.sg1);
        rect(x, px + 1, py + 1, pw - 2, 1, X.sg0); rect(x, px + 1, py + 1, 1, ph - 2, X.sg0);
        rect(x, px + 2, py + ph - 2, pw - 3, 1, X.sg2); rect(x, px + pw - 2, py + 2, 1, ph - 3, X.sg2);
        rect(x, px + 5, py + 2, pw - 10, 1, X.sg0);
      }
      rect(x, x0 + 1, base - 3, w - 2, 2, 'wood3'); rect(x, x0 + 1, base - 3, w - 2, 1, 'wood2');
      // bell
      const bx = 134, by = top;
      rect(x, bx - 4, by + 2, 9, 2, 'wood4'); rect(x, bx - 3, by + 2, 7, 1, 'wood2');
      disc(x, bx + 0.5, by + 1.5, 4, (d, lit, dx, dy) => dy > 0.5 ? null : d > 3.2 ? 'brass4' : lit > 0.5 ? 'brass0' : lit > -0.2 ? 'brass1' : 'brass2');
      rect(x, bx, by - 4, 1, 2, 'brass4'); dot(x, bx, by - 5, 'brass2');
      // ledger (open book seen from above) with a ribbon over the edge
      const lx = 146, ly = top + 1;
      rect(x, lx, ly, 20, 7, 'roofR3'); rect(x, lx + 1, ly, 8, 6, 'cream0'); rect(x, lx + 10, ly, 9, 6, 'cream0');
      rect(x, lx + 9, ly, 1, 6, 'cream2'); rect(x, lx + 1, ly + 5, 18, 1, 'cream2');
      for (let k = 1; k < 5; k += 2) { rect(x, lx + 2, ly + k, 6, 1, 'stone2'); rect(x, lx + 11, ly + k, 5, 1, 'stone2'); }
      rect(x, lx + 14, ly + 6, 1, 4, 'rose');
      // inkwell and quill
      rect(x, 170, top + 2, 5, 4, 'roofB4'); rect(x, 171, top + 2, 3, 1, 'roofB2'); dot(x, 171, top + 3, 'roofB1');
      line(x, 172, top + 1, 176, top - 6, 'cream1'); line(x, 173, top + 1, 177, top - 5, 'cream0'); dot(x, 177, top - 6, 'white');
      // display tray (velvet with trinkets)
      const tx = 204, ty = top + 2;
      rect(x, tx, ty, 22, 6, 'wood3'); rect(x, tx + 1, ty + 1, 20, 4, 'roofB2'); rect(x, tx + 1, ty + 1, 20, 1, 'roofB1');
      rect(x, tx + 3, ty + 2, 3, 2, 'brass1'); dot(x, tx + 4, ty + 2, 'brass0');
      rect(x, tx + 9, ty + 2, 2, 2, 'rose'); dot(x, tx + 9, ty + 2, 'pink');
      rect(x, tx + 14, ty + 2, 3, 2, 'iron1'); dot(x, tx + 14, ty + 2, 'iron0');
      rect(x, tx + 18, ty + 2, 2, 2, 'yellow');
      // small brass oil lamp (flame is animated)
      const lpx = 235, lpy = top - 14;
      ellipse(x, lpx, lpy + 5, 9, 8, X.glow); ellipse(x, lpx, lpy + 5, 6, 5, X.glow2);
      rect(x, lpx - 3, lpy + 13, 7, 2, 'brass4'); rect(x, lpx - 2, lpy + 13, 5, 1, 'brass1');
      rect(x, lpx - 2, lpy + 10, 5, 3, 'brass2'); rect(x, lpx - 2, lpy + 10, 2, 1, 'brass0');
      rect(x, lpx - 2, lpy, 5, 10, 'stone1'); rect(x, lpx - 1, lpy + 1, 3, 8, 'cream0'); dot(x, lpx - 1, lpy + 1, 'white');
      rect(x, lpx - 2, lpy, 5, 1, 'stone3');
    }
    // reading corner: floor lamp, wingback armchair, side table with teapot, a pile of books
    props.push(prop(4, 128, 26, 52, 176, x => floorLamp(x, 16, 176)));
    props.push(prop(24, 144, 44, 44, 186, x => armchair(x, 44, 186)));
    props.push(prop(62, 152, 26, 30, 180, x => sideTable(x, 74, 180)));
    props.push(prop(82, 174, 22, 18, 190, x => bookPile(x, 92, 190)));
    // floor globe, standing in the window light
    props.push(prop(94, 124, 26, 28, 148, x => floorGlobe(x, 108, 148)));
    // plants in the front corners
    props.push(prop(0, 166, 60, 74, 236, x => plant(x, 24, 236, 11, 1)));
    props.push(prop(302, 166, 58, 74, 236, x => plant(x, 336, 236, 23, -1)));
    // gramophone on a small cabinet and a coat stand (right)
    props.push(prop(266, 120, 56, 54, 170, x => gramophone(x, 290, 170)));
    props.push(prop(326, 124, 32, 58, 180, x => coatStand(x, 342, 180)));
    // stacked trunks (right front)
    props.push(prop(250, 174, 62, 42, 212, x => trunks(x, 256, 212)));
    // either side of the door: umbrella stand and a basket of rolled maps
    props.push(prop(136, 208, 22, 30, 234, x => umbrellaStand(x, 146, 234)));
    props.push(prop(208, 212, 20, 26, 234, x => mapBasket(x, 216, 234)));

    function shadowRect(x, sx, sy, w, h) { rect(x, sx + 2, sy, w, h, X.shade); rect(x, sx + w + 2, sy + 1, 2, h - 1, X.shade); }
    // A pointed leaf rasterised along an angle, cel-shaded with a midrib.
    function leaf(x, bx, by, ang, L, Wd, front) {
      const Rr = Math.ceil(L) + 2, n = 2 * Rr + 1, ca = Math.cos(ang), sa = Math.sin(ang);
      const m = mask(n, n, g => {
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const dx = i + 0.5 - Rr, dy = j + 0.5 - Rr, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
          if (u < 0.5 || u > L) continue;
          const s = u / L, half = Wd * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.75)), 0.8);
          if (Math.abs(v) <= half + 0.25) g.fillRect(i, j, 1, 1);
        }
      });
      const ramp = front ? { o: 'leaf5', ol: 'leaf4', h: 'leaf1', b: 'leaf2', s: 'leaf3' } : { o: 'leaf6', ol: 'leaf5', h: 'leaf2', b: 'leaf3', s: 'leaf4' };
      const c = bevel(m, ramp, 1, 1), g = c.getContext('2d');
      line(g, Rr + ca * 2, Rr + sa * 2, Rr + ca * L * 0.72, Rr + sa * L * 0.72, ramp.s);
      x.drawImage(c, Math.round(bx) - Rr, Math.round(by) - Rr);
    }
    function plant(x, px, py, seed, dir) {
      ellipse(x, px + 3, py - 1, 13, 3, X.shade);
      const r = rng(seed), top = py - 14, deg = a => ((dir > 0 ? a : 180 - a) * Math.PI) / 180;
      const back = [[-142, 19, 4], [-116, 25, 5], [-90, 29, 5], [-64, 25, 5], [-36, 19, 4]];
      const front = [[-164, 15, 4], [-134, 21, 5], [-104, 26, 5], [-76, 24, 5], [-48, 21, 5], [-18, 15, 4]];
      for (const [a, L, w] of back) leaf(x, px + (r() * 4 - 2), top - 3, deg(a), L, w, false);
      for (const [a, L, w] of front) leaf(x, px + (r() * 4 - 2), top - 1, deg(a), L, w, true);
      // terracotta pot drawn over the leaf bases
      const pm = mask(22, 15, g => { rect(g, 0, 0, 22, 4, '#000'); rect(g, 2, 4, 18, 11, '#000'); });
      x.drawImage(bevel(pm, { o: 'roofR4', ol: 'roofR3', h: 'roofR0', b: 'roofR1', s: 'roofR2' }, 1, 2), px - 11, py - 15);
      rect(x, px - 9, py - 11, 18, 1, 'roofR2');
      rect(x, px - 8, py - 7, 3, 1, 'roofR0'); rect(x, px - 8, py - 6, 1, 2, 'roofR0');
    }
    function armchair(x, ax, ay) {
      const rose = { o: 'roofR3', ol: 'roofR2', h: 'roofR0', b: 'roofR1', s: 'roofR2' };
      ellipse(x, ax + 4, ay - 1, 19, 3, X.shade);
      for (const lx of [ax - 15, ax + 13]) { rect(x, lx, ay - 5, 3, 5, 'wood4'); rect(x, lx + 1, ay - 5, 1, 4, 'wood2'); }
      // arched back with wings
      const back = mask(30, 26, g => { ellipse(g, 7, 7, 7, 7, '#000'); ellipse(g, 22, 7, 7, 7, '#000'); rect(g, 7, 1, 16, 8, '#000'); rect(g, 0, 7, 30, 19, '#000'); });
      x.drawImage(bevel(back, rose, 1, 2), ax - 15, ay - 38);
      for (const [dx, dy] of [[-7, -31], [0, -32], [7, -31], [-4, -26], [4, -26]]) { dot(x, ax + dx, ay + dy, 'roofR3'); dot(x, ax + dx - 1, ay + dy - 1, 'roofR0'); }
      // seat cushion
      const seat = mask(22, 8, g => rect(g, 0, 0, 22, 8, '#000'));
      x.drawImage(bevel(seat, { o: 'roofR3', ol: 'roofR2', h: 'dusk1', b: 'roofR0', s: 'roofR1' }, 1, 1), ax - 11, ay - 20);
      // a cream pillow leaning on the back
      const pil = mask(10, 7, g => { rect(g, 1, 0, 8, 7, '#000'); rect(g, 0, 1, 10, 5, '#000'); });
      x.drawImage(bevel(pil, { o: 'cream2', ol: 'cream2', h: 'white', b: 'cream0', s: 'cream1' }, 1, 1), ax - 9, ay - 25);
      rect(x, ax - 6, ay - 22, 4, 1, X.sg2); rect(x, ax - 5, ay - 23, 2, 3, X.sg2);
      // rolled arms
      const arm = mask(9, 19, g => { ellipse(g, 4, 4, 4, 4, '#000'); rect(g, 0, 4, 9, 15, '#000'); });
      const armC = bevel(arm, rose, 1, 2);
      x.drawImage(armC, ax - 18, ay - 23); x.drawImage(armC, ax + 9, ay - 23);
      for (const sx of [ax - 14, ax + 13]) { rect(x, sx - 1, ay - 20, 3, 1, 'roofR2'); dot(x, sx, ay - 21, 'roofR2'); }
      // skirt
      const sk = mask(36, 6, g => rect(g, 0, 0, 36, 6, '#000'));
      x.drawImage(bevel(sk, { o: 'roofR3', ol: 'roofR3', h: 'roofR1', b: 'roofR2', s: 'roofR3' }, 1, 1), ax - 18, ay - 10);
      for (let k = ax - 16; k < ax + 17; k += 4) dot(x, k, ay - 6, 'roofR3');
    }
    function sideTable(x, tx, ty) {
      shadowRect(x, tx - 8, ty - 3, 16, 3);
      rect(x, tx - 8, ty - 16, 17, 4, 'wood4'); rect(x, tx - 7, ty - 16, 15, 2, 'wood1'); rect(x, tx - 7, ty - 14, 15, 1, 'wood2'); dot(x, tx - 6, ty - 16, 'wood0');
      rect(x, tx - 1, ty - 12, 3, 10, 'wood4'); rect(x, tx, ty - 12, 1, 9, 'wood2');
      rect(x, tx - 4, ty - 3, 9, 3, 'wood4'); rect(x, tx - 3, ty - 3, 7, 1, 'wood2');
      // teapot: round body, lid and knob, spout to the left, loop handle to the right
      const tpm = mask(15, 11, g => { ellipse(g, 7, 7, 4, 3, '#000'); rect(g, 5, 2, 5, 2, '#000'); rect(g, 6, 1, 3, 1, '#000'); line(g, 3, 7, 0, 3, '#000'); line(g, 3, 8, 1, 4, '#000'); rect(g, 11, 5, 3, 1, '#000'); rect(g, 13, 5, 1, 4, '#000'); rect(g, 11, 8, 3, 1, '#000'); });
      x.drawImage(bevel(tpm, { o: 'roofG4', ol: 'roofG3', h: 'roofG0', b: 'roofG1', s: 'roofG2' }, 1, 1), tx - 11, ty - 26);
      rect(x, tx - 6, ty - 23, 5, 1, 'roofG3'); dot(x, tx - 4, ty - 26, 'roofG0');
      x.drawImage(S(`
        oooo.
        occoo
        occo.
        .oo..`, { o: 'roofR3', c: 'cream0' }), tx + 4, ty - 20);
    }
    function floorLamp(x, lx, ly) {
      ellipse(x, lx + 3, ly - 1, 6, 2, X.shade);
      ellipse(x, lx, ly - 38, 12, 11, X.glow); ellipse(x, lx, ly - 38, 8, 7, X.glow2);
      rect(x, lx - 4, ly - 3, 9, 3, 'brass4'); rect(x, lx - 3, ly - 3, 7, 1, 'brass1'); rect(x, lx - 3, ly - 2, 7, 1, 'brass2');
      rect(x, lx - 1, ly - 36, 2, 33, 'brass3'); rect(x, lx - 1, ly - 36, 1, 33, 'brass1');
      rect(x, lx - 2, ly - 22, 4, 2, 'brass2'); dot(x, lx - 2, ly - 22, 'brass0');
      // fabric shade (trapezoid) with a scalloped rose trim
      poly(x, [[lx - 5, ly - 49], [lx + 6, ly - 49], [lx + 9, ly - 38], [lx - 8, ly - 38]], 'wood3');
      poly(x, [[lx - 4, ly - 48], [lx + 5, ly - 48], [lx + 8, ly - 39], [lx - 7, ly - 39]], 'cream0');
      poly(x, [[lx + 2, ly - 48], [lx + 5, ly - 48], [lx + 8, ly - 39], [lx + 3, ly - 39]], 'cream1');
      rect(x, lx - 7, ly - 39, 16, 2, 'roofR1'); for (let k = lx - 7; k < lx + 9; k += 2) dot(x, k, ly - 37, 'roofR1');
      rect(x, lx - 4, ly - 45, 9, 1, 'rose');
      rect(x, lx - 1, ly - 37, 2, 2, 'light1');
    }
    function bookPile(x, bx, by) {
      shadowRect(x, bx - 8, by - 3, 16, 3);
      const b = [[18, 'teal'], [16, 'rose'], [14, 'mustard']];
      b.forEach(([w, r], k) => { const [hl, bs, , ol] = R[r].map(C), y = by - 5 - k * 4, x0 = bx - (w >> 1) + (k % 2 ? 1 : -1);
        rect(x, x0, y, w, 5, ol); rect(x, x0 + 1, y + 1, w - 2, 3, bs); rect(x, x0 + 1, y + 1, w - 2, 1, hl); rect(x, x0 + w - 4, y + 1, 3, 3, 'cream0'); rect(x, x0 + w - 4, y + 2, 3, 1, 'cream2'); });
    }
    function coatStand(x, cx, cy) {
      ellipse(x, cx + 3, cy - 1, 8, 2, X.shade);
      line(x, cx - 1, cy - 7, cx - 6, cy - 1, 'wood4'); line(x, cx + 1, cy - 7, cx + 6, cy - 1, 'wood4'); rect(x, cx - 7, cy - 1, 3, 1, 'wood4'); rect(x, cx + 5, cy - 1, 3, 1, 'wood4');
      rect(x, cx - 1, cy - 50, 3, 45, 'wood4'); rect(x, cx, cy - 50, 1, 45, 'wood2');
      rect(x, cx - 2, cy - 53, 5, 3, 'wood4'); rect(x, cx - 1, cy - 53, 3, 2, 'wood1');
      // hooks
      for (const [hx, dir] of [[cx - 3, -1], [cx + 3, 1]]) { dot(x, hx, cy - 48, 'brass3'); dot(x, hx + dir, cy - 49, 'brass3'); }
      // straw hat with a teal band on the left hook
      ellipse(x, cx - 6, cy - 45, 7, 2, 'dirt3'); ellipse(x, cx - 6, cy - 45, 6, 1, 'dirt1');
      rect(x, cx - 9, cy - 50, 7, 5, 'dirt3'); rect(x, cx - 8, cy - 50, 5, 4, 'dirt1'); rect(x, cx - 8, cy - 47, 5, 1, 'roofG2'); dot(x, cx - 8, cy - 50, 'dirt0');
      // striped scarf over the right hook
      for (let j = 0; j < 22; j++) { const c = (j >> 1) % 3 === 0 ? 'cream0' : (j >> 1) % 3 === 1 ? 'roofR1' : 'roofR2'; rect(x, cx + 2, cy - 48 + j, 3, 1, c); if (j < 16) rect(x, cx + 5, cy - 47 + j, 2, 1, c); }
      rect(x, cx + 1, cy - 48, 1, 22, 'roofR3'); rect(x, cx + 7, cy - 47, 1, 16, 'roofR3');
      for (let k = 0; k < 3; k++) dot(x, cx + 2 + k, cy - 26, 'cream1');
    }
    function umbrellaStand(x, ux, uy) {
      shadowRect(x, ux - 5, uy - 2, 11, 3);
      // umbrellas: a rose one and a teal one with crook handles
      rect(x, ux - 3, uy - 24, 1, 12, 'wood4'); rect(x, ux - 4, uy - 26, 3, 2, 'wood4'); dot(x, ux - 5, uy - 25, 'wood4');
      poly(x, [[ux - 5, uy - 12], [ux - 1, uy - 12], [ux - 2, uy - 21], [ux - 3, uy - 23]], 'roofR3'); poly(x, [[ux - 4, uy - 12], [ux - 2, uy - 12], [ux - 2, uy - 20], [ux - 3, uy - 22]], 'roofR1');
      rect(x, ux + 2, uy - 22, 1, 10, 'wood4'); rect(x, ux + 2, uy - 23, 3, 1, 'wood4'); dot(x, ux + 4, uy - 22, 'wood4');
      poly(x, [[ux + 1, uy - 12], [ux + 5, uy - 12], [ux + 3, uy - 19]], 'roofG3'); poly(x, [[ux + 2, uy - 12], [ux + 4, uy - 12], [ux + 3, uy - 17]], 'roofG1');
      // blue and white ceramic stand
      const m = mask(11, 13, g => rect(g, 0, 0, 11, 13, '#000'));
      x.drawImage(bevel(m, { o: 'roofB3', ol: 'roofB2', h: 'white', b: 'cream0', s: 'stone1' }, 1, 2), ux - 5, uy - 13);
      rect(x, ux - 4, uy - 10, 9, 1, 'roofB2'); rect(x, ux - 4, uy - 4, 9, 1, 'roofB2');
      for (const k of [-3, 0, 3]) { dot(x, ux + k, uy - 8, 'roofB1'); dot(x, ux + k + 1, uy - 7, 'roofB1'); dot(x, ux + k, uy - 6, 'roofB1'); }
    }
    function gramophone(x, gx, gy) {
      shadowRect(x, gx - 16, gy - 3, 30, 4);
      // cabinet
      const cm = mask(30, 18, g => rect(g, 0, 0, 30, 18, '#000'));
      x.drawImage(bevel(cm, { o: 'wood4', ol: 'wood3', h: 'wood1', b: 'wood2', s: 'wood3' }, 1, 1), gx - 15, gy - 18);
      rect(x, gx - 14, gy - 17, 28, 3, 'wood0');
      rect(x, gx - 12, gy - 12, 11, 8, 'wood3'); rect(x, gx - 11, gy - 11, 9, 6, 'wood1'); dot(x, gx - 3, gy - 8, 'brass1');
      rect(x, gx + 1, gy - 12, 11, 8, 'wood3'); rect(x, gx + 2, gy - 11, 9, 6, 'wood1'); dot(x, gx + 3, gy - 8, 'brass1');
      rect(x, gx - 14, gy - 2, 3, 2, 'wood4'); rect(x, gx + 11, gy - 2, 3, 2, 'wood4');
      // turntable box and record
      rect(x, gx - 11, gy - 24, 22, 7, 'wood4'); rect(x, gx - 10, gy - 23, 20, 5, 'wood2'); rect(x, gx - 10, gy - 23, 20, 1, 'wood1');
      ellipse(x, gx - 2, gy - 24, 8, 2, 'ink2'); ellipse(x, gx - 2, gy - 24, 3, 1, 'rose');
      // crank
      rect(x, gx + 10, gy - 21, 4, 1, 'iron2'); rect(x, gx + 13, gy - 23, 1, 3, 'iron2');
      // brass horn: a tube rising from the tone arm, flaring into a big bell that faces the room
      const nx = gx + 5, ny = gy - 27, mx = gx + 13, my = gy - 41;
      rect(x, nx - 1, ny - 1, 3, 3, 'brass4'); dot(x, nx, ny, 'brass1');
      // cone from the neck to the bell, widening along the axis (world coords, shifted into a mask)
      const ox = gx - 8, oy = gy - 52, ax = mx - nx, ay = my - ny, al = Math.hypot(ax, ay), px = -ay / al, py = ax / al;
      const cone = [[nx - px * 1.5, ny - py * 1.5], [nx + px * 1.5, ny + py * 1.5], [mx + px * 8, my + py * 8], [mx - px * 8, my - py * 8]];
      const hm = mask(30, 30, g => poly(g, cone.map(([a, b2]) => [a - ox, b2 - oy]), '#000'));
      x.drawImage(bevel(hm, { o: 'brass4', ol: 'brass3', h: 'brass0', b: 'brass1', s: 'brass2' }, 1, 1), ox, oy);
      // bell mouth: petal rim and a deep throat
      disc(x, mx + 0.5, my + 0.5, 9, (d, lit, dx, dy) => d > 8.2 ? 'brass4' : d > 6.2 ? (lit > 0.3 ? 'brass0' : lit > -0.4 ? 'brass1' : 'brass2') : d > 4 ? 'brass2' : d > 2 ? 'brass3' : 'brass4');
      for (let a = 0; a < 6; a++) { const s = Math.sin(a * 1.047), c = Math.cos(a * 1.047); line(x, mx + s * 4.5, my + c * 4.5, mx + s * 7.5, my + c * 7.5, 'brass3'); }
      dot(x, mx - 4, my - 5, 'white'); dot(x, mx - 5, my - 4, 'brass0');
    }
    function floorGlobe(x, gx, gy) {
      shadowRect(x, gx - 6, gy - 2, 12, 3);
      rect(x, gx - 5, gy - 2, 11, 2, 'wood4'); rect(x, gx - 4, gy - 2, 9, 1, 'wood2');
      rect(x, gx, gy - 8, 1, 6, 'wood3');
      disc(x, gx + 0.5, gy - 16.5, 8, (d, lit) => d > 7 ? 'water5' : lit > 0.5 ? 'water1' : lit > -0.2 ? 'water2' : 'water3');
      // continents
      poly(x, [[gx - 4, gy - 21], [gx + 1, gy - 22], [gx + 2, gy - 18], [gx - 2, gy - 15], [gx - 5, gy - 17]], 'leaf2');
      poly(x, [[gx + 3, gy - 14], [gx + 6, gy - 15], [gx + 5, gy - 11], [gx + 2, gy - 11]], 'leaf3');
      rect(x, gx - 4, gy - 21, 2, 1, 'leaf1');
      // brass meridian
      for (let a = -2.3; a < 2.4; a += 0.08) dot(x, gx + Math.round(Math.sin(a) * 9.5), gy - 16 - Math.round(Math.cos(a) * 9.5), 'brass2');
    }
    function trunks(x, tx, ty) {
      shadowRect(x, tx, ty - 3, 50, 4);
      // big trunk
      const bm = mask(48, 18, g => rect(g, 0, 0, 48, 18, '#000'));
      x.drawImage(bevel(bm, { o: 'roofB4', ol: 'roofB3', h: 'roofB1', b: 'roofB2', s: 'roofB3' }, 1, 2), tx, ty - 18);
      rect(x, tx + 1, ty - 17, 46, 4, 'roofB1'); rect(x, tx + 1, ty - 13, 46, 1, 'roofB3');
      for (const sx of [tx + 9, tx + 35]) { rect(x, sx, ty - 17, 4, 17, 'wood3'); rect(x, sx, ty - 17, 1, 17, 'wood2'); }
      for (const [cx, cy] of [[tx, ty - 18], [tx + 44, ty - 18], [tx, ty - 4], [tx + 44, ty - 4]]) { rect(x, cx, cy, 4, 4, 'brass3'); rect(x, cx + 1, cy + 1, 2, 2, 'brass1'); }
      rect(x, tx + 21, ty - 13, 6, 5, 'brass3'); rect(x, tx + 22, ty - 12, 4, 3, 'brass1'); dot(x, tx + 24, ty - 11, 'brass4');
      // small case on top
      const sm = mask(30, 11, g => rect(g, 0, 0, 30, 11, '#000'));
      x.drawImage(bevel(sm, { o: 'wood4', ol: 'wood3', h: 'wood1', b: 'wood2', s: 'wood3' }, 1, 1), tx + 6, ty - 29);
      rect(x, tx + 7, ty - 28, 28, 2, 'wood1');
      rect(x, tx + 17, ty - 32, 9, 3, 'wood4'); rect(x, tx + 18, ty - 31, 7, 2, 'wood2'); x.clearRect(tx + 19, ty - 31, 5, 1);
      rect(x, tx + 12, ty - 26, 2, 3, 'brass2'); rect(x, tx + 29, ty - 26, 2, 3, 'brass2');
      // hatbox
      disc(x, tx + 43.5, ty - 24.5, 6, (d, lit, dx, dy) => dy < -2 ? (d > 5 ? 'roofR3' : 'roofR0') : d > 5 ? 'roofR3' : lit > 0.2 ? 'pink' : 'roofR1');
      rect(x, tx + 37, ty - 22, 13, 1, 'cream0');
    }
    function mapBasket(x, bx, by) {
      shadowRect(x, bx - 6, by - 2, 13, 3);
      // rolled maps sticking out
      for (const [dx, h, c] of [[-4, 17, 'cream1'], [-1, 20, 'dirt1'], [2, 15, 'cream0'], [4, 18, 'cream1']]) { rect(x, bx + dx, by - h, 3, h, 'wood3'); rect(x, bx + dx, by - h + 1, 2, h - 1, c); dot(x, bx + dx, by - h, 'dirt2'); }
      line(x, bx - 1, by - 18, bx - 1, by - 14, 'rose');
      // wicker basket
      rect(x, bx - 6, by - 10, 13, 10, 'wood4');
      for (let j = by - 9; j < by - 1; j += 2) { rect(x, bx - 5, j, 11, 1, 'wood1'); rect(x, bx - 5, j + 1, 11, 1, 'wood2'); }
      for (let i = bx - 4; i < bx + 6; i += 3) rect(x, i, by - 9, 1, 8, 'wood3');
      rect(x, bx - 6, by - 11, 13, 2, 'wood2'); rect(x, bx - 6, by - 11, 13, 1, 'wood1');
    }

    /* ---------- dynamic pieces */
    // sleeping cat on the left bookcase (2 breathing frames)
    const catKey = { o: 'stone4', a: 'stone0', b: 'stone1', c: 'stone2', d: 'stone3', m: 'cream0', p: 'pink', e: 'ink2' };
    // curled up, head on the paws, tail wrapped along the front; B lowers the back one pixel (breathing)
    const catA = S(`
      ..o...o............
      .opo.opo..ooooo....
      .obbbbbo.oaaaabbo..
      obbbbbbbooaabbcbbo.
      obebbbebbabbcbbcbbo
      obmmpmmbbbbbcbbbcbo
      .ommmmmobbbbbbbbbbo
      oaacccccaaabbbbbbco
      occcccccccccccccco.
      .ooooooooooooooooo.`, catKey);
    const catB = S(`
      ..o...o............
      .opo.opo...........
      .obbbbbo..ooooo....
      obbbbbbbooaaaabboo.
      obebbbebbabbcbbcbbo
      obmmpmmbbbbbcbbbcbo
      .ommmmmobbbbbbbbbbo
      oaacccccaaabbbbbbco
      occcccccccccccccco.
      .ooooooooooooooooo.`, catKey);
    const lanternImgs = {};
    // Hanging lantern, 11x16. level 0 = unlit (cool dark glass), 1..3 = dim..bright; frame = flicker step.
    function lanternImg(level, frame) {
      const k = level + ':' + frame;
      if (lanternImgs[k]) return lanternImgs[k];
      const glass = level === 0 ? { g: 'stone3', h: 'stone2', F: 'stone4', W: 'stone1' } : level === 1 ? { g: 'light3', h: 'light2', F: 'light4', W: 'light1' }
        : level === 2 ? { g: 'light2', h: 'light1', F: 'light3', W: 'light0' } : { g: 'light1', h: 'light0', F: frame ? 'light3' : 'light2', W: 'white' };
      const glassRows = level === 0 ? ['.oggWhgggo.', '.ogWhggggo.', '.ogWgggggo.', '.oggggFggo.', '.ogggggggo.']
        : frame ? ['.oghhhWhgo.', '.oghhFFhgo.', '.oghFFFhgo.', '.ogghFhhgo.', '.ogghhhggo.']
        : ['.oghhWhhgo.', '.oghhFhhgo.', '.oghFFFhgo.', '.oghFFFhgo.', '.ogghhhggo.'];
      const rows = [
        '....ooo....',
        '....o.o....',
        '...ooooo...',
        '..oaabbco..',
        '.oaabbbcco.',
        'ooooooooooo',
        ...glassRows,
        'ooooooooooo',
        '..oabbbdo..',
        '...ooooo...',
        '....odo....',
        '.....o.....'];
      return (lanternImgs[k] = sprite(rows, { o: 'brass4', a: 'brass0', b: 'brass1', c: 'brass2', d: 'brass3', ...glass }));
    }
    const prevLit = new Array(7).fill(0), offAt = new Array(7).fill(-99);

    function draw(g, view, actors) {
      const st = view.state || {}, still = !!st.still, t = still ? 0 : view.t;
      const lan = st.lanterns || [1, 1, 1, 1, 1, 1, 1], keep = st.keepsakes || [0, 0, 0, 0, 0, 0, 0];
      const hi = st.highlight == null ? -1 : st.highlight, mins = st.clockMin == null ? 1097 : st.clockMin;

      // window sky: bands, drifting clouds, rooftops
      g.drawImage(sky, SKX, SKY);
      g.save(); g.beginPath(); g.rect(SKX, SKY, SKW, SKH); g.clip();
      for (const [cx, cy, w] of clouds) { const span = SKW + 40, px = Math.round(((cx + t * (1.2 + w / 30)) % span + span) % span) - 30; cloud(g, SKX + px, SKY + cy, w); }
      g.restore();
      g.drawImage(roofs, SKX, SKY);
      g.drawImage(bgA, 0, 0);

      // lantern light pools on the wall (stepped, hard-edged; clipped away from the window glass)
      g.save(); g.clip(poolClip, 'evenodd');
      for (let i = 0; i < 7; i++) {
        const v = Math.max(0, Math.min(1, +lan[i] || 0));
        if (v <= 0.02) continue;
        const f = still ? 0 : Math.floor(hash(step(t, 6) * 7 + i * 131) * 3) - 1;
        const s = 0.45 + 0.55 * v, lx = LX(i);
        ellipse(g, lx, LY, Math.round(25 * s) + f, Math.round(22 * s) + f, X.glow);
        ellipse(g, lx, LY, Math.round(17 * s) + (f > 0 ? 1 : 0), Math.round(15 * s), X.glow);
        ellipse(g, lx, LY, Math.round(10 * s), Math.round(9 * s), X.glow2);
      }
      g.restore();
      g.drawImage(bg, 0, 0);

      // pendulum (keeps swinging though the hands are stopped)
      const pf = still ? 0 : Math.sin((step(t, 10) / 10) * Math.PI);
      const px0 = CX, py0 = CY + 20, L = 17, ang = 0.32 * pf;
      const bxp = Math.round(px0 + Math.sin(ang) * L), byp = Math.round(py0 + Math.cos(ang) * L);
      line(g, px0, py0, bxp, byp - 3, 'brass3');
      disc(g, bxp + 0.5, byp + 0.5, 3.6, (d, lit) => d > 2.8 ? 'brass4' : lit > 0.4 ? 'brass0' : lit > -0.3 ? 'brass1' : 'brass2');
      rect(g, CX - 7, CY + 21, 1, 6, X.glint); rect(g, CX - 6, CY + 21, 1, 3, X.glint);
      // clock hands from state.clockMin (Bresenham lines)
      const m = ((mins % 1440) + 1440) % 1440, am = (m % 60) / 60 * Math.PI * 2, ah = ((m / 60) % 12) / 12 * Math.PI * 2;
      const hx = CX + Math.round(Math.sin(ah) * 7), hy = CY - Math.round(Math.cos(ah) * 7), mx = CX + Math.round(Math.sin(am) * 11), my = CY - Math.round(Math.cos(am) * 11);
      line(g, CX, CY, hx, hy, 'ink2'); line(g, CX + (Math.abs(Math.cos(ah)) > 0.5 ? 1 : 0), CY + (Math.abs(Math.cos(ah)) > 0.5 ? 0 : 1), hx, hy, 'ink2');
      line(g, CX, CY, mx, my, 'ink2');
      rect(g, CX - 1, CY - 1, 3, 3, 'brass3'); dot(g, CX, CY, 'brass0');

      // sleeping cat breathing on the left bookcase
      g.drawImage(step(t, 1.25) % 2 ? catB : catA, 52, 44);

      // keepsakes on the beam shelf
      const names = [['watch'], ['doll'], ['camera'], ['key'], ['shoes'], ['book'], ['letter', 'musicbox']];
      for (let i = 0; i < 7; i++) {
        const sx = LX(i);
        if (i === hi) {
          const pulse = still ? 1 : step(t, 4) % 4;
          ellipse(g, sx, SHELF - 7, 10 + (pulse === 2 ? 1 : 0), 9, X.glow2);
        }
        if (!keep[i]) continue;
        const set = names[i];
        if (set.length === 1) { const im = item(set[0], 'sm'); g.drawImage(im, sx - (im.width >> 1), SHELF - im.height); }
        else { const mb = item('musicbox', 'sm', 'closed'), le = item('letter', 'sm'); g.drawImage(mb, sx - mb.width + 4, SHELF - mb.height); g.drawImage(le, sx - 3, SHELF - le.height); }
        if (i === hi) {
          const ph = still ? 1 : step(t, 6) % 6, gx = sx + 6, gy = SHELF - 15;
          const r = ph < 3 ? ph + 1 : 5 - ph;
          rect(g, gx - r, gy, 2 * r + 1, 1, 'white'); rect(g, gx, gy - r, 1, 2 * r + 1, 'white'); dot(g, gx, gy, 'light1');
        }
      }

      // lanterns, flicker and smoke wisps
      for (let i = 0; i < 7; i++) {
        const v = Math.max(0, Math.min(1, +lan[i] || 0)), lx = LX(i);
        if (v > 0.02) { prevLit[i] = 1; offAt[i] = -99; }
        else if (prevLit[i]) { prevLit[i] = 0; offAt[i] = view.t; }
        const level = v <= 0.02 ? 0 : v < 0.4 ? 1 : v < 0.75 ? 2 : 3;
        const fr = still || !level ? 0 : (hash(step(t, 8) + i * 17) > 0.5 ? 1 : 0);
        dot(g, lx, 32, 'iron3');
        g.drawImage(lanternImg(level, fr), lx - 5, 33);
        // thin smoke wisp for a few seconds after a lantern goes out
        const age = view.t - offAt[i];
        if (!still && age >= 0 && age < 2.8) {
          const q = step(age, 10) / 28;                 // stepped at 10 fps
          for (let k = 0; k < 5; k++) {
            const p = q * 1.3 - k * 0.14; if (p < 0 || p > 1) continue;   // staggered puffs rising from the cap
            const yy = Math.round(33 - p * 26), xx = lx + Math.round(Math.sin(p * 5 + k * 1.3) * (0.5 + p * 3)), al = (1 - p) * 0.9;
            rect(g, xx, yy, 2, 2, `rgba(238,236,246,${al.toFixed(2)})`);
            if (p > 0.25) dot(g, xx + (k % 2 ? 2 : -1), yy - 1, `rgba(214,212,230,${(al * 0.8).toFixed(2)})`);
          }
        }
      }

      // dust motes drifting in the window light above the floor patches
      if (!still) for (let k = 0; k < 10; k++) {
        const wx = WINS[k % 2][0], sp = 2 + hash(k * 7) * 3, ph = hash(k * 13) * 34;
        const yy = FY - 10 + ((ph + t * sp) % 34), xx = wx + 8 + hash(k * 29) * 30 + (yy - FY) * 0.5 + Math.sin(t * 0.7 + k * 1.7) * 2;
        dot(g, Math.round(xx), Math.round(yy), k % 3 ? 'light0' : 'white');
      }

      drawSorted(g, props, actors, t);
    }

    return { w: W, h: H, bg: P.wall2, anchors, hotspots: {}, paths: {}, draw };
  }

  /* ---------------------------------------------------------------- shop trinkets (shelf dressing) */
  function shopTrinkets() {
    const book = (w, h, r, band = 'brass1') => {
      const [c, x] = canvas(w, h), [hl, bs, sh, ol] = R[r].map(C);
      rect(x, 0, 0, w, h, ol); rect(x, 1, 1, w - 2, h - 1, bs); rect(x, 1, 1, 1, h - 1, hl); if (w > 3) rect(x, w - 2, 1, 1, h - 1, sh);
      if (band) { rect(x, 1, 2, w - 2, 1, band); rect(x, 1, h - 3, w - 2, 1, band); }
      if (w >= 5 && h >= 10) rect(x, 2, (h >> 1) - 1, w - 4, 2, 'cream0');
      return c;
    };
    const stack = (specs) => { // horizontal books, bottom first
      const w = Math.max(...specs.map(s => s[0])), h = specs.length * 3 + 1, [c, x] = canvas(w, h);
      let y = h;
      for (const [bw, r] of specs) { const [hl, bs, , ol] = R[r].map(C); y -= 3; rect(x, 0, y, bw, 4, ol); rect(x, 1, y + 1, bw - 2, 2, bs); rect(x, 1, y + 1, bw - 2, 1, hl); rect(x, bw - 3, y + 1, 1, 2, 'cream1'); }
      return c;
    };
    const jar = S(`
      ..oooo..
      .obbbbo.
      .oooooo.
      oWggggGo
      oWrrgyGo
      oWrryyGo
      ogbbgrGo
      ogbbrrGo
      .oggggo.
      ..oooo..`, { o: 'water4', b: 'brass1', W: 'white', g: 'water1', G: 'water2', r: 'rose', y: 'yellow' });
    const jar2 = S(`
      .oooo.
      obbbbo
      oooooo
      oWggGo
      oWyyGo
      oyyyGo
      oWggGo
      .oooo.`, { o: 'cap3', b: 'wood2', W: 'white', g: 'cap0', G: 'cap1', y: 'orange' });
    const bottle = S(`
      ..ww..
      ..oo..
      ..oo..
      .oWGo.
      oWggGo
      oWgggo
      oWgggo
      ogggGo
      ogggGo
      .oooo.`, { o: 'roofB3', w: 'wood2', W: 'white', g: 'roofB1', G: 'roofB0' });
    const flask = S(`
      ..ww..
      ..oo..
      ..oo..
      .oWGo.
      oWggGo
      oggggo
      oggggo
      .oooo.`, { o: 'roofR3', w: 'wood2', W: 'white', g: 'rose', G: 'pink' });
    const tallBottle = S(`
      .w.
      .o.
      oGo
      oGo
      oWo
      oWo
      oWo
      ogo
      ogo
      ooo`, { o: 'cap4', w: 'wood3', W: 'cap0', g: 'cap2', G: 'cap1' });
    const teddy = S(`
      .oo...oo.
      oaao.oaao
      oabbobbco
      .obbbbbo.
      .obebebo.
      .obbmmbo.
      oobbbbboo
      oabbbbbco
      oabbccbco
      .obbccbo.
      oabo.obco
      .oo...oo.`, { o: 'wood4', a: 'wood1', b: 'wood2', c: 'wood3', e: 'ink', m: 'cream1' });
    const frameA = S(`
      ooooooooo
      obbbbbbbo
      obsssssbo
      obsssssbo
      obsyyssbo
      obgggggbo
      obGGgggbo
      obbbbbbbo
      ooooooooo`, { o: 'wood4', b: 'brass1', s: 'sky2', y: 'yellow', g: 'grass2', G: 'grass3' });
    const plant = S(`
      ..o.oo..
      .oaoaao.
      oaabaabo
      obbabbco
      .obbbco.
      ..oooo..
      .orrrro.
      .oRrrro.
      ..oRro..
      ..oooo..`, { o: 'leaf5', a: 'leaf1', b: 'leaf2', c: 'leaf3', r: 'roofR1', R: 'roofR0' });
    const cactus = S(`
      ..o..
      .oao.
      oaabo
      oabbo
      oabbo
      .ooo.
      orrro
      .ooo.`, { o: 'leaf5', a: 'leaf1', b: 'leaf2', r: 'roofR1' });
    const globe = S(`
      ...ooo...
      .ooWggo..
      oWWggGGo.
      oWggBBGGo
      oggBBGGGo
      oGGGGBBGo
      .oGGGGGo.
      ..ooooo..
      ....o....
      ...ooo...
      ..obbbo..`, { o: 'water5', W: 'water1', g: 'water2', G: 'water3', B: 'leaf2', b: 'brass2' });
    const box = S(`
      oooooooo
      oaaaaaao
      obbbbbbo
      obbbybbo
      obbbbbbo
      oooooooo`, { o: 'wood4', a: 'wood1', b: 'wood2', y: 'brass1' });
    const box2 = S(`
      oooooo
      oaaaao
      obbbbo
      obbybo
      oooooo`, { o: 'roofG4', a: 'roofG1', b: 'roofG2', y: 'brass1' });
    const hourglass = S(`
      ooooo
      .oWo.
      .ogo.
      ..o..
      .oyo.
      .yyy.
      ooooo`, { o: 'wood3', W: 'white', g: 'sky1', y: 'dirt1' });
    const candle = S(`
      .y.
      .o.
      oco
      oWo
      oWo
      oWo
      bbb`, { y: 'light3', o: 'cream2', c: 'cream0', W: 'cream0', b: 'brass2' });
    const shell = S(`
      .ooo.
      oaabo
      obbbo
      .ooo.`, { o: 'roofR2', a: 'white', b: 'pink' });
    const cup = S(`
      oooooo
      ocWcco
      occcoo
      .oooo.`, { o: 'roofB3', c: 'cream0', W: 'white' });
    const vase = S(`
      .p.y.
      pop.y
      .oGo.
      ..o..
      .ooo.
      oabbo
      oabbo
      .ooo.`, { p: 'pink', y: 'yellow', o: 'leaf4', G: 'leaf2', a: 'sky2', b: 'sky3' });
    const clock = S(`
      .oooooo.
      oaaaaaao
      oawwwwbo
      oawkwwbo
      oawkkwbo
      oawwwwbo
      oaaaaabo
      oooooooo`, { o: 'wood4', a: 'wood1', b: 'wood2', w: 'cream0', k: 'ink2' });
    const ship = S(`
      ..oooooooooo
      .ossssssssso
      oossssWsssso
      osssWWWWsssoo
      ossWRRRRWssoo
      .ossssssssso
      ..oooooooooo`, { o: 'water3', s: 'water0', W: 'white', R: 'wood2' });

    const sillA = S(`
      ..p.y..
      .pppyy.
      ..pgy..
      .o.g.o.
      ..ggg..
      .ooooo.
      .orrro.
      ..ooo..`, { p: 'pink', y: 'yellow', g: 'leaf2', o: 'roofR3', r: 'roofR1' });
    const sillB = S(`
      ..a.a..
      .aabaa.
      .abbba.
      ..bgb..
      .ooooo.
      .orrro.
      ..ooo..`, { a: 'leaf1', b: 'leaf2', g: 'leaf3', o: 'roofB3', r: 'roofB1' });
    return {
      sillA, sillB,
      left: [
        [[book(4, 11, 'rose'), 1], [book(5, 12, 'teal'), 5], [book(3, 10, 'mustard'), 10], [book(4, 12, 'blue'), 13], [book(4, 11, 'cream', 'wood2'), 17], [globe, 26], [jar, 38], [book(4, 10, 'green'), 50], [book(5, 12, 'lilac'), 54], [book(3, 11, 'red'), 59], [candle, 66]],
        [[frameA, 2], [teddy, 13], [stack([[16, 'rose'], [14, 'teal'], [15, 'mustard']]), 25], [plant, 44], [flask, 55], [tallBottle, 63], [shell, 68]],
        [[bottle, 2], [flask, 8], [jar2, 16], [hourglass, 25], [box, 32], [box2, 33, -6], [book(4, 12, 'blue'), 44], [book(5, 11, 'rose'), 48], [book(4, 12, 'mustard'), 53], [book(3, 10, 'teal'), 57], [cup, 63]],
        [[stack([[20, 'lilac'], [18, 'green'], [21, 'blue']]), 2], [cactus, 25], [book(6, 12, 'red'), 33], [book(5, 11, 'cream', 'wood2'), 39], [book(4, 12, 'teal'), 44], [jar, 51], [vase, 61]],
      ],
      right: [
        [[clock, 2], [book(4, 12, 'teal'), 13], [book(4, 11, 'rose'), 17], [book(5, 12, 'mustard'), 21], [book(3, 10, 'blue'), 26], [ship, 32], [plant, 47], [book(4, 11, 'lilac'), 57], [book(5, 12, 'green'), 61], [shell, 68]],
        [[stack([[18, 'teal'], [16, 'rose']]), 1], [jar2, 22], [bottle, 30], [tallBottle, 36], [frameA, 43], [cup, 55], [candle, 64]],
        [[teddy, 2], [book(4, 12, 'rose'), 13], [book(5, 11, 'blue'), 17], [book(4, 12, 'cream', 'wood2'), 22], [book(3, 10, 'mustard'), 26], [globe, 32], [box, 44], [box2, 45, -6], [flask, 55], [vase, 63]],
        [[box, 2], [book(6, 12, 'teal'), 12], [book(5, 11, 'rose'), 18], [stack([[20, 'mustard'], [18, 'blue'], [19, 'red']]), 25], [hourglass, 48], [cactus, 56], [jar, 63]],
      ],
    };
  }

  /* ================================================================ SMALL ITEMS (12-16 px, hand-authored) */
  const BR = { o: 'brass4', a: 'brass0', b: 'brass1', c: 'brass2', d: 'brass3' };
  SM.watch = (v = 'front') => {
    if (v === 'side') return S(`
      .ooo.
      o...o
      .ooo.
      .obo.
      .ooo.
      .oao.
      oabco
      oabco
      oabdo
      oabdo
      oabdo
      oabdo
      oabdo
      oacdo
      .ocd.
      .ooo.`, BR);
    const [c, x] = canvas(13, 16);
    disc(x, 6.5, 9.5, 6.5, (d, lit) => d > 5.6 ? 'brass4' : v === 'back' ? (d > 3.9 && d < 4.8 ? 'brass3' : lit > 0.45 ? 'brass0' : lit > -0.25 ? 'brass1' : 'brass2')
      : d > 4.4 ? (lit > 0.5 ? 'brass0' : lit > 0 ? 'brass1' : lit > -0.5 ? 'brass2' : 'brass3') : d > 3.7 ? 'brass3' : (d > 2.6 && lit > 0.4 ? 'cream2' : 'cream0'));
    x.drawImage(S(`
      .ooo.
      o...o
      .ooo.
      .obo.`, BR), 4, 0);
    if (v === 'back') { rect(x, 4, 8, 2, 1, 'brass3'); dot(x, 4, 9, 'brass3'); dot(x, 5, 9, 'brass3'); rect(x, 7, 8, 3, 1, 'brass3'); dot(x, 8, 9, 'brass3'); dot(x, 8, 10, 'brass3'); dot(x, 4, 10, 'brass3'); dot(x, 5, 10, 'brass3'); }
    else { line(x, 6, 9, 9, 10, 'ink2'); line(x, 6, 9, 6, 11, 'ink2'); dot(x, 6, 9, 'brass3'); dot(x, 4, 7, 'white'); }
    return c;
  };
  SM.doll = () => S(`
    .oo....oo...
    oapo..oqqo..
    oapo..oxqo..
    oapo..oqxo..
    .obo..oqqo..
    .oboooobo...
    oaabbbbbbo..
    oabbbbbbbco.
    oabebbbebco.
    oabbbpbbbco.
    .obbbbbbco..
    oolLLLLLdoo.
    oblLLLLLdbo.
    .olLLLLLdo..
    ..oao.oao...
    ...o...o....`, { o: 'wood4', a: 'cream0', b: 'cream1', c: 'cream2', p: 'pink', e: 'ink', q: 'sky3', x: 'ink2', l: X.lil0, L: 'lilac', d: 'dusk5' });
  SM.camera = () => S(`
    ..ooo.....oooo..
    .obbbo...oaabbo.
    oooooooooooooooo
    oaaaaaaaaaaaaaco
    oLLLooooooLLLLLo
    oLLoiiiiioLyyLLo
    oLLoiWggioLLLLLo
    oLLoigGgioLLLLLo
    oLLoiggGioLLLLLo
    oLLLoiiioLLLLLLo
    oMMMMoooMMMMMMMo
    oooooooooooooooo`, { o: 'iron4', a: 'iron0', b: 'iron1', c: 'iron2', L: 'wood3', M: 'wood4', i: 'iron1', W: 'white', g: 'water4', G: 'water5', y: 'brass1' });
  SM.key = () => S(`
    .oooo..........
    oabbco.........
    ob..co.........
    ob..cooooooooo.
    oabbcaaaaaaabco
    .oooooooooobcco
    ..........obo.o
    ..........oo...`, { o: 'iron4', a: 'iron0', b: 'iron1', c: 'iron2' });
  SM.shoes = () => {
    const [c, x] = canvas(17, 9);
    x.drawImage(S(`
      .ooo........
      oaabo.......
      oabbboooo...
      oabbwbwbboo.
      oabbbbbbbbbo
      ocbbbbbbbbco
      odddddddddo.
      .ooooooooo..`, { o: 'wood5', a: 'wood1', b: 'wood2', c: 'wood3', d: 'wood4', w: 'cream0' }), 0, 0);
    x.drawImage(S(`
      ..ooo...
      .oasswo.
      oarrrrro
      orrrrrRo
      oRRRRRRo
      .oooooo.`, { o: 'roofR4', a: 'roofR0', r: 'red', R: 'roofR2', s: 'roofR3', w: 'white' }), 9, 3);
    return c;
  };
  SM.book = () => S(`
    .oooooooooo.
    oSSaaaaaaabo
    oSSabbbbbbbo
    ossbboooobbo
    oSSbbowwobbo
    oSSbboooobbo
    ossbbbbbbbbo
    oSSbbbbbbbbo
    oSSbbbbbbbbo
    oSSbbbbbbbbo
    ossbbbbbbbco
    oSSbbbbbbcco
    oSSccccccccp
    .oooooooooo.`, { o: 'roofG4', S: 'roofG3', s: 'brass2', a: 'roofG0', b: 'roofG1', c: 'roofG2', w: 'cream0', p: 'cream1' });
  SM.letter = () => S(`
    oooooooooooooo
    owWWWWWWWWWWwo
    owfWWWWWWWWfwo
    owwfWWWWWWfwwo
    owwwfWWWWfwwwo
    owwwwfrrfwwwwo
    owwwwrRRrwwwwo
    owwwwwrrwwwwwo
    owwwwwwwwwwwwo
    oooooooooooooo`, { o: 'dirt4', w: 'cream1', W: 'cream0', f: 'cream2', r: 'roofR2', R: 'rose' });
  SM.musicbox = (v = 'closed') => v === 'open' ? S(`
    .oooooooooo...
    .ossssssssso..
    .osWssssssso..
    .ossssssssso..
    .oooooooooooo.
    ..o...p.....o.
    ..o..ppp....o.
    oooooooooooooo
    oaaaaaaaaaaaao
    obbbybbbbbbbyo
    obbbbbbbbbbbbo
    ocbbbbbbbbbbco
    oooooooooooooo`, { o: 'wood4', s: 'sky1', W: 'white', p: 'pink', a: 'wood0', b: 'wood1', c: 'wood2', y: 'brass1' }) : S(`
    .oooooooooooo..
    oaaaaaaaaaaaao.
    oabbbbrrbbbbbo.
    oooooooooooooo.
    oaaaaaaaaaaaao.
    obbbbbyybbbbboq
    obbbbbyybbbbboq
    ocbbbbbbbbbbco.
    oooooooooooooo.`, { o: 'wood4', a: 'wood0', b: 'wood1', c: 'wood2', r: 'rose', y: 'brass1', q: 'brass3' });
  SM.parcel = () => S(`
    ...oooooooooo.
    ..oaaattaaaaoo
    .oaaaattaaaoco
    oooooottooooco
    obbbbbttbbbocco
    obbbbbttbbboco
    obbwwwwbbbboco
    obbwkkwbbbboco
    obbwwwwbbbbocO
    obbbbbttbbboo.
    oooooooooooo..`.split('\n').map(s => s.trim().slice(0, 14)).join('\n'), { o: 'dirt4', a: 'dirt1', b: 'dirt2', c: 'dirt3', t: 'cream0', w: 'cream0', k: 'stone3', O: 'dirt4' });
  SM.suitcase = () => {
    const c = S(`
      .....oooooo.....
      .....o....o.....
      .oooooooooooooo.
      oaaaaaaaaaaaaaao
      oabbbbbbbbbbbbco
      oaybbbbbbbbbbyco
      obbbbbbbbbbbbbco
      obbbbbbbbbbbbbco
      obbbbbbbbbbbbbco
      obbbbbbbbbbbbbco
      obbbbbbbbbbbbbco
      occcccccccccccco
      oooooooooooooooo`, { o: 'roofR4', a: 'roofR0', b: 'roofR1', c: 'roofR2', y: 'brass1' });
    const x = c.getContext('2d'); text(x, 'A.T.', 3, 6, 'cream0');
    return c;
  };

  /* ================================================================ HELD ITEMS (xs, 7-10 px, for ant hands) */
  XS.watch = (v = 'front') => {
    const key = { o: 'brass4', a: 'brass0', b: 'brass1', c: 'brass2', d: 'brass3', f: 'cream0', k: 'ink2' };
    if (v === 'side') return sprite(['.o.', '.o.', 'obo', 'oac', 'oac', 'oac', 'oac', '.o.'], key);
    const f = v === 'back' ? ['bbb', 'bdb', 'bbb'] : ['fff', 'fkk', 'fkf'];   // front: hands at 6:17
    return sprite(['..ooo..', '..obo..', '.oaabo.', `oa${f[0]}co`, `oa${f[1]}co`, `oa${f[2]}co`, '.obcco.', '..ooo..'], key);
  };
  XS.doll = () => S(`
    .oo..oo.
    oapooqqo
    oapooxqo
    .obaabo.
    oaaaaaao
    oaeaaeao
    obaapabo
    .oLLLLo.
    oLLLLLLo
    .oo..oo.`, { o: 'wood4', a: 'cream0', b: 'cream1', p: 'pink', q: 'sky3', x: 'ink2', e: 'ink', L: 'lilac' });
  XS.camera = () => S(`
    .ooo..oo.
    ooooooooo
    oaaaaaaco
    oLoooLLLo
    oLoWgoLyo
    oLoggoLLo
    ooooooooo`, { o: 'iron4', a: 'iron0', c: 'iron2', L: 'wood3', W: 'white', g: 'water4', y: 'brass1' });
  XS.key = () => S(`
    .ooo......
    oa.oooooo.
    oa.oabbbbo
    .ooo.ooboo
    ......ooo.`, { o: 'iron4', a: 'iron0', b: 'iron1' });
  XS.shoes = () => S(`
    .oo.......
    oabo......
    oaboo.....
    oabbbo.oo.
    oabbbboaro
    oddddooRRo
    .oooo.ooo.`, { o: 'wood5', a: 'wood1', b: 'wood2', d: 'wood4', r: 'red', R: 'roofR2' });
  XS.book = () => S(`
    .ooooo.
    oSabbbo
    oSbwwbo
    oSbbbbo
    oSbbbbo
    oSbbbco
    oSccccp
    .ooooo.`, { o: 'roofG4', S: 'roofG3', a: 'roofG0', b: 'roofG1', c: 'roofG2', w: 'cream0', p: 'cream1' });
  XS.letter = () => S(`
    ooooooooo
    owfwwwfwo
    owwfwfwwo
    owwwrwwwo
    owwwwwwwo
    ooooooooo`, { o: 'dirt4', w: 'cream0', f: 'cream2', r: 'red' });
  XS.musicbox = (v = 'closed') => v === 'open' ? S(`
    .ooooooo..
    .osssWso..
    .ooooooo..
    oaaapaaao.
    ooooooooo.
    obbbybbboq
    occcccccoq
    ooooooooo.`, { o: 'wood4', s: 'sky1', W: 'white', p: 'pink', a: 'roofR2', b: 'wood1', c: 'wood2', y: 'brass1', q: 'brass3' }) : S(`
    .ooooooo..
    oaaaaaaao.
    oabbrbbbo.
    ooooooooo.
    obbbybbboq
    occcccccoq
    ooooooooo.`, { o: 'wood4', a: 'wood0', b: 'wood1', c: 'wood2', r: 'rose', y: 'brass1', q: 'brass3' });
  XS.parcel = () => S(`
    oooooooo
    oaaataao
    obbbtbbo
    otttttto
    obbbtbbo
    obwwtbco
    oooooooo`, { o: 'dirt4', a: 'dirt1', b: 'dirt2', c: 'dirt3', t: 'dirt0', w: 'cream0' });

  /* ================================================================ LARGE ITEMS (40-48 px, inspect view and showcase) */
  const brassLit = lit => lit > 0.55 ? 'brass0' : lit > 0.05 ? 'brass1' : lit > -0.5 ? 'brass2' : 'brass3';
  LG.watch = (v = 'front') => {
    if (v === 'side') {
      const [c, x] = canvas(12, 48);
      // bow seen edge-on, crown, then the thin case (lens-shaped profile)
      rect(x, 4, 0, 4, 9, 'brass4'); rect(x, 5, 1, 2, 7, 'brass1'); dot(x, 5, 1, 'brass0');
      rect(x, 3, 8, 6, 5, 'brass4'); for (let i = 4; i < 8; i++) rect(x, i, 9, 1, 3, i % 2 ? 'brass2' : 'brass0');
      for (let j = 12; j < 48; j++) {
        const u = (j - 11.5) / 36, half = 1.2 + 3.6 * Math.pow(Math.sin(Math.PI * u), 0.55), a = Math.round(6 - half), b = Math.round(6 + half);
        rect(x, a, j, b - a, 1, 'brass4');
        if (b - a > 2) { rect(x, a + 1, j, 1, 1, 'brass0'); rect(x, a + 2, j, Math.max(0, b - a - 4), 1, 'brass1'); rect(x, b - 2, j, 1, 1, 'brass3'); }
        if (b - a > 4) dot(x, 6, j, 'brass2');
      }
      return c;
    }
    const [c, x] = canvas(44, 48), cx = 22, cy = 29, R = 18.5;
    // bow ring and knurled crown
    disc(x, 22, 5.5, 5.5, (d, lit) => d < 2.6 ? null : d > 4.7 || d < 3.3 ? 'brass4' : brassLit(lit));
    rect(x, 18, 9, 9, 6, 'brass4'); for (let i = 19; i < 26; i++) rect(x, i, 10, 1, 4, i % 2 ? 'brass2' : 'brass0'); rect(x, 19, 10, 7, 1, 'brass0');
    if (v === 'back') {
      disc(x, cx, cy, R, (d, lit) => d > R - 0.9 ? 'brass4' : d > R - 3 ? brassLit(lit) : d > R - 3.8 ? 'brass3'
        : (Math.abs(d - 11.5) < 0.5 ? 'brass3' : Math.abs(d - 12.4) < 0.5 && lit < 0.2 ? 'brass0' : lit > 0.6 && d > 5 && d < 10 ? 'brass0' : lit > -0.2 ? 'brass1' : 'brass2'));
      // ornament dots on the engraved ring, and the monogram A.T. engraved in the centre
      for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; dot(x, Math.round(cx + Math.cos(a) * 13.9), Math.round(cy + Math.sin(a) * 13.9), 'brass3'); }
      engrave(x, [
        '..#.......#####...',
        '.#.#........#.....',
        '.#.#........#.....',
        '#...#.......#.....',
        '#####.......#.....',
        '#...#.##....#...##',
        '#...#.##....#...##'], cx - 9, cy - 4, 'brass4', 'brass0');
      rect(x, cx - 7, cy + 5, 14, 1, 'brass3'); dot(x, cx - 8, cy + 4, 'brass3'); dot(x, cx + 7, cy + 4, 'brass3');
      return c;
    }
    disc(x, cx, cy, R, (d, lit) => d > R - 0.9 ? 'brass4' : d > R - 3 ? brassLit(lit) : d > R - 3.8 ? 'brass3'
      : d > R - 6 && lit > 0.35 ? 'cream2' : d > R - 7 && lit > 0.05 ? 'cream1' : 'cream0');
    // hour ticks and numerals
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2, s = Math.sin(a), co = -Math.cos(a);
      if (h % 3) line(x, cx + s * 12.2, cy + co * 12.2, cx + s * 13.4, cy + co * 13.4, 'wood3');
    }
    text(x, '12', cx - 3, cy - 12, 'ink2'); text(x, '6', cx - 1, cy + 8, 'ink2'); text(x, '3', cx + 9, cy - 2, 'ink2'); text(x, '9', cx - 11, cy - 2, 'ink2');
    // hands at 18:17 (6:17 on the dial)
    const am = (17 / 60) * Math.PI * 2, ah = ((6 + 17 / 60) / 12) * Math.PI * 2;
    const mx = Math.round(cx + Math.sin(am) * 11), my = Math.round(cy - Math.cos(am) * 11), hx = Math.round(cx + Math.sin(ah) * 7), hy = Math.round(cy - Math.cos(ah) * 7);
    line(x, cx, cy, mx, my, 'ink2'); line(x, cx, cy + 1, mx, my, 'ink2');
    line(x, cx, cy, hx, hy, 'ink2'); line(x, cx + 1, cy, hx + 1, hy, 'ink2');
    rect(x, cx - 1, cy - 1, 3, 3, 'brass3'); dot(x, cx, cy, 'brass0');
    // glass glint (kept clear of the numerals)
    line(x, cx - 8, cy - 7, cx - 5, cy - 10, 'white'); line(x, cx - 7, cy - 5, cx - 6, cy - 6, 'white');
    return c;
  };
  LG.doll = () => {
    const [c, x] = canvas(40, 48);
    const fur = { o: 'wood4', ol: 'wood3', h: 'white', b: 'cream0', s: 'cream2' };
    // ears: the left one upright, the right one mended with a blue patch and big cross stitches
    const earL = mask(40, 48, g => lens(g, 15, 19, -1.72, 18, 4.2, '#000'));
    const earR = mask(40, 48, g => lens(g, 25, 19, -1.2, 18, 4.2, '#000'));
    x.drawImage(bevel(earL, fur, 1, 1), 0, 0); x.drawImage(bevel(earR, fur, 1, 1), 0, 0);
    lens(x, 15, 17, -1.72, 13, 1.6, 'pink');
    const patch = mask(40, 48, g => { lens(g, 25, 19, -1.2, 18, 4.2, '#000'); g.globalCompositeOperation = 'source-in'; g.fillRect(0, 7, 40, 7); });
    x.drawImage(bevel(patch, { o: 'roofB3', h: 'sky1', b: 'sky2', s: 'sky3' }, 1, 1), 0, 0);
    for (const [sx, sy] of [[27, 7], [29, 10], [31, 12]]) { dot(x, sx - 1, sy - 1, 'ink2'); dot(x, sx + 1, sy + 1, 'ink2'); dot(x, sx + 1, sy - 1, 'ink2'); dot(x, sx - 1, sy + 1, 'ink2'); dot(x, sx, sy, 'ink2'); }
    for (let k = 0; k < 4; k++) dot(x, 26 + k * 2, 15 - Math.round(k * 0.6), 'ink2');
    // body in a lilac dress with arms and feet
    const body = mask(40, 48, g => { ellipse(g, 20, 37, 10, 8, '#000'); rect(g, 12, 31, 16, 6, '#000'); });
    x.drawImage(bevel(body, { o: 'roofB3', ol: 'dusk5', h: X.lil0, b: 'lilac', s: 'dusk5' }, 1, 2), 0, 0);
    for (const [px, py] of [[14, 36], [22, 39], [18, 42], [25, 34]]) rect(x, px, py, 2, 2, 'white');
    const limbs = mask(40, 48, g => { ellipse(g, 9, 34, 3, 4, '#000'); ellipse(g, 31, 34, 3, 4, '#000'); ellipse(g, 14, 45, 4, 2, '#000'); ellipse(g, 26, 45, 4, 2, '#000'); });
    x.drawImage(bevel(limbs, fur, 1, 1), 0, 0);
    rect(x, 12, 45, 3, 1, 'pink'); rect(x, 25, 45, 3, 1, 'pink');
    // head
    const head = mask(40, 48, g => ellipse(g, 20, 24, 11, 8, '#000'));
    x.drawImage(bevel(head, fur, 1, 2), 0, 0);
    rect(x, 13, 23, 2, 2, 'ink'); dot(x, 13, 23, 'white'); rect(x, 25, 23, 2, 2, 'ink'); dot(x, 25, 23, 'white');
    rect(x, 19, 26, 3, 1, 'pink'); dot(x, 20, 27, 'pink'); dot(x, 19, 28, 'wood4'); dot(x, 21, 28, 'wood4');
    rect(x, 10, 26, 2, 1, 'pink'); rect(x, 28, 26, 2, 1, 'pink');
    // a running stitch down the head seam, and a rose bow at the neck
    for (let j = 17; j < 21; j += 2) dot(x, 20, j, 'cream2');
    rect(x, 16, 31, 3, 3, 'roofR2'); rect(x, 21, 31, 3, 3, 'roofR2'); rect(x, 19, 32, 2, 2, 'rose'); dot(x, 16, 31, 'rose'); dot(x, 23, 31, 'rose');
    return c;
  };
  LG.camera = () => {
    const [c, x] = canvas(48, 36);
    // top plate (chrome) with rewind knob, shutter button and advance lever
    rect(x, 5, 3, 7, 4, 'iron4'); rect(x, 6, 3, 5, 3, 'iron1'); rect(x, 6, 3, 5, 1, 'iron0');
    rect(x, 36, 1, 8, 5, 'iron4'); rect(x, 37, 2, 6, 3, 'iron1'); rect(x, 37, 2, 6, 1, 'iron0');
    rect(x, 30, 4, 4, 3, 'brass3'); rect(x, 31, 4, 2, 1, 'brass1');
    const top = mask(48, 36, g => { rect(g, 2, 6, 44, 9, '#000'); rect(g, 1, 7, 46, 7, '#000'); });
    x.drawImage(bevel(top, { o: 'iron4', ol: 'iron3', h: 'iron0', b: 'iron1', s: 'iron2' }, 1, 1), 0, 0);
    for (const [wx, ww] of [[6, 8], [34, 6]]) { rect(x, wx, 9, ww, 4, 'iron4'); rect(x, wx + 1, 10, ww - 2, 2, 'water3'); dot(x, wx + 1, 10, 'water0'); }
    rect(x, 18, 9, 8, 3, 'iron2'); rect(x, 19, 10, 6, 1, 'iron3');
    // leather body
    const body = mask(48, 36, g => { rect(g, 1, 14, 46, 19, '#000'); rect(g, 2, 33, 44, 1, '#000'); });
    x.drawImage(bevel(body, { o: 'wood5', ol: 'wood4', h: 'wood2', b: 'wood3', s: 'wood4' }, 1, 2), 0, 0);
    for (let j = 17; j < 31; j += 3) for (let i = 4 + ((j / 3) % 2) * 2; i < 45; i += 4) dot(x, i, j, 'wood4');
    rect(x, 1, 14, 46, 1, 'iron3');
    // lens: chrome barrel, knurled focus ring, deep glass with glints
    disc(x, 19.5, 23.5, 11.5, (d, lit, dx, dy) => d > 10.8 ? 'iron4' : d > 8.4 ? (((Math.round(Math.atan2(dy, dx) * 12 / Math.PI)) & 1) ? 'iron2' : lit > 0 ? 'iron0' : 'iron1') : d > 7.6 ? 'iron3' : d > 6 ? (lit > 0 ? 'iron1' : 'iron2') : d > 5.2 ? 'iron4'
      : lit > 0.6 && d > 2.8 ? 'water2' : d < 2 ? 'water6' : 'water5');
    line(x, 16, 21, 18, 19, 'white'); dot(x, 22, 26, 'water1'); dot(x, 23, 25, 'water2');
    // strap lugs
    rect(x, 0, 16, 1, 3, 'iron3'); rect(x, 47, 16, 1, 3, 'iron3');
    return c;
  };
  LG.key = () => {
    const [c, x] = canvas(48, 22);
    // round bow: a thick ring with a lit inner lip and four small knobs
    for (const [kx, ky] of [[10.5, 1.5], [10.5, 21.5], [0.5, 11.5], [4, 4.5], [4, 18.5], [17, 4.5], [17, 18.5]]) disc(x, kx, ky, 1.6, (d, lit) => d > 1.1 ? 'iron4' : lit > 0 ? 'iron0' : 'iron2');
    disc(x, 10.5, 11.5, 9.5, (d, lit, dx, dy) => d > 8.7 ? 'iron4' : d < 4.2 ? null : d < 5 ? (dx + dy > 0 ? 'iron0' : 'iron4') : lit > 0.55 ? 'iron0' : lit > 0 ? 'iron1' : lit > -0.5 ? 'iron2' : 'iron3');
    // collar and shaft
    rect(x, 19, 7, 5, 9, 'iron4'); rect(x, 20, 8, 3, 7, 'iron1'); rect(x, 20, 8, 3, 1, 'iron0'); rect(x, 22, 8, 1, 7, 'iron2');
    rect(x, 23, 9, 23, 5, 'iron4'); rect(x, 23, 10, 22, 1, 'iron0'); rect(x, 23, 11, 22, 1, 'iron1'); rect(x, 23, 12, 22, 1, 'iron2');
    rect(x, 30, 8, 2, 7, 'iron4'); rect(x, 30, 9, 1, 5, 'iron1');
    // bit with wards
    rect(x, 36, 13, 10, 8, 'iron4'); rect(x, 37, 13, 8, 7, 'iron1'); rect(x, 37, 13, 8, 1, 'iron2');
    x.clearRect(39, 16, 2, 5); x.clearRect(43, 18, 2, 3); rect(x, 38, 16, 1, 4, 'iron4'); rect(x, 41, 16, 1, 4, 'iron4'); rect(x, 42, 18, 1, 2, 'iron4'); rect(x, 45, 13, 1, 8, 'iron4');
    rect(x, 39, 15, 2, 1, 'iron4'); rect(x, 43, 17, 2, 1, 'iron4');
    return c;
  };
  LG.shoes = () => {
    const [c, x] = canvas(48, 30);
    // grown-up's lace-up shoe (behind)
    const big = mask(48, 30, g => { poly(g, [[3, 14], [10, 6], [19, 5], [22, 11], [34, 14], [40, 17], [42, 22], [42, 26], [2, 26]], '#000'); });
    x.drawImage(bevel(big, { o: 'wood5', ol: 'wood4', h: 'wood1', b: 'wood2', s: 'wood3' }, 1, 2), 0, 0);
    rect(x, 2, 25, 41, 3, 'wood5'); rect(x, 3, 25, 39, 1, 'wood4');
    rect(x, 3, 22, 6, 3, 'wood4');
    for (let k = 0; k < 4; k++) { rect(x, 18 + k * 3, 11 + k, 3, 1, 'cream0'); dot(x, 19 + k * 3, 12 + k, 'cream2'); }
    line(x, 12, 8, 17, 14, 'wood3'); rect(x, 30, 17, 9, 1, 'wood3');
    // child's mary-jane (in front, clearly smaller)
    const small = mask(48, 30, g => { poly(g, [[27, 21], [31, 17], [36, 16], [41, 18], [46, 21], [47, 25], [26, 25]], '#000'); });
    x.drawImage(bevel(small, { o: 'roofR4', ol: 'roofR3', h: 'roofR0', b: 'red', s: 'roofR2' }, 1, 1), 0, 0);
    rect(x, 26, 25, 22, 2, 'roofR4'); rect(x, 27, 25, 20, 1, 'roofR3');
    rect(x, 30, 19, 11, 2, 'roofR3'); rect(x, 30, 19, 11, 1, 'roofR2'); rect(x, 39, 19, 2, 2, 'white');
    rect(x, 34, 21, 6, 2, 'cream1');
    return c;
  };
  LG.book = () => {
    const [c, x] = canvas(40, 46);
    // pages peeking out at the right and bottom
    rect(x, 7, 5, 31, 39, 'cream2'); for (let j = 7; j < 42; j += 2) rect(x, 36, j, 2, 1, 'cream0'); for (let i = 9; i < 36; i += 3) rect(x, i, 42, 2, 1, 'cream0');
    // cloth cover with worn corners
    const cov = mask(40, 46, g => rect(g, 3, 1, 33, 41, '#000'));
    x.drawImage(bevel(cov, { o: 'roofG4', ol: 'roofG3', h: 'roofG1', b: 'roofG2', s: 'roofG3' }, 1, 2), 0, 0);
    for (const [wx, wy] of [[33, 2], [33, 38], [4, 38]]) { rect(x, wx, wy, 2, 2, 'roofG1'); dot(x, wx + (wx > 20 ? 1 : 0), wy + (wy > 20 ? 1 : 0), 'roofG0'); }
    // spine with raised bands
    rect(x, 3, 1, 6, 41, 'roofG4'); rect(x, 4, 2, 4, 39, 'roofG3'); rect(x, 4, 2, 1, 39, 'roofG2');
    for (const j of [6, 13, 29, 36]) { rect(x, 4, j, 4, 2, 'brass2'); rect(x, 4, j, 4, 1, 'brass1'); }
    // embossed border and a small brass title plate
    rect(x, 12, 5, 21, 1, 'roofG3'); rect(x, 12, 37, 21, 1, 'roofG3'); rect(x, 12, 5, 1, 33, 'roofG3'); rect(x, 32, 5, 1, 33, 'roofG3');
    rect(x, 13, 6, 19, 1, 'roofG1'); rect(x, 13, 6, 1, 31, 'roofG1');
    rect(x, 14, 12, 17, 11, 'brass4'); rect(x, 15, 13, 15, 9, 'brass1'); rect(x, 15, 13, 15, 1, 'brass0'); rect(x, 16, 14, 13, 7, 'cream0');
    rect(x, 18, 16, 9, 1, 'wood4'); rect(x, 19, 18, 7, 1, 'wood3');
    rect(x, 20, 28, 5, 5, 'roofG3'); rect(x, 21, 29, 3, 3, 'roofG1'); dot(x, 22, 30, 'roofG0');
    // ribbon bookmark
    rect(x, 26, 42, 3, 4, 'roofR2'); rect(x, 26, 42, 1, 4, 'rose'); dot(x, 27, 45, 'roofR2'); x.clearRect(27, 45, 1, 1);
    return c;
  };
  LG.letter = () => {
    const [c, x] = canvas(44, 30);
    const env = mask(44, 30, g => rect(g, 1, 2, 42, 27, '#000'));
    x.drawImage(bevel(env, { o: 'dirt4', ol: 'dirt3', h: 'white', b: 'cream0', s: 'cream1' }, 1, 2), 0, 0);
    // back flap and folds
    poly(x, [[2, 3], [42, 3], [22, 18]], 'cream1'); line(x, 2, 3, 22, 17, 'dirt3'); line(x, 42, 3, 22, 17, 'dirt3');
    line(x, 2, 27, 16, 15, 'cream2'); line(x, 42, 27, 28, 15, 'cream2');
    // red wax seal with an embossed heart and drips
    disc(x, 22, 18.5, 5.5, (d, lit) => d > 4.8 ? 'roofR4' : lit > 0.55 && d > 2 ? 'rose' : lit > -0.3 ? 'red' : 'roofR2');
    rect(x, 18, 23, 2, 2, 'roofR2'); rect(x, 25, 23, 1, 3, 'roofR2');
    rect(x, 20, 17, 2, 1, 'roofR3'); rect(x, 23, 17, 2, 1, 'roofR3'); rect(x, 20, 18, 5, 1, 'roofR3'); rect(x, 21, 19, 3, 1, 'roofR3'); dot(x, 22, 20, 'roofR3');
    dot(x, 19, 15, 'white');
    return c;
  };
  LG.musicbox = (v = 'closed') => {
    const [c, x] = canvas(44, 44);
    const wood = { o: 'wood5', ol: 'wood4', h: 'wood1', b: 'wood2', s: 'wood3' };
    if (v === 'open') {
      // raised lid showing a mirror, a velvet well and a little dancer
      const lid = mask(44, 44, g => rect(g, 5, 2, 34, 17, '#000'));
      x.drawImage(bevel(lid, wood, 1, 1), 0, 0);
      rect(x, 8, 5, 28, 12, 'wood4'); rect(x, 9, 6, 26, 10, 'sky1'); rect(x, 9, 6, 26, 2, 'white'); line(x, 12, 14, 17, 7, 'white'); line(x, 14, 14, 19, 7, 'water0');
      // music notes rising out of the box
      const note = S(`
        ..oo.
        ..o.o
        ..o..
        ooo..
        oo...`, { o: 'roofR3' });
      x.drawImage(note, 38, 5); x.drawImage(note, 1, 1);
    } else {
      rect(x, 3, 13, 38, 3, 'wood5');
    }
    // box: top face (lid closed, or the open velvet well), front face with brass corners and keyhole, crank at the side
    const top = mask(44, 44, g => rect(g, 3, 18, 38, 8, '#000'));
    x.drawImage(bevel(top, { o: 'wood5', ol: 'wood4', h: 'wood0', b: 'wood1', s: 'wood2' }, 1, 1), 0, 0);
    if (v === 'open') {
      rect(x, 6, 20, 32, 5, 'roofR3'); rect(x, 7, 21, 30, 3, 'roofR2'); rect(x, 7, 21, 30, 1, 'roofR1');
      // the little dancer on her brass pin
      rect(x, 21, 17, 2, 5, 'brass3'); rect(x, 21, 17, 1, 5, 'brass1');
      x.drawImage(S(`
        ...ooo...
        ..ohhho..
        ..ohhho..
        o..ooo..o
        ao.ofo.oa
        .aoffooa.
        ..offfo..
        .opppppo.
        opPpPpPpo
        .ooooooo.
        ...o.o...
        ...o.o...`, { o: 'wood4', h: 'wood2', a: 'cream0', f: 'cream0', p: 'pink', P: 'white' }), 18, 5);
    } else {
      // closed lid top with a rose inlay
      rect(x, 3, 13, 38, 6, 'wood5'); rect(x, 4, 14, 36, 4, 'wood1'); rect(x, 4, 14, 36, 1, 'wood0');
      ellipse(x, 22, 21, 5, 2, 'roofR2'); ellipse(x, 22, 21, 3, 1, 'rose'); rect(x, 15, 21, 3, 1, 'leaf3'); rect(x, 27, 21, 3, 1, 'leaf3');
    }
    const front = mask(44, 44, g => rect(g, 3, 25, 38, 17, '#000'));
    x.drawImage(bevel(front, wood, 1, 2), 0, 0);
    rect(x, 3, 30, 38, 1, 'wood4'); rect(x, 4, 31, 36, 1, 'wood1');
    for (const [bx, by] of [[3, 25], [37, 25], [3, 38], [37, 38]]) { rect(x, bx, by, 4, 4, 'brass3'); rect(x, bx + 1, by + 1, 2, 2, 'brass1'); dot(x, bx + 1, by + 1, 'brass0'); }
    // brass plate with an engraved note
    rect(x, 17, 32, 10, 8, 'brass3'); rect(x, 18, 33, 8, 6, 'brass1'); rect(x, 18, 33, 8, 1, 'brass0');
    rect(x, 22, 34, 1, 4, 'brass4'); dot(x, 23, 34, 'brass4'); dot(x, 24, 35, 'brass4'); rect(x, 20, 37, 2, 1, 'brass4'); dot(x, 21, 36, 'brass4');
    rect(x, 41, 30, 2, 2, 'brass3'); rect(x, 42, 26, 1, 5, 'brass3'); rect(x, 40, 25, 4, 2, 'brass2'); dot(x, 40, 25, 'brass0');
    return c;
  };
  LG.parcel = () => {
    const [c, x] = canvas(44, 40);
    // 3/4 box: top, front and right side faces
    poly(x, [[2, 10], [12, 2], [42, 2], [32, 10]], 'dirt4'); poly(x, [[4, 10], [13, 3], [40, 3], [31, 10]], 'dirt1');
    rect(x, 2, 10, 31, 28, 'dirt4'); rect(x, 3, 11, 29, 26, 'dirt2'); rect(x, 3, 11, 29, 1, 'dirt1');
    poly(x, [[33, 10], [42, 2], [42, 30], [33, 38]], 'dirt4'); poly(x, [[33, 11], [41, 4], [41, 30], [33, 37]], 'dirt3');
    // tape along the top seam and down the front
    poly(x, [[12, 10], [21, 3], [27, 3], [18, 10]], 'dirt0'); poly(x, [[14, 10], [22, 3], [23, 3], [15, 10]], 'white');
    rect(x, 12, 10, 6, 28, 'dirt0'); rect(x, 13, 10, 1, 27, 'white'); rect(x, 17, 10, 1, 27, 'dirt1');
    rect(x, 3, 11, 29, 1, 'dirt1');
    // address label (blank) and a red stamp
    rect(x, 20, 20, 11, 9, 'dirt3'); rect(x, 21, 21, 9, 7, 'cream0'); rect(x, 22, 23, 6, 1, 'stone2'); rect(x, 22, 25, 4, 1, 'stone2');
    rect(x, 5, 30, 5, 5, 'roofR2'); rect(x, 6, 31, 3, 3, 'rose'); dot(x, 7, 32, 'roofR2');
    // string tied round the box
    rect(x, 3, 22, 9, 1, 'wood3'); rect(x, 18, 22, 2, 1, 'wood3'); line(x, 33, 22, 41, 15, 'wood3');
    return c;
  };
  LG.suitcase = () => {
    const [c, x] = canvas(48, 38);
    // handle
    rect(x, 17, 2, 14, 7, 'roofR4'); rect(x, 18, 3, 12, 2, 'roofR1'); x.clearRect(19, 5, 10, 4); rect(x, 18, 5, 1, 4, 'roofR1'); rect(x, 29, 5, 1, 4, 'roofR1');
    rect(x, 15, 8, 4, 3, 'brass3'); rect(x, 29, 8, 4, 3, 'brass3');
    // leather body with a lid seam
    const body = mask(48, 38, g => { rect(g, 2, 10, 44, 27, '#000'); rect(g, 1, 11, 46, 25, '#000'); });
    x.drawImage(bevel(body, { o: 'roofR4', ol: 'roofR3', h: 'roofR0', b: 'roofR1', s: 'roofR2' }, 1, 2), 0, 0);
    rect(x, 2, 17, 44, 1, 'roofR3'); rect(x, 2, 18, 44, 1, 'roofR0');
    // straps with buckles
    for (const sx of [5, 39]) { rect(x, sx, 10, 4, 27, 'wood4'); rect(x, sx + 1, 10, 2, 27, 'wood2'); rect(x, sx + 1, 10, 1, 27, 'wood1'); rect(x, sx - 1, 20, 6, 4, 'brass3'); rect(x, sx, 21, 4, 2, 'brass1'); rect(x, sx + 1, 21, 2, 1, 'wood4'); }
    // brass corners and clasps
    for (const [bx, by] of [[1, 11], [43, 11], [1, 32], [43, 32]]) { rect(x, bx, by, 4, 4, 'brass3'); rect(x, bx + 1, by + 1, 2, 2, 'brass1'); }
    for (const bx of [18, 27]) { rect(x, bx, 15, 3, 4, 'brass3'); rect(x, bx + 1, 16, 1, 2, 'brass0'); }
    // painted initials
    bigText(x, 'A.T.', 24 - textWidth('A.T.'), 22, 'cream0', 2);
    return c;
  };

  /* ================================================================ ICONS (16x16, ink outline) */
  const ICK = { o: 'ink' };
  ICONS.bag = () => S(`
    ................
    .....oooooo.....
    ....oo....oo....
    ....o......o....
    ..oooooooooooo..
    .oaaaaaaaaaaaao.
    .oabbbbbbbbbbco.
    .oobbbbbbbbbboo.
    .ocooooyyooooco.
    .occcccoyoccccco
    .occccccooccccco
    .occccccccccccco
    .ocdcccccccccdco
    .odddddddddddddo
    ..ooooooooooooo.
    ................`.split('\n').map(s => s.trim().slice(0, 16)).join('\n'), { ...ICK, a: 'wood0', b: 'wood1', c: 'wood2', d: 'wood3', y: 'brass1' });
  ICONS.look = () => S(`
    ................
    ....ooooo.......
    ...oaaaaao......
    ..oaWWgaaao.....
    .oaWggggggao....
    .oaWgggggGao....
    .oagggggGGao....
    .oaggggGGGao....
    ..oagGGGGao.....
    ...oaaaaaoo.....
    ....ooooobbo....
    ..........obbo..
    ...........obbo.
    ............obbo
    .............oo.
    ................`, { ...ICK, a: 'brass1', W: 'white', g: 'sky1', G: 'sky2', b: 'wood2' });
  ICONS.talk = () => S(`
    ................
    ..oooooooooooo..
    .owwwwwwwwwwwwo.
    owwwwwwwwwwwwwwo
    owwwwwwwwwwwwwwo
    owwrrwwrrwwrrwwo
    owwrrwwrrwwrrwwo
    owwwwwwwwwwwwwco
    owwwwwwwwwwwwcco
    .occccccccccccoo
    ..oooowwoooooo..
    .....owwo.......
    ....owwo........
    ....ooo.........
    ................
    ................`, { ...ICK, w: 'cream0', c: 'cream2', r: 'rose' });
  ICONS.hand = () => S(`
    ................
    .....oo.oo......
    ....oaaoaao.oo..
    ....oabkabkoaao.
    .oo.oabkabkoabo.
    oaaooabkabkoabo.
    oabboabkabkabbo.
    .obbbbbbbbbbbbo.
    ..obbbbbbbbbbbo.
    ..obbbbbbbbbbco.
    ...obbbbbbbbbco.
    ...obbbbbbbbco..
    ....obbbbbbcco..
    .....occcccco...
    ......oooooo....
    ................`, { ...ICK, a: 'ant0', b: 'roofR0', c: 'ant1', k: 'ant1' });
  ICONS.lantern = () => S(`
    .......oo.......
    ......o..o......
    .......oo.......
    .....oooooo.....
    ....oaabbbco....
    ...ooooooooo....
    ....oyWWWyo.....
    ....oyWFWyo.....
    ....oyWFFyo.....
    ....oyyFyyo.....
    ....oyyyyyo.....
    ...ooooooooo....
    ....oabbbco.....
    .....oooooo.....
    ................
    ................`.split('\n').map(s => s.trim()).join('\n'), { ...ICK, a: 'brass0', b: 'brass1', c: 'brass2', y: 'light1', W: 'light0', F: 'light3' });
  ICONS.clock = () => S(`
    ..oo.......oo...
    .orro.....orro..
    .oroooooooooro..
    ..oowwwwwwwoo...
    ..owwwwkwwwwo...
    .owwwwwkwwwwwo..
    .owwwwwkwwwwwo..
    .owwwwwkkkkwwo..
    .owwwwwwwwwwwo..
    .owwwwwwwwwwco..
    ..owwwwwwwwco...
    ..oocwwwwwcoo...
    ...ooooooooo....
    ..oo.......oo...
    ................
    ................`, { ...ICK, r: 'rose', w: 'cream0', c: 'cream2', k: 'ink2' });
  ICONS.heart = () => S(`
    ................
    ..oooo...oooo...
    .orrrro.orrrro..
    orWWrrrorrrrrro.
    orWrrrrrrrrrrro.
    orrrrrrrrrrrRro.
    orrrrrrrrrrrRro.
    .orrrrrrrrrRro..
    ..orrrrrrrRro...
    ...orrrrrRro....
    ....orrrRro.....
    .....orRro......
    ......oro.......
    .......o........
    ................
    ................`, { ...ICK, r: 'rose', R: 'roofR2', W: 'white' });
  ICONS.note = () => S(`
    ................
    ..ooooooooo.....
    ..owwwwwwwoo....
    ..owllllwwoco...
    ..owwwwwwwoooo..
    ..owllllllllwo..
    ..owwwwwwwwwwo..
    ..owllllllllwo..
    ..owwwwwwwwwwo..
    ..owllllllwwwo..
    ..owwwwwwwwwwo..
    ..owllllwwwrro..
    ..owwwwwwwwrro..
    ..occcccccccco..
    ..oooooooooooo..
    ................`, { ...ICK, w: 'cream0', l: 'stone2', c: 'cream2', r: 'rose' });
  const speaker = `
    ................
    ......oo........
    .....oao........
    ....oabo........
    .ooooabo........
    .oaaabbo........
    .oabbbbo........
    .oabbbbo........
    .occcbbo........
    .ooooccoo.......
    ....occo........
    .....oco........
    ......oo........
    ................
    ................
    ................`;
  ICONS['sound-on'] = () => { const c = S(speaker, { ...ICK, a: 'cream0', b: 'brass1', c: 'brass2' }), x = c.getContext('2d');
    const w = C('roofG2'); for (const [px, py] of [[10, 5], [11, 6], [11, 7], [11, 8], [10, 9], [12, 3], [13, 4], [14, 5], [14, 6], [14, 7], [14, 8], [14, 9], [13, 10], [12, 11]]) rect(x, px, py, 1, 1, w);
    return c; };
  ICONS['sound-off'] = () => { const c = S(speaker, { ...ICK, a: 'cream0', b: 'brass1', c: 'brass2' }), x = c.getContext('2d');
    for (let k = 0; k < 5; k++) { rect(x, 10 + k, 5 + k, 2, 1, 'roofR2'); rect(x, 14 - k, 5 + k, 2, 1, 'roofR2'); }
    return c; };

  /* ================================================================ FOLIAGE (shared by the station) */
  // Canopy from clumps [cx, cy, r]; each clump lit from the top-left with a scalloped rim and leaf clusters.
  function canopy(w, h, clumps, seed, pal = ['leaf0', 'leaf1', 'leaf2', 'leaf3', 'leaf4', 'leaf5']) {
    const [c, x] = canvas(w, h), r = rng(seed), own = new Int16Array(w * h).fill(-1);
    const bump = clumps.map(() => [r() * 6.28, 3 + Math.floor(r() * 3)]);
    clumps.forEach(([cx, cy, cr], k) => {
      const [ph, n] = bump[k];
      for (let j = Math.max(0, Math.floor(cy - cr - 2)); j < Math.min(h, cy + cr + 2); j++) for (let i = Math.max(0, Math.floor(cx - cr - 2)); i < Math.min(w, cx + cr + 2); i++) {
        const dx = i + 0.5 - cx, dy = j + 0.5 - cy, a = Math.atan2(dy, dx), rr = cr + 1.1 * Math.sin(a * n * 2 + ph);
        if (dx * dx + dy * dy <= rr * rr) own[j * w + i] = k;
      }
    });
    const col = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = own[j * w + i]; if (k < 0) continue;
      const [cx, cy, cr] = clumps[k], dx = i + 0.5 - cx, dy = j + 0.5 - cy, lit = -(dx * 0.8 + dy) / (cr * 1.3);
      const edgeBR = (i + 1 < w && own[j * w + i + 1] !== k && own[j * w + i + 1] >= 0) || (j + 1 < h && own[(j + 1) * w + i] !== k && own[(j + 1) * w + i] >= 0);
      let t = lit > 0.55 ? 1 : lit > 0.1 ? 2 : lit > -0.45 ? 3 : 4;
      if (edgeBR) t = Math.min(5, t + 1);
      col.push([i, j, t]);
    }
    for (const [i, j, t] of col) { x.fillStyle = C(pal[t]); x.fillRect(i, j, 1, 1); }
    // leaf clusters: small hooked marks on a jittered grid, lighter in the lit area, darker in shade
    for (let j = 2; j < h - 2; j += 4) for (let i = 2 + ((j >> 2) % 2) * 2; i < w - 2; i += 5) {
      const k = own[j * w + i]; if (k < 0 || r() < 0.35) continue;
      const [cx, cy, cr] = clumps[k], lit = -((i - cx) * 0.8 + (j - cy)) / (cr * 1.3);
      const tone = lit > 0.3 ? pal[0] : lit > -0.2 ? pal[1] : lit > -0.6 ? pal[2] : pal[3];
      if (own[j * w + i + 1] === k && own[(j + 1) * w + i] === k) { x.fillStyle = C(tone); x.fillRect(i, j, 2, 1); x.fillRect(i + (lit > 0 ? 0 : 1), j + 1, 1, 1); }
    }
    // silhouette outline (sel-out: lighter on the top-left)
    const [o, ox] = canvas(w + 2, h + 2), a = x.getImageData(0, 0, w, h).data, M = (i, j) => i >= 0 && j >= 0 && i < w && j < h && a[(j * w + i) * 4 + 3] > 0;
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
      if (M(i, j)) continue;
      const n = M(i + 1, j) || M(i, j + 1), s = M(i - 1, j) || M(i, j - 1);
      if (n || s) { ox.fillStyle = C(s ? pal[5] : pal[4]); ox.fillRect(i + 1, j + 1, 1, 1); }
    }
    ox.drawImage(c, 1, 1);
    return o;
  }
  function tint(src, color) { const [c, x] = canvas(src.width, src.height); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return c; }

  /* ================================================================ STATION */
  function createStation() {
    const W = 420, H = 220, PB = 102, PE = 158;             // platform back edge, platform front edge
    const anchors = {
      courierStart: [8, 148], menderCustomer: [248, 152], mender: [268, 128], travellerCustomer: [292, 150], traveller: [312, 141],
      helenSeat: [372, 122], helenStand: [372, 152], benchCustomer: [344, 152], plaque: [79, 83], timetable: [166, 97], stall: [268, 134],
    };
    const hotspots = { plaque: [63, 74, 32, 19], timetable: [143, 83, 46, 36], mender: [252, 92, 32, 38], traveller: [298, 104, 44, 40], helen: [352, 92, 40, 42] };
    const DUSK = X.dusk;
    const lampXs = [12, 408], LAMP_BASE = 156;

    /* ---------- trees behind the fence: [x, trunk base y, canopy clumps (relative), seed, pine?] */
    const TREES = [
      { x: -6, y: 94, w: 58, h: 58, clumps: [[20, 26, 17], [40, 22, 15], [30, 40, 16], [12, 42, 12], [47, 40, 11]], seed: 3 },
      { x: 40, y: 72, w: 64, h: 60, clumps: [[32, 18, 17], [16, 30, 14], [48, 28, 15], [30, 40, 16], [52, 44, 10], [10, 46, 9]], seed: 5 },
      { x: 128, y: 96, w: 20, h: 70, pine: 1, seed: 7 },
      { x: 146, y: 94, w: 60, h: 56, clumps: [[28, 20, 16], [14, 32, 13], [44, 30, 14], [28, 40, 15]], seed: 9 },
      { x: 204, y: 96, w: 56, h: 62, clumps: [[26, 20, 15], [40, 30, 13], [14, 34, 12], [28, 44, 15], [46, 46, 9]], seed: 11 },
      { x: 258, y: 94, w: 64, h: 58, clumps: [[30, 22, 17], [48, 28, 13], [14, 32, 12], [32, 42, 15]], seed: 13, bloom: 1 },
      { x: 318, y: 96, w: 20, h: 76, pine: 1, seed: 15 },
      { x: 334, y: 94, w: 62, h: 60, clumps: [[30, 20, 16], [46, 30, 14], [14, 30, 13], [30, 42, 16], [50, 46, 9]], seed: 17 },
      { x: 386, y: 90, w: 50, h: 56, clumps: [[24, 22, 15], [36, 34, 13], [12, 36, 11], [26, 42, 13]], seed: 19 },
    ];
    function treeImg(tr) {
      if (tr.pine) {
        const [c, x] = canvas(tr.w + 8, tr.h + 8), cx = (tr.w >> 1) + 4;
        rect(x, cx - 1, tr.h - 8, 3, 16, 'wood4'); rect(x, cx, tr.h - 8, 1, 14, 'wood3');
        for (let k = 0; k < 5; k++) {
          const ty = 4 + k * 11, hw = 4 + k * 2.4, hh = 15;
          poly(x, [[cx + 0.5, ty - 2], [cx + hw + 3, ty + hh], [cx - hw - 2, ty + hh]], 'leaf6');
          poly(x, [[cx + 0.5, ty], [cx + hw + 2, ty + hh - 1], [cx - hw - 1, ty + hh - 1]], 'leaf4');
          poly(x, [[cx + 0.5, ty], [cx + 0.5, ty + hh - 1], [cx - hw - 1, ty + hh - 1]], 'leaf3');
          poly(x, [[cx, ty + 2], [cx, ty + hh - 5], [cx - hw * 0.5, ty + hh - 5]], 'leaf2');
          rect(x, cx - Math.round(hw) + 1, ty + hh - 2, Math.round(hw * 2), 1, 'leaf5');
        }
        return [c, cx];
      }
      const cp = canopy(tr.w, tr.h, tr.clumps, tr.seed);
      const [c, x] = canvas(tr.w + 2, tr.h + 30), cx = (tr.w >> 1) + 1;
      // trunk with a fork, drawn under the canopy
      rect(x, cx - 3, tr.h - 16, 7, 44, 'wood4'); rect(x, cx - 2, tr.h - 16, 5, 44, 'wood3'); rect(x, cx - 2, tr.h - 16, 2, 44, 'wood2');
      line(x, cx, tr.h - 10, cx - 7, tr.h - 20, 'wood4'); line(x, cx + 1, tr.h - 10, cx + 8, tr.h - 21, 'wood4');
      x.drawImage(cp, 0, 0);
      if (tr.bloom) {
        const r = rng(tr.seed * 7);
        for (let k = 0; k < 30; k++) {
          const [bx0, by0, br] = tr.clumps[k % tr.clumps.length], a = r() * 6.28, d = Math.sqrt(r()) * br * 0.8;
          const bx = Math.round(bx0 + Math.cos(a) * d) + 1, by = Math.round(by0 + Math.sin(a) * d) + 1;
          rect(x, bx, by, 2, 2, 'pink'); dot(x, bx, by, 'white'); dot(x, bx + 1, by + 1, 'rose');
        }
      }
      return [c, cx];
    }

    /* ---------- variants: 0 = bright afternoon, 1 = pastel dusk (cross-faded by state.tod) */
    const VAR = [null, null];
    function variant(k) {
      if (VAR[k]) return VAR[k];
      const dusk = k === 1;
      const trees = TREES.map(tr => { const [c, cx] = treeImg(tr); return { tr, c: dusk ? tint(c, DUSK) : c, cx }; });
      const v = { sky: buildSky(dusk), trees, mid: buildMid(dusk) };
      if (dusk) v.mid = tint(v.mid, DUSK);
      return (VAR[k] = v);
    }
    function buildSky(dusk) {
      const [c, x] = canvas(W, 96);
      const bands = dusk ? [['dusk4', 0, 10], ['dusk3', 10, 14], ['dusk2', 24, 16], ['dusk1', 40, 18], ['dusk0', 58, 38]] : [['sky4', 0, 10], ['sky3', 10, 14], ['sky2', 24, 16], ['sky1', 40, 18], ['sky0', 58, 38]];
      for (const [col, y, h] of bands) rect(x, 0, y, W, h, col);
      // far hills along the horizon
      for (let i = 0; i < W; i++) { const hh = Math.round(10 + 4 * Math.sin(i * 0.031) + 3 * Math.sin(i * 0.083 + 2)); rect(x, i, 96 - hh - 20, 1, hh + 20, dusk ? 'dusk4' : 'roofG0'); }
      for (let i = 0; i < W; i++) { const hh = Math.round(6 + 3 * Math.sin(i * 0.05 + 1)); rect(x, i, 96 - hh - 10, 1, hh + 10, dusk ? 'dusk5' : 'leaf1'); }
      return c;
    }
    const cloudShape = (x, cx, cy, w, dusk) => puffCloud(x, cx, cy, w, dusk ? ['dusk0', 'dusk1', 'dusk2'] : ['cloud0', 'cloud1', 'cloud2']);

    /* ---------- the static middle layer: fence, bushes, house, platform, track and grass */
    function buildMid(dusk) {
      const [c, x] = canvas(W, H);
      // bushes behind the fence
      const bushes = [[140, 70, 30, 24, 21], [166, 74, 26, 22, 22], [214, 72, 34, 24, 23], [262, 70, 30, 26, 24], [300, 74, 28, 22, 25], [356, 70, 34, 26, 26], [396, 74, 30, 24, 27]];
      for (const [bx, by, bw, bh, s] of bushes) {
        const cl = [[bw * 0.3, bh * 0.55, bh * 0.45], [bw * 0.62, bh * 0.45, bh * 0.5], [bw * 0.5, bh * 0.75, bh * 0.4]];
        x.drawImage(canopy(bw, bh + 4, cl, s, ['grass0', 'grass1', 'grass2', 'grass3', 'grass4', 'grass5']), bx - 1, by - 1);
        const r = rng(s * 3);
        for (let k = 0; k < 4; k++) { const fx = bx + 4 + Math.floor(r() * (bw - 8)), fy = by + 4 + Math.floor(r() * (bh - 10)), fc = ['pink', 'white', 'yellow', 'lilac'][k % 4]; rect(x, fx, fy, 2, 2, fc); dot(x, fx + 1, fy + 1, 'grass3'); }
      }
      // white picket fence along the back of the platform
      rect(x, 142, 86, W - 142, 2, 'cream2'); rect(x, 142, 93, W - 142, 2, 'cream2');
      rect(x, 142, 86, W - 142, 1, 'cream0'); rect(x, 142, 93, W - 142, 1, 'cream0');
      for (let px = 144; px < W; px += 6) {
        rect(x, px, 82, 4, 16, 'stone3'); rect(x, px + 1, 81, 2, 1, 'stone3');
        rect(x, px + 1, 82, 2, 15, 'cream0'); rect(x, px + 3, 83, 1, 14, 'cream2'); dot(x, px + 1, 82, 'white');
        rect(x, px + 1, 97, 4, 1, X.shade);
      }
      // grass verge with flowers in front of the fence and beside the house
      rect(x, 0, 96, W, PB - 96, 'grass2'); rect(x, 0, 96, W, 1, 'grass1');
      const fr = rng(41);
      for (let fx = 144; fx < W - 2; fx += 3 + Math.floor(fr() * 5)) { const fc = ['pink', 'yellow', 'white', 'lilac', 'rose'][Math.floor(fr() * 5)]; rect(x, fx, 97 + Math.floor(fr() * 2), 2, 2, fc); if (fr() < 0.5) dot(x, fx + 1, 99, 'grass4'); }
      // platform: weathered honey planks running along the track, staggered joints
      const pr = rng(43);
      for (let y = PB; y < PE; y += 7) {
        let px = -Math.floor(pr() * 40);
        while (px < W) {
          const len = 30 + Math.floor(pr() * 44), tone = [X.pkL, 'wood1', 'wood1', X.pkD][Math.floor(pr() * 4)];
          rect(x, px, y, len, 6, tone);
          if (pr() < 0.75) rect(x, px + 3 + Math.floor(pr() * Math.max(1, len - 16)), y + 2 + Math.floor(pr() * 3), 4 + Math.floor(pr() * 9), 1, tone === X.pkD ? 'wood2' : X.pkD);
          if (pr() < 0.15) { const kx = px + 6 + Math.floor(pr() * Math.max(1, len - 14)); rect(x, kx, y + 2, 3, 2, 'wood2'); dot(x, kx + 1, y + 2, 'wood3'); }
          rect(x, px + len - 1, y, 1, 6, 'wood3');
          px += len;
        }
        rect(x, 0, y + 6, W, 1, 'wood3');
      }
      rect(x, 0, PB, W, 2, X.shade);
      // edge: a lit nosing and the painted safety stripe, then the stone face
      rect(x, 0, PE, W, 1, 'wood0'); rect(x, 0, PE + 1, W, 2, 'cream0'); rect(x, 0, PE + 3, W, 1, 'yellow');
      rect(x, 0, PE + 4, W, 10, 'stone3');
      const sr = rng(45);
      for (let row = 0; row < 2; row++) { let bx = -Math.floor(sr() * 10); while (bx < W) { const bw = 10 + Math.floor(sr() * 8), by = PE + 4 + row * 5; rect(x, bx, by, bw - 1, 4, sr() < 0.3 ? 'stone2' : 'stone1'); rect(x, bx, by, bw - 1, 1, 'stone0'); bx += bw; } }
      rect(x, 0, PE + 14, W, 1, 'stone4');
      // moss and ivy spilling over the platform edge
      const mr = rng(49);
      for (let mx = 6 + Math.floor(mr() * 20); mx < W - 6; mx += 26 + Math.floor(mr() * 40)) {
        const mw = 5 + Math.floor(mr() * 7);
        rect(x, mx, PE + 4, mw, 2, 'grass3'); rect(x, mx + 1, PE + 4, mw - 2, 1, 'grass2'); dot(x, mx + 1, PE + 3, 'grass2');
        for (let k = 0; k < 2 + Math.floor(mr() * 2); k++) { const vx = mx + 1 + Math.floor(mr() * (mw - 2)), vl = 3 + Math.floor(mr() * 6); rect(x, vx, PE + 6, 1, vl, 'grass4'); dot(x, vx + 1, PE + 7 + Math.floor(vl / 2), 'grass2'); dot(x, vx - 1, PE + 6 + vl - 1, 'grass3'); }
      }
      // track bed: warm grey ballast, weathered sleepers, rails, weeds between
      const T0 = PE + 15, T1 = 200;
      rect(x, 0, T0, W, T1 - T0, 'stone1');
      rect(x, 0, T0, W, 3, X.shade);
      const gr = rng(47);
      for (let k = 0; k < 260; k++) {
        const gx = Math.floor(gr() * W), gy = T0 + 3 + Math.floor(gr() * (T1 - T0 - 4)), tone = gr();
        if (tone < 0.5) { rect(x, gx, gy, 3, 1, 'stone2'); rect(x, gx + 1, gy + 1, 2, 1, 'stone3'); rect(x, gx, gy - 1, 2, 1, 'stone0'); }
        else if (tone < 0.8) { rect(x, gx, gy, 2, 2, 'dirt1'); dot(x, gx + 1, gy + 1, 'dirt2'); }
        else { rect(x, gx, gy, 2, 1, 'stone0'); }
      }
      const sleepers = [];
      for (let sx = 2; sx < W; sx += 13 + Math.floor(gr() * 3)) sleepers.push([sx, Math.floor(gr() * 2), Math.floor(gr() * 2)]);
      for (const [sx, a, b2] of sleepers) {
        const y0 = T0 + 4 + a, h = T1 - T0 - 8 - a - b2;
        rect(x, sx, y0, 7, h, 'wood4'); rect(x, sx + 1, y0, 5, h - 1, 'wood3'); rect(x, sx + 1, y0, 5, 1, 'wood2'); rect(x, sx + 1, y0, 1, h - 1, 'wood2');
        rect(x, sx + 3, y0 + 3 + ((sx >> 2) % 5), 1, 4, 'wood4');
        rect(x, sx + 7, y0 + 1, 1, h - 1, X.shade);
        // ballast heaped over the sleeper ends and spilled across the wood
        rect(x, sx - 1, y0 - 1, 3, 2, 'stone2'); rect(x, sx + 4, y0 - 1, 4, 2, 'stone0'); rect(x, sx, y0 + h - 1, 4, 2, 'stone0'); rect(x, sx + 4, y0 + h - 1, 3, 2, 'stone2');
        const gy1 = y0 + 5 + Math.floor(gr() * 4), gy2 = y0 + 12 + Math.floor(gr() * 4);
        rect(x, sx + 1 + Math.floor(gr() * 3), gy1, 3, 1, 'stone1'); rect(x, sx + 2, gy1 + 1, 2, 1, 'stone2');
        rect(x, sx + Math.floor(gr() * 4), gy2, 2, 2, 'stone1'); dot(x, sx + 4, gy2 + 1, 'stone0');
      }
      for (const ry of [T0 + 7, T0 + 19]) {
        rect(x, 0, ry + 3, W, 1, X.shade);
        rect(x, 0, ry, W, 3, 'iron3'); rect(x, 0, ry, W, 1, 'iron0'); rect(x, 0, ry + 1, W, 1, 'iron1');
        for (const [sx] of sleepers) { rect(x, sx, ry + 2, 7, 2, 'iron4'); rect(x, sx + 1, ry + 2, 5, 1, 'iron2'); }
      }
      // weeds and flowers growing between the sleepers
      for (let k = 0; k + 1 < sleepers.length; k++) {
        if (gr() < 0.4) continue;
        const sx = sleepers[k][0] + 8 + Math.floor(gr() * 3), wy = T0 + 3 + Math.floor(gr() * (T1 - T0 - 9));
        rect(x, sx, wy + 2, 4, 1, 'grass3'); dot(x, sx, wy + 1, 'grass2'); dot(x, sx + 2, wy, 'grass2'); dot(x, sx + 3, wy + 1, 'grass1');
        if (gr() < 0.45) rect(x, sx + 1, wy - 1, 2, 2, ['yellow', 'white', 'pink', 'lilac'][Math.floor(gr() * 4)]);
      }
      // grass in front of the track, creeping over the ballast edge
      rect(x, 0, T1, W, H - T1, 'grass1');
      for (let gx = 0; gx < W; gx += 2 + Math.floor(gr() * 3)) { const h = 1 + Math.floor(gr() * 3); rect(x, gx, T1 - h, 2, h, gr() < 0.5 ? 'grass2' : 'grass1'); if (h > 2) dot(x, gx, T1 - h, 'grass0'); }
      rect(x, 0, T1 + 1, W, 1, 'grass0');
      const qr = rng(53);
      for (let k = 0; k < 60; k++) { const gx = Math.floor(qr() * W), gy = T1 + 4 + Math.floor(qr() * (H - T1 - 5)); rect(x, gx, gy, 3, 1, 'grass2'); dot(x, gx + 1, gy - 1, 'grass2'); }
      for (let k = 0; k < 30; k++) { const gx = Math.floor(qr() * W), gy = T1 + 4 + Math.floor(qr() * (H - T1 - 6)), fc = ['yellow', 'white', 'pink', 'lilac'][k % 4]; rect(x, gx, gy, 2, 2, fc); dot(x, gx + 1, gy + 1, fc === 'yellow' ? 'orange' : 'grass3'); }
      // flower clumps along the verge
      for (const [cx, cy, s] of [[96, 210, 91], [168, 214, 92], [236, 209, 93], [300, 213, 94], [352, 208, 95]]) {
        const cr = rng(s);
        ellipse(x, cx, cy + 2, 7, 3, 'grass3'); ellipse(x, cx - 1, cy + 1, 6, 2, 'grass2'); rect(x, cx - 4, cy, 3, 1, 'grass0');
        for (let k = 0; k < 5; k++) { const fx = cx - 5 + Math.floor(cr() * 10), fy = cy - 2 + Math.floor(cr() * 4), fc = ['pink', 'white', 'yellow', 'lilac', 'rose'][(k + s) % 5]; rect(x, fx, fy, 2, 2, fc); dot(x, fx, fy, fc === 'white' ? 'cream1' : 'white'); }
      }

      house(x, dusk);
      return c;
    }
    function house(x, dusk) {
      const L = 20, Rr = 140, WT = 69, WB = PB;          // front wall
      // wall: plaster in a timber frame
      rect(x, L, WT, Rr - L, WB - WT, 'wall1');
      for (let j = WT + 4; j < WB - 3; j += 6) for (let i = L + 4 + ((j / 6) % 2) * 5; i < Rr - 4; i += 11) rect(x, i, j, 3, 1, 'wall2');
      for (const px of [L, 58, 98, Rr - 4]) { rect(x, px, WT, 4, WB - WT, 'wood4'); rect(x, px + 1, WT, 2, WB - WT, 'wood3'); dot(x, px + 1, WT + 3, 'wood2'); }
      rect(x, L, WT, Rr - L, 3, 'wood4'); rect(x, L, WT + 1, Rr - L, 1, 'wood3');
      rect(x, L, WB - 4, Rr - L, 4, 'wood4'); rect(x, L, WB - 3, Rr - L, 2, 'wood3'); rect(x, L, WB - 3, Rr - L, 1, 'wood2');
      // roof: slate courses on a hipped roof, overhanging eaves
      const RT = 26, RB = WT + 1;
      poly(x, [[34, RT], [126, RT], [Rr + 6, RB], [L - 6, RB]], 'roofB4');
      poly(x, [[35, RT + 1], [125, RT + 1], [Rr + 4, RB - 1], [L - 4, RB - 1]], 'roofB2');
      for (let j = RT + 4, k = 0; j < RB - 1; j += 5, k++) {
        const t = (j - RT) / (RB - RT), xa = 35 - (35 - (L - 4)) * t, xb = 125 + (Rr + 4 - 125) * t;
        rect(x, xa, j, xb - xa, 1, 'roofB3'); rect(x, xa, j + 1, xb - xa, 1, 'roofB1');
        for (let sx = xa + ((k % 2) ? 3 : 6); sx < xb - 2; sx += 7) rect(x, sx, j + 1, 1, 4, 'roofB3');
      }
      // hip shading on the sides
      poly(x, [[35, RT + 1], [44, RT + 1], [L + 4, RB - 1], [L - 4, RB - 1]], 'roofB1');
      poly(x, [[116, RT + 1], [125, RT + 1], [Rr + 4, RB - 1], [Rr - 4, RB - 1]], 'roofB3');
      rect(x, 34, RT - 2, 92, 3, 'roofB4'); rect(x, 35, RT - 2, 90, 1, 'roofB1'); rect(x, 35, RT - 1, 90, 1, 'roofB2');
      // eave board and its shadow on the wall
      rect(x, L - 6, RB - 1, Rr - L + 12, 3, 'wood4'); rect(x, L - 5, RB - 1, Rr - L + 10, 1, 'wood2');
      rect(x, L, RB + 2, Rr - L, 3, X.shade);
      // chimney
      const CH = 106;
      rect(x, CH, 12, 12, 22, 'roofR4'); rect(x, CH + 1, 13, 10, 21, 'roofR1');
      for (let j = 15; j < 34; j += 4) { rect(x, CH + 1, j, 10, 1, 'roofR2'); for (let i = CH + 2 + ((j >> 2) % 2) * 3; i < CH + 11; i += 6) dot(x, i, j + 1, 'roofR2'); }
      rect(x, CH + 1, 13, 2, 21, 'roofR0');
      rect(x, CH - 1, 10, 16, 3, 'stone4'); rect(x, CH, 10, 14, 1, 'stone1'); rect(x, CH, 11, 14, 1, 'stone2');
      // window with shutters and a flower box
      const wx = 32, wy = 76, ww = 22, wh = 16;
      rect(x, wx - 1, wy - 1, ww + 2, wh + 2, 'wood4');
      rect(x, wx, wy, ww, wh, dusk ? 'light2' : 'sky2');
      rect(x, wx, wy, ww, 5, dusk ? 'light1' : 'sky1'); rect(x, wx + 2, wy + 1, 4, 1, 'white'); rect(x, wx + 2, wy + 2, 1, 3, 'white');
      rect(x, wx + 10, wy, 2, wh, 'wood2'); rect(x, wx, wy + 7, ww, 2, 'wood2');
      for (const sx of [wx - 8, wx + ww + 1]) { rect(x, sx, wy - 1, 7, wh + 2, 'roofG4'); rect(x, sx + 1, wy, 5, wh, 'roofG2'); for (let j = wy + 2; j < wy + wh; j += 3) rect(x, sx + 1, j, 5, 1, 'roofG3'); rect(x, sx + 1, wy, 1, wh, 'roofG1'); }
      rect(x, wx - 2, wy + wh + 1, ww + 4, 5, 'wood4'); rect(x, wx - 1, wy + wh + 2, ww + 2, 3, 'wood2'); rect(x, wx - 1, wy + wh + 2, ww + 2, 1, 'wood1');
      for (let k = 0; k < 7; k++) { const fx = wx - 1 + k * 3 + (k % 2), fc = ['rose', 'white', 'pink', 'yellow', 'rose', 'white', 'lilac'][k]; rect(x, fx, wy + wh - 1, 2, 2, fc); rect(x, fx + 1, wy + wh + 1, 1, 1, 'grass3'); }
      // enamel plaque: KEEPER / A. TATE
      const px = 63, py = 74, pw = 32, ph = 19;
      rect(x, px + 1, py + 1, pw, ph, X.shade);
      rect(x, px + 1, py, pw - 2, ph, 'roofB4'); rect(x, px, py + 1, pw, ph - 2, 'roofB4');
      rect(x, px + 1, py + 1, pw - 2, ph - 2, 'roofB2');
      rect(x, px + 2, py + 2, pw - 4, ph - 4, 'white');
      text(x, 'KEEPER', px + 16 - (textWidth('KEEPER') >> 1) + 1, py + 3, 'roofB4');
      text(x, 'A. TATE', px + 16 - (textWidth('A. TATE') >> 1), py + 10, 'roofB4');
      dot(x, px + 2, py + 2, 'roofB0'); dot(x, px + pw - 3, py + 2, 'roofB0'); dot(x, px + 2, py + ph - 3, 'roofB0'); dot(x, px + pw - 3, py + ph - 3, 'roofB0');
      // door, with a small window, knob and a stone step
      const dx = 104, dy = 74, dw = 18, dh = WB - 4 - dy;
      rect(x, dx - 2, dy - 2, dw + 4, dh + 2, 'wood4'); rect(x, dx - 1, dy - 1, dw + 2, 1, 'wood2');
      rect(x, dx, dy, dw, dh, 'wood2');
      for (let i = dx + 3; i < dx + dw; i += 4) rect(x, i, dy, 1, dh, 'wood3');
      rect(x, dx, dy, 1, dh, 'wood1');
      rect(x, dx + 4, dy + 3, 10, 7, 'wood4'); rect(x, dx + 5, dy + 4, 8, 5, dusk ? 'light2' : 'sky2'); rect(x, dx + 9, dy + 4, 1, 5, 'wood4'); dot(x, dx + 5, dy + 4, 'white');
      rect(x, dx + 14, dy + 13, 2, 2, 'brass1'); dot(x, dx + 14, dy + 13, 'brass0');
      rect(x, dx - 3, WB - 1, dw + 6, 4, 'stone3'); rect(x, dx - 2, WB - 1, dw + 4, 2, 'stone1'); rect(x, dx - 2, WB - 1, dw + 4, 1, 'stone0');
      // a potted plant beside the door
      const pp = 127;
      rect(x, pp, WB - 9, 8, 8, 'roofR3'); rect(x, pp + 1, WB - 8, 6, 6, 'roofR1'); rect(x, pp + 1, WB - 8, 2, 6, 'roofR0');
      ellipse(x, pp + 4, WB - 13, 5, 4, 'leaf4'); ellipse(x, pp + 3, WB - 14, 4, 3, 'leaf2'); rect(x, pp + 2, WB - 16, 2, 1, 'leaf1'); rect(x, pp + 5, WB - 17, 2, 2, 'pink'); rect(x, pp + 1, WB - 13, 2, 2, 'yellow');
    }

    /* ---------- props (sorted with actors) */
    const props = [];
    // timetable chalkboard on legs
    props.push(prop(140, 80, 52, 42, 118, x => {
      const bx = 144, by = 84, bw = 44, bh = 26;
      rect(x, bx + 4, 116, 38, 3, X.shade);
      for (const lx of [bx + 4, bx + bw - 7]) { rect(x, lx, by + bh, 3, 118 - by - bh, 'wood4'); rect(x, lx + 1, by + bh, 1, 118 - by - bh - 1, 'wood2'); }
      rect(x, bx, by, bw, bh, 'wood4'); rect(x, bx + 1, by + 1, bw - 2, bh - 2, 'wood1'); rect(x, bx + 1, by + 1, bw - 2, 1, 'wood0');
      rect(x, bx + 3, by + 3, bw - 6, bh - 6, 'stone4'); rect(x, bx + 3, by + 3, bw - 6, 1, 'stone5'); rect(x, bx + 3, by + 3, 1, bh - 6, 'stone5');
      text(x, 'EVENING', bx + (bw >> 1) - (textWidth('EVENING') >> 1), by + 5, 'cream0');
      rect(x, bx + 9, by + 11, bw - 18, 1, 'stone3');
      bigText(x, '18:17', bx + (bw >> 1) - textWidth('18:17'), by + 13, 'white', 2);
      rect(x, bx + 5, by + bh - 5, 3, 1, 'cream1'); rect(x, bx + bw - 9, by + bh - 5, 4, 1, 'roofR0');
    }));
    // BELLWOOD station sign hanging on two posts
    props.push(prop(188, 58, 60, 50, 106, x => {
      const p1 = 194, p2 = 240, top = 62;
      for (const px of [p1, p2]) { rect(x, px + 3, 104, 4, 2, X.shade); rect(x, px - 1, top, 4, 106 - top, 'roofG4'); rect(x, px, top, 2, 106 - top, 'roofG2'); dot(x, px, top + 1, 'roofG1'); rect(x, px - 2, top - 3, 6, 3, 'brass3'); rect(x, px - 1, top - 3, 4, 1, 'brass1'); rect(x, px - 2, 102, 6, 4, 'roofG4'); }
      rect(x, p1, top + 3, p2 - p1 + 2, 3, 'roofG4'); rect(x, p1, top + 4, p2 - p1 + 2, 1, 'roofG2');
      for (const cx of [p1 + 7, p2 - 5]) { rect(x, cx, top + 6, 1, 4, 'iron3'); }
      const sx = p1 + 2, sy = top + 10, sw = p2 - p1 - 2, sh = 13;
      rect(x, sx + 1, sy + 1, sw, sh, X.shade);
      rect(x, sx, sy, sw, sh, 'roofG4'); rect(x, sx + 1, sy + 1, sw - 2, sh - 2, 'roofG3'); rect(x, sx + 1, sy + 1, sw - 2, 1, 'roofG2');
      rect(x, sx + 2, sy + 2, sw - 4, sh - 4, 'roofG3');
      text(x, 'BELLWOOD', sx + (sw >> 1) - (textWidth('BELLWOOD') >> 1), sy + 4, 'cream0');
    }));
    // clock mender's stall: striped awning, table of clocks and gears, lamp (sorted in front of the mender)
    props.push(prop(236, 74, 72, 72, 142, x => stall(x), (g, t) => {
      const lv = curLamps; if (lv <= 0.02) return;
      const f = step(t, 8);
      rect(g, 286, 118 + (f % 3 === 0 ? 1 : 0), 1, f % 3 === 0 ? 2 : 3, 'light3');
    }));
    function stall(x) {
      const tx0 = 244, tx1 = 292, top = 126, front = 131, base = 142;
      rect(x, tx0 + 3, base, tx1 - tx0, 3, X.shade);
      // table with a striped cloth
      rect(x, tx0, top, tx1 - tx0, base - top, 'wood4');
      rect(x, tx0 + 1, top + 1, tx1 - tx0 - 2, front - top - 1, 'wood1'); rect(x, tx0 + 1, top + 1, tx1 - tx0 - 2, 1, 'wood0');
      for (let i = tx0 + 1; i < tx1 - 1; i += 6) { rect(x, i, front, 3, base - front - 2, 'cream0'); rect(x, i + 3, front, 3, base - front - 2, X.sg1); }
      rect(x, tx0 + 1, front, tx1 - tx0 - 2, 1, 'cream1');
      for (let i = tx0 + 1; i < tx1 - 1; i += 2) dot(x, i, base - 2, 'cream1');
      rect(x, tx0 + 2, base - 1, 2, 1, 'wood4'); rect(x, tx1 - 4, base - 1, 2, 1, 'wood4');
      // wares: mantel clock, alarm clock, a pocket watch, gears, a loupe
      x.drawImage(S(`
        ..oooo..
        .oaaabo.
        oawwwwbo
        oawkwwbo
        oawkkwbo
        oawwwwbo
        oaaaaabo
        oooooooo`, { o: 'wood4', a: 'wood1', b: 'wood2', w: 'cream0', k: 'ink2' }), 247, top - 6);
      x.drawImage(S(`
        oo...oo
        oroooro
        .owwwo.
        owwkwwo
        owwkkwo
        .owwwo.
        oo...oo`, { o: 'roofR3', r: 'rose', w: 'cream0', k: 'ink2' }), 257, top - 5);
      disc(x, 269.5, top + 2.5, 2.6, (d, lit) => d > 1.9 ? 'brass3' : lit > 0 ? 'brass0' : 'cream0'); rect(x, 272, top + 1, 2, 1, 'brass2');
      for (const [gx, gy, r] of [[277, top + 2, 3], [282, top + 3, 2]]) { disc(x, gx + 0.5, gy + 0.5, r + 1, (d, lit, dx, dy) => d > r ? ((Math.round(Math.atan2(dy, dx) * 8 / Math.PI) & 1) ? 'brass2' : null) : d < 1 ? 'brass3' : lit > 0 ? 'brass1' : 'brass2'); }
      // little oil lamp (flame animated when lamps are lit)
      rect(x, 284, 124, 5, 3, 'brass2'); rect(x, 284, 124, 2, 1, 'brass0'); rect(x, 285, 116, 3, 8, 'stone1'); rect(x, 286, 117, 1, 6, 'cream0');
      // awning poles and striped canopy
      for (const px of [tx0, tx1 - 2]) { rect(x, px, 86, 2, base - 86, 'wood4'); rect(x, px, 86, 1, base - 86, 'wood2'); }
      const ax0 = tx0 - 4, ax1 = tx1 + 4, at = 80, ab = 92;
      poly(x, [[ax0 + 5, at], [ax1 - 5, at], [ax1, ab], [ax0, ab]], 'roofR3');
      for (let i = 0; i < 9; i++) {
        const u0 = i / 9, u1 = (i + 1) / 9, xa = ax0 + 5 + (ax1 - ax0 - 10) * u0, xb = ax0 + 5 + (ax1 - ax0 - 10) * u1, xc = ax0 + (ax1 - ax0) * u0, xd = ax0 + (ax1 - ax0) * u1;
        poly(x, [[xa, at + 1], [xb, at + 1], [xd, ab], [xc, ab]], i % 2 ? 'cream0' : 'roofR1');
      }
      rect(x, ax0 + 5, at, ax1 - ax0 - 10, 1, 'roofR3');
      // scalloped valance
      for (let i = 0; i < 9; i++) {
        const xa = Math.round(ax0 + (ax1 - ax0) * i / 9), xb = Math.round(ax0 + (ax1 - ax0) * (i + 1) / 9), cc = i % 2 ? 'cream0' : 'roofR1', ww = xb - xa;
        rect(x, xa, ab, ww, 4, cc); rect(x, xa + 1, ab + 4, ww - 2, 1, cc); rect(x, xa, ab + 3, 1, 2, 'roofR3'); rect(x, xa + 1, ab + 5, ww - 2, 1, 'roofR3');
      }
      rect(x, ax0, ab, ax1 - ax0, 1, 'roofR3');
      rect(x, ax0, ab + 4, ax1 - ax0, 1, X.shade);
      // name board pinned to the table cloth
      const sx = 256, sy = front + 2;
      rect(x, sx, sy, 25, 9, 'wood4'); rect(x, sx + 1, sy + 1, 23, 7, 'cream0'); rect(x, sx + 1, sy + 7, 23, 1, 'cream1');
      text(x, 'CLOCKS', sx + 1 + ((23 - textWidth('CLOCKS')) >> 1), sy + 2, 'roofR3');
      // round clock sign on a bracket off the right pole (hands at 18:17)
      rect(x, tx1 - 1, 100, 7, 1, 'wood4'); dot(x, tx1 + 5, 101, 'wood4');
      disc(x, 299.5, 108.5, 5.6, (d, lit) => d > 4.8 ? 'wood4' : d > 3.6 ? (lit > 0 ? 'brass1' : 'brass2') : 'cream0');
      line(x, 299, 108, 299, 110, 'ink2'); line(x, 299, 108, 301, 108, 'ink2');
    }
    // traveller's suitcase (marked A.T.)
    props.push({ y: 141, draw: g => { const s = item('suitcase', 'sm'); rect(g, 324, 139, s.width - 1, 2, X.shade); g.drawImage(s, 322, 141 - s.height); } });
    // bench (drawn just before a seated Helen)
    props.push(prop(338, 96, 68, 44, anchors.helenSeat[1] - 0.5, x => bench(x)));
    function bench(x) {
      const x0 = 346, x1 = 398, seat = 124, base = 136, mid = (x0 + x1) >> 1;
      rect(x, x0 + 3, base - 1, x1 - x0 + 3, 3, X.shade);
      rect(x, x0 + 2, seat + 3, x1 - x0 - 1, base - seat - 4, X.shade);
      // backrest: three outlined slats
      for (const j of [103, 109, 115]) { rect(x, x0, j, x1 - x0, 5, 'wood4'); rect(x, x0 + 1, j + 1, x1 - x0 - 2, 3, 'wood1'); rect(x, x0 + 1, j + 1, x1 - x0 - 2, 1, 'wood0'); rect(x, x0 + 1, j + 3, x1 - x0 - 2, 1, 'wood2'); }
      // seat seen from above, and its front edge
      rect(x, x0 - 1, seat - 5, x1 - x0 + 2, 9, 'wood4');
      rect(x, x0, seat - 4, x1 - x0, 2, 'wood0'); rect(x, x0, seat - 2, x1 - x0, 1, 'wood2'); rect(x, x0, seat - 1, x1 - x0, 2, 'wood1');
      rect(x, x0, seat + 1, x1 - x0, 2, 'wood2'); rect(x, x0, seat + 2, x1 - x0, 1, 'wood3');
      // cast-iron ends in railway teal (front view): scrolled back post, a wide armrest seen from above, a splayed front leg
      const endRows = (scroll, post) => [...scroll, ...Array(9).fill(post), 'oooooooo', 'oaaaaaao', 'oaabbbbo', 'oabbbbco', 'oabbbbco', '.obbbco.', ...Array(12).fill('..obco..'), '.oobcoo.', 'oabbbbco', 'oooooooo'];
      const endKey = { o: 'roofG4', a: 'roofG0', b: 'roofG2', c: 'roofG3' };
      const endL = sprite(endRows(['.ooo....', 'oaaao...', 'oabco...'], '.obo....'), endKey);
      const endR = sprite(endRows(['....ooo.', '...oaaao', '...oabco'], '....obo.'), endKey);
      x.drawImage(endL, x0 - 4, base - endL.height); x.drawImage(endR, x1 - 4, base - endR.height);
      rect(x, mid - 1, seat + 3, 3, base - seat - 3, 'roofG4'); rect(x, mid, seat + 3, 1, base - seat - 4, 'roofG2');
      // a folded newspaper left on the seat
      rect(x, x1 - 16, seat - 5, 9, 3, 'stone2'); rect(x, x1 - 16, seat - 5, 8, 2, 'cream0'); rect(x, x1 - 14, seat - 4, 4, 1, 'stone2');
    }
    // lamp posts at each end
    for (const lx of lampXs) props.push({ y: LAMP_BASE, draw: (g, t) => lampPost(g, lx, t) });
    const lampImgs = {};
    function lampHead(lit, fr) {
      const k = lit + ':' + fr; if (lampImgs[k]) return lampImgs[k];
      const glass = lit ? { g: 'light1', h: 'light0', F: fr ? 'light3' : 'light2' } : { g: 'sky2', h: 'sky1', F: 'stone3' };
      return (lampImgs[k] = sprite([
        '.....o.....',
        '....oao....',
        '...oaabo...',
        '..ooooooo..',
        '.oaabbbbco.',
        'ooooooooooo',
        '.oghhhhhgo.',
        '.oghhFhhgo.',
        '.oghFFFhgo.',
        '.oghFFFhgo.',
        '.oggggggdo.',
        'ooooooooooo',
        '..oabbbco..',
        '...ooooo...'], { o: 'roofG4', a: 'roofG0', b: 'roofG1', c: 'roofG2', d: 'roofG3', ...glass }));
    }
    function lampPost(g, lx, t) {
      const b = LAMP_BASE, lv = curLamps;
      PX.shadow(g, lx + 3, b, 8, 2);
      rect(g, lx - 4, b - 6, 9, 6, 'roofG4'); rect(g, lx - 3, b - 6, 7, 1, 'roofG0'); rect(g, lx - 3, b - 5, 7, 4, 'roofG2'); rect(g, lx - 3, b - 5, 1, 4, 'roofG1');
      rect(g, lx - 3, b - 9, 7, 3, 'roofG4'); rect(g, lx - 2, b - 9, 5, 1, 'roofG1');
      rect(g, lx - 1, b - 52, 3, 43, 'roofG4'); rect(g, lx, b - 52, 1, 43, 'roofG1');
      rect(g, lx - 2, b - 27, 5, 3, 'roofG4'); rect(g, lx - 1, b - 27, 3, 1, 'roofG0');
      rect(g, lx - 5, b - 50, 11, 2, 'roofG4'); rect(g, lx - 4, b - 50, 9, 1, 'roofG1'); dot(g, lx - 6, b - 51, 'roofG4'); dot(g, lx + 6, b - 51, 'roofG4');
      const fr = lv > 0.02 && !stillNow ? (hash(step(t, 7) + lx) > 0.5 ? 1 : 0) : 0;
      g.drawImage(lampHead(lv > 0.02, fr), lx - 5, b - 66);
    }
    // milk churn by the house, flower planters along the back of the platform
    props.push(prop(126, 96, 14, 20, 114, x => {
      rect(x, 129, 112, 10, 2, X.shade);
      const m = mask(9, 14, g => { rect(g, 2, 0, 5, 2, '#000'); rect(g, 3, 2, 3, 3, '#000'); rect(g, 1, 5, 7, 9, '#000'); rect(g, 0, 7, 9, 5, '#000'); });
      x.drawImage(bevel(m, { o: 'iron4', ol: 'iron3', h: 'iron0', b: 'iron1', s: 'iron2' }, 1, 1), 128, 100);
      rect(x, 128, 106, 9, 1, 'iron3'); dot(x, 127, 107, 'iron4'); dot(x, 137, 107, 'iron4');
    }));
    for (const [px, py, s] of [[206, 112, 71], [398, 110, 73]]) props.push(prop(px - 2, py - 20, 28, 24, py, x => planter(x, px, py, s)));
    function planter(x, px, py, s) {
      rect(x, px + 2, py - 1, 22, 2, X.shade);
      const r = rng(s);
      ellipse(x, px + 11, py - 11, 11, 5, 'leaf4'); ellipse(x, px + 10, py - 12, 9, 4, 'leaf2'); rect(x, px + 5, py - 15, 4, 1, 'leaf1');
      for (let k = 0; k < 7; k++) { const fx = px + 3 + Math.floor(r() * 16), fy = py - 16 + Math.floor(r() * 6), fc = ['pink', 'yellow', 'white', 'rose', 'lilac'][k % 5]; rect(x, fx, fy, 2, 2, fc); if (fc !== 'white') dot(x, fx, fy, 'white'); }
      rect(x, px, py - 9, 22, 9, 'wood4'); rect(x, px + 1, py - 8, 20, 7, 'wood2'); rect(x, px + 1, py - 8, 20, 1, 'wood1');
      for (let i = px + 5; i < px + 20; i += 5) rect(x, i, py - 8, 1, 7, 'wood3');
      rect(x, px, py - 6, 22, 1, 'iron3'); rect(x, px, py - 3, 22, 1, 'iron3');
    }

    /* ---------- dynamic helpers */
    let curLamps = 0, stillNow = false, curTod = 0;
    // at dusk, static props cross-fade toward a cached warm-tinted copy (same as the ground layers)
    const duskCache = new WeakMap();
    const duskOf = c => { let d = duskCache.get(c); if (!d) { d = tint(c, DUSK); duskCache.set(c, d); } return d; };
    const fgBushDusk = duskOf;
    for (const p of props) if (p.c) {
      const base = p.draw;
      p.draw = (g, t) => { base(g, t); if (curTod > 0) { g.globalAlpha = curTod; g.drawImage(duskOf(p.c), p.x0, p.y0); g.globalAlpha = 1; } };
    }
    const clouds = [[20, 8, 34], [150, 16, 26], [260, 6, 38], [360, 20, 24]];
    const birdA = S(`
      .oo..
      oaeo.
      obbbo
      .occco
      ..y.y`, { o: 'wood4', a: 'wood1', b: 'wood2', c: 'cream0', e: 'ink', y: 'orange' });
    const birdB = S(`
      ..oo.
      .oaeo
      oobbo
      occco.
      .y.y.`, { o: 'roofB3', a: 'roofB1', b: 'roofB0', c: 'yellow', e: 'ink', y: 'orange' });
    const tuft = [S(`
      .g..g
      .g.gg
      gGgG.
      GGGG.`, { g: 'grass2', G: 'grass3' }), S(`
      g..g.
      gg.g.
      .GgGg
      .GGGG`, { g: 'grass2', G: 'grass3' })];
    // foreground bushes framing the bottom corners
    const fgBush = [[-8, 200, 46, 24, 81], [384, 198, 44, 26, 83]].map(([bx, by, bw, bh, s]) => {
      const c = canopy(bw, bh, [[bw * 0.3, bh * 0.6, bh * 0.5], [bw * 0.62, bh * 0.5, bh * 0.55], [bw * 0.5, bh * 0.85, bh * 0.45]], s, ['grass0', 'grass1', 'grass2', 'grass3', 'grass4', 'grass5']);
      const x = c.getContext('2d'), r = rng(s);
      for (let k = 0; k < 6; k++) { const fx = 4 + Math.floor(r() * (bw - 8)), fy = 3 + Math.floor(r() * (bh - 10)), fc = ['yellow', 'white', 'pink'][k % 3]; rect(x, fx, fy, 2, 2, fc); dot(x, fx + 1, fy + 1, fc === 'yellow' ? 'orange' : 'rose'); }
      return [c, bx, by];
    });
    const tufts = [], backTufts = []; { const r = rng(61); for (let k = 0; k < 30; k++) tufts.push([Math.floor(r() * (W - 6)), 206 + Math.floor(r() * 12), r() * 6]); }
    for (let k = 0; k < 14; k++) backTufts.push([146 + k * 20 + (k % 3) * 3, 101, k * 0.7]);
    for (let k = 0; k < 12; k++) tufts.push([12 + k * 35 + (k % 3) * 6, 202, k * 0.9]);

    function draw(g, view, actors) {
      const st = view.state || {}, still = !!st.still, t = still ? 0 : view.t;
      const tod = Math.max(0, Math.min(1, +st.tod || 0)), lv = Math.max(0, Math.min(1, st.lamps == null ? 0 : +st.lamps));
      curLamps = lv; stillNow = still; curTod = tod;
      const layers = tod < 1 ? [[variant(0), 1]] : [];
      if (tod > 0) layers.push([variant(1), tod < 1 ? tod : 1]);

      // sky, drifting clouds and a distant train puffing across the hills
      for (const [v, a] of layers) { g.globalAlpha = a; g.drawImage(v.sky, 0, 0); }
      g.globalAlpha = 1;
      for (const [cx, cy, w] of clouds) { const span = W + 60, px = Math.round(((cx + t * (1 + w / 40)) % span + span) % span) - 50; cloudShape(g, px, cy, w, tod > 0.5); }
      if (!still) {
        const tb0 = Math.floor(t / 0.7);
        for (let k = 0; k < 6; k++) {
          const tb = (tb0 - k) * 0.7, age = t - tb, trainX = ((tb * 9) % 520) - 50;
          const px = Math.round(trainX), py = Math.round(62 - age * 4), r = 2 + Math.floor(age);
          if (age > 4) continue;
          ellipse(g, px, py, r + 1, r, tod > 0.5 ? 'dusk1' : 'cloud1'); ellipse(g, px - 1, py - 1, r, r - 1, tod > 0.5 ? 'dusk0' : 'cloud0');
        }
      }
      // trees sway: the upper part of each canopy shifts a pixel on a slow stepped cycle
      for (const [v, a] of layers) {
        g.globalAlpha = a;
        v.trees.forEach(({ tr, c, cx }, k) => {
          const x0 = tr.x - cx + (tr.w >> 1), y0 = tr.y - c.height, sway = still ? 0 : Math.round(Math.sin(t * 0.9 + k * 1.3) * 1.2);
          const top = Math.floor(c.height * 0.45);
          g.drawImage(c, 0, 0, c.width, top, x0 + sway, y0, c.width, top);
          g.drawImage(c, 0, top, c.width, c.height - top, x0, y0 + top, c.width, c.height - top);
        });
      }
      for (const [v, a] of layers) { g.globalAlpha = a; g.drawImage(v.mid, 0, 0); }
      g.globalAlpha = 1;
      for (const [tx, ty, ph] of backTufts) g.drawImage(tuft[still ? 0 : (step(t * 0.8 + ph, 1.5) % 2)], tx, ty - 4);

      // chimney smoke
      if (!still) for (let k = 0; k < 4; k++) {
        const age = (t * 0.6 + k * 0.25) % 1, px = 112 + Math.round(age * 10 + Math.sin(t + k) * 1.5), py = 8 - Math.round(age * 22), r = 1 + Math.floor(age * 4);
        ellipse(g, px, py, r, r, tod > 0.5 ? 'dusk1' : 'cloud1'); if (r > 1) dot(g, px - 1, py - 1, tod > 0.5 ? 'dusk0' : 'white');
      }
      // birds hopping on the fence
      for (let k = 0; k < 2; k++) {
        const period = 2.6 + k * 0.7, n = still ? 0 : Math.floor((t + k * 1.1) / period), ph = still ? 1 : ((t + k * 1.1) / period) % 1;
        const base = k ? 300 : 186, span = 40, pos = (n * 7 + k * 11) % span, prev = ((n - 1) * 7 + k * 11) % span;
        const hop = ph < 0.18 ? ph / 0.18 : 1, bx = Math.round(base + prev + (pos - prev) * hop), by = 77 - (ph < 0.18 ? Math.round(Math.sin(hop * Math.PI) * 3) : 0);
        const img = k ? birdB : birdA, face = pos >= prev ? 1 : -1;
        g.drawImage(face > 0 ? img : PX.flip(img), bx, by);
      }
      // lamp light pools (hard-edged, stepped)
      if (lv > 0.02) {
        for (const lx of lampXs) {
          const f = still ? 0 : (hash(step(t, 5) * 3 + lx) > 0.6 ? 1 : 0), s = 0.4 + 0.6 * lv;
          ellipse(g, lx, LAMP_BASE - 2, Math.round(34 * s) + f, Math.round(12 * s), X.glow);
          ellipse(g, lx, LAMP_BASE - 2, Math.round(23 * s), Math.round(8 * s), X.glow);
          ellipse(g, lx, LAMP_BASE - 2, Math.round(12 * s), Math.round(4 * s), X.glow2);
          ellipse(g, lx, LAMP_BASE - 58, Math.round(16 * s) + f, Math.round(15 * s) + f, X.glow);
          ellipse(g, lx, LAMP_BASE - 58, Math.round(10 * s), Math.round(9 * s), X.glow2);
        }
        ellipse(g, 286, 118, Math.round(10 * (0.4 + 0.6 * lv)), Math.round(9 * (0.4 + 0.6 * lv)), X.glow);
      }
      drawSorted(g, props, actors, t);

      // foreground: grass tufts sway, corner bushes, butterflies and falling leaves
      for (const [tx, ty, ph] of tufts) g.drawImage(tuft[still ? 0 : (step(t * 0.8 + ph, 1.5) % 2)], tx, ty - 4);
      for (const [c, bx, by] of fgBush) { if (tod > 0) { g.drawImage(c, bx, by); g.globalAlpha = tod; g.drawImage(fgBushDusk(c), bx, by); g.globalAlpha = 1; } else g.drawImage(c, bx, by); }
      if (!still) {
        for (let k = 0; k < 3; k++) {
          const cx = [180, 330, 70][k], cy = [128, 116, 190][k];
          const bx = Math.round(cx + Math.sin(t * 0.7 + k * 2) * 22 + Math.sin(t * 1.9 + k) * 6), by = Math.round(cy + Math.sin(t * 1.1 + k * 3) * 8);
          const open = step(t, 8 + k) % 2, col = ['yellow', 'white', 'lilac'][k];
          rect(g, bx, by, 1, 2, 'ink2');
          if (open) { rect(g, bx - 2, by - 1, 2, 2, col); rect(g, bx + 1, by - 1, 2, 2, col); dot(g, bx - 2, by + 1, col); dot(g, bx + 2, by + 1, col); }
          else { rect(g, bx - 1, by - 1, 1, 2, col); rect(g, bx + 1, by - 1, 1, 2, col); }
        }
        for (let k = 0; k < 5; k++) {
          const fall = 7 + k * 1.5, span = 150, y = ((t * fall + k * 37) % span), x0 = [60, 170, 240, 300, 380][k];
          const lx = Math.round(x0 + Math.sin(t * 1.4 + k) * 7 + y * 0.15), ly = Math.round(30 + y);
          const col = ['leaf1', 'yellow', 'orange', 'leaf0', 'yellow'][k];
          if (step(t, 3) % 2) { rect(g, lx, ly, 2, 1, col); dot(g, lx + 1, ly + 1, col); } else { rect(g, lx, ly + 1, 2, 1, col); dot(g, lx, ly, col); }
        }
      }
    }

    return { w: W, h: H, bg: '#b6e36b', anchors, hotspots, paths: {}, draw };
  }

  window.INTERIORS = { createShop, createStation };
  window.IT = { item, icon };
})();
