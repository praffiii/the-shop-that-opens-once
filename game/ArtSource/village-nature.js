'use strict';
/* The nature and street-prop kit every zone shares: six more tree species (oak, birch, blossom, fruit tree, willow,
   dead tree), small plants, rocks and wood, yard and street props, and the bugs that are Bellwood's only animals.
   Every maker returns the village.js sprite contract: { img, ax, ay } at the feet, plus base, foot, shadow [rx, ry],
   lit, frames and fps where they apply. */
(() => {
  const V = VIL, { fill, px, disc, inked, foliage, LEAF } = V, P = PX.PAL, rng = PX.rng, { hash, Buf } = KIT;

  /* ---------------- helpers ---------------- */
  const inE = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  // The finished sprite: (gx, gy) is the feet in drawing coordinates (inked adds a 1 px border; ay is the ink row).
  const done = (o, gx, gy, extra = {}) => ({ img: o.canvas(), ax: Math.round(gx) + 1, ay: Math.round(gy) + 2, ...extra });
  const rect1 = ([x, y, w, h]) => [x + 1, y + 1, w, h];   // a drawing rect in img px
  // Paint behind what is already drawn (ground petals, the soil under crops): only empty pixels take colour.
  function under(o, draw) { const t = new Buf(o.w, o.h); draw(t); for (let i = 0; i < t.d.length; i++) if (t.d[i] && !o.d[i]) o.d[i] = t.d[i]; }
  function stamp(b, x, y, rows, key) { rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (key[row[i]]) px(b, x + i, y + j, key[row[i]]); }); }
  // A lit dome R = [lit, body, shade, dark], light from the upper left; clip(x, y) trims it (a flat bottom).
  function orb(b, cx, cy, rx, ry, R, clip) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
      if (u * u + v * v > 1 || (clip && !clip(x, y))) continue;
      const l = -u * 0.6 - v * 0.8;
      px(b, x, y, R[l > 0.55 ? 0 : l > -0.15 ? 1 : l > -0.65 ? 2 : 3]);
    }
  }
  // A tapering round limb through [[x, y, r], ...], R = [lit, body, dark]: each pixel is lit by its offset from the
  // nearest point of the spine, so a trunk is lit on its left and a bough on its top.
  function limb(b, pts, R) {
    const best = new Map();
    for (let k = 0; k + 1 < pts.length; k++) {
      const [x0, y0, r0] = pts[k], [x1, y1, r1] = pts[k + 1], dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, m = Math.max(r0, r1) + 1;
      for (let y = Math.floor(Math.min(y0, y1) - m); y <= Math.max(y0, y1) + m; y++) for (let x = Math.floor(Math.min(x0, x1) - m); x <= Math.max(x0, x1) + m; x++) {
        const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L2)), ox = x - (x0 + dx * t), oy = y - (y0 + dy * t), r = r0 + (r1 - r0) * t, d = Math.hypot(ox, oy);
        if (d > r + 0.3) continue;
        const key = y * 8192 + x, q = d / Math.max(r, 0.5), prev = best.get(key);
        if (prev !== undefined && prev <= q) continue;
        best.set(key, q);
        const l = r < 1.2 ? 0 : -(ox * 0.75 + oy * 0.65) / r;
        px(b, x, y, R[l > 0.45 ? 0 : l > -0.45 ? 1 : 2]);
      }
    }
  }
  // A crown of separate leaf masses [[cx, cy, rx, ry, tone], ...], back to front, each lit at its own upper left.
  function masses(b, list, ramp, seed, o = {}) {
    list.forEach(([cx, cy, rx, ry, dt = 0], k) => foliage(b, inE(cx, cy, rx, ry), [Math.round(cx - rx), Math.round(cy - ry), Math.round(cx + rx), Math.round(cy + ry)], ramp, seed + k * 13, { ...o, tone: () => dt }));
  }
  // The sign font at k x k px per dot (PX.text draws on a context; this plots it into a Buf).
  function label(b, s, x, y, c, k = 2) {
    const w = PX.textWidth(s), [, g] = PX.canvas(w, 5); PX.text(g, s, 0, 0, '#000000');
    const d = g.getImageData(0, 0, w, 5).data;
    for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3]) fill(b, x + i * k, y + j * k, k, k, c);
  }
  // Roof tiles 6 x 4 in half-offset rows with a lit top edge and a dark hem, a ridge cap above.
  function tiles(b, x0, y0, w, h, R) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const yy = y - 2, row = Math.floor(yy / 4), sx = (x + (row & 1) * 3) % 6, sy = ((yy % 4) + 4) % 4;
      let c = sy === 0 ? (sx === 0 ? R[2] : R[0]) : sy === 3 ? R[3] : sx === 0 ? R[3] : hash(Math.floor((x + (row & 1) * 3) / 6), row, w) < 0.25 ? R[2] : R[1];
      if (yy < 0) c = [R[3], R[0]][y];
      if (x === 0 || x === w - 1) c = R[4];
      px(b, x0 + x, y0 + y, c);
    }
  }
  const LIME = ['grass0', 'grass1', 'grass2', 'grass3', 'grass4', 'grass5'].map(k => P[k]);
  const BARK = ['wood2', 'wood3', 'wood4'], DARKWOOD = ['wood3', 'wood4', 'wood5'];
  const DEAD = ['#d6c4ad', '#a8907a', '#786352', '#4d3e36'];       // sun-bleached wood of the old West
  const RED = ['roofR0', 'red', 'roofR2', 'roofR3'], IRON = ['iron2', 'iron3', 'iron4', 'ink2'];
  // Flower heads: [petal, petal shade].
  const FLOWER = { pink: ['pink', 'dusk3'], rose: ['rose', 'roofR2'], red: ['red', 'roofR3'], yellow: ['yellow', 'brass2'], orange: ['orange', 'light4'], white: ['white', 'cloud2'], lilac: ['lilac', 'dusk5'], blue: ['blue', 'roofB2'] };
  function head(b, x, y, colour) { // a five-pixel flower: lit petals up and left, shaded down and right, an eye
    const [c0, c1] = FLOWER[colour] || FLOWER.pink;
    px(b, x, y - 1, c0); px(b, x - 1, y, c0); px(b, x + 1, y, c1); px(b, x, y + 1, c1); px(b, x, y, colour === 'yellow' ? 'orange' : 'yellow');
  }
  // A small leafy mound covered in flower heads (flower clumps, pots, window boxes).
  function bloomMound(b, cx, cy, rx, ry, colours, seed, n) {
    foliage(b, inE(cx, cy, rx, ry), [Math.round(cx - rx), Math.round(cy - ry), Math.round(cx + rx), Math.round(cy + ry)], LEAF.deep, seed, { cw: 6, ch: 5, dx: 4, dy: 3 });
    const r = rng(seed * 3 + 1), spots = [];
    for (let k = 0; k < 90 && spots.length < n; k++) {
      const x = Math.round(cx + (r() - 0.5) * rx * 1.6), y = Math.round(cy - ry * 0.55 + r() * ry * 0.9);
      if (inE(cx, cy, rx - 1, ry - 0.5)(x, y) && spots.every(([a, c]) => Math.abs(a - x) + Math.abs(c - y) > 3)) spots.push([x, y]);
    }
    spots.forEach(([x, y], k) => head(b, x, y, colours[k % colours.length]));
  }

  /* ---------------- trees ---------------- */
  /* A big old oak, 100-130 tall: a thick trunk forks into boughs that hold separate leaf masses, so the boughs show
     between them. */
  function oak(seed = 1) {
    const r = rng(seed * 31 + 7), H = 104 + Math.round(r() * 24), W = 128, cx = 64, gy = H - 3, k = (H - 8) / 104, fork = Math.round(gy - 34 - (H - 104) * 0.4);
    const j = () => Math.round((r() - 0.5) * 8), ramp = LEAF[seed % 3 === 2 ? 'deep' : 'green'];
    const M = [[cx + j(), 27 * k, 30, 22, -0.4], [cx - 34 + j(), 40 * k, 23, 17, -0.1], [cx + 35 + j(), 38 * k, 23, 17, 0.2],
      [cx - 39 + j() / 2, 63 * k, 19, 13, 0.4], [cx + 40 + j() / 2, 61 * k, 19, 13, 0.6], [cx + 12 + j(), 57 * k, 14, 10, 0.5]];
    const o = inked(W, H, b => {
      limb(b, [[cx - 1, gy - 2, 9], [cx, fork, 7], [cx + 1, fork - 18, 5]], BARK);
      for (const [x, y] of M.slice(1)) limb(b, [[cx + Math.sign(x - cx) * 2, fork + 4, 5], [(cx * 2 + x) / 3, (fork + y) / 2 + 3, 3.5], [x, y + 2, 2]], BARK);
      limb(b, [[cx - 6, gy - 8, 4], [cx - 17, gy + 1, 1.5]], BARK); limb(b, [[cx + 6, gy - 8, 4], [cx + 18, gy + 1, 1.5]], BARK); limb(b, [[cx + 1, gy - 5, 3], [cx + 5, gy + 1, 1.5]], BARK);
      // bark: long seams, a lit ridge, a knot hole
      for (let y = fork + 6; y < gy - 6; y += 7) { fill(b, cx - 4 + ((y / 7) & 1) * 6, y, 1, 4, 'wood4'); px(b, cx - 6, y + 2, 'wood1'); }
      fill(b, cx + 2, gy - 22, 3, 4, 'wood5'); fill(b, cx + 2, gy - 18, 3, 1, 'wood2'); px(b, cx + 2, gy - 22, 'wood4');
      masses(b, M, ramp, seed);
    });
    return done(o, cx, gy, { base: [-9, 9], foot: 4, shadow: [50, 13] });
  }

  /* A birch: a slim white trunk with dark marks, small airy leaf masses in yellow-green, or gold in autumn. */
  function birch(seed = 1) {
    const r = rng(seed * 17 + 3), H = 80 + Math.round(r() * 14), W = 52, cx = 26, gy = H - 3, lean = Math.round((r() - 0.5) * 6);
    const ramp = seed % 3 === 2 ? LEAF.autumn : LIME, at = y => cx + lean * (gy - y) / (gy - 10);
    const M = [[at(10), 12, 11, 9, -0.3], [at(18) - 10, 22, 11, 10, 0], [at(16) + 10, 20, 11, 10, 0.1], [at(36) + 10, 40, 10, 8, 0.4], [at(42) - 10, 45, 9, 8, 0.5], [at(30), 31, 9, 7, 0.3]];
    const o = inked(W, H, b => {
      for (const [x, y] of M) limb(b, [[at(y + 10), y + 10, 1.2], [x, y + 2, 0.6]], ['stone3', 'stone4', 'stone5']);
      limb(b, [[cx, gy, 3], [at(10), 10, 1.6]], ['white', 'stone0', 'stone2']);
      // the dark marks: short dashes on alternate sides, a knot eye, a rough dark foot
      for (let y = 16 + (seed & 3); y < gy - 6; y += 5 + ((y >> 2) & 1)) { const x = Math.round(at(y)), s = (y >> 1) & 1; fill(b, x - 2 + s * 2, y, 2, 1, 'stone5'); }
      fill(b, Math.round(at(gy - 24)) - 1, gy - 24, 2, 2, 'ink2'); px(b, Math.round(at(gy - 24)) + 1, gy - 23, 'stone4');
      for (let y = gy - 4; y <= gy; y++) { const x = Math.round(at(y)); fill(b, x - 1 + (y & 1), y, 2, 1, 'stone4'); }
      masses(b, M, ramp, seed, { cw: 8, ch: 6, dx: 6, dy: 4 });
    });
    return done(o, cx, gy, { base: [-3, 3], foot: 2, shadow: [18, 6] });
  }

  /* A blossom tree: a crooked dark trunk under pink cloud masses, petals caught on the lit side and fallen around it. */
  function blossom(seed = 1) {
    const r = rng(seed * 13 + 5), H = 78 + Math.round(r() * 12), W = 100, cx = 50, gy = H - 3, fork = gy - 30, j = () => Math.round((r() - 0.5) * 6), ramp = LEAF.blossom;
    const M = [[cx + j(), 19, 24, 16, -0.4], [cx - 28 + j(), 28, 18, 13, -0.1], [cx + 28 + j(), 26, 18, 13, 0.1], [cx - 17 + j(), 44, 15, 10, 0.4], [cx + 21 + j(), 43, 15, 10, 0.5]];
    const o = inked(W, H, b => {
      limb(b, [[cx, gy - 1, 5], [cx - 3, gy - 14, 4], [cx + 1, fork, 3.5], [cx, fork - 12, 2.5]], DARKWOOD);
      for (const [x, y] of M.slice(1)) limb(b, [[cx + 1, fork + 2, 3], [(cx + x) / 2, (fork + y) / 2 - 2, 2.2], [x, y + 2, 1.3]], DARKWOOD);
      limb(b, [[cx - 4, gy - 4, 3], [cx - 11, gy + 1, 1.2]], DARKWOOD); limb(b, [[cx + 3, gy - 4, 3], [cx + 10, gy + 1, 1.2]], DARKWOOD);
      masses(b, M, ramp, seed);
      // petals caught on the crown: a few white flecks on the lit caps
      const lit = KIT.u32(ramp[1]);
      for (let k = 0, n = 0; k < 200 && n < 14; k++) { const x = (r() * W) | 0, y = (r() * 50) | 0; if (b.get(x, y) === lit && b.get(x + 1, y) === lit) { px(b, x, y, 'white'); n++; } }
    });
    under(o, t => { for (let k = 0; k < 16; k++) { const x = Math.round(cx + 1 + (r() - 0.5) * 64), y = gy + 2 - Math.round(r() * 5); px(t, x, y, ramp[1 + (k & 1)]); if (k % 3 === 0) px(t, x + 1, y, ramp[1]); } });
    return done(o, cx, gy, { base: [-4, 4], foot: 3, shadow: [34, 9] });
  }

  /* A fruit tree: a round crown of leaf clumps dotted with apples or oranges, two fallen at its foot. */
  const FRUIT = { apple: ['white', 'red', 'roofR3'], orange: ['light0', 'orange', 'light4'] }, FRUIT_ROWS = ['.bb.', 'bwbc', 'bbcc', '.cc.'];
  function fruitTree(seed = 1, fruit = 'apple') {
    const r = rng(seed * 19 + 11), cr = 23 + Math.round(r() * 5), W = cr * 2 + 14, cx = Math.round(W / 2), cy = Math.round(cr * 0.85) + 5, H = cy + cr + 16, gy = H - 3;
    const [w, f, d] = FRUIT[fruit] || FRUIT.apple, key = { w, b: f, c: d }, ramp = LEAF[seed % 2 ? 'deep' : 'green'];
    const parts = [inE(cx, cy, cr * 0.92, cr * 0.78)];
    for (let k = 0; k < 6; k++) { const a = Math.PI * (0.9 + k * 0.24) + r() * 0.3; parts.push(inE(cx + Math.cos(a) * cr * 0.66, cy + Math.sin(a) * cr * 0.52, cr * 0.42, cr * 0.36)); }
    const crown = (x, y) => parts.some(p => p(x, y));
    const o = inked(W, H, b => {
      limb(b, [[cx, gy - 1, 4], [cx, cy + cr * 0.45, 3]], BARK);
      limb(b, [[cx, cy + cr * 0.5, 2.5], [cx - 9, cy + 2, 1.5]], BARK); limb(b, [[cx, cy + cr * 0.45, 2.5], [cx + 10, cy, 1.5]], BARK);
      limb(b, [[cx - 3, gy - 3, 2.5], [cx - 8, gy + 1, 1]], BARK); limb(b, [[cx + 3, gy - 3, 2.5], [cx + 8, gy + 1, 1]], BARK);
      foliage(b, crown, [cx - cr, cy - Math.round(cr * 0.95), cx + cr, cy + Math.round(cr * 0.78)], ramp, seed);
      const at = [];
      for (let k = 0; k < 80 && at.length < Math.round(cr / 2.2); k++) {
        const x = Math.round(cx + (r() - 0.5) * cr * 1.6), y = Math.round(cy + (r() - 0.6) * cr * 1.2);
        if ([[-2, -2], [6, -2], [-2, 6], [6, 6]].every(([i, q]) => crown(x + i, y + q)) && at.every(([a, c]) => Math.abs(a - x) + Math.abs(c - y) > 8)) at.push([x, y]);
      }
      at.forEach(([x, y]) => stamp(b, x, y, FRUIT_ROWS, key));
      stamp(b, cx - 13, gy - 3, FRUIT_ROWS, key); stamp(b, cx + 9, gy - 2, FRUIT_ROWS, key);
    });
    return done(o, cx, gy, { base: [-4, 4], foot: 3, shadow: [Math.round(cr * 0.9), Math.round(cr * 0.32)] });
  }

  /* A weeping willow for the river banks: a dome of clumps that pours down in long strands, parted at the trunk. */
  function willow(seed = 1) {
    const r = rng(seed * 23 + 9), W = 96, H = 88 + Math.round(r() * 10), cx = 48, gy = H - 3, ramp = LEAF[seed % 2 ? 'green' : 'teal'], dome = [cx, 25, 40, 20];
    const o = inked(W, H, b => {
      // A strand: 2 px of hanging leaves, lit left and shaded right, a leaf notch every few rows and a darker tip.
      const strand = (x, y0, y1, c) => {
        let s = 0;
        for (let y = y0; y <= y1; y++) {
          s = Math.round(Math.sin((y + x * 2) * 0.22) * 0.7 + (x - cx) / dome[2] * (y - y0) * 0.12); const k = (y - y0 + x) % 4;
          px(b, x + s, y, ramp[c]); px(b, x + s + 1, y, ramp[c + (k === 3 ? 2 : 1)]); if (k === 0 && y > y0 + 3) px(b, x + s - 1, y, ramp[c]);
        }
        px(b, x + s, y1 + 1, ramp[c + 1]);
      };
      const top = x => Math.round(dome[1] + dome[3] * 0.55 * Math.sqrt(Math.max(0, 1 - ((x - cx) / dome[2]) ** 2)));
      for (let x = 7; x < W - 8; x += 2) { const u = Math.abs(x - cx) / dome[2]; strand(x, top(x), Math.round(gy - 6 - (1 - u) * 12 - hash(x, 1, seed) * 10), 3); }
      limb(b, [[cx, gy - 1, 6], [cx - 1, gy - 20, 4.5], [cx + 2, 32, 4]], BARK);
      limb(b, [[cx - 6, gy - 4, 3], [cx - 13, gy + 1, 1.5]], BARK); limb(b, [[cx + 6, gy - 4, 3], [cx + 14, gy + 1, 1.5]], BARK);
      for (let x = 5; x < W - 6; x += 3) {
        const u = Math.abs(x + 1 - cx) / dome[2]; if (u > 1) continue;
        const end = u < 0.32 ? top(x) + 8 + Math.round(hash(x, 2, seed) * 8) : Math.round(gy - 3 - (1 - u) * 26 - hash(x, 3, seed) * 16 - ((x / 3) & 1) * 5);
        strand(x, top(x) - 2, end, Math.max(1, Math.min(2, Math.round(1.3 + (x - cx) / dome[2] * 0.7 + (hash(x, 4, seed) - 0.5) * 0.8))));
      }
      foliage(b, inE(...dome), [cx - dome[2], dome[1] - dome[3], cx + dome[2], dome[1] + dome[3]], ramp, seed);
    });
    return done(o, cx, gy, { base: [-6, 6], foot: 4, shadow: [42, 11] });
  }

  /* A dead tree for the old West: bare, twisted boughs of sun-bleached wood forking into thin twigs. */
  function deadTree(seed = 1) {
    const r = rng(seed * 29 + 13), W = 86, H = 80 + Math.round(r() * 14), cx = 43, gy = H - 3, R = DEAD.slice(0, 3), limbs = [];
    const grow = (x, y, a, len, r0, r1, depth) => {
      const pts = [[x, y, r0]], n = Math.max(2, Math.round(len / 5));
      for (let i = 1; i <= n; i++) { a += (r() - 0.5) * 0.6 + (-Math.PI / 2 - a) * 0.08; x += Math.cos(a) * len / n; y += Math.sin(a) * len / n; pts.push([x, y, r0 + (r1 - r0) * i / n]); }
      limbs.push(pts);
      if (depth > 0) { const s = 0.45 + r() * 0.4; grow(x, y, a - s, len * 0.66, r1, Math.max(0.4, r1 * 0.55), depth - 1); grow(x, y, a + s * 0.9, len * 0.6, r1 * 0.85, Math.max(0.4, r1 * 0.5), depth - 1); }
      return pts;
    };
    const trunk = grow(cx, gy - 1, -Math.PI / 2, H * 0.4, 5.5, 3.5, 3);
    const side = trunk[Math.floor(trunk.length / 2)]; grow(side[0], side[1], -Math.PI / 2 + (seed & 1 ? 1.1 : -1.1), 18, 2.2, 1, 1);
    const o = inked(W, H, b => {
      limb(b, [[cx - 4, gy - 4, 3], [cx - 13, gy + 1, 1.2]], R); limb(b, [[cx + 4, gy - 4, 3], [cx + 12, gy + 1, 1.2]], R);
      for (const pts of limbs) limb(b, pts, R);
      const [kx, ky] = trunk[2].map(Math.round);   // a knot hole
      fill(b, kx, ky, 2, 3, DEAD[3]); px(b, kx, ky + 3, DEAD[0]);
    });
    return done(o, cx, gy, { base: [-5, 5], foot: 3, shadow: [22, 6] });
  }

  /* ---------------- small plants ---------------- */
  /* A fern: arching fronds fanned from one root, leaflets lit on their upper side. */
  function fern(seed = 1) {
    const r = rng(seed * 37 + 1), W = 30, H = 19, cx = 15, gy = H - 2, ramp = LEAF[seed % 3 === 1 ? 'teal' : 'deep'], n = 7;
    const o = inked(W, H, b => {
      const fronds = [];
      for (let k = 0; k < n; k++) { const f = k / (n - 1); fronds.push([-Math.PI * (0.94 - f * 0.88) + (r() - 0.5) * 0.12, 9 + (1 - Math.abs(f - 0.5) * 2) * 6 + r() * 2]); }
      fronds.sort((p, q) => Math.abs(q[0] + Math.PI / 2) - Math.abs(p[0] + Math.PI / 2));   // low side fronds first
      for (const [a0, len] of fronds) {
        // a tapered blade along an arching spine, serrated edges, lit on the upper side
        let x = cx, y = gy, a = a0;
        const dir = Math.cos(a0) >= 0 ? 1 : -1, c = Math.abs(a0 + Math.PI / 2) > Math.PI * 0.3 ? 1 : 0;
        for (let i = 0; i < len; i++) {
          a += dir * 0.08; x += Math.cos(a); y += Math.sin(a);
          const w = (1 - i / len) * 2.4 + 0.5, nx = -Math.sin(a), ny = Math.cos(a);
          for (let q = -w; q <= w + 0.01; q += 0.5) {
            if (i % 2 && Math.abs(q) > w - 1) continue;
            const up = ny * q < 0 || (Math.abs(ny) < 0.2 && nx * q * dir < 0);
            px(b, Math.round(x + nx * q), Math.round(y + ny * q), ramp[Math.abs(q) < 0.4 ? 3 + c : (up ? 1 : 2) + c]);
          }
        }
      }
    });
    return done(o, cx, gy, { shadow: [10, 2] });
  }

  /* Reeds for the water's edge: a sheaf of curving blades, some with cattail heads. */
  function reeds(seed = 1) {
    const r = rng(seed * 41 + 3), W = 20, H = 30, gy = H - 2, G = ['g0', 'g1', 'g2', 'g3', 'g4'];
    const o = inked(W, H, b => {
      const blades = [];
      for (let k = 0; k < 9; k++) blades.push([3 + Math.round(k * 1.6 + (r() - 0.5) * 2), 11 + Math.round(r() * 15), (r() - 0.5) * 5 + (k - 4) * 0.9, k & 1]);
      blades.sort((p, q) => q[3] - p[3]);
      for (const [x0, h, lean, back] of blades) for (let i = 0; i < h; i++) {
        const x = Math.round(x0 + lean * (i / h) ** 2), y = gy - i;
        px(b, x, y, G[back ? 2 : 1]); if (i < h * 0.6) px(b, x + 1, y, G[back ? 4 : 3]);
        if (i === h - 1) px(b, x, y, G[back ? 1 : 0]);
      }
      const cats = seed % 3 === 0 ? 1 : 2;
      for (let k = 0; k < cats; k++) {
        const x = 6 + k * 7 + Math.round(r() * 2), top = 2 + Math.round(r() * 4) + k * 3;
        fill(b, x, top + 7, 1, gy - top - 7, 'g3'); px(b, x, top - 2, 'g3'); px(b, x, top - 1, 'g3');
        fill(b, x - 1, top, 3, 7, 'wood3'); fill(b, x - 1, top, 1, 7, 'wood2'); fill(b, x + 1, top, 1, 7, 'wood4'); px(b, x - 1, top, 'wood1');
      }
      fill(b, 4, gy, 12, 1, 'g4');
    });
    return done(o, 10, gy);
  }

  /* A lily pad, flat on the water: a notched leaf, lit on its upper left, sometimes with a pink flower. */
  function lilyPad(seed = 1) {
    const r = rng(seed * 43 + 5), rx = 6 + Math.round(r() * 3), ry = Math.round(rx * 0.55), W = rx * 2 + 1, H = ry * 2 + 5, cx = rx, cy = ry + 4, na = -0.5 - r() * 2.2, G = LEAF.green;
    const o = inked(W, H, b => {
      disc(b, cx, cy, rx, ry, G[3]); disc(b, cx, cy - 1, rx - 1, ry - 1, G[2]); disc(b, cx - 2, cy - 1, rx - 4, Math.max(1, ry - 2), G[1]);
      for (let k = 1; k < rx - 1; k += 2) px(b, Math.round(cx - k * 0.9), Math.round(cy + k * 0.3), G[3]);
      // the notch: a wedge cut from the centre out to the rim
      for (let y = cy - ry; y <= cy + ry; y++) for (let x = 0; x < W; x++) { const a = Math.atan2((y - cy) * 1.8, x - cx), d = Math.abs(((a - na + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d < 0.32 && Math.hypot(x - cx, (y - cy) * 1.8) > 1) b.set(x, y, 0); }
      if (seed % 3 === 0) stamp(b, cx - 2, cy - 4, ['..a..', '.aba.', 'abyba', '.bbb.'], { a: 'white', b: 'pink', y: 'yellow' });
    });
    return done(o, cx, cy + ry);
  }

  /* A little cluster of mushrooms: red with white spots, brown, or lilac. */
  function mushrooms(seed = 1) {
    const r = rng(seed * 47 + 7), W = 20, H = 15, gy = H - 1, CAP = [RED, ['wood1', 'wood2', 'wood3', 'wood4'], ['lilac', 'dusk4', 'dusk5', 'roofB4']][seed % 3];
    const list = [[13 + Math.round(r() * 2), 3, 3.5, 2.5], [4, 2, 2.5, 2], [8 + Math.round(r() * 2), 6, 4.5, 3]];
    const o = inked(W, H, b => {
      for (const [x, stem, rx, ry] of list) {
        const capY = gy - stem - 1;
        fill(b, x - 1, capY, 3, stem + 1, 'cream1'); fill(b, x - 1, capY, 1, stem + 1, 'cream0'); fill(b, x + 1, capY, 1, stem + 1, 'cream2');
        orb(b, x + 0.5, capY + 0.5, rx, ry + 0.5, CAP, (_, y) => y <= capY);
        fill(b, x - Math.floor(rx) + 1, capY + 1, Math.floor(rx) * 2 - 1, 1, 'cream2');
        if (CAP === RED) { px(b, x - 1, capY - Math.round(ry) + 1, 'white'); if (rx > 3) { px(b, x + 2, capY - 1, 'white'); px(b, x - 3, capY, 'white'); } }
      }
    });
    return done(o, 10, gy, { shadow: [8, 2] });
  }

  /* A dense clump of wildflowers in one colour (a FLOWER key: pink, rose, red, yellow, orange, white, lilac, blue). */
  function flowerClump(seed = 1, colour = 'pink') {
    const W = 24, H = 15, gy = H - 1;
    const o = inked(W, H, b => bloomMound(b, 12, 9, 11, 5.5, [colour], seed, 15));
    return done(o, 12, gy, { shadow: [10, 2] });
  }

  /* A trimmed hedge segment len px long: a flat lit top over a clumped front face. ax is its left end. */
  function hedge(len = 48) {
    const H = 22, top = 8, ramp = LEAF.deep;
    const o = inked(len, H, b => {
      foliage(b, (x, y) => x >= 3 && x < len - 3 && y >= top + 2 && y < H - 3, [0, top, len, H - 1], ramp, len, { cw: 8, ch: 6, dx: 6, dy: 4, tone: (x, y) => -((x - len / 2) / (len / 2)) * 0.8 + 0.4 });
      foliage(b, (x, y) => x >= 3 && x < len - 3 && y >= 2 && y < top, [0, 0, len, top + 2], ramp, len + 7, { cw: 8, ch: 5, dx: 6, dy: 3, tone: (x, y) => -((x - len / 2) / (len / 2)) * 0.8 - 1.6 });
      fill(b, 1, H - 2, len - 2, 1, ramp[5]);
    });
    return { img: o.canvas(), ax: 1, ay: H + 1, base: [0, len], foot: 8 };
  }

  /* Crops in a tilled row len px long: 'cabbage', 'carrot' or 'wheat'. ax is the row's left end. */
  function vegRow(kind = 'cabbage', len = 64) {
    const H = kind === 'wheat' ? 30 : 16, gy = H - 4, T = LEAF.teal;
    const o = inked(len, H, b => {
      if (kind === 'wheat') for (const back of [1, 0]) for (let x = 2 + back; x < len - 2; x += 3) {
        const h = 18 + Math.round(hash(x, back, 7) * 5) - back * 3, lean = hash(x, 3, back) < 0.5 ? 0 : 1, top = gy - h;
        fill(b, x, top + 5, 1, h - 5, back ? 'brass3' : 'brass2'); if (!back && x % 2) px(b, x + 1, top + 11, 'brass2');
        fill(b, x + lean, top, 2, 6, back ? 'brass2' : 'brass1'); fill(b, x + lean + 1, top, 1, 6, back ? 'brass3' : 'brass2');
        for (let y = top + 1; y < top + 6; y += 2) px(b, x + lean, y, back ? 'brass3' : 'brass0');
        px(b, x + lean, top - 1, 'brass1'); px(b, x + lean + 1, top - 2, 'brass2');
      }
      else for (let x = 7; x < len - 4; x += 11) {
        if (kind === 'carrot') {
          stamp(b, x - 3, gy - 9, ['..a.a..', '.aba.a.', 'abbabba', '.bcbcb.', '..c.c..', '...c...', '...c...'], { a: LEAF.green[1], b: LEAF.green[2], c: LEAF.green[3] });
          fill(b, x - 2, gy - 2, 5, 3, 'orange'); fill(b, x + 1, gy - 2, 2, 3, 'light4'); px(b, x - 2, gy - 2, 'light1');
        } else {
          orb(b, x + 0.5, gy - 2, 6, 3, [T[0], T[1], T[2], T[3]]);
          orb(b, x + 0.5, gy - 4.5, 4, 3.5, [LIME[0], LIME[1], LIME[2], LIME[3]]);
          px(b, x, gy - 5, LIME[3]); px(b, x + 1, gy - 4, LIME[3]); px(b, x - 4, gy - 2, T[3]); px(b, x + 5, gy - 2, T[3]);
        }
      }
    });
    // the tilled row under the crops: a lit crest, a shaded front, clods along the top
    under(o, t => {
      for (let y = 0; y < 6; y++) { const inset = y === 0 || y === 5 ? 2 : 0; fill(t, 1 + inset, H - 4 + y, len - inset * 2, 1, ['e0', 'e0', 'e1', 'e1', 'e2', 'e3'][y]); }
      for (let x = 5; x < len - 3; x += 7) { px(t, x, H - 2, 'e0'); px(t, x + 1, H - 2, 'e0'); px(t, x + 1, H - 1, 'e2'); }
    });
    return { img: o.canvas(), ax: 1, ay: H + 1, base: [0, len], foot: 6 };
  }

  /* ---------------- rocks and wood ---------------- */
  /* A big grey boulder, 30-60 wide: rounded lobes each lit from the upper left, a crack, moss on its crown. */
  function boulder(seed = 1) {
    const r = rng(seed * 59 + 3), W = 30 + Math.round(r() * 30), H = Math.round(W * 0.6) + 2, gy = H - 1, cx = W / 2, RK = ['r0', 'r1', 'r2', 'r3', 'r4'];
    const lobes = [[cx, H * 0.56, W * 0.49, H * 0.46], [cx - W * 0.17 + (r() - 0.5) * 4, H * 0.42, W * 0.3, H * 0.36], [cx + W * 0.2 + (r() - 0.5) * 4, H * 0.56, W * 0.27, H * 0.34]];
    const lobeAt = (x, y) => { let best = -1, q = 0; lobes.forEach(([lx, ly, rx, ry], k) => { const v = 1 - ((x + 0.5 - lx) / rx) ** 2 - ((y + 0.5 - ly) / ry) ** 2; if (v > 0 && (k === 0 ? v : v + 0.25) > q) { q = k === 0 ? v : v + 0.25; best = k; } }); return best; };
    const o = inked(W, H, b => {
      for (let y = 0; y <= gy; y++) for (let x = 0; x < W; x++) {
        const k = lobeAt(x, y); if (k < 0) continue;
        const [lx, ly, rx, ry] = lobes[k], u = (x + 0.5 - lx) / rx, v = (y + 0.5 - ly) / ry, l = -u * 0.55 - v * 0.85;
        let c = RK[l > 0.5 ? 0 : l > 0.05 ? 1 : l > -0.45 ? 2 : 3];
        if (y >= gy - 1) c = RK[y === gy ? 4 : 3];
        px(b, x, y, c);
      }
      // a crack down the front, lit on its left lip
      const kx = Math.round(cx + W * 0.1), ky = Math.round(H * 0.45);
      for (const [i, j] of [[0, 0], [0, 1], [1, 2], [1, 3], [2, 4], [2, 5]]) { px(b, kx + i, ky + j, 'r4'); if (j > 0) px(b, kx + i - 1, ky + j, 'r1'); }
      // moss over the crown
      if (seed % 4 !== 3) for (let x = Math.round(W * 0.18); x < W * 0.72; x++) {
        let y0 = 0; while (y0 < H && !b.get(x, y0)) y0++;
        const m = 2 + Math.round(1.5 + 1.5 * Math.sin(x * 0.55 + seed)) + (hash(x >> 2, 1, seed) < 0.3 ? 2 : 0);
        for (let i = 0; i < m; i++) px(b, x, y0 + i, i === m - 1 ? 'g3' : i === 0 && x < W * 0.45 ? 'g0' : 'g1');
        if (x % 5 === 0) px(b, x, y0 + m, 'g3');
      }
      // grass at its foot
      stamp(b, 1, gy - 3, ['.1.', '121', '.3.'], { 1: 'g1', 2: 'g2', 3: 'g3' }); stamp(b, W - 5, gy - 2, ['1.1', '232'], { 1: 'g1', 2: 'g2', 3: 'g3' });
    });
    return done(o, cx, gy, { base: [-Math.round(W / 2 - 3), Math.round(W / 2 - 3)], foot: Math.round(H * 0.35), shadow: [Math.round(W / 2), 4] });
  }

  /* A fallen log lying left to right: bark lit on top, a ringed cut end, a stub branch, maybe moss and a mushroom. */
  function log(seed = 1) {
    const r = rng(seed * 61 + 5), L = 36 + Math.round(r() * 14), D = 12, W = L + 4, H = D + 8, gy = H - 1, cy = gy - D / 2;
    const o = inked(W, H, b => {
      limb(b, [[Math.round(L * 0.45), cy - 3, 2], [Math.round(L * 0.45) - 5, cy - 9, 1.2]], BARK);
      limb(b, [[4, cy, D / 2], [L - 4, cy, D / 2]], BARK);
      for (const [y, c] of [[cy - 2, 'wood4'], [cy + 2, 'wood4'], [cy - 5, 'wood1']]) for (let x = 6; x < L - 8; x += 9) fill(b, x + ((y * 3) % 5), y, 4 + (x % 3), 1, c);
      // the cut end: bark rim, pale face, a ring and the heart
      disc(b, L - 4, cy, 3, D / 2, 'wood4'); disc(b, L - 4, cy, 2, D / 2 - 1, 'wood1'); disc(b, L - 4, cy, 1, 3, 'wood2'); px(b, L - 4, cy, 'wood3'); px(b, L - 5, cy - 4, 'wood0');
      if (seed % 2) { disc(b, 4, cy, 2, 3, 'wood5'); px(b, 3, cy - 3, 'wood2'); }                 // a hollow end
      if (seed % 3 !== 1) for (let x = 8; x < L * 0.6; x++) { const m = 1 + ((x * 7) % 5 < 2 ? 1 : 0); for (let i = 0; i < m + 1; i++) px(b, x, cy - D / 2 + i, i === m ? 'g3' : 'g1'); }
      if (seed % 3 === 0) { fill(b, L - 13, cy - 8, 1, 3, 'cream1'); orb(b, L - 12.5, cy - 8.5, 2.5, 2, RED, (_, y) => y <= cy - 8); }
    });
    return done(o, W / 2, gy, { base: [-Math.round(L / 2 - 2), Math.round(L / 2 - 2)], foot: 5, shadow: [Math.round(L / 2), 3] });
  }

  /* A stack of cut logs seen end-on: rings facing out, bark running back above them, a stake at each side. */
  function logPile() {
    const W = 42, H = 36, gy = H - 1, E = 6, ends = [[21, gy - 26], [15, gy - 16], [27, gy - 16], [9, gy - 6], [21, gy - 6], [33, gy - 6]];
    const o = inked(W, H, b => {
      for (const x of [1, W - 4]) { fill(b, x, gy - 20, 3, 21, 'wood3'); fill(b, x, gy - 20, 1, 21, 'wood2'); px(b, x + 1, gy - 21, 'wood3'); }
      for (const [x, y] of ends) { fill(b, x - E, y - 8, E * 2 + 1, 8, 'wood3'); fill(b, x - E, y - 8, 2, 8, 'wood2'); fill(b, x + E - 1, y - 8, 2, 8, 'wood4'); for (let k = -3; k <= 3; k += 3) fill(b, x + k, y - 7 + (k & 1), 1, 4, 'wood4'); }
      for (const [x, y] of ends) {
        disc(b, x, y, E, E - 0.5, 'wood4'); disc(b, x - 1, y - 1, E - 1, E - 1.5, 'wood3'); disc(b, x, y, E - 1, E - 1.5, 'wood1');
        disc(b, x, y, 3, 3, 'wood2'); disc(b, x, y, 2, 2, 'wood1'); px(b, x, y, 'wood3'); px(b, x - 3, y - 4, 'wood0'); px(b, x - 4, y - 3, 'wood0');
        px(b, x + 1, y + 1, 'wood2'); px(b, x + 2, y + 2, 'wood2');
      }
    });
    return done(o, W / 2, gy, { base: [-19, 19], foot: 12, shadow: [20, 4] });
  }

  /* A big stump: round bark sides, a ringed top, spreading roots; some are broken, mossy, or sprout mushrooms. */
  function stumpBig(seed = 1) {
    const W = 40, H = 30, cx = 20, gy = H - 2, rx = 11, top = 11, v = seed % 3;
    const o = inked(W, H, b => {
      limb(b, [[cx - 8, gy - 5, 4], [cx - 18, gy + 1, 1.5]], BARK); limb(b, [[cx + 8, gy - 5, 4], [cx + 18, gy, 1.5]], BARK); limb(b, [[cx + 2, gy - 3, 3], [cx + 5, gy + 1, 1.5]], BARK);
      for (let x = cx - rx; x <= cx + rx; x++) {
        const u = (x - cx) / rx, bot = gy - 2 + Math.round(Math.sqrt(1 - u * u) * 2);
        fill(b, x, top, 1, bot - top + 1, u < -0.62 ? 'wood2' : u > 0.55 ? 'wood4' : 'wood3');
        if ((x - cx + 22) % 5 === 0 && Math.abs(u) < 0.8) for (let y = top + 4 + ((x * 3) % 4); y < bot - 1; y += 7) fill(b, x, y, 1, 4, u < -0.2 ? 'wood3' : 'wood4');
      }
      if (v === 1) for (let i = 0; i < 9; i++) fill(b, cx + 3 + i, top - [3, 6, 9, 7, 4, 8, 5, 2, 1][i], 1, [3, 6, 9, 7, 4, 8, 5, 2, 1][i], i < 2 ? 'wood2' : i > 6 ? 'wood4' : 'wood3');
      disc(b, cx, top, rx, 4, 'wood3'); disc(b, cx, top, rx - 1, 3, 'wood1'); disc(b, cx, top, rx - 4, 2, 'wood2'); disc(b, cx, top, rx - 5, 1, 'wood1'); px(b, cx, top, 'wood3');
      for (let k = 1; k < rx - 1; k++) px(b, cx + k, top + (k > 5 ? 1 : 0), 'wood2');
      fill(b, cx - rx + 2, top - 3, rx - 2, 1, 'wood0');
      if (v === 2) { for (let y = top + 3; y < gy - 2; y++) for (let x = cx - rx; x < cx - rx + 3 + ((y * 5) % 3); x++) px(b, x, y, y === top + 3 ? 'g1' : 'g2'); }
      if (v === 0) for (const [x, s] of [[cx + 13, 2.5], [cx + 16, 2]]) { fill(b, x, gy - 3, 1, 3, 'cream1'); orb(b, x + 0.5, gy - 3, s, s * 0.8, ['wood1', 'wood2', 'wood3', 'wood4'], (_, y) => y <= gy - 3); }
    });
    return done(o, cx, gy, { base: [-12, 12], foot: 6, shadow: [17, 4] });
  }

  /* ---------------- street and yard props ---------------- */
  /* A park bench about 32 wide: two back slats, a plank seat, wooden or painted with an iron frame.
     seats: the two sitting points (img px) on the seat for the sit pose. */
  function bench2(seed = 1) {
    const k = seed % 3, R = [['wood1', 'wood2', 'wood3', 'wood4'], ['cap1', 'cap2', 'cap3', 'cap4'], ['roofB1', 'roofB2', 'roofB3', 'roofB4']][k], F = k ? IRON : BARK;
    const W = 34, H = 24, gy = H - 1;
    const o = inked(W, H, b => {
      for (const x of [3, W - 6]) { fill(b, x, 0, 3, 13, F[1]); fill(b, x, 0, 1, 13, F[0]); fill(b, x + 2, 0, 1, 13, F[2]); }
      for (const y of [1, 6]) { fill(b, 0, y, W, 4, R[1]); fill(b, 0, y, W, 1, R[0]); fill(b, 0, y + 3, W, 1, R[2]); for (const x of [4, W - 5]) px(b, x, y + 1, F[2]); }
      fill(b, 0, 12, W, 4, R[1]); fill(b, 0, 12, W, 1, R[0]); fill(b, 0, 14, W, 1, R[0]); fill(b, 0, 13, W, 1, R[1]); fill(b, 0, 16, W, 1, R[2]); fill(b, 0, 17, W, 1, R[3]);
      for (const x of [8, 21]) fill(b, x, 15, 4, 1, R[2]);
      for (const x of [2, W - 5]) { fill(b, x, 18, 3, 6, F[1]); fill(b, x, 18, 1, 6, F[0]); fill(b, x + 2, 18, 1, 6, F[2]); }
      if (k) for (const x of [0, W - 3]) { fill(b, x, 9, 3, 3, F[1]); px(b, x + 1, 10, F[2]); }
    });
    return done(o, W / 2, gy, { base: [-16, 16], foot: 6, seats: [[W / 2 - 7, 15], [W / 2 + 9, 15]], shadow: [16, 3] });
  }

  // A crate: front face w x h at (x, y), its top seen above it (a lid, or a load of goods heaped inside).
  const GOODS = { apple: ['white', 'red', 'roofR3'], orange: ['light0', 'orange', 'light4'], cabbage: [LIME[0], LIME[1], LIME[3]] };
  function crateAt(b, x, y, w, h, goods) {
    fill(b, x, y - 4, w, 4, goods ? 'wood4' : 'wood1'); fill(b, x, y - 4, w, 1, goods ? 'wood3' : 'wood0');
    if (goods) for (let j = 0; j < 2; j++) for (let i = 1 + j * 2; i < w - 3; i += 4) { const [l, c, d] = GOODS[goods]; fill(b, x + i, y - 6 + j * 2, 3, 3, c); px(b, x + i, y - 6 + j * 2, l); fill(b, x + i + 1, y - 4 + j * 2, 2, 1, d); }
    else for (let i = 4; i < w; i += 5) fill(b, x + i, y - 4, 1, 4, 'wood2');
    fill(b, x, y, w, h, 'wood2'); fill(b, x, y, w, 1, 'wood1');
    for (let j = 4; j < h - 1; j += 4) fill(b, x + 2, y + j, w - 4, 1, 'wood3');
    fill(b, x, y, 2, h, 'wood3'); fill(b, x, y, 1, h, 'wood2'); fill(b, x + w - 2, y, 2, h, 'wood4'); fill(b, x, y + h - 1, w, 1, 'wood4');
    for (const i of [3, w - 4]) { px(b, x + i, y + 1, 'iron2'); px(b, x + i, y + h - 2, 'iron2'); }
  }
  /* A stack of two or three crates, the top one open on a load of apples, oranges or cabbages. */
  function crateStack(seed = 1) {
    const v = seed % 3, W = 34, H = 32, gy = H - 1;
    const o = inked(W, H, b => {
      crateAt(b, 0, gy - 11, 18, 12);
      if (v !== 1) crateAt(b, 17, gy - 9, 15, 10, v === 2 ? 'cabbage' : null);
      crateAt(b, 2, gy - 22, 14, 9, v === 2 ? null : v ? 'orange' : 'apple');
    });
    return done(o, W / 2, gy, { base: [-16, 16], foot: 8, shadow: [16, 3] });
  }

  /* Burlap sacks: two standing and tied, one open on grain that has spilled a little, or one lying down. */
  const BURLAP = ['wall1', 'wall2', 'wall3', 'wall4'];
  function sackAt(b, x, gy, w, h, open) {
    orb(b, x, gy - h * 0.45, w / 2, h * 0.52, BURLAP, (_, y) => y <= gy);
    if (open) { disc(b, x, gy - h + 2, Math.round(w / 2) - 1, 2, 'wall3'); disc(b, x, gy - h + 2, Math.round(w / 2) - 2, 1, 'brass1'); px(b, x - 1, gy - h + 1, 'brass0'); px(b, x + 1, gy - h + 2, 'brass2'); }
    else { fill(b, x - 2, gy - h - 2, 4, 4, 'wall2'); fill(b, x + 1, gy - h - 2, 1, 4, 'wall3'); fill(b, x - 2, gy - h + 1, 5, 1, 'wood3'); px(b, x - 3, gy - h - 3, 'wall2'); px(b, x + 2, gy - h - 3, 'wall3'); }
    for (let y = gy - h + 5; y < gy - 1; y += 2) px(b, x + Math.round(w / 2) - 3, y, 'wall4');   // a stitched seam
  }
  function sacks(seed = 1) {
    const v = seed % 2, W = 30, H = 20, gy = H - 1;
    const o = inked(W, H, b => {
      sackAt(b, 9, gy - 1, 12, 15, false); sackAt(b, 20, gy, 11, 13, !v);
      stamp(b, 6, gy - 8, ['.a.', 'aaa', '.a.'], { a: 'wall3' });
      if (v) { orb(b, 15, gy - 3, 8, 3.5, BURLAP, (_, y) => y <= gy); fill(b, 22, gy - 4, 2, 3, 'wood3'); px(b, 24, gy - 5, 'wall2'); px(b, 24, gy - 2, 'wall3'); }
    });
    if (!v) under(o, t => { for (const [x, y] of [[25, gy], [27, gy + 1], [29, gy], [26, gy + 1], [23, gy + 1]]) px(t, x, y, (x & 1) ? 'brass1' : 'brass2'); });
    return done(o, W / 2, gy, { base: [-12, 12], foot: 6, shadow: [13, 3] });
  }

  // A spoked wheel seen side-on centred at (x, y), radius rr.
  function wheel(b, x, y, rr) {
    disc(b, x, y, rr, rr, 'iron3'); disc(b, x, y, rr - 1, rr - 1, 'wood3'); disc(b, x, y, rr - 2, rr - 2, 'wood5');
    for (let a = 0; a < 4; a++) for (let i = -(rr - 2); i <= rr - 2; i++) { const t = a * Math.PI / 4; px(b, Math.round(x + Math.cos(t) * i), Math.round(y + Math.sin(t) * i), i < 0 ? 'wood2' : 'wood3'); }
    disc(b, x, y, 1, 1, 'iron2'); px(b, x - 1, y - 1, 'iron1'); px(b, x - rr + 1, y - 2, 'iron1'); px(b, x - rr + 2, y - rr + 3, 'iron1');
  }
  // A cart bed: plank sides with lit rims and corner posts, its inside seen over the top.
  function bed(b, x, y, w, h) {
    fill(b, x, y - 3, w, 3, 'wood4'); fill(b, x, y - 3, w, 1, 'wood3');
    fill(b, x, y, w, h, 'wood2'); fill(b, x - 1, y - 1, w + 2, 2, 'wood1'); fill(b, x - 1, y, w + 2, 1, 'wood2');
    for (let j = 4; j < h - 1; j += 4) fill(b, x + 2, y + j, w - 4, 1, 'wood3');
    for (const i of [0, w - 3]) { fill(b, x + i, y, 3, h, 'wood3'); fill(b, x + i, y, 1, h, 'wood2'); px(b, x + i + 1, y + 2, 'iron2'); px(b, x + i + 1, y + h - 3, 'iron2'); }
    fill(b, x, y + h - 1, w, 1, 'wood4');
  }
  /* A handcart: a plank bed on one big spoked wheel, handles out to the left, a crate and a sack aboard. */
  function cart() {
    const W = 52, H = 32, gy = H - 1;
    const o = inked(W, H, b => {
      limb(b, [[16, 16, 1], [2, 19, 1]], ['wood2', 'wood3', 'wood4']); limb(b, [[16, 14, 1.2], [1, 17, 1.2]], ['wood1', 'wood2', 'wood3']); fill(b, 0, 17, 3, 2, 'wood4');
      fill(b, 14, 18, 2, gy - 17, 'wood3'); fill(b, 14, 18, 1, gy - 17, 'wood2');
      sackAt(b, 37, 6, 9, 9, false); crateAt(b, 18, 5, 12, 6, 'apple');
      bed(b, 14, 8, 34, 11);
      wheel(b, 33, gy - 8, 8);
    });
    return done(o, 31, gy, { base: [-18, 18], foot: 6, shadow: [20, 4] });
  }

  /* A friendly beetle pulling a hay wagon, side view, facing right: the village's only draft animal. */
  function beetleCart() {
    const W = 104, H = 48, gy = H - 1, by = gy - 15, SH = ['roofB0', 'roofB1', 'roofB2', 'roofB3'], HAY = ['#fff0a0', '#ffd860', '#e8b93a', '#c48f2a'];
    const o = inked(W, H, b => {
      // legs on the far side, then the wagon
      for (const x of [68, 79, 89]) limb(b, [[x + 2, by + 6, 1], [x - 2, gy - 4, 0.8], [x, gy, 0.6]], ['iron4', 'iron4', 'ink2']);
      orb(b, 26, 16, 21, 9, HAY, (_, y) => y <= 19); for (let x = 9; x < 44; x += 4) { px(b, x, 13 + (x % 3), HAY[3]); px(b, x + 1, 12 + (x % 3), HAY[0]); }
      bed(b, 4, 20, 44, 12);
      wheel(b, 14, gy - 8, 8); wheel(b, 38, gy - 8, 8);
      limb(b, [[48, 27, 1.2], [70, 31, 1.2]], ['wood1', 'wood2', 'wood3']);
      // the beetle: a round shell, a red blanket, a dark head with a horn and one big eye
      orb(b, 74, by, 17, 12, SH, (_, y) => y <= by + 8);
      for (let x = 59; x < 90; x++) { const u = (x - 74) / 17, y = Math.round(by + 8 - (1 - u * u) * 1); px(b, x, y, 'roofB4'); }
      px(b, 65, by - 7, 'white'); px(b, 66, by - 8, 'white'); px(b, 68, by - 9, 'white'); px(b, 63, by - 5, 'white');
      for (let y = by - 11; y < by + 3; y++) { const w = 12 - Math.max(0, y - (by - 3)) * 0; fill(b, 70 - (y - by + 11 >> 2), y, w, 1, y < by - 9 ? 'roofR1' : 'roofR2'); }
      fill(b, 67, by + 3, 13, 1, 'yellow'); for (let x = 68; x < 80; x += 3) px(b, x, by + 4, 'yellow');
      orb(b, 92, by + 1, 6, 6.5, IRON); orb(b, 98, by + 3, 4.5, 4.5, IRON);
      limb(b, [[99, by - 1, 1.6], [101, by - 6, 1.2], [99, by - 9, 0.6]], ['iron1', 'iron2', 'iron3']);
      fill(b, 97, by + 1, 3, 3, 'white'); fill(b, 98, by + 2, 2, 2, 'ink'); px(b, 98, by + 2, 'white'); px(b, 100, by + 5, 'pink');
      fill(b, 86, by - 4, 2, 10, 'wood4'); fill(b, 86, by - 4, 1, 10, 'wood3'); px(b, 87, by + 6, 'brass1'); px(b, 86, by + 7, 'brass2');
      for (const x of [62, 73, 84]) { limb(b, [[x + 3, by + 7, 1.2], [x - 2, gy - 4, 1], [x - 1, gy, 0.7]], ['iron2', 'iron3', 'iron4']); px(b, x - 2, gy - 4, 'iron1'); }
    });
    return done(o, W / 2, gy, { base: [-50, 50], foot: 8, shadow: [48, 5] });
  }

  /* A rustic fence: n posts 12 px apart and two split rails. ax is the left post; step: the post spacing. */
  function woodFence(n = 4) {
    const S = 12, W = (n - 1) * S + 4, H = 17;
    const o = inked(W, H, b => {
      for (const y of [4, 10]) { fill(b, 0, y, W, 3, 'wood2'); fill(b, 0, y, W, 1, 'wood1'); fill(b, 0, y + 2, W, 1, 'wood3'); for (let x = 6; x < W; x += S) fill(b, x, y + 1, 3, 1, 'wood3'); }
      for (let i = 0; i < n; i++) {
        const x = i * S;
        fill(b, x, 1, 4, H - 1, 'wood3'); fill(b, x, 1, 1, H - 1, 'wood2'); fill(b, x + 3, 1, 1, H - 1, 'wood4'); fill(b, x, 1, 3, 1, 'wood1'); px(b, x + 3, 0, 0); fill(b, x, 0, 3, 1, 'wood2');
        px(b, x + 1, 5, 'iron2'); px(b, x + 1, 11, 'iron2'); fill(b, x + 2, 7 + (i % 2) * 6, 1, 2, 'wood4');
      }
    });
    return { img: o.canvas(), ax: 1, ay: H + 1, base: [0, W], foot: 3, step: S };
  }

  /* A white picket fence: n pointed pickets 7 px apart on two rails. ax is the left picket; step: the spacing. */
  function pickets(n = 6) {
    const S = 7, W = (n - 1) * S + 4, H = 17;
    const o = inked(W, H, b => {
      for (const y of [5, 12]) { fill(b, 0, y, W, 2, 'stone1'); fill(b, 0, y + 1, W, 1, 'stone2'); }
      for (let i = 0; i < n; i++) {
        const x = i * S;
        fill(b, x + 1, 0, 2, 1, 'white'); fill(b, x, 1, 4, H - 1, 'wall0'); fill(b, x, 1, 1, H - 1, 'white'); fill(b, x + 3, 1, 1, H - 1, 'stone1');
        fill(b, x, H - 2, 4, 2, 'stone1'); px(b, x + 3, H - 1, 'stone2'); px(b, x + 2, 6, 'stone2'); px(b, x + 2, 13, 'stone2');
      }
    });
    return { img: o.canvas(), ax: 1, ay: H + 1, base: [0, W], foot: 3, step: S };
  }

  /* A zone gateway: two log posts on stone footings, a tiled cap over the beam, knee braces, a carved sign board
     hung on chains with the label in caps, lanterns on the posts, a flowering vine up one side.
     posts: each post footing's [l, r] relative to ax (walk between them); lit: the lantern glass. */
  function gateArch(text = 'BELLWOOD') {
    const s = text.toUpperCase(), tw = PX.textWidth(s) * 2, bw = Math.max(52, tw + 14), W = Math.max(104, bw + 44), H = 84, gy = H - 1, cx = Math.floor(W / 2), pl = 9, pr = W - 17, bh = 18, by = 24;
    const glass = [[pl - 7, 38, 3, 4], [pr + 12, 38, 3, 4]];
    const o = inked(W, H, b => {
      for (const x of [pl, pr]) limb(b, [[x + 4, 14, 4], [x + 4, gy - 5, 4]], BARK);
      limb(b, [[pl + 7, 34, 1.6], [pl + 20, 19, 1.6]], BARK); limb(b, [[pr + 1, 34, 1.6], [pr - 12, 19, 1.6]], BARK);
      limb(b, [[2, 15, 4], [W - 3, 15, 4]], BARK);
      tiles(b, 0, 2, W, 9, ['roofR0', 'roofR1', 'roofR2', 'roofR3', 'roofR4']); fill(b, 0, 10, W, 1, 'roofR4');
      // stone footings
      for (const x of [pl - 2, pr - 2]) { fill(b, x, gy - 6, 12, 7, 'stone2'); fill(b, x, gy - 6, 12, 1, 'stone0'); fill(b, x, gy - 5, 1, 6, 'stone1'); fill(b, x + 11, gy - 5, 1, 6, 'stone3'); fill(b, x + 6, gy - 5, 1, 3, 'stone3'); fill(b, x + 1, gy - 2, 10, 1, 'stone3'); fill(b, x, gy, 12, 1, 'stone4'); }
      // the sign on chains
      const bx = cx - Math.floor(bw / 2);
      for (const x of [bx + 6, bx + bw - 7]) for (let y = 20; y < by; y++) px(b, x, y, y & 1 ? 'iron2' : 'iron3');
      fill(b, bx, by, bw, bh, 'wood2'); fill(b, bx + 2, by + 2, bw - 4, bh - 4, 'wood1'); fill(b, bx, by, bw, 1, 'wood0'); fill(b, bx, by + bh - 1, bw, 1, 'wood4'); fill(b, bx + bw - 1, by, 1, bh, 'wood3');
      fill(b, bx + 2, by + 8, bw - 4, 1, 'wood2'); for (const x of [bx + 2, bx + bw - 3]) { px(b, x, by + 2, 'iron2'); px(b, x, by + bh - 3, 'iron2'); }
      label(b, s, cx - Math.floor(tw / 2) + 1, by + 5, 'wood0'); label(b, s, cx - Math.floor(tw / 2), by + 4, 'wood4');
      // lanterns on brackets, outboard of each post
      for (const [gx, gyy] of glass) {
        const side = gx < cx ? 1 : -1, arm = side > 0 ? gx + 3 : gx - 3;
        fill(b, Math.min(arm, side > 0 ? pl : pr + 8), 34, Math.abs(arm - (side > 0 ? pl : pr + 8)) + 1, 1, 'iron4');
        fill(b, gx - 1, gyy - 2, 5, 2, 'iron3'); px(b, gx + 1, gyy - 3, 'iron3'); fill(b, gx - 1, gyy, 1, 4, 'iron3'); fill(b, gx + 3, gyy, 1, 4, 'iron4');
        fill(b, gx, gyy, 3, 4, 'sky2'); px(b, gx, gyy, 'white'); fill(b, gx, gyy + 3, 3, 1, 'sky3'); fill(b, gx - 1, gyy + 4, 5, 1, 'iron4');
      }
      // a flowering vine up the left post
      foliage(b, (x, y) => Math.abs(x - pl - 3 + Math.sin(y * 0.3) * 2) < 4 && y > 26 && y < gy - 8, [pl - 4, 24, pl + 10, gy - 6], LEAF.green, 5, { cw: 6, ch: 5, dx: 4, dy: 3 });
      for (let y = 30; y < gy - 10; y += 7) head(b, pl + 2 + ((y >> 3) & 1) * 3, y, 'pink');
    });
    return done(o, cx, gy, { posts: [[pl - 2 - cx, pl + 10 - cx], [pr - 2 - cx, pr + 10 - cx]], foot: 6, lit: glass.map(rect1), label: s });
  }

  /* A well under a little tiled roof on two posts: a crank and rope, a bucket hanging over the stone ring. */
  function wellRoofed(roof = 'roofR') {
    const W = 42, H = 54, gy = H - 1, cx = 21, R = [0, 1, 2, 3, 4].map(k => roof + k);
    const o = inked(W, H, b => {
      for (const x of [4, W - 8]) { fill(b, x, 12, 4, gy - 22, 'wood3'); fill(b, x, 12, 1, gy - 22, 'wood2'); fill(b, x + 3, 12, 1, gy - 22, 'wood4'); }
      // the ring: a block-coursed front under a lit rim around dark water
      for (let y = gy - 13; y <= gy; y++) {
        const k = y - (gy - 13), inset = y >= gy - 1 ? gy - y + 1 : 0, row = k >> 2, sy = k & 3;
        for (let x = cx - 18 + inset; x <= cx + 18 - inset; x++) { const sx = (x + (row & 1) * 3) % 7; px(b, x, y, sy === 3 || sx === 0 ? 'stone3' : sy === 0 ? 'stone1' : x > cx + 12 ? 'stone3' : 'stone2'); }
      }
      fill(b, cx - 16, gy, 33, 1, 'stone4');
      disc(b, cx, gy - 14, 18, 5, 'stone1'); disc(b, cx, gy - 14, 18, 5 - 1, 'stone0'); disc(b, cx, gy - 15, 14, 3, 'stone3'); disc(b, cx, gy - 14, 13, 2, 'w4'); fill(b, cx - 9, gy - 15, 18, 1, 'w5'); fill(b, cx + 3, gy - 13, 4, 1, 'w1');
      for (let x = cx - 16; x < cx - 10; x++) px(b, x, gy - 17 + ((x * 3) % 2), 'g2');
      // crank, rope and bucket
      fill(b, 8, 16, W - 16, 3, 'wood3'); fill(b, 8, 16, W - 16, 1, 'wood2'); fill(b, cx - 4, 15, 8, 5, 'wall2'); for (let x = cx - 3; x < cx + 4; x += 2) fill(b, x, 15, 1, 5, 'wall3');
      fill(b, cx, 20, 1, 8, 'wall3'); fill(b, W - 4, 17, 3, 1, 'iron3'); fill(b, W - 2, 17, 1, 6, 'iron3'); fill(b, W - 3, 22, 3, 2, 'wood2');
      fill(b, cx - 3, 28, 7, 6, 'wood2'); fill(b, cx - 3, 28, 7, 1, 'wood1'); fill(b, cx + 2, 28, 2, 6, 'wood3'); fill(b, cx - 3, 30, 7, 1, 'iron3'); fill(b, cx - 2, 33, 5, 1, 'wood4'); fill(b, cx - 2, 27, 5, 1, 'iron3');
      tiles(b, 0, 0, W, 12, R); fill(b, 0, 11, W, 1, R[4]); fill(b, 3, 12, W - 6, 2, 'wood3'); fill(b, 3, 13, W - 6, 1, 'wood4');
    });
    return done(o, cx, gy, { base: [-18, 18], foot: 10, shadow: [20, 5] });
  }

  /* An iron street lamp about 40 tall: a stepped plinth, a slim post with collars, a glass lantern under a peaked cap.
     lit: the lantern glass. */
  function streetLamp() {
    const W = 15, H = 42, cx = 7, gy = H - 1, glass = [cx - 3, 5, 7, 7];
    const o = inked(W, H, b => {
      fill(b, cx - 5, gy - 1, 11, 2, 'iron4'); fill(b, cx - 4, gy - 5, 9, 4, 'iron3'); fill(b, cx - 4, gy - 5, 9, 1, 'iron1'); fill(b, cx - 4, gy - 4, 1, 3, 'iron2'); fill(b, cx + 4, gy - 4, 1, 3, 'iron4');
      fill(b, cx - 1, 14, 3, gy - 19, 'iron3'); fill(b, cx - 1, 14, 1, gy - 19, 'iron2'); fill(b, cx + 1, 14, 1, gy - 19, 'iron4');
      for (const y of [14, 27]) { fill(b, cx - 2, y, 5, 2, 'iron3'); fill(b, cx - 2, y, 5, 1, 'brass1'); }
      px(b, cx, 0, 'brass1'); fill(b, cx - 1, 1, 3, 1, 'iron2'); fill(b, cx - 3, 2, 7, 1, 'iron3'); fill(b, cx - 5, 3, 11, 2, 'iron4'); fill(b, cx - 5, 3, 11, 1, 'iron2');
      fill(b, cx - 4, 5, 9, 7, 'iron3'); fill(b, cx - 3, 5, 3, 7, 'sky2'); fill(b, cx + 1, 5, 3, 7, 'sky2'); fill(b, cx - 3, 11, 7, 1, 'sky3'); fill(b, cx, 5, 1, 7, 'iron3');
      px(b, cx - 3, 6, 'white'); px(b, cx - 3, 7, 'white'); px(b, cx + 1, 6, 'white'); fill(b, cx - 4, 12, 9, 1, 'iron3'); fill(b, cx - 2, 13, 5, 1, 'iron4');
    });
    return done(o, cx, gy, { base: [-4, 4], foot: 3, lit: [rect1(glass)], shadow: [5, 2] });
  }

  /* The children's marble ring scratched in the bare earth of a lawn (Night 2): a worn patch, the ring's line, the
     marbles of clay and glass inside and the big shooter outside. Flat on the ground, so it is drawn from its top row
     and anyone standing on or below it draws over it. */
  function marbleRing() {
    const W = 56, H = 22, cx = W / 2, cy = H / 2, b = new Buf(W, H);
    // the line scratched through the grass with a stick, broken where the grass grew back; inside it the grass worn
    // thin in clumps by knees and elbows, so the lawn still shows through
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const e = ((x + 0.5 - cx) / 26) ** 2 + ((y + 0.5 - cy) / 10) ** 2, n = hash(x, y, 31), wear = KIT.vnoise(x / 5, y / 3, 7);
      if (e > 0.7 && e < 0.86) { if (hash(Math.floor(x / 3), 0, 5) > 0.15) px(b, x, y, n < 0.7 ? 'dirt4' : 'dirt3'); }
      else if (e <= 0.7 && wear * (1.2 - e) > 0.45) px(b, x, y, n < 0.3 ? 'dirt2' : 'dirt3');
    }
    // the marbles: glass with a lit fleck, and one clay; the shooter waiting outside the line
    const marble = (x, y, c, d) => { fill(b, x, y, 2, 2, c); px(b, x + 1, y + 1, d); px(b, x, y, 'white'); };
    [[20, 7, 'sky1', 'water3'], [28, 10, 'roofR1', 'roofR3'], [33, 6, 'yellow', 'orange'], [24, 13, 'grass1', 'grass3'], [32, 13, 'lilac', 'dusk5'], [16, 11, 'dirt1', 'dirt4']]
      .forEach(([x, y, c, d]) => marble(x, y, c, d));
    fill(b, 47, 17, 3, 3, 'water2'); px(b, 47, 17, 'white'); fill(b, 48, 19, 2, 1, 'water4'); px(b, 49, 18, 'water4');
    return { img: b.canvas(), ax: Math.round(cx), ay: 0, below: H + 24 };
  }

  /* A wooden bucket with iron bands, a wire handle and water in it. */
  function bucket() {
    const W = 12, H = 13, gy = H - 1;
    const o = inked(W, H, b => {
      stamp(b, 0, 0, ['...####...', '.##....##.', '#........#', '#........#'], { '#': 'iron3' });
      for (let y = 4; y <= gy; y++) { const i = Math.round((y - 4) / 4); fill(b, i, y, W - i * 2, 1, 'wood2'); px(b, i, y, 'wood1'); fill(b, W - i - 2, y, 2, 1, 'wood3'); for (let x = i + 3; x < W - i - 2; x += 3) px(b, x, y, 'wood3'); }
      fill(b, 0, 4, W, 2, 'wood1'); fill(b, 2, 4, W - 4, 1, 'w3'); fill(b, 3, 4, 2, 1, 'w1');
      for (const y of [7, 10]) { const i = Math.round((y - 4) / 4); fill(b, i, y, W - i * 2, 1, 'iron3'); px(b, i, y, 'iron1'); }
      fill(b, 1, gy, W - 2, 1, 'wood4');
    });
    return done(o, W / 2, gy, { base: [-5, 5], foot: 3, shadow: [5, 1] });
  }

  /* A straw broom standing on its bristles, ready to lean on a wall. */
  function broom() {
    const W = 10, H = 30, gy = H - 1;
    const o = inked(W, H, b => {
      for (let y = 0; y < 20; y++) { const x = 6 - Math.round(y / 10); px(b, x, y, 'wood1'); px(b, x + 1, y, 'wood3'); }
      fill(b, 2, 19, 6, 2, 'roofR2'); fill(b, 2, 19, 6, 1, 'roofR1');
      for (let y = 21; y <= gy; y++) { const i = Math.max(0, 2 - Math.round((y - 21) / 3)); fill(b, i, y, W - i * 2, 1, 'brass1'); px(b, i, y, 'brass0'); px(b, W - i - 1, y, 'brass3'); for (let x = i + 2; x < W - i - 1; x += 2) px(b, x, y, y > 23 ? 'brass2' : 'brass1'); }
      for (let x = 0; x < W; x += 2) b.set(x, gy, 0);
    });
    return done(o, W / 2, gy, { shadow: [4, 1] });
  }

  /* A terracotta pot with a plant: flowers, a clipped ball, tall blades or tulips; colour picks the flowers' colour, and
     cracked runs a crack down its side. */
  function flowerPot(seed = 1, colour, cracked) {
    const r = rng(seed * 71 + 3), kind = seed % 4, W = 16, H = 23, gy = H - 1, cx = 8, rim = gy - 9;
    const colours = ['rose', 'yellow', 'lilac', 'white', 'orange', 'pink'], picked = colours[(r() * colours.length) | 0], c = colour || picked;
    const o = inked(W, H, b => {
      if (kind === 0) bloomMound(b, cx, rim - 4, 7, 4.5, [c], seed, 5);
      if (kind === 1) { fill(b, cx, rim - 4, 1, 4, 'wood3'); foliage(b, inE(cx, rim - 8, 6, 6), [cx - 6, rim - 14, cx + 6, rim - 2], LEAF.deep, seed, { cw: 6, ch: 5, dx: 4, dy: 3 }); }
      if (kind === 2) for (const [dx, h] of [[-4, 7], [-1, 11], [2, 9], [4, 6]]) { fill(b, cx + dx, rim - h, 2, h, LEAF.deep[2]); px(b, cx + dx + 1, rim - h, LEAF.deep[1]); fill(b, cx + dx + 1, rim - h + 2, 1, h - 2, LEAF.deep[4]); px(b, cx + dx, rim - h + 4, LEAF.deep[0]); }
      if (kind === 3) for (const [dx, h, k] of [[-4, 8, 0], [0, 11, 1], [4, 7, 0]]) {
        const tc = k ? 'yellow' : 'red', [c0, c1] = FLOWER[tc];
        fill(b, cx + dx, rim - h + 2, 1, h - 2, LEAF.green[3]); px(b, cx + dx - 1, rim - 3, LEAF.green[2]); px(b, cx + dx + 1, rim - 4, LEAF.green[2]);
        fill(b, cx + dx - 1, rim - h - 1, 3, 3, c0); fill(b, cx + dx + 1, rim - h - 1, 1, 3, c1); px(b, cx + dx, rim - h - 2, c0);
      }
      fill(b, cx - 5, rim - 1, 11, 1, 'e2');
      fill(b, cx - 6, rim, 13, 3, 'roofR2'); fill(b, cx - 6, rim, 13, 1, 'roofR0'); fill(b, cx - 6, rim + 1, 1, 1, 'roofR1'); fill(b, cx - 6, rim + 2, 13, 1, 'roofR3');
      for (let y = rim + 3; y <= gy; y++) { const i = Math.round((y - rim - 3) / 3); fill(b, cx - 5 + i, y, 11 - i * 2, 1, 'roofR2'); px(b, cx - 5 + i, y, 'roofR1'); fill(b, cx + 4 - i, y, 2, 1, 'roofR3'); }
      fill(b, cx - 3, gy, 7, 1, 'roofR4');
      if (cracked) for (const [x, y] of [[cx + 1, rim + 1], [cx + 1, rim + 2], [cx, rim + 3], [cx, rim + 4], [cx + 1, rim + 5], [cx - 1, rim + 5]]) px(b, x, y, 'roofR4');
    });
    return done(o, cx, gy, { base: [-5, 5], foot: 3, shadow: [6, 1] });
  }

  /* A window box of mixed flowers with trailing leaves, on two brackets. Hang it so (ax, ay) sits on the wall just
     under a window sill; it is part of the wall, not a standing object. */
  function windowBox() {
    const W = 26, H = 15, gy = H - 1, top = gy - 7;
    const o = inked(W, H, b => {
      bloomMound(b, 13, top - 2, 12, 4, ['rose', 'yellow', 'white'], 9, 7);
      fill(b, 0, top, W, 5, 'wood2'); fill(b, 0, top, W, 1, 'wood1'); fill(b, 1, top + 2, W - 2, 1, 'wood3'); fill(b, 0, top + 4, W, 1, 'wood4'); px(b, 0, top + 1, 'wood1'); fill(b, W - 1, top, 1, 5, 'wood3');
      for (const [x, n] of [[3, 3], [10, 2], [19, 4]]) for (let i = 0; i < n; i++) { px(b, x + (i & 1), top + 1 + i, LEAF.green[2 + (i & 1)]); }
      for (const x of [3, W - 6]) stamp(b, x, top + 5, ['###', '.##', '..#'], { '#': 'wood4' });
    });
    return done(o, W / 2, gy);
  }

  /* ---------------- bugs: the only animals, a bit smaller than an ant ---------------- */
  /* A ladybug, side view facing right: a red dome with black spots, a dark head with a white eye. */
  function ladybug() {
    const W = 15, H = 10, gy = H - 1;
    const o = inked(W, H, b => {
      for (const x of [2, 5, 8]) { px(b, x, gy, 'iron4'); px(b, x + 1, gy - 1, 'iron4'); }
      orb(b, 6, 5.5, 6, 5.5, RED, (_, y) => y <= gy - 1); fill(b, 1, gy - 1, 11, 1, 'roofR3');
      fill(b, 3, 2, 2, 2, 'iron4'); fill(b, 7, 3, 2, 2, 'iron4'); fill(b, 4, 6, 2, 1, 'iron4'); px(b, 9, 6, 'iron4'); px(b, 2, 1, 'white'); px(b, 3, 1, 'roofR0');
      orb(b, 12.5, 5.5, 2.5, 2.5, IRON); px(b, 13, 4, 'white'); px(b, 14, 5, 'white'); px(b, 13, 1, 'iron4'); px(b, 14, 2, 'iron4');
    });
    return done(o, 7, gy, { shadow: [5, 1] });
  }

  /* A snail: a spiral shell on a soft body, eye stalks up, facing right. */
  function snail() {
    const W = 18, H = 14, gy = H - 1;
    const o = inked(W, H, b => {
      fill(b, 1, gy - 2, 14, 3, 'cream1'); fill(b, 1, gy - 2, 14, 1, 'cream0'); fill(b, 1, gy, 14, 1, 'cream2'); px(b, 0, gy, 'cream2');
      fill(b, 13, gy - 6, 4, 6, 'cream1'); fill(b, 13, gy - 6, 1, 6, 'cream0'); fill(b, 16, gy - 5, 1, 5, 'cream2');
      for (const [x0, x1] of [[14, 13], [16, 17]]) { px(b, x0, gy - 7, 'cream1'); px(b, x1, gy - 8, 'cream1'); px(b, x1, gy - 9, 'cream2'); px(b, x1, gy - 10, 'ink2'); }
      px(b, 15, gy - 3, 'rose');
      orb(b, 7, gy - 6, 5.5, 5.5, ['wood0', 'wood1', 'wood2', 'wood3']);
      for (let t = 0.6; t < 11; t += 0.2) { const rr = 4.6 - t * 0.38; if (rr < 0.6) break; px(b, Math.round(7 + Math.cos(t) * rr - 0.5), Math.round(gy - 6 + Math.sin(t) * rr * 0.95 - 0.5), 'wood4'); }
      px(b, 4, gy - 9, 'white');
    });
    return done(o, 9, gy, { shadow: [7, 1] });
  }

  /* A butterfly seen from above, wings flapping: frames open, half, closed, half at 8 fps. Colours by seed.
     (ax, ay) is its body centre; it flies, so it has no footprint. */
  const WINGS = [['light0', 'yellow', 'brass2', 'brass3'], ['sky1', 'blue', 'roofB2', 'roofB3'], ['white', 'cloud1', 'cloud3', 'stone3'], ['light1', 'orange', 'light4', 'roofR3'], ['cloud0', 'pink', 'dusk3', 'roofR3']];
  function butterfly(seed = 1) {
    const R = WINGS[seed % WINGS.length], W = 15, H = 12, cx = 7;
    const frames = [1, 0.55, 0.15, 0.55].map(open => inked(W, H, b => {
      for (const s of [-1, 1]) {
        const ux = cx + s * (0.5 + 3.5 * open), lx = cx + s * (0.5 + 2.4 * open);
        orb(b, ux + 0.5, 4, Math.max(0.6, 3.6 * open), 3.5, [R[0], R[1], R[1], R[2]]); orb(b, lx + 0.5, 8.5, Math.max(0.5, 2.5 * open), 2.5, [R[0], R[1], R[2], R[2]]);
        if (open > 0.5) { px(b, Math.round(cx + s * 6), 1, R[3]); px(b, Math.round(cx + s * 5), 1, R[3]); px(b, Math.round(cx + s * 3), 4, R[0]); }
      }
      fill(b, cx, 3, 1, 7, 'iron4'); px(b, cx, 2, 'iron3'); px(b, cx - 1, 1, 'iron4'); px(b, cx + 1, 1, 'iron4'); px(b, cx - 2, 0, 'iron4'); px(b, cx + 2, 0, 'iron4');
    }).canvas());
    return { img: frames[0], frames, fps: 8, ax: cx + 1, ay: 7 };
  }

  /* A small beetle, side view facing right: a glossy shell in green, blue, lilac or brown; a horn or feelers. */
  const SHELL = [['roofG0', 'roofG1', 'roofG2', 'roofG3'], ['roofB0', 'roofB1', 'roofB2', 'roofB3'], ['lilac', 'dusk4', 'dusk5', 'roofB4'], ['wood1', 'wood2', 'wood3', 'wood4']];
  function beetle(seed = 1) {
    const R = SHELL[seed % 4], W = 17, H = 11, gy = H - 1;
    const o = inked(W, H, b => {
      for (const x of [2, 6, 10]) { px(b, x + 1, gy - 1, 'iron4'); px(b, x, gy, 'iron4'); }
      orb(b, 6.5, 6, 6.5, 5.5, R, (_, y) => y <= gy - 1); fill(b, 1, gy - 2, 11, 1, R[3]);
      px(b, 3, 2, 'white'); px(b, 4, 2, 'white'); px(b, 2, 3, 'white');
      orb(b, 13.5, 6.5, 2.5, 3, IRON); orb(b, 15.5, 7, 1.5, 1.5, IRON); px(b, 15, 6, 'white');
      if (seed % 2) { px(b, 15, 4, 'iron3'); px(b, 16, 3, 'iron3'); px(b, 16, 2, 'iron2'); } else { px(b, 15, 4, 'iron4'); px(b, 16, 3, 'iron4'); px(b, 16, 1, 'iron4'); px(b, 16, 2, 'iron4'); }
    });
    return done(o, 8, gy, { shadow: [6, 1] });
  }

  /* A dragonfly seen from above, head right: two pairs of glassy wings that flick (2 frames, 12 fps).
     (ax, ay) is its body centre. */
  function dragonfly() {
    const W = 22, H = 16, cy = 7;
    const frames = [0.18, -0.18].map(sw => inked(W, H, b => {
      for (const [rx, k] of [[11, -1], [14, 1]]) for (const s of [-1, 1]) {
        const a = s * Math.PI / 2 - s * k * (0.3 + sw), dx = Math.cos(a), dy = Math.sin(a), L = 8;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const ox = x - rx, oy = y - cy - (s > 0 ? 1 : 0), al = ox * dx + oy * dy, pp = ox * -dy + oy * dx;
          if (al < 0.5 || al > L || Math.abs(pp) > 1.5 * Math.sqrt(1 - ((al - L / 2) / (L / 2 + 0.5)) ** 2)) continue;
          px(b, x, y, Math.abs(pp) < 0.5 ? 'sky3' : al > L - 1.5 ? 'w2' : 'sky1');
        }
      }
      fill(b, 1, cy, 11, 2, 'w3'); fill(b, 1, cy + 1, 11, 1, 'w4'); for (let x = 3; x < 12; x += 3) fill(b, x, cy, 1, 2, 'w5');
      fill(b, 11, cy - 1, 5, 4, 'w3'); fill(b, 11, cy - 1, 5, 1, 'w2'); disc(b, 17, cy + 0.5, 2, 2, 'roofG1'); px(b, 17, cy - 1, 'white'); px(b, 18, cy, 'roofG3');
    }).canvas());
    return { img: frames[0], frames, fps: 12, ax: 11, ay: cy + 2 };
  }

  /* A firefly: a little dark bug whose tail glows in stepped bands, brightening and fading (6 frames, 8 fps).
     A night light: draw it ungraded. (ax, ay) is the glowing tail. */
  function firefly() {
    const W = 11, H = 11, tx = 4, ty = 6;
    const bug = inked(5, 3, b => { fill(b, 1, 0, 3, 2, 'iron4'); px(b, 4, 1, 'iron3'); px(b, 2, 0, 'cloud1'); px(b, 0, 1, 'light2'); });
    const frames = [0, 1, 2, 2, 1, 0].map(k => {
      const f = new Buf(W, H);
      if (k === 2) disc(f, tx, ty, 3, 3, 'light2');
      if (k >= 1) disc(f, tx, ty, 2, 2, 'light1');
      disc(f, tx, ty, 1, 1, k ? 'light0' : 'light2');
      for (let y = 0; y < bug.h; y++) for (let x = 0; x < bug.w; x++) { const v = bug.get(x, y); if (v && !(x === 1 && y === 2)) f.set(tx - 1 + x, ty - 2 + y, v); }
      return f.canvas();
    });
    return { img: frames[0], frames, fps: 8, ax: tx, ay: ty, light: true };
  }

  Object.assign(VIL, { oak, birch, blossom, fruitTree, willow, deadTree, fern, reeds, lilyPad, mushrooms, flowerClump, hedge, vegRow, boulder, log, logPile, stumpBig, bench2, crateStack, sacks, cart, beetleCart, woodFence, pickets, gateArch, wellRoofed, streetLamp, bucket, broom, marbleRing, flowerPot, windowBox, ladybug, snail, butterfly, beetle, dragonfly, firefly });
})();
