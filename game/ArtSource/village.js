'use strict';
/* The village kit: Bellwood drawn the way a top-down RPG village pack draws it. A 16 px tile grid, bold colour,
   a dark ink outline on everything that stands up, hard shadows, and real height: cliff faces, roofs over short
   walls, grass lips that overhang their edges.

   VIL.ground(rows, opts) paints a tile map (one character per 16 px tile) into { canvas, blocked(x, y), level(x, y) }.
   Every sprite maker returns { img, ax, ay } with (ax, ay) the feet, plus what the world needs to know about it. */
(() => {
  const { Buf, u32, hash, vnoise } = KIT, rng = PX.rng, P = PX.PAL;
  const T = 16;
  const C = {
    ink: P.ink,
    // grass, lightest to darkest
    g0: '#b5ec6a', g1: '#83d34c', g2: '#5fba3f', g3: '#469d39', g4: '#327d36', g5: '#235c32',
    // path dirt
    d0: '#f4cf94', d1: '#e5b276', d2: '#d29a60', d3: '#b97c4b', d4: '#8c5838',
    // water
    w0: '#eafcff', w1: '#9ce6f8', w2: '#55c0ec', w3: '#3a9ddb', w4: '#2e7bc0', w5: '#22558f',
    // grey rock
    r0: '#ebe7ee', r1: '#c6c0cf', r2: '#a19bb0', r3: '#7c7690', r4: '#5a5470', r5: '#3d3850',
    // earth (river banks)
    e0: '#c98d5b', e1: '#a26744', e2: '#7a4931', e3: '#552f24',
  };
  const col = c => C[c] || P[c] || c;
  const rgb = c => KIT.rgbOf(col(c));
  // A darker copy of an opaque u32 colour: what a hard shadow does to the ground.
  const SHADE = [0.6, 0.68, 0.8];
  const shade = v => {
    const r = (v & 255) * SHADE[0], g = ((v >>> 8) & 255) * SHADE[1], b = ((v >>> 16) & 255) * SHADE[2];
    return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  };

  /* ---------------- ground ---------------- */
  /* rows: one character per tile.
       g grass   f forest floor (shaded grass)   d path   p paving   s sand   ~ water   _ sea (water that beaches meet)
       = bridge deck over water
       (walkable)   h stairs down a cliff face
     Upper case is the same one level up, or o.level(tx, ty) gives each tile's level (0, 1, 2, ...). A level stands FACE px above the one below it: its cliff face is
     drawn on the lower tiles south of its edge, so leave two lower tiles there (or stairs).
     Edges are rounded from the tile grid and roughened, so a run of tiles reads as one shape, not as squares. */
  const FACE = 28, BANK = 6;
  function ground(rows, o = {}) {
    const seed = o.seed || 1, TW = rows[0].length, TH = rows.length, W = TW * T, H = TH * T;
    const tile = (tx, ty) => rows[Math.min(TH - 1, Math.max(0, ty))][Math.min(TW - 1, Math.max(0, tx))];
    // Per-tile values become per-pixel fields, box-blurred twice (a soft ramp across each tile edge): a run of tiles
    // reads as one rounded shape, and a staircase of tiles as a diagonal.
    const levelAt = o.level || ((tx, ty) => { const ch = tile(tx, ty); return ch >= 'A' && ch <= 'Z' ? 1 : 0; });
    const raw = f => { const a = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) a[y * W + x] = f(tile((x / T) | 0, (y / T) | 0), (x / T) | 0, (y / T) | 0); return a; };
    function blur(a, r) {
      if (!r) return a;
      const t = new Float32Array(W * H), n = 2 * r + 1;
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < H; y++) { let s = 0; for (let k = -r; k <= r; k++) s += a[y * W + Math.min(W - 1, Math.max(0, k))]; for (let x = 0; x < W; x++) { t[y * W + x] = s / n; s += a[y * W + Math.min(W - 1, x + r + 1)] - a[y * W + Math.max(0, x - r)]; } }
        for (let x = 0; x < W; x++) { let s = 0; for (let k = -r; k <= r; k++) s += t[Math.min(H - 1, Math.max(0, k)) * W + x]; for (let y = 0; y < H; y++) { a[y * W + x] = s / n; s += t[Math.min(H - 1, y + r + 1) * W + x] - t[Math.max(0, y - r) * W + x]; } }
      }
      return a;
    }
    const wob = (x, y, k) => (vnoise(x / 9, y / 9, seed + k) - 0.5) * 0.36 + (hash(x >> 1, y >> 1, seed + k) - 0.5) * 0.08;
    const WET = blur(raw(ch => +'~=_'.includes(ch)), 7), LAND = blur(raw((ch, tx, ty) => levelAt(tx, ty)), 7);
    const DIRT = blur(raw(ch => +'dD'.includes(ch)), 7), PAVE = blur(raw(ch => +'pP'.includes(ch)), 9);
    const SAND = blur(raw(ch => +'sS_'.includes(ch)), 5), WOOD = blur(raw(ch => +'fF'.includes(ch)), 6);

    // Per pixel: level and material.
    const lv = new Int8Array(W * H), mat = new Uint8Array(W * H), floor = new Uint8Array(W * H), M = { g: 0, d: 1, p: 2, w: 3, h: 4, s: 5 };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, here = tile((x / T) | 0, (y / T) | 0);
      if (here === 'h') { lv[i] = levelAt((x / T) | 0, (y / T) | 0); mat[i] = M.h; continue; }
      if (WET[i] + wob(x, y, 4) * 0.5 > 0.5) { lv[i] = -1; mat[i] = M.w; continue; }
      lv[i] = Math.round(LAND[i] + wob(x, y, 0) * 0.6);
      // Paths and paving win where their field passes one half; grass pokes into paths in tufts.
      const blade = ((x * 5 + ((y * 3) >> 2)) & 3) === 0 ? 0.1 : 0;
      // Where a path meets sand there is no grass between them: the stronger of the two takes the pixel.
      const dd = DIRT[i] + wob(x, y, 1) - blade, sd = SAND[i] + wob(x, y, 3);
      mat[i] = PAVE[i] > 0.5 ? M.p : dd > 0.5 || (dd + sd > 0.5 && dd >= sd) ? M.d : sd > 0.5 || dd + sd > 0.5 ? M.s : M.g;
      if (mat[i] === M.g && WOOD[i] + wob(x, y, 5) * 0.6 > 0.5) floor[i] = 1;
    }
    const L = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? lv[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))] : lv[y * W + x]);
    const MA = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 255 : mat[y * W + x]);

    // Faces: walking down each column, a drop in level hangs a face under the edge (FACE per level, BANK into water).
    // face[i] = rows below the edge + 1 (0: not a face); faceH[i] = that face's full height.
    const face = new Uint8Array(W * H), faceH = new Uint8Array(W * H);
    for (let x = 0; x < W; x++) {
      let top = -1, h = 0, from = 0;
      for (let y = 1; y < H; y++) {
        const i = y * W + x, a = lv[i - W], b = lv[i];
        if (b < a && mat[i] !== M.h && !(b < 0 && mat[i - W] === M.s)) { top = y; from = a; h = b < 0 ? FACE * a + BANK : FACE * (a - b); }
        if (top >= 0 && y - top < h && lv[i] < from && mat[i] !== M.h) {
          // A face ends early in a scalloped bottom: rounded lumps, one per rock column.
          const k = y - top, lump = b < 0 && from === 0 ? 0 : [0, 1, 2, 2, 1, 0, 0, 1, 1, 0][(x + (hash(x >> 3, 0, seed) * 9 | 0)) % 10];
          if (k < h - lump) { face[i] = k + 1; faceH[i] = h; continue; }
        }
        if (lv[i] >= from) top = -1;
      }
    }

    // Boulders on a face: jittered cell centres (12 x 9 px cells, rows offset); a pixel belongs to the nearest one.
    // Returns the nearest and second-nearest distances and the offset from its centre (-1..1).
    function boulder(x, k) {
      const cy = Math.floor(k / 9); let d1 = 1e9, d2 = 1e9, ox = 0, oy = 0;
      for (let j = cy - 1; j <= cy + 1; j++) {
        const shift = (j & 1) * 6, cx = Math.floor((x - shift) / 12);
        for (let i = cx - 1; i <= cx + 1; i++) {
          const px0 = i * 12 + shift + 2 + hash(i, j, seed + 21) * 8, py0 = j * 9 + 1 + hash(i, j, seed + 22) * 6;
          const dx = (x - px0) / 1.25, dy = k - py0, d = Math.sqrt(dx * dx + dy * dy);
          if (d < d1) { d2 = d1; d1 = d; ox = dx / 6; oy = dy / 5; } else if (d < d2) d2 = d;
        }
      }
      return [d1, d2, Math.max(-1, Math.min(1, ox)), Math.max(-1, Math.min(1, oy))];
    }
    const b = new Buf(W, H), U = c => u32(col(c));
    const GR = ['g0', 'g1', 'g2', 'g3', 'g4', 'g5'].map(U), DI = ['d0', 'd1', 'd2', 'd3', 'd4'].map(U);
    const WA = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5'].map(U), RK = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5'].map(U), EA = ['e0', 'e1', 'e2', 'e3'].map(U);
    const SA = ['#fdf3d2', '#f4e1ae', '#e6c98e', '#cfa96c'].map(U), FL = [U('#3f9238'), U('#378634')];
    const GRP = U('#5ab43e'), INK = U('ink'), PV = ['#f3e6cc', '#dccaa6', '#c3ad88', '#94805f'].map(U);
    const isGrass = (x, y) => MA(x, y) === M.g && !face[y * W + x];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, m = mat[i], f = face[i];
      let c;
      if (f) {
        const k = f - 1, h = faceH[i];
        if (lv[i] < 0 && h === BANK) {                      // an earth bank into the water
          c = k === 0 ? EA[0] : k < 3 ? EA[1] : k < h - 1 ? EA[2] : EA[3];
          if (k > 0 && k < h - 1 && hash(x >> 1, y, seed + 7) < 0.15) c = EA[k < 3 ? 2 : 1];
        } else {                                            // a rock face: rounded boulders, each lit from the upper left
          const [d1, d2, sx, sy] = boulder(x, k);
          c = d2 - d1 < 1.6 ? RK[4] : RK[2];
          if (c === RK[2]) { const l = -sx * 0.6 - sy * 0.8; c = l > 0.45 ? RK[0] : l > 0.1 ? RK[1] : l > -0.35 ? RK[2] : RK[3]; }
          if (k < 3) c = k === 0 ? INK : RK[5];               // the lip's shadow
          else if (k < 5 && c !== RK[4]) c = RK[3];
          if (k >= h - 2) c = k === h - 1 ? INK : RK[4];     // the foot
        }
      } else if (m === M.w) {
        c = WA[3];
        const wave = vnoise(x / 40, y / 11, seed + 11);    // calm: broad, rare light and dark swells
        if (wave > 0.76) c = WA[2]; else if (wave < 0.2) c = WA[4];
        if (((x + (y >> 1) * 5) % 13 === 0 || (x + (y >> 1) * 5) % 13 === 1) && y % 6 === 0 && hash(x >> 3, y >> 2, seed) < 0.35) c = WA[1];
        // Shade under the bank, foam along the shore.
        let up = 0; while (up < 4 && L(x, y - up - 1) < 0 && !face[(y - up - 1) * W + x]) up++;
        if (up < 4 && (L(x, y - up - 1) >= 0 || face[Math.max(0, y - up - 1) * W + x])) c = up < 2 ? WA[5] : WA[4];
        const shore = [[1, 0], [-1, 0], [0, 1]].some(([dx, dy]) => L(x + dx, y + dy) >= 0 && !face[Math.max(0, Math.min(H - 1, y + dy)) * W + Math.max(0, Math.min(W - 1, x + dx))]);
        if (shore) c = WA[0];
        else { let sd = 0; while (sd < 7 && MA(x, y - sd - 1) !== M.s && MA(x - sd - 1, y) !== M.s && MA(x + sd + 1, y) !== M.s) sd++; if (sd < 7) c = sd < 2 ? WA[1] : sd < 5 ? WA[2] : c; }
      } else if (m === M.h) {                               // stairs: treads every 6 px between stone cheeks
        let l = x, r = x;
        while (l > 0 && MA(l - 1, y) === M.h) l--; while (r < W - 1 && MA(r + 1, y) === M.h) r++;
        const k = y % 6;
        c = k === 0 ? RK[0] : k < 3 ? RK[1] : k === 5 ? RK[4] : RK[3];
        if (x - l < 3 || r - x < 3) c = x - l === 0 || r - x === 0 ? INK : RK[2];
      } else if (m === M.p) {                               // paving: big flagstones of mixed widths, soft joints, a kerb at the front
        const row = Math.floor(y / 10), sw = 13 + ((hash(row, 3, seed) * 7) | 0), sx = (x + row * 7) % sw, sy = y % 10;
        const stone = hash(Math.floor((x + row * 7) / sw), row, seed);
        c = sx === 0 || sy === 9 ? PV[2] : sy === 0 || sx === 1 ? PV[0] : stone < 0.22 ? PV[0] : PV[1];
        if (sx === 0 && sy === 9) c = PV[3];
        if ([[2, 0], [-2, 0], [0, -2]].some(([dx, dy]) => MA(x + dx, y + dy) !== M.p)) c = [[1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => MA(x + dx, y + dy) !== M.p) ? PV[3] : PV[2];
        if (MA(x, y + 1) !== M.p && MA(x, y + 1) !== 255) c = INK; else if (MA(x, y + 2) !== M.p || MA(x, y + 3) !== M.p) c = PV[3];
      } else if (m === M.s) {                               // sand: flat, darker and wet near the water, a few ripples
        c = vnoise(x / 18, y / 7, seed + 9) > 0.84 ? SA[0] : SA[1];   // flat, with a few small wind streaks
        if ([[0, 1], [0, 2], [1, 0], [-1, 0], [0, 3]].some(([dx, dy]) => MA(x + dx, y + dy) === M.w)) c = SA[3];
        else if ([[0, 4], [0, 5], [2, 0], [-2, 0]].some(([dx, dy]) => MA(x + dx, y + dy) === M.w)) c = SA[2];
        if (isGrass(x, y - 1)) c = SA[3]; else if (isGrass(x, y - 2)) c = SA[2];
      } else if (m === M.d) {
        // Flat path, worn lighter in broad patches; pebbles are stamped on afterwards.
        c = vnoise(x / 30, y / 20, seed + 3) > 0.64 ? DI[1] : DI[2];
        // Grass edges are a step up: the path darkens under a grass edge to the north.
        if (isGrass(x, y - 1) || isGrass(x, y - 2)) c = DI[4];
        else if (isGrass(x, y - 3)) c = DI[3];
      } else {
        // Flat grass with a few broad, quiet patches; sprigs are stamped on afterwards.
        c = floor[i] ? FL[vnoise(x / 26, y / 18, seed + 6) > 0.6 ? 1 : 0] : vnoise(x / 40, y / 28, seed + 5) > 0.66 ? GRP : GR[2];
        // The edge onto a path or the paving below: a dark rim, the step's shadow.
        const dn = MA(x, y + 1), dn2 = MA(x, y + 2);
        if ((dn === M.d || dn === M.p || dn === M.s) && !face[Math.min(H - 1, y + 1) * W + x]) c = GR[5];
        else if ((dn2 === M.d || dn2 === M.p || dn2 === M.s) && !face[Math.min(H - 1, y + 2) * W + x]) c = GR[4];
        else if ([[1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => [M.d, M.p].includes(MA(x + dx, y + dy)))) c = GR[1];
        if (MA(x - 1, y) === M.w || MA(x + 1, y) === M.w) c = GR[4];
        // A lip over a face below: the edge rolls over in a dark rim.
        if (face[Math.min(H - 1, y + 1) * W + x] && L(x, y + 1) < L(x, y)) c = GR[4];
        else if (face[Math.min(H - 1, y + 2) * W + x] && L(x, y + 2) < L(x, y)) c = GR[2];
        else if (y + 3 < H && face[(y + 3) * W + x] && L(x, y + 3) < L(x, y)) c = GR[1];
      }
      b.set(x, y, c);
    }
    // The grass lip hangs over the top of a face in tufts; side edges of a level get an ink line.
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (face[i] === 1 && MA(x, y - 1) === M.g) {
        const n = [0, 1, 2, 1, 0, 1, 3, 2, 0, 1, 2, 0][(x + (hash(x >> 2, 9, seed) * 12 | 0)) % 12];
        for (let k = 0; k < n; k++) b.set(x, y + k, k === n - 1 ? GR[4] : GR[3]);
        if (n) b.set(x, y + n, INK);
      }
      if (!face[i] && lv[i] >= 0 && (L(x - 1, y) < lv[i] || L(x + 1, y) < lv[i]) && !face[i - 1] && !face[i + 1] && mat[i] !== M.s) b.set(x, y, INK);
      if (!face[i] && lv[i] >= 0 && L(x, y - 1) < lv[i] && !face[i - W] && mat[i] !== M.s) b.set(x, y, INK);
    }
    // Sprigs on open grass and pebbles on paths, one chance per 7 x 6 cell, only where the ground is plain.
    const SPRIG = [['1.1', '.3.'], ['.1.', '1.1', '.3.'], ['1..1', '.33.'], ['.1', '13', '3.']], PEBBLE = [['.0', '34'], ['0.', '43', '.4'], ['00.', '334']];
    for (let cy = 0; cy < H; cy += 6) for (let cx = 0; cx < W; cx += 7) {
      const r = hash(cx, cy, seed + 40), x = cx + ((hash(cx, cy, seed + 41) * 5) | 0), y = cy + ((hash(cx, cy, seed + 42) * 3) | 0);
      const plain = (set, ok) => { for (let j = -1; j < 4; j++) for (let i = -1; i < 5; i++) if (!ok(x + i, y + j) || !set.includes(b.get(x + i, y + j))) return false; return true; };
      if (r < 0.3 && plain([GR[2], GRP], isGrass)) {
        const st = SPRIG[(hash(cx, cy, seed + 43) * SPRIG.length) | 0], base = b.get(x, y) === GRP;
        st.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') b.set(x + i, y + j, row[i] === '1' ? (base ? GR[1] : GR[1]) : GR[base ? 4 : 3]); });
      } else if (r < 0.12 && plain([DI[1], DI[2]], (i, j) => MA(i, j) === M.d && !face[j * W + i])) {
        const st = PEBBLE[(hash(cx, cy, seed + 44) * PEBBLE.length) | 0];
        st.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') b.set(x + i, y + j, row[i] === '0' ? DI[0] : row[i] === '3' ? DI[3] : DI[4]); });
      }
    }
    // Contact shadow along the foot of a face.
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!face[i] && lv[i] >= 0 && face[i - W] && faceH[i - W] > BANK) { b.d[i] = shade(b.d[i]); if (y + 1 < H && !face[i + W]) b.d[i + W] = shade(b.d[i + W]); }
    }

    const canvas = b.canvas();
    const stairs = (x, y) => [-4, -2, 0, 2, 4].some(d => MA(x, y + d) === M.h);   // the steps, and the lip rows above and below them
    return {
      w: W, h: H, canvas, buf: b, tile,
      level: (x, y) => L(x | 0, y | 0),
      mat: (x, y) => 'gdpwhs'[MA(x | 0, y | 0)],
      forest: (x, y) => floor[(y | 0) * W + (x | 0)] === 1,
      // Feet may not stand in water, on a face, or at a level's side edge.
      blocked: (x, y) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return true; const i = y * W + x; return stairs(x, y) ? false : lv[i] < 0 && tile(x / T | 0, y / T | 0) !== '=' || face[i] > 0; },
    };
  }

  // Hard shadows on a ground canvas: ellipses [cx, cy, rx, ry] and rects ['r', x, y, w, h], darkened once each pixel.
  function shadows(cv, list) {
    const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height), p = new Uint32Array(d.data.buffer), hit = new Uint8Array(cv.width * cv.height);
    const mark = (x, y) => { if (x >= 0 && y >= 0 && x < cv.width && y < cv.height && !hit[y * cv.width + x]) { hit[y * cv.width + x] = 1; p[y * cv.width + x] = shade(p[y * cv.width + x]); } };
    for (const s of list) {
      if (s[0] === 'r') { for (let y = s[2]; y < s[2] + s[4]; y++) for (let x = s[1]; x < s[1] + s[3]; x++) mark(x, y); continue; }
      const [cx, cy, rx, ry] = s;
      for (let dy = -ry; dy <= ry; dy++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) ** 2)))); for (let dx = -hw; dx <= hw; dx++) mark(cx + dx, cy + dy); }
    }
    g.putImageData(d, 0, 0);
  }

  /* ---------------- sprites ---------------- */
  // Draw fills on a Buf, then wrap every opaque shape in a 1 px ink outline (the result is 2 px larger).
  function inked(w, h, draw) {
    const b = new Buf(w, h); draw(b);
    const out = new Buf(w + 2, h + 2), I = u32(C.ink);
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      const v = b.get(x, y);
      if (v) { out.set(x + 1, y + 1, v); continue; }
      if (b.get(x - 1, y) || b.get(x + 1, y) || b.get(x, y - 1) || b.get(x, y + 1)) out.set(x + 1, y + 1, I);
    }
    return out;
  }
  const fill = (b, x, y, w, h, c) => b.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), col(c));
  const px = (b, x, y, c) => b.set(x, y, col(c));
  function disc(b, cx, cy, rx, ry, c) {
    for (let dy = -ry; dy <= ry; dy++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) ** 2)))); fill(b, cx - hw, cy + dy, hw * 2 + 1, 1, c); }
  }

  // Leaf ramps: light to dark.
  const LEAF = {
    green: ['#d4f57a', '#9ddc58', '#6cc04a', '#4a9e42', '#357c3d', '#245a35', '#173f2c'],
    deep: ['#a9de7a', '#73c25a', '#4fa14c', '#378144', '#28653c', '#1c4a33', '#123327'],
    teal: ['#9fe0a6', '#68c38c', '#43a07a', '#2f8068', '#236353', '#184840', '#10322e'],
    autumn: ['#ffe9a0', '#ffd060', '#f2a640', '#d27b34', '#a8562c', '#7a3a26', '#4f2620'],
    blossom: ['#fff0f6', '#ffd0e4', '#f8a8cc', '#e37fae', '#bd5f91', '#8e4474', '#5e2d52'],
  };
  /* Foliage the way the packs draw it: small rounded leaf clumps laid in offset rows like scales, each with a lit top
     and a dark hem, every lower row overlapping the one above. Clumps toward the upper left of the shape take lighter
     tones, the bottom of the shape the darkest. inside(x, y) is the shape; (cx, cy, rx, ry) its centre and extent. */
  // A clump is a rounded blob cw x ch: lit cap at the upper left, body, dark hem along the bottom and right.
  function clumpShape(cw, ch) {
    const rows = [];
    for (let j = 0; j < ch; j++) {
      let r = '';
      for (let i = 0; i < cw; i++) {
        const u = (i + 0.5) / cw * 2 - 1, v = (j + 0.5) / ch * 2 - 1;
        if (u * u + v * v > 1.08) { r += '.'; continue; }
        const lit = -u * 0.5 - v * 0.9;
        r += v > 0.55 || (u > 0.75 && v > -0.2) ? 'c' : lit > 0.55 ? 'a' : 'b';
      }
      rows.push(r);
    }
    return rows;
  }
  function foliage(b, inside, box, ramp, seed, o = {}) {
    const [x0, y0, x1, y1] = box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
    const cw = o.cw || 10, ch = o.ch || 8, dx = o.dx || 7, dy = o.dy || 5, shapes = [clumpShape(cw, ch), clumpShape(cw + 2, ch + 1), clumpShape(cw - 2, ch - 1)], clumps = [];
    for (let r = 0, y = y0 - ch / 2; y < y1; r++, y += dy) for (let x = x0 - cw / 2 + ((r & 1) ? dx / 2 : 0); x < x1; x += dx) {
      const jx = Math.round(x + (hash(x | 0, y | 0, seed) - 0.5) * 5), jy = Math.round(y + (hash(x | 0, y | 0, seed + 1) - 0.5) * 3);
      const mx = jx + cw / 2, my = jy + ch / 2;
      if (!inside(mx, my)) continue;
      const nx = (mx - cx) / rx, ny = (my - cy) / ry;
      let t = Math.round(1.2 + nx * 0.8 + ny * 1.3 + (o.tone ? o.tone(mx, my) : 0) + (hash(x | 0, y | 0, seed + 2) - 0.5) * 0.8);
      t = Math.max(0, Math.min(ramp.length - 4, t));
      clumps.push([jx, jy, t, hash(x | 0, y | 0, seed + 3), shapes[(hash(x | 0, y | 0, seed + 4) * 3) | 0]]);
    }
    // A dark underlayer shows in the gaps; upper clumps are drawn last, each one's hem over the lit caps below it.
    for (const [jx, jy, t, , sh] of clumps) sh.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') b.set(jx + i, jy + j + 1, u32(ramp[Math.min(ramp.length - 1, t + 3)])); });
    for (const [jx, jy, t, k2, sh] of clumps.reverse()) {
      sh.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const k = row[i]; if (k !== '.') b.set(jx + i, jy + j, u32(ramp[k === 'a' ? t : k === 'b' ? t + 1 : t + 2])); } });
      if (t <= 1 && k2 < 0.5) b.set(jx + Math.round(sh[0].length * 0.3), jy + 1, u32(ramp[0]));
    }
  }
  const inEllipse = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const anyOf = fs => (x, y) => fs.some(f => f(x, y));

  // A trunk with a root flare: bark lit on the left, a dark seam, roots splayed on the ground.
  function trunkAt(b, cx, top, bottom, tw) {
    const tx = Math.round(cx - tw / 2);
    fill(b, tx, top, tw, bottom - top, 'wood3'); fill(b, tx, top, 2, bottom - top, 'wood2'); fill(b, tx + tw - 2, top, 2, bottom - top, 'wood4');
    for (let y = top + 3; y < bottom - 3; y += 5) fill(b, tx + 2 + ((y >> 2) & 1), y, 1, 3, 'wood4');
    fill(b, tx - 2, bottom - 3, tw + 4, 3, 'wood3'); fill(b, tx - 2, bottom - 3, 2, 3, 'wood2');
    fill(b, tx - 4, bottom - 1, 3, 2, 'wood4'); fill(b, tx + tw + 1, bottom - 1, 3, 2, 'wood4'); fill(b, tx + 2, bottom - 1, 2, 2, 'wood4');
  }

  /* A round broadleaf: a lumpy crown of leaf clumps over a short trunk; a branch fork shows under the crown.
     r: crown radius. */
  function tree(o = {}) {
    const r = o.r || 22, seed = o.seed || 1, ramp = LEAF[o.leaf || 'green'], rnd = rng(seed);
    const w = r * 2 + 12, trunkH = o.trunk || Math.round(r * 0.6), h = Math.round(r * 1.7) + trunkH + 6;
    const cx = w / 2, cy = Math.round(r * 0.85) + 3;
    const parts = [inEllipse(cx, cy, r * 0.92, r * 0.78)];
    for (let k = 0; k < 6; k++) { const a = Math.PI * (0.9 + k * 0.24) + rnd() * 0.3, d = r * 0.62; parts.push(inEllipse(cx + Math.cos(a) * d * 1.05, cy + Math.sin(a) * d * 0.8, r * 0.42, r * 0.36)); }
    const crown = anyOf(parts);
    const out = inked(w, h, b => {
      const tw = Math.max(6, Math.round(r * 0.34)), bottom = h - 2;
      trunkAt(b, cx, cy + Math.round(r * 0.3), bottom, tw);
      // the fork: two limbs into the crown's underside
      for (let k = 0; k < Math.round(r * 0.35); k++) { px(b, Math.round(cx - tw / 2 - k * 0.8), cy + Math.round(r * 0.55) - k, 'wood4'); px(b, Math.round(cx + tw / 2 + k * 0.8) - 1, cy + Math.round(r * 0.5) - k, 'wood4'); }
      foliage(b, crown, [Math.round(cx - r), cy - Math.round(r * 0.95), Math.round(cx + r), cy + Math.round(r * 0.72)], ramp, seed);
      if (o.fruit) for (let k = 0; k < 9; k++) { const fx = Math.round(cx + (rnd() - 0.5) * r * 1.4), fy = Math.round(cy + (rnd() - 0.5) * r); if (crown(fx, fy) && b.get(fx, fy)) { fill(b, fx, fy, 2, 2, o.fruit); px(b, fx, fy, 'white'); } }
    });
    return { img: out.canvas(), ax: Math.round(cx) + 1, ay: h - 1, r, shadow: [Math.round(r * 0.9), Math.round(r * 0.34)] };
  }

  /* A pine: a cone of leaf clumps in tiers with a ragged hem each, over a stub of trunk. */
  function pine(o = {}) {
    const hgt = o.h || 64, seed = o.seed || 1, ramp = LEAF[o.leaf || 'teal'];
    const wid = Math.round(hgt * 0.6), w = wid + 10, h = hgt + 6, cx = w / 2, tiers = Math.max(3, Math.round(hgt / 18));
    const inside = (x, y) => {
      if (y < 0 || y > hgt - 6) return false;
      const f = y / (hgt - 6), t = Math.min(tiers - 1, Math.floor(f * tiers)), ft = f * tiers - t;
      const half = (wid / 2) * (0.1 + 0.9 * f) * (0.6 + 0.4 * ft) - 3;
      return Math.abs(x - cx) <= half;
    };
    const out = inked(w, h, b => {
      fill(b, Math.round(cx) - 3, hgt - 10, 6, 14, 'wood4'); fill(b, Math.round(cx) - 3, hgt - 10, 2, 14, 'wood3');
      foliage(b, inside, [Math.round(cx - wid / 2), 0, Math.round(cx + wid / 2), hgt - 6], ramp, seed, { cw: 8, ch: 6, dx: 6, dy: 4, tone: (x, y) => { const f = y / (hgt - 6) * tiers; return f - Math.floor(f) > 0.7 ? 0.8 : 0; } });
    });
    return { img: out.canvas(), ax: Math.round(cx) + 1, ay: h - 1, shadow: [Math.round(wid * 0.4), Math.round(wid * 0.14)] };
  }

  // A low bush: a mound of the same clumps; berries or flowers dotted on the lit side.
  function bush(o = {}) {
    const r = o.r || 9, seed = o.seed || 1, ramp = LEAF[o.leaf || 'green'], rnd = rng(seed), w = r * 3 + 6, h = r * 2 + 4;
    const shape = anyOf([inEllipse(w / 2, h - r, r * 1.3, r * 0.9), inEllipse(w / 2 - r * 0.5, h - r * 1.3, r * 0.7, r * 0.6), inEllipse(w / 2 + r * 0.5, h - r * 1.2, r * 0.75, r * 0.6)]);
    const out = inked(w, h, b => {
      foliage(b, shape, [Math.round(w / 2 - r * 1.3), 1, Math.round(w / 2 + r * 1.3), h - 2], ramp, seed, { cw: 8, ch: 6, dx: 5, dy: 4 });
      for (let y = h - 1; y < h + 2; y++) for (let x = 0; x < w; x++) b.set(x, y, 0);
      if (o.berries) for (let k = 0; k < r; k++) { const fx = Math.round(w / 2 + (rnd() - 0.6) * r * 1.6), fy = Math.round(h - r * 1.2 + (rnd() - 0.5) * r); if (b.get(fx, fy) && b.get(fx + 1, fy + 1)) { fill(b, fx, fy, 2, 2, o.berries); px(b, fx, fy, 'white'); } }
    });
    return { img: out.canvas(), ax: Math.round(w / 2) + 1, ay: h, shadow: [Math.round(r * 1.4), Math.round(r * 0.4)] };
  }

  /* A house the way a farming RPG draws one: a big shingled roof as the main shape, a short wall under deep eaves,
     a stone footing. o: { w, wall, roof: 'roofR' | 'roofB' | 'roofG', roofH, walls: 'plaster' | 'planks' | 'stone',
     door: x from the left, open: dark doorway, windows: [x, ...], chimney: x }. The feet line is the footing's
     front; base is the wall's span for the walk mask, door is the doorway's centre (on the feet line). */
  function house(o = {}) {
    const ww = o.w || 128, wallH = o.wall || 50, roofH = o.roofH || 58, over = 5, R = o.roof || 'roofR', seed = o.seed || 1;
    const w = ww + over * 2, h = roofH + wallH + 4 + (o.chimney != null ? 8 : 0), top = h - wallH - 4 - roofH, eave = top + roofH;
    const r = k => P[R + k];
    const doorX = o.door != null ? o.door : Math.round(ww / 2 - 11), dw = 22, dh = 36;
    const out = inked(w, h, b => {
      // walls
      const wx = over, wy = eave - 3, wb = h - 4;
      const WALL = { plaster: ['wall0', 'wall1', 'wall2', 'wall3'], planks: ['wood1', 'wood2', 'wood2', 'wood3'], stone: ['stone1', 'stone2', 'stone2', 'stone3'] }[o.walls || 'plaster'];
      fill(b, wx, wy, ww, wb - wy, WALL[1]);
      if (o.walls === 'planks') for (let x = wx + 5; x < wx + ww; x += 6) fill(b, x, wy, 1, wb - wy, 'wood4');
      else if (o.walls === 'stone') for (let y = wy; y < wb; y += 5) for (let x = wx + ((y / 5) & 1) * 4; x < wx + ww - 1; x += 8) { fill(b, x, y, 1, Math.min(5, wb - y), 'stone3'); fill(b, x, Math.min(y + 4, wb - 1), Math.min(8, wx + ww - x), 1, 'stone3'); px(b, x + 1, y, 'stone0'); }
      else { fill(b, wx, wy, 3, wb - wy, 'wood3'); fill(b, wx + ww - 3, wy, 3, wb - wy, 'wood4'); fill(b, wx, wy + 4, ww, 3, 'wood3'); fill(b, wx, wy + 4, ww, 1, 'wood2'); }
      fill(b, wx + ww - 6, wy, 3, wb - wy, WALL[2]);
      // footing
      for (let x = wx - 1; x < wx + ww + 1; x += 6) { fill(b, x, wb, 6, 4, 'stone2'); fill(b, x, wb, 6, 1, 'stone1'); fill(b, x + 5, wb, 1, 4, 'stone3'); }
      // windows
      for (const x0 of o.windows || []) {
        const gx = wx + x0, gy = wy + 12, gw = 16, gh = 16;
        fill(b, gx - 2, gy - 2, gw + 4, gh + 4, 'wood4'); fill(b, gx - 2, gy - 2, gw + 4, 1, 'wood2');
        fill(b, gx, gy, gw, gh, 'sky3'); fill(b, gx, gy, gw, 3, 'sky1'); fill(b, gx, gy + gh - 3, gw, 3, 'sky4');
        fill(b, gx + gw / 2 - 1, gy, 2, gh, 'wood3'); fill(b, gx, gy + gh / 2 - 1, gw, 2, 'wood3');
        px(b, gx + 1, gy + 1, 'white'); px(b, gx + 2, gy + 1, 'white'); px(b, gx + 1, gy + 2, 'white');
        fill(b, gx - 3, gy + gh + 2, gw + 6, 3, 'wood3'); fill(b, gx - 3, gy + gh + 2, gw + 6, 1, 'wood1');
        if (o.flowers) for (let k = 0; k < gw + 4; k += 3) { px(b, gx - 2 + k, gy + gh + 1, k % 2 ? 'rose' : 'yellow'); px(b, gx - 1 + k, gy + gh + 1, 'cap2'); }
      }
      // door
      const dx = wx + doorX, dy = wb - dh;
      fill(b, dx - 2, dy - 3, dw + 4, dh + 3, 'wood4'); fill(b, dx - 2, dy - 3, dw + 4, 1, 'wood2');
      if (o.open) { fill(b, dx, dy, dw, dh, '#1d1420'); fill(b, dx, dy + dh - 6, dw, 6, '#2c2030'); fill(b, dx + 2, dy + 2, 3, dh - 4, '#3a2a36'); }
      else {
        fill(b, dx, dy, dw, dh, 'wood2');
        for (let x = dx + 3; x < dx + dw; x += 4) fill(b, x, dy, 1, dh, 'wood3');
        fill(b, dx, dy, dw, 2, 'wood3'); fill(b, dx + dw - 5, dy + 18, 2, 2, 'brass1');
      }
      fill(b, dx - 4, wb, dw + 8, 4, 'stone1'); fill(b, dx - 4, wb + 3, dw + 8, 1, 'stone3');
      // roof: shingle rows, a ridge cap, gable ends that flare out toward the eaves
      // Shingles 8 x 6 with rounded lower corners, half-offset per row; the slope darkens toward the eaves.
      for (let y = top; y < eave; y++) {
        const f = (y - top) / roofH, inset = Math.round((1 - f) * 3), ry = y - top - 5;
        for (let x = inset; x < w - inset; x++) {
          const row = Math.floor(ry / 6), sx = (x + (row & 1) * 4) % 8, sy = ry % 6;
          const lo = f < 0.4 ? 0 : 1, mid = f < 0.4 ? 1 : 2;
          // Tiles 8 x 6, half-offset per row: a light top edge, a dark hem, dark joints; one in five is weathered darker.
          const tileK = hash(Math.floor((x + (row & 1) * 4) / 8), row, seed + 30), body = tileK < 0.2 ? r(2) : f > 0.6 && tileK < 0.5 ? r(2) : r(1);
          let c = sy === 0 ? (sx === 0 ? r(2) : r(lo)) : sy === 5 ? r(3) : sx === 0 ? r(3) : sy === 4 ? r(mid) : body;
          if (sy === 1 && sx === 1 && tileK > 0.5) c = r(0);
          if (x - inset < 2 || w - inset - x <= 2) c = x - inset === 0 || w - inset - x === 1 ? r(4) : r(3);
          if (ry < 0) c = [r(3), r(0), r(0), r(1), r(2)][ry + 5];        // the ridge cap
          px(b, x, y, c);
        }
      }
      fill(b, 0, eave - 3, w, 3, r(3)); fill(b, 0, eave - 3, w, 1, r(2)); fill(b, 0, eave, w, 1, r(4));
      // eave shadow on the wall
      fill(b, wx, eave + 1, ww, 3, WALL[3]);
      if (o.chimney != null) { const cx0 = o.chimney; fill(b, cx0, top - 8, 9, 14, 'stone2'); fill(b, cx0, top - 8, 9, 2, 'stone1'); fill(b, cx0 + 6, top - 6, 3, 12, 'stone3'); fill(b, cx0 + 1, top - 9, 7, 2, 'stone4'); }
    });
    const img = out.canvas();
    return { img, ax: Math.round(w / 2) + 1, ay: h - 4 + 1, base: [over + 1 - w / 2 - 1, w / 2 - over - 1], foot: wallH - 2, door: over + 1 + doorX + dw / 2 - (w / 2 + 1), shadow: ['r', 0, 0, w, 6] };
  }

  /* Small props. */
  function fence(n = 3) { // n posts, 8 px apart, two rails
    const w = (n - 1) * 8 + 4, h = 16;
    const out = inked(w, h, b => {
      fill(b, 0, 4, w, 3, 'wood2'); fill(b, 0, 4, w, 1, 'wood1'); fill(b, 0, 10, w, 3, 'wood3'); fill(b, 0, 10, w, 1, 'wood2');
      for (let k = 0; k < n; k++) { const x = k * 8; fill(b, x, 1, 4, 15, 'wood3'); fill(b, x, 1, 1, 15, 'wood1'); fill(b, x + 3, 1, 1, 15, 'wood4'); fill(b, x + 1, 0, 2, 1, 'wood2'); }
    });
    return { img: out.canvas(), ax: 1, ay: h + 1 };
  }
  function lampPost() { // a wooden T-post with two hanging lanterns
    const out = inked(22, 38, b => {
      fill(b, 9, 4, 4, 34, 'wood3'); fill(b, 9, 4, 1, 34, 'wood1'); fill(b, 12, 4, 1, 34, 'wood4'); fill(b, 7, 34, 8, 4, 'wood4');
      fill(b, 1, 3, 20, 3, 'wood3'); fill(b, 1, 3, 20, 1, 'wood1');
      for (const x of [2, 15]) { fill(b, x + 2, 6, 1, 2, 'iron3'); fill(b, x, 8, 5, 7, 'iron3'); fill(b, x + 1, 9, 3, 5, 'light1'); px(b, x + 1, 9, 'light0'); fill(b, x, 15, 5, 1, 'iron4'); }
    });
    return { img: out.canvas(), ax: 12, ay: 39, glass: [[3, 10, 3, 5], [16, 10, 3, 5]] };
  }
  function well() {
    const out = inked(30, 34, b => {
      fill(b, 2, 4, 3, 22, 'wood3'); fill(b, 25, 4, 3, 22, 'wood3'); fill(b, 0, 2, 30, 4, 'wood2'); fill(b, 0, 2, 30, 1, 'wood1');
      fill(b, 13, 6, 4, 6, 'wood4'); fill(b, 14, 6, 1, 6, 'iron2');
      disc(b, 15, 24, 13, 7, 'stone2'); disc(b, 15, 22, 12, 5, 'stone1'); disc(b, 15, 22, 9, 3, '#1d2a38');
      for (let x = 3; x < 28; x += 5) { fill(b, x, 26, 1, 5, 'stone3'); }
      fill(b, 2, 29, 26, 2, 'stone3');
    });
    return { img: out.canvas(), ax: 16, ay: 34, shadow: [14, 4] };
  }
  function barrel() {
    const out = inked(12, 14, b => {
      fill(b, 1, 0, 10, 14, 'wood2'); fill(b, 0, 2, 12, 10, 'wood2'); fill(b, 1, 0, 2, 14, 'wood1'); fill(b, 9, 0, 3, 14, 'wood3');
      fill(b, 0, 3, 12, 1, 'iron3'); fill(b, 0, 10, 12, 1, 'iron3'); fill(b, 2, 0, 8, 2, 'wood3');
    });
    return { img: out.canvas(), ax: 7, ay: 15, shadow: [6, 2] };
  }
  function crate() {
    const out = inked(14, 13, b => {
      fill(b, 0, 0, 14, 13, 'wood2'); fill(b, 0, 0, 14, 3, 'wood1'); fill(b, 1, 4, 12, 8, 'wood3');
      for (let k = 0; k < 8; k++) { px(b, 2 + k + 1, 4 + k, 'wood1'); px(b, 3 + k, 4 + k, 'wood1'); }
      fill(b, 0, 12, 14, 1, 'wood4');
    });
    return { img: out.canvas(), ax: 8, ay: 14, shadow: [7, 2] };
  }
  function rock(o = {}) {
    const rx = o.rx || 7, ry = o.ry || 5, w = rx * 2 + 1, h = ry * 2 + 1;
    const out = inked(w, h, b => {
      disc(b, rx, ry, rx, ry, 'r2'); disc(b, rx - 1, ry - 1, rx - 2, ry - 2, 'r1'); disc(b, rx - 2, ry - 2, Math.max(1, rx - 5), Math.max(1, ry - 3), 'r0');
      fill(b, 1, h - 2, w - 2, 2, 'r3');
    });
    return { img: out.canvas(), ax: rx + 1, ay: h + 1 };
  }
  function stump() {
    const out = inked(16, 12, b => {
      fill(b, 2, 3, 12, 8, 'wood3'); fill(b, 0, 9, 16, 3, 'wood3'); fill(b, 2, 3, 3, 8, 'wood2'); fill(b, 11, 3, 3, 9, 'wood4');
      disc(b, 8, 3, 6, 2, 'wood1'); disc(b, 8, 3, 3, 1, 'wood2'); px(b, 8, 3, 'wood3');
    });
    return { img: out.canvas(), ax: 9, ay: 13 };
  }
  function signpost(o = {}) {
    const out = inked(26, 30, b => {
      fill(b, 11, 4, 4, 26, 'wood3'); fill(b, 11, 4, 1, 26, 'wood1');
      fill(b, 0, 4, 26, 9, 'wood2'); fill(b, 0, 4, 26, 1, 'wood1'); fill(b, 0, 12, 26, 1, 'wood4');
      fill(b, 3, 7, 20, 1, 'wood4'); fill(b, 3, 9, 14, 1, 'wood4');
      fill(b, 2, 15, 22, 7, 'wood2'); fill(b, 2, 15, 22, 1, 'wood1'); fill(b, 5, 18, 16, 1, 'wood4');
      void o;
    });
    return { img: out.canvas(), ax: 14, ay: 31, shadow: [6, 2] };
  }
  function hay() {
    const out = inked(22, 18, b => {
      disc(b, 11, 10, 10, 8, '#e8b93a'); disc(b, 10, 8, 8, 6, '#ffd860'); disc(b, 8, 6, 4, 3, '#fff0a0');
      for (let k = 0; k < 9; k++) px(b, 4 + k * 2, 14 + (k % 2), '#c48f2a');
    });
    return { img: out.canvas(), ax: 12, ay: 19, shadow: [10, 3] };
  }
  // Flowers and grass tufts are drawn straight onto the ground (they never stand above the feet).
  function flowers(b, x, y, seed, n = 6, spread = 14) {
    const rnd = rng(seed), pick = [['white', 'yellow'], ['pink', 'white'], ['yellow', 'orange'], ['lilac', 'white'], ['rose', 'yellow'], ['blue', 'white']][(rnd() * 6) | 0];
    for (let k = 0; k < n; k++) {
      const fx = Math.round(x + (rnd() - 0.5) * spread), fy = Math.round(y + (rnd() - 0.5) * spread * 0.6);
      px(b, fx, fy + 2, 'g4'); px(b, fx - 1, fy, pick[0]); px(b, fx + 1, fy, pick[0]); px(b, fx, fy - 1, pick[0]); px(b, fx, fy + 1, pick[0]); px(b, fx, fy, pick[1]);
    }
  }
  function tuft(b, x, y, seed) {
    const s = hash(x, y, seed) < 0.5;
    const rows = s ? ['.1..1.', '.21.2.', '2232.2', '.3333.'] : ['..1..', '.121.', '23232', '.333.'];
    const key = { 1: 'g0', 2: 'g1', 3: 'g4' };
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (key[r[i]]) px(b, x + i, y + j, key[r[i]]); });
  }

  // A plank bridge deck (drawn on the ground) and its two rails (items): x0..x1 across, y0..y1 the deck.
  function bridge(x0, x1, y0, y1) {
    const deck = new Buf(x1 - x0, y1 - y0);
    for (let x = 0; x < deck.w; x++) for (let y = 0; y < deck.h; y++) {
      const k = x % 6; deck.set(x, y, u32(col(k === 0 ? 'wood4' : k === 1 ? 'wood1' : k === 5 ? 'wood3' : 'wood2')));
      if (y === deck.h - 1) deck.set(x, y, u32(col('wood4')));
    }
    const rail = () => inked(x1 - x0 - 2, 10, b => {
      fill(b, 0, 1, x1 - x0 - 2, 3, 'wood2'); fill(b, 0, 1, x1 - x0 - 2, 1, 'wood1'); fill(b, 0, 3, x1 - x0 - 2, 1, 'wood3');
      for (const x of [0, Math.round((x1 - x0) / 2) - 3, x1 - x0 - 6]) { fill(b, x, 0, 4, 10, 'wood3'); fill(b, x, 0, 1, 10, 'wood1'); fill(b, x + 3, 0, 1, 10, 'wood4'); }
    });
    return { deck: deck.canvas(), rail: rail().canvas() };
  }

  window.VIL = { T, C, col, rgb, shade, FACE, BANK, ground, shadows, inked, fill, px, disc, LEAF, foliage, tree, pine, bush, house, fence, lampPost, well, barrel, crate, rock, stump, signpost, hay, flowers, tuft, bridge };
})();
