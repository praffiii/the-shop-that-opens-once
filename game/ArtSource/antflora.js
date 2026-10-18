'use strict';
/* Plants of the ant planet, at ant scale: trees of several species, and the everyday plants that tower over the ants
   (clover, dandelions, ferns, grass blades), mushrooms and reeds. Lit from the top-left in flat, stepped bands.

   Every plant returns a sprite: { img, ax, ay, foot, r } where (ax, ay) is the pixel at its foot centre, foot is how
   many rows above ay are solid to walk into, and r its trunk's or stem's half width on the ground. Swaying plants also
   return frames (img is frames[0]). Builds on KIT (kit.js), PX (px.js) and ANT (antkit.js). */
(() => {
  const K = KIT, { Buf, u32, vnoise, scatter } = K, rng = PX.rng, M = ANT.M;
  const ramp = keys => keys.map(K.hex);
  // Leaf ramps, light to dark, 6 steps (ART.md rule 4: hue-shifted from PX.PAL's leaf and grass).
  const LEAF = {
    green: ramp(['leaf0', 'leaf1', 'leaf2', 'leaf3', 'leaf4', 'leaf5']),
    deep: ramp(['leaf1', 'leaf2', 'leaf3', 'leaf4', 'leaf5', 'leaf6']),
    lime: ramp(['grass0', 'grass1', 'grass2', 'grass3', 'grass4', 'grass5']),
    teal: ['#c9f2c4', '#8fd9a8', '#5cbd8e', '#3f9a7c', '#2e7468', '#21524f'],
    autumn: M.autumn,
    blossom: ['#fff0f6', '#ffd1e6', '#ffadd2', '#f185b8', '#c86495', '#8f4a78'],
  };
  const sprite = (b, ax, ay, foot, r, more) => ({ img: b.canvas(), ax, ay, foot, r, ...more });

  /* ---------- pixel strokes ---------- */
  // Stamp a round brush of radius r (in px) at each point of a polyline sampled every half pixel. color(x, y, t, side)
  // picks the colour; side is -1 on the brush's upper-left edge, 1 on its lower-right, 0 inside.
  function stroke(b, pts, r, color) {
    const seen = new Set();
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      for (let s = 0; s <= n; s++) {
        const t = (i + s / n) / (pts.length - 1), cx = x0 + ((x1 - x0) * s) / n, cy = y0 + ((y1 - y0) * s) / n, rr = typeof r === 'function' ? r(t) : r;
        for (let y = Math.floor(cy - rr); y <= cy + rr; y++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
          if (dx * dx + dy * dy > rr * rr + 0.25) continue;
          const k = y * 4096 + x; if (seen.has(k)) continue; seen.add(k);
          const e = dx * 0.7 + dy * 0.7;
          b.set(x, y, color(x, y, t, rr < 1.2 ? 0 : e < -rr * 0.45 ? -1 : e > rr * 0.45 ? 1 : 0));
        }
      }
    }
  }
  // Points along a quadratic curve from a through control c to b.
  const curve = (a, c, b2, n = 24) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b2[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b2[1]];
  });
  // Fill a closed outline (a polygon of points) with color(x, y).
  function fillPoly(b, pts, color) {
    const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const xs = [], yy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) b.set(x, y, color(x, y));
    }
  }
  // A 1px outline in c around everything opaque in b (selective: only where the neighbour is empty).
  function outline(b, c) {
    const v = u32(K.hex(c)), w = b.w, h = b.h, d = b.d, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[y * w + x]) continue;
      if ((x > 0 && d[y * w + x - 1]) || (x < w - 1 && d[y * w + x + 1]) || (y > 0 && d[(y - 1) * w + x]) || (y < h - 1 && d[(y + 1) * w + x])) add.push(y * w + x);
    }
    for (const i of add) d[i] = v;
  }

  /* ---------- trees ---------- */
  // A trunk with roots: bark ramp, lit on the left, a root flare at the foot.
  function trunk(b, cx, top, base, w, bark = M.bark, seed = 1) {
    const rnd = rng(seed);
    for (let y = top; y <= base; y++) {
      const flare = Math.max(0, y - (base - 6)), hw = w / 2 + flare * 0.9;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw) - 1; x++) {
        const u = (x + 0.5 - (cx - hw)) / (2 * hw);
        b.set(x, y, u < 0.12 ? bark[4] : u < 0.38 ? bark[1] : u < 0.72 ? bark[2] : u < 0.9 ? bark[3] : bark[4]);
      }
    }
    for (let i = 0; i < w; i++) { const x = Math.round(cx - w / 2 + 2 + rnd() * (w - 4)), y = top + 3 + Math.floor(rnd() * Math.max(1, base - top - 8)); b.set(x, y, bark[3]); b.set(x, y + 1, bark[3]); b.set(x, y + 2, bark[4]); }
  }
  // A broadleaf: a lumpy canopy of shaded clumps over a trunk. o: { seed, rx, ry, th (trunk height), tw, leaf, bark, fruit }.
  function broadleaf(o) {
    const { seed = 1, rx = 34, ry = 26, th = 22, tw = 8, leaf = LEAF.green, bark = M.bark, fruit, sway } = o;
    const clumps = roundCanopyEx(seed, rx, ry, Math.max(6, rx / 5), Math.max(9, rx / 3.2)), pad = 14;
    const w = Math.ceil(2 * (rx + pad)), cy = ry + pad, h = Math.ceil(cy + ry * 0.7 + th + 6), cx = w / 2;
    const frames = [];
    for (const s of sway ? [0, 1] : [0]) {
      const b = new Buf(w, h);
      trunk(b, cx, Math.round(cy + ry * 0.35), h - 4, tw, bark, seed);
      K.paintClumps(b, clumps, leaf, cx, cy, s, -ry * 0.2);
      K.leafMarks(b, seed + 3, leaf, [0, 0, w, Math.round(cy + ry)]);
      if (fruit) for (const [x, y] of scatter(seed + 5, 7, [0, 0, w, cy + ry * 0.5], (x, y) => b.get(x, y) === u32(leaf[2]) || b.get(x, y) === u32(leaf[3]))) {
        b.set(x, y, fruit[0]); b.set(x + 1, y, fruit[1]); b.set(x, y + 1, fruit[1]); b.set(x + 1, y + 1, fruit[2]);
      }
      frames.push(b.canvas());
    }
    return { img: frames[0], frames, ax: Math.round(cx), ay: h - 4, foot: 4, r: tw / 2 + 2 };
  }
  // Canopy clumps filling an ellipse, smaller at the top; the lower right ones a tone darker.
  function roundCanopyEx(seed, rx, ry, rMin, rMax) {
    const rnd = rng(seed), out = [], step = (rMin + rMax) * 0.55;
    for (let y = -ry + rMin; y <= ry - rMin * 0.5; y += step) {
      const hw = rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)), r0 = rMin + (rMax - rMin) * (0.35 + (0.65 * (y + ry)) / (2 * ry));
      const n = Math.max(1, Math.round((2 * hw) / (r0 * 1.25)));
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1, x = t * Math.max(0, hw - r0 * 0.75) + (rnd() - 0.5) * 4;
        out.push([x, y + (rnd() - 0.5) * 4, r0 * (0.85 + rnd() * 0.3), rnd() * 6.28, x > rx * 0.3 && y > ry * 0.2 ? 1 : 0]);
      }
    }
    return out.sort((a, b) => a[1] - b[1]);
  }
  // A poplar: a tall narrow flame of small clumps.
  const poplar = o => broadleaf({ rx: 15, ry: 44, th: 14, tw: 6, leaf: LEAF.deep, ...o });
  // A birch: a pale trunk with dark dashes and an airy canopy of loose lime clumps.
  function birch(o) {
    const { seed = 1, h: H0 = 120 } = o, rnd = rng(seed), pad = 16, rx = 26, w = 2 * (rx + pad), h = H0 + 8, cx = w / 2, base = h - 4;
    const b = new Buf(w, h), birchBark = ['#ffffff', '#f2eee8', '#d9d4e2', '#b3adc4', '#6b6478', '#463f52'];
    trunk(b, cx, Math.round(H0 * 0.3), base, 5, birchBark, seed);
    for (let y = Math.round(H0 * 0.3) + 4; y < base - 4; y += 5 + Math.floor(rnd() * 5)) { const x = Math.round(cx - 2 + rnd() * 3); b.set(x, y, '#463f52'); b.set(x + 1, y, '#463f52'); b.set(x + 1, y + 1, '#6b6478'); }
    // two side branches
    for (const s of [-1, 1]) stroke(b, curve([cx, H0 * 0.62], [cx + s * 8, H0 * 0.5], [cx + s * 16, H0 * 0.36]), 1, () => '#b3adc4');
    const clumps = [];
    for (let i = 0; i < 11; i++) { const a = rnd() * Math.PI * 2, d = 0.3 + rnd() * 0.7; clumps.push([Math.cos(a) * rx * d, -H0 * 0.66 + Math.sin(a) * H0 * 0.24 * d, 7 + rnd() * 4, rnd() * 6, Math.cos(a) * d > 0.3 ? 1 : 0]); }
    clumps.sort((p, q) => p[1] - q[1]);
    K.paintClumps(b, clumps, LEAF.lime, cx, base, 0, -1e9);
    K.leafMarks(b, seed + 2, LEAF.lime, [0, 0, w, base - H0 * 0.35]);
    return sprite(b, Math.round(cx), base, 4, 4);
  }
  // A pine: tiers of drooping skirts, dark teal-green, lit from the left.
  function pine(o) {
    const { seed = 1, h: H0 = 130, wid = 70 } = o, w = wid + 12, h = H0 + 8, cx = w / 2, base = h - 4, b = new Buf(w, h), rnd = rng(seed);
    trunk(b, cx, base - 16, base, 7, M.bark, seed);
    const tiers = Math.max(4, Math.round(H0 / 22)), P = LEAF.teal;
    for (let i = 0; i < tiers; i++) {
      const top = 2 + (i * (H0 - 26)) / tiers, bot = top + (H0 - 20) / tiers + 12, hw = (wid / 2) * (0.3 + (0.7 * (i + 1)) / tiers);
      fillPoly(b, [[cx, top], [cx - hw, bot], [cx - hw * 0.5, bot - 3], [cx, bot + 1], [cx + hw * 0.5, bot - 3], [cx + hw, bot]], (x, y) => {
        const u = (x + 0.5 - cx) / hw, v = (y - top) / (bot - top);
        return u < -0.45 + v * 0.2 ? P[1] : u < 0.05 ? P[2] : u < 0.55 ? P[3] : P[4];
      });
      for (let k = 0; k < hw / 3; k++) { const x = Math.round(cx - hw * 0.85 + rnd() * hw * 1.7), y = Math.round(top + (bot - top) * (0.35 + rnd() * 0.55)); if (b.get(x, y) && b.get(x, y + 3)) { const c = P[x < cx - hw * 0.2 ? 1 : x < cx + hw * 0.3 ? 2 : 4]; b.set(x, y, c); b.set(x + 1, y + 1, c); b.set(x - 1, y + 1, c); b.set(x, y + 2, P[x < cx ? 2 : 4]); } }
      for (let x = Math.round(cx - hw) + 2; x < cx + hw - 1; x += 3) { const y = Math.round(bot - Math.abs(x - cx) / hw * 3); if (b.get(x, y - 1)) { b.set(x, y, P[x < cx ? 3 : 4]); b.set(x, y + 1, P[4]); } }
      for (let x = Math.round(cx - hw); x <= cx + hw; x++) for (let y = Math.round(bot) + 1; y > bot - 3; y--) if (b.get(x, y) && !b.get(x, y + 1)) { b.set(x, y, P[5]); break; }
    }
    outline(b, P[5]);
    return sprite(b, Math.round(cx), base, 4, 4);
  }
  // A willow: a domed crown with long strands hanging down to the ground.
  function willow(o) {
    const { seed = 1, rx = 40 } = o, rnd = rng(seed), pad = 10, w = 2 * (rx + pad), h = 118, cx = w / 2, base = h - 4, b = new Buf(w, h), P = LEAF.lime;
    trunk(b, cx, 50, base, 9, M.bark, seed);
    const clumps = roundCanopyEx(seed, rx * 0.8, 24, 7, 11);
    K.paintClumps(b, clumps, P, cx, 36, 0, -1e9);
    for (let i = 0; i < 15; i++) {
      const x0 = cx - rx + 4 + (i / 14) * (rx * 2 - 8) + (rnd() - 0.5) * 4, y0 = 34 + 16 * Math.sqrt(Math.max(0, 1 - ((x0 - cx) / rx) ** 2)), len = 30 + rnd() * 34;
      const lit = x0 < cx - rx * 0.1, pts = curve([x0, y0 - 6], [x0 + (x0 - cx) * 0.14, y0 + len * 0.5], [x0 + (x0 - cx) * 0.08 + (rnd() - 0.5) * 4, y0 + len]);
      stroke(b, pts, t => 2.4 - t * 1.2, (x, y, t, s) => s < 0 ? (lit ? P[1] : P[2]) : s > 0 ? P[4] : lit ? P[2] : P[3]);
      for (let k = 4; k < pts.length; k += 3) { const [px, py] = pts[k], d = (k & 1 ? 1 : -1) * 2; b.set(px + d, py, lit ? P[1] : P[2]); b.set(px + d, py + 1, P[3]); b.set(px + d * 1.5, py + 1, P[4]); }
    }
    K.paintClumps(b, roundCanopyEx(seed + 1, rx * 0.55, 14, 6, 9), P, cx - 4, 30, 0, -1e9);
    outline(b, P[5]);
    K.leafMarks(b, seed + 1, P, [0, 0, w, 60]);
    return sprite(b, Math.round(cx), base, 4, 5);
  }

  /* ---------- the towering everyday plants ---------- */
  const STEM = ['#d8f28a', '#a8dc63', '#7cc152', '#57a148', '#3e7f45'];
  function stem(b, pts, r = 1.6) { stroke(b, pts, r, (x, y, t, s) => (s < 0 ? STEM[1] : s > 0 ? STEM[4] : STEM[2])); }
  // A heart-shaped clover leaflet pointing at angle a (radians, 0 = right), from (x, y), length L; a pale chevron on it.
  function leaflet(b, x, y, a, L, P) {
    const ca = Math.cos(a), sa = Math.sin(a), out = [];
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * Math.PI * 2, hx = 16 * Math.sin(t) ** 3, hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const u = (hy + 17) / 30, v = hx / 30;                       // u: 0 at the stalk, 1 at the notch
      out.push([x + (u * ca - v * sa) * L * 1.05, y + (u * sa + v * ca) * L * 0.62]);
    }
    fillPoly(b, out, (px, py) => {
      const dx = px + 0.5 - x, dy = (py + 0.5 - y) / 0.62, u = (dx * ca + dy * sa) / L, v = (-dx * sa + dy * ca) / L;
      const chevron = Math.abs(u - 0.55 - Math.abs(v) * 0.9) < 0.07 && Math.abs(v) < 0.42;
      if (chevron) return P[0];
      const lit = -v * sa * 0.6 - u * 0.1 + (dy < 0 ? 0.25 : -0.05) - dx / (L * 6);
      return Math.abs(v) < 0.04 ? P[2] : lit > 0.18 ? P[1] : lit > -0.12 ? P[2] : P[3];
    });
  }
  // A clover plant as tall as a house: a curving stalk and three heart leaflets seen from above-front.
  function clover(o) {
    const { seed = 1, h: H0 = 150, flower = false } = o, rnd = rng(seed), L = 30 + H0 * 0.08, w = Math.round(L * 4 + 20), h = H0 + 30, cx = w / 2, base = h - 4;
    const b = new Buf(w, h), P = ['#c9f0a2', '#86cf6a', '#5cae55', '#3f8a4c', '#2c6646'], lean = (rnd() - 0.5) * 18, top = [cx + lean, base - H0 + L * 0.5];
    stem(b, curve([cx, base], [cx - lean * 0.4, base - H0 * 0.5], top), 1.8);
    if (flower) { // a white clover flower ball on its own stalk
      const fx = cx - lean - 16, fy = base - H0 * 0.62;
      stem(b, curve([cx + 2, base], [cx - 6, base - H0 * 0.3], [fx, fy + 8]), 1.3);
      for (let i = 0; i < 70; i++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 9, px = Math.round(fx + Math.cos(a) * d), py = Math.round(fy + Math.sin(a) * d * 0.9); b.set(px, py, Math.sin(a) > 0.3 ? '#f1d9e8' : d < 5 && Math.cos(a) < 0 ? '#ffffff' : '#fbf0f6'); b.set(px, py + 1, '#e3c0d6'); }
    }
    for (const [k, a] of [[0, -Math.PI / 2 - 0.15], [1, Math.PI * 0.95], [2, 0.05]].sort((p, q) => Math.sin(p[1]) - Math.sin(q[1]))) leaflet(b, top[0], top[1], a + (rnd() - 0.5) * 0.25, L, P);
    outline(b, P[4]);
    return sprite(b, Math.round(cx), base, 3, 2);
  }
  // A dandelion: a tall hollow stalk, and either a shaggy yellow flower head or a white seed clock.
  function dandelion(o) {
    const { seed = 1, h: H0 = 180, clock = false } = o, rnd = rng(seed), R = clock ? 22 : 18, w = 2 * R + 40, h = H0 + R + 10, cx = w / 2, base = h - 4;
    const b = new Buf(w, h), lean = (rnd() - 0.5) * 14, hx = cx + lean, hy = base - H0;
    // jagged basal leaves
    for (const s of [-1, 1]) stroke(b, curve([cx, base], [cx + s * 10, base - 14], [cx + s * 22, base - 6]), t => 3.2 * (1 - t) + 0.6, (x, y, t, e) => (e < 0 ? STEM[1] : e > 0 ? STEM[4] : (x + y) % 5 ? STEM[2] : STEM[3]));
    const head = new Buf(w, h);
    if (!clock) {
      // the head seen a little from below: green sepals, then rings of petals, darker towards the centre's underside
      for (let i = 0; i < 9; i++) { const a = Math.PI * (0.15 + 0.7 * (i / 8)); stroke(head, [[hx, hy + 4], [hx + Math.cos(a) * 9, hy + 4 + Math.sin(a) * 7]], 1, () => STEM[3]); }
      const Y = ['#fff7b0', '#ffe066', '#ffcc3d', '#f5a623', '#d9822b'];
      for (let ring = 0; ring < 4; ring++) {
        const rr = R - ring * 4.2, n = 22 - ring * 4;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + ring * 0.4, px = hx + Math.cos(a) * rr, py = hy + Math.sin(a) * rr * 0.7;
          stroke(head, [[hx + Math.cos(a) * rr * 0.45, hy + Math.sin(a) * rr * 0.32], [px, py]], 1.4, () => {
            const lit = -Math.cos(a) * 0.6 - Math.sin(a) * 0.7;
            return ring === 3 ? Y[3] : lit > 0.35 ? Y[0] : lit > -0.2 ? Y[1] : Y[2];
          });
        }
      }
      for (let i = 0; i < 18; i++) { const a = rnd() * 6.28, d = rnd() * R * 0.8; const px = Math.round(hx + Math.cos(a) * d), py = Math.round(hy + Math.sin(a) * d * 0.7); if (head.get(px, py) === u32(Y[1])) { head.set(px, py, Y[2]); head.set(px + 1, py, Y[2]); } }
      outline(head, Y[4]);
    } else {
      // the seed clock: a sphere of fine white parachutes, shaded lilac on its lower right
      const G = ['#ffffff', '#f4f2fb', '#dcd8ee', '#b8b2d6'];
      for (let i = 0; i < 260; i++) {
        const a = rnd() * Math.PI * 2, z = rnd() * 2 - 1, rr = Math.sqrt(1 - z * z), dx = Math.cos(a) * rr, dy = Math.sin(a) * rr, px = Math.round(hx + dx * R), py = Math.round(hy + dy * R * 0.95);
        const lit = -dx * 0.55 - dy * 0.62 + z * 0.56;
        stroke(head, [[hx + dx * R * 0.4, hy + dy * R * 0.38], [px, py]], 0.5, () => (lit > 0.35 ? G[1] : lit > -0.2 ? G[2] : G[3]));
        head.set(px, py, lit > 0.2 ? G[0] : G[2]);
      }
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) head.set(hx + x, hy + y, x + y < 0 ? '#c9b98f' : '#a8996f');
    }
    stem(b, curve([cx, base], [cx + lean * 0.2, base - H0 * 0.5], [hx, hy + R * 0.5]), 2.1);
    outline(b, STEM[4]);
    b.d.forEach((v, i) => { if (head.d[i]) b.d[i] = head.d[i]; });
    return sprite(b, Math.round(cx), base, 3, 2);
  }
  // A fern: arching fronds from the ground, each a midrib with paired leaflets, curling at the tip.
  function fern(o) {
    const { seed = 1, size = 70 } = o, rnd = rng(seed), w = size * 2 + 30, h = Math.round(size * 1.1) + 12, cx = w / 2, base = h - 4, b = new Buf(w, h);
    const P = LEAF.green, fronds = [];
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i / 6 - 0.5) * 2.4 + (rnd() - 0.5) * 0.2; fronds.push([a, size * (0.65 + rnd() * 0.35)]); }
    fronds.sort((p, q) => Math.abs(q[0] + Math.PI / 2) - Math.abs(p[0] + Math.PI / 2));    // outer fronds first, centre on top
    for (const [a, L] of fronds) {
      const tip = [cx + Math.cos(a) * L, base + Math.sin(a) * L * 0.85], ctrl = [cx + Math.cos(a) * L * 0.5, base + Math.sin(a) * L * 0.85 - L * 0.35];
      const rib = curve([cx, base], ctrl, tip, 30), lit = Math.cos(a) < 0.1;
      for (let k = 3; k < rib.length - 1; k++) {
        if (k % 2) continue;
        const [x0, y0] = rib[k], [x1, y1] = rib[k + 1], dx = x1 - x0, dy = y1 - y0, n = Math.hypot(dx, dy) || 1, len = 8 * Math.sin((Math.PI * (k + 2)) / (rib.length + 3));
        for (const s of [-1, 1]) {
          const nx = (-dy / n) * s, ny = (dx / n) * s;
          stroke(b, [[x0, y0], [x0 + nx * len + dx / n * 3, y0 + ny * len * 0.8 + dy / n * 3 + 1.5]], t => 1.3 * (1 - t) + 0.5, (x, y, t, e) => (e < 0 ? P[lit ? 0 : 1] : ny < 0 ? P[lit ? 1 : 2] : P[3]));
        }
      }
      stroke(b, rib, 0.8, () => P[3]);
    }
    outline(b, P[5]);
    return sprite(b, Math.round(cx), base, 3, 6);
  }
  // A clump of grass blades taller than an ant, two-toned, leaning and bending.
  function blades(o) {
    const { seed = 1, h: H0 = 70, n = 5, tone = 'green' } = o, rnd = rng(seed), w = 60, h = H0 + 8, cx = w / 2, base = h - 4, b = new Buf(w, h);
    const P = tone === 'gold' ? ['#fff3b8', '#f2d77a', '#d9b45a', '#b08a44', '#7d6232'] : ['#e7f59a', '#b6e36b', '#86cc55', '#5aac4c', '#3d8a4a'];
    const list = Array.from({ length: n }, (_, i) => [(i / (n - 1) - 0.5) * 16 + (rnd() - 0.5) * 4, H0 * (0.55 + rnd() * 0.45), (rnd() - 0.5) * 30]);
    list.sort((p, q) => q[1] - p[1]);
    for (const [dx, L, bend] of list) {
      const pts = curve([cx + dx, base], [cx + dx + bend * 0.2, base - L * 0.6], [cx + dx + bend, base - L]);
      stroke(b, pts, t => 2.6 * (1 - t) + 0.5, (x, y, t, e) => (e < 0 ? P[t > 0.6 ? 0 : 1] : e > 0 ? P[3] : P[2]));
    }
    outline(b, P[4]);
    return sprite(b, Math.round(cx), base, 2, 4);
  }

  /* ---------- small plants (on the ground, around props) ---------- */
  const SHROOM = {
    red: [['#ff9a8a', '#f2665a', '#d9483b', '#a8333a'], true],
    brown: [['#f2cf9a', '#d9a066', '#b07845', '#7d5233'], false],
    lilac: [['#ead9ff', '#c9b0f2', '#a588d9', '#7d66b5'], false],
    gold: [['#fff0a8', '#ffd25a', '#f2a93d', '#c47a2b'], true],
  };
  // A cluster of n mushrooms of one kind, the tallest at the back; h is the tallest's height.
  function mushrooms(o) {
    const { seed = 1, kind = 'brown', n = 3, h: H0 = 18 } = o, rnd = rng(seed), [C, spots] = SHROOM[kind], w = H0 * 3 + 20, h = H0 + 12, b = new Buf(w, h), base = h - 3;
    const list = Array.from({ length: n }, (_, i) => [w / 2 + (i - (n - 1) / 2) * H0 * 0.7 + (rnd() - 0.5) * 4, H0 * (i === 0 ? 1 : 0.5 + rnd() * 0.4), base - (i ? 0 : 2) + Math.round(rnd() * 2)]);
    list.sort((p, q) => p[2] - q[2]);
    for (const [x, hh, y] of list) {
      const r = Math.max(3, hh * 0.42), cy = y - hh + r * 0.5;
      for (let j = Math.round(cy); j <= y; j++) for (let i = -Math.ceil(r * 0.28); i <= Math.ceil(r * 0.28); i++) b.set(Math.round(x) + i, j, i < 0 ? '#fffaf0' : i > 0 ? '#e3cfa6' : '#f5e6c8');
      for (let j = -Math.ceil(r * 0.8); j <= 1; j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) {
        if ((i / r) ** 2 + (j / (r * 0.8)) ** 2 > 1 && j <= 0) continue; if (j > 0 && Math.abs(i) > r - 1) continue;
        const px = Math.round(x) + i, py = Math.round(cy) + j;
        b.set(px, py, j > 0 ? '#c9b48a' : i + j < -r * 0.7 ? C[0] : i - j > r * 0.6 ? C[3] : i > r * 0.1 ? C[2] : C[1]);
      }
      if (spots) for (const [sx, sy] of [[-0.4, -0.45], [0.25, -0.6], [0.5, -0.15]]) { const px = Math.round(x + sx * r), py = Math.round(cy + sy * r * 0.8); b.set(px, py, '#ffffff'); if (r > 5) b.set(px + 1, py, '#f5e6c8'); }
    }
    outline(b, C[3]);
    return sprite(b, w >> 1, base, 2, H0 * 0.6);
  }
  // Reeds and cattails at the water's edge.
  function reeds(o) {
    const { seed = 1, h: H0 = 50, n = 7 } = o, rnd = rng(seed), w = 50, h = H0 + 12, cx = w / 2, base = h - 3, b = new Buf(w, h), P = ['#e7f59a', '#a8dc63', '#7cc152', '#4f9a4a', '#346b40'];
    for (let i = 0; i < n; i++) {
      const dx = (i / (n - 1) - 0.5) * 20 + (rnd() - 0.5) * 4, L = H0 * (0.6 + rnd() * 0.4), bend = (rnd() - 0.5) * 16, pts = curve([cx + dx, base], [cx + dx, base - L * 0.6], [cx + dx + bend, base - L]);
      stroke(b, pts, t => 1.4 * (1 - t) + 0.5, (x, y, t, e) => (e < 0 ? P[1] : e > 0 ? P[3] : P[2]));
      if (i % 3 === 1) { const [tx, ty] = pts[Math.round(pts.length * 0.75)]; for (let j = 0; j < 9; j++) { b.set(Math.round(tx) - 1, Math.round(ty) - 4 + j, j < 2 ? '#c98a5a' : '#8a5233'); b.set(Math.round(tx), Math.round(ty) - 4 + j, j < 3 ? '#a8673d' : '#6b3c28'); b.set(Math.round(tx) + 1, Math.round(ty) - 4 + j, '#5a3122'); } }
    }
    outline(b, P[4]);
    return sprite(b, Math.round(cx), base, 2, 10);
  }

  /* ---------- what reads as "small" next to an ant ---------- */
  const { shadeOf, band } = ANT;
  // A horsetail: a jointed green stem with whorls of needles at every joint, shorter towards the top, and a spore
  // cone on top. To an ant it is a pine. o: { seed, h }.
  function horsetail(o) {
    const { seed = 1, h: H0 = 110 } = o, rnd = rng(seed), w = Math.round(H0 * 0.55) + 16, h = H0 + 10, cx = w / 2, base = h - 4, b = new Buf(w, h);
    const P = ['#d8f28a', '#a8dc63', '#7cc152', '#57a148', '#3e7f45', '#2c5e3f'], lean = (rnd() - 0.5) * 8, gap = 9 + Math.round(H0 / 40);
    const at = y => cx + lean * (1 - (y - (base - H0)) / H0);                                  // the stem leans towards its top
    for (let y = base - H0 + 12; y < base - 6; y += gap) {                                       // whorls, from the top down
      const k = (y - (base - H0)) / H0, L = 6 + k * H0 * 0.24;
      for (let n = 0; n < 7; n++) {
        const a = Math.PI * (0.12 + (n / 6) * 0.76), sx = Math.cos(a), back = n % 2 === 0;
        const tip = [at(y) + sx * L * 1.1, y + 4 + Math.sin(a) * 2 + L * 0.35];
        stroke(b, curve([at(y), y], [at(y) + sx * L * 0.6, y - 1], tip, 10), 0.7, () => (back ? P[3] : sx < 0 ? P[1] : P[2]));
      }
    }
    for (let y = base - H0 + 8; y <= base; y++) {                                               // the jointed stem
      const x = Math.round(at(y)), node = (y - (base - H0)) % gap === 0;
      for (let i = -2; i <= 1; i++) b.set(x + i, y, node ? (i < 0 ? '#3a2b28' : '#5a4436') : i < -1 ? P[1] : i < 0 ? P[2] : P[3]);
    }
    for (let j = 0; j < 9; j++) for (let i = -2; i <= 2; i++) if (Math.abs(i) <= 2 - (j < 3 ? 1 : 0) - (j > 6 ? 1 : 0)) b.set(Math.round(at(base - H0)) + i, base - H0 + j, i < 0 ? '#c99a6a' : (j + i) % 3 ? '#a8774a' : '#7d5233');
    outline(b, P[5]);
    return sprite(b, Math.round(cx), base, 3, 3);
  }
  // A moss cushion: a soft dome of tiny star-shaped shoots, with spore stalks standing out of it. o: { seed, rx, ry }.
  function mossMound(o) {
    const { seed = 1, rx = 30, ry = 20 } = o, rnd = rng(seed), w = rx * 2 + 10, h = ry + 30, cx = w / 2, base = h - 4, b = new Buf(w, h), P = M.moss;
    for (let y = base - ry; y <= base; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - base) / ry, lump = 0.06 * Math.sin(nx * 9 + seed) + 0.05 * vnoise(x / 4, y / 4, seed);
      if (nx * nx + ny * ny > 1 + lump) continue;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), s = shadeOf(nx, ny * 0.8, nz) + (vnoise(x / 3, y / 2.5, seed + 1) - 0.5) * 0.3;
      b.set(x, y, P[band(s, 1, 5)]);
    }
    for (const [x, y, q] of scatter(seed + 2, 4, [0, 0, w, h], (x, y) => b.get(x, y) && b.get(x, y + 2))) {   // star shoots
      const c = q < 0.5 ? P[0] : P[1]; if (x > cx + rx * 0.3 && q < 0.7) continue;
      b.set(x, y, c); b.set(x - 1, y, c); b.set(x + 1, y, c); b.set(x, y - 1, c); b.set(x, y + 1, P[3]);
    }
    for (let n = 0; n < 4 + (rnd() * 4 | 0); n++) {                                             // spore stalks
      const x = Math.round(cx + (rnd() - 0.5) * rx * 1.2), y0 = Math.round(base - ry * (0.5 + rnd() * 0.4)), L = 10 + (rnd() * 12 | 0);
      for (let j = 0; j < L; j++) b.set(x + (j > L * 0.7 ? 1 : 0), y0 - j, j < L - 3 ? '#b5653f' : '#8a4a33');
      b.set(x + 1, y0 - L, '#d98a5c'); b.set(x + 2, y0 - L, '#8a4a33'); b.set(x + 1, y0 - L - 1, '#f3b58a');
    }
    outline(b, P[5]);
    return sprite(b, Math.round(cx), base, Math.round(ry * 0.4), rx);
  }
  // A seedling: a curved green stem with its first two round leaves, the split seed husk still at its foot. o: { seed, h }.
  function sprout(o) {
    const { seed = 1, h: H0 = 60 } = o, rnd = rng(seed), L = 12 + H0 * 0.22, w = Math.round(L * 4.4), h = H0 + 22, cx = w / 2, base = h - 4, b = new Buf(w, h);
    const P = ['#e6f7a8', '#b6e36b', '#86cc55', '#5aac4c', '#3d8a4a', '#2c6448'], lean = (rnd() - 0.5) * 14, top = [cx + lean, base - H0];
    stem(b, curve([cx, base], [cx - lean, base - H0 * 0.5], top), 2.2);
    for (const side of [-1, 1]) {                                                              // the two seed leaves
      const ox = top[0] + side * 2, out = [];
      for (let i = 0; i <= 30; i++) { const t = (i / 30) * Math.PI * 2; out.push([ox + side * (L + Math.cos(t) * L), top[1] - 4 + Math.sin(t) * L * 0.42 - side * Math.cos(t) * 3]); }
      fillPoly(b, out, (x, y) => { const u = (x + 0.5 - ox) * side / (2 * L), v = (y + 0.5 - (top[1] - 4)) / (L * 0.42); return Math.abs(v + u * 0.1) < 0.08 && u > 0.1 && u < 0.85 ? P[2] : v < -0.25 ? P[side < 0 ? 0 : 1] : v < 0.35 ? P[side < 0 ? 1 : 2] : P[3]; });
    }
    for (const [dx, c] of [[-6, '#b07438'], [3, '#d99a4e']]) for (let j = 0; j < 5; j++) for (let i = 0; i < 6 - j; i++) b.set(Math.round(cx + dx + i), base - j, j === 0 ? '#7d4f2a' : c);
    outline(b, P[5]);
    return sprite(b, Math.round(cx), base, 3, 3);
  }
  // A pebble: to an ant, a boulder. Smooth, banded by the light, with lichen. o: { seed, rx, ry, tone: 'grey'|'warm'|'slate' }.
  function pebble(o) {
    const { seed = 1, rx = 22, ry = 14, tone = 'grey' } = o, rnd = rng(seed), w = rx * 2 + 6, h = ry * 2 + 8, cx = w / 2, cy = h / 2, b = new Buf(w, h);
    const P = { grey: ['#f1f0f4', '#d4d2dd', '#b2b0c2', '#8f8ca4', '#6c6984', '#4c4a63'], warm: ['#f6ebdc', '#e2cfb8', '#c6ad94', '#a28a76', '#7a6659', '#54463f'], slate: ['#dfe6ea', '#b8c6cf', '#91a4b2', '#6d8293', '#506273', '#384656'] }[tone];
    const sq = 0.15 + rnd() * 0.2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry * (1 + sq * nx), r2 = nx * nx + ny * ny; if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2), s = shadeOf(nx, ny, nz) + (vnoise(x / 5, y / 4, seed) - 0.5) * 0.15;
      b.set(x, y, nx < -0.1 && ny < -0.35 && r2 < 0.5 && s < 0.25 ? P[0] : P[band(s, 1, 5)]);
    }
    for (const [x, y, q] of scatter(seed + 3, 5, [0, 0, w, h * 0.6], (x, y) => b.get(x, y) && b.get(x + 2, y + 1) && b.get(x, y + 2))) if (q < 0.35) { b.set(x, y, '#c7d27a'); b.set(x + 1, y, '#a9b55e'); b.set(x, y + 1, '#a9b55e'); }
    outline(b, P[5]);
    return sprite(b, Math.round(cx), Math.round(cy + ry * 0.8), Math.round(ry * 0.9), rx);
  }
  // A fallen leaf lying on the ground, painted straight into a ground Buf: a pointed blade with its midrib and veins.
  // o: { seed, L (length), a (angle), tone: 'green'|'autumn'|'brown' }.
  function fallenLeaf(b, x, y, o) {
    const { seed = 1, L = 60, a = 0, tone = 'autumn' } = o, ca = Math.cos(a), sa = Math.sin(a), W2 = L * 0.24;
    const P = { green: ['#b6e36b', '#86cc55', '#5aac4c', '#3d8a4a'], autumn: ['#ffc965', '#f59e42', '#d9722f', '#a8502a'], brown: ['#d9b48a', '#b48d66', '#8f6a4c', '#6b4c3a'] }[tone];
    for (let j = -L; j <= L; j++) for (let i = -L; i <= L; i++) {
      const u = (i * ca + j * sa) / L, v = (-i * sa + j * ca) / W2;                          // u: -1 stalk .. 1 tip
      if (u < -1 || u > 1) continue;
      const half = Math.sin((u + 1) * Math.PI / 2) ** 0.8 * (1 - 0.15 * vnoise(u * 6, v > 0 ? 1 : 3, seed));
      if (Math.abs(v) > half) continue;
      const vein = Math.abs(v) < 0.07 || (Math.abs(((u * 4 + Math.abs(v) * 1.2) % 0.5) - 0.25) < 0.035 && Math.abs(v) < half - 0.1);
      const edge = Math.abs(v) > half - 0.16;
      b.set(Math.round(x + i), Math.round(y + j * 0.6), edge ? P[3] : vein ? P[0] : v < 0 ? P[1] : P[2]);
    }
    for (let k = 0; k < L * 0.25; k++) b.set(Math.round(x - ca * (L + k)), Math.round(y - sa * (L + k) * 0.6), P[3]);   // the stalk
  }
  // The foot of a tree so big its crown is out of sight: a wide column of deep-furrowed bark rising off the top, roots
  // flaring over the ground, moss on its lit side, and the shade of the crown above. o: { seed, w, h }.
  function giantTrunk(o) {
    const { seed = 1, w: TW = 150, h: TH = 230 } = o, rnd = rng(seed), pad = 70, w = TW + pad * 2, h = TH + 30, cx = w / 2, base = h - 14, top = 34, b = new Buf(w, h);
    const B = [...M.bark, '#261b19', '#1d1517'];
    // the column: deep furrows, a slight flare at the foot, darker towards the crown's shade
    for (let y = top; y <= base; y++) {
      const hw = TW / 2 + Math.max(0, (y - (base - 30)) / 30) ** 2 * 18;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        const nx = (x + 0.5 - cx) / hw; if (Math.abs(nx) > 1) continue;
        const furrow = vnoise(x / 3.2, y / 40, seed) + 0.3 * vnoise(x / 1.6, y / 12, seed + 1);
        const s = shadeOf(nx, 0, Math.sqrt(1 - nx * nx)) * 0.85 + (furrow < 0.42 ? 0.35 : furrow > 0.8 ? -0.12 : 0) + Math.max(0, (top + 70 - y) / 70) * 0.55;
        b.set(x, y, B[band(Math.min(0.99, s / 1.4), 0, 7)]);
      }
    }
    // roots: thick ridges arching out over the ground, lit along their tops
    for (const k of [-1, -0.55, -0.15, 0.3, 0.75, 1]) {
      const sx = cx + k * TW * 0.42, ex = cx + k * (TW / 2 + pad * (0.6 + rnd() * 0.3)) + (rnd() - 0.5) * 10, ey = base + 2 - rnd() * 6;
      stroke(b, curve([sx, base - 26], [sx + (ex - sx) * 0.45, base - 22], [ex, ey], 26), t => 9 * (1 - t) + 2, (x, y, t, e) => B[e < 0 ? (k < 0.4 ? 1 : 2) : e > 0 ? 5 : k < 0.4 ? 2 : 3]);
    }
    for (const [x, y, q] of scatter(seed + 4, 5, [0, base - 120, w, 130], (x, y) => b.get(x, y) && x < cx && vnoise(x / 14, y / 10, seed + 5) > 0.5)) {
      b.set(x, y, M.moss[q < 0.5 ? 2 : 3]); b.set(x + 1, y, M.moss[3]); b.set(x, y + 1, M.moss[4]);
    }
    outline(b, B[7]);
    // the shade of the crown, far above: deep leaves hanging into view
    const crown = new Buf(w, h), DEEP = ['#3e7f45', '#2c6448', '#24523f', '#1d4236', '#16352d', '#10271f'];
    K.paintClumps(crown, roundCanopyEx(seed + 9, w * 0.5, 30, 8, 15), DEEP, cx, 14, 0, -1e9);
    outline(crown, DEEP[5]);
    const c = b.canvas(); c.getContext('2d').drawImage(crown.canvas(), 0, 0);
    return { img: c, ax: Math.round(cx), ay: base, foot: 16, r: Math.round(TW / 2 + 10) };
  }

  window.FLORA = { LEAF, stroke, curve, fillPoly, outline, trunk, broadleaf, poplar, birch, pine, willow, clover, dandelion, fern, blades, mushrooms, reeds, horsetail, mossMound, sprout, pebble, fallenLeaf, giantTrunk };
})();
