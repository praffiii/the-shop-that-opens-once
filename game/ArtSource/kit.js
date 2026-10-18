'use strict';
/* The drawing kit shared by Bellwood (bellwood.js) and the rooms: build helpers, foliage, building parts, props,
   ground details, life and critters. Every pixel is authored in code (ART.md). It started as the reusable half of
   the presentation's village (presentation/world.js).

   Everything draws at midday. The time of day is a colour grade on the finished image (GRADES, below): the game
   applies the same formula in its pixel shader, and grade() applies it here for previews. Lights (lit windows,
   lamp glass, fireflies) are drawn separately and never graded. */
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

  const rgbOf = c => { const h = hex(c); return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
  const toHex = (r, g, b) => '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);

  // Stepped time: integer frame index at fps.
  const step = (t, fps) => Math.floor(t * fps);


  /* ---------- time of day: one colour grade per phase ---------- */
  // out = in * mul + add + shade * (1 - luma), per channel in 0..255, where luma = 0.299 r + 0.587 g + 0.114 b (0..1).
  // Dusk and night are the presentation's palette swaps, written as this formula; midday leaves the art as drawn.
  // Unity reads these from Art/grades.json, so the game and the previews always agree.
  const GRADES = {
    morning: { mul: [1.0, 0.95, 0.86], add: [12, 8, 4], shade: [10, 6, 14] },
    midday: { mul: [1, 1, 1], add: [0, 0, 0], shade: [0, 0, 0] },
    dusk: { mul: [0.98, 0.87, 0.83], add: [6, 6, 14], shade: [22, 4, 34] },
    night: { mul: [0.72, 0.77, 0.84], add: [10, 16, 50], shade: [16, 14, 32] },
  };
  function gradeCanvas(src, phase) {
    const g = GRADES[phase]; if (!g || phase === 'midday') return src;
    const [c, x] = canvas(src.width, src.height); x.drawImage(src, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const s = 1 - (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
      for (let k = 0; k < 3; k++) p[i + k] = clamp(p[i + k] * g.mul[k] + g.add[k] + g.shade[k] * s, 0, 255);
    }
    x.putImageData(d, 0, 0); return c;
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

  const TUFT = [
    ['..l..', 'l.d.l', 'd.d.d', '.ddd.'],
    ['l.l', 'd.d', '.d.'],
    ['.l...l.', 'd.d.d.d', '.ddddd.'],
    ['...l..', '.l.d..', '.d.d.l', 'd.dd.d', '.dddd.'],
  ];
  function stamp(b, x, y, rows, key) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (key[r[i]]) b.set(x + i, y + j, key[r[i]]); }); }

  const FLOWER = [['.p.', 'pcp', '.g.'], ['pp', 'g.'], ['.p.', 'pcp', '.g.', '.g.'], ['p.p', '.g.']];
  const FCOL = [['white', 'yellow'], ['yellow', 'orange'], ['pink', 'white'], ['lilac', 'white'], ['blue', 'white'], ['rose', 'yellow'], ['white', 'orange']];

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

  function lilyPads(list, ctx, t) {
    list.forEach(([x, y, fl], i) => {
      const b = (step(t, 1.4) + i) % 3 === 0 ? 1 : 0, yy = y + b;
      R(ctx, x - 3, yy - 1, 7, 3, 'leaf2'); R(ctx, x - 2, yy - 2, 5, 1, 'leaf2'); R(ctx, x - 2, yy + 2, 5, 1, 'leaf3'); R(ctx, x - 3, yy + 1, 7, 1, 'leaf3');
      D(ctx, x - 2, yy - 1, 'leaf1'); D(ctx, x - 1, yy - 2, 'leaf1'); D(ctx, x + 2, yy, 'water3'); D(ctx, x + 3, yy, 'water3');
      if (fl) { R(ctx, x - 1, yy - 2, 2, 2, fl); D(ctx, x, yy - 3, 'white'); D(ctx, x - 1, yy - 1, 'yellow'); }
    });
  }
  function reeds(list, ctx, t) {
    list.forEach(([x, y, n], i) => {
      const sw = Math.sin(t * 0.9 + i * 1.7) > 0.55 ? 1 : 0;
      for (let k = 0; k < n; k++) {
        const bx = x + k * 2 - n, h = 5 + ((H01(i, k) * 5) | 0);
        R(ctx, bx, y - h + 2, 1, h - 2, k % 2 ? 'leaf3' : 'leaf4'); R(ctx, bx + sw, y - h, 1, 2, 'leaf2');
        if (k === 1 && n > 2) { R(ctx, bx + sw, y - h - 3, 1, 3, 'wood3'); D(ctx, bx + sw, y - h - 3, 'wood2'); }
      }
      R(ctx, x - n - 1, y + 1, n * 2 + 2, 1, 'leaf4');
    });
  }

  function smoke(ctx, t, chimneys, still) {
    for (const [cx, cy] of chimneys) for (let k = 0; k < 6; k++) {
      const age = still ? k * 0.7 : (t + k * 0.7) % 4.2;
      if (age > 3.7) continue;
      const q = Math.floor(age * 6) / 6, x = Math.round(cx + q * 3.5 + Math.sin(q * 2 + k) * 1.2), y = Math.round(cy - q * 8), r = age < 0.4 ? 1 : age < 1.4 ? 2 : age < 2.9 ? 3 : 2;
      ctx.fillStyle = hex('cloud2'); PX.ellipse(ctx, x + 1, y + 1, r, r, ctx.fillStyle);
      ctx.fillStyle = hex(age > 2.9 ? 'cloud1' : 'white'); PX.ellipse(ctx, x, y, r, r, ctx.fillStyle);
    }
  }
  const BIRD = [['x.....x', '.x...x.', '..xxx..'], ['.......', 'xxx.xxx', '...x...'], ['.......', '..xxx..', '.x...x.']];
  function bird(ctx, x, y, f, c) { BIRD[f].forEach((r, j) => { for (let i = 0; i < 7; i++) if (r[i] === 'x') D(ctx, x + i, y + j, c); }); }

  function butterflies(ctx, t, spots) {
    spots.forEach(([cx, cy, c], i) => {
      const x = Math.round(cx + 14 * Math.sin(t * 0.6 + i * 2) + 5 * Math.sin(t * 1.7 + i)), y = Math.round(cy + 6 * Math.sin(t * 0.9 + i) + 3 * Math.cos(t * 2.1 + i * 3));
      const open = (step(t, 9) + i) % 2 === 0;
      D(ctx, x, y, 'ink2');
      if (open) { R(ctx, x - 2, y - 1, 2, 2, c); R(ctx, x + 1, y - 1, 2, 2, c); D(ctx, x - 2, y + 1, c); D(ctx, x + 2, y + 1, c); }
      else { D(ctx, x - 1, y - 1, c); D(ctx, x + 1, y - 1, c); D(ctx, x - 1, y - 2, c); D(ctx, x + 1, y - 2, c); }
    });
  }
  function fireflies(ctx, t, spots, amt) {
    const n = Math.round(spots.length * amt);
    for (let i = 0; i < n; i++) {
      const [bx, by] = spots[i], x = Math.round(bx + 7 * Math.sin(t * 0.45 + i)), y = Math.round(by + 4 * Math.sin(t * 0.7 + i * 2.3));
      const b = Math.sin(t * 2.2 + i * 1.9);
      if (b < -0.2) continue;
      D(ctx, x, y, 'light0');
      if (b > 0.4) { D(ctx, x - 1, y, 'grass0'); D(ctx, x + 1, y, 'grass0'); D(ctx, x, y - 1, 'grass0'); D(ctx, x, y + 1, 'grass0'); }
    }
  }
  function leaves(ctx, t, trees) {
    for (let s = 0; s < 3; s++) {
      const P = 2.9 + s * 0.7, k = Math.floor(t / P), a = t - k * P, tr0 = trees[(H01(k, 11 + s) * trees.length) | 0];
      if (!tr0 || a > 3.4) continue;
      const x0 = tr0.x + (H01(k, 12 + s) - 0.5) * tr0.cw, y0 = tr0.y - tr0.ch * (0.2 + H01(k, 13) * 0.3), q = Math.floor(a * 8) / 8;
      const x = Math.round(x0 + 4 * Math.sin(q * 2.8)), y = Math.round(y0 + q * 11), c = tr0.blossom ? 'pink' : ['leaf1', 'grass0', 'yellow'][k % 3];
      if (step(t, 6) % 2) R(ctx, x, y, 2, 1, c); else R(ctx, x, y, 1, 2, c);
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
  function drawSpriteAt(ctx, img, x, y, dir) { // feet at (x, y); the sprite's bottom row is the feet line
    ctx.drawImage(dir < 0 ? PX.flip(img) : img, Math.round(x - img.width / 2), Math.round(y - img.height + 1));
  }

  // Lit window: the glass region of the building recoloured to warm light (contents stay visible), never graded.
  const LIT = { sky2: 'light1', sky3: 'light2', white: 'light0', wall2: 'light1', wall3: 'light2' };
  function litSprite(img, ox, oy, g) {
    const [c, x] = canvas(g.gw, g.gh); x.drawImage(img, g.gx - ox, g.gy - oy, g.gw, g.gh, 0, 0, g.gw, g.gh);
    return recolor(c, LIT);
  }
  // Hard-edged cast shadows (one uniform violet tint) for a w x h ground image.
  function paintShadows(ctx, w, h, list) {
    const [c, x] = canvas(w, h);
    for (const s of list) {
      if (s[0] === 'r') x.fillRect(s[1], s[2], s[3], s[4]);
      else PX.ellipse(x, s[0], s[1], s[2], s[3], '#000');
    }
    x.globalCompositeOperation = 'source-in'; x.fillStyle = P.shadow; x.fillRect(0, 0, w, h);
    ctx.drawImage(c, 0, 0);
  }
  // A few flowers around (x, y) where ok(x, y) allows (on grass, off props).
  function flowerPatch(b, x, y, seed, ok, n = 5, spread = 10) {
    const rnd = rng(seed), [p, c] = FCOL[(rnd() * FCOL.length) | 0], [p2] = FCOL[(rnd() * FCOL.length) | 0];
    for (let k = 0; k < n; k++) {
      const fx = x + ((rnd() - 0.5) * spread) | 0, fy = y + ((rnd() - 0.5) * spread * 0.5) | 0;
      if (!ok(fx + 1, fy + 1) || !ok(fx, fy)) continue;
      stamp(b, fx, fy, FLOWER[(rnd() * FLOWER.length) | 0], { p: k % 3 === 2 ? p2 : p, c, g: 'grass3' });
    }
  }


  window.KIT = { canvas, sprite, outline, recolor, C, hex, clamp, R, D, E, TX, L, S, poly, hash, vnoise, scatter, segDist, lineDist, rgbOf, toHex, step, GRADES, gradeCanvas, u32, Buf, PAL_LEAF, PAL_DEEP, PAL_LIME, makeTree, makePine, makeBush, stoneBlock, blob, STONES, stone, pave, PAVE, TUFT, stamp, FLOWER, FCOL, flowerPatch, paintShadows, RAMP, TILES, roof, wall, stoneBlock_c, windowAt, doorAt, gableAt, chimneyAt, bracketSign, onCanvas, ICON, moss, LANTERN, LANTERN_OFF, awning, pot, ironLamp, woodLamp, bench, barrel, crate, noticeBoard, banner, well, signpost, planter, rock, fenceH, fencePost, vegPatch, tulipBed, basket, sunflower, arc, lilyPads, reeds, smoke, BIRD, bird, butterflies, fireflies, leaves, glow, critterSprites, spr, henState, drawSpriteAt, LIT, litSprite };
})();
