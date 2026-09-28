'use strict';
/* Bellwood, the village of "The Shop That Opens Once" (v2). Every pixel is authored here in code.
   window.WORLD.createVillage() returns a scene that follows the ART.md scene contract:
   { w, h, bg, anchors, paths, draw(ctx, view, actors) }. Static layers are cached per time-of-day
   variant (0 day, 1 dusk, 2 blue hour); everything that moves is drawn per frame from view.t. */
(() => {
  const { PAL: P, rng } = PX;
  // Build canvases are CPU-backed: grading and recolouring read pixels back, and GPU readbacks stall.
  function canvas(w, h) {
    const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false; return [c, x];
  }
  function sprite(rows, key) {
    const [c, x] = canvas(Math.max(...rows.map(r => r.length)), rows.length);
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.' && r[i] !== ' ') { x.fillStyle = hex(key[r[i]]); x.fillRect(i, j, 1, 1); } });
    return c;
  }
  function outline(src, color) { // 1px outline around opaque pixels (result is 2px larger)
    const w = src.width, h = src.height, [c, x] = canvas(w + 2, h + 2), s = src.getContext('2d').getImageData(0, 0, w, h).data;
    const a = (i, j) => i >= 0 && j >= 0 && i < w && j < h && s[(j * w + i) * 4 + 3] > 0;
    x.fillStyle = hex(color);
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) if (!a(i, j) && (a(i - 1, j) || a(i + 1, j) || a(i, j - 1) || a(i, j + 1))) x.fillRect(i + 1, j + 1, 1, 1);
    x.drawImage(src, 1, 1); return c;
  }
  function recolor(src, map) {
    const [c, x] = canvas(src.width, src.height); x.drawImage(src, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data, m = new Map(Object.entries(map).map(([f, t]) => [rgbOf(f).join(), rgbOf(t)]));
    for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const t = m.get(p[i] + ',' + p[i + 1] + ',' + p[i + 2]); if (t) { p[i] = t[0]; p[i + 1] = t[1]; p[i + 2] = t[2]; } }
    x.putImageData(d, 0, 0); return c;
  }
  const W = 720, H = 560;

  // Extra colours, hue-shifted from PX.PAL ramps (vista atmosphere and the light evening sky).
  const C = {
    far0: '#eceafc', far1: '#d5d5f5', far2: '#bcbde9', far3: '#a3a4da',
    mid0: '#dcf2a8', mid1: '#bfe391', mid2: '#9fd07f', mid3: '#7fb77a',
    eve0: '#f6e6ee', eve1: '#dcdef8', eve2: '#c1c6f1', eve3: '#a7ace6',
  };
  const hex = c => P[c] || C[c] || c;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  // Build-time pixel helpers; the fillStyle cache avoids re-parsing a colour for every pixel.
  const ink = (x, c) => { c = hex(c); if (x._ink !== c) { x.fillStyle = c; x._ink = c; } };
  const R = (x, px, py, w, h, c) => { ink(x, c); x.fillRect(px | 0, py | 0, w | 0, h | 0); };
  const D = (x, px, py, c) => { ink(x, c); x.fillRect(px | 0, py | 0, 1, 1); };
  const E = (x, cx, cy, rx, ry, c) => (x._ink = null, PX.ellipse)(x, Math.round(cx), Math.round(cy), Math.max(0, Math.round(rx)), Math.max(0, Math.round(ry)), hex(c));
  const TX = (x, s, px, py, c) => { x._ink = null; PX.text(x, s, px, py, hex(c)); };
  const L = (x, x0, y0, x1, y1, c) => { x._ink = null; PX.line(x, x0, y0, x1, y1, hex(c)); };
  // Draw ASCII rows at (px, py) with a key, straight onto a context (transparent '.').
  function S(x, px, py, rows, key) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const k = r[i]; if (k !== '.' && k !== ' ') D(x, px + i, py + j, key[k]); } });
  }
  // Scanline polygon fill (pixel centres, even-odd), crisp.
  function poly(x, pts, c) {
    ink(x, c);
    let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc) !== (by <= yc)) xs.push(ax + ((yc - ay) * (bx - ax)) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const a = Math.round(xs[k]), b = Math.round(xs[k + 1]); if (b > a) x.fillRect(a, y, b - a, 1); }
    }
  }
  // Integer hash and smooth value noise (only used at build time, for chunky shapes, never speckle).
  function hash(x, y, s) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // Poisson-disc scatter by dart throwing on a grid: points at least r apart inside box where ok(x, y).
  function scatter(seed, r, box, ok, density = 3) {
    const [x0, y0, w, h] = box, rnd = rng(seed), cs = r / Math.SQRT2, gw = Math.ceil(w / cs) + 1, gh = Math.ceil(h / cs) + 1;
    const grid = new Int32Array(gw * gh).fill(-1), pts = [], n = Math.ceil(((w * h) / (r * r)) * density);
    for (let i = 0; i < n; i++) {
      const x = x0 + rnd() * w, y = y0 + rnd() * h;
      if (!ok(x | 0, y | 0)) continue;
      const gx = ((x - x0) / cs) | 0, gy = ((y - y0) / cs) | 0; let bad = false;
      for (let j = Math.max(0, gy - 2); j <= Math.min(gh - 1, gy + 2) && !bad; j++)
        for (let q = Math.max(0, gx - 2); q <= Math.min(gw - 1, gx + 2); q++) {
          const k = grid[j * gw + q]; if (k >= 0 && (pts[k][0] - x) ** 2 + (pts[k][1] - y) ** 2 < r * r) { bad = true; break; }
        }
      if (bad) continue;
      grid[gy * gw + gx] = pts.length; pts.push([x | 0, y | 0, rnd(), rnd()]);
    }
    return pts;
  }
  // Distance from p to segment ab, and the segment parameter.
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1), qx = ax + t * dx - px, qy = ay + t * dy - py;
    return [Math.sqrt(qx * qx + qy * qy), t];
  }
  // Min distance to a polyline; returns [d, index, t].
  function lineDist(px, py, pts) {
    let best = [1e9, 0, 0];
    for (let i = 0; i + 1 < pts.length; i++) { const [d, t] = segDist(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (d < best[0]) best = [d, i, t]; }
    return best;
  }

  /* ---------- time of day: a palette swap per variant, blended with alpha ---------- */
  const rgbOf = c => { const h = hex(c); return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
  const toHex = (r, g, b) => '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
  function grade(r, g, b, v) {
    if (!v) return [r, g, b];
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255, s = 1 - l;
    if (v === 1) return [clamp(r * 0.98 + 6 + s * 22, 0, 255), clamp(g * 0.87 + 6 + s * 4, 0, 255), clamp(b * 0.83 + 14 + s * 34, 0, 255)]; // pastel dusk
    return [clamp(r * 0.72 + 10 + s * 16, 0, 255), clamp(g * 0.77 + 16 + s * 14, 0, 255), clamp(b * 0.84 + 50 + s * 32, 0, 255)];            // light blue hour
  }
  const graded = new WeakMap();
  function G(img, v) {
    if (!v) return img;
    let e = graded.get(img); if (!e) graded.set(img, (e = []));
    if (e[v]) return e[v];
    const [c, x] = canvas(img.width, img.height); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data, m = new Map();
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const k = (p[i] << 16) | (p[i + 1] << 8) | p[i + 2];
      let o = m.get(k); if (!o) m.set(k, (o = grade(p[i], p[i + 1], p[i + 2], v)));
      p[i] = o[0]; p[i + 1] = o[1]; p[i + 2] = o[2];
    }
    x.putImageData(d, 0, 0); return (e[v] = c);
  }
  // Current blend (set once per frame): variant A, then variant B on top with alpha F.
  const T = { a: 0, b: 0, f: 0, tod: 0 };
  function setTod(tod) {
    tod = clamp(+tod || 0, 0, 2); T.tod = tod;
    let a = Math.floor(tod), f = tod - a;
    if (a >= 2) { a = 2; f = 0; }
    if (f > 0.98) { a += 1; f = 0; }
    if (f < 0.02) f = 0;
    T.a = a; T.b = Math.min(2, a + 1); T.f = f;
  }
  function blit(ctx, img, x, y) {
    ctx.drawImage(G(img, T.a), x, y);
    if (T.f) { ctx.globalAlpha = T.f; ctx.drawImage(G(img, T.b), x, y); ctx.globalAlpha = 1; }
  }
  // Blit a sub-rect of a world-sized layer (cheap for the big cached layers).
  function blitRect(ctx, img, sx, sy, sw, sh) {
    sx = Math.max(0, sx); sy = Math.max(0, sy); sw = Math.min(img.width - sx, sw); sh = Math.min(img.height - sy, sh);
    if (sw <= 0 || sh <= 0) return;
    ctx.drawImage(G(img, T.a), sx, sy, sw, sh, sx, sy, sw, sh);
    if (T.f) { ctx.globalAlpha = T.f; ctx.drawImage(G(img, T.b), sx, sy, sw, sh, sx, sy, sw, sh); ctx.globalAlpha = 1; }
  }
  // Per-frame colour for procedural moving bits: the graded colour blended across the current variants.
  const toneCache = new Map();
  function tone(c) {
    const k = c + '|' + T.a + T.b + ((T.f * 32) | 0);
    let o = toneCache.get(k); if (o) return o;
    const [r, g, b] = rgbOf(c), A = grade(r, g, b, T.a);
    const B = T.f ? grade(r, g, b, T.b) : A, f = ((T.f * 32) | 0) / 32;
    o = toHex(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f);
    if (toneCache.size > 4000) toneCache.clear();
    toneCache.set(k, o); return o;
  }
  // Per-frame dot / rect in toned colour (for dynamic, procedural pixels).
  const td = (x, px, py, c) => { x.fillStyle = tone(c); x.fillRect(px | 0, py | 0, 1, 1); };
  const tr = (x, px, py, w, h, c) => { x.fillStyle = tone(c); x.fillRect(px | 0, py | 0, w | 0, h | 0); };
  // Night-ness 0..1 (lamps, windows, fireflies ramp in with the evening).
  const dusk = () => clamp(T.tod, 0, 1), night = () => clamp(T.tod - 1, 0, 1);
  // Stepped time: integer frame index at fps.
  const step = (t, fps) => Math.floor(t * fps);

  /* ---------- sky, clouds, vista ---------- */
  const SKY_H = 112;
  const BANDS = [
    [['sky4', 0], ['sky3', 18], ['sky2', 40], ['sky1', 63], ['sky0', 86]],
    [['dusk4', 0], ['dusk3', 22], ['dusk2', 45], ['dusk1', 66], ['dusk0', 86]],
    [['dusk5', 0], ['eve3', 20], ['eve2', 42], ['eve1', 64], ['eve0', 88]],
  ];
  function buildSky(v) {
    const [c, x] = canvas(W, SKY_H), b = BANDS[v];
    b.forEach(([col, y0], i) => R(x, 0, y0, W, (i + 1 < b.length ? b[i + 1][1] : SKY_H) - y0, col));
    for (let i = 1; i < b.length; i++) { // sparse dither where two bands meet
      const y = b[i][1];
      for (let xx = (y & 1) * 2; xx < W; xx += 4) D(x, xx, y - 1, b[i][0]);
      for (let xx = 3; xx < W; xx += 8) D(x, xx, y - 2, b[i][0]);
      for (let xx = 1; xx < W; xx += 4) D(x, xx, y, b[i - 1][0]);
    }
    if (v === 1) { // low sun behind the far hills
      E(x, 470, 84, 14, 14, 'dusk0'); E(x, 470, 84, 10, 10, 'light0'); E(x, 467, 81, 5, 5, 'white');
    }
    if (v === 2) { // pale moon and a few stars
      E(x, 610, 26, 7, 7, 'cream0'); E(x, 613, 23, 6, 6, 'dusk5'); D(x, 604, 22, 'white'); D(x, 605, 21, 'white');
      const rnd = rng(77);
      for (let i = 0; i < 40; i++) { const sx = (rnd() * W) | 0, sy = (rnd() * 46) | 0; D(x, sx, sy, rnd() < 0.5 ? 'eve0' : 'white'); }
    }
    return c;
  }
  // Big fluffy clouds: overlapping puffs (lit crescent top-left, shade bottom-right), flat shaded base.
  const CLOUD_PAL = [['white', 'cloud1', 'cloud2', 'cloud3'], ['#fff7e4', 'dusk0', 'dusk2', 'dusk3'], ['#f2f1ff', 'eve1', 'eve2', 'eve3']];
  const CLOUDS = [
    { w: 92, h: 34, x: 40, y: 14, s: 2.2, puffs: [[16, 24, 8], [30, 17, 11], [48, 12, 13], [64, 17, 11], [78, 24, 8], [40, 25, 9], [58, 25, 9]] },
    { w: 64, h: 26, x: 300, y: 38, s: 3.1, puffs: [[12, 18, 7], [26, 12, 9], [40, 11, 9], [52, 17, 7], [30, 19, 7]] },
    { w: 110, h: 38, x: 460, y: 6, s: 1.6, puffs: [[16, 28, 9], [32, 20, 12], [52, 13, 14], [72, 18, 12], [92, 27, 9], [44, 28, 10], [66, 28, 10]] },
    { w: 52, h: 22, x: 690, y: 58, s: 2.7, puffs: [[11, 15, 6], [23, 10, 8], [36, 12, 7], [26, 16, 6]] },
  ];
  function cloudImg(cl, v) {
    const pal = CLOUD_PAL[v], [c, x] = canvas(cl.w, cl.h), base = cl.h - 4;
    for (const [cx, cy, r] of [...cl.puffs].sort((a, b) => a[1] - b[1])) {
      E(x, cx, cy, r, r, pal[1]);
      E(x, cx - 1, cy - 1, r - 1, r - 1, pal[0]);
    }
    x.clearRect(0, base + 1, cl.w, cl.h);
    const d = x.getImageData(0, 0, cl.w, cl.h).data;
    for (let i = 0; i < cl.w; i++) for (let j = base - 3; j <= base; j++) {
      if (!d[(j * cl.w + i) * 4 + 3]) continue;
      D(x, i, j, j === base ? pal[2] : j >= base - 1 ? pal[1] : (i + j) % 4 ? pal[0] : pal[1]);
    }
    return c;
  }

  // Vista: far lilac hills with a spire, soft green mid hills with fields, lollipop trees, the windmill tower.
  const yBack = x => Math.round(97 - 7 * Math.sin(x * 0.011 + 0.6) - 4 * Math.sin(x * 0.029 + 2.1) - 2 * Math.sin(x * 0.07));
  const yFront = x => Math.round(107 - 5 * Math.sin(x * 0.016 + 2.4) - 3 * Math.sin(x * 0.041 + 0.3));
  const yMid = x => Math.round(120 - 5 * Math.sin(x * 0.013 + 4.1) - 3 * Math.sin(x * 0.034 + 1.7) - 9 * Math.exp(-(((x - MILL[0]) / 46) ** 2)));
  const MILL = [520, 0]; // [x, feet y], y is set once yMid exists
  function ridge(x, fy, y1, body, rim, rim2) {
    for (let i = 0; i < W; i++) {
      const y = fy(i), rising = fy(i + 1) <= y && fy(i - 1) >= y; // lit left-facing slopes get a thicker rim
      R(x, i, y, 1, y1 - y, body); D(x, i, y, rim);
      if (fy(i - 2) > y || rising) D(x, i, y + 1, rim2 || rim);
    }
  }
  function lollipop(x, px, py, r, c0, c1, c2) {
    R(x, px, py - 1, 1, 3, 'far3');
    E(x, px, py - r - 1, r, r, c2); E(x, px - 1, py - r - 2, r - 1, r - 1, c1); D(x, px - 1, py - r - 3, c0); D(x, px - 2, py - r - 2, c0);
  }
  function buildVista() {
    const [c, x] = canvas(W, 170);
    ridge(x, yBack, 170, 'far1', 'far0');
    // distant spire and rooftops on the back range, near x=200
    const sx = 204, sy = yBack(sx) + 2;
    R(x, sx - 16, sy - 6, 9, 7, 'far1'); poly(x, [[sx - 17, sy - 6], [sx - 12, sy - 11], [sx - 7, sy - 6]], 'far3');
    R(x, sx + 9, sy - 5, 10, 6, 'far1'); poly(x, [[sx + 8, sy - 5], [sx + 14, sy - 10], [sx + 20, sy - 5]], 'far3');
    R(x, sx - 6, sy - 12, 12, 13, 'far1'); R(x, sx + 2, sy - 12, 4, 13, 'far2');
    poly(x, [[sx - 7, sy - 12], [sx, sy - 18], [sx + 7, sy - 12]], 'far3');
    R(x, sx - 2, sy - 22, 4, 5, 'far1'); R(x, sx, sy - 22, 2, 5, 'far2');
    poly(x, [[sx - 3, sy - 22], [sx, sy - 34], [sx + 3, sy - 22]], 'far3'); D(x, sx - 1, sy - 26, 'far2');
    R(x, sx - 1, sy - 9, 2, 3, 'far3'); D(x, sx, sy - 37, 'far3'); D(x, sx, sy - 36, 'far3');
    ridge(x, yFront, 170, 'far2', 'far1', 'far1');
    const fr = rng(88); // far woods: irregular clusters sitting on the front range
    for (let cx = 6 + ((fr() * 20) | 0); cx < W;) {
      const n = 2 + ((fr() * 6) | 0);
      for (let k = 0; k < n; k++) { const px = cx + k * 4 + ((fr() * 2) | 0), r = 2 + ((fr() * 2.2) | 0), py = yFront(px) + r - 1 + ((fr() * 2) | 0); E(x, px, py, r, r, 'far3'); D(x, px - 1, py - r, 'far2'); D(x, px, py - r, 'far2'); }
      cx += n * 4 + 14 + ((fr() * 46) | 0);
    }
    // mid hills
    ridge(x, yMid, 170, 'mid1', 'mid0', 'mid0');
    const field = (pts, a, b, dir) => {
      poly(x, pts, a);
      const ys = pts.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
      for (let y = y0 + 1; y < y1; y += 2) {
        const xs = pts.map(p => p[0]); R(x, Math.min(...xs) + (dir ? (y - y0) : 0), y, Math.max(...xs) - Math.min(...xs) - (y - y0), 1, b);
      }
    };
    field([[230, 126], [300, 124], [312, 134], [238, 136]], 'mid0', 'mid1');
    field([[304, 124], [352, 123], [362, 132], [314, 134]], 'grass0', 'dirt1');
    field([[590, 128], [652, 126], [660, 136], [596, 137]], 'mid0', 'mid2');
    field([[40, 125], [96, 124], [104, 134], [44, 135]], 'grass0', 'mid0');
    for (const [a, b, y] of [[228, 312, 137], [300, 362, 135], [588, 662, 138], [38, 106, 136]]) for (let i = a; i < b; i += 3) R(x, i, y, 2, 1, 'mid3');
    // lane climbing from the hedge gap to the windmill
    const lane = [[452, 170], [452, 150], [453, 144], [458, 139], [468, 134], [484, 129], [500, 124], [512, 120], [519, MILL[1] + 1]];
    for (let i = 0; i + 1 < lane.length; i++) {
      const [ax, ay] = lane[i], [bx, by] = lane[i + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let k = 0; k <= n; k++) {
        const px = Math.round(ax + ((bx - ax) * k) / n), py = Math.round(ay + ((by - ay) * k) / n), w = py > 140 ? 4 : py > 128 ? 3 : 2;
        R(x, px - (w >> 1), py, w, 1, 'dirt1'); D(x, px + w - (w >> 1), py, 'dirt2');
      }
    }
    // lollipop trees and little pines dotted on the mid hills
    const rnd = rng(1234), grove = [];
    for (let g = 0; g < 16; g++) { // groves of 1-5 trees, not an even sprinkle
      const gx = 10 + rnd() * (W - 20); if (Math.abs(gx - MILL[0]) < 24 || (gx > 432 && gx < 474)) continue;
      const n = 1 + ((rnd() * 5) | 0), pine = rnd() < 0.35;
      for (let k = 0; k < n; k++) { const px = Math.round(gx + (k - n / 2) * 5 + rnd() * 3); grove.push([px, yMid(px) + 3 + ((rnd() * 7) | 0), 2 + ((rnd() * 2.5) | 0), pine && rnd() < 0.7]); }
    }
    for (const [px, py, r, pine] of grove.sort((a, b) => a[1] - b[1])) {
      if (pine) { poly(x, [[px - r - 1, py], [px, py - r * 3], [px + r + 1, py]], 'mid3'); L(x, px - 1, py - r * 2, px - r, py - 1, 'mid2'); }
      else lollipop(x, px, py, r, 'mid0', 'mid2', 'mid3');
    }
    // windmill tower on its hill (sails are drawn per frame)
    const [mx, my] = MILL;
    poly(x, [[mx - 7, my], [mx - 4, my - 22], [mx + 4, my - 22], [mx + 7, my]], 'wall1');
    poly(x, [[mx + 2, my], [mx + 2, my - 22], [mx + 4, my - 22], [mx + 7, my]], 'wall2');
    L(x, mx - 7, my, mx - 4, my - 22, 'far3'); L(x, mx + 7, my, mx + 4, my - 22, 'far3');
    R(x, mx - 2, my - 6, 3, 6, 'wood3'); R(x, mx - 1, my - 15, 2, 2, 'wood3');
    poly(x, [[mx - 6, my - 22], [mx, my - 29], [mx + 6, my - 22]], 'roofR2'); poly(x, [[mx, my - 29], [mx + 6, my - 22], [mx + 1, my - 22]], 'roofR3');
    R(x, mx - 6, my - 22, 13, 1, 'roofR3');
    return c;
  }
  MILL[1] = yMid(MILL[0]) + 2;
  // Sails: 16 pre-rendered steps over a quarter turn (they are 4-fold symmetric).
  const SAILS = [];
  function sailFrame(k) {
    if (SAILS[k]) return SAILS[k];
    const [c, x] = canvas(36, 36), hx = 18, hy = 18, th = (k / 16) * (Math.PI / 2);
    for (let b = 0; b < 4; b++) {
      const a = th + (b * Math.PI) / 2, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
      const q = [[hx + dx * 4, hy + dy * 4], [hx + dx * 15, hy + dy * 15], [hx + dx * 15 + px * 4.5, hy + dy * 15 + py * 4.5], [hx + dx * 4 + px * 4.5, hy + dy * 4 + py * 4.5]];
      poly(x, q, 'cream1');
      L(x, q[3][0], q[3][1], q[2][0], q[2][1], 'wood2');
      L(x, hx + dx * 9 + px * 0.5, hy + dy * 9 + py * 0.5, hx + dx * 9 + px * 4, hy + dy * 9 + py * 4, 'wood2');
      L(x, hx, hy, hx + dx * 16, hy + dy * 16, 'wood4');
    }
    R(x, hx - 1, hy - 1, 3, 3, 'wood4'); D(x, hx - 1, hy - 1, 'wood2');
    return (SAILS[k] = c);
  }

  /* ---------- raster buffer (fast per-pixel building) ---------- */
  const U = new Map();
  const u32 = c => { let v = U.get(c); if (v === undefined) { const [r, g, b] = rgbOf(c); v = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; U.set(c, v); } return v; };
  class Buf {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
    set(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = typeof c === 'number' ? c : u32(c); }
    get(x, y) { x |= 0; y |= 0; return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : 0; }
    rect(x, y, w, h, c) { const v = u32(c); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, v); }
    canvas() { const [c, x] = canvas(this.w, this.h), id = x.createImageData(this.w, this.h); new Uint32Array(id.data.buffer).set(this.d); x.putImageData(id, 0, 0); return c; }
  }

  /* ---------- foliage: canopies of shaded, lobed leaf clumps ---------- */
  const PAL_LEAF = ['leaf0', 'leaf1', 'leaf2', 'leaf3', 'leaf4', 'leaf5'];
  const PAL_DEEP = ['leaf1', 'leaf2', 'leaf3', 'leaf4', 'leaf5', 'leaf6'];
  const PAL_LIME = ['grass0', 'grass1', 'grass2', 'grass3', 'grass4', 'grass5'];
  const lobe = (r, a, ph) => r + (r > 5 ? 1.1 * Math.sin(a * 5 + ph) + 0.6 * Math.sin(a * 8 + ph * 1.7) : 0.55 * Math.sin(a * 4 + ph));
  function paintLobe(b, cx, cy, r, ph, c) {
    if (r <= 0.6) return;
    const v = u32(c), R0 = Math.ceil(r + 2);
    for (let y = Math.floor(cy - R0); y <= cy + R0; y++) for (let x = Math.floor(cx - R0); x <= cx + R0; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= r - 1.8 || (d <= r + 1.8 && d <= lobe(r, Math.atan2(dy, dx), ph))) b.set(x, y, v);
    }
  }
  // clumps: [cx, cy, r, phase]; dark: 0..1 shifts a clump one tone darker (lower-right of a canopy).
  function paintClumps(b, clumps, pal, ox, oy, shiftTop = 0, topY = -1e9) {
    for (const [cx0, cy0, r, ph, dark] of clumps) {
      const cx = cx0 + ox + (cy0 < topY ? shiftTop : 0), cy = cy0 + oy, k = dark ? 1 : 0;
      paintLobe(b, cx, cy, r + 1, ph, pal[5]);
      paintLobe(b, cx, cy, r, ph + 0.4, pal[Math.min(5, 4 + k)]);
      paintLobe(b, cx - 1, cy - 1.5, r - 1.5, ph + 1.1, pal[3 + k]);
      paintLobe(b, cx - 2, cy - 3, r - 3.5, ph + 2.3, pal[2 + k]);
      if (!dark) paintLobe(b, cx - 3, cy - 4.5, r * 0.42, ph + 3.1, pal[1]);
    }
  }
  // Tiny leaf marks and bright flecks, clustered, never single-pixel speckle.
  function leafMarks(b, seed, pal, box) {
    const [x0, y0, w, h] = box, c1 = u32(pal[1]), c2 = u32(pal[2]), c3 = u32(pal[3]), c4 = u32(pal[4]), c0 = u32(pal[0]);
    for (const [x, y, q] of scatter(seed, 5, box, (x, y) => b.get(x, y) === c3 || b.get(x, y) === c2)) {
      const at = b.get(x, y);
      if (at === c3 && q < 0.6) { b.set(x, y, c4); b.set(x + 1, y + 1, c4); b.set(x + 2, y, c4); }
      else if (at === c2) { b.set(x, y + 1, c1); b.set(x + 1, y, c1); b.set(x + 2, y + 1, c1); }
    }
    for (const [x, y] of scatter(seed + 9, 9, box, (x, y) => b.get(x, y) === c1)) { b.set(x, y, c0); b.set(x + 1, y, c0); if ((x + y) & 1) b.set(x, y + 1, c0); }
  }
  function roundCanopy(seed, rx, ry, rMin, rMax) {
    const rnd = rng(seed), out = [], step = (rMin + rMax) * 0.55;
    for (let y = -ry + rMin; y <= ry - rMin * 0.5; y += step) {
      const hw = rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)), r0 = rMin + (rMax - rMin) * (0.35 + (0.65 * (y + ry)) / (2 * ry));
      const n = Math.max(1, Math.round((2 * hw) / (r0 * 1.3)));
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1, x = t * Math.max(0, hw - r0 * 0.75) + (rnd() - 0.5) * 3;
        out.push([x, y + (rnd() - 0.5) * 3, r0 * (0.85 + rnd() * 0.3), rnd() * 6.28, x > rx * 0.35 && y > ry * 0.25 ? 1 : 0]);
      }
    }
    return out.sort((a, b) => a[1] - b[1]);
  }
  function trunk(b, cx, y0, y1, w, seed) {
    const rnd = rng(seed), l = Math.round(cx - w / 2);
    for (let y = y0; y <= y1; y++) {
      const flare = y > y1 - 3 ? y1 - 3 - y + 4 : 0, x0 = l - (flare > 0 ? Math.ceil(flare / 1.5) : 0), x1 = l + w - 1 + (flare > 0 ? Math.ceil(flare / 1.5) : 0);
      for (let x = x0; x <= x1; x++) b.set(x, y, x === x0 || x === x1 || y === y1 ? 'wood5' : x < x0 + 2 ? 'wood2' : x > x1 - 3 ? 'wood4' : 'wood3');
    }
    for (let i = 0; i < w / 2; i++) { const x = l + 2 + ((rnd() * (w - 4)) | 0), y = y0 + 4 + ((rnd() * (y1 - y0 - 8)) | 0); b.set(x, y, 'wood4'); b.set(x, y + 1, 'wood4'); }
    for (let x = l; x < l + w; x++) { b.set(x, y0, 'wood5'); b.set(x, y0 + 1, 'wood4'); b.set(x, y0 + 2, x < l + 2 ? 'wood3' : 'wood4'); }
  }
  // A broadleaf tree: returns { frames: [c, c, c], x, y (top-left in world), base } with top clumps swayed by -1/0/+1.
  function makeTree(o) {
    const { rx, ry, th, tw = 8, seed, pal = PAL_LEAF, rMin = 6, rMax = 10, blossom, still } = o;
    const clumps = roundCanopy(seed, rx, ry, rMin, rMax), pad = rMax + 4;
    const w = Math.ceil(2 * (rx + pad)), cy = ry + pad, h = Math.ceil(cy + ry * 0.9 + th + 4);
    const topY = -ry * 0.25, frames = [];
    for (const s of still ? [0] : [0, 1]) {
      const b = new Buf(w, h), cx = w / 2;
      trunk(b, cx, Math.round(cy + ry * 0.45), h - 2, tw, seed);
      paintClumps(b, clumps, pal, cx, cy, s, topY);
      leafMarks(b, seed + 3, pal, [0, 0, w, h - th]);
      if (blossom) for (const [x, y] of scatter(seed + 5, 6, [0, 0, w, cy + ry * 0.6], (x, y) => { const k = b.get(x, y); return k === u32(pal[2]) || k === u32(pal[1]); })) {
        b.set(x, y, blossom[0]); b.set(x + 1, y, blossom[0]); b.set(x, y + 1, blossom[1]); b.set(x + 1, y + 1, blossom[0]);
      }
      frames.push(b.canvas());
    }
    return { frames, w, h, ax: w / 2, ay: h - 3 };
  }
  // A pine: stacked skirts, lit from the left.
  function makePine(o) {
    const { hgt, wid, seed } = o, tiers = Math.max(3, Math.round(hgt / 16)), w = wid + 8, h = hgt + 10, frames = [];
    for (const s of [0, 1]) {
      const [c, x] = canvas(w, h), cx = w / 2, rnd = rng(seed);
      R(x, cx - 3, h - 12, 6, 10, 'wood4'); R(x, cx - 3, h - 12, 2, 10, 'wood3'); R(x, cx + 2, h - 12, 1, 10, 'wood5'); R(x, cx - 3, h - 3, 6, 1, 'wood5');
      for (let i = 0; i < tiers; i++) {
        const top = 2 + (i * (hgt - 14)) / tiers, bot = top + hgt / tiers + 8, hw = (wid / 2) * (0.35 + (0.65 * (i + 1)) / tiers), sx = i < tiers / 2 ? s : 0;
        const teeth = 3 + (i > 1 ? 1 : 0);
        poly(x, [[cx + sx, top - 1], [cx + sx - hw - 1, bot + 1], [cx + sx + hw + 1, bot + 1]], 'leaf6');
        poly(x, [[cx + sx, top], [cx + sx - hw, bot], [cx + sx + hw, bot]], 'leaf4');
        poly(x, [[cx + sx, top], [cx + sx - hw, bot], [cx + sx - hw * 0.1, bot]], 'leaf3');
        poly(x, [[cx + sx, top + 1], [cx + sx + hw * 0.35, bot], [cx + sx + hw, bot]], 'leaf5');
        L(x, cx + sx - 1, top + 2, cx + sx - hw + 2, bot - 1, 'leaf2');
        for (let k = 1; k < teeth; k += 2) { const tx = Math.round(cx + sx - hw + ((2 * hw) * k) / teeth); R(x, tx - 1, bot - 1, 3, 2, 'leaf6'); }
      }
      frames.push(c);
    }
    return { frames, w, h, ax: w / 2, ay: h - 3 };
  }
  // A bush: small canopy sitting on the ground (two rustle frames).
  function makeBush(o) {
    const { rx, ry, seed, pal = PAL_LEAF, flowers, still } = o, clumps = roundCanopy(seed, rx, ry, 4, Math.max(5, Math.min(8, ry))), pad = 10;
    const w = Math.ceil(2 * (rx + pad)), h = Math.ceil(2 * ry + pad + 4), frames = [];
    for (const s of still ? [0] : [0, 1]) {
      const b = new Buf(w, h);
      paintClumps(b, clumps, pal, w / 2, h - ry - 4, s, -ry * 0.2);
      leafMarks(b, seed + 3, pal, [0, 0, w, h]);
      if (flowers) for (const [x, y, q] of scatter(seed + 7, 4, [0, 0, w, h - 3], (x, y) => { const k = b.get(x, y); return k === u32(pal[2]) || k === u32(pal[3]) || k === u32(pal[1]); })) {
        const f = flowers[(q * flowers.length) | 0]; b.set(x, y, f); b.set(x + 1, y, f); b.set(x, y + 1, f); b.set(x + 1, y + 1, 'white' === f ? 'yellow' : f);
      }
      frames.push(b.canvas());
    }
    return { frames, w, h, ax: w / 2, ay: h - 3 };
  }

  /* ---------- layout (world coordinates, art px) ---------- */
  const TER = { x0: 226, x1: 494, y0: 150, front: 266, wallH: 15 };      // terrace top surface; wall face y front..front+wallH
  const ST = { x0: 340, x1: 380, top: 266, bot: 296, steps: 5 };          // stairs down to the square
  const SHOP = { cx: 360, base: 250 };
  const PLAZA = { cx: 366, cy: 353, rx: 214, ry: 70 };
  const WELLP = [360, 352];
  const LEDGE = { x1: 82, top: 306, bot: 338 };                           // waterfall ledge face (left edge)
  const FALLS = { x0: 23, x1: 47 };
  const UPPER = [[-12, 283, 10], [12, 291, 11], [28, 299, 12], [35, 310, 13]];
  const STREAM = [[35, 330, 22], [44, 350, 27], [76, 378, 21], [118, 410, 23], [154, 440, 26], [174, 470, 28], [190, 500, 30], [226, 528, 36], [282, 572, 52]];
  const BR = { x0: 131, x1: 223, y0: 460, y1: 479 };                     // bridge deck
  const ANCHORS = {
    vista: [360, 108], shopDoor: [360, 252], stairsTop: [360, 263], stairsBottom: [360, 300], square: [324, 348], well: [360, 366],
    bakeryDoor: [188, 331], tailorDoor: [538, 327], stall: [604, 432], bench: [398, 431], bridge: [178, 470],
    arrivalStart: [16, 550], riverRock: [236, 499], cottageDoor: [584, 535], windmill: [520, 118], waterfall: [36, 322], lane: [452, 170],
  };
  const loop = [];
  for (let i = 0; i <= 12; i++) { const a = ((i % 12) / 12) * Math.PI * 2; loop.push([Math.round(362 + 62 * Math.cos(a)), Math.round(352 + 30 * Math.sin(a))]); }
  const PATHS = {
    arrival: [[16, 550], [56, 520], [96, 492], [124, 472], [178, 470], [224, 470], [248, 456], [274, 432], [294, 404], [310, 376], [324, 348], [340, 320], [356, 303], [360, 300], [360, 263], [360, 252]],
    plaza: loop,
    bakery: [[324, 348], [290, 344], [252, 338], [216, 333], [188, 331]],
    tailor: [[400, 346], [440, 339], [480, 333], [516, 329], [538, 327]],
    stall: [[410, 374], [460, 392], [520, 412], [572, 428], [604, 432]],
    cottage: [[420, 382], [452, 410], [488, 440], [514, 470], [520, 504], [532, 532], [584, 535]],
  };

  /* ---------- terrain masks ---------- */
  const M = { sand: new Uint8Array(W * H), water: new Uint8Array(W * H), land: new Uint8Array(W * H) };
  const idx = (x, y) => y * W + x;
  const inW = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  // Stream width at a polyline position.
  function streamHW(pts, i, t) { return pts[i][2] + (pts[i + 1][2] - pts[i][2]) * t; }
  // Capsule chains with bounding boxes, so the per-pixel fields only measure what is near.
  const chain = (pts, hw) => ({ pts, hw, x0: Math.min(...pts.map(p => p[0] - (p[2] || 0))) - hw - 8, x1: Math.max(...pts.map(p => p[0] + (p[2] || 0))) + hw + 8, y0: Math.min(...pts.map(p => p[1] - (p[2] || 0))) - hw - 8, y1: Math.max(...pts.map(p => p[1] + (p[2] || 0))) + hw + 8 });
  const near = (c, x, y) => x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1;
  const WLOW = chain(STREAM, 4), WUP = chain(UPPER, 4);
  function isWater(x, y) {
    const n = (vnoise(x / 9, y / 9, 5) - 0.5) * 4;
    if (y >= LEDGE.bot - 2 && near(WLOW, x, y)) { const [d, i, t] = lineDist(x, y, STREAM); if (d < streamHW(STREAM, i, t) + n) return true; }
    if (y < LEDGE.top + 2 && near(WUP, x, y)) { const [d2, i2, t2] = lineDist(x, y, UPPER); if (d2 < streamHW(UPPER, i2, t2) + n * 0.5) return true; }
    return false;
  }
  const CAPS = [
    chain(PATHS.arrival.slice(0, 4), 8), chain([[224, 470], [248, 456], [274, 432], [294, 404]], 9), chain([[188, 331], [232, 336]], 11), chain([[538, 327], [500, 336]], 11),
    chain([[520, 412], [600, 420], [640, 424]], 17), chain([[570, 398], [650, 398]], 22), chain(PATHS.cottage.slice(1), 6),
  ];
  const LANE = chain([[400, 258], [432, 246], [448, 222], [452, 196], [452, 150]], 5);
  function sandField(x, y) {
    let d = (Math.sqrt(((x - PLAZA.cx) / PLAZA.rx) ** 2 + ((y - PLAZA.cy) / PLAZA.ry) ** 2) - 1) * PLAZA.ry;
    for (const c of CAPS) if (near(c, x, y)) d = Math.min(d, lineDist(x, y, c.pts)[0] - c.hw);
    if (y < TER.front) {
      d = Math.min(d, (Math.sqrt(((x - 360) / 46) ** 2 + ((y - 259) / 9) ** 2) - 1) * 9);
      if (near(LANE, x, y)) d = Math.min(d, lineDist(x, y, LANE.pts)[0] - LANE.hw);
    }
    if (d > 12) return d;
    if (y >= TER.front && y < TER.front + TER.wallH + 1 && x > TER.x0 - 4 && x < TER.x1 + 4) return 99;
    return d + (vnoise(x / 7, y / 6, 11) - 0.5) * 6 + (vnoise(x / 3, y / 3, 12) - 0.5) * 1.5;
  }
  function buildMasks() {
    M.sand.fill(0); M.water.fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (y > 150 && isWater(x, y)) M.water[i] = 1;
      else if (y > 150 && sandField(x, y) < 0) M.sand[i] = 1;
    }
    // Clean-up: no one-pixel spurs or pits on material edges.
    for (const m of [M.sand, M.water]) for (let pass = 0; pass < 2; pass++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = idx(x, y), s = m[i - 1] + m[i + 1] + m[i - W] + m[i + W];
      if (m[i] && s <= 1) m[i] = 0; else if (!m[i] && s >= 3) m[i] = 1;
    }
    for (let i = 0; i < W * H; i++) { if (M.water[i]) M.sand[i] = 0; M.land[i] = M.water[i] ? 0 : 1; }
  }
  const water = (x, y) => inW(x, y) && M.water[idx(x, y)] === 1;
  const sand = (x, y) => inW(x, y) && M.sand[idx(x, y)] === 1;
  const onTerrace = (x, y) => x >= TER.x0 && x <= TER.x1 && y >= TER.y0 && y < TER.front;
  const onLedge = (x, y) => x < ledgeRight(y) && y < LEDGE.top + 1;
  function ledgeRight(y) { return y < LEDGE.top - 60 ? -1 : LEDGE.x1 - Math.max(0, (LEDGE.top - y) * 0.2); }
  // Anything drawn as a prop registers a keep-out rect so grass details and flowers avoid it.
  const keep = [];
  const blocked = (x, y) => keep.some(([a, b, w, h]) => x >= a && y >= b && x < a + w && y < b + h);

  /* ---------- ground layer: base materials ---------- */
  const GTOP = 146;
  // A block of stone with light top-left and shade bottom-right; mortar is left to the caller.
  function stoneBlock(b, x0, y0, w, h, ramp, round = 1) {
    const [hi, mid, lo, out] = ramp;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const cx = x === x0 || x === x0 + w - 1, cy = y === y0 || y === y0 + h - 1;
      if (round && cx && cy) { b.set(x, y, out); continue; }
      b.set(x, y, y === y0 || (x === x0 && y < y0 + h - 1) ? hi : y === y0 + h - 1 || x === x0 + w - 1 ? lo : mid);
    }
  }
  function blob(b, cx, cy, rx, ry, c, where) {
    for (let y = Math.round(cy - ry); y <= cy + ry; y++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / (ry + 0.5)) ** 2)));
      for (let x = Math.round(cx - hw); x <= cx + hw; x++) if (!where || where(x, y)) b.set(x, y, c);
    }
  }
  const isGrassPx = (b, x, y) => { const v = b.get(x, y); return v === u32('grass2') || v === u32('grass1'); };
  function groundBase(b) {
    const g2 = u32('grass2');
    for (let y = GTOP; y < H; y++) {
      const top = GTOP + Math.round(vnoise(0, 0, 0) * 0);
      for (let x = 0; x < W; x++) if (y >= top) b.d[idx(x, y)] = g2;
    }
    // meadow patches: smooth noise, thresholded into lighter and darker islands
    for (let y = GTOP + 4; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y); if (M.sand[i] || M.water[i]) continue;
      const n = vnoise(x / 15, y / 9, 23) * 0.8 + vnoise(x / 5, y / 4, 24) * 0.2;
      if (n > 0.64) b.d[i] = u32(n > 0.76 ? 'grass0' : 'grass1');
      else if (n < 0.2) b.d[i] = u32('grass3');
    }
    const g0 = u32('grass0'), g1 = u32('grass1'), g3 = u32('grass3');
    for (let pass = 0; pass < 2; pass++) for (let y = GTOP + 5; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { // no lone pixels
      const i = idx(x, y), v = b.d[i]; if (v !== g0 && v !== g1 && v !== g3 && v !== g2) continue;
      const same = (b.d[i - 1] === v) + (b.d[i + 1] === v) + (b.d[i - W] === v) + (b.d[i + W] === v);
      if (same <= 1) b.d[i] = b.d[i - 1] === v ? b.d[i + 1] : b.d[i - 1];
    }
    // sand with bitten edges: shade under the grass lip, a lit lower rim, darker/lighter wear patches
    const sd = (x, y) => sand(x, y);
    for (let y = GTOP; y < H; y++) for (let x = 0; x < W; x++) {
      if (!sd(x, y)) continue;
      const up = !sd(x, y - 1) && !water(x, y - 1), side = !sd(x - 1, y) || !sd(x + 1, y);
      b.set(x, y, up || (side && !water(x - 1, y) && !water(x + 1, y)) ? 'dirt2' : 'dirt1');
    }
    for (const [x, y, q] of scatter(22, 18, [0, GTOP, W, H - GTOP], (x, y) => sd(x, y) && sd(x, y - 3) && sd(x, y + 3))) {
      const rnd = rng(x * 7 + y * 3);
      for (let k = 0; k < 2; k++) blob(b, x + (rnd() - 0.5) * 10, y + (rnd() - 0.5) * 4, 3 + rnd() * 6, 1 + rnd() * 2, q < 0.55 ? 'dirt0' : 'dirt2', (x, y) => sd(x, y) && sd(x, y - 1) && sd(x - 1, y) && sd(x + 1, y));
    }
    for (let y = GTOP; y < H; y++) for (let x = 0; x < W; x++) {
      if (sd(x, y) || water(x, y)) continue;
      if (sd(x, y + 1)) b.set(x, y, 'grass3');            // grass lip above sand
      else if (sd(x, y - 1)) b.set(x, y, 'grass1');       // lit grass rim below sand
    }
  }
  function terraceWall(b) {
    const { x0, x1, front, wallH } = TER, rnd = rng(301), rampA = ['stone1', 'stone2', 'stone3', 'stone4'], rampB = ['stone0', 'stone1', 'stone2', 'stone4'];
    for (let x = x0; x <= x1; x++) { b.set(x, front - 3, 'grass1'); b.set(x, front - 2, 'grass0'); b.set(x, front - 1, 'grass3'); }
    for (let r = 0; r < 3; r++) {
      const y0 = front + r * 5; let x = x0 - (r % 2 ? 4 : 0);
      while (x <= x1) {
        const w = 8 + ((rnd() * 7) | 0), a = Math.max(x, x0), e = Math.min(x + w, x1 + 1);
        if (e - a > 1) { stoneBlock(b, a, y0, e - a - 1, 4, rnd() < 0.25 ? rampB : rampA); for (let j = y0; j < y0 + 5; j++) b.set(e - 1, j, 'stone4'); }
        for (let i = a; i < e; i++) b.set(i, y0 + 4, 'stone4');
        x += w;
      }
    }
    // moss draping over the lip, a few flowering vines
    for (let x = x0; x <= x1; x++) {
      const m = vnoise(x / 5, 3, 31);
      if (m > 0.45) { const n = 1 + ((m - 0.45) * 9) | 0; for (let j = 0; j < n; j++) b.set(x, front + j, j === n - 1 ? 'grass4' : j ? 'grass3' : 'grass2'); }
      else b.set(x, front, 'grass4');
    }
    for (const vx of [246, 278, 311, 402, 437, 470]) {
      const len = 7 + (vx % 5);
      for (let j = 0; j < len; j++) { b.set(vx + ((j >> 2) & 1), front + j, 'leaf3'); if (j % 3 === 1) b.set(vx + 1 + ((j >> 2) & 1), front + j, 'leaf2'); }
      b.set(vx - 1, front + 3, 'pink'); b.set(vx + 2, front + len - 2, 'white');
    }
    // stairs with cheek walls
    for (let k = 0; k < ST.steps; k++) {
      const ty = ST.top + k * 6;
      for (let x = ST.x0; x < ST.x1; x++) {
        b.set(x, ty, 'stone0'); b.set(x, ty + 1, 'stone1'); b.set(x, ty + 2, 'stone1');
        b.set(x, ty + 3, 'stone2'); b.set(x, ty + 4, 'stone3'); b.set(x, ty + 5, 'stone3');
      }
      for (let i = 0; i < 3; i++) { const cx = ST.x0 + 3 + ((rnd() * (ST.x1 - ST.x0 - 8)) | 0); b.set(cx, ty + 1, 'stone2'); b.set(cx + 1, ty + 1, 'stone2'); }
      b.set(ST.x0, ty + 1, 'grass3'); b.set(ST.x0 + 1, ty + 2, 'grass2'); b.set(ST.x1 - 1, ty + 1, 'grass3');
    }
    for (const cx of [ST.x0 - 6, ST.x1]) {
      for (let y = ST.top - 4; y < ST.bot - 6; y++) for (let x = cx; x < cx + 6; x++) b.set(x, y, x === cx ? 'stone0' : x === cx + 5 ? 'stone2' : 'stone1');
      for (let y = ST.top - 4; y < ST.bot - 6; y += 7) for (let x = cx; x < cx + 6; x++) b.set(x, y, 'stone3');
      stoneBlock(b, cx, ST.bot - 6, 6, 6, ['stone1', 'stone2', 'stone3', 'stone4']);
      b.set(cx - 1, ST.bot - 1, 'stone4'); b.set(cx + 6, ST.bot - 1, 'stone4');
    }
  }
  // Mossy boulder ledge the stream falls from; its face tapers away to the right (x ~ 94).
  const ledgeTop = x => LEDGE.top + (x > 58 ? Math.round((x - 58) * 0.55) : 0);
  const ledgeBot = x => LEDGE.bot - (x > 70 ? Math.round((x - 70) * 0.5) : 0);
  const inFace = (x, y) => x >= 0 && y >= ledgeTop(x) && y < ledgeBot(x);
  function boulder(b, cx, cy, rx, ry, ramp, clip) {
    const inside = (x, y) => clip(x, y) && ((x - cx) / (rx + 0.4)) ** 2 + ((y - cy) / (ry + 0.4)) ** 2 <= 1;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (!inside(x, y)) continue;
      const tl = !inside(x - 1, y) || !inside(x, y - 1), br = !inside(x + 1, y) || !inside(x, y + 1), br2 = !inside(x + 2, y + 1) || !inside(x + 1, y + 2);
      b.set(x, y, br ? ramp[3] : tl ? ramp[0] : br2 ? ramp[2] : ramp[1]);
    }
  }
  function ledgeFace(b) {
    for (let x = 0; x < 100; x++) for (let y = ledgeTop(x); y < ledgeBot(x); y++) b.set(x, y, 'stone3');
    const pts = scatter(401, 6.5, [-6, LEDGE.top - 3, 108, LEDGE.bot - LEDGE.top + 6], (x, y) => inFace(x, y), 8).sort((p, q) => p[1] - q[1]);
    for (const [x, y, q, r] of pts) {
      const wet = x > FALLS.x0 - 8 && x < FALLS.x1 + 8;
      const rx = 4 + ((q * 3.5) | 0), ry = 3 + ((r * 2.6) | 0);
      boulder(b, x, y, rx, ry, wet ? ['stone1', 'stone2', 'stone3', 'stone4'] : ['stone0', 'stone1', 'stone2', 'stone4'], inFace);
      if (!wet && q + r > 0.7) for (let i = -rx + 1; i < rx - 1; i++) { // moss cap
        const top = y - Math.round(ry * Math.sqrt(Math.max(0, 1 - (i / rx) ** 2)));
        if (inFace(x + i, top)) { b.set(x + i, top, i < 0 ? 'grass1' : 'grass2'); if (Math.abs(i) < rx - 2 && inFace(x + i, top + 1)) b.set(x + i, top + 1, (i + x) % 3 ? 'grass3' : 'grass2'); }
      }
    }
    for (let x = 0; x < 96; x++) { // grassy lip and moss draping over the stones
      const y0 = ledgeTop(x); if (x > FALLS.x0 - 2 && x < FALLS.x1 + 2) continue;
      b.set(x, y0 - 2, 'grass1'); b.set(x, y0 - 1, 'grass3');
      const m = vnoise(x / 4, 9, 41), n = m > 0.42 ? 1 + (((m - 0.42) * 12) | 0) : 0;
      for (let j = 0; j < n && y0 + j < ledgeBot(x); j++) b.set(x, y0 + j, j === n - 1 ? 'leaf4' : j ? 'leaf3' : 'grass2');
    }
    for (const [vx, len, f] of [[6, 9, 'pink'], [15, 14, 'white'], [55, 11, 'yellow'], [68, 8, 'pink'], [79, 5, 'white']]) {
      const y0 = ledgeTop(vx);
      for (let j = 0; j < len; j++) { b.set(vx + ((j >> 2) & 1), y0 + j, 'leaf3'); if (j % 3 === 1) b.set(vx - 1 + ((j >> 2) & 1) * 2, y0 + j, 'leaf2'); }
      b.set(vx + 1, y0 + len, f); b.set(vx, y0 + len - 3, f);
    }
    for (let y = LEDGE.top; y < LEDGE.bot; y++) for (let x = FALLS.x0; x <= FALLS.x1; x++) b.set(x, y, x === FALLS.x0 || x === FALLS.x1 ? 'water3' : (x + (y >> 2)) % 5 ? 'water2' : 'water1');
  }
  function waterBase(b) {
    for (let y = GTOP; y < H; y++) for (let x = 0; x < W; x++) {
      if (!water(x, y)) continue;
      const up = !water(x, y - 1) ? 1 : !water(x, y - 2) ? 2 : !water(x, y - 3) ? 3 : 0;
      const falls = x >= FALLS.x0 - 1 && x <= FALLS.x1 + 1 && y < LEDGE.bot + 6;
      if (up && !falls) { b.set(x, y, up === 1 ? 'stone1' : (x * 7 + (x >> 3)) % 9 === 0 ? 'stone4' : up === 2 ? 'stone2' : 'stone3'); continue; }
      const shade = !falls && (!water(x, y - 4) || !water(x, y - 5));
      const [d, i, t] = y < LEDGE.top + 3 ? lineDist(x, y, UPPER) : lineDist(x, y, STREAM);
      const hw = y < LEDGE.top + 3 ? streamHW(UPPER, i, t) : streamHW(STREAM, i, t), n = vnoise(x / 6, y / 4, 61);
      let c = d < hw * (0.3 + n * 0.25) ? 'water4' : 'water3';
      if (!water(x, y + 1) || !water(x, y + 2) && n > 0.4) c = 'water2';
      if (shade) c = !water(x, y - 4) ? 'water5' : 'water4';
      if (!water(x - 1, y) || !water(x + 1, y)) c = 'water2';
      if (!water(x, y + 1) && ((x >> 1) + (y >> 2)) % 3) c = 'water0';
      b.set(x, y, c);
    }
    for (let y = GTOP; y < H; y++) for (let x = 0; x < W; x++) if (!water(x, y) && water(x, y - 1) && !sand(x, y)) b.set(x, y, 'grass3');
  }
  function bridgeDeck(b) {
    const { x0, x1, y0, y1 } = BR;
    for (let x = x0; x <= x1; x++) {
      const k = Math.floor((x - x0) / 6), p = (x - x0) % 6, dark = hash(k, 3, 77) < 0.25, jig = hash(k, 5, 77) < 0.3 ? 1 : 0;
      for (let y = y0 + jig; y < y1 + jig - 1; y++) {
        let c = p === 0 ? 'wood3' : p === 1 ? 'wood0' : p === 5 ? 'wood2' : dark ? 'wood2' : 'wood1';
        if (p && y === y0 + jig) c = 'wood2';
        b.set(x, y, c);
      }
      if (p === 3) { b.set(x, y0 + 2 + jig, 'wood3'); b.set(x, y1 - 3 + jig, 'wood3'); }
      b.set(x, y0 - 1 + jig, 'wood4');
      b.set(x, y1, 'wood2'); b.set(x, y1 + 1, 'wood3'); b.set(x, y1 + 2, 'wood4'); b.set(x, y1 + 3, 'wood5');
      for (let y = y1 + 4; y < y1 + 8; y++) if (water(x, y)) b.set(x, y, y < y1 + 6 ? 'water5' : 'water4');
    }
    for (const px of [x0 + 16, (x0 + x1) >> 1, x1 - 18]) for (let y = y1 + 4; y < y1 + 10; y++) { b.set(px, y, 'wood2'); b.set(px + 1, y, 'wood3'); b.set(px + 2, y, 'wood4'); }
  }

  /* ---------- ground layer: details ---------- */
  // Cobbles: organic rounded stones, a grout ring in darker sand, lit top-left rim and shaded bottom-right rim.
  const STONES = [['stone0', 'stone1', 'stone2', 'stone3'], ['stone0', 'stone1', 'stone2', 'stone3'], ['cream0', 'wall2', 'dirt2', 'dirt3'], ['stone1', 'stone2', 'stone3', 'stone4']];
  function stone(b, cx, cy, rx, ry, ramp, grout = 'dirt3') {
    const inside = (x, y) => ((x - cx) / (rx + 0.35)) ** 2 + ((y - cy) / (ry + 0.35)) ** 2 <= 1;
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++)
      if (!inside(x, y) && (inside(x - 1, y) || inside(x, y - 1) || inside(x + 1, y) || inside(x, y + 1))) b.set(x, y, y > cy ? grout : 'dirt2');
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (!inside(x, y)) continue;
      const tl = !inside(x - 1, y) || !inside(x, y - 1), br = !inside(x + 1, y) || !inside(x, y + 1);
      b.set(x, y, br && !tl ? (y > cy ? ramp[3] : ramp[2]) : tl && y <= cy ? ramp[0] : ramp[1]);
    }
  }
  // A laid paving stone: rounded rect, lit top/left, shaded bottom/right, seated by a grout shadow.
  function pave(b, x, y, w, h, ramp, cut) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const corner = (i === 0 || i === w - 1) && (j === 0 || j === h - 1);
      if (corner || (cut && i === w - 2 && j === 0)) continue;
      b.set(x + i, y + j, j === h - 1 || i === w - 1 ? ramp[2] : j === 0 || i === 0 ? ramp[0] : ramp[1]);
    }
    for (let i = 1; i < w; i++) b.set(x + i, y + h, 'dirt3');
    b.set(x + w, y + h - 1, 'dirt3');
  }
  const PAVE = [['stone0', 'stone1', 'stone2'], ['stone0', 'stone1', 'stone2'], ['cream0', 'wall2', 'dirt3'], ['stone1', 'stone2', 'stone3']];
  function cobbles(b) {
    const rnd = rng(73), rampAt = () => PAVE[(rnd() * PAVE.length) | 0];
    const fits = (x, y, w, h) => sand(x - 1, y - 1) && sand(x + w, y - 1) && sand(x - 1, y + h) && sand(x + w, y + h);
    const [wx, wy] = WELLP;
    // rings of stones around the well
    for (let k = 0; k < 8; k++) {
      const rx = 26 + k * 8, ry = 12 + k * 5, n = Math.round((2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2)) / 8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k * 0.37, x = Math.round(wx + rx * Math.cos(a)), y = Math.round(wy + ry * Math.sin(a));
        const w = Math.abs(Math.sin(a)) > 0.4 ? 7 : 6, h = 4;
        if (k > 5 && rnd() < (k - 5) * 0.35) continue;
        if (fits(x - (w >> 1), y - 2, w, h)) pave(b, x - (w >> 1), y - 2, w, h, rampAt(), rnd() < 0.3);
      }
    }
    // running-bond paving: the stair walkway and the shop forecourt
    const bond = (x0, x1, y0, y1, fade) => {
      for (let y = y0; y < y1; y += 5) for (let x = x0 - ((rnd() * 7) | 0); x < x1;) {
        const w = 6 + ((rnd() * 4) | 0), edge = Math.min(x - x0, x1 - x - w, y - y0, y1 - y);
        if (!fade || edge > 6 || rnd() < 0.5 + edge * 0.08) if (fits(x, y, w - 1, 4)) pave(b, x, y, w - 1, 4, rampAt(), rnd() < 0.25);
        x += w;
      }
    };
    bond(ST.x0 - 2, ST.x1 + 2, ST.bot + 1, ST.bot + 28, true);
    bond(318, 404, 250, TER.front - 1, false);
    // sparse flat stones fading toward the sandy rim and along the lanes
    const clear = (x, y) => sand(x, y) && sand(x - 7, y) && sand(x + 7, y) && sand(x, y - 5) && sand(x, y + 5) &&
      ((x - wx) / 100) ** 2 + ((y - wy) / 48) ** 2 > 1 && !(x > ST.x0 - 8 && x < ST.x1 + 8 && y < ST.bot + 32) && y >= TER.front;
    for (const [x, y, q, r] of scatter(71, 11, [0, GTOP, W, H - GTOP], clear, 3)) {
      const nd = Math.sqrt(((x - PLAZA.cx) / PLAZA.rx) ** 2 + ((y - PLAZA.cy) / PLAZA.ry) ** 2);
      if (q > (nd < 1 ? 0.42 - nd * 0.2 : 0.16)) continue;
      stone(b, x, y, 3 + ((r * 3) | 0), 2 + (r > 0.5 ? 1 : 0), STONES[(r * 97 | 0) % STONES.length]);
    }
  }
  const TUFT = [
    ['..l..', 'l.d.l', 'd.d.d', '.ddd.'],
    ['l.l', 'd.d', '.d.'],
    ['.l...l.', 'd.d.d.d', '.ddddd.'],
    ['...l..', '.l.d..', '.d.d.l', 'd.dd.d', '.dddd.'],
  ];
  function stamp(b, x, y, rows, key) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (key[r[i]]) b.set(x + i, y + j, key[r[i]]); }); }
  const grassy = (b, x, y) => { const v = b.get(x, y); return v === u32('grass2') || v === u32('grass1') || v === u32('grass0') || v === u32('grass3'); };
  function tufts(b) {
    const ok = (x, y) => grassy(b, x, y) && grassy(b, x + 6, y + 4) && grassy(b, x, y + 4) && !blocked(x, y);
    for (const [x, y, q] of scatter(81, 6, [0, GTOP + 8, W, H - GTOP - 8], ok, 2)) {
      if (q > 0.75) continue;
      const under = b.get(x + 2, y + 2), light = under === u32('grass1') || under === u32('grass0'), rows = TUFT[Math.min(3, (q * 7.3) | 0)];
      stamp(b, x, y, rows, light ? { d: 'grass2', l: 'grass0' } : under === u32('grass3') ? { d: 'grass4', l: 'grass2' } : { d: 'grass3', l: 'grass1' });
    }
    // tufts overhanging path edges
    for (const [x, y, q] of scatter(82, 9, [0, GTOP + 8, W, H - GTOP - 8], (x, y) => sand(x, y) && !sand(x, y - 2) && grassy(b, x, y - 3) && !blocked(x, y))) {
      stamp(b, x - 2, y - 3, q < 0.5 ? ['l.l.l', 'd.d.d', '.ddd.'] : ['.l.l', 'd.d.', '.dd.'], { d: 'grass3', l: 'grass1' });
    }
  }
  const FLOWER = [['.p.', 'pcp', '.g.'], ['pp', 'g.'], ['.p.', 'pcp', '.g.', '.g.'], ['p.p', '.g.']];
  const FCOL = [['white', 'yellow'], ['yellow', 'orange'], ['pink', 'white'], ['lilac', 'white'], ['blue', 'white'], ['rose', 'yellow'], ['white', 'orange']];
  function flowerPatch(b, x, y, seed, n = 5, spread = 10) {
    const rnd = rng(seed), [p, c] = FCOL[(rnd() * FCOL.length) | 0], [p2] = FCOL[(rnd() * FCOL.length) | 0];
    for (let k = 0; k < n; k++) {
      const fx = x + ((rnd() - 0.5) * spread) | 0, fy = y + ((rnd() - 0.5) * spread * 0.5) | 0;
      if (!grassy(b, fx + 1, fy + 1) || blocked(fx, fy)) continue;
      stamp(b, fx, fy, FLOWER[(rnd() * FLOWER.length) | 0], { p: k % 3 === 2 ? p2 : p, c, g: 'grass3' });
    }
  }
  function flowers(b) {
    const ok = (x, y) => grassy(b, x, y) && !blocked(x, y);
    for (const [x, y, q] of scatter(91, 16, [0, GTOP + 10, W, H - GTOP - 10], ok, 2)) {
      const near = sand(x, y + 6) || sand(x, y - 6) || sand(x + 8, y) || sand(x - 8, y) || water(x, y + 8) || water(x, y - 8);
      if (q < (near ? 0.85 : 0.4)) flowerPatch(b, x, y, x * 13 + y, 3 + ((q * 5) | 0));
    }
    for (const o of TREES) if (!o.pine) { flowerPatch(b, o.x - 14, o.y + 2, o.seed * 11, 3, 8); flowerPatch(b, o.x + 12, o.y + 4, o.seed * 17, 3, 8); }
    // flowers along the terrace foot and the wall top
    for (let x = TER.x0 + 4; x < TER.x1 - 4; x += 9) if (x < ST.x0 - 10 || x > ST.x1 + 10) { flowerPatch(b, x, TER.front + TER.wallH + 2, x * 7, 2, 6); flowerPatch(b, x + 3, TER.front - 7, x * 3, 2, 6); }
    // pebbles near paths and banks
    for (const [x, y, q] of scatter(95, 13, [0, GTOP + 10, W, H - GTOP - 10], (x, y) => grassy(b, x, y) && !blocked(x, y) && (sand(x, y + 4) || water(x, y + 5) || sand(x, y - 4)))) {
      if (q < 0.5) { b.set(x, y, 'stone1'); b.set(x + 1, y, 'stone1'); b.set(x + 2, y, 'stone2'); b.set(x, y + 1, 'stone2'); b.set(x + 1, y + 1, 'stone3'); b.set(x + 2, y + 1, 'stone3'); }
      else { b.set(x, y, 'stone0'); b.set(x + 1, y, 'stone2'); b.set(x, y + 1, 'stone3'); }
    }
  }
  // The shop lot: a light clearing ringed by tiny pale mushrooms (a fairy ring: the shop's promise).
  function clearing(b) {
    const cx = SHOP.cx, cy = 212, rnd = rng(808);
    for (let y = cy - 36; y <= cy + 36; y++) for (let x = cx - 66; x <= cx + 66; x++) {
      const e = ((x - cx) / 60) ** 2 + ((y - cy) / 31) ** 2 + (vnoise(x / 6, y / 5, 81) - 0.5) * 0.3;
      if (e < 1 && grassy(b, x, y) && !sand(x, y)) b.set(x, y, e < 0.35 && vnoise(x / 9, y / 6, 82) > 0.55 ? 'grass0' : 'grass1');
    }
    for (let a = 0; a < 30; a++) { // fairy ring: the shop's promise
      const t = (a / 30) * Math.PI * 2 + rnd() * 0.12, x = Math.round(cx + 63 * Math.cos(t)), y = Math.round(cy + 33 * Math.sin(t));
      if (sand(x, y + 2) || sand(x, y - 2)) continue;
      if (a % 4 === 0) stamp(b, x - 2, y - 2, ['.rr.', 'rwrr', '.s..'], { r: 'rose', w: 'white', s: 'cream1' });
      else if (a % 4 === 2) stamp(b, x - 1, y - 2, ['cc.', 'ccc', '.s.'], { c: 'cream0', s: 'cream2' });
      else stamp(b, x, y - 1, ['.w.', 'wyw'], { w: 'white', y: 'yellow' });
    }
  }
  function picnic(b) { // red and cream checked blanket on the meadow
    const x0 = 368, y0 = 464;
    for (let j = 0; j < 12; j++) for (let i = 0; i < 22; i++) {
      const edge = j === 11 || i === 21, check = ((i >> 1) + (j >> 1)) & 1;
      b.set(x0 + i + (j > 5 ? 1 : 0), y0 + j, edge ? 'roofR3' : check ? 'red' : j % 2 && i % 2 ? 'cream1' : 'cream0');
    }
  }
  // Union of cast shadows (hard-edged, one uniform violet tint).
  function paintShadows(ctx, list) {
    const [c, x] = canvas(W, H);
    for (const s of list) {
      if (s[0] === 'r') x.fillRect(s[1], s[2], s[3], s[4]);
      else PX.ellipse(x, s[0], s[1], s[2], s[3], '#000');
    }
    x.globalCompositeOperation = 'source-in'; x.fillStyle = P.shadow; x.fillRect(0, 0, W, H);
    ctx.drawImage(c, 0, 0);
  }
  function hedge(ctx) {
    const rnd = rng(501), items = [];
    for (let x = 14; x < W; x += 46 + rnd() * 70) { // trees peeking over the hedge
      if (x > 410 && x < 490) continue;
      items.push([makeTree({ rx: 12 + ((rnd() * 7) | 0), ry: 11 + ((rnd() * 4) | 0), th: 4, seed: 900 + (x | 0), pal: rnd() < 0.4 ? PAL_DEEP : PAL_LEAF, rMin: 5, rMax: 8, still: true }), x, 149 + ((rnd() * 4) | 0)]);
    }
    for (let x = -12; x < W + 12;) {
      const rx = 9 + ((rnd() * 9) | 0), ry = 7 + ((rnd() * 6) | 0);
      if (x + rx > 434 && x - rx < 468) { x = 470 + rx; continue; }
      const k = rnd();
      items.push([makeBush({ rx, ry, seed: 600 + x, pal: k < 0.2 ? PAL_DEEP : k < 0.55 ? PAL_LIME : PAL_LEAF, flowers: rnd() < 0.2 ? ['white', 'pink'] : null, still: true }), x, 157 + ((rnd() * 7) | 0)]);
      x += rx * (1 + rnd() * 0.5);
    }
    for (const [s, x, y] of items.sort((p, q) => p[2] - q[2])) ctx.drawImage(s.frames[0], Math.round(x - s.ax), Math.round(y - s.ay));
  }
  function buildGround(shadows) {
    const b = new Buf(W, H);
    groundBase(b); terraceWall(b); ledgeFace(b); waterBase(b); bridgeDeck(b);
    clearing(b); picnic(b); cobbles(b); tufts(b); flowers(b);
    const c = b.canvas(), x = c.getContext('2d');
    paintShadows(x, shadows);
    hedge(x);
    return c;
  }

  /* ---------- buildings: modular parts (all drawn in world coordinates on a translated canvas) ---------- */
  const RAMP = {
    R: ['roofR0', 'roofR1', 'roofR2', 'roofR3', 'roofR4'],
    B: ['roofB0', 'roofB1', 'roofB2', 'roofB3', 'roofB4'],
    G: ['roofG0', 'roofG1', 'roofG2', 'roofG3', 'roofG4'],
  };
  // Tile patterns: H highlight, m body, s seam, d shadow. Rows repeat every h px, alternate rows shift by off.
  const TILES = {
    barrel: { w: 6, h: 5, off: 3, rows: ['dHmmms', 'dHmmms', 'dHmmms', 'dHmmms', 'ddsssd'] },
    slate: { w: 8, h: 4, off: 4, rows: ['dHHHHHHs', 'dmmmmmms', 'dmmmmmms', 'dddddddd'] },
    scale: { w: 6, h: 4, off: 3, rows: ['Hmmmms', 'Hmmmms', 'dHmmsd', 'ddssdd'] },
  };
  // A roof seen from above and in front: tiled trapezoid (inset at the ridge), ridge cap, eave, outline.
  function roof(x, x0, x1, top, bot, rampKey, tiles, inset = 4, seed = 1) {
    const ramp = RAMP[rampKey], T = TILES[tiles], key = { H: ramp[0], m: ramp[1], s: ramp[2], d: ramp[3] };
    const edge = y => { const t = (y - top) / (bot - top); return [Math.round(x0 + inset * (1 - t)), Math.round(x1 - inset * (1 - t))]; };
    for (let y = top; y <= bot; y++) {
      const [l, r] = edge(y), v = y - top - 3, row = Math.floor(v / T.h), j = ((v % T.h) + T.h) % T.h;
      for (let px = l; px <= r; px++) {
        let c;
        if (y <= top + 2) c = y === top ? ramp[4] : y === top + 1 ? ramp[1] : ramp[2];              // ridge cap
        else if (y >= bot - 1) c = y === bot ? ramp[4] : ramp[3];                                // eave
        else {
          const u = px - x0 + (row & 1 ? T.off : 0), i = ((u % T.w) + T.w) % T.w, tile = Math.floor(u / T.w);
          let k = T.rows[j][i];
          const h = hash(tile, row, seed);
          if (k === 'm' && h < 0.18) k = 'H'; else if (k === 'm' && h > 0.88) k = 's';
          c = key[k];
        }
        if (px === l || px === r) c = ramp[4];
        else if (px === l + 1 && y > top + 2 && y < bot - 1) c = ramp[0];
        D(x, px, y, c);
      }
    }
    for (let px = edge(top)[0] + 2; px < edge(top)[1] - 1; px += 5) D(x, px, top + 1, ramp[0]);
    return edge;
  }
  // Plaster wall with a half-timber frame, stone plinth and the eave's 2px shadow.
  function wall(x, x0, x1, top, base, o = {}) {
    R(x, x0, top, x1 - x0 + 1, base - top, o.plaster || 'wall1');
    R(x, x0 + 3, top + 3, 1, base - top - 8, 'wall0');
    const rnd = rng(x0 * 7 + top);
    for (let i = 0; i < (x1 - x0) / 14; i++) { const px = x0 + 6 + ((rnd() * (x1 - x0 - 12)) | 0), py = top + 6 + ((rnd() * (base - top - 14)) | 0); R(x, px, py, 2, 1, 'wall2'); D(x, px + 1, py + 1, 'wall2'); }
    const post = px => { R(x, px, top, 3, base - top, 'wood3'); R(x, px, top, 1, base - top, 'wood2'); R(x, px + 2, top, 1, base - top, 'wood4'); };
    R(x, x0, top, x1 - x0 + 1, 3, 'wood3'); R(x, x0, top + 2, x1 - x0 + 1, 1, 'wood4');
    for (const px of o.posts || []) post(px);
    post(x0); post(x1 - 2);
    for (const [ax, ay, bx, by] of o.braces || []) { L(x, ax, ay, bx, by, 'wood3'); L(x, ax, ay + 1, bx, by + 1, 'wood4'); }
    if (o.beam) { R(x, x0, o.beam, x1 - x0 + 1, 2, 'wood3'); R(x, x0, o.beam + 1, x1 - x0 + 1, 1, 'wood4'); }
    const ph = o.plinth || 5;
    if (o.stoneTo) { // stone lower storey
      for (let y = o.stoneTo; y < base; y++) for (let px = x0; px <= x1; px++) D(x, px, y, 'stone2');
      for (let r = 0, y = o.stoneTo; y < base; r++, y += 5) for (let px = x0 - (r % 2) * 4; px <= x1; px += 9) {
        const a = Math.max(px, x0), e = Math.min(px + 8, x1); if (e - a > 2) stoneBlock_c(x, a, y, e - a, 4);
      }
    }
    for (let px = x0; px <= x1; px += 7) stoneBlock_c(x, px, base - ph, Math.min(6, x1 - px), ph - 1);
    R(x, x0, base - 1, x1 - x0 + 1, 1, 'stone4');
    R(x, x0, top + 3, x1 - x0 + 1, 2, 'wall3'); R(x, x0, top + 5, x1 - x0 + 1, 1, 'wall2');
    R(x, x0 - 1, top, 1, base - top, 'wood5'); R(x, x1 + 1, top, 1, base - top, 'wood5');
  }
  function stoneBlock_c(x, px, py, w, h) {
    if (w < 2) return;
    R(x, px, py, w, h, 'stone1'); R(x, px, py, w, 1, 'stone0'); R(x, px + w - 1, py, 1, h, 'stone2'); R(x, px, py + h - 1, w, 1, 'stone2');
    R(x, px, py + h, w + 1, 1, 'stone3'); R(x, px + w, py, 1, h, 'stone3');
  }
  // Window with frame, two-tone glass and glint, mullions, sill and a flower box. Returns glass rect for the evening glow.
  function windowAt(x, wx, wy, ww, wh, o = {}) {
    R(x, wx - 1, wy - 1, ww + 2, wh + 2, 'wood4'); R(x, wx, wy, ww, wh, 'wood2'); R(x, wx, wy, ww, 1, 'wood1');
    const gx = wx + 1, gy = wy + 1, gw = ww - 2, gh = wh - 2, mx = gx + (gw >> 1), my = gy + (gh >> 1);
    R(x, gx, gy, gw, gh, 'sky2'); R(x, gx, gy + gh - 3, gw, 3, 'sky3'); R(x, gx, gy, gw, 1, 'sky3');
    for (let k = 0; k < 3; k++) { D(x, gx + 1 + k, gy + 3 - k, 'white'); D(x, gx + 2 + k, gy + 3 - k, 'white'); }
    D(x, mx + 2, gy + gh - 4, 'white');
    if (o.dress) { R(x, mx + 2, gy + 3, 3, 2, 'rose'); R(x, mx + 1, gy + 5, 5, gh - 6, 'pink'); D(x, mx + 3, gy + 2, 'wood3'); }
    R(x, mx, gy, 1, gh, 'wood3'); R(x, gx, my, gw, 1, 'wood3');
    if (o.shutters) for (const sx of [wx - 6, wx + ww + 1]) {
      R(x, sx, wy - 1, 5, wh + 2, o.shutters[1]); R(x, sx + 1, wy, 3, wh, o.shutters[0]);
      for (let y = wy + 2; y < wy + wh - 1; y += 3) R(x, sx + 1, y, 3, 1, o.shutters[1]);
    }
    R(x, wx - 2, wy + wh + 1, ww + 4, 1, 'wood1'); R(x, wx - 2, wy + wh + 2, ww + 4, 1, 'wood3');
    if (o.box !== false) {
      R(x, wx - 1, wy + wh + 3, ww + 2, 4, 'wood3'); R(x, wx - 1, wy + wh + 3, ww + 2, 1, 'wood2'); R(x, wx - 1, wy + wh + 6, ww + 2, 1, 'wood4');
      const rnd = rng(wx * 3 + wy), fl = o.flowers || ['rose', 'pink', 'white'];
      for (let px = wx - 1; px < wx + ww + 1; px += 2) {
        const h = 1 + ((rnd() * 3) | 0); R(x, px, wy + wh + 3 - h, 2, h, rnd() < 0.5 ? 'leaf2' : 'leaf3');
        if (rnd() < 0.6) { const f = fl[(rnd() * fl.length) | 0]; D(x, px, wy + wh + 2 - h, f); D(x, px + 1, wy + wh + 2 - h, f); if (rnd() < 0.5) D(x, px, wy + wh + 1 - h, f); }
      }
      D(x, wx - 2, wy + wh + 4, 'leaf3'); D(x, wx - 2, wy + wh + 5, 'leaf3'); D(x, wx + ww + 1, wy + wh + 4, 'leaf3');
    }
    return { gx, gy, gw, gh, mx, my };
  }
  function doorAt(x, dx, base, dw, dh, o = {}) {
    const ramp = o.ramp || ['wood1', 'wood2', 'wood3', 'wood4'], top = base - dh;
    R(x, dx - 2, top - 2, dw + 4, dh + 2, 'wood4'); R(x, dx - 1, top - 1, dw + 2, dh + 1, 'wood3');
    R(x, dx, top, dw, dh, ramp[1]);
    for (let px = dx + 3; px < dx + dw; px += 4) R(x, px, top + 1, 1, dh - 1, ramp[2]);
    R(x, dx, top, 1, dh, ramp[0]);
    R(x, dx, top + 5, dw, 1, ramp[2]); R(x, dx, base - 6, dw, 1, ramp[2]);
    D(x, dx, top, 'wood3'); D(x, dx + dw - 1, top, 'wood3'); D(x, dx, top + 1, 'wood3'); D(x, dx + dw - 1, top + 1, 'wood3');
    R(x, dx + dw - 4, base - 13, 2, 2, 'brass1'); D(x, dx + dw - 3, base - 12, 'brass3');
    if (o.window) { R(x, dx + 3, top + 7, dw - 6, 5, 'wood4'); R(x, dx + 4, top + 8, dw - 8, 3, 'sky2'); D(x, dx + 4, top + 8, 'white'); }
    // step
    R(x, dx - 4, base, dw + 8, 3, 'stone1'); R(x, dx - 4, base, dw + 8, 1, 'stone0'); R(x, dx - 4, base + 3, dw + 8, 1, 'stone3'); R(x, dx + dw + 3, base, 1, 3, 'stone2');
    return { x: dx, y: top, w: dw, h: dh };
  }
  // Front cross-gable: plaster triangle with timber and a small window, framed by two roof slopes.
  function gableAt(x, cx, hw, apex, baseY, rampKey, o = {}) {
    const ramp = RAMP[rampKey];
    poly(x, [[cx - hw + 5, baseY + 1], [cx, apex + 5], [cx + hw - 5, baseY + 1]], o.plaster || 'wall1');
    poly(x, [[cx + 1, apex + 6], [cx + hw - 5, baseY + 1], [cx + 1, baseY + 1]], 'wall2');
    R(x, cx - 1, apex + 7, 3, baseY - apex - 6, 'wood3'); D(x, cx - 1, apex + 8, 'wood2');
    R(x, cx - hw + 7, baseY - 2, 2 * hw - 13, 2, 'wood3');
    if (o.braces) { L(x, cx - 2, apex + 16, cx - hw + 11, baseY - 3, 'wood3'); L(x, cx - 2, apex + 17, cx - hw + 11, baseY - 2, 'wood4'); L(x, cx + 2, apex + 16, cx + hw - 11, baseY - 3, 'wood3'); L(x, cx + 2, apex + 17, cx + hw - 11, baseY - 2, 'wood4'); }
    if (o.round) { E(x, cx, o.round, 4, 4, 'wood4'); E(x, cx, o.round, 3, 3, 'sky2'); D(x, cx - 1, o.round - 1, 'white'); R(x, cx, o.round - 3, 1, 7, 'wood3'); R(x, cx - 3, o.round, 7, 1, 'wood3'); }
    for (let s = -1; s <= 1; s += 2) for (let y = apex; y <= baseY + 3; y++) {
      const t = (y - apex) / (baseY + 3 - apex), ex = Math.round(cx + s * (hw + 1) * t);
      for (let k = 0; k < 6; k++) {
        const px = ex + s * (k - 4); let c = s < 0 ? (k === 5 ? ramp[4] : k === 4 ? ramp[0] : (y + k) % 4 === 0 ? ramp[2] : ramp[1]) : (k === 5 ? ramp[4] : (y + k) % 4 === 0 ? ramp[3] : ramp[2]);
        if (k === 0) c = ramp[4];
        D(x, px, y, c);
      }
    }
    R(x, cx - 1, apex - 1, 3, 2, ramp[4]); D(x, cx, apex - 1, ramp[1]);
  }
  function chimneyAt(x, cx, top, bottom, w = 8, brick = ['roofR2', 'roofR3', 'wall2']) {
    const l = cx - (w >> 1);
    R(x, l, top, w, bottom - top, brick[0]);
    for (let y = top + 3, r = 0; y < bottom; y += 4, r++) { R(x, l, y, w, 1, brick[2]); for (let px = l + (r % 2 ? 2 : 4); px < l + w - 2; px += 4) { D(x, px, y + 1, brick[2]); D(x, px, y + 2, brick[2]); } }
    R(x, l, top, 1, bottom - top, brick[3] || brick[0]); R(x, l + w - 2, top, 2, bottom - top, brick[1]);
    R(x, l - 1, top - 3, w + 2, 3, 'stone1'); R(x, l - 1, top - 3, w + 2, 1, 'stone0'); R(x, l + w - 1, top - 2, 2, 2, 'stone3');
    R(x, l + 1, top - 3, w - 2, 1, 'ink2');
    R(x, l - 1, top - 4, w + 2, 1, 'stone4'); R(x, l - 2, top - 3, 1, 3, 'stone4'); R(x, l + w + 1, top - 3, 1, 3, 'stone4');
    return [cx, top - 4];
  }
  // A small iron bracket sign; icon(x, left, top) draws the picture.
  function bracketSign(x, wallX, y, dir, w, h, icon) {
    const bx = wallX + dir * 2, far = wallX + dir * (w + 4);
    L(x, wallX, y, far, y, 'iron3'); L(x, wallX, y + 1, wallX + dir * 4, y - 2 + 5, 'iron3'); D(x, wallX, y - 1, 'iron2');
    const l = Math.min(bx, far) + (dir > 0 ? 1 : 0), top = y + 3;
    D(x, l + 1, y + 1, 'iron2'); D(x, l + 1, y + 2, 'iron2'); D(x, l + w - 2, y + 1, 'iron2'); D(x, l + w - 2, y + 2, 'iron2');
    R(x, l - 1, top - 1, w + 2, h + 2, 'wood4'); R(x, l, top, w, h, 'wood1'); R(x, l, top + h - 1, w, 1, 'wood2'); R(x, l + w - 1, top, 1, h, 'wood2');
    icon(x, l, top);
  }

  /* ---------- houses ---------- */
  RAMP.S = ['stone1', 'stone2', 'stone3', 'stone4', 'stone5'];
  function onCanvas(x0, y0, x1, y1) { const [c, x] = canvas(x1 - x0, y1 - y0); x.translate(-x0, -y0); return [c, x]; }
  const ICON = {
    bread: (x, l, t) => S(x, l + 2, t + 2, ['..3333..', '.301103.', '31010113', '.333333.'], { 3: 'wood3', 0: 'wood0', 1: 'wood2' }),
    scissors: (x, l, t) => S(x, l + 2, t + 1, ['1....1..', '.1..1...', '..11....', '..11....', '.2..2...', '2.22.2..'], { 1: 'iron2', 2: 'red' }),
    watch: (x, l, t) => S(x, l + 2, t + 1, ['..3..', '.333.', '31113', '31013', '31113', '.333.'], { 3: 'brass3', 1: 'cream0', 0: 'ink2' }),
  };
  function moss(x, pts) { for (const [px, py, n] of pts) for (let k = 0; k < n; k++) { R(x, px + k * 2, py - (k & 1), 3, 2, 'grass2'); D(x, px + k * 2, py - (k & 1), 'grass1'); D(x, px + k * 2 + 2, py + 1 - (k & 1), 'grass4'); } }
  function bakery() {
    const x0 = 130, x1 = 242, base = 322, top = 288;
    const [c, x] = onCanvas(100, 226, 262, 332);
    wall(x, x0, x1, top, base, { posts: [172, 197] });
    const wins = [windowAt(x, 142, 297, 20, 13, { shutters: ['cap1', 'cap3'] }), windowAt(x, 210, 297, 20, 13, { flowers: ['yellow', 'white', 'orange'] })];
    doorAt(x, 179, base, 14, 25, { window: true });
    roof(x, 124, 248, 248, top + 2, 'R', 'barrel', 5, 11);
    gableAt(x, 186, 25, 253, top + 2, 'R', { round: 275 });
    const smoke = chimneyAt(x, 226, 240, 258, 8, ['roofR2', 'roofR3', 'roofR1', 'roofR1']);
    bracketSign(x, x0 - 1, 293, -1, 13, 9, ICON.bread);
    return { img: c, ox: 100, oy: 226, y: base, wins, smoke: [smoke], keep: [118, 244, 132, 80], shadow: [['r', x1 + 1, top + 4, 4, base - top - 2], ['r', x0 + 2, base + 1, x1 - x0 + 2, 3]] };
  }
  function tailor() {
    const x0 = 480, x1 = 590, base = 320, top = 286;
    const [c, x] = onCanvas(460, 228, 620, 330);
    wall(x, x0, x1, top, base, { stoneTo: 310, beam: 308, posts: [524, 549], braces: [[484, 306, 496, 291], [586, 306, 574, 291]] });
    const wins = [windowAt(x, 500, 293, 18, 12, { shutters: ['roofB1', 'roofB3'], flowers: ['white', 'lilac', 'blue'] }), windowAt(x, 558, 293, 20, 12, { dress: true, flowers: ['pink', 'white', 'yellow'] })];
    doorAt(x, 530, base, 14, 25, { ramp: ['roofB0', 'roofB1', 'roofB2', 'roofB3'], window: true });
    const edge = roof(x, 474, 596, 248, top + 2, 'B', 'slate', 5, 23); void edge;
    // dormer
    R(x, 505, 262, 20, 15, 'wall1'); R(x, 505, 262, 20, 1, 'wall2'); R(x, 523, 262, 2, 15, 'wall2'); R(x, 504, 262, 1, 15, 'roofB4'); R(x, 525, 262, 1, 15, 'roofB4');
    wins.push(windowAt(x, 510, 265, 10, 9, { box: false }));
    R(x, 504, 277, 22, 1, 'roofB4');
    gableAt(x, 515, 14, 252, 263, 'B', {});
    const smoke = chimneyAt(x, 580, 244, 262, 8, ['stone2', 'stone3', 'stone1']);
    bracketSign(x, x0 - 1, 291, -1, 12, 9, ICON.scissors);
    return { img: c, ox: 460, oy: 228, y: base, wins, smoke: [smoke], keep: [468, 244, 136, 80], shadow: [['r', x1 + 1, top + 4, 4, base - top - 2], ['r', x0 + 2, base + 1, x1 - x0 + 2, 3]] };
  }
  function cottage() {
    const x0 = 540, x1 = 636, base = 528, top = 496;
    const [c, x] = onCanvas(520, 436, 656, 538);
    wall(x, x0, x1, top, base, { posts: [571, 597], plaster: 'wall0' });
    const wins = [windowAt(x, 549, 505, 16, 11, { shutters: ['cap1', 'cap3'] }), windowAt(x, 607, 505, 18, 11, { flowers: ['rose', 'yellow', 'white'] })];
    doorAt(x, 577, base, 14, 25, { ramp: ['cap0', 'cap1', 'cap3', 'cap4'] });
    roof(x, 534, 642, 458, top + 2, 'S', 'slate', 5, 37);
    moss(x, [[548, 472, 3], [612, 488, 2], [598, 466, 2], [560, 490, 2]]);
    gableAt(x, 584, 19, 463, top + 2, 'S', { round: 482 });
    const smoke = chimneyAt(x, 622, 446, 466, 8, ['stone2', 'stone3', 'stone1']);
    return { img: c, ox: 520, oy: 436, y: base, wins, smoke: [smoke], keep: [528, 452, 120, 84], shadow: [['r', x1 + 1, top + 4, 4, base - top - 2], ['r', x0 + 2, base + 1, x1 - x0 + 2, 3]] };
  }

  /* ---------- Marlow's shop ---------- */
  const LANTERN_X = [312, 328, 344, 360, 376, 392, 408], LANTERN_Y = 213;
  const LANTERN = ['..44..', '.2112.', '3gGgw3', '3gggg3', '3gggg3', '3gggw3', '.2222.', '..22..'];
  const LANTERN_OFF = { 4: 'iron3', 2: 'brass2', 1: 'brass1', 3: 'brass3', g: 'sky1', G: 'white', w: 'sky2' };
  function awning(x, l, r, top, bot, stripe = 4) {
    for (let y = top; y <= bot; y++) {
      const grow = Math.round(((y - top) / (bot - top)) * 1);
      for (let px = l - grow; px <= r + grow; px++) {
        const s = Math.floor((px - l + 64) / stripe) % 2, lit = y < top + 2;
        D(x, px, y, s ? (lit ? 'cream0' : y > bot - 2 ? 'cream2' : 'cream1') : lit ? 'cap1' : y > bot - 2 ? 'cap3' : 'cap2');
      }
      D(x, l - grow - 1, y, 'cap4'); D(x, r + grow + 1, y, 'cap4');
    }
    R(x, l - 1, top - 1, r - l + 3, 1, 'cap4');
    for (let px = l - 1; px <= r + 1; px++) { // scalloped valance
      const s = Math.floor((px - l + 64) / stripe) % 2, i = (px - l + 64) % stripe, tongue = i > 0 && i < stripe - 1;
      D(x, px, bot + 1, s ? 'cream1' : 'cap3'); if (tongue) D(x, px, bot + 2, s ? 'cream2' : 'cap3');
      D(x, px, tongue ? bot + 3 : bot + 2, 'cap4');
    }
  }
  function pot(x, cx, base, plant) {
    R(x, cx - 3, base - 5, 7, 5, 'roofR2'); R(x, cx - 4, base - 6, 9, 2, 'roofR1'); R(x, cx - 3, base - 5, 1, 4, 'roofR1');
    R(x, cx + 2, base - 4, 1, 4, 'roofR3'); R(x, cx - 2, base - 1, 5, 1, 'roofR3'); R(x, cx - 4, base - 7, 9, 1, 'roofR3');
    if (plant === 'shrub') { E(x, cx, base - 12, 5, 5, 'leaf4'); E(x, cx - 1, base - 13, 4, 4, 'leaf3'); E(x, cx - 2, base - 14, 2, 2, 'leaf2'); D(x, cx - 2, base - 15, 'leaf1'); D(x, cx + 2, base - 11, 'leaf5'); }
    else { for (let k = -3; k <= 3; k += 2) { R(x, cx + k, base - 10 + Math.abs(k), 1, 4, 'leaf3'); D(x, cx + k, base - 11 + Math.abs(k), k % 3 ? 'rose' : 'yellow'); D(x, cx + k + 1, base - 11 + Math.abs(k), 'pink'); } }
  }
  function shop() {
    const x0 = 304, x1 = 416, base = 250, top = 206;
    const [c, x] = onCanvas(288, 150, 440, 256);
    wall(x, x0, x1, top, base, { plaster: 'wall0' });
    // display window full of trinkets
    R(x, 306, 227, 44, 21, 'wood4'); R(x, 307, 228, 42, 19, 'wood2'); R(x, 307, 228, 42, 1, 'wood1');
    R(x, 309, 230, 38, 15, 'wall2'); R(x, 309, 230, 38, 2, 'wall3'); R(x, 309, 237, 38, 1, 'wood3'); R(x, 309, 244, 38, 1, 'wood3');
    S(x, 311, 232, ['.333.', '31113', '31013', '31113', '.333.'], { 3: 'brass3', 1: 'cream0', 0: 'ink2' });           // clock
    S(x, 318, 233, ['.11..', '1111.', '11112', '.222.'], { 1: 'roofG1', 2: 'roofG3' });                                  // teapot
    S(x, 325, 232, ['.pp.', '.pp.', 'rrrr', '.rr.', '.rr.'], { p: 'ant0', r: 'rose' });                                   // doll
    S(x, 331, 233, ['bbbb', 'yyyy', 'rrrr', 'bbbb'], { b: 'blue', y: 'yellow', r: 'red' });                              // books
    S(x, 338, 231, ['..44..', '.4bb4.', '4bggb4', '4bbgb4', '.4bb4.', '..33..'], { 4: 'brass3', b: 'blue', g: 'cap1', 3: 'brass2' }); // globe
    S(x, 311, 239, ['wwwww', 'w333w', 'wwwww'], { w: 'wood1', 3: 'brass1' });                                          // music box
    S(x, 318, 239, ['.222.', '21112', '21012', '.222.'], { 2: 'iron3', 1: 'iron1', 0: 'ink2' });                        // camera
    S(x, 325, 240, ['rr.rr', 'rrrrr'], { r: 'red' });                                                                    // shoes
    S(x, 332, 238, ['.cccc', 'c2222', 'c2222', 'cccc.'], { c: 'cream2', 2: 'cream0' });                                 // letters
    S(x, 339, 239, ['333', '3.3', '333'], { 3: 'brass2' }); S(x, 342, 240, ['1111', '1111'], { 1: 'wood3' });            // key and a small case
    for (let k = 0; k < 4; k++) { D(x, 310 + k, 233 - k, 'white'); D(x, 311 + k, 233 - k, 'white'); }
    R(x, 327, 228, 1, 19, 'wood3');
    R(x, 305, 247, 46, 1, 'wood1'); R(x, 305, 248, 46, 1, 'wood3');
    awning(x, 306, 349, 220, 227);
    const wins = [{ gx: 309, gy: 230, gw: 38, gh: 15, mx: 327, my: 237 }];
    doorAt(x, 353, base, 14, 26, { ramp: ['roofG0', 'roofG1', 'roofG2', 'roofG3'], window: true });
    wins.push(windowAt(x, 380, 227, 24, 14, { flowers: ['yellow', 'white', 'pink'] }));
    // door bell on a little bracket
    R(x, 369, 223, 4, 1, 'iron3'); D(x, 372, 224, 'iron3'); S(x, 371, 225, ['.1.', '121', '232'], { 1: 'brass1', 2: 'brass2', 3: 'brass3' });
    roof(x, 296, 424, 158, top + 2, 'G', 'scale', 6, 47);
    gableAt(x, 360, 31, 157, top + 2, 'G', { round: 180, braces: true });
    R(x, 340, 194, 41, 11, 'wood4'); R(x, 341, 195, 39, 9, 'cream0'); R(x, 341, 203, 39, 1, 'cream2'); R(x, 379, 195, 1, 9, 'cream2');
    TX(x, "MARLOW'S", 346, 197, 'roofG4');
    // garland of seven lanterns
    for (let i = 0; i < 7; i++) {
      const a = LANTERN_X[i], b = i < 6 ? LANTERN_X[i + 1] : 414;
      L(x, i ? a : 305, i ? LANTERN_Y : 211, a, LANTERN_Y, 'ink2'); L(x, a, LANTERN_Y, a + 8, LANTERN_Y + 2, 'ink2'); L(x, a + 8, LANTERN_Y + 2, b, i < 6 ? LANTERN_Y : 211, 'ink2');
    }
    for (const lx of LANTERN_X) S(x, lx - 3, LANTERN_Y, LANTERN, LANTERN_OFF);
    bracketSign(x, x1 + 1, 214, 1, 11, 10, ICON.watch);
    pot(x, 345, base + 1, 'shrub'); pot(x, 374, base + 1, 'flowers');
    R(x, 353, base + 4, 14, 2, 'roofG2'); R(x, 353, base + 4, 14, 1, 'roofG1'); for (let i = 355; i < 366; i += 3) D(x, i, base + 5, 'cream1');
    return { img: c, ox: 288, oy: 150, y: base, wins, keep: [300, 246, 120, 10], shadow: [['r', x1 + 1, top + 4, 4, base - top - 2], ['r', x0 + 2, base + 1, x1 - x0 + 2, 3]] };
  }
  // Ordered-dither reveal: each pixel appears when progress passes its threshold (bottom first, Bayer-dithered).
  const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  const revealAt = (x, y, h) => 0.74 * (1 - y / h) + 0.25 * (BAYER[(y & 7) * 8 + (x & 7)] / 64);
  const revealCache = new Map();
  function revealImg(img, v, p) {
    const q = Math.round(p * 160), k = v + ':' + q;
    let c = revealCache.get(k); if (c) return c;
    if (revealCache.size > 12) revealCache.clear();
    const src = G(img, v), w = src.width, h = src.height, [out, x] = canvas(w, h);
    x.drawImage(src, 0, 0);
    const d = x.getImageData(0, 0, w, h), px = d.data, pp = q / 160, glint = rgbOf('light0'), glint2 = rgbOf('white');
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
      const o = (y * w + i) * 4; if (!px[o + 3]) continue;
      const r = revealAt(i, y, h);
      if (r >= pp) px[o + 3] = 0;
      else if (r > pp - 0.03) { const g = (i + y) & 1 ? glint : glint2; px[o] = g[0]; px[o + 1] = g[1]; px[o + 2] = g[2]; }
    }
    x.putImageData(d, 0, 0); revealCache.set(k, out); return out;
  }

  /* ---------- props (sprites anchored at their feet line) ---------- */
  // Iron lamp post: head glass at (3..7, 3..8); returns sprite + glass rect relative to sprite.
  function ironLamp() {
    const [c, x] = canvas(11, 36);
    R(x, 4, 0, 3, 1, 'iron4'); R(x, 3, 1, 5, 1, 'iron3'); D(x, 3, 1, 'iron2'); R(x, 1, 2, 9, 1, 'iron4');
    R(x, 2, 3, 7, 7, 'iron4'); R(x, 3, 3, 5, 6, 'sky1'); D(x, 3, 3, 'white'); D(x, 4, 4, 'white'); R(x, 5, 3, 1, 6, 'iron3');
    R(x, 2, 9, 7, 1, 'iron3'); R(x, 3, 10, 5, 1, 'iron4');
    R(x, 4, 11, 3, 20, 'iron3'); R(x, 4, 11, 1, 20, 'iron2'); R(x, 6, 11, 1, 20, 'iron4'); R(x, 3, 13, 5, 1, 'iron4'); R(x, 3, 27, 5, 1, 'iron4');
    R(x, 2, 31, 7, 4, 'stone1'); R(x, 2, 31, 7, 1, 'stone0'); R(x, 2, 34, 7, 1, 'stone3'); R(x, 8, 31, 1, 4, 'stone2'); R(x, 1, 31, 1, 4, 'stone3'); R(x, 9, 31, 1, 4, 'stone3');
    return { img: c, ax: 5, ay: 35, glass: [3, 3, 5, 6], head: [5, 6] };
  }
  // Wooden post with an arm and a hanging lantern (faces right).
  function woodLamp() {
    const [c, x] = canvas(16, 38);
    R(x, 2, 4, 3, 30, 'wood3'); R(x, 2, 4, 1, 30, 'wood2'); R(x, 4, 4, 1, 30, 'wood4'); R(x, 1, 3, 5, 1, 'wood4'); R(x, 2, 2, 3, 1, 'wood2');
    R(x, 2, 6, 12, 2, 'wood3'); R(x, 2, 6, 12, 1, 'wood2'); R(x, 13, 6, 1, 2, 'wood4'); L(x, 5, 12, 9, 8, 'wood3');
    S(x, 9, 8, ['..4...', '.2112.', '3gGgw3', '3gggg3', '3gggg3', '3gggw3', '.2222.', '..22..'], LANTERN_OFF);
    R(x, 1, 33, 5, 4, 'stone1'); R(x, 1, 33, 5, 1, 'stone0'); R(x, 1, 36, 5, 1, 'stone3'); R(x, 5, 33, 1, 4, 'stone2');
    return { img: c, ax: 3, ay: 36, glass: [10, 10, 4, 4], head: [12, 13] };
  }
  function bench() {
    const [c, x] = canvas(24, 14);
    R(x, 1, 0, 22, 5, 'wood4'); R(x, 2, 1, 20, 1, 'wood1'); R(x, 2, 2, 20, 1, 'wood2'); R(x, 2, 3, 20, 1, 'wood3');
    R(x, 2, 0, 3, 11, 'wood3'); R(x, 19, 0, 3, 11, 'wood3'); D(x, 2, 0, 'wood2'); D(x, 19, 0, 'wood2');
    R(x, 0, 5, 24, 5, 'wood4'); R(x, 1, 6, 22, 1, 'wood0'); R(x, 1, 7, 22, 1, 'wood1'); R(x, 1, 8, 22, 1, 'wood2');
    for (let i = 5; i < 22; i += 6) D(x, i, 7, 'wood2');
    R(x, 2, 10, 2, 3, 'wood4'); R(x, 20, 10, 2, 3, 'wood4'); R(x, 1, 9, 22, 1, 'wood3');
    return { img: c, ax: 12, ay: 12 };
  }
  function barrel() {
    const [c, x] = canvas(12, 14);
    E(x, 6, 3, 5, 2, 'wood4'); E(x, 6, 3, 4, 1, 'wood1'); D(x, 4, 3, 'wood0'); D(x, 6, 3, 'wood2');
    R(x, 1, 4, 10, 8, 'wood2'); R(x, 1, 4, 2, 8, 'wood1'); R(x, 8, 4, 3, 8, 'wood3'); R(x, 0, 5, 1, 6, 'wood4'); R(x, 11, 5, 1, 6, 'wood4');
    for (const y of [5, 10]) { R(x, 1, y, 10, 1, 'iron2'); D(x, 1, y, 'iron1'); R(x, 8, y, 3, 1, 'iron3'); }
    R(x, 2, 12, 8, 1, 'wood4'); D(x, 5, 7, 'wood3'); D(x, 5, 8, 'wood3');
    return { img: c, ax: 6, ay: 12 };
  }
  function crate(fill) {
    const [c, x] = canvas(14, 16);
    R(x, 0, 3, 14, 13, 'wood4'); R(x, 1, 4, 12, 3, 'wood1'); R(x, 1, 7, 12, 8, 'wood2');
    R(x, 1, 10, 12, 1, 'wood3'); R(x, 12, 7, 1, 8, 'wood3'); L(x, 2, 8, 11, 14, 'wood3'); D(x, 1, 7, 'wood3');
    if (fill === 'bread') S(x, 1, 1, ['.0110.1100.', '01111211112', '.2222.2222.'], { 0: 'wood0', 1: 'wood1', 2: 'wood3' });
    if (fill === 'apples') S(x, 1, 2, ['.rr.rr.rr.r', 'rRrrRrrRrrR', '.rr.rr.rr.r'], { r: 'red', R: 'rose' });
    if (fill === 'oranges') S(x, 1, 2, ['.oo.oo.oo.o', 'oyooyooyooy', '.oo.oo.oo.o'], { o: 'orange', y: 'yellow' });
    if (fill === 'pears') S(x, 1, 2, ['.gg.gg.gg.g', 'g0ggg0ggg0g', '.gg.gg.gg.g'], { g: 'grass1', 0: 'grass0' });
    if (fill === 'greens') S(x, 1, 1, ['.cc..cc..c.', 'cCcccCcccCc', 'cccccccccc.'], { c: 'cap2', C: 'cap1' });
    return { img: c, ax: 7, ay: 15 };
  }
  function noticeBoard() {
    const [c, x] = canvas(24, 28);
    R(x, 3, 8, 3, 20, 'wood3'); R(x, 18, 8, 3, 20, 'wood3'); R(x, 3, 8, 1, 20, 'wood2'); R(x, 18, 8, 1, 20, 'wood2');
    R(x, 0, 2, 24, 3, 'roofR2'); R(x, 0, 2, 24, 1, 'roofR1'); R(x, 0, 5, 24, 1, 'roofR4'); R(x, 1, 1, 22, 1, 'roofR3');
    R(x, 1, 6, 22, 14, 'wood4'); R(x, 2, 7, 20, 12, 'dirt2'); R(x, 2, 7, 20, 1, 'dirt3');
    for (const [px, py, w, h, col] of [[3, 8, 6, 7, 'cream0'], [10, 9, 5, 5, 'yellow'], [16, 8, 5, 8, 'cream1'], [9, 15, 7, 3, 'cream0'], [3, 16, 4, 2, 'pink']]) {
      R(x, px, py, w, h, col); R(x, px, py + h - 1, w, 1, 'cream2'); D(x, px + (w >> 1), py, 'red');
      for (let k = py + 2; k < py + h - 1; k += 2) R(x, px + 1, k, w - 2, 1, 'stone2');
    }
    return { img: c, ax: 12, ay: 27 };
  }
  // Pole with a green banner and a leaf emblem; three waving frames.
  function banner() {
    const frames = [];
    for (let f = 0; f < 3; f++) {
      const [c, x] = canvas(16, 46), sway = [0, 1, -1][f];
      R(x, 7, 2, 2, 42, 'wood3'); D(x, 7, 2, 'wood2'); R(x, 7, 3, 1, 41, 'wood2');
      E(x, 8, 1, 1, 1, 'brass1'); R(x, 2, 5, 12, 2, 'wood3'); R(x, 2, 5, 12, 1, 'wood2');
      for (let y = 7; y < 27; y++) {
        const dx = y > 14 ? Math.round((sway * (y - 14)) / 12) : 0;
        for (let i = 3; i < 13; i++) D(x, i + dx, y, i === 3 ? 'cap1' : i === 12 ? 'cap3' : 'cap2');
      }
      for (let i = 3; i < 13; i++) { const cut = Math.abs(i - 7.5) < 2.5 ? Math.round(2.5 - Math.abs(i - 7.5)) : 0; const dx = Math.round((sway * 13) / 12); for (let k = 0; k <= 2 - cut; k++) D(x, i + dx, 27 + k, i === 12 ? 'cap3' : 'cap2'); D(x, i + dx, 28 - cut + 2, 'cap4'); }
      R(x, 3, 7, 10, 1, 'cap4'); if (f) R(x, 8 + sway * 2, 16, 1, 9, 'cap3');
      S(x, 5 + (f === 1 ? 1 : 0), 11, ['..y..', '.yyy.', 'yy0yy', '.y0y.', '..0..'], { y: 'brass0', 0: 'brass2' });
      R(x, 6, 44, 4, 1, 'wood4');
      frames.push(c);
    }
    return { frames, ax: 8, ay: 44 };
  }
  function well() {
    const [c, x] = canvas(34, 46), cx = 17, rimY = 35;
    // posts, beam, roof
    R(x, 4, 12, 3, 26, 'wood3'); R(x, 4, 12, 1, 26, 'wood2'); R(x, 27, 12, 3, 26, 'wood3'); R(x, 27, 12, 1, 26, 'wood2');
    R(x, 4, 15, 26, 2, 'wood2'); R(x, 4, 16, 26, 1, 'wood4'); R(x, 30, 14, 3, 1, 'iron3'); R(x, 32, 14, 1, 4, 'iron3');
    roof(x, 0, 33, 1, 12, 'R', 'barrel', 3, 91);
    R(x, cx, 17, 1, 11, 'dirt3'); R(x, cx - 2, 26, 5, 4, 'wood2'); R(x, cx - 2, 26, 5, 1, 'iron2'); R(x, cx + 2, 26, 1, 4, 'wood3');
    // rim: stones around the dark water
    E(x, cx, rimY, 14, 6, 'stone4'); E(x, cx, rimY, 13, 5, 'stone1'); E(x, cx, rimY - 1, 9, 3, 'stone3'); E(x, cx, rimY - 1, 8, 2, 'water5');
    R(x, cx - 4, rimY - 2, 3, 1, 'water3'); D(x, cx + 3, rimY, 'water4');
    for (let i = -12; i <= 12; i += 5) D(x, cx + i, rimY - 4 + Math.round(Math.abs(i) / 5), 'stone2');
    R(x, 3, rimY + 1, 29, 6, 'stone2'); R(x, 3, rimY + 1, 29, 1, 'stone1');
    for (let px = 3; px < 32; px += 6) { R(x, px, rimY + 2, 1, 4, 'stone3'); R(x, px + 1, rimY + 2, 1, 1, 'stone0'); }
    R(x, 3, rimY + 4, 29, 1, 'stone3'); R(x, 4, rimY + 7, 27, 1, 'stone4'); R(x, 2, rimY + 1, 1, 6, 'stone4'); R(x, 32, rimY + 1, 1, 6, 'stone4');
    R(x, 4, rimY + 6, 27, 1, 'stone3');
    for (const [px, col] of [[5, 'pink'], [9, 'white'], [24, 'yellow'], [28, 'pink']]) { R(x, px, rimY + 5, 2, 2, 'leaf3'); D(x, px, rimY + 4, col); D(x, px + 1, rimY + 5, col); }
    return { img: c, ax: 17, ay: 43 };
  }
  function signpost() {
    const [c, x] = canvas(44, 30);
    R(x, 5, 4, 3, 26, 'wood3'); R(x, 5, 4, 1, 26, 'wood2'); R(x, 7, 4, 1, 26, 'wood4');
    poly(x, [[1, 6], [37, 6], [42, 10.5], [37, 15], [1, 15]], 'wood4'); poly(x, [[2, 7], [37, 7], [41, 10.5], [37, 14], [2, 14]], 'wood1');
    R(x, 2, 13, 36, 1, 'wood2'); TX(x, 'BELLWOOD', 4, 8, 'wood4');
    R(x, 3, 29, 7, 1, 'grass4');
    return { img: c, ax: 6, ay: 29 };
  }
  // Round stone planter heaped with flowers.
  function planter(seed, fl) {
    const [c, x] = canvas(24, 18), rnd = rng(seed);
    for (let y = 11; y <= 15; y++) { const hw = Math.round(10 * Math.sqrt(Math.max(0, 1 - ((y - 11) / 5.5) ** 2))); R(x, 12 - hw, y, hw * 2 + 1, 1, y === 15 ? 'stone3' : 'stone2'); }
    for (let px = 5; px < 20; px += 5) R(x, px, 12, 1, 3, 'stone3');
    E(x, 12, 11, 11, 4, 'stone4'); E(x, 12, 11, 10, 3, 'stone1'); E(x, 11, 10, 9, 2, 'stone0'); E(x, 12, 10, 8, 2, 'dirt3');
    E(x, 12, 7, 8, 5, 'leaf4'); E(x, 11, 6, 7, 4, 'leaf3'); E(x, 10, 5, 5, 3, 'leaf2'); R(x, 7, 3, 3, 1, 'leaf1');
    for (let i = 0; i < 9; i++) { const px = 5 + ((rnd() * 14) | 0), py = 2 + ((rnd() * 7) | 0), f = fl[i % fl.length]; R(x, px, py, 2, 2, f); D(x, px + 1, py + 1, i % 2 ? 'yellow' : 'white'); }
    return { img: c, ax: 12, ay: 16 };
  }
  function rock(w, h, seed, mossy = true) {
    const [c, x] = canvas(w + 2, h + 2), rnd = rng(seed), cx = (w + 2) / 2, cy = h / 2 + 1;
    E(x, cx, cy, w / 2, h / 2, 'stone4'); E(x, cx - 0.5, cy - 0.5, w / 2 - 1, h / 2 - 1, 'stone2'); E(x, cx - 1.5, cy - 1.5, w / 2 - 3, h / 2 - 3, 'stone1');
    E(x, cx - 2, cy - 2, Math.max(1, w / 5), Math.max(1, h / 6), 'stone0');
    R(x, cx - w / 2 + 2, cy + h / 2 - 2, w - 4, 1, 'stone3');
    if (mossy) for (let i = 0; i < w / 4; i++) { const px = cx - w / 3 + rnd() * (w / 1.6), py = cy - h / 2 + rnd() * 2; R(x, px, py, 3, 2, 'grass2'); D(x, px, py, 'grass1'); D(x, px + 2, py + 1, 'grass3'); }
    return { img: c, ax: Math.round(cx), ay: h + 1 };
  }

  // Market stall (two awning-flutter frames). Local origin = world (556, 352); feet line at local y 66.
  function stall() {
    const frames = [];
    for (let f = 0; f < 2; f++) {
      const [c, x] = canvas(110, 70);
      for (const px of [6, 99]) { R(x, px, 12, 3, 55, 'wood3'); R(x, px, 12, 1, 55, 'wood2'); R(x, px + 2, 12, 1, 55, 'wood4'); }
      // counter with a tablecloth
      R(x, 3, 44, 104, 5, 'wood4'); R(x, 4, 45, 102, 1, 'wood0'); R(x, 4, 46, 102, 2, 'wood1');
      R(x, 4, 49, 102, 15, 'wood2'); for (let px = 8; px < 106; px += 7) R(x, px, 50, 1, 14, 'wood3');
      R(x, 4, 49, 102, 7, 'cream0'); R(x, 4, 55, 102, 1, 'cream1');
      for (let px = 4; px < 106; px++) { D(x, px, 56, px % 6 < 3 ? 'cap2' : 'cream1'); if (px % 6 === 1) D(x, px, 57, 'cap3'); }
      R(x, 3, 64, 104, 1, 'wood4'); R(x, 106, 45, 1, 19, 'wood4'); R(x, 3, 45, 1, 19, 'wood4');
      // produce and the scale
      [['apples', 12], ['oranges', 28], ['pears', 44], ['greens', 60]].forEach(([k, px]) => x.drawImage(crate(k).img, px, 30));
      R(x, 86, 30, 1, 14, 'brass3'); R(x, 83, 43, 7, 2, 'brass2'); R(x, 78, 30, 17, 1, 'brass2'); D(x, 86, 29, 'brass1');
      S(x, 76, 31, ['1...1', '.1.1.', '22222', '.333.'], { 1: 'brass3', 2: 'brass1', 3: 'brass2' });
      S(x, 91, 31, ['1...1', '.1.1.', '22222', '.333.'], { 1: 'brass3', 2: 'brass1', 3: 'brass2' });
      S(x, 78, 32, ['rr.'], { r: 'red' });
      // awning with a fluttering valance
      awning(x, 2, 106, 8, 18, 5);
      if (f) for (let px = 1; px <= 107; px++) { const i = (px - 2 + 64) % 5, s = Math.floor((px - 2 + 64) / 5) % 2; if (i > 0 && i < 4 && s) { D(x, px, 21, 'cream2'); D(x, px, 22, 'cap4'); } }
      R(x, 42, 0, 27, 9, 'wood4'); R(x, 43, 1, 25, 7, 'cream0'); R(x, 43, 7, 25, 1, 'cream2'); TX(x, 'FRUIT', 46, 2, 'red');
      S(x, 100, 22, ['..4...', '.2112.', '3gGgw3', '3gggg3', '3gggw3', '.2222.'], LANTERN_OFF);
      frames.push(c);
    }
    return { frames, ox: 556, oy: 352, y: 418, glass: [102, 24, 4, 3] };
  }
  // Bridge rope rails: the back rail stands behind walkers, the low front rail in front of them.
  function rail(front) {
    const x0 = BR.x0 - 2, x1 = BR.x1 + 2, top = front ? BR.y1 - 11 : BR.y0 - 14, bot = front ? BR.y1 + 5 : BR.y0 + 2;
    const [c, x] = canvas(x1 - x0 + 1, bot - top + 1);
    const posts = [x0, 154, 177, 200, x1 - 3];
    const rope = (a, b, y) => { for (let px = a; px <= b; px++) { const s = Math.round(2 * Math.sin((Math.PI * (px - a)) / (b - a))); D(x, px - x0, y + s - top, px % 2 ? 'dirt2' : 'dirt3'); } };
    for (let i = 0; i + 1 < posts.length; i++) { rope(posts[i] + 3, posts[i + 1], top + 3); if (!front) rope(posts[i] + 3, posts[i + 1], top + 8); }
    posts.forEach((px, i) => {
      const end = i === 0 || i === posts.length - 1, y0 = end ? 0 : 2, h = bot - top + 1 - y0, w = end ? 4 : 3;
      R(x, px - x0, y0, w, h, 'wood3'); R(x, px - x0, y0, 1, h, 'wood2'); R(x, px - x0 + w - 1, y0, 1, h, 'wood4');
      R(x, px - x0, y0, w, 1, 'wood1'); R(x, px - x0, y0 + h - 1, w, 1, 'wood5');
    });
    return { img: c, ox: x0, oy: top, y: front ? BR.y1 + 1 : BR.y0 - 1 };
  }
  // Fence run: horizontal (y fixed) returns one sprite at its feet line.
  function fenceH(x0, x1, base) {
    const [c, x] = canvas(x1 - x0 + 4, 12);
    for (const ry of [3, 7]) { R(x, 0, ry, x1 - x0 + 3, 2, 'wood2'); R(x, 0, ry, x1 - x0 + 3, 1, 'wood1'); R(x, 0, ry + 2, x1 - x0 + 3, 1, 'wood4'); }
    for (let px = 0; px <= x1 - x0; px += 8) { R(x, px, 1, 3, 10, 'wood3'); R(x, px, 1, 1, 10, 'wood2'); R(x, px + 2, 1, 1, 10, 'wood4'); R(x, px, 0, 3, 1, 'wood1'); R(x, px, 11, 3, 1, 'wood5'); }
    return { img: c, ox: x0, oy: base - 11, y: base };
  }
  function fencePost(px, base) {
    const [c, x] = canvas(3, 12);
    R(x, 0, 1, 3, 10, 'wood3'); R(x, 0, 1, 1, 10, 'wood2'); R(x, 2, 1, 1, 10, 'wood4'); R(x, 0, 0, 3, 1, 'wood1'); R(x, 0, 11, 3, 1, 'wood5');
    return { img: c, ox: px, oy: base - 11, y: base };
  }
  function vegPatch(x0, y0, x1, y1) {
    const [c, x] = canvas(x1 - x0, y1 - y0), rnd = rng(707);
    R(x, 0, 0, x1 - x0, y1 - y0, 'dirt4');
    for (let r = 0, y = 2; y < y1 - y0 - 4; r++, y += 8) {
      R(x, 1, y, x1 - x0 - 2, 5, 'dirt3'); R(x, 1, y, x1 - x0 - 2, 1, 'dirt2'); R(x, 1, y + 4, x1 - x0 - 2, 1, 'wood4');
      for (let px = 4; px < x1 - x0 - 5; px += 7 + ((rnd() * 2) | 0)) {
        const k = r % 4;
        if (k === 0) { E(x, px + 2, y + 1, 3, 2, 'cap3'); E(x, px + 1, y, 2, 1, 'cap1'); D(x, px, y - 1, 'cap0'); }
        else if (k === 1) { D(x, px + 1, y + 2, 'orange'); D(x, px + 2, y + 2, 'orange'); S(x, px, y - 2, ['l.l', '.l.', '.l.'], { l: 'leaf2' }); }
        else if (k === 2) { E(x, px + 2, y + 1, 2, 2, 'grass2'); D(x, px + 1, y, 'grass0'); D(x, px + 3, y + 2, 'grass3'); }
        else { S(x, px, y - 1, ['.oo.', 'oyoo', 'oooo', '.33.'], { o: 'orange', y: 'yellow', 3: 'wood4' }); D(x, px + 2, y - 2, 'leaf3'); }
      }
    }
    return { img: c, ox: x0, oy: y0, y: y0 + 2 };
  }
  // Raised bed of tulips in rows.
  function tulipBed(w) {
    const [c, x] = canvas(w, 18), cols = ['red', 'yellow', 'pink', 'rose', 'white', 'orange'], rnd = rng(w * 7);
    R(x, 0, 8, w, 10, 'wood4'); R(x, 1, 8, w - 2, 1, 'wood1'); R(x, 1, 9, w - 2, 5, 'dirt3'); R(x, 1, 14, w - 2, 2, 'wood2'); R(x, 1, 16, w - 2, 1, 'wood3');
    for (let px = 6; px < w - 2; px += 8) R(x, px, 14, 1, 3, 'wood3');
    for (let r = 0; r < 3; r++) for (let px = 3 + (r % 2) * 2; px < w - 3; px += 4) {
      const y = 3 + r * 3, col = cols[(r * 2 + ((px / 4) | 0)) % cols.length];
      R(x, px, y + 2, 1, 4, 'leaf3'); D(x, px - 1, y + 4, 'leaf2'); D(x, px + 1, y + 5, 'leaf2');
      R(x, px - 1, y, 3, 2, col); D(x, px, y - 1, col); D(x, px - 1, y, 'white'); if (rnd() < 0.3) D(x, px + 1, y + 1, 'rose');
    }
    return { img: c, ax: w >> 1, ay: 17 };
  }
  function basket() {
    const [c, x] = canvas(12, 11);
    L(x, 2, 4, 5, 0, 'wood3'); L(x, 6, 0, 9, 4, 'wood3'); R(x, 5, 0, 2, 1, 'wood3');
    R(x, 1, 4, 10, 6, 'wood2'); R(x, 1, 4, 10, 1, 'wood1'); R(x, 2, 6, 8, 1, 'wood3'); R(x, 2, 8, 8, 1, 'wood3'); R(x, 10, 5, 1, 5, 'wood3'); R(x, 1, 10, 10, 1, 'wood4');
    S(x, 2, 2, ['.rr..gg.', 'rrRr.gg.'], { r: 'red', R: 'rose', g: 'cream1' });
    return { img: c, ax: 6, ay: 10 };
  }
  function sunflower(h) {
    const [c, x] = canvas(9, h + 6);
    R(x, 4, 5, 1, h, 'leaf3'); S(x, 1, 8, ['ll.', '.ll'], { l: 'leaf2' }); S(x, 5, 12, ['.ll', 'll.'], { l: 'leaf3' });
    S(x, 1, 0, ['.yyyy.', 'yy33yy', 'y3333y', 'yy33yy', '.yyyy.'], { y: 'yellow', 3: 'wood3' }); D(x, 3, 1, 'orange');
    return { img: c, ax: 4, ay: h + 5 };
  }
  // Washing line from the tailor's wall to a pole; three sway frames.
  function laundry() {
    const x0 = 590, y0 = 288, frames = [];
    for (let f = 0; f < 3; f++) {
      const [c, x] = canvas(60, 36), s = [0, 1, -1][f], ly = px => 9 + Math.round(3 * Math.sin((Math.PI * px) / 52));
      R(x, 52, 6, 3, 30, 'wood3'); R(x, 52, 6, 1, 30, 'wood2'); R(x, 51, 5, 5, 1, 'wood4');
      for (let px = 1; px < 52; px++) D(x, px, ly(px), 'stone3');
      const cloth = (px, rows, key) => rows.forEach((r, j) => { const dx = j > 2 ? s : 0; for (let i = 0; i < r.length; i++) if (r[i] !== '.') D(x, px + i + dx, ly(px + 2) + 1 + j, key[r[i]]); });
      cloth(6, ['bb.bb', 'bbbbb', 'bBbbb', 'bBbbb', '.bbb.', '.bbb.'], { b: 'blue', B: 'water2' });
      cloth(15, ['rr.rr', 'rr.rr', 'rr.rr', 'rw.rw'], { r: 'red', w: 'white' });
      cloth(23, ['wwwwwwwww', 'wcwwwwwww', 'wcwwwwwww', 'wwwwwwwww', 'wwwwwwwww', 'cwcwcwcwc'], { w: 'white', c: 'cloud2' });
      cloth(36, ['.pp.', 'pppp', 'pPpp', 'pppp', 'ppppp', 'pppppp'], { p: 'pink', P: 'white' });
      for (const px of [7, 10, 15, 18, 24, 31, 37, 39]) D(x, px, ly(px) - 1, 'wood2');
      frames.push(c);
    }
    return { frames, ox: x0, oy: y0, y: 322 };
  }

  /* ---------- life: everything that moves (deterministic from t) ---------- */
  const H01 = (i, k) => hash(i, k, 97);
  // Stream arc length, for ripples that travel along the flow.
  function arc(pts) {
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return {
      len: acc[acc.length - 1],
      at(s) {
        let i = 1; while (i < acc.length - 1 && acc[i] < s) i++;
        const t = (s - acc[i - 1]) / (acc[i] - acc[i - 1] || 1), a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        return [a[0] + dx * t, a[1] + dy * t, a[2] + (b[2] - a[2]) * t, -dy / l, dx / l];
      },
    };
  }
  const LOW = arc(STREAM.slice(1)), UP = arc(UPPER);
  const offBridge = (x, y) => x < BR.x0 - 3 || x > BR.x1 + 3 || y < BR.y0 - 3 || y > BR.y1 + 9;
  function ripples(ctx, t, v) {
    for (const [sys, n, seed] of [[LOW, 120, 1], [UP, 14, 2]]) for (let i = 0; i < n; i++) {
      const sp = 7 + H01(i, seed) * 9, s = (H01(i, seed + 10) * sys.len + sp * t) % sys.len, u = (H01(i, seed + 20) * 2 - 1) * 0.72;
      const [cx, cy, hw, nx, ny] = sys.at(s), x = Math.round(cx + nx * u * hw), y = Math.round(cy + ny * u * hw);
      if (x < v.x - 8 || x > v.x + v.w + 8 || y < v.y - 4 || y > v.y + v.h + 4) continue;
      const len = 2 + ((H01(i, seed + 30) * 4) | 0), bright = H01(i, seed + 40) < 0.35;
      if (!water(x, y) || !water(x + len, y) || !water(x, y - 3) || !water(x, y + 2) || !offBridge(x, y) || !offBridge(x + len, y)) continue;
      if ((step(t, 3) + i) % 7 === 0) continue;
      tr(ctx, x, y, len, 1, bright ? 'water0' : 'water1');
      if (!bright && len > 3) tr(ctx, x + 1, y + 1, len - 2, 1, 'water2');
    }
    // twinkles on the surface
    const k = step(t, 2.5);
    for (let i = 0; i < 16; i++) {
      const s = H01(i, k) * LOW.len, [cx, cy, hw, nx, ny] = LOW.at(s), u = (H01(i, k + 500) * 2 - 1) * 0.6;
      const x = Math.round(cx + nx * u * hw), y = Math.round(cy + ny * u * hw);
      if (!water(x - 1, y) || !water(x + 1, y) || !water(x, y - 2) || !offBridge(x, y)) continue;
      td(ctx, x, y, 'white'); if ((step(t, 8) + i) % 3) { td(ctx, x - 1, y, 'water0'); td(ctx, x + 1, y, 'water0'); td(ctx, x, y - 1, 'water0'); td(ctx, x, y + 1, 'water0'); }
    }
  }
  function waterfall(ctx, t) {
    const f = step(t, 12);
    for (let x = FALLS.x0 + 1; x < FALLS.x1; x++) {
      const off = (hash(x, 1, 3) * 16) | 0, sp = 2 + ((hash(x, 2, 3) * 2) | 0);
      for (let y = LEDGE.top; y < LEDGE.bot + 2; y++) {
        const m = (y - f * sp + off + 1600) % 14;
        if (m < 3) td(ctx, x, y, m === 0 ? 'white' : 'water0');
        else if (m < 5 && (x & 1)) td(ctx, x, y, 'water1');
      }
    }
    for (let x = FALLS.x0 - 1; x <= FALLS.x1 + 1; x++) { td(ctx, x, LEDGE.top - 1, (x + f) % 4 ? 'water0' : 'white'); td(ctx, x, LEDGE.top, 'water1'); }
    // foam boil at the foot
    const g = step(t, 8);
    for (let i = 0; i < 11; i++) {
      const x = FALLS.x0 - 4 + ((H01(i, g % 16) * (FALLS.x1 - FALLS.x0 + 8)) | 0), y = LEDGE.bot + 1 + ((H01(i + 40, g % 16) * 6) | 0), r = 1 + ((H01(i + 80, g % 16) * 2.4) | 0);
      ctx.fillStyle = tone(i % 3 ? 'white' : 'water0'); PX.ellipse(ctx, x, y, r + 1, r, ctx.fillStyle);
    }
    for (let x = FALLS.x0 - 6; x <= FALLS.x1 + 6; x++) if ((x + g) % 5 < 3) td(ctx, x, LEDGE.bot + 8 + ((x * 3 + g) % 3 ? 0 : 1), 'water1');
  }
  function lilyPads(list, ctx, t) {
    list.forEach(([x, y, fl], i) => {
      const b = (step(t, 1.4) + i) % 3 === 0 ? 1 : 0, yy = y + b;
      tr(ctx, x - 3, yy - 1, 7, 3, 'leaf2'); tr(ctx, x - 2, yy - 2, 5, 1, 'leaf2'); tr(ctx, x - 2, yy + 2, 5, 1, 'leaf3'); tr(ctx, x - 3, yy + 1, 7, 1, 'leaf3');
      td(ctx, x - 2, yy - 1, 'leaf1'); td(ctx, x - 1, yy - 2, 'leaf1'); td(ctx, x + 2, yy, 'water3'); td(ctx, x + 3, yy, 'water3');
      if (fl) { tr(ctx, x - 1, yy - 2, 2, 2, fl); td(ctx, x, yy - 3, 'white'); td(ctx, x - 1, yy - 1, 'yellow'); }
    });
  }
  function reeds(list, ctx, t) {
    list.forEach(([x, y, n], i) => {
      const sw = Math.sin(t * 0.9 + i * 1.7) > 0.55 ? 1 : 0;
      for (let k = 0; k < n; k++) {
        const bx = x + k * 2 - n, h = 5 + ((H01(i, k) * 5) | 0);
        tr(ctx, bx, y - h + 2, 1, h - 2, k % 2 ? 'leaf3' : 'leaf4'); tr(ctx, bx + sw, y - h, 1, 2, 'leaf2');
        if (k === 1 && n > 2) { tr(ctx, bx + sw, y - h - 3, 1, 3, 'wood3'); td(ctx, bx + sw, y - h - 3, 'wood2'); }
      }
      tr(ctx, x - n - 1, y + 1, n * 2 + 2, 1, 'leaf4');
    });
  }
  function fish(ctx, t) {
    const PER = 7.3, k = Math.floor(t / PER), a = t - k * PER;
    if (a > 1.3) return;
    const spots = [[112, 404], [196, 512], [70, 372], [240, 540]], [x0, y0] = spots[(H01(k, 5) * spots.length) | 0], dir = H01(k, 6) < 0.5 ? 1 : -1;
    const ring = (x, y, r) => { tr(ctx, x - r, y, r * 2 + 1, 1, 'water0'); tr(ctx, x - r + 1, y - 1, r * 2 - 1, 1, 'water1'); tr(ctx, x - r + 1, y + 1, r * 2 - 1, 1, 'water1'); };
    if (a < 0.25) ring(x0, y0, 2);
    else if (a < 0.95) {
      const p = (a - 0.25) / 0.7, x = Math.round(x0 + dir * p * 12), y = Math.round(y0 - Math.sin(p * Math.PI) * 9);
      tr(ctx, x - 2, y, 5, 2, 'orange'); td(ctx, x + dir * 2, y, 'white'); tr(ctx, x - 1, y + 1, 3, 1, 'yellow'); td(ctx, x - dir * 3, y - 1, 'orange'); td(ctx, x - dir * 3, y + 1, 'orange');
      if (a < 0.45) td(ctx, x0 + dir, y0 - 1, 'white');
    } else ring(x0 + dir * 12, y0, a < 1.12 ? 2 : 3);
  }
  function smoke(ctx, t, chimneys, still) {
    for (const [cx, cy] of chimneys) for (let k = 0; k < 6; k++) {
      const age = still ? k * 0.7 : (t + k * 0.7) % 4.2;
      if (age > 3.7) continue;
      const q = Math.floor(age * 6) / 6, x = Math.round(cx + q * 3.5 + Math.sin(q * 2 + k) * 1.2), y = Math.round(cy - q * 8), r = age < 0.4 ? 1 : age < 1.4 ? 2 : age < 2.9 ? 3 : 2;
      ctx.fillStyle = tone('cloud2'); PX.ellipse(ctx, x + 1, y + 1, r, r, ctx.fillStyle);
      ctx.fillStyle = tone(age > 2.9 ? 'cloud1' : 'white'); PX.ellipse(ctx, x, y, r, r, ctx.fillStyle);
    }
  }
  const BIRD = [['x.....x', '.x...x.', '..xxx..'], ['.......', 'xxx.xxx', '...x...'], ['.......', '..xxx..', '.x...x.']];
  function bird(ctx, x, y, f, c) { BIRD[f].forEach((r, j) => { for (let i = 0; i < 7; i++) if (r[i] === 'x') td(ctx, x + i, y + j, c); }); }
  function birds(ctx, t, v, high) {
    if (high) { // a flock across the sky
    const PER = 26, k = Math.floor(t / PER), a = t - k * PER, y0 = 22 + ((H01(k, 1) * 36) | 0), dir = H01(k, 2) < 0.5 ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      const x = dir > 0 ? Math.round(-30 + a * 34 - i * 11) : Math.round(W + 30 - a * 34 + i * 11);
      if (x < v.x - 10 || x > v.x + v.w + 10) continue;
      bird(ctx, x, y0 + (i === 1 ? -4 : i * 3), (step(t, 8) + i) % 3, 'stone5');
    }
    return; }
    // one bird gliding over the village, its shadow on the ground
    const Q = 19, j = Math.floor(t / Q), b = t - j * Q, x = Math.round(-20 + b * 44), y = Math.round(180 + H01(j, 3) * 300 - b * 10);
    if (x > v.x - 10 && x < v.x + v.w + 10) {
      ctx.fillStyle = P.shadow; ctx.fillRect(x + 1, y + 30, 5, 1); ctx.fillRect(x + 3, y + 31, 1, 1);
      bird(ctx, x, y, (step(t, 7) % 5) < 3 ? step(t, 7) % 3 : 1, 'stone5');
    }
  }
  function butterflies(ctx, t, spots) {
    spots.forEach(([cx, cy, c], i) => {
      const x = Math.round(cx + 14 * Math.sin(t * 0.6 + i * 2) + 5 * Math.sin(t * 1.7 + i)), y = Math.round(cy + 6 * Math.sin(t * 0.9 + i) + 3 * Math.cos(t * 2.1 + i * 3));
      const open = (step(t, 9) + i) % 2 === 0;
      td(ctx, x, y, 'ink2');
      if (open) { tr(ctx, x - 2, y - 1, 2, 2, c); tr(ctx, x + 1, y - 1, 2, 2, c); td(ctx, x - 2, y + 1, c); td(ctx, x + 2, y + 1, c); }
      else { td(ctx, x - 1, y - 1, c); td(ctx, x + 1, y - 1, c); td(ctx, x - 1, y - 2, c); td(ctx, x + 1, y - 2, c); }
    });
  }
  function fireflies(ctx, t, spots, amt) {
    const n = Math.round(spots.length * amt);
    for (let i = 0; i < n; i++) {
      const [bx, by] = spots[i], x = Math.round(bx + 7 * Math.sin(t * 0.45 + i)), y = Math.round(by + 4 * Math.sin(t * 0.7 + i * 2.3));
      const b = Math.sin(t * 2.2 + i * 1.9);
      if (b < -0.2) continue;
      td(ctx, x, y, 'light0');
      if (b > 0.4) { td(ctx, x - 1, y, 'grass0'); td(ctx, x + 1, y, 'grass0'); td(ctx, x, y - 1, 'grass0'); td(ctx, x, y + 1, 'grass0'); }
    }
  }
  function leaves(ctx, t, trees) {
    for (let s = 0; s < 3; s++) {
      const P = 2.9 + s * 0.7, k = Math.floor(t / P), a = t - k * P, tr0 = trees[(H01(k, 11 + s) * trees.length) | 0];
      if (!tr0 || a > 3.4) continue;
      const x0 = tr0.x + (H01(k, 12 + s) - 0.5) * tr0.cw, y0 = tr0.y - tr0.ch * (0.2 + H01(k, 13) * 0.3), q = Math.floor(a * 8) / 8;
      const x = Math.round(x0 + 4 * Math.sin(q * 2.8)), y = Math.round(y0 + q * 11), c = tr0.blossom ? 'pink' : ['leaf1', 'grass0', 'yellow'][k % 3];
      if (step(t, 6) % 2) tr(ctx, x, y, 2, 1, c); else tr(ctx, x, y, 1, 2, c);
    }
  }
  // Stepped warm light: a lit glass rect, a hard-edged halo and a pool on the ground.
  function glow(ctx, gx, gy, gw, gh, amt, t, seed, pool) {
    if (amt <= 0.02) return;
    const fl = (step(t, 9) + seed * 3) % 7 === 0 || hash(step(t, 5), seed, 4) < 0.12;
    ctx.globalAlpha = amt;
    if (pool) {
      const [px, py, rx] = pool;
      PX.ellipse(ctx, px, py, rx, Math.max(2, rx >> 2), 'rgba(255,214,110,0.16)');
      PX.ellipse(ctx, px, py, Math.round(rx * 0.62), Math.max(1, rx >> 3) + 1, 'rgba(255,232,150,0.2)');
    }
    const cx = gx + (gw >> 1), cy = gy + (gh >> 1);
    PX.ellipse(ctx, cx, cy, gw + 4, gh + 3, 'rgba(255,236,160,0.2)');
    PX.ellipse(ctx, cx, cy, gw + 1, gh, 'rgba(255,244,190,0.28)');
    ctx.fillStyle = P.light1; ctx.fillRect(gx, gy, gw, gh);
    ctx.fillStyle = fl ? P.light2 : P.light0; ctx.fillRect(gx + (gw > 3 ? 1 : 0), gy + (gh > 3 ? 1 : 0), Math.max(1, gw - 2), Math.max(1, gh - 2));
    ctx.fillStyle = P.light3; ctx.fillRect(gx, gy + gh - 1, gw, 1);
    ctx.globalAlpha = 1;
  }

  /* ---------- critters ---------- */
  const HEN_KEY = { r: 'red', w: 'white', g: 'cloud1', s: 'cloud2', k: 'ink', o: 'orange', y: 'yellow' };
  const HEN = {
    stand: ['......rr.', '.....rwwr', '.w...wkwo', 'ww...www.', 'wwwwgwww.', '.wgggww..', '..wwss...', '...o.o...'],
    walk: ['......rr.', '.....rwwr', '.w...wkwo', 'ww...www.', 'wwwwgwww.', '.wgggww..', '..wwss...', '..o...o..'],
    peck: ['.........', '.........', '.w.......', 'ww...rr..', 'wwwwgwwwr', '.wgggwwko', '..wwss.o.', '...o.o...'],
  };
  const CHICK = { stand: ['.yy.', 'yyko', 'yyy.', '.o..'], peck: ['....', '.yy.', 'yyyk', '.o.o'] };
  const spr = {};
  function critterSprites() {
    for (const k in HEN) spr['hen_' + k] = outline(sprite(HEN[k], HEN_KEY), 'stone4');
    for (const k in CHICK) spr['chick_' + k] = outline(sprite(CHICK[k], { y: 'yellow', k: 'ink', o: 'orange' }), 'wood3');
    const cat = ['3...3.....', '33.33.....', '33333.....', '3k3k3.....', '33p33.....', '.313......', '31113.....', '311133....', '3111333...', '.33.333...'];
    const tails = [[[6, 8], [7, 8], [8, 7], [8, 6], [8, 5]], [[6, 8], [7, 8], [8, 8], [9, 7], [9, 6]], [[6, 8], [7, 7], [7, 6], [8, 5], [9, 5]]];
    tails.forEach((tl, i) => [0, 1].forEach(bl => {
      const rows = cat.map(r => r.split(''));
      tl.forEach(([x, y]) => { rows[y][x] = '3'; });
      if (bl) rows[3] = '33333.....'.split('');
      spr[`cat_${i}_${bl}`] = outline(sprite(rows.map(r => r.join('')), { 3: 'orange', 1: 'cream0', k: 'ink', p: 'rose' }), 'wood4');
    }));
  }
  // A hen's day: peck, stroll a few px, peck, stroll back. Integer positions, facing follows the stroll.
  function henState(t, seed, still) {
    if (still) return { dx: 0, dir: 1, pose: 'stand' };
    const P = 7 + seed, a = (t + seed * 2.3) % P, walkA = a > 2.4 && a < 3.4, walkB = a > 5.6 && a < 6.6;
    const dx = walkA ? Math.floor((a - 2.4) * 8) : a >= 3.4 && a <= 5.6 ? 8 : walkB ? 8 - Math.floor((a - 5.6) * 8) : 0;
    const dir = walkA || (a >= 3.4 && a <= 5.6) ? 1 : -1;
    const pose = walkA || walkB ? (step(t, 8) % 2 ? 'walk' : 'stand') : step(t, 4 + seed) % 3 === 0 ? 'peck' : 'stand';
    return { dx, dir: seed % 2 ? -dir : dir, pose };
  }
  function drawSpriteAt(ctx, img, x, y, dir) { // feet at (x, y); sprite bottom row is the feet line; flip after grading
    const px = Math.round(x - img.width / 2), py = Math.round(y - img.height + 1), f = g => (dir < 0 ? PX.flip(g) : g);
    ctx.drawImage(f(G(img, T.a)), px, py);
    if (T.f) { ctx.globalAlpha = T.f; ctx.drawImage(f(G(img, T.b)), px, py); ctx.globalAlpha = 1; }
  }

  /* ---------- the village scene ---------- */
  const TREES = [
    { x: 20, y: 246, rx: 30, ry: 26, th: 14, seed: 1 }, { x: 98, y: 222, rx: 26, ry: 22, th: 12, seed: 2 },
    { x: 180, y: 212, rx: 22, ry: 19, th: 10, seed: 3, pal: PAL_LIME }, { pine: 1, x: 136, y: 246, hgt: 62, wid: 30, seed: 4 },
    { x: 64, y: 300, rx: 20, ry: 17, th: 10, seed: 5 }, { x: 262, y: 222, rx: 20, ry: 17, th: 10, seed: 6, blossom: ['pink', 'white'] },
    { x: 482, y: 214, rx: 20, ry: 18, th: 10, seed: 7 }, { x: 536, y: 220, rx: 24, ry: 20, th: 10, seed: 8, pal: PAL_DEEP },
    { pine: 1, x: 612, y: 238, hgt: 72, wid: 34, seed: 9 }, { x: 680, y: 222, rx: 30, ry: 26, th: 14, seed: 10 },
    { x: 708, y: 300, rx: 26, ry: 22, th: 12, seed: 11, pal: PAL_DEEP }, { x: 702, y: 382, rx: 28, ry: 24, th: 12, seed: 12 },
    { pine: 1, x: 676, y: 446, hgt: 60, wid: 30, seed: 13 }, { x: 710, y: 482, rx: 26, ry: 22, th: 12, seed: 14, pal: PAL_LIME },
    { x: 690, y: 558, rx: 30, ry: 24, th: 14, seed: 15 }, { x: 12, y: 446, rx: 26, ry: 22, th: 12, seed: 16, pal: PAL_DEEP },
    { x: 84, y: 456, rx: 20, ry: 17, th: 10, seed: 17 }, { pine: 1, x: 8, y: 506, hgt: 56, wid: 28, seed: 18 },
    { x: 128, y: 558, rx: 24, ry: 20, th: 12, seed: 19 }, { x: 350, y: 550, rx: 24, ry: 20, th: 12, seed: 20 },
    { x: 418, y: 502, rx: 16, ry: 14, th: 10, seed: 21, blossom: ['red', 'rose'] }, { x: 214, y: 418, rx: 20, ry: 17, th: 10, seed: 22 },
    { x: 46, y: 192, rx: 22, ry: 19, th: 10, seed: 23, pal: PAL_LIME }, { x: 592, y: 184, rx: 20, ry: 17, th: 8, seed: 24 },
  ];
  const BUSHES = [
    [236, 266, 12, 9], [486, 266, 12, 9], [298, 262, 8, 6, 1], [422, 262, 8, 6, 1], [100, 330, 14, 10], [84, 344, 9, 7, 1],
    [160, 352, 11, 8, 1], [124, 368, 10, 8], [606, 338, 11, 8, 1], [664, 424, 13, 10], [302, 444, 11, 8, 1], [470, 552, 14, 10, 1],
    [340, 556, 12, 9], [62, 562, 14, 10], [150, 522, 11, 8, 1], [256, 286, 9, 7, 1], [466, 288, 9, 7, 1], [652, 330, 10, 8],
    [560, 556, 12, 8], [36, 380, 10, 8, 1], [196, 356, 9, 7],
    [40, 262, 12, 9, 1], [126, 234, 10, 8], [208, 224, 11, 8, 1], [150, 200, 9, 7], [72, 214, 9, 7, 1], [512, 234, 11, 8, 1],
    [566, 238, 9, 7], [642, 252, 12, 9, 1], [700, 238, 10, 8], [628, 196, 9, 7, 1], [100, 286, 10, 7, 1], [660, 318, 9, 7],
  ];
  const LAMPS = [['iron', 334, 299], ['iron', 386, 299], ['wood', 262, 372], ['wood', 490, 368], ['wood', 214, 452], ['wood', 70, 540]];
  const WIN_THR = [0.05, 0.3, 0.55, 0.8];

  function createVillage() {
    keep.length = 0;
    buildMasks(); critterSprites();
    const props = [], shadows = [], trees = [];
    const add = p => { const im = p.img || p.frames[0]; p.w = im.width; p.h = im.height; props.push(p); return p; };
    const put = (s, x, y, o = {}) => add({ img: s.img, frames: s.frames, ox: Math.round(x - s.ax), oy: Math.round(y - s.ay), x, y, ...o });
    // houses and the shop
    const houses = [bakery(), tailor(), cottage()];
    const litWins = h => { for (const g of h.wins) g.lit = litSprite(h.img, h.ox, h.oy, g); };
    houses.forEach((h, i) => { h.idx = i; litWins(h); add({ img: h.img, ox: h.ox, oy: h.oy, y: h.y, after: F => litHouse(F.ctx, h, F.win), name: ['bakery', 'tailor', 'cottage'][i] }); keep.push(h.keep); shadows.push(...h.shadow); });
    const SH = shop(); keep.push(SH.keep); SH.idx = 3; litWins(SH);
    const shopProp = add({ img: SH.img, ox: SH.ox, oy: SH.oy, y: SH.y, shop: true, name: 'shop' });
    // trees, bushes
    for (const o of TREES) {
      const tr0 = o.pine ? makePine(o) : makeTree({ ...o, pal: o.pal || PAL_LEAF });
      const ph = hash(o.seed, 1, 9) * 4, per = 0.9 + hash(o.seed, 2, 9) * 0.8;
      put(tr0, o.x, o.y, { pick: t => Math.floor(t / per + ph) & 1, name: 'tree' });
      const cw = o.pine ? o.wid : o.rx * 2;
      trees.push({ x: o.x, y: o.y, cw, ch: tr0.h, blossom: !!o.blossom });
      shadows.push([o.x + 3, o.y, Math.round(cw * 0.42), Math.round(cw * 0.15)]);
      keep.push([o.x - 6, o.y - 8, 12, 10]);
    }
    for (const [x, y, rx, ry, fl] of BUSHES) {
      const b = makeBush({ rx, ry, seed: x * 3 + y, pal: (x + y) % 3 ? PAL_LEAF : PAL_LIME, flowers: fl ? [['pink', 'white', 'rose'], ['white', 'yellow'], ['lilac', 'white']][(x + y) % 3] : null });
      const ph = hash(x, y, 3) * 5;
      put(b, x, y, { pick: t => (Math.floor(t * 1.3 + ph) % 5 === 0 ? 1 : 0), name: 'bush' });
      shadows.push([x + 2, y - 1, rx + 1, 3]); keep.push([x - rx, y - ry * 2, rx * 2, ry * 2 + 2]);
    }
    // lamps (their lit glass is drawn right after the sprite)
    const lamps = LAMPS.map(([k, x, y], i) => {
      const s = k === 'iron' ? ironLamp() : woodLamp(), p = put(s, x, y, { name: 'lamp' });
      p.lamp = { gx: p.ox + s.glass[0], gy: p.oy + s.glass[1], gw: s.glass[2], gh: s.glass[3], pool: [p.ox + s.head[0], y + 2, 18], i };
      keep.push([x - 5, y - 6, 12, 8]); shadows.push([x + 2, y, 5, 2]);
      return p;
    });
    // street furniture
    put(bench(), 398, 436, { y: 430, name: 'bench' }); put(bench(), 282, 321, { y: 315, name: 'bench' });
    shadows.push([399, 437, 12, 2], [283, 322, 12, 2]); keep.push([384, 420, 28, 18], [268, 305, 28, 18]);
    const ban = banner(); for (const [x, y] of [[296, 296], [430, 296]]) { const ph = x / 50; put(ban, x, y, { pick: t => [0, 1, 0, 2][Math.floor(t * 6 + ph) & 3], name: 'banner' }); shadows.push([x + 2, y, 4, 1]); }
    put(planter(5, ['pink', 'rose', 'white']), 252, 398, { name: 'planter' }); put(planter(6, ['yellow', 'orange', 'white']), 458, 364, { name: 'planter' });
    shadows.push([254, 398, 11, 3], [460, 364, 11, 3]);
    put(noticeBoard(), 448, 306, { name: 'notice_board' }); shadows.push([450, 306, 11, 2]); keep.push([434, 280, 28, 28]);
    put(well(), WELLP[0], 358, { name: 'well' }); shadows.push([362, 358, 16, 4]); keep.push([340, 318, 42, 44]);
    for (const [x, y] of [[252, 322], [263, 326]]) { put(barrel(), x, y, { name: 'barrel' }); shadows.push([x + 2, y, 6, 2]); }
    put(crate('bread'), 152, 334, { name: 'crate' }); put(crate('bread'), 140, 331, { name: 'crate' }); put(crate('apples'), 558, 410, { name: 'crate' }); put(barrel(), 650, 418, { name: 'barrel' });
    shadows.push([153, 334, 7, 2], [141, 331, 7, 2], [559, 410, 7, 2], [652, 418, 6, 2]);
    const st = stall(), stallGlass = [st.ox + st.glass[0], st.oy + st.glass[1], st.glass[2], st.glass[3]];
    add({ frames: st.frames, ox: st.ox, oy: st.oy, y: st.y, pick: t => (Math.sin(t * 0.9) > 0.2 ? step(t, 5) % 2 : 0), after: F => { if (F.dk > 0.3) glow(F.ctx, ...stallGlass, (F.dk - 0.3) / 0.7, F.t, 9, null); }, name: 'stall' });
    shadows.push(['r', 559, 419, 104, 3]); keep.push([552, 356, 116, 70]);
    add({ ...rail(false), name: 'rail_back' }); add({ ...rail(true), name: 'rail_front' });
    const lau = laundry(); add({ frames: lau.frames, ox: lau.ox, oy: lau.oy, y: lau.y, pick: t => [0, 1, 0, 2][Math.floor(t * 1.8) & 3], name: 'laundry' });
    put(signpost(), 46, 500, { name: 'signpost' }); shadows.push([50, 500, 6, 2]); keep.push([38, 470, 48, 32]);
    add({ ...vegPatch(440, 478, 498, 522), name: 'veg_patch' }); keep.push([436, 470, 70, 58]);
    add({ ...fenceH(436, 500, 478), name: 'fence' }); add({ ...fenceH(436, 500, 526), name: 'fence' });
    for (let y = 486; y < 526; y += 8) { add({ ...fencePost(436, y), name: 'fence_post' }); add({ ...fencePost(500, y), name: 'fence_post' }); }
    for (const [x, h] of [[444, 16], [452, 13], [492, 15]]) put(sunflower(h), x, 476, { name: 'sunflower' });
    put(tulipBed(48), 292, 492, { name: 'tulip_bed' }); shadows.push([294, 492, 24, 2]); keep.push([266, 472, 54, 22]);
    put(basket(), 392, 474, { name: 'basket' }); keep.push([366, 458, 40, 20]);
    for (const [x, y, w, h, s] of [[92, 334, 14, 9, 1], [104, 342, 9, 6, 2], [112, 458, 10, 7, 3], [242, 440, 8, 5, 4], [244, 288, 10, 7, 5], [600, 540, 9, 6, 6], [30, 470, 11, 7, 7]]) {
      put(rock(w, h, s), x, y, { name: 'rock' }); shadows.push([x + 2, y, (w >> 1) + 1, 2]);
    }
    // Unique names for the art exporter (scene.bake): a kind placed more than once is numbered in placing order.
    const kinds = {}, seen = {};
    for (const p of props) kinds[p.name] = (kinds[p.name] || 0) + 1;
    for (const p of props) if (kinds[p.name] > 1) { const k = p.name; seen[k] = (seen[k] ?? -1) + 1; p.name = k + '_' + seen[k]; }
    shadows.push(['r', TER.x0, TER.front + TER.wallH, ST.x0 - 6 - TER.x0, 3], ['r', ST.x1 + 6, TER.front + TER.wallH, TER.x1 - ST.x1 - 6, 3], ['r', ST.x1 + 6, TER.front, 2, ST.bot - TER.front - 6]);
    const ground = buildGround(shadows);
    flatRocks(ground);
    const sky = [0, 1, 2].map(buildSky), vista = buildVista(), clouds = CLOUDS.map(cl => [0, 1, 2].map(v => cloudImg(cl, v)));
    props.sort((a, b) => a.y - b.y);

    // life: static positions picked once (never on the ledge face or the falls)
    const offLedge = (x, y) => !(x < 104 && y > LEDGE.top - 6 && y < LEDGE.bot + 3);
    const lily = [[96, 392, 'pink'], [106, 399, 0], [142, 428, 0], [151, 437, 'white'], [200, 508, 0], [214, 523, 'pink'], [240, 548, 0], [60, 364, 0], [232, 538, 'white'], [182, 488, 0]]
      .filter(([x, y]) => water(x - 5, y) && water(x + 5, y) && water(x, y - 5) && water(x, y + 4) && (y < BR.y0 - 6 || y > BR.y1 + 12));
    const reedList = scatter(311, 14, [0, 300, 330, 260], (x, y) => !water(x, y) && water(x, y - 2) && !sand(x, y) && !blocked(x, y) && offLedge(x, y) && (x < BR.x0 - 6 || x > BR.x1 + 6)).map(([x, y], i) => [x, y, 3 + (i % 3)]);
    const reedsTop = scatter(312, 14, [0, 300, 330, 260], (x, y) => !water(x, y) && water(x, y + 3) && !sand(x, y) && !blocked(x, y) && offLedge(x, y) && (x < BR.x0 - 6 || x > BR.x1 + 6)).map(([x, y], i) => [x, y, 2 + (i % 3)]);
    const fireSpots = scatter(313, 22, [0, 170, W, 390], (x, y) => !water(x, y) && !sand(x, y) && !blocked(x, y));
    const flies = [[258, 240, 'white'], [462, 462, 'yellow'], [140, 512, 'pink'], [96, 376, 'lilac'], [612, 350, 'white']];
    const hens = [[526, 438, 0], [556, 443, 1]];
    const nodSpots = scatter(315, 13, [0, 170, W, 390], (x, y) => !water(x, y) && !water(x, y + 4) && !sand(x, y) && !sand(x, y - 4) && !blocked(x, y) && !blocked(x, y - 5) &&
      (sand(x, y + 7) || sand(x + 8, y) || sand(x - 8, y) || water(x, y + 9) || water(x, y - 9)) && offLedge(x, y) && !(y > TER.front - 3 && y < TER.front + TER.wallH + 3 && x > TER.x0 - 2 && x < TER.x1 + 2))
      .map(([x, y, q]) => [x, y, FCOL[(q * FCOL.length) | 0], q * 6.28]);
    const tuftSpots = scatter(314, 11, [0, 170, W, 390], (x, y) => !water(x, y) && !water(x, y + 3) && !sand(x, y) && !sand(x + 4, y + 2) && !blocked(x, y) && !(y > TER.front - 3 && y < TER.front + TER.wallH + 3 && x > TER.x0 - 2 && x < TER.x1 + 2) && !(x < LEDGE.x1 && y > LEDGE.top - 3 && y < LEDGE.bot + 2)).filter((_, i) => i % 2 === 0);
    const critters = [...hens.map(([hx, hy, s]) => ({ y: hy, hen: [hx, hy, s], name: 'hen_' + s, box: [hx - 16, hy - 12, 32, 15] })),
      { y: 448, chick: true, name: 'chick', box: [535, 440, 16, 11] }, { y: 325, cat: true, name: 'cat', box: [164, 312, 16, 16] }];
    const lanternGlow = (ctx, i, a, t) => glow(ctx, LANTERN_X[i] - 2, LANTERN_Y + 2, 4, 4, a, t, i + 20, [LANTERN_X[i], SHOP.base + 3, 7]);

    // For the art exporter: every depth-sorted entry in draw order (the shop's lantern glows as entries of their own,
    // right after the shop) with the world box [x, y, w, h] it can ever touch, plus the data its walk mask comes from.
    const entries = [...props, ...critters].sort((a, b) => a.y - b.y), pad = p => (p.lamp || p.after ? 8 : 0);
    entries.splice(entries.indexOf(shopProp) + 1, 0, ...LANTERN_X.map((lx, i) => ({ y: SH.y, lantern: i, name: 'shop_lantern_' + i, box: [lx - 10, LANTERN_Y - 5, 21, SHOP.base - LANTERN_Y + 13] })));
    const byName = new Map(entries.map(e => [e.name, e]));
    const bake = {
      items: entries.map(e => ({ name: e.name, x: e.x, y: e.y, box: e.box || [e.ox - pad(e), e.oy - pad(e), e.w + 2 * pad(e), e.h + 2 * pad(e)], animated: !e.img || !!e.lamp })),
      water: M.water, TER, ST, BR, ledge: inFace,
    };

    function draw(ctx, view, actors = []) {
      const st0 = view.state || {}, still = !!st0.still, t = still ? 0 : Math.max(0, +view.t || 0);
      // Exporter opt-in: state.part 'below' | 'item' | 'above' draws only what lies under the depth-sorted entries,
      // the one entry named state.item (see scene.bake), or the air above them. Without it, everything is drawn.
      const part = st0.part, below = !part || part === 'below', above = !part || part === 'above', one = part === 'item' && byName.get(st0.item);
      setTod(st0.tod ?? 0);
      const vx = view.x, vy = view.y, vw = view.w, vh = view.h, x1 = vx + vw, y1 = vy + vh;
      const clip = vx < 0 || vy < 0 || x1 > W || y1 > H; // only when the view shows outside the world
      if (clip) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); }
      // sky, clouds, vista, sails
      if (below && vy < SKY_H) {
        const h = Math.min(SKY_H - vy, vh);
        ctx.drawImage(sky[T.a], vx, vy, vw, h, vx, vy, vw, h);
        if (T.f) { ctx.globalAlpha = T.f; ctx.drawImage(sky[T.b], vx, vy, vw, h, vx, vy, vw, h); ctx.globalAlpha = 1; }
        CLOUDS.forEach((cl, i) => {
          const span = W + cl.w + 60, x = Math.round(((cl.x + t * cl.s) % span) - cl.w - 30);
          if (x > x1 || x + cl.w < vx || cl.y > y1) return;
          ctx.drawImage(clouds[i][T.a], x, cl.y); if (T.f) { ctx.globalAlpha = T.f; ctx.drawImage(clouds[i][T.b], x, cl.y); ctx.globalAlpha = 1; }
        });
        if (!still) birdsHigh(ctx, t, view);
      }
      if (below && vy < 170) {
        blitRect(ctx, vista, vx, vy, vw, 170 - vy);
        blit(ctx, sailFrame(still ? 3 : step(t, 6) % 16), MILL[0] - 18, MILL[1] - 29 - 18);
      }
      if (below) blitRect(ctx, ground, vx, vy, vw, vh);
      // ground life
      if (below && vy < 560 && vx < 340) {
        if (!still) { ripples(ctx, t, view); fish(ctx, t); }
        else ripples(ctx, 0, view);
        waterfall(ctx, t); rockFoam(ctx, t);
        lilyPads(lily, ctx, still ? 0.5 : t);
        reeds(reedList, ctx, t); reeds(reedsTop, ctx, t);
      }
      if (below) for (const [x, y] of tuftSpots) {
        if (x < vx - 6 || x > x1 || y < vy - 6 || y > y1 + 2) continue;
        const lean = !still && Math.sin(t * 1.3 + x * 0.05 + y * 0.02) > 0.5 ? 1 : 0;
        td(ctx, x, y - 1, 'grass3'); td(ctx, x + 2, y - 1, 'grass3'); td(ctx, x + 1, y, 'grass3');
        td(ctx, x + lean, y - 2, 'grass1'); td(ctx, x + 2 + lean, y - 3, 'grass1'); td(ctx, x + 1 + lean, y - 2, 'grass3');
      }
      if (below) for (const [x, y, [pc, cc], ph] of nodSpots) { // flowers nodding on their stems
        if (x < vx - 4 || x > x1 + 4 || y < vy - 6 || y > y1 + 2) continue;
        const n = !still && Math.sin(t * 1.1 + ph) > 0.55 ? 1 : 0;
        td(ctx, x, y, 'grass3'); td(ctx, x, y - 1, 'grass3'); td(ctx, x + n, y - 2, 'grass3'); td(ctx, x - 1, y, 'grass2');
        td(ctx, x + n - 1, y - 4, pc); td(ctx, x + n + 1, y - 4, pc); td(ctx, x + n, y - 5, pc); td(ctx, x + n, y - 3, pc); td(ctx, x + n, y - 4, cc);
      }
      const dk = dusk(), nt = night(), lanterns = st0.lanterns || [], win = st0.windows ?? 0, shopP = clamp(st0.shop ?? 1, 0, 1);
      // lamp light pools sit on the ground, under everyone
      if (below) for (const h of [...houses, SH]) { // warm spill in front of lit windows
        const a = clamp((win - WIN_THR[h.idx]) * 6, 0, 1) * (h === SH ? +(shopP >= 1) : 1); if (a <= 0) continue;
        ctx.globalAlpha = a; for (const g of h.wins) PX.ellipse(ctx, g.gx + (g.gw >> 1), h.y + 4, Math.round(g.gw * 0.7), 2, 'rgba(255,214,110,0.16)'); ctx.globalAlpha = 1;
      }
      if (below && dk > 0.3) for (const l of lamps) { const [px, py, rx] = l.lamp.pool; ctx.globalAlpha = (dk - 0.3) / 0.7; PX.ellipse(ctx, px, py, rx + 6, 7, 'rgba(255,214,110,0.1)'); PX.ellipse(ctx, px, py, rx, 5, 'rgba(255,214,110,0.18)'); PX.ellipse(ctx, px, py, 11, 3, 'rgba(255,236,160,0.24)'); ctx.globalAlpha = 1; }
      // depth-sorted: props, critters, actors
      const list = [];
      for (const p of props) if (p.ox < x1 && p.ox + p.w > vx && p.oy < y1 && p.oy + p.h > vy) list.push(p);
      for (const a of actors) list.push({ y: a.y, actor: a });
      list.push(...critters);
      list.sort((a, b) => a.y - b.y);
      const F = { ctx, t, win, dk, nt };
      for (const it of one ? [one] : part ? [] : list) {
        if (it.actor) { it.actor.draw(ctx); continue; }
        if (it.hen) { const [hx, hy, s] = it.hen, q = henState(t, s, still); drawSpriteAt(ctx, spr['hen_' + q.pose], hx + q.dx * (s ? -1 : 1), hy, q.dir); continue; }
        if (it.chick) { const q = henState(t + 1.3, 2, still); drawSpriteAt(ctx, spr[q.pose === 'peck' ? 'chick_peck' : 'chick_stand'], 541 + (q.dx >> 1), 448, q.dir); continue; }
        if (it.cat) { const f = still ? 0 : [0, 1, 2, 1, 0, 0, 0, 0, 0, 0][step(t, 6) % 10], bl = !still && (t % 4.3) < 0.18 ? 1 : 0; drawSpriteAt(ctx, spr[`cat_${f}_${bl}`], 172, 325, 1); continue; }
        if (it.shop) { drawShop(ctx, it, t, still, shopP, lanterns, win); continue; }
        if (it.lantern >= 0) { lanternGlow(ctx, it.lantern, 1, t); continue; } // only reached by an exporter item
        blit(ctx, it.frames ? it.frames[still ? 0 : it.pick(t)] : it.img, it.ox, it.oy);
        if (it.after) it.after(F);
        if (it.lamp && dk > 0.3) { const l = it.lamp; glow(ctx, l.gx, l.gy, l.gw, l.gh, (dk - 0.3) / 0.7, t, l.i + 1, null); }
      }
      // air
      if (above) smoke(ctx, t, houses.flatMap(h => h.smoke).filter((_, i) => i !== 1), still);
      if (above && !still) { butterflies(ctx, t, flies); leaves(ctx, t, trees); birdsLow(ctx, t, view); }
      if (above && nt > 0.05) fireflies(ctx, t, fireSpots, nt);
      if (clip) ctx.restore();
    }
    function drawShop(ctx, it, t, still, p, lanterns, win) {
      if (p >= 1) blit(ctx, it.img, it.ox, it.oy);
      else if (p > 0) {
        ctx.drawImage(revealImg(it.img, T.a, p), it.ox, it.oy);
        if (T.f) { ctx.globalAlpha = T.f; ctx.drawImage(revealImg(it.img, T.b, p), it.ox, it.oy); ctx.globalAlpha = 1; }
      }
      const h = it.h, lit = (lx, ly) => p >= 1 || revealAt(lx - it.ox, ly - it.oy, h) < p;
      LANTERN_X.forEach((lx, i) => { const a = clamp(+lanterns[i] || 0, 0, 1); if (a > 0.02 && lit(lx, LANTERN_Y + 4)) lanternGlow(ctx, i, a, t); });
      if (p >= 1) litHouse(ctx, SH, win);
      shimmer(ctx, t, still, p, it);
    }
    function shimmer(ctx, t, still, p, it) {
      if (p >= 1) return;
      const k = still ? 0 : step(t, 3);
      for (let i = 0; i < 9; i++) {
        const x = 312 + ((H01(i, k) * 96) | 0), y = 176 + ((H01(i + 30, k) * 72) | 0), ph = (step(t, 9) + i) % 3;
        if (p > 0 && revealAt(x - it.ox, y - it.oy, it.h) < p) continue;
        td(ctx, x, y, 'white'); if (ph) { td(ctx, x - 1, y, 'light0'); td(ctx, x + 1, y, 'light0'); td(ctx, x, y - 1, 'light0'); td(ctx, x, y + 1, 'light0'); }
        if (ph === 2) { td(ctx, x - 2, y, 'light1'); td(ctx, x + 2, y, 'light1'); }
      }
      if (p > 0) for (let i = 0; i < 14; i++) { // sparkles riding the leading edge of the dissolve
        const lx = 300 + ((H01(i, step(t, 6)) * 120) | 0), ly = Math.round(it.oy + it.h * (1 - (p - 0.125) / 0.74)) + ((H01(i + 9, step(t, 6)) * 8) | 0) - 4;
        if (!still || i < 6) { td(ctx, lx, ly, 'white'); if ((i + step(t, 10)) % 2) { td(ctx, lx - 1, ly, 'light1'); td(ctx, lx + 1, ly, 'light1'); td(ctx, lx, ly - 1, 'light1'); td(ctx, lx, ly + 1, 'light1'); } }
      }
    }
    // Pre-grade the dusk and evening variants in small idle slices, so the first tod change never hitches.
    const warmList = [ground, vista, ...props.flatMap(p => p.frames || [p.img]), ...Object.values(spr), ...Array.from({ length: 16 }, (_, k) => sailFrame(k))];
    let wi = 0;
    const warm = () => {
      const end = performance.now() + 6;
      while (wi < warmList.length * 2 && performance.now() < end) { G(warmList[wi >> 1], 1 + (wi & 1)); wi++; }
      if (wi < warmList.length * 2) setTimeout(warm, 20);
    };
    setTimeout(warm, 60);
    return { w: W, h: H, bg: P.sky0, anchors: ANCHORS, paths: PATHS, draw, bake };
  }
  // Lit window: the glass region of the building recoloured to warm light (contents stay visible), never graded.
  const LIT = { sky2: 'light1', sky3: 'light2', white: 'light0', wall2: 'light1', wall3: 'light2' };
  function litSprite(img, ox, oy, g) {
    const [c, x] = canvas(g.gw, g.gh); x.drawImage(img, g.gx - ox, g.gy - oy, g.gw, g.gh, 0, 0, g.gw, g.gh);
    return recolor(c, LIT);
  }
  function litHouse(ctx, h, win) {
    const a = clamp((win - WIN_THR[h.idx]) * 6, 0, 1); if (a <= 0) return;
    ctx.globalAlpha = a; for (const g of h.wins) ctx.drawImage(g.lit, g.gx, g.gy); ctx.globalAlpha = 1;
  }
  const FLAT_ROCKS = [[236, 499, 11, 4], [108, 398, 5, 2], [198, 520, 6, 3], [150, 433, 4, 2]];
  function flatRocks(c) {
    const x = c.getContext('2d');
    for (const [cx, cy, rx, ry] of FLAT_ROCKS) {
      E(x, cx + 1, cy + 2, rx, ry, 'stone4'); E(x, cx, cy + 1, rx, ry, 'stone2'); E(x, cx, cy, rx, ry, 'stone1');
      E(x, cx - 2, cy - 1, Math.max(1, rx - 4), Math.max(1, ry - 2), 'stone0'); R(x, cx + rx - 3, cy + 1, 3, 1, 'stone2');
      if (rx > 8) { R(x, cx - 6, cy - ry, 4, 1, 'grass2'); D(x, cx - 6, cy - ry, 'grass1'); }
    }
  }
  function rockFoam(ctx, t) {
    const f = step(t, 4);
    for (const [cx, cy, rx, ry] of FLAT_ROCKS.slice(1)) for (let i = -rx - 2; i <= rx + 2; i++) if ((i + f) % 3) td(ctx, cx + i, cy + ry + 2 + (Math.abs(i) > rx ? -1 : 0), (i + f) % 3 === 1 ? 'white' : 'water0');
    for (const px of [BR.x0 + 16, (BR.x0 + BR.x1) >> 1, BR.x1 - 18]) for (let i = -1; i < 5; i++) if ((i + f) % 2) td(ctx, px + i, BR.y1 + 11, 'water0');
  }
  function birdsHigh(ctx, t, v) { birds(ctx, t, v, true); }
  function birdsLow(ctx, t, v) { birds(ctx, t, v, false); }

  window.WORLD = { createVillage };
})();
