'use strict';
/* The South of Bellwood, the windy coast: sand, sea blue, salt white, sun-bleached wood and grey rock. The jetty
   (a walkable deck plus the posts that stand on it), fishing boats that bob, the fog lighthouse, the salt store,
   Arlo's home by the jetty and Theo's studio on the cliff (in 3D, VIL.house), the rope bridge's remains, sea stacks,
   and beach props. */
(() => {
  const V = VIL, { fill, px, disc, inked } = V, P = PX.PAL, { hash, Buf } = KIT, rng = PX.rng;
  // Sun-bleached wood and Arlo's weathered blue planks, light to dark.
  const BW = ['#f6f0e2', '#ddd3bf', '#bfb29a', '#968a76', '#6c6356'];
  const BL = ['#a9d0e6', '#7aaed3', '#5788b5', '#3f6690', '#2e4a6e'];
  const ramp = k => [0, 1, 2, 3, 4].map(i => k + i);
  const ROPE = ['dirt0', 'dirt2', 'dirt3', 'dirt4'], NET = ['roofG1', 'roofG2', 'roofG3', 'roofG4'];
  const FISH = [['iron0', 'iron2'], ['sky2', 'roofB2'], ['roofR0', 'roofR2']];

  const line = (b, x0, y0, x1, y1, c) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) px(b, Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), c);
  };
  // A rope from a to b sagging s px at its middle.
  const rope = (b, x0, y0, x1, y1, s, c = 'dirt3') => {
    const n = 2 * (Math.abs(x1 - x0) + Math.abs(y1 - y0) + s);
    for (let k = 0; k <= n; k++) { const t = k / n; px(b, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t + s * 4 * t * (1 - t)), c); }
  };
  // ASCII stamp; vert turns it a quarter (rows become columns), for fish hung by the tail.
  const stamp = (b, rows, x, y, key, vert) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (key[r[i]]) px(b, vert ? x + j : x + i, vert ? y + i : y + j, key[r[i]]); });
  const fish = (b, x, y, k = 0, vert = false) => stamp(b, ['a..aaaa.', '.abbbbeb', 'a..cccc.'], x, y, { a: FISH[k][1], b: FISH[k][0], c: 'white', e: 'ink' }, vert);
  // Flat marks (foam) under an inked sprite, never outlined.
  const over = (base, top, dx = 0, dy = 0) => { for (let y = 0; y < top.h; y++) for (let x = 0; x < top.w; x++) { const v = top.d[y * top.w + x]; if (v) base.set(x + dx, y + dy, v); } return base; };

  /* ---------- small things ---------- */
  // Salt heaped into a cone: lit white on the left, cool blue shade on the right, a few crystal glints.
  function saltHeap(b, cx, by, hw, hh, seed) {
    for (let j = 0; j < hh; j++) {
      const half = Math.round(hw * Math.sqrt((j + 1) / hh)), y = by - hh + j;
      for (let x = cx - half; x <= cx + half; x++) { const u = (x - cx) / Math.max(1, half); px(b, x, y, u < -0.3 ? 'white' : u < 0.35 ? 'stone0' : 'sky2'); }
    }
    fill(b, cx - hw, by - 1, hw * 2 + 1, 1, 'stone1');
    for (let k = 0; k < 4; k++) px(b, cx - hw + 2 + ((hash(k, 5, seed) * hw * 1.6) | 0), by - 2 - ((hash(k, 6, seed) * hh * 0.6) | 0), k & 1 ? 'sky3' : 'white');
  }
  // A sack of salt: burlap with a rope tie and a blue band.
  function sack(b, x, by, w = 12, h = 14) {
    const y = by - h;
    fill(b, x + 1, y + 4, w - 2, h - 4, 'wall2'); fill(b, x, y + 6, w, h - 7, 'wall2'); fill(b, x + 1, y + 4, 3, h - 5, 'wall1'); fill(b, x + w - 3, y + 6, 3, h - 7, 'wall3'); fill(b, x + 1, by - 1, w - 2, 1, 'wall4');
    fill(b, x + 3, y, w - 6, 4, 'wall2'); px(b, x + 3, y, 'wall1'); fill(b, x + 3, y + 3, w - 6, 1, 'dirt4');
    fill(b, x + 1, y + 8, w - 2, 2, BL[2]); fill(b, x + 1, y + 8, 3, 1, BL[1]);
  }
  // A crate of the day's catch: slatted box, fish heads and tails over the rim.
  function fishCrate(b, x, by) {
    const y = by - 11;
    for (let k = 0; k < 5; k++) fish(b, x + 1 + k * 3 - (k & 1), y - 1 + (k % 3), k % 3, true);
    fill(b, x, y + 2, 16, 9, 'wood2'); fill(b, x, y + 2, 16, 2, 'wood1'); fill(b, x, y + 6, 16, 1, 'wood3'); fill(b, x, by - 1, 16, 1, 'wood4');
    fill(b, x, y + 2, 2, 9, 'wood3'); fill(b, x + 14, y + 2, 2, 9, 'wood4'); px(b, x + 3, y + 4, 'wood4'); px(b, x + 12, y + 4, 'wood4');
  }
  // A cork float, a coil of rope.
  const float = (b, x, y) => { fill(b, x, y, 3, 2, 'orange'); px(b, x, y, 'light2'); fill(b, x, y + 2, 3, 1, 'light4'); };
  function coil(b, cx, cy, r) {
    disc(b, cx, cy, r, Math.round(r * 0.6), ROPE[3]);
    for (let k = r; k > 1; k -= 2) { disc(b, cx, cy - 1, k, Math.max(1, Math.round(k * 0.6) - 1), ROPE[3]); disc(b, cx, cy - 1, k - 1, Math.max(0, Math.round(k * 0.6) - 2), ROPE[1]); }
    disc(b, cx, cy - 1, 1, 0, ROPE[3]); px(b, cx - r + 2, cy - 2, ROPE[0]); px(b, cx - r + 3, cy - 3, ROPE[0]); px(b, cx - 1, cy - Math.round(r * 0.6), ROPE[0]);
  }
  // A heap of net: dark mesh over a mound, lit knots in a diamond grid, floats on top.
  function netHeap(b, cx, by, rx, ry, seed) {
    disc(b, cx, by - ry, rx, ry, NET[2]); disc(b, cx - 1, by - ry - 1, rx - 2, ry - 2, NET[1]);
    for (let y = by - 2 * ry; y < by; y++) for (let x = cx - rx; x <= cx + rx; x++) if (b.get(x, y) && (x + y) % 4 === 0 && (x - y) % 4 === 0) px(b, x, y, b.get(x, y) === b.get(cx, by - ry) ? NET[3] : NET[0]);
    fill(b, cx - rx + 2, by - 1, rx * 2 - 3, 1, NET[3]);
    const r = rng(seed); for (let k = 0; k < 3; k++) float(b, Math.round(cx - rx + 2 + r() * (rx * 2 - 6)), Math.round(by - ry * 2 + 1 + r() * ry));
  }
  // A rack of fish drying: two A-frame legs of bleached pole, two bars, fish hung by the tail.
  function rackOn(b, x, by) {
    for (const lx of [x + 3, x + 25]) { line(b, lx - 3, by - 1, lx, by - 26, BW[3]); line(b, lx + 3, by - 1, lx, by - 26, BW[2]); line(b, lx - 2, by - 1, lx + 1, by - 26, BW[1]); }
    fill(b, x, by - 27, 30, 2, BW[1]); fill(b, x, by - 27, 30, 1, BW[0]); fill(b, x + 2, by - 15, 26, 2, BW[2]); fill(b, x + 2, by - 15, 26, 1, BW[1]);
    for (let k = 0; k < 6; k++) fish(b, x + 4 + k * 4, by - 25 + (k & 1), k % 3, true);
    for (let k = 0; k < 4; k++) fish(b, x + 7 + k * 5, by - 13, (k + 1) % 3, true);
  }
  // A ring buoy: red and white quarters around a hole.
  function lifebuoy(b, cx, cy, r = 5) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y); if (d > r + 0.3 || d < r - 2.6) continue;
      const q = (x >= 0) === (y >= 0); px(b, cx + x, cy + y, q ? (x + y < 0 ? 'white' : 'stone1') : (x + y < 0 ? 'roofR1' : 'roofR2'));
    }
  }

  /* ---------- the sea ---------- */
  /* A sea boulder: flat lit cap, faces lit on the left and dark on the right, a crack, and a wet dark foot with weed
     and barnacles. Its rim is drawn one step dark so boulders stacked together still read as separate stones. */
  function boulder(b, cx, by, bw, bh, seed, wet = true) {
    const hw = bw / 2, top = by - bh, r = rng(seed), cap = Math.max(3, Math.min(6, Math.round(bw / 6))), wetH = Math.min(6, Math.round(bh / 3));
    // Each side steps in 4-row bands, narrower toward the top; the facet lines step with it.
    const n = Math.ceil(bh / 4) + 2, eL = [], eR = [], fL = [], fR = [];
    for (let k = 0; k < n; k++) { const wd = hw * (0.72 + 0.28 * Math.min(1, k * 7 / bh)); eL.push(wd - r() * 3); eR.push(wd - r() * 3); fL.push(-0.5 + r() * 0.3); fR.push(0.2 + r() * 0.3); }
    const span = y => { const j = Math.max(0, Math.min(bh - 1, y - top)), k = j >> 2, rd = j < 3 ? [0.6, 0.85, 0.96][j] : 1; return [Math.round(cx - eL[k] * rd), Math.round(cx + eR[k] * rd)]; };
    for (let y = top - 1; y <= by; y++) { const [l, rr] = span(y); fill(b, l - 1, y, rr - l + 3, 1, 'r4'); }
    for (let y = top; y < by; y++) {
      const [l, rr] = span(y), j = y - top, k = j >> 2;
      for (let x = l; x <= rr; x++) {
        const u = (x - cx) / hw;
        let c = j < cap ? (u < fR[0] ? 'r0' : 'r1') : x - l < 1 || u < fL[k] ? 'r1' : u > fR[k] ? 'r3' : 'r2';
        if (j === cap) c = u < fR[k] ? 'r2' : 'r3';
        if (wet && y >= by - wetH + ((hash(x >> 1, 4, seed) * 2) | 0)) c = by - y <= 1 ? 'r5' : c === 'r1' ? 'r3' : 'r4';
        px(b, x, y, c);
      }
    }
    // a ledge or two, and one angular crack with a lit lip
    for (let ly = top + cap + 6; ly < by - wetH - 3; ly += 9 + ((r() * 5) | 0)) { const [l, rr] = span(ly), e = Math.round(l + (rr - l) * (0.5 + r() * 0.35)); for (let x = l + 1; x < e; x++) { px(b, x, ly, x - l < (rr - l) * 0.4 ? 'r1' : 'r2'); px(b, x, ly + 1, 'r4'); } }
    if (bh > 15) { let x = Math.round(cx - hw * 0.25 + r() * hw * 0.5), y = top + cap + 1; for (const [sx, sy] of [[0, 1], [0, 1], [-1, 1], [-1, 1], [0, 1], [1, 1], [0, 1]]) { x += sx; y += sy; px(b, x, y, 'r4'); px(b, x + 1, y, 'r1'); } }
    if (wet) for (let x = Math.round(cx - hw + 2); x < cx + hw - 1; x++) {
      const h2 = hash(x, 11, seed), y = by - wetH + 1;
      if (h2 < 0.3) { px(b, x, y, V.LEAF.teal[3]); px(b, x, y + 1, V.LEAF.teal[4]); if (h2 < 0.12) px(b, x, y + 2, V.LEAF.teal[4]); }
      else if (h2 > 0.9) px(b, x, by - 3, 'stone1');
    }
  }
  // A ring of foam around a base at (cx, cy), broken into dashes; phase moves the dashes.
  function foam(b, cx, cy, rx, ry, phase = 0) {
    for (let y = -ry - 1; y <= ry + 1; y++) for (let x = -rx - 1; x <= rx + 1; x++) {
      const d = (x / rx) ** 2 + (y / ry) ** 2;
      if (d > 1.12 || d < 0.62) continue;
      const k = hash((x + phase * 3) >> 2, y, 17);
      if (k < 0.72) px(b, cx + x, cy + y, d > 0.9 && k > 0.4 ? 'w1' : 'w0');
    }
  }

  /* rockStack(seed): grey sea rocks standing in water, 40-80 wide, with a foam ring that drifts (2 frames). */
  function rockStack(seed = 1) {
    const r = rng(seed * 31 + 5), W = 40 + Math.round(r() * 40), tall = Math.round(W * 0.55 + 10 + r() * 8), H = tall + 6, side = r() < 0.5 ? 1 : -1;
    // a tall stack behind, a lower stone in front of it, a third on big stacks, and a pebble or two at the foot
    const at = u => Math.round(W / 2 + side * (u - 0.5) * W) + 6;
    const stones = [[at(0.42), H - 4, Math.round(W * 0.55), tall, seed * 7], [at(0.7), H - 2, Math.round(W * 0.45), Math.round(W * 0.3 + r() * 6), seed * 7 + 1]];
    if (W > 55) stones.push([at(0.17), H - 1, Math.round(W * 0.32), Math.round(W * 0.2 + 4), seed * 7 + 2]);
    stones.push([at(0.92), H - 1, 8, 5, seed * 7 + 3], [at(0.3), H, 9, 6, seed * 7 + 4]);
    const rock = inked(W + 12, H, b => { for (const s of stones) boulder(b, ...s); });
    const frames = [0, 1].map(f => { const F = new Buf(W + 16, H + 6); foam(F, Math.round(W / 2) + 8, H, Math.round(W / 2) + 4, 4, f); over(F, rock, 1, 0); return F.canvas(); });
    return { img: frames[0], frames, fps: 2, ax: Math.round(W / 2) + 8, ay: H, base: [-Math.round(W / 2), Math.round(W / 2)], foot: 6 };
  }

  /* ---------- boats ---------- */
  /* A hull seen from above and the south: the inside floor between two gunwales, the painted side below the near
     gunwale with a white stripe, the bow rising to the right, a square transom on the left. part(b, g) adds what
     stands in it; g(x) gives that column's geometry. Returns the inked Buf and the waterline. */
  function hull(L, beam, D, R, top, part) {
    const h = top + beam + D + 8, yW = h - 2;
    const g = x => {
      const t = x / (L - 1), hb = t < 0.45 ? 0.6 + 0.4 * Math.sin(t / 0.45 * 1.5708) : Math.pow(Math.cos((t - 0.45) / 0.55 * 1.5708), 0.6);
      const sh = Math.round(7 * Math.max(0, t - 0.6) ** 2 / 0.16 + 2 * Math.max(0, 0.15 - t) / 0.15), hv = Math.round(hb * beam / 2), yn = yW - D - sh;
      return { t, hv, yn, yf: yn - 2 * hv, cy: yn - hv, yb: yW - Math.round(Math.max(0, (t - 0.8) / 0.2) ** 2 * (D + sh - 3)) - (t < 0.06 ? 1 : 0) };
    };
    const out = inked(L, h, b => {
      for (let x = 0; x < L; x++) {
        const { hv, yn, yf, cy, yb } = g(x);
        if (hv >= 3) {
          fill(b, x, yf, 1, 1, R[0]); fill(b, x, yf + 1, 1, 1, R[1]); px(b, x, yf + 2, BW[4]); px(b, x, yf + 3, BW[3]); fill(b, x, yf + 4, 1, yn - yf - 5, BW[2]);
          for (const sy of [cy - 1, cy + 3]) if (sy > yf + 4 && sy < yn - 1) px(b, x, sy, BW[3]);
          px(b, x, yn - 1, R[0]);
          if (x > L * 0.84) { fill(b, x, yf + 1, 1, yn - yf - 2, x % 4 ? BW[1] : BW[2]); px(b, x, yn - 1, R[0]); }
        } else fill(b, x, yf, 1, yn - yf, x > L / 2 ? R[0] : R[1]);
        const mid = Math.round((yn + yb) / 2) + 1;
        for (let y = yn; y <= yb; y++) px(b, x, y, y === yb ? R[4] : y === yb - 1 ? R[3] : y === yn + 1 ? 'white' : y < mid ? R[1] : R[2]);
        if (x === 0) fill(b, x, yn, 1, yb - yn + 1, R[3]);
      }
      part(b, g);
    });
    return { out, yW, g };
  }
  // Frames of a hull bobbing 1 px with a foam line at the waterline; deco(F, f, dy) draws flat extras per frame.
  function bob(H, L, deco) {
    const frames = [0, 0, 1, 1].map((dy, f) => {
      const F = new Buf(H.out.w + 6, H.out.h + 3); over(F, H.out, 3, dy); if (deco) deco(F, f, dy);
      for (let x = 0; x < L; x++) { const { yb } = H.g(x); if (hash((x + f * 2) >> 1, f & 1, 9) < 0.62) px(F, x + 4, yb + 2, x > L * 0.9 || hash(x, f, 4) < 0.5 ? 'w0' : 'w1'); }
      const bx = L + 3, by = H.g(L - 1).yb + 2; for (const [i, j] of [[1, 0], [2, 0], [3, 1], [1, -1], [2, 1]]) px(F, bx + i, by + j + (f & 1), 'w0');
      return F.canvas();
    });
    return { img: frames[0], frames, fps: 3, ax: Math.round(L / 2) + 4, ay: H.yW + 2 };
  }

  /* boat(seed): a small fishing boat, 82 long: mast, sail furled on its boom, nets and floats in the stern, a basket of
     catch in the bow, a pennant streaming in the wind. Hull paint follows the seed. */
  function boat(seed = 1) {
    const L = 82, R = ramp(['roofR', 'roofB', 'roofG'][seed % 3]), top = 44;
    let mastTop;
    const H = hull(L, 18, 10, R, top, (b, g) => {
      const xm = Math.round(L * 0.5), m = g(xm), mt = m.cy - top - 2; mastTop = [xm, mt];
      // nets heaped in the stern, floats on top
      netHeap(b, 13, g(13).yn - 1, 10, 6, seed); for (const t of [0.26, 0.7]) { const x = Math.round(L * t), q = g(x); fill(b, x, q.yf + 2, 3, q.yn - q.yf - 3, BW[0]); fill(b, x + 2, q.yf + 2, 1, q.yn - q.yf - 3, BW[3]); }
      // basket of catch in the bow
      const xb = Math.round(L * 0.76), qb = g(xb); disc(b, xb, qb.cy, 5, 3, 'wood3'); disc(b, xb, qb.cy - 1, 4, 2, 'wood2'); for (let k = 0; k < 3; k++) fish(b, xb - 4 + k * 2, qb.cy - 3 + (k & 1), (k + seed) % 3);
      coil(b, Math.round(L * 0.6), m.cy + 2, 4);
      // mast, boom and the furled sail tied in bundles
      fill(b, xm - 1, mt, 3, m.cy - mt, 'wood2'); fill(b, xm - 1, mt, 1, m.cy - mt, 'wood1'); fill(b, xm + 1, mt, 1, m.cy - mt, 'wood3'); fill(b, xm - 2, mt, 5, 2, 'wood3'); fill(b, xm - 2, m.cy - 1, 5, 2, 'wood4');
      const by = m.cy - 19, bx = Math.round(L * 0.1);
      line(b, bx, by + 3, xm - 1, by, 'wood3'); line(b, bx, by + 4, xm - 1, by + 1, 'wood4');
      for (let x = bx + 1; x < xm - 1; x++) {
        const y = Math.round(by - (x - bx) * 3 / (xm - bx)), lump = 4 + ((x >> 2) & 1) - (x < bx + 5 ? 2 : 0);
        for (let j = 1; j <= lump; j++) px(b, x, y - j + 3, j === lump ? 'cream0' : j <= 1 ? 'cream2' : 'cream1');
        if ((x - bx) % 9 === 4) { px(b, x, y - lump + 3, ROPE[3]); for (let j = 1; j < lump; j++) px(b, x, y - j + 3, ROPE[2]); }
      }
    });
    const [xm, mt] = mastTop, flag = [inked(9, 4, b => { fill(b, 0, 0, 8, 2, 'red'); fill(b, 0, 2, 5, 1, 'roofR3'); px(b, 8, 1, 'red'); fill(b, 0, 0, 2, 1, 'rose'); }), inked(8, 4, b => { fill(b, 0, 0, 5, 2, 'red'); fill(b, 3, 1, 4, 2, 'red'); fill(b, 0, 2, 3, 1, 'roofR3'); fill(b, 0, 0, 2, 1, 'rose'); px(b, 7, 3, 'roofR3'); })];
    return bob(H, L, (F, f, dy) => {
      const ox = 4, oy = 1 + dy;
      rope(F, xm + ox, mt + oy, L - 2 + ox, H.g(L - 2).yf + oy, 2, 'dirt3'); rope(F, xm + ox, mt + oy + 1, 2 + ox, H.g(2).yf + oy, 3, 'dirt3');
      over(F, flag[f & 1], xm + ox + 1, mt + oy - 1);
    });
  }

  /* rowboat(beached): a bleached rowboat, 40 long, oars shipped along the thwart, a painter rope coiled in the bow;
     beached, it rests still on the sand, with no water round it. */
  function rowboat(beached) {
    const L = 40, R = [BW[0], BL[1], BL[2], BL[3], BL[4]];
    const H = hull(L, 14, 7, R, 2, (b, g) => {
      const xt = 18, q = g(xt); fill(b, xt, q.yf + 2, 3, q.yn - q.yf - 3, BW[0]); fill(b, xt + 2, q.yf + 2, 1, q.yn - q.yf - 3, BW[3]);
      const q2 = g(8); fill(b, 3, q2.yf + 2, 8, q2.yn - q2.yf - 3, BW[0]); fill(b, 3, q2.yn - 2, 8, 1, BW[3]);
      for (const [y, d] of [[q.yf + 1, -1], [q.yn - 2, 1]]) { fill(b, 6, y, 26, 1, 'wood2'); px(b, 6, y, 'wood1'); fill(b, 4, y + d, 6, 2, 'wood1'); fill(b, 4, y + d + 1, 6, 1, 'wood3'); }
      coil(b, 31, g(31).cy + 1, 3);
    });
    if (beached) { const F = new Buf(H.out.w + 6, H.out.h + 3); over(F, H.out, 3, 0); return { img: F.canvas(), ax: Math.round(L / 2) + 4, ay: H.yW + 2 }; }
    return bob(H, L);
  }

  /* ---------- the jetty ---------- */
  /* jetty(len): a plank jetty running south into the sea, 48 wide and len long.
     deck: the walkable boards, painted on the ground at (x - dx, y - dy) for feet point (x, y) = the south end's centre;
     it carries a rope coil, the end beam and its ladder and piles below the deck's south edge (deck.height = len + 10).
     img: everything that stands on it, in the same frame (ax, ay = the south end's centre).
     parts: [{ img, ax, ay, x, y }] the same pieces one by one, feet at (x, y) relative to the jetty's feet, for depth sorting.
     glass, lantern: the end lantern's glass rect and light point in img px. */
  function jetty(len = 160) {
    const W = 48, dk = new Buf(W, len + 10);
    for (let y = 0, k = 0; y < len; y += 5, k++) {
      const tone = hash(k, 1, 7) < 0.25 ? 2 : 1, jx = 8 + ((hash(k, 2, 7) * 30) | 0);
      fill(dk, 3, y, W - 6, 5, BW[tone]); fill(dk, 3, y, W - 6, 1, BW[tone - 1]); fill(dk, 3, y + 4, W - 6, 1, BW[4]);
      fill(dk, jx, y + 1, 1, 3, BW[4]); px(dk, jx + 1, y + 1, BW[0]);
      px(dk, 6, y + 2, BW[3]); px(dk, W - 7, y + 2, BW[3]);
      if (hash(k, 3, 7) < 0.3) { fill(dk, 3, y, 1 + ((hash(k, 4, 7) * 2) | 0), 5, 'w3'); }
    }
    fill(dk, 0, 0, 3, len, BW[3]); fill(dk, 1, 0, 1, len, BW[2]); fill(dk, W - 3, 0, 3, len, BW[4]); fill(dk, W - 3, 0, 1, len, BW[3]);
    // the south end: a beam with a lit top, piles going down into the water in foam rings, a ladder
    fill(dk, 0, len, W, 4, BW[3]); fill(dk, 0, len, W, 1, BW[2]); fill(dk, 0, len + 3, W, 1, BW[4]);
    for (const x of [1, W - 6]) { fill(dk, x, len + 4, 5, 4, BW[4]); fill(dk, x, len + 4, 1, 4, BW[3]); fill(dk, x - 1, len + 8, 7, 1, 'w0'); px(dk, x + 2, len + 9, 'w0'); }
    fill(dk, 29, len, 1, 9, BW[4]); fill(dk, 35, len, 1, 9, BW[4]); for (let y = len + 1; y < len + 9; y += 3) fill(dk, 30, y, 5, 1, BW[2]);
    fill(dk, 28, len + 9, 9, 1, 'w0');
    coil(dk, 13, Math.round(len * 0.45), 6); line(dk, 19, Math.round(len * 0.45) - 2, 25, Math.round(len * 0.45) - 8, ROPE[2]);
    // posts that stand on the side beams, rope rail between them, the end lantern, the crate of fish
    const TOP = 36, img = new Buf(W + 4, len + TOP + 2), parts = [], put = (o, x, y, ax, ay) => { over(img, o, x + 2 - ax, y + TOP - ay); parts.push({ img: o.canvas(), ax, ay, x: x - W / 2, y: y - len }); };
    const ys = []; for (let y = 6; y < len - 10; y += 38) ys.push(y); ys.push(len - 3);
    const post = (b, y, h) => { fill(b, 0, y + 2, 6, h - 2, BW[2]); fill(b, 0, y + 2, 2, h - 2, BW[1]); fill(b, 4, y + 2, 2, h - 2, BW[3]); fill(b, 1, y, 4, 3, BW[0]); px(b, 4, y + 2, BW[1]); fill(b, 0, y + 5, 6, 2, ROPE[2]); fill(b, 0, y + 5, 2, 1, ROPE[1]); fill(b, 0, y + h - 2, 6, 2, BW[4]); };
    ys.forEach((y, i) => {
      for (const side of [0, 1]) {
        if (side && i === ys.length - 1) continue;
        const prev = i ? ys[i - 1] : null, x = side ? W - 4 : 4, ph = 13;
        const o = inked(6, (prev == null ? 0 : y - prev) + ph, b => {
          const h = b.h; post(b, h - ph, ph); if (prev != null) { rope(b, 2, 4, 2, h - ph + 4, 0, ROPE[2]); rope(b, 3, 4, 3, h - ph + 4, 0, ROPE[1]); }
        });
        put(o, x, y, 4, o.h - 1);
      }
    });
    // the lantern post at the end, its lamp hanging toward the sea
    const lp = inked(14, 32, b => {
      fill(b, 0, 2, 5, 30, BW[2]); fill(b, 0, 2, 2, 30, BW[1]); fill(b, 4, 2, 1, 30, BW[3]); fill(b, 0, 1, 5, 2, BW[0]); fill(b, 0, 28, 5, 2, BW[4]);
      fill(b, 4, 4, 9, 2, 'iron3'); px(b, 4, 4, 'iron2'); px(b, 11, 6, 'iron3');
      fill(b, 9, 7, 5, 2, 'iron3'); fill(b, 9, 9, 5, 7, 'iron3'); fill(b, 10, 10, 3, 5, 'light1'); px(b, 10, 10, 'light0'); fill(b, 9, 16, 5, 1, 'iron4'); fill(b, 10, 8, 3, 1, 'iron2');
      fill(b, 0, 9, 5, 2, ROPE[2]);
    });
    put(lp, W - 4, len - 3, 3, 33);
    const fc = inked(16, 14, b => fishCrate(b, 0, 14));
    put(fc, 13, len - 12, 8, 15);
    const glass = [[W - 4 + 2 - 3 + 11, len - 3 + TOP - 33 + 11, 3, 5]];
    return { deck: dk.canvas(), img: img.canvas(), ax: W / 2 + 2, ay: len + TOP, dx: W / 2, dy: len, parts, glass, lantern: [glass[0][0] + 1, glass[0][1] + 2] };
  }

  /* ---------- buildings ---------- */
  /* lighthouse(): the small fog lighthouse, 72 x 186: a white tower banded red on a plinth over sea boulders, a gallery
     with a rail and a brass fog horn, the glass lamp room (lit), a red dome with a fish weather vane.
     lit: the lamp room glass and two tower windows; lamp: the light's centre in img px; door: the tower door. */
  function lighthouse() {
    const w = 72, h = 186, cx = 36, pb = h - 22, tb = pb - 5, tt = 54;
    const lit = [];
    const out = inked(w, h, b => {
      // sea rocks behind and beside the plinth, dressed stone on them, steps down the rocks to the door
      for (const [x, y, bw, bh, s] of [[15, h - 3, 28, 36, 1], [57, h - 4, 28, 32, 2], [36, h - 1, 30, 14, 4]]) boulder(b, x, y, bw, bh, s);
      fill(b, cx - 21, pb - 5, 42, 8, 'stone2'); fill(b, cx - 21, pb - 5, 42, 2, 'stone1'); fill(b, cx - 21, pb + 2, 42, 1, 'stone4');
      for (let x = cx - 21; x < cx + 19; x += 8) fill(b, x + 7, pb - 3, 1, 5, 'stone3');
      for (let k = 0; k < 4; k++) { const y = pb + 3 + k * 4; fill(b, cx - 8 - k, y, 17 + k * 2, 4, 'stone2'); fill(b, cx - 8 - k, y, 17 + k * 2, 1, 'stone1'); fill(b, cx - 8 - k, y + 3, 17 + k * 2, 1, 'stone4'); }
      for (const [x, y, bw, bh, s] of [[9, h - 1, 16, 11, 5], [64, h - 1, 14, 10, 6]]) boulder(b, x, y, bw, bh, s);
      // tower: a tapered drum, red bands, lit on the left
      for (let y = tt; y < tb; y++) {
        const f = (y - tt) / (tb - tt), hw = Math.round(12 + 7 * f), red = Math.floor((tb - y) / 18) % 2 === 1, Rm = red ? ['roofR0', 'roofR1', 'roofR2', 'roofR3'] : ['white', 'stone0', 'stone1', 'stone2'];
        for (let x = cx - hw; x < cx + hw; x++) { const u = (x + 0.5 - cx) / hw; px(b, x, y, Rm[u < -0.62 ? 0 : u < 0.3 ? 1 : u < 0.72 ? 2 : 3]); }
        if ((tb - y) % 18 === 0) for (let x = cx - hw; x < cx + hw; x++) px(b, x, y, red ? 'stone2' : 'roofR3');
      }
      // windows up the tower, the door at its foot with a ring buoy beside it
      for (const y of [tb - 58, tb - 94]) { fill(b, cx - 4, y - 1, 8, 12, 'stone3'); fill(b, cx - 3, y, 6, 10, 'sky3'); fill(b, cx - 3, y, 6, 3, 'sky2'); fill(b, cx - 3, y + 8, 6, 2, 'sky4'); px(b, cx - 2, y + 1, 'white'); fill(b, cx - 4, y - 1, 1, 1, 'stone2'); px(b, cx + 3, y - 1, 'stone2'); fill(b, cx - 5, y + 11, 10, 2, 'stone2'); lit.push([cx - 3 + 1, y + 1, 6, 10]); }
      const dw = 18, dh = 30, dx = cx - 9, dy = tb - dh;
      fill(b, dx - 2, dy - 2, dw + 4, dh + 2, 'stone3'); fill(b, dx - 1, dy - 3, dw + 2, 1, 'stone3');
      fill(b, dx, dy, dw, dh, 'wood2'); fill(b, dx, dy, 2, dh, 'wood1'); for (let x = dx + 4; x < dx + dw; x += 5) fill(b, x, dy, 1, dh, 'wood3');
      px(b, dx, dy, 'stone3'); px(b, dx + dw - 1, dy, 'stone3'); fill(b, dx, dy + 6, dw, 2, 'iron3'); fill(b, dx, dy + dh - 9, dw, 2, 'iron3'); fill(b, dx + dw - 5, dy + 15, 2, 2, 'brass1');
      lifebuoy(b, cx + 14, tb - 20, 5);
      // gallery on corbels; the lamp room stands on a short white drum
      for (let x = cx - 12; x < cx + 12; x += 5) { fill(b, x, tt, 3, 4, 'stone3'); px(b, x, tt, 'stone1'); }
      fill(b, cx - 23, tt - 6, 46, 6, 'stone2'); fill(b, cx - 23, tt - 6, 46, 2, 'stone1'); fill(b, cx - 23, tt - 1, 46, 1, 'stone4');
      for (let x = cx - 13; x < cx + 13; x++) { const u = (x + 0.5 - cx) / 13; fill(b, x, tt - 14, 1, 8, u < -0.6 ? 'white' : u < 0.3 ? 'stone0' : u < 0.7 ? 'stone1' : 'stone2'); }
      fill(b, cx - 13, tt - 14, 26, 1, 'stone2');
      const gx = cx - 10, gy = 22, gw = 20, gh = tt - 15 - gy;
      fill(b, gx - 2, gy - 2, gw + 4, gh + 4, 'iron3'); fill(b, gx, gy, gw, gh, 'sky3'); fill(b, gx, gy, gw, 5, 'sky2');
      fill(b, cx - 3, gy + 3, 6, 8, 'light1'); fill(b, cx - 2, gy + 4, 4, 5, 'light0'); fill(b, cx - 4, gy + 11, 8, 3, 'brass2'); fill(b, cx - 4, gy + 11, 8, 1, 'brass1'); fill(b, cx - 2, gy + 14, 4, gh - 14, 'brass3');
      for (const x of [gx + 6, gx + 13]) fill(b, x, gy, 1, gh, 'iron2');
      for (const [x, y] of [[gx + 1, gy + 1], [gx + 2, gy + 2], [gx + 1, gy + 3], [gx + 14, gy + 1]]) px(b, x, y, 'white');
      fill(b, gx - 2, gy - 2, gw + 4, 1, 'iron1');
      lit.push([gx + 1, gy + 1, gw, gh]);
      // rail in front of the lamp room
      for (let x = cx - 22; x <= cx + 21; x += 4) fill(b, x, tt - 13, 1, 7, 'iron3');
      fill(b, cx - 22, tt - 14, 44, 2, 'iron2'); fill(b, cx - 22, tt - 14, 44, 1, 'iron1');
      // the fog horn: a brass trumpet off the gallery, flaring to the right
      fill(b, cx + 20, tt - 9, 6, 3, 'brass2'); fill(b, cx + 20, tt - 9, 6, 1, 'brass1');
      for (let k = 0; k < 6; k++) fill(b, cx + 26 + k, tt - 9 - (k >> 1), 1, 3 + (k & 6), k < 5 ? 'brass1' : 'brass3');
      fill(b, cx + 31, tt - 11, 1, 7, 'brass3'); fill(b, cx + 26, tt - 7, 5, 1, 'brass3');
      // the dome, its ball and the fish vane
      fill(b, gx - 5, gy - 4, gw + 10, 3, 'roofR3'); fill(b, gx - 5, gy - 4, gw + 10, 1, 'roofR2');
      for (let j = 0; j < 10; j++) { const hw = Math.round(14 * Math.sqrt(1 - ((9 - j) / 10) ** 2)) - 1; for (let x = cx - hw; x < cx + hw; x++) { const u = (x + 0.5 - cx) / hw; px(b, x, gy - 14 + j, u < -0.45 ? 'roofR1' : u < 0.4 ? 'roofR2' : 'roofR3'); } }
      px(b, cx - 6, gy - 11, 'roofR0'); px(b, cx - 7, gy - 10, 'roofR0'); px(b, cx - 5, gy - 12, 'roofR0');
      disc(b, cx, gy - 16, 2, 2, 'brass2'); px(b, cx - 1, gy - 17, 'brass0');
      fill(b, cx, 1, 1, gy - 18, 'iron3');
      stamp(b, ['.aaaa..a', 'abbbbbab', '.cccc..c'], cx - 4, 2, { a: 'brass1', b: 'brass2', c: 'brass3' });
    });
    return { img: out.canvas(), ax: cx + 1, ay: h, base: [-32, 32], foot: 22, door: 0, lit, lamp: [cx + 1, 22 + 8] };
  }

  /* ---------- the coast's buildings, in 3D (VIL.house) ---------- */
  const sprite = (W, H, paint) => ({ img: inked(W, H, paint).canvas(), ax: (W >> 1) + 1, ay: H + 1 });
  const card = (s, x, back) => ({ img: s.img, ax: s.ax, ay: s.ay, x, back, up: 0 });

  /* The salt store: a shed of sun-bleached boards under a sea-green roof with a louvred vent on its ridge, cross-braced
     double doors under a board with a heap of salt painted on it, salt crusting the foot of the walls; salt heaped and
     bagged along the front, a balance scale by the door. */
  function saltStore() {
    const R = ramp('roofG');
    const heaps = sprite(44, 16, b => { saltHeap(b, 12, 16, 11, 13, 1); saltHeap(b, 32, 16, 8, 9, 2); });
    const sacks = sprite(28, 28, b => { sack(b, 0, 28); sack(b, 12, 28, 11, 13); sack(b, 5, 16, 12, 13); });
    const scale = sprite(24, 32, b => {
      const kx = 10;
      fill(b, kx, 4, 3, 28, 'wood3'); fill(b, kx, 4, 1, 28, 'wood1'); fill(b, kx - 4, 30, 11, 2, 'wood4');
      fill(b, kx - 9, 3, 21, 2, 'brass2'); fill(b, kx - 9, 3, 21, 1, 'brass1'); disc(b, kx + 1, 2, 2, 2, 'brass1');
      for (const [x, salt] of [[kx - 7, true], [kx + 9, false]]) {
        line(b, x, 5, x - 3, 14, 'iron3'); line(b, x, 5, x + 3, 14, 'iron3');
        fill(b, x - 4, 14, 9, 3, 'brass2'); fill(b, x - 4, 14, 9, 1, 'brass1');
        if (salt) saltHeap(b, x, 14, 3, 4, 5); else { fill(b, x - 2, 11, 4, 3, 'iron2'); fill(b, x - 2, 11, 4, 1, 'iron1'); }
      }
    });
    return V.house({
      w: 136, d: 56, wall: 46, rise: 34, kind: 'plank', ramp: BW, trim: [BW[0], BW[1], BW[3]], roof: R, seed: 51,
      wins: [[16, 14, 16, 13, { shut: R.slice(1, 4), frame: [BW[1], BW[2], BW[4]] }], [104, 14, 16, 13, { shut: R.slice(1, 4), frame: [BW[1], BW[2], BW[4]] }]],
      side: [[20, 14, 14, 12, { frame: [BW[1], BW[2], BW[4]] }]],
      door: [55, 26, 38, { double: true, paint: BW.slice(1) }],
      front(b, w, h) {
        // the sign over the doors: a blue board with a heap of salt painted on it, salt crust along the foot
        const sx = 52, sy = h - 52;
        fill(b, sx, sy, 32, 10, 'wood3'); fill(b, sx + 1, sy + 1, 30, 8, BL[3]); fill(b, sx + 1, sy + 1, 30, 1, BL[2]); saltHeap(b, sx + 16, sy + 8, 6, 5, 2);
        for (const k of [6, 26]) { px(b, sx + k, sy + 4, 'white'); px(b, sx + k - 1, sy + 5, 'white'); px(b, sx + k + 1, sy + 5, 'white'); px(b, sx + k, sy + 6, 'white'); }
        for (let x = 0; x < w; x++) if (hash(x >> 1, 4, 3) < 0.4) fill(b, x, h - 5 - ((hash(x, 5, 3) * 3) | 0), 1, 2, 'stone0');
      },
      extra(m, g, { B0 }) {
        // the louvred vent on the ridge, under its own little roof
        MODEL.gable(m, { x0: -10, x1: 10, back0: B0 + 20, d: 16, wall: 10, rise: 6, up0: g.R - 4, ov: 2, board: (b, w, h) => fill(b, 0, 0, w, h, BW[3]), roof: (b, w, h) => { fill(b, 0, 0, w, h, R[2]); fill(b, 0, 0, w, 1, R[0]); },
          front(b, w, h) { fill(b, 0, 0, w, h, BW[1]); for (let y = 2; y < h; y += 3) fill(b, 2, y, w - 4, 1, BW[4]); }, left: (b, w, h) => fill(b, 0, 0, w, h, BW[2]), right: (b, w, h) => fill(b, 0, 0, w, h, BW[3]) });
      },
      cards: [card(heaps, -44, -8), card(sacks, 34, -8), card(scale, 58, -4)],
    });
  }

  /* Arlo the fisherman's home by the jetty: weathered blue clapboards peeling to bare wood under a terracotta roof and
     a stone chimney, a brass porthole and a shuttered window, a net hung to dry under the eave with its floats, a ring
     buoy on the wall, an oar by the door. */
  function arloHome() {
    return V.house({
      w: 120, d: 48, wall: 46, rise: 34, kind: 'clap', ramp: BL, trim: [BW[0], BW[1], BW[3]], roof: ramp('roofR'), seed: 52, chimney: [38, 24],
      wins: [[100, 14, 14, 15, { shut: BW.slice(0, 3), frame: [BW[1], BW[2], BW[4]] }]], side: [[18, 14, 14, 14, { frame: [BW[1], BW[2], BW[4]] }]],
      door: [54, 22, 36, { paint: ['roofB0', 'roofB1', 'roofB2', 'roofB3'] }],
      front(b, w, h, top) {
        for (const [x, y, pw] of [[30, top + 34, 9], [84, top + 8, 7], [10, top + 40, 6]]) { fill(b, x, y, pw, 3, BW[1]); fill(b, x, y, pw, 1, BW[0]); px(b, x + pw, y + 1, BL[3]); }
        const pcx = 42, pcy = top + 20;
        disc(b, pcx, pcy, 8, 8, 'brass3'); disc(b, pcx, pcy, 7, 7, 'brass2'); disc(b, pcx - 1, pcy - 1, 6, 6, 'brass1'); disc(b, pcx, pcy, 5, 5, 'sky3'); disc(b, pcx - 1, pcy - 1, 3, 3, 'sky2'); px(b, pcx - 3, pcy - 3, 'white');
        lifebuoy(b, 88, top + 20, 6);
        // the net hung from two hooks under the eave, sagging between them, floats along its head
        const nx = 6, nw = 24;
        for (let x = nx; x < nx + nw; x++) {
          const sag = Math.round(3 * Math.sin((x - nx) / nw * Math.PI)), bot = top + 28 + sag + ((x * 7) % 3 === 0 ? 1 : 0);
          for (let y = top + 3 + sag; y < bot; y++) if ((x + y) % 3 === 0 || (x - y) % 3 === 0 || y === bot - 1) px(b, x, y, (x - y) % 3 === 0 ? NET[2] : NET[1]);
        }
        for (let k = 0; k < 4; k++) float(b, nx + 2 + k * 6, top + 2 + Math.round(3 * Math.sin((k * 6 + 3) / nw * Math.PI)));
        // the oar leaning by the door
        line(b, 48, h - 2, 52, h - 38, 'wood3'); line(b, 47, h - 2, 51, h - 38, 'wood1'); fill(b, 45, h - 10, 5, 9, 'wood2'); fill(b, 45, h - 10, 2, 9, 'wood1');
      },
    });
  }

  /* Theo's photo studio and darkroom on the cliff top: a tidy cream house framed in dark timber under a slate roof,
     its gable to the sea; the big many-paned studio window, the darkroom's blacked-out window with its little red lamp,
     a box camera hung out as the sign. */
  function theoStudio() {
    const chain = inked(14, 16, b => {
      for (let i = 0; i < 12; i++) { px(b, 1 + i, 2 + (i >> 1), i % 2 ? 'iron1' : 'iron3'); px(b, 12 - i, 2 + (i >> 1), i % 2 ? 'iron2' : 'iron3'); }
      fill(b, 4, 9, 6, 6, 'brass2'); fill(b, 4, 9, 6, 1, 'brass1'); fill(b, 5, 6, 4, 3, 'iron3'); fill(b, 6, 7, 2, 2, 'wood5'); px(b, 6, 11, 'ink');
    });
    const cup = inked(6, 5, b => { fill(b, 0, 0, 6, 4, 'roofR2'); fill(b, 0, 0, 6, 1, 'leaf2'); fill(b, 1, 4, 4, 1, 'roofR3'); px(b, 4, 1, 'roofR1'); });
    const camera = (b, w, h) => {
      fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 2, 'wood2'); fill(b, 0, h - 2, w, 2, 'wood4');
      disc(b, (w >> 1) + 1, h >> 1, 3, 3, 'brass2'); disc(b, (w >> 1) + 1, h >> 1, 2, 2, 'iron4'); px(b, w >> 1, (h >> 1) - 1, 'white'); px(b, w - 3, 2, 'red');
    };
    return V.house({
      w: 136, d: 52, wall: 52, rise: 46, ridge: 'back', kind: 'plaster', ramp: ['wall0', 'wall1', 'wall2', 'wall3'], roof: 'roofB', seed: 53, timber: [36, 0, 54, 133],
      wins: [[10, 2, 36, 30, { frame: ['wood2', 'wood3', 'wood4'] }]], side: [[18, 12, 14, 14]],
      door: [70, 22, 36, { paint: ['roofG1', 'roofG2', 'roofG3', 'roofG4'] }], chimney: [44, 30],
      front(b, w, h, top) {
        // the darkroom: a blacked-out window, and the little red lamp over it
        fill(b, 108, top + 12, 16, 18, 'wood4'); fill(b, 110, top + 14, 12, 14, '#2a1b2e'); fill(b, 110, top + 14, 12, 1, '#3d2a40'); fill(b, 107, top + 30, 18, 2, 'wood3');
        fill(b, 114, top + 4, 4, 2, 'iron3'); fill(b, 114, top + 6, 4, 3, 'red'); px(b, 114, top + 6, 'rose');
        // the darkroom's vent beside the door, its louvres and the little sill under it
        fill(b, 96, top + 28, 9, 7, 'wood4'); for (let y = top + 29; y < top + 34; y += 2) fill(b, 97, y, 7, 1, 'ink2');
        fill(b, 95, top + 35, 11, 2, 'wood2'); fill(b, 95, top + 36, 11, 1, 'wood4');
      },
      extra(m, g, { X0, B0, PH }) { V.hangSign(m, X0 + 64, B0, PH + 38, 14, 11, camera); },
      // Night 3: a ship's chain looped through the door's handles and padlocked from inside, and the clay cup of
      // mint tea set on the vent's sill
      cards: [
        { name: 'chain', img: chain.canvas(), ax: 7, ay: 15, x: 13, back: 14, up: 22, wall: true, walk: true },
        { name: 'cup', img: cup.canvas(), ax: 3, ay: 4, x: 32, back: 14, up: 23, wall: true, walk: true },
      ],
    });
  }

  /* ropeBridgeRemains(): what is left of the old rope bridge, 62 x 50: two leaning posts, frayed ropes hanging from
     them, a plank still slung between two ropes, another hanging by one end, a broken one on the ground. */
  function ropeBridgeRemains() {
    const w = 62, h = 50;
    const out = inked(w, h, b => {
      // a post weathered grey, its top snapped off in splinters, a rope lashing below the break
      const postAt = (x0, lean, top) => {
        for (let y = 4; y < h; y++) { const x = Math.round(x0 + (h - y) * lean); for (let i = 0; i < 6; i++) if (y >= 4 + top[i]) px(b, x + i, y, y === 4 + top[i] ? BW[1] : i < 2 ? BW[2] : i > 3 ? BW[4] : BW[3]); }
        const tx = Math.round(x0 + (h - 6) * lean); for (const y of [16, 30]) px(b, Math.round(x0 + (h - y) * lean) + 3, y, BW[4]);
        fill(b, tx - 1, 10, 8, 3, ROPE[2]); fill(b, tx - 1, 10, 8, 1, ROPE[1]); px(b, tx + 6, 13, ROPE[2]); fill(b, x0 - 1, h - 3, 8, 3, BW[4]); return tx;
      };
      const l = postAt(8, -0.12, [2, 0, 1, 3, 2, 4]), r = postAt(48, 0.1, [3, 1, 0, 2, 0, 3]);
      // left: a rope sags out and ends frayed; another hangs straight down
      rope(b, l + 6, 12, 28, 30, 6, ROPE[2]); rope(b, l + 6, 11, 28, 29, 6, ROPE[1]);
      for (const [dx, dy] of [[0, 1], [1, 2], [-1, 2], [1, 3], [-1, 4]]) px(b, 28 + dx, 31 + dy, ROPE[2]);
      line(b, l + 7, 13, l + 9, 36, ROPE[2]); line(b, l + 8, 13, l + 10, 36, ROPE[1]); px(b, l + 9, 37, ROPE[2]); px(b, l + 11, 38, ROPE[2]);
      // right: two ropes with a plank still slung between them, and one hanging by an end
      rope(b, r, 12, 40, 26, 4, ROPE[2]); rope(b, r, 18, 39, 34, 3, ROPE[2]);
      for (const [dx, dy] of [[0, 1], [-1, 2], [1, 2]]) { px(b, 40 + dx, 26 + dy, ROPE[1]); px(b, 39 + dx, 34 + dy, ROPE[1]); }
      for (let k = 0; k < 10; k++) { fill(b, 36 + k, 25 + Math.round(k * 0.3), 1, 3, k < 2 ? BW[1] : BW[2]); px(b, 36 + k, 27 + Math.round(k * 0.3), BW[4]); }
      for (let k = 0; k < 9; k++) { fill(b, 43 - Math.round(k * 0.4), 32 + k, 3, 1, BW[2]); px(b, 43 - Math.round(k * 0.4), 32 + k, BW[1]); }
      // the broken plank on the ground, splintered
      fill(b, 18, h - 5, 14, 3, BW[1]); fill(b, 18, h - 5, 14, 1, BW[0]); fill(b, 18, h - 3, 14, 1, BW[3]); px(b, 32, h - 5, BW[1]); px(b, 33, h - 4, BW[2]); px(b, 32, h - 3, BW[3]);
      fill(b, 22, h - 4, 1, 1, BW[4]); fill(b, 28, h - 4, 1, 1, BW[4]);
    });
    return { img: out.canvas(), ax: w / 2 + 1, ay: h, base: [-28, 28], foot: 4, shadow: [24, 3] };
  }

  /* ---------- beach props ---------- */
  /* shell(kind): 'scallop' (a pink fan), 'spiral' (a cream whelk) or 'clam' (lilac). Lies flat on the sand. */
  function shell(kind = 'scallop') {
    const S = {
      scallop: [['..aaaaa..', '.abacaba.', 'abacacaba', 'bacacacab', '.bcacacb.', '..bdbdb..', '...ddd...'], { a: 'cream0', b: 'pink', c: 'rose', d: 'roofR2' }],
      spiral: [['...aab....', '..abbca...', '.abccbbaa.', 'abcddcbbba', '.bcddccbb.', '..bccbbd..', '....bdd...'], { a: 'cream0', b: 'cream1', c: 'orange', d: 'roofR3' }],
      clam: [['..aaaa..', '.abbbba.', 'abcccccb', 'bccdcccd', '.cdddddc','..dddd..'], { a: 'white', b: 'lilac', c: 'roofB1', d: 'roofB2' }],
    }[kind] || [];
    const [rows, key] = S, out = inked(rows[0].length, rows.length, b => stamp(b, rows, 0, 0, key));
    return { img: out.canvas(), ax: Math.round(rows[0].length / 2) + 1, ay: rows.length + 1 };
  }
  /* driftwood(): a bleached, twisted log with a branch stub and a knot hole. */
  function driftwood() {
    const out = inked(36, 12, b => {
      for (let x = 2; x < 34; x++) { const y = 5 + Math.round(Math.sin(x / 6) * 1.2), t = x < 6 || x > 30 ? 3 : 4; fill(b, x, y, 1, t, BW[1]); px(b, x, y, BW[0]); px(b, x, y + t - 1, BW[3]); if (x % 7 === 3) px(b, x, y + 1, BW[2]); if (x % 7 === 4) px(b, x + 1, y + 2, BW[2]); }
      disc(b, 3, 7, 2, 2, BW[2]); px(b, 3, 7, BW[3]); px(b, 2, 6, BW[0]);
      line(b, 22, 4, 27, 0, BW[2]); line(b, 23, 4, 28, 0, BW[1]); line(b, 12, 9, 9, 11, BW[3]);
      fill(b, 16, 6, 2, 2, BW[4]); px(b, 16, 6, BW[3]);
    });
    return { img: out.canvas(), ax: 19, ay: 12, shadow: [16, 3] };
  }
  /* fishRack(): a standalone drying rack hung with fish, 32 x 30. */
  function fishRack() {
    const out = inked(32, 30, b => rackOn(b, 1, 30));
    return { img: out.canvas(), ax: 17, ay: 31, base: [-14, 14], foot: 4, shadow: [14, 3] };
  }
  /* nets(): a heap of net with cork floats and a coil of rope beside it, 30 x 13. */
  /* saltHeaps(): salt raked up into two heaps at the end of a pan. */
  function saltHeaps() {
    const out = inked(30, 14, b => { saltHeap(b, 9, 14, 8, 10, 1); saltHeap(b, 22, 14, 6, 7, 2); });
    return { img: out.canvas(), ax: 16, ay: 15 };
  }
  /* catchCrates(): the day's catch landed at the jetty's foot, two crates of fish and a third on top. */
  function catchCrates() {
    const out = inked(34, 24, b => { fishCrate(b, 0, 24); fishCrate(b, 17, 24); fishCrate(b, 9, 13); });
    return { img: out.canvas(), ax: 18, ay: 25 };
  }
  function nets() {
    const out = inked(30, 13, b => { netHeap(b, 11, 13, 11, 6, 4); coil(b, 24, 11, 5); });
    return { img: out.canvas(), ax: 16, ay: 14, shadow: [14, 3] };
  }

  /* The harbour coffee stall by the jetty's foot: a little kiosk of bleached boards under a weathered-blue and white
     awning, the brass coffee pot on its charcoal brazier, cups and a jar of sugar on the counter, sacks of beans, the
     COFFEE board. Where the coast's mornings start, and its rumours. */
  function coffeeStall() {
    const W = 76, H = 66;
    const out = inked(W, H, b => {
      // the back boards and a shelf of tins and cups
      fill(b, 6, 22, 64, 18, BW[2]); for (let x = 11; x < 70; x += 6) fill(b, x, 22, 1, 18, BW[3]);
      fill(b, 6, 31, 64, 2, BW[1]); fill(b, 6, 33, 64, 1, BW[4]);
      for (const [x, c] of [[10, BL[2]], [15, 'brass2'], [20, BL[3]], [48, 'cream1'], [53, BL[2]], [58, 'brass2']]) { fill(b, x, 26, 4, 5, c); fill(b, x, 26, 4, 1, BW[0]); px(b, x, 27, 'white'); }
      for (const x of [26, 31, 36]) { fill(b, x, 28, 3, 3, 'cream0'); px(b, x + 3, 29, 'cream1'); }
      // posts and the counter
      for (const x of [3, 69]) { fill(b, x, 20, 4, 44, BW[2]); fill(b, x, 20, 1, 44, BW[1]); fill(b, x + 3, 20, 1, 44, BW[4]); }
      fill(b, 1, 38, 74, 4, BW[0]); fill(b, 1, 38, 74, 1, 'white'); fill(b, 1, 41, 74, 1, BW[2]);
      fill(b, 3, 42, 70, 18, BL[1]); for (let x = 9; x < 72; x += 6) fill(b, x, 44, 1, 14, BL[2]); fill(b, 3, 42, 70, 2, BL[2]); fill(b, 3, 58, 70, 2, BL[3]);
      // a painted cup on the counter front
      fill(b, 32, 47, 10, 6, 'cream0'); fill(b, 32, 47, 10, 1, 'white'); fill(b, 42, 48, 2, 3, 'cream1'); fill(b, 30, 53, 14, 1, 'cream2');
      for (const x of [34, 38]) { px(b, x, 44, 'cream0'); px(b, x + 1, 45, 'cream0'); }
      fill(b, 2, 60, 72, 6, BW[3]); fill(b, 2, 60, 72, 1, BW[2]);
      // the awning, weathered blue and white, scalloped at its front
      for (let y = 8; y < 22; y++) {
        const l = Math.round(6 - (y - 8) * 0.4), r = W - l;
        for (let x = l; x < r; x++) px(b, x, y, Math.floor((x - l) / (r - l) * 10) & 1 ? (y < 11 ? BL[1] : BL[2]) : y < 11 ? 'white' : BW[0]);
      }
      for (let k = 0; k < 10; k++) { const x0 = Math.round(k * W / 10), x1 = Math.round((k + 1) * W / 10); for (let j = 0; j < 4; j++) { const i = [0, 0, 1, 2][j]; fill(b, x0 + i, 22 + j, x1 - x0 - 2 * i, 1, k & 1 ? BL[3] : BW[1]); } }
      fill(b, 6, 7, 64, 2, BW[3]);
      // the board
      fill(b, 20, 0, 36, 8, BW[4]); fill(b, 21, 1, 34, 6, BW[0]);
      [[23, 'C'], [28, 'O'], [33, 'F'], [38, 'F'], [43, 'E'], [48, 'E']].forEach(([x, ch]) => {
        const G = { C: ['111', '1..', '111'], O: ['111', '1.1', '111'], F: ['111', '11.', '1..'], E: ['111', '11.', '111'] }[ch];
        G.forEach((r, j) => { for (let i = 0; i < 3; i++) if (r[i] === '1') px(b, x + i, 2 + j, BL[4]); });
      });
      // the brazier and its brass pot, cups and sugar on the counter
      fill(b, 54, 30, 12, 8, 'iron3'); fill(b, 54, 30, 12, 1, 'iron1'); fill(b, 56, 32, 8, 4, 'light3'); fill(b, 57, 33, 6, 2, 'light1');
      disc(b, 60, 26, 4, 3, 'brass2'); fill(b, 57, 28, 7, 1, 'brass3'); px(b, 59, 25, 'brass0'); line(b, 64, 25, 67, 22, 'brass3'); line(b, 56, 24, 55, 28, 'iron3');
      for (const x of [14, 21]) { fill(b, x, 34, 5, 4, 'cream0'); fill(b, x, 34, 5, 1, 'wood4'); px(b, x + 5, 35, 'cream1'); }
      fill(b, 40, 32, 6, 6, 'water0'); fill(b, 40, 32, 6, 1, BW[3]); fill(b, 41, 34, 4, 3, 'white');
      // sacks of beans by the posts
      for (const [x, y] of [[0, 52], [64, 52]]) { disc(b, x + 6, y + 7, 6, 6, 'dirt1'); fill(b, x + 2, y + 2, 8, 2, 'dirt2'); fill(b, x + 4, y + 7, 4, 2, 'wood4'); px(b, x + 5, y + 7, 'wood2'); }
    });
    return { img: out.canvas(), ax: (W >> 1) + 1, ay: H + 1, base: [-(W >> 1), W >> 1], foot: 12 };
  }
  /* A café table on the stall's terrace: a round top of bleached boards on one post, two cups and a saucer. */
  function cafeTable() {
    const out = inked(22, 18, b => {
      disc(b, 11, 5, 10, 4, BW[0]); fill(b, 2, 5, 19, 1, BW[1]); fill(b, 1, 7, 21, 2, BW[2]); fill(b, 9, 9, 4, 7, BW[3]); fill(b, 5, 16, 12, 2, BW[4]);
      for (const x of [5, 13]) { fill(b, x, 2, 4, 3, 'cream0'); fill(b, x, 2, 4, 1, 'wood4'); px(b, x + 4, 3, 'cream1'); }
    });
    return { img: out.canvas(), ax: 12, ay: 19, base: [-10, 10], foot: 4 };
  }
  /* Wild sea mint growing where the bluff meets the sea wind: a bushy clump of dark serrated leaves with little white
     and lilac flowers. seed: its shape. */
  function mintClump(seed = 1) {
    const r = rng(seed * 37 + 5), W = 28, H = 22;
    const out = inked(W, H, b => {
      // a mound of paired, serrated leaves, darker at its foot
      for (let k = 0; k < 22; k++) {
        const x = 2 + ((r() * (W - 6)) | 0), y = 8 + ((r() * (H - 10)) | 0), c = y > H - 6 ? 'leaf3' : k % 3 ? 'leaf2' : 'leaf1';
        fill(b, x, y, 3, 2, c); px(b, x + 3, y, c); px(b, x + 1, y - 1, 'leaf1'); px(b, x, y + 2, 'leaf4'); px(b, x + 2, y + 1, 'leaf3');
      }
      // flower spikes standing out of it, white and lilac whorls up a stem
      for (let k = 0; k < 5; k++) {
        const x = 4 + ((r() * (W - 8)) | 0), top = 1 + ((r() * 5) | 0), c = k & 1 ? 'white' : 'lilac';
        for (let y = top; y < top + 8; y++) px(b, x, y, 'leaf3');
        for (let y = top; y < top + 6; y += 2) { px(b, x - 1, y, c); px(b, x + 1, y, c); px(b, x, y, k & 1 ? 'lilac' : 'white'); }
      }
    });
    return { img: out.canvas(), ax: W >> 1, ay: H };
  }

  Object.assign(VIL, { jetty, boat, rowboat, lighthouse, saltStore, arloHome, theoStudio, ropeBridgeRemains, rockStack, coffeeStall, cafeTable, mintClump, beachProps: { shell, driftwood, fishRack, nets, saltHeaps, catchCrates } });
})();
