'use strict';
/* The Centre of Bellwood, the busy heart: warm cream plaster, red clay brick, bright striped awnings. The fountain,
   Sam's hall, Baker's bakery, the post office (boarded up or reopened), market stalls, the notice board, bunting,
   a bench, a street lamp and the Centre's homes, all on VIL's sprite contract (feet point, base, foot, door, lit,
   smoke). Buildings are composed from a small set of parts below: tile roofs, front gables, walls, windows, doors. */
(() => {
  const V = VIL, { fill, px, disc, inked } = V, { hash } = KIT;

  /* ---------------- colours ---------------- */
  const X = { redL: '#ff8a8a', redD: '#c43a4a', yelD: '#e8b93a', bluD: '#5a8fe0', oraL: '#ffd08a', oraD: '#e0802e', chalk: '#3e5248', soot: '#3a2d3a', dust: '#6d7590' };
  const BUT = ['#fff8d8', '#ffeaa6', '#f4d283', '#d8ad5e'];                 // butter plaster (Mia's)
  const STRIPE = { red: [X.redL, 'red', X.redD], white: ['white', 'cream1', 'cream2'], green: ['cap0', 'cap1', 'cap2'], yellow: ['light1', 'yellow', X.yelD], blue: ['sky2', 'blue', X.bluD], pink: [V.LEAF.blossom[1], 'pink', V.LEAF.blossom[3]], orange: [X.oraL, 'orange', X.oraD] };
  const WALLS = { plaster: ['wall0', 'wall1', 'wall2', 'wall3'], white: ['white', 'wall0', 'wall1', 'wall2'], butter: BUT, brick: ['roofR1', 'roofR2', 'roofR3', 'roofR4'], stone: ['stone0', 'stone1', 'stone2', 'stone3'] };
  // Frames and paint: [lit, body, dark, deepest].
  const WOOD = ['wood1', 'wood2', 'wood3', 'wood4'], TRIM = ['white', 'cream1', 'cream2', 'wall3'], GREEN = ['cap1', 'cap2', 'cap3', 'cap4'];
  const BLUE = ['roofB1', 'roofB2', 'roofB3', 'roofB4'], RED = ['roofR1', 'roofR2', 'roofR3', 'roofR4'], TEAL = ['roofG1', 'roofG2', 'roofG3', 'roofG4'];

  /* ---------------- small tools ---------------- */
  const write = (b, s, x, y, c) => PX.text({ fillRect: (i, j) => px(b, i, j, c) }, s, x, y, c);
  const stamp = (b, x, y, rows, key) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (key[r[i]]) px(b, x + i, y + j, key[r[i]]); });
  function line(b, x0, y0, x1, y1, c, t = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let k = 0; k <= n; k++) fill(b, Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), t, t, c); }
  // What a rect held before drawing over it: keep(x, y) puts one pixel back.
  function saved(b, x, y, w, h) { const s = []; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) s.push(b.get(x + i, y + j)); return (i, j) => b.set(i, j, s[(j - y) * w + (i - x)]); }
  // Round the top of a w-wide rect at (x, y): pixels outside the arch get c (a colour, or a saved() restorer).
  function arch(b, x, y, w, c) {
    const r = w / 2;
    for (let j = 0; j < r; j++) { const hw = Math.sqrt(Math.max(0, r * r - (r - j - 0.5) ** 2)); for (let i = 0; i < w; i++) if (Math.abs(i + 0.5 - r) > hw + 0.35) typeof c === 'function' ? c(x + i, y + j) : px(b, x + i, y + j, c); }
  }

  /* ---------------- building parts ---------------- */
  // One roof tile pixel: R a ramp prefix ('roofR', 'roofB', 'roofG', 'wood'); (u, v) across and down the slope; t one
  // step darker for a slope turned from the light; f 0 at the ridge to 1 at the eave. Tiles 8 x 6 in offset rows.
  function tile(R, u, v, t, f, seed) {
    const r = k => R + Math.max(0, Math.min(4, k + t)), row = Math.floor(v / 6), uu = u + (row & 1) * 4, sx = ((uu % 8) + 8) % 8, sy = ((v % 6) + 6) % 6;
    const k = hash(Math.floor(uu / 8), row, seed);
    if (sy === 5) return r(3);
    if (sx === 0) return r(sy === 0 ? 2 : 3);
    if (sy === 0) return r(f < 0.4 ? 0 : 1);
    if (sy === 4) return r(2);
    if (sy === 1 && sx === 1 && k > 0.55) return r(0);
    return r(k < 0.16 || (f > 0.6 && k < 0.36) ? 2 : 1);
  }
  // A roof seen over its eave: a ridge cap, tile rows, a fascia board. hip: how far the ends step in at the ridge.
  function roof(b, x, y, w, h, R, o = {}) {
    const hip = o.hip ?? 3, seed = o.seed || 1;
    for (let j = 0; j < h; j++) {
      const f = j / h, ins = Math.round((1 - f) * hip);
      for (let i = ins; i < w - ins; i++) {
        let c = j < 5 ? R + [3, 0, 0, 1, 2][j] : tile(R, i, j - 5, 0, f, seed);
        if (i - ins < 2 || w - ins - i <= 2) c = i === ins || i === w - ins - 1 ? R + 4 : R + 3;
        px(b, x + i, y + j, c);
      }
    }
    fill(b, x, y + h - 3, w, 3, R + 3); fill(b, x, y + h - 3, w, 1, R + 2); fill(b, x, y + h, w, 1, R + 4);
  }
  /* A front gable: a ridge that points at the viewer. The front edge is a ^ from the apex (cx, ay) down to the eaves
     at cx ± hw on y = ey; the roof shows as a chevron depth px thick above that edge (left slope lit, right slope a step
     darker) and overhangs 4 px; face(x, y) paints the gable wall in the triangle under it. */
  function gable(b, cx, ay, hw, ey, depth, R, face, seed = 1) {
    const s = (ey - ay) / hw, e = x => Math.round(ay + Math.abs(x - cx) * s);
    if (face) for (let x = cx - hw; x <= cx + hw; x++) for (let y = e(x) + 2; y < ey; y++) face(x, y);
    for (let x = cx - hw - 4; x <= cx + hw + 4; x++) {
      const ex = e(x), dx = x - cx, t = dx > 0 ? 1 : 0;
      for (let y = ex - depth; y <= ex + 2; y++) {
        const v = y - ex + depth;
        let c = y > ex ? R + (y === ex + 2 ? 4 : 3) : y === ex ? R + (t ? 3 : 2) : tile(R, Math.abs(dx) + 3, v + 3, t, v / depth, seed);
        if (Math.abs(dx) <= 1 && y <= ex) c = R + [0, 1, 2][dx + 1];           // the ridge cap
        px(b, x, y, c);
      }
    }
  }
  // A wall panel, flat colour with a shaded right end. kind: plaster | white | butter | brick | stone.
  function wall(b, x, y, w, h, kind = 'plaster', seed = 1) {
    const C = WALLS[kind];
    if (kind === 'brick') {
      fill(b, x, y, w, h, 'wall3');
      for (let j = 0; j < h; j += 4) for (let i = (j >> 2) & 1 ? -4 : 0; i < w; i += 8) {
        const x0 = Math.max(x, x + i), x1 = Math.min(x + w, x + i + 7), k = hash(i, j, seed);
        if (x1 > x0) { fill(b, x0, y + j, x1 - x0, Math.min(3, h - j), k < 0.14 ? 'roofR3' : 'roofR2'); if (k > 0.8) px(b, x0, y + j, 'roofR1'); }
      }
      return;
    }
    if (kind === 'stone') {
      fill(b, x, y, w, h, 'stone1');
      for (let j = 0; j < h; j += 6) for (let i = (j / 6) & 1 ? -6 : 0; i < w; i += 12) { const x0 = Math.max(x, x + i); fill(b, x0, y + j + 5, Math.min(12, x + w - x0), 1, 'stone3'); if (x + i >= x) fill(b, x + i, y + j, 1, Math.min(6, h - j), 'stone3'); if (x + i + 1 >= x) px(b, x + i + 1, y + j, 'stone0'); if (hash(i, j, seed) < 0.2) fill(b, x0 + 2, y + j + 1, 8, 4, 'stone2'); }
      return;
    }
    fill(b, x, y, w, h, C[1]); fill(b, x + w - 3, y, 3, h, C[2]);
  }
  // Half-timber over a wall: a sill and head beam, posts at xs (absolute), a brace in the panels listed in braces.
  function timber(b, x, y, w, h, xs, braces = []) {
    const beam = (bx, by, bw, bh) => { fill(b, bx, by, bw, bh, 'wood4'); fill(b, bx, by, bw > bh ? bw : 1, bw > bh ? 1 : bh, 'wood3'); };
    beam(x, y, w, 3); beam(x, y + h - 3, w, 3);
    xs.forEach((px0, k) => { beam(px0, y, 3, h); if (braces.includes(k) && xs[k + 1]) { const x1 = xs[k + 1]; line(b, px0 + 3, y + h - 4, x1 - 1, y + 3, 'wood4', 2); line(b, px0 + 3, y + h - 5, x1 - 1, y + 2, 'wood3'); } });
  }
  const post = (b, x, y, h) => { fill(b, x, y, 3, h, 'wood3'); fill(b, x, y, 1, h, 'wood2'); fill(b, x + 2, y, 1, h, 'wood4'); };
  // Stone quoins up a wall corner, alternately long and short.
  const quoins = (b, x, y, h, right) => { for (let j = 0, k = 0; j < h - 1; j += 6, k++) { const qw = k & 1 ? 5 : 8, qx = right ? x - qw : x; fill(b, qx, y + j, qw, 5, 'stone1'); fill(b, qx, y + j, qw, 1, 'stone0'); fill(b, qx, y + j + 5, qw, 1, 'stone3'); fill(b, right ? qx : qx + qw - 1, y + j, 1, 5, 'stone2'); } };
  // A stone footing along a wall's foot, 4 px tall.
  const footing = (b, x, y, w) => { for (let i = 0; i < w; i += 6) { fill(b, x + i, y, Math.min(6, w - i), 4, 'stone2'); fill(b, x + i, y, Math.min(6, w - i), 1, 'stone1'); fill(b, x + i + 5, y, 1, 4, 'stone3'); } fill(b, x, y + 3, w, 1, 'stone3'); };
  const eaveShade = (b, x, y, w, kind) => fill(b, x, y, w, 3, (WALLS[kind] || WALLS.plaster)[3]);
  // A patch of plaster worn away to the brick under it.
  const chip = (b, x, y) => stamp(b, x, y, ['.3333..', '3112113', '3222233', '.321123', '..333.'], { 1: 'roofR1', 2: 'roofR2', 3: 'wall3' });

  /* A window: frame, sky glass with a streak and a glint, muntins, a sill. o: frame (ramp), arch, shut (shutter
     ramp), box (two flower colours for a window box), dark (unlit, dusty glass). Returns the glass rect in img px. */
  function win(b, x, y, w, h, o = {}) {
    const [l, m, d] = o.frame || WOOD, keep = o.arch && saved(b, x - 2, y - 2, w + 4, w / 2 + 3);
    if (o.shut) { const [sl, sm, sd] = o.shut, sw = Math.max(5, Math.round(w / 2) - 2); for (const sx of [x - 2 - sw, x + w + 2]) { fill(b, sx, y - 1, sw, h + 2, sm); fill(b, sx, y - 1, sw, 1, sl); fill(b, sx, y - 1, 1, h + 2, sl); fill(b, sx + sw - 1, y - 1, 1, h + 2, sd); for (let j = y + 2; j < y + h; j += 3) fill(b, sx + 1, j, sw - 2, 1, sd); } }
    fill(b, x - 2, y - 2, w + 4, h + 4, m); fill(b, x - 2, y - 2, w + 4, 1, l); fill(b, x - 2, y - 2, 1, h + 4, l); fill(b, x + w + 1, y - 1, 1, h + 3, d);
    if (o.dark) { fill(b, x, y, w, h, X.dust); fill(b, x, y, w, 2, 'stone4'); line(b, x + 1, y + h - 2, x + Math.min(w, h) - 3, y + 2, 'stone3'); }
    else {
      fill(b, x, y, w, h, 'sky3');
      for (let k = 0; k < Math.min(w, h); k++) { px(b, x + k, y + h - 1 - k - Math.round(h * 0.25), 'sky2'); px(b, x + k + 1, y + h - 1 - k - Math.round(h * 0.25), 'sky2'); }
      px(b, x + 1, y + 1, 'white'); px(b, x + 2, y + 1, 'white'); px(b, x + 1, y + 2, 'white');
    }
    const mt = w >= 16 ? 2 : 1;
    if (o.panes !== 0) { fill(b, x + Math.round(w / 2 - mt / 2), y, mt, h, m); fill(b, x, y + Math.round(h / 2 - mt / 2) + (o.arch ? 2 : 0), w, mt, m); }
    if (o.arch) { arch(b, x - 2, y - 2, w + 4, keep); arch(b, x, y, w, m); arch(b, x - 1, y - 1, w + 2, (i, j) => { if (b.get(i, j) && b.get(i, j) !== KIT.u32(V.col(m))) px(b, i, j, l); }); }
    fill(b, x - 3, y + h + 2, w + 6, 2, l); fill(b, x - 3, y + h + 4, w + 6, 1, d);
    if (o.box) {
      fill(b, x - 2, y + h + 5, w + 4, 4, 'wood2'); fill(b, x - 2, y + h + 5, w + 4, 1, 'wood1'); fill(b, x - 2, y + h + 8, w + 4, 1, 'wood4');
      for (let i = 0; i < w + 4; i++) { px(b, x - 2 + i, y + h + 4, i % 3 === 1 ? 'cap1' : 'cap3'); if (i % 3 !== 2) px(b, x - 2 + i, y + h + 3, i % 3 ? 'cap2' : o.box[(i / 3 | 0) & 1]); if (i % 3 === 0) px(b, x - 2 + i, y + h + 2, o.box[(i / 3 | 0) & 1]); }
    }
    return [x + 1, y + 1, w, h];
  }
  /* A door on a wall's foot line (y is its top). o: paint (ramp), arch, double, glass (an upper pane: its rect is
     returned for lit), step (a stone stoop under it). */
  function door(b, x, y, w, h, o = {}) {
    const [l, m, d, dd] = o.paint || WOOD, keep = o.arch && saved(b, x - 2, y - 3, w + 4, w / 2 + 3);
    fill(b, x - 2, y - 3, w + 4, h + 3, 'wood4'); fill(b, x - 2, y - 3, w + 4, 1, 'wood2'); fill(b, x - 2, y - 3, 1, h + 3, 'wood3');
    fill(b, x, y, w, h, m);
    const leaves = o.double ? [[x, w / 2], [x + w / 2, w / 2]] : [[x, w]];
    let glass = null;
    for (const [lx, lw] of leaves) {
      fill(b, lx, y, 1, h, l); fill(b, lx + lw - 1, y, 1, h, d);
      const pw = lw - 6, top = y + (o.arch ? Math.round(lw / 2) : 4);
      if (o.glass) { fill(b, lx + 3, top, pw, 8, 'wood4'); fill(b, lx + 4, top + 1, pw - 2, 6, 'sky3'); px(b, lx + 4, top + 1, 'white'); glass = glass || [lx + 5, top + 2, pw - 2, 6]; }
      else { fill(b, lx + 3, top, pw, 10, d); fill(b, lx + 4, top + 1, pw - 1, 9, m); }
      const p2 = top + 13; fill(b, lx + 3, p2, pw, h - (p2 - y) - 4, d); fill(b, lx + 4, p2 + 1, pw - 1, h - (p2 - y) - 5, m);
    }
    if (o.double) fill(b, x + w / 2 - 1, y, 2, h, dd);
    const kx = o.double ? [x + w / 2 - 3, x + w / 2 + 2] : [x + w - 4];
    for (const k of kx) { fill(b, k, y + Math.round(h * 0.55), 1, 2, 'brass1'); px(b, k, y + Math.round(h * 0.55) + 2, 'brass3'); }
    if (o.arch) { arch(b, x - 2, y - 3, w + 4, keep); arch(b, x, y, w, 'wood4'); }
    if (o.step !== false) { fill(b, x - 4, y + h, w + 8, 4, 'stone1'); fill(b, x - 4, y + h, w + 8, 1, 'stone0'); fill(b, x - 4, y + h + 3, w + 8, 1, 'stone3'); }
    return glass;
  }
  // A brick chimney with a stone cap; returns its smoke point in img px.
  function chimney(b, x, y, h) {
    fill(b, x, y + 3, 10, h - 3, 'roofR2');
    for (let j = y + 6; j < y + h; j += 3) { fill(b, x, j, 10, 1, 'roofR3'); px(b, x + ((j / 3) & 1 ? 3 : 7), j - 2, 'roofR3'); }
    fill(b, x, y + 3, 2, h - 3, 'roofR1'); fill(b, x + 8, y + 3, 2, h - 3, 'roofR3');
    fill(b, x - 1, y, 12, 3, 'stone1'); fill(b, x - 1, y, 12, 1, 'stone0'); fill(b, x + 9, y, 2, 3, 'stone3'); fill(b, x + 2, y, 6, 1, X.soot);
    return [x + 6, y + 1];
  }
  // A striped awning sloping out from the wall: its top in stripes, wider toward the front edge; a scalloped valance.
  function awning(b, x, y, w, d, A, B, sw = 6) {
    for (let j = 0; j < d; j++) { const ins = Math.round((d - 1 - j) * 2 / d); for (let i = ins; i < w - ins; i++) { const S = STRIPE[(Math.floor(i / sw) & 1) ? B : A]; px(b, x + i, y + j, j === 0 ? S[2] : j < 3 ? S[0] : S[1]); } }
    for (let j = 0; j < 6; j++) for (let i = 0; i < w; i++) {
      const k = i % sw, S = STRIPE[(Math.floor(i / sw) & 1) ? B : A], edge = k === 0 || k === sw - 1;
      if (j === 5 && edge) continue;
      px(b, x + i, y + d + j, j === 0 ? S[2] : j === 5 || (j === 4 && edge) ? S[2] : S[1]);
    }
  }
  // An iron bracket arm out from a wall at (x, y), len px long (negative: to the left), with two hooks.
  function bracket(b, x, y, len) {
    const s = Math.sign(len), n = Math.abs(len);
    fill(b, s > 0 ? x : x - n, y, n, 2, 'iron3'); fill(b, s > 0 ? x : x - n, y, n, 1, 'iron2');
    line(b, x + s, y + 7, x + s * 7, y + 1, 'iron3'); px(b, x + s * 3, y + 3, 'iron3');
    fill(b, x, y - 1, 2, 9, 'iron4');
    return [x + s * 4, x + s * (n - 3)];
  }
  function sack(b, x, y, o = {}) { // 11 x 13, standing; o.open shows its contents (a colour) in the mouth
    const [l, m, d] = o.ramp || ['cream0', 'cream1', 'cream2'];
    stamp(b, x, y, o.open ? ['..1111111..', '.122222223.', '.2cccccc33.', '.1cccccc23.', '.122222223.'] : ['....1223...', '....2233...', '...122223..', '..12222223.', '..12222223.'], { 1: l, 2: m, 3: d, c: o.open });
    stamp(b, x, y + 5, ['.122222223.', '12222222223', '12222222233', '12222222233', '12222222233', '.122222233.', '..3333333..', '...........'], { 1: l, 2: m, 3: d });
    if (o.mark) stamp(b, x + 3, y + 7, o.mark, { 1: o.markC || 'wood3' });
  }
  const WHEAT = ['.1.1.', '..1..', '.1.1.', '..1..'];
  const loaf = (b, x, y) => stamp(b, x, y, ['.0112.', '102322', '122233', '.3333.'], { 0: 'wood0', 1: 'wood1', 2: 'wood2', 3: 'wood3' });
  const roll = (b, x, y) => stamp(b, x, y, ['011.', '1123', '.33.'], { 0: 'wood0', 1: 'wood1', 2: 'wood2', 3: 'wood3' });
  const baguette = (b, x, y, n = 12) => { fill(b, x, y, n, 3, 'wood1'); fill(b, x + 1, y, n - 2, 1, 'wood0'); fill(b, x, y + 2, n, 1, 'wood3'); for (let i = 2; i < n - 2; i += 3) px(b, x + i, y + 1, 'wood2'); };
  // A pot of flowers: a terracotta pot under a clump of leaves dotted with two colours.
  function pot(b, x, y, c1 = 'rose', c2 = 'yellow', seed = 1) {
    V.foliage(b, (i, j) => ((i - x - 5) / 6) ** 2 + ((j - y - 4) / 4.5) ** 2 <= 1, [x - 1, y, x + 11, y + 9], V.LEAF.green, seed, { cw: 5, ch: 4, dx: 3, dy: 3 });
    for (let k = 0; k < 5; k++) { const fx = x + 1 + ((hash(k, seed, 3) * 8) | 0), fy = y + 1 + ((hash(k, seed, 4) * 5) | 0); px(b, fx, fy, k & 1 ? c1 : c2); }
    fill(b, x + 1, y + 8, 9, 2, 'roofR1'); fill(b, x + 2, y + 10, 7, 4, 'roofR2'); fill(b, x + 2, y + 10, 1, 4, 'roofR1'); fill(b, x + 7, y + 10, 2, 4, 'roofR3');
  }
  // A clipped hedge: a box of leaf clumps with a flat lit top.
  function hedge(b, x, y, w, h, seed) {
    V.foliage(b, (i, j) => i >= x && i < x + w && j >= y && j < y + h, [x, y, x + w, y + h], V.LEAF.deep, seed, { cw: 7, ch: 5, dx: 5, dy: 4, tone: (i, j) => (j < y + 5 ? -1.2 : 0.3) });
  }
  const pack = (out, w, h, [wx, ww], foot, extra) => { const ax = Math.round(w / 2) + 1; return { img: out.canvas(), ax, ay: h + 1, base: [wx + 1 - ax, wx + ww + 1 - ax], foot, ...extra, door: extra.door != null ? extra.door + 1 - ax : undefined }; };

  /* ---------------- the fountain ---------------- */
  /* A round stone basin with a lit rim and a block-coursed front, water inside, a column with a small upper bowl and a
     spout. frames: 4 at 6 fps; the falling water steps down and the ripples spread. The water spray is drawn after the
     outline, so it stays light. */
  function fountain() {
    const w = 86, cx = 43, cy = 50, rx = 41, ry = 14, fh = 8, h = cy + ry + fh + 2, by = 25;
    const ring = (b, r, c) => { for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2, x = Math.round(cx + Math.cos(t) * r), y = Math.round(cy + 1 + Math.sin(t) * r * 0.32); if (b.get(x, y) === KIT.u32(V.col('w3'))) px(b, x, y, c); } };
    const frames = [0, 1, 2, 3].map(f => {
      const out = inked(w, h, b => {
        // the basin: a front face of blocks under the rim, the rim, the inner wall, the water
        disc(b, cx, cy + fh, rx, ry, 'stone3'); disc(b, cx, cy + fh - 1, rx, ry, 'stone2');
        for (let x = cx - rx; x <= cx + rx; x++) { const top = Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / (rx + 0.5)) ** 2))); px(b, x, top + 1, 'stone1'); if ((x - cx + 200) % 11 === 0) fill(b, x, top + 2, 1, fh - 2, 'stone3'); px(b, x, top + fh, 'stone4'); }
        disc(b, cx, cy, rx, ry, 'stone0'); disc(b, cx + 1, cy + 1, rx - 1, ry - 1, 'stone1');
        disc(b, cx, cy, rx - 5, ry - 3, 'stone3'); disc(b, cx, cy + 1, rx - 5, ry - 4, 'w3');
        for (let x = cx - rx + 8; x < cx + rx - 8; x++) if (b.get(x, cy - ry + 5) === KIT.u32(V.col('w3'))) px(b, x, cy - ry + 5, 'w4');
        ring(b, 7 + ((f * 4) % 16), 'w1'); ring(b, 7 + ((f * 4 + 8) % 16), 'w2'); ring(b, 25 + (f & 1), 'w2');
        for (const [sx, sy] of [[-20, 3], [16, 8]]) { px(b, cx + sx, cy + sy - 3, 'brass1'); px(b, cx + sx + 1, cy + sy - 3, 'brass2'); }
        for (const [sx, sy] of [[-24, 4], [18, 6], [-10, 8], [28, 0]]) { fill(b, cx + sx + (f & 1), cy + sy, 4, 1, 'w1'); px(b, cx + sx + 4 + (f & 1), cy + sy, 'w0'); }
        // the column: a square plinth, a shaft, the small bowl, a knob and the spout
        fill(b, cx - 7, cy - 4, 15, 4, 'stone2'); fill(b, cx - 7, cy - 4, 15, 1, 'stone1'); fill(b, cx - 7, cy - 1, 15, 1, 'stone3');
        fill(b, cx - 4, by + 6, 9, cy - by - 10, 'stone1'); fill(b, cx - 4, by + 6, 2, cy - by - 10, 'stone0'); fill(b, cx + 2, by + 6, 3, cy - by - 10, 'stone2');
        fill(b, cx - 5, cy - 14, 11, 3, 'stone2'); fill(b, cx - 5, cy - 14, 11, 1, 'stone1');
        for (let j = 0; j < 6; j++) { const hw = 13 - j * 2; fill(b, cx - hw, by + j, hw * 2 + 1, 1, j < 2 ? 'stone1' : 'stone2'); px(b, cx + hw, by + j, 'stone3'); }
        disc(b, cx, by, 14, 3, 'stone0'); disc(b, cx, by, 12, 2, 'w2'); fill(b, cx - 10, by - 1, 20, 1, 'w3');
        fill(b, cx - 2, 12, 5, by - 13, 'stone1'); fill(b, cx - 2, 12, 1, by - 13, 'stone0'); fill(b, cx + 2, 12, 1, by - 13, 'stone2');
        disc(b, cx, 11, 3, 2, 'stone1'); px(b, cx - 1, 10, 'stone0');
      });
      // falling water: the jet and its crown of drops arcing into the bowl, sheets off the bowl's lip, splashes
      const o = (x, y, c) => px(out, x + 1, y + 1, c);
      for (let y = 1; y < 10; y++) { o(cx, y, (y + f) % 3 ? 'w0' : 'w1'); o(cx + 1, y, 'w2'); }
      for (const s of [-1, 1]) for (let k = 0; k < 14; k++) {
        const t = k / 13, x = Math.round(cx + 0.5 + s * (1.5 + t * 10)), y = Math.round(3 + t * t * 28 - t * 8), m = (k - f + 8) % 4;
        o(x, y, m === 0 ? 'w0' : 'w1'); if (m !== 2) o(x, y + 1, 'w2');
      }
      for (const s of [-1, 1]) for (let y = by + 3; y < cy - 1; y++) {
        const x = cx + s * 13, k = (y - f * 2 + 64) % 6;
        o(x, y, k < 2 ? 'w0' : 'w1'); o(x + s, y, k === 3 ? 'w0' : 'w2'); o(x + 2 * s, y, 'w3');
      }
      for (const s of [-1, 1]) { const x = cx + s * 14; for (const [dx, dy, c] of [[-2, -1, 'w0'], [2, -1, 'w0'], [-3, -2 + (f & 1), 'w1'], [3, -2 - (f & 1), 'w1'], [0, -2, 'w0']]) o(x + dx, cy - 1 + dy - ((f + dx) & 1), c); }
      return out.canvas();
    });
    return { img: frames[0], frames, fps: 6, ax: cx + 1, ay: h + 1, base: [-rx, rx], foot: ry * 2 };
  }

  /* ---------------- Sam's hall ---------------- */
  /* The village hall on the north of the square: a slate hip roof with a bell cupola, cream walls with stone quoins,
     tall arched windows, a columned portico with a clock in its pediment, banners, on a stone plinth with steps up the
     middle. door: the double doors. */
  function hall() {
    const W = 244, H = 182, lit = [], cx = 122, ey = 98, wb = 148, wx = 10, ww = 224;
    const out = inked(W, H, b => {
      // the cupola on the ridge: a white bell house with an arched opening, its own little roof and a vane
      fill(b, cx - 9, 24, 19, 20, 'wall0'); fill(b, cx - 9, 24, 2, 20, 'white'); fill(b, cx + 7, 24, 3, 20, 'wall2');
      fill(b, cx - 4, 28, 9, 12, X.soot); arch(b, cx - 4, 28, 9, 'wall0'); disc(b, cx, 34, 3, 3, 'brass2'); fill(b, cx - 3, 36, 7, 2, 'brass3'); px(b, cx - 1, 32, 'brass0');
      gable(b, cx, 14, 13, 26, 4, 'roofB', null, 3);
      fill(b, cx, 3, 1, 10, 'iron3'); stamp(b, cx - 6, 2, ['.1.......1.', '11111111111', '.1.......11'], { 1: 'iron3' }); fill(b, cx - 1, 7, 3, 2, 'brass1'); px(b, cx - 1, 7, 'brass0');
      roof(b, 2, 40, W - 4, ey - 40, 'roofB', { hip: 26, seed: 4 });
      wall(b, wx, ey, ww, wb - ey, 'plaster');
      quoins(b, wx, ey + 1, wb - ey, false); quoins(b, wx + ww, ey + 1, wb - ey, true);
      eaveShade(b, wx, ey + 1, ww, 'plaster');
      for (const x of [22, 62, 164, 204]) lit.push(win(b, x, 110, 18, 28, { arch: true, frame: TRIM, box: ['rose', 'yellow'] }));
      // banners: swallowtail pennants hung from iron rods
      for (const x of [45, 185]) { fill(b, x - 1, 104, 14, 2, 'iron3'); const keep = saved(b, x, 106, 12, 26); fill(b, x, 106, 12, 26, 'red'); fill(b, x, 106, 2, 26, X.redL); fill(b, x + 10, 106, 2, 26, X.redD); for (let j = 0; j < 5; j++) for (let i = 5 - j; i < 7 + j; i++) keep(x + i, 127 + j); stamp(b, x + 3, 112, ['..11..', '.1221.', '.1221.', '122221', '.3..3.', '..33..'], { 1: 'yellow', 2: 'light1', 3: X.yelD }); fill(b, x + 1, 108, 10, 1, 'yellow'); fill(b, x + 1, 122, 10, 1, 'yellow'); }
      // the portico: a shaded recess, double doors, four columns under an entablature and the clock pediment
      fill(b, 84, 104, 76, wb - 104, 'wall3'); fill(b, 84, 104, 76, 3, 'wall4');
      lit.push(door(b, 110, 110, 24, 38, { double: true, arch: true, paint: GREEN, glass: true, step: false }));
      for (const x of [88, 102, 135, 149]) { fill(b, x, 106, 7, wb - 106, 'stone1'); fill(b, x, 106, 2, wb - 106, 'stone0'); fill(b, x + 5, 106, 2, wb - 106, 'stone2'); fill(b, x + 3, 110, 1, wb - 114, 'stone2'); fill(b, x - 1, 104, 9, 3, 'stone0'); fill(b, x - 1, 106, 9, 1, 'stone2'); fill(b, x - 1, wb - 3, 9, 3, 'stone2'); fill(b, x - 1, wb - 3, 9, 1, 'stone1'); }
      fill(b, 80, 94, 84, 10, 'stone1'); fill(b, 80, 94, 84, 1, 'stone0'); fill(b, 80, 102, 84, 2, 'stone3'); fill(b, 82, 96, 80, 5, 'wall0');
      write(b, 'VILLAGE HALL', cx - (PX.textWidth('VILLAGE HALL') >> 1), 96, 'roofB3');
      gable(b, cx, 62, 44, 94, 6, 'roofB', (x, y) => px(b, x, y, y > 91 ? 'stone2' : 'wall0'), 5);
      disc(b, cx, 79, 9, 9, 'brass3'); disc(b, cx, 79, 8, 8, 'brass1'); disc(b, cx, 79, 6, 6, 'cream0'); px(b, cx - 3, 76, 'white');
      for (const [dx, dy] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) px(b, cx + dx, 79 + dy, 'iron4');
      fill(b, cx, 75, 1, 5, 'iron4'); fill(b, cx, 79, 4, 1, 'iron4'); px(b, cx, 79, 'red');
      // the plinth, the steps and two flower urns on it
      wall(b, 4, wb, W - 8, H - wb, 'stone', 7); fill(b, 4, wb, W - 8, 2, 'stone0'); fill(b, 4, wb + 2, W - 8, 1, 'stone3');
      for (let k = 0; k < 5; k++) { const sx = 82 - k * 5, sw = 80 + k * 10, sy = wb + k * 7; fill(b, sx, sy, sw, 7, 'stone2'); fill(b, sx, sy, sw, 2, 'stone0'); fill(b, sx, sy + 2, sw, 1, 'stone1'); fill(b, sx, sy + 6, sw, 1, 'stone3'); fill(b, sx, sy, 1, 7, 'stone3'); fill(b, sx + sw - 1, sy, 1, 7, 'stone4'); }
      for (const x of [5, 225]) { fill(b, x + 2, wb - 6, 10, 6, 'stone1'); fill(b, x + 2, wb - 6, 10, 1, 'stone0'); fill(b, x + 9, wb - 6, 3, 6, 'stone2'); fill(b, x, wb - 9, 14, 3, 'stone0'); pot(b, x + 1, wb - 20, 'red', 'yellow', x); }
    });
    return pack(out, W, H, [wx, ww], 60, { lit, door: cx, cupola: [cx + 1, 35] });
  }

  /* ---------------- Baker's bakery ---------------- */
  /* Two storeys: a brick shop below with a green shopfront, a lit bread window under a striped awning, a loaf sign on a
     bracket; Baker's home above in half-timber, a dormer in the roof, a brick chimney (smoke). A bread rack and flour
     sacks stand outside. */
  function bakery() {
    const W = 182, H = 146, lit = [], smoke = [], wx = 22, ww = 132, ey = 60, mid = 96, wb = H - 4;
    const out = inked(W, H, b => {
      smoke.push(chimney(b, wx + 104, 2, 34));
      roof(b, wx - 6, 14, ww + 12, ey - 14, 'roofG', { seed: 6 });
      // the dormer: a little gabled window in the roof
      fill(b, wx + 24, 30, 22, 18, 'wall1'); fill(b, wx + 42, 30, 4, 18, 'wall2'); lit.push(win(b, wx + 28, 33, 14, 11));
      gable(b, wx + 35, 20, 14, 31, 8, 'roofG', null, 2);
      // upstairs: Baker's home in half-timber
      wall(b, wx, ey, ww, mid - ey, 'plaster'); eaveShade(b, wx, ey + 1, ww, 'plaster');
      timber(b, wx, ey + 2, ww, mid - ey - 2, [wx, wx + 43, wx + 86, wx + ww - 3], [0, 2]);
      for (const x of [wx + 15, wx + 58, wx + 101]) lit.push(win(b, x, ey + 10, 14, 14, { box: ['rose', 'white'] }));
      fill(b, wx - 2, mid, ww + 4, 5, 'wood3'); fill(b, wx - 2, mid, ww + 4, 1, 'wood1'); fill(b, wx - 2, mid + 4, ww + 4, 1, 'wood4');
      // downstairs: the shop, a green front with a name board, the bread window under its awning, a glazed door
      wall(b, wx, mid + 5, ww, wb - mid - 5, 'brick', 3); fill(b, wx, mid + 5, ww, 2, 'roofR4');
      fill(b, wx + 4, mid + 7, 98, wb - mid - 7, 'cap3'); fill(b, wx + 5, mid + 8, 96, wb - mid - 8, 'cap2'); fill(b, wx + 5, mid + 8, 1, wb - mid - 8, 'cap1');
      fill(b, wx + 8, mid + 9, 54, 9, 'cream0'); fill(b, wx + 8, mid + 17, 54, 1, 'cream2'); write(b, 'BAKERY', wx + 35 - (PX.textWidth('BAKERY') >> 1), mid + 11, 'wood4');
      const gx = wx + 9, gy = mid + 30, gw = 52, gh = wb - mid - 36;
      lit.push(win(b, gx, gy, gw, gh, { frame: GREEN, panes: 0 }));
      fill(b, gx, gy + 8, gw, 2, 'wood3'); fill(b, gx, gy + gh - 3, gw, 3, 'wood3');
      for (let i = 0; i < 6; i++) { loaf(b, gx + 2 + i * 8, gy + 4); roll(b, gx + 3 + i * 8, gy + gh - 6); }
      baguette(b, gx + 6, gy + 12, 14); baguette(b, gx + 30, gy + 13, 16);
      awning(b, gx - 3, mid + 20, gw + 6, 4, 'red', 'white');
      lit.push(door(b, wx + 70, wb - 36, 22, 36, { paint: GREEN, glass: true }));
      // the loaf sign out past the left corner
      const [h1, h2] = bracket(b, wx, mid + 10, -20);
      for (const hx of [h1, h2]) fill(b, hx, mid + 12, 1, 4, 'iron3');
      stamp(b, wx - 19, mid + 15, ['...0011111122...', '.001121112111223', '0111211121112123', '1111111111111123', '1111111111111233', '.22333333333333.'], { 0: 'wood0', 1: 'wood1', 2: 'wood2', 3: 'wood3' });
      // a chalkboard by the pier, flour sacks on the left, the bread rack on the right
      const cb = wx + 108;
      line(b, cb + 1, wb - 18, cb - 1, wb + 3, 'wood3', 2); line(b, cb + 11, wb - 18, cb + 13, wb + 3, 'wood3', 2);
      fill(b, cb, wb - 18, 13, 14, 'wood3'); fill(b, cb + 1, wb - 17, 11, 12, X.chalk); loaf(b, cb + 3, wb - 15); for (const y of [wb - 10, wb - 8]) fill(b, cb + 2, y, 8 - (y & 1) * 3, 1, 'cream1');
      sack(b, 0, wb - 12, { mark: WHEAT, markC: X.yelD }); sack(b, 11, wb - 12, { mark: WHEAT, markC: X.yelD }); sack(b, 5, wb - 8, { mark: WHEAT, markC: X.yelD });
      const rx0 = wx + ww + 1;
      post(b, rx0, wb - 28, 32); post(b, rx0 + 23, wb - 28, 32);
      for (const ry of [wb - 24, wb - 12, wb]) { fill(b, rx0, ry, 26, 3, 'wood2'); fill(b, rx0, ry, 26, 1, 'wood1'); fill(b, rx0, ry + 2, 26, 1, 'wood4'); }
      for (let i = 0; i < 3; i++) { loaf(b, rx0 + 2 + i * 7, wb - 28); roll(b, rx0 + 3 + i * 7, wb - 15); }
      baguette(b, rx0 + 3, wb - 4, 20);
      footing(b, wx, wb, ww);
    });
    return pack(out, W, H, [wx, ww], 48, { lit, smoke, door: wx + 81 });
  }

  /* ---------------- the post office ---------------- */
  /* Slate roof, a front gable over the door with a round window. open=false: closed since the storm, windows and door
     boarded, tiles torn off, the sign fallen and leaning on the wall, weeds. open=true: reopened, the sign back up,
     window boxes, a red post box. door only when open. */
  function postOffice(open = true) {
    const W = 156, H = 116, lit = [], wx = 12, ww = 132, ey = 62, wb = H - 4, cx = 78;
    const plank = (b, x0, y0, x1, y1) => { line(b, x0, y0, x1, y1, 'wood2', 3); line(b, x0, y0, x1, y1, 'wood1'); line(b, x0, y0 + 3, x1, y1 + 3, 'wood4'); px(b, x0 + 2, y0 + 1, 'iron3'); px(b, x1 - 2, y1 + 1, 'iron3'); };
    const out = inked(W, H, b => {
      roof(b, wx - 6, 12, ww + 12, ey - 12, 'roofB', { seed: 9 });
      if (!open) for (const [tx, ty] of [[30, 26], [38, 32], [114, 40]]) { fill(b, tx, ty, 9, 6, 'wood4'); fill(b, tx, ty + 2, 9, 1, 'wood2'); fill(b, tx + 4, ty, 1, 6, 'wood3'); }
      wall(b, wx, ey, ww, wb - ey, 'plaster'); eaveShade(b, wx, ey + 1, ww, 'plaster');
      post(b, wx, ey, wb - ey); post(b, wx + ww - 3, ey, wb - ey);
      gable(b, cx, 26, 30, ey + 2, 16, 'roofB', (x, y) => px(b, x, y, x > cx + 22 ? 'wall2' : 'wall1'), 2);
      disc(b, cx, 46, 6, 6, 'roofB3'); disc(b, cx, 46, 5, 5, open ? 'sky3' : X.dust); if (open) { px(b, cx - 2, 43, 'white'); lit.push([cx - 3 + 1, 44 + 1, 7, 5]); } fill(b, cx - 5, 46, 11, 1, 'roofB3'); fill(b, cx, 41, 1, 11, 'roofB3');
      for (const x of [26, 112]) { const g = win(b, x, ey + 14, 18, 20, { frame: BLUE, shut: open ? BLUE : null, dark: !open, box: open ? ['red', 'yellow'] : null }); if (open) lit.push(g); }
      const dg = door(b, cx - 11, wb - 36, 22, 36, { paint: BLUE, glass: open });
      if (open) {
        lit.push(dg);
        fill(b, cx - 18, ey + 2, 37, 10, 'roofB4'); fill(b, cx - 17, ey + 3, 35, 8, 'cream0'); fill(b, cx - 17, ey + 10, 35, 1, 'cream2');
        write(b, 'POST', cx - 13, ey + 5, 'red'); stamp(b, cx + 4, ey + 4, ['1111111', '1211121', '1122211', '1111111'], { 1: 'white', 2: 'roofB2' }); fill(b, cx + 4, ey + 8, 7, 1, 'cream2');
        // the post box and a stack of parcels
        const mx = wx + ww - 2; fill(b, mx, wb - 22, 12, 22, 'red'); fill(b, mx, wb - 22, 3, 22, X.redL); fill(b, mx + 9, wb - 22, 3, 22, X.redD); disc(b, mx + 5, wb - 23, 6, 3, 'red'); disc(b, mx + 4, wb - 24, 4, 1, X.redL); fill(b, mx + 2, wb - 17, 8, 2, X.soot); fill(b, mx + 2, wb - 10, 8, 3, 'yellow'); fill(b, mx - 1, wb - 2, 14, 2, X.redD);
        for (const [px0, py0, pw, ph] of [[0, wb - 10, 14, 10], [2, wb - 18, 11, 8]]) { fill(b, px0, py0, pw, ph, 'wood1'); fill(b, px0, py0, pw, 2, 'wood0'); fill(b, px0 + pw - 2, py0, 2, ph, 'wood2'); fill(b, px0 + (pw >> 1), py0, 1, ph, 'red'); fill(b, px0, py0 + (ph >> 1), pw, 1, 'red'); }
      } else {
        for (const x of [26, 112]) { plank(b, x - 4, ey + 15, x + 21, ey + 31); plank(b, x - 4, ey + 30, x + 21, ey + 17); }
        plank(b, cx - 15, wb - 30, cx + 14, wb - 10); plank(b, cx - 15, wb - 12, cx + 14, wb - 28); plank(b, cx - 15, wb - 21, cx + 14, wb - 21);
        fill(b, cx - 12, ey + 4, 2, 2, 'iron3'); fill(b, cx + 11, ey + 4, 2, 2, 'iron3'); fill(b, cx - 18, ey + 3, 37, 1, 'wall3');
        // the fallen sign, leaning on the wall at a slant
        const s = new KIT.Buf(37, 10);
        fill(s, 0, 0, 37, 10, 'roofB4'); fill(s, 1, 1, 35, 8, 'cream1'); fill(s, 1, 8, 35, 1, 'cream2'); write(s, 'POST', 4, 3, X.redD); fill(s, 25, 2, 8, 1, 'cream2'); px(s, 30, 6, 'wood3');
        for (let x = 0; x < 37; x++) for (let y = 0; y < 10; y++) { const v = s.get(x, y); if (v) b.set(wx + ww - 44 + x, wb - 16 + y - Math.round(x * 0.3) + 6, v); }
        chip(b, wx + 10, ey + 6); chip(b, wx + 96, ey + 40);
        for (const x of [wx + 2, wx + 40, wx + 100, wx + ww - 10]) stamp(b, x, wb - 4, ['.1..1.', '.21.2.', '2232.2'], { 1: 'g1', 2: 'g3', 3: 'g4' });
        stamp(b, 4, wb - 3, ['.21..12', '2132213'], { 1: X.oraL, 2: X.oraD, 3: 'wood3' });
      }
      footing(b, wx, wb, ww);
    });
    return pack(out, W, H, [wx, ww], 48, { lit, door: open ? cx : undefined });
  }

  /* ---------------- market stalls ---------------- */
  // Goods, each a few pixels, lit from the upper left.
  const GOODS = {
    cabbage: (b, x, y) => stamp(b, x, y, ['.1221.', '112232', '223343', '.3443.'], { 1: 'cap0', 2: 'cap1', 3: 'cap2', 4: 'cap3' }),
    carrot: (b, x, y) => stamp(b, x, y, ['1.1', '111', '223', '223', '.3.'], { 1: 'cap2', 2: 'orange', 3: X.oraD }),
    tomato: (b, x, y) => stamp(b, x, y, ['.44.', '1223', '2223', '.33.'], { 1: X.redL, 2: 'red', 3: X.redD, 4: 'cap3' }),
    apple: (b, x, y) => stamp(b, x, y, ['..4.', '1223', '2223', '.33.'], { 1: 'rose', 2: 'red', 3: X.redD, 4: 'wood4' }),
    orange: (b, x, y) => stamp(b, x, y, ['.12.', '1223', '2233', '.33.'], { 1: X.oraL, 2: 'orange', 3: X.oraD }),
    pear: (b, x, y) => stamp(b, x, y, ['.4.', '12.', '123', '223', '.3.'], { 1: V.LEAF.green[0], 2: V.LEAF.green[1], 3: V.LEAF.green[3], 4: 'wood4' }),
    grapes: (b, x, y) => stamp(b, x, y, ['.4..', '1212', '2323', '.23.'], { 1: '#e0ccff', 2: 'lilac', 3: '#8e6fd0', 4: 'cap3' }),
    loaf: (b, x, y) => loaf(b, x, y), roll: (b, x, y) => roll(b, x, y),
    bloom: (b, x, y, c) => stamp(b, x, y, ['.1.', '121', '.1.'], { 1: c, 2: 'yellow' }),
  };
  // A heap of one good in a tray: rows narrowing upward, front rows over back ones, then the tray's front board.
  // y is the board's top; the heap rises about 9 px above it.
  function tray(b, x, y, w, good, sx = 4, seed = 1) {
    for (let r = 2; r >= 0; r--) for (let i = r * sx / 2; i + sx <= w - r * sx / 2 + 1; i += sx) GOODS[good](b, x + Math.round(i) + ((hash(i, r, seed) * 2) | 0) - 1, y - 3 - r * 3 + ((hash(i, r, seed + 1) * 2) | 0));
    fill(b, x - 1, y, w + 2, 4, 'wood2'); fill(b, x - 1, y, w + 2, 1, 'wood1'); fill(b, x - 1, y + 3, w + 2, 1, 'wood4'); px(b, x, y + 1, 'wood4'); px(b, x + w - 1, y + 1, 'wood4');
  }
  // A crate seen from the front and a little from above, heaped with one good.
  function crate(b, x, y, w, good, seed) {
    for (let i = 0; i + 4 <= w - 1; i += 4) GOODS[good](b, x + 1 + i, y + ((hash(i, seed, 2) * 2) | 0));
    fill(b, x, y + 4, w, 8, 'wood2'); fill(b, x, y + 4, w, 1, 'wood1'); fill(b, x, y + 8, w, 1, 'wood3'); fill(b, x, y + 11, w, 1, 'wood4'); fill(b, x, y + 4, 1, 8, 'wood3'); fill(b, x + w - 1, y + 4, 1, 8, 'wood4');
  }
  /* A market stall: a striped awning on four posts over a counter of goods, crates in front, a chalk price board.
     kind: 'veg' (Mia's: cabbages, carrots, tomatoes) | 'fruit' | 'flowers' | 'bread'. */
  function stall(kind = 'veg') {
    const W = 72, H = 58, [A, B] = { veg: ['green', 'white'], fruit: ['red', 'yellow'], flowers: ['pink', 'white'], bread: ['blue', 'white'] }[kind];
    const out = inked(W, H, b => {
      fill(b, 5, 18, 62, 16, 'wood3'); for (let x = 10; x < 66; x += 7) fill(b, x, 18, 1, 16, 'wood4'); fill(b, 5, 18, 62, 4, 'wood5'); fill(b, 5, 26, 62, 2, 'wood2'); fill(b, 5, 28, 62, 1, 'wood4');
      for (const x of [3, 66]) post(b, x, 16, H - 16);
      // the counter: a lit top edge and a planked front
      fill(b, 1, 34, 70, 4, 'wood1'); fill(b, 1, 34, 70, 1, 'wood0');
      fill(b, 2, 38, 68, 14, 'wood2'); for (let x = 8; x < 70; x += 8) fill(b, x, 38, 1, 14, 'wood3'); fill(b, 2, 38, 68, 2, 'wood3'); fill(b, 2, 51, 68, 1, 'wood4');
      fill(b, 26, 41, 20, 9, 'wood4'); fill(b, 27, 42, 18, 7, X.chalk); write(b, kind === 'bread' ? '2C' : '1C', 29, 43, 'white'); fill(b, 38, 45, 5, 1, 'cream1');
      if (kind === 'veg') {
        tray(b, 6, 30, 22, 'cabbage', 6, 1); tray(b, 31, 30, 18, 'tomato'); tray(b, 52, 30, 14, 'carrot', 4, 2);
        crate(b, 0, H - 13, 16, 'cabbage', 1); crate(b, 56, H - 13, 16, 'carrot', 2);
      } else if (kind === 'fruit') {
        tray(b, 6, 30, 18, 'apple'); tray(b, 27, 30, 18, 'orange', 4, 3); tray(b, 48, 30, 10, 'pear', 3, 4); tray(b, 60, 30, 7, 'grapes', 4, 5);
        crate(b, 0, H - 13, 16, 'orange', 3); crate(b, 56, H - 13, 16, 'apple', 4);
      } else if (kind === 'flowers') {
        for (let i = 0; i < 6; i++) { const x = 5 + i * 10, c = ['rose', 'yellow', 'lilac', 'white', 'pink', 'orange'][i]; fill(b, x, 28, 8, 7, 'iron2'); fill(b, x, 28, 8, 1, 'iron1'); fill(b, x + 6, 28, 2, 7, 'iron3'); fill(b, x, 31, 8, 1, 'iron3'); fill(b, x + 1, 23, 6, 5, 'cap2'); fill(b, x + 2, 25, 1, 3, 'cap3'); for (let k = 0; k < 4; k++) GOODS.bloom(b, x - 1 + k * 2 + (k & 1), 19 + (k & 1) * 3, c); }
        pot(b, 0, H - 15, 'rose', 'white', 5); pot(b, 59, H - 15, 'lilac', 'yellow', 6);
      } else {
        tray(b, 5, 30, 26, 'loaf', 7, 6); for (let i = 0; i < 4; i++) baguette(b, 34 + i, 21 + i * 2, 16 - i); fill(b, 33, 29, 18, 5, 'wood1'); fill(b, 33, 29, 18, 1, 'wood0'); for (let x = 34; x < 51; x += 2) px(b, x, 31, 'wood2'); tray(b, 54, 30, 13, 'roll', 4, 7);
        sack(b, 0, H - 13, { mark: WHEAT, markC: X.yelD }); crate(b, 56, H - 13, 16, 'roll', 8);
      }
      awning(b, 0, 0, W, 12, A, B);
    });
    return { img: out.canvas(), ax: (W >> 1) + 1, ay: H + 1, base: [-(W >> 1), W >> 1], foot: 14 };
  }

  /* ---------------- small props ---------------- */
  /* A roofed notice board: two posts, a framed cork board of pinned papers, a little shingle roof. */
  function noticeBoard() {
    const W = 42, H = 46;
    const out = inked(W, H, b => {
      for (const x of [4, 35]) post(b, x, 8, H - 8);
      fill(b, 2, 14, 38, 24, 'wood3'); fill(b, 2, 14, 38, 1, 'wood1'); fill(b, 4, 16, 34, 20, 'wood1'); fill(b, 4, 16, 34, 1, 'wood2');
      for (const [x, y, w, h, c] of [[6, 18, 9, 11, 'cream0'], [17, 17, 8, 7, 'pink'], [27, 18, 9, 9, 'white'], [17, 26, 10, 8, 'sky1'], [6, 30, 8, 5, 'light1'], [29, 29, 7, 6, 'cream1']]) {
        fill(b, x, y, w, h, c); fill(b, x, y + h - 1, w, 1, 'cream2'); for (let j = y + 2; j < y + h - 2; j += 2) fill(b, x + 1, j, w - 3 - (j % 3), 1, 'stone3'); px(b, x + (w >> 1), y, 'red');
      }
      fill(b, 2, 37, 38, 2, 'wood4');
      gable(b, 21, 2, 21, 12, 6, 'roofR', null, 4);
    });
    return { img: out.canvas(), ax: (W >> 1) + 1, ay: H + 1, base: [-18, 18], foot: 4 };
  }
  /* A string of little triangle flags, sagging between two hooks at (0, 0) and (len - 1, 0). img only. */
  function bunting(len = 80) {
    const sag = Math.max(4, Math.round(len / 10)), b = new KIT.Buf(len, sag + 9), cols = ['red', 'yellow', 'blue', 'cap1', 'pink', 'orange'];
    const yAt = x => Math.round(sag * (1 - ((2 * x) / (len - 1) - 1) ** 2));
    for (let x = 0; x < len; x++) px(b, x, yAt(x), 'ink');
    for (let k = 0, x = 4; x + 6 < len - 2; x += 9, k++) {
      const c = cols[k % cols.length], dk = { red: X.redD, yellow: X.yelD, blue: X.bluD, cap1: 'cap3', pink: V.LEAF.blossom[3], orange: X.oraD }[c], y = yAt(x + 3) + 1;
      for (let j = 0; j < 7; j++) for (let i = Math.ceil(j / 2); i < 7 - Math.ceil(j / 2); i++) px(b, x + i, y + j, i === 6 - Math.ceil(j / 2) || j === 6 ? dk : j === 0 ? 'ink' : c);
      px(b, x + 1, y + 1, 'white');
    }
    return { img: b.canvas() };
  }
  /* A park bench: two back slats, a slatted seat, iron ends with arm scrolls. */
  function bench() {
    const W = 32, H = 20;
    const out = inked(W, H, b => {
      for (const x of [1, 28]) { fill(b, x, 2, 3, 18, 'iron3'); fill(b, x, 2, 1, 18, 'iron2'); fill(b, x - 1, 9, 5, 2, 'iron3'); }
      for (const y of [2, 6]) { fill(b, 3, y, 26, 3, 'wood2'); fill(b, 3, y, 26, 1, 'wood1'); fill(b, 3, y + 2, 26, 1, 'wood3'); }
      fill(b, 2, 11, 28, 5, 'wood1'); fill(b, 2, 11, 28, 1, 'wood0'); fill(b, 2, 13, 28, 1, 'wood2'); fill(b, 2, 15, 28, 1, 'wood3'); fill(b, 2, 16, 28, 1, 'wood4');
      fill(b, 5, 17, 2, 3, 'iron3'); fill(b, 25, 17, 2, 3, 'iron3');
    });
    return { img: out.canvas(), ax: (W >> 1) + 1, ay: H + 1, base: [-15, 15], foot: 8, seat: [(W >> 1) + 1, 12] };
  }
  /* An iron street lamp: a stepped foot, a fluted post, a glass lantern with a cap and finial. lit: the glass. */
  function lamp() {
    const W = 14, H = 42;
    const out = inked(W, H, b => {
      fill(b, 2, H - 4, 10, 4, 'iron3'); fill(b, 2, H - 4, 10, 1, 'iron2'); fill(b, 4, H - 7, 6, 3, 'iron3'); fill(b, 4, H - 7, 6, 1, 'iron1');
      fill(b, 5, 16, 4, H - 23, 'iron3'); fill(b, 5, 16, 1, H - 23, 'iron1'); fill(b, 8, 16, 1, H - 23, 'iron4');
      fill(b, 3, 14, 8, 2, 'iron3'); fill(b, 2, 4, 10, 10, 'iron4'); fill(b, 3, 5, 8, 9, 'sky3'); fill(b, 3, 5, 3, 9, 'sky2'); px(b, 3, 5, 'white'); fill(b, 6, 5, 1, 9, 'iron3');
      fill(b, 1, 2, 12, 3, 'iron3'); fill(b, 1, 2, 12, 1, 'iron1'); fill(b, 4, 0, 6, 2, 'iron3'); px(b, 6, 0, 'brass1');
    });
    return { img: out.canvas(), ax: (W >> 1) + 1, ay: H + 1, base: [-3, 3], foot: 3, lit: [[4, 6, 8, 9]] };
  }

  /* ---------------- the Centre's homes ---------------- */
  // Each draws into b, pushes lit and smoke, and returns [wall x, wall w], the door's centre x and the footprint depth.
  const HOMES = {
    // Mia and Pip's: butter plaster, a red roof with a front gable over a green door, a vegetable box, a ladybird pull-toy.
    mia: { w: 160, h: 116, draw(b, lit, smoke) {
      const wx = 16, ww = 126, ey = 62, wb = 112, cx = 108;
      smoke.push(chimney(b, 34, 2, 26));
      roof(b, wx - 6, 16, ww + 12, ey - 16, 'roofR', { seed: 11 });
      wall(b, wx, ey, ww, wb - ey, 'butter'); eaveShade(b, wx, ey + 1, ww, 'butter');
      post(b, wx, ey, wb - ey); post(b, wx + ww - 3, ey, wb - ey);
      gable(b, cx, 28, 30, ey + 2, 14, 'roofR', (x, y) => px(b, x, y, x > cx + 24 ? BUT[2] : BUT[1]), 12);
      disc(b, cx, 47, 5, 5, 'wood3'); disc(b, cx, 47, 4, 4, 'sky3'); px(b, cx - 2, 45, 'white'); fill(b, cx, 43, 1, 9, 'wood3'); lit.push([cx - 2, 46, 5, 4]);
      for (const x of [28, 64]) lit.push(win(b, x, ey + 12, 16, 16, { shut: GREEN, box: ['red', 'yellow'] }));
      lit.push(door(b, cx - 11, wb - 36, 22, 36, { paint: GREEN, glass: true }));
      footing(b, wx, wb, ww);
      // the vegetable box: a raised plank bed of lettuces and carrot tops, with Pip's pinwheel stuck in it
      fill(b, 0, wb - 6, 34, 10, 'wood2'); fill(b, 0, wb - 6, 34, 1, 'wood1'); fill(b, 0, wb - 1, 34, 1, 'wood3'); fill(b, 0, wb + 3, 34, 1, 'wood4'); for (const x of [0, 16, 31]) fill(b, x, wb - 6, 3, 10, 'wood3');
      for (let i = 0; i < 4; i++) GOODS.cabbage(b, 1 + i * 8, wb - 10); for (let i = 0; i < 3; i++) stamp(b, 5 + i * 8, wb - 13, ['1.1', '.1.', '.1.'], { 1: 'cap1' });
      fill(b, 10, wb - 26, 1, 18, 'wood3'); stamp(b, 6, wb - 31, ['111..2.', '.11.22.', '..1.222', '...0...', '444.3..', '.44.33.', '.4...33'], { 0: 'white', 1: 'red', 2: 'yellow', 3: 'blue', 4: 'cap1' });
      // the ladybird pull-toy and a ball
      stamp(b, 134, wb - 6, ['..1222..', '.122522.', '12252252', '22222222', '.4....4.', '.4....4.'], { 1: X.redL, 2: 'red', 5: 'ink', 4: 'wood4' }); fill(b, 132, wb + 2, 1, 1, 'ink'); line(b, 132, wb, 126, wb + 3, 'wood4');
      disc(b, 150, wb + 1, 3, 3, 'blue'); px(b, 149, wb - 1, 'white'); fill(b, 147, wb + 1, 7, 1, 'white');
      return [[wx, ww], cx, 46];
    } },
    // Sam's: neat and formal. Two storeys, white with quoins, a slate hip roof between two chimneys, a fanlit door,
    // shuttered windows in rows, clipped hedges and two bay trees in pots.
    sam: { w: 164, h: 128, draw(b, lit, smoke) {
      const wx = 18, ww = 128, ey = 56, wb = 124, cx = 82;
      smoke.push(chimney(b, 40, 2, 26), chimney(b, 114, 2, 26));
      roof(b, wx - 6, 14, ww + 12, ey - 14, 'roofB', { hip: 18, seed: 13 });
      wall(b, wx, ey, ww, wb - ey, 'white'); eaveShade(b, wx, ey + 1, ww, 'white');
      quoins(b, wx, ey + 3, wb - ey - 3, false); quoins(b, wx + ww, ey + 3, wb - ey - 3, true);
      fill(b, wx, ey + 30, ww, 3, 'stone1'); fill(b, wx, ey + 30, ww, 1, 'stone0'); fill(b, wx, ey + 32, ww, 1, 'stone3');
      for (const x of [34, cx - 7, 116]) lit.push(win(b, x, ey + 8, 14, 16, { frame: TRIM, shut: BLUE }));
      for (const x of [34, 116]) lit.push(win(b, x, ey + 40, 14, 20, { frame: TRIM, shut: BLUE }));
      // the door: a fanlight under a cornice, pilasters either side
      fill(b, cx - 15, wb - 46, 31, 3, 'stone1'); fill(b, cx - 15, wb - 46, 31, 1, 'stone0'); fill(b, cx - 15, wb - 44, 31, 1, 'stone3');
      for (const x of [cx - 15, cx + 12]) { fill(b, x, wb - 43, 4, 43, 'stone0'); fill(b, x + 3, wb - 43, 1, 43, 'stone2'); }
      fill(b, cx - 9, wb - 43, 19, 6, 'wood4'); disc(b, cx, wb - 37, 8, 5, 'wood4'); disc(b, cx, wb - 37, 7, 4, 'sky3'); fill(b, cx - 8, wb - 37, 17, 6, 'wood4'); for (const dx of [-4, 0, 4]) line(b, cx, wb - 37, cx + dx, wb - 41, 'white'); lit.push([cx - 6, wb - 40, 13, 3]);
      door(b, cx - 9, wb - 34, 19, 34, { paint: BLUE });
      footing(b, wx, wb, ww);
      // hedges along the front, bay trees in pots by the door
      hedge(b, 0, wb - 14, 30, 16, 3); hedge(b, 134, wb - 14, 30, 16, 4);
      for (const x of [cx - 26, cx + 16]) { V.foliage(b, (i, j) => ((i - x - 5) / 6) ** 2 + ((j - wb + 22) / 6) ** 2 <= 1, [x - 1, wb - 28, x + 11, wb - 16], V.LEAF.deep, x, { cw: 5, ch: 4, dx: 3, dy: 3 }); fill(b, x + 4, wb - 16, 2, 6, 'wood3'); fill(b, x + 1, wb - 10, 9, 2, 'stone0'); fill(b, x + 2, wb - 8, 7, 8, 'stone1'); fill(b, x + 7, wb - 8, 2, 8, 'stone2'); }
      return [[wx, ww], cx, 52];
    } },
    // The cobbler's: red brick under a teal roof with two dormers, a wide shop window of boots, a boot sign out on a
    // bracket past the corner, shoes drying on a bench.
    brick: { w: 150, h: 118, draw(b, lit, smoke) {
      const wx = 20, ww = 120, ey = 64, wb = 114, cx = 98;
      smoke.push(chimney(b, 120, 2, 26));
      roof(b, wx - 6, 18, ww + 12, ey - 18, 'roofG', { seed: 17 });
      for (const dx of [46, 86]) { fill(b, dx - 9, 34, 18, 16, 'wall1'); fill(b, dx + 6, 34, 3, 16, 'wall2'); lit.push(win(b, dx - 5, 37, 10, 9, {})); gable(b, dx, 26, 11, 35, 6, 'roofG', null, dx); }
      wall(b, wx, ey, ww, wb - ey, 'brick', 5); eaveShade(b, wx, ey + 1, ww, 'brick');
      fill(b, wx, ey + 3, 2, wb - ey - 3, 'roofR1');
      const gx = wx + 10, gy = ey + 14, gw = 40, gh = 22;
      fill(b, gx - 3, gy - 5, gw + 6, 3, 'stone1'); fill(b, gx - 3, gy - 5, gw + 6, 1, 'stone0');
      lit.push(win(b, gx, gy, gw, gh, { frame: TEAL, panes: 0 }));
      fill(b, gx, gy + gh - 7, gw, 2, 'wood3');
      for (let i = 0; i < 4; i++) stamp(b, gx + 3 + i * 9, gy + gh - 15, ['.11..', '.12..', '.12..', '.1223', '12233', '44444'], { 1: i & 1 ? 'wood2' : 'roofR2', 2: i & 1 ? 'wood3' : 'roofR3', 3: i & 1 ? 'wood4' : 'roofR4', 4: 'wood5' });
      fill(b, cx - 14, ey + 9, 3, 3, 'stone1');
      lit.push(door(b, cx - 11, wb - 36, 22, 36, { paint: TEAL, glass: true }));
      fill(b, 120, ey + 14, 14, 3, 'stone1'); lit.push(win(b, 122, ey + 18, 10, 16, {}));
      footing(b, wx, wb, ww);
      // the boot sign, out past the left corner
      const [h1, h2] = bracket(b, wx + 1, ey + 8, -20);
      for (const hx of [h1, h2]) fill(b, hx, ey + 10, 1, 3, 'iron3');
      stamp(b, h2 - 1, ey + 12, ['.1111111111111.', '.1222222222221.', '.1221111122221.', '.1222222222221.', '.1111111111111.'], { 1: 'wood3', 2: 'wood1' });
      stamp(b, h2 + 1, ey + 17, ['..1111...', '..1223...', '..1223...', '..1223...', '..12233..', '.1222233.', '11222223.', '.4444444.'], { 1: X.redL, 2: 'red', 3: X.redD, 4: 'wood4' });
      // a bench with shoes left to dry, a crate of leather
      fill(b, 0, wb - 4, 18, 3, 'wood1'); fill(b, 0, wb - 4, 18, 1, 'wood0'); fill(b, 1, wb - 1, 2, 5, 'wood3'); fill(b, 15, wb - 1, 2, 5, 'wood3');
      for (const x of [2, 9]) stamp(b, x, wb - 9, ['11...', '122..', '12233'], { 1: 'wood2', 2: 'wood3', 3: 'wood4' });
      fill(b, 128, wb - 8, 16, 12, 'wood2'); fill(b, 128, wb - 8, 16, 1, 'wood1'); fill(b, 128, wb - 2, 16, 1, 'wood3'); stamp(b, 129, wb - 11, ['1122.211', '2233.322'], { 1: 'roofR1', 2: 'roofR2', 3: 'wood3' });
      return [[wx, ww], cx, 46];
    } },
    // The weaver's: one tall front gable in half-timber under wooden shingles, a gable window, and cloth drying on a
    // line beside it, a basket of yarn.
    plaster: { w: 156, h: 136, draw(b, lit, smoke) {
      const wx = 12, ww = 104, cx = 64, ey = 82, wb = 132;
      gable(b, cx, 32, 56, ey, 26, 'wood', (x, y) => px(b, x, y, x > cx + 46 ? 'wall2' : 'wall1'), 21);
      timber(b, cx - 50, ey - 3, 100, 3, []);
      fill(b, cx - 1, 36, 3, ey - 36, 'wood4'); fill(b, cx - 1, 36, 1, ey - 36, 'wood3');
      fill(b, cx - 34, 66, 68, 3, 'wood4'); fill(b, cx - 34, 66, 68, 1, 'wood3');
      for (const x of [cx - 24, cx + 22]) { fill(b, x, 69, 3, ey - 69, 'wood4'); fill(b, x, 69, 1, ey - 69, 'wood3'); }
      lit.push(win(b, cx - 8, 48, 16, 16, { box: ['lilac', 'white'] }));
      wall(b, wx, ey, ww, wb - ey, 'plaster'); eaveShade(b, wx, ey + 1, ww, 'plaster');
      timber(b, wx, ey + 2, ww, wb - ey - 2, [wx, wx + 36, wx + 65, wx + ww - 3], [0]);
      lit.push(win(b, wx + 13, ey + 12, 16, 16, { box: ['pink', 'blue'] }));
      lit.push(win(b, wx + 77, ey + 12, 16, 16, { box: ['pink', 'blue'] }));
      lit.push(door(b, cx - 11 + 2, wb - 36, 22, 36, { paint: RED, glass: true }));
      footing(b, wx, wb, ww);
      // the drying line: two posts, a sagging line, cloths in the weaver's colours
      for (const x of [122, 152]) post(b, x, ey + 4, wb - ey);
      const ly = x => ey + 7 + Math.round(3 * (1 - ((x - 137) / 15) ** 2));
      for (let x = 124; x < 152; x++) px(b, x, ly(x), 'stone3');
      for (const [x, w2, h2, c] of [[125, 8, 18, 'lilac'], [134, 7, 14, 'sky2'], [142, 8, 20, 'yellow']]) { const y = ly(x + 3) + 1; fill(b, x, y, w2, h2, c); fill(b, x + w2 - 2, y, 2, h2, c === 'lilac' ? '#8e6fd0' : c === 'sky2' ? 'sky4' : X.yelD); fill(b, x, y, w2, 1, 'white'); for (let j = y + 4; j < y + h2; j += 5) fill(b, x, j, w2 - 2, 1, c === 'yellow' ? 'red' : 'white'); px(b, x + 1, y - 1, 'wood3'); px(b, x + w2 - 2, y - 1, 'wood3'); }
      fill(b, 124, wb - 7, 14, 8, 'wood1'); fill(b, 124, wb - 7, 14, 1, 'wood0'); for (let x = 125; x < 137; x += 3) fill(b, x, wb - 6, 1, 7, 'wood2'); disc(b, 128, wb - 9, 3, 2, 'rose'); disc(b, 134, wb - 9, 3, 2, 'blue'); px(b, 127, wb - 10, 'pink');
      return [[wx, ww], cx + 2, 46];
    } },
    // The seed seller's corner house: a two-storey half-timber block with a red roof, a one-storey shop wing with a
    // front gable, a window of seed packets, open sacks of seed outside.
    corner: { w: 168, h: 132, draw(b, lit, smoke) {
      const wb = 128, cx = 128;
      smoke.push(chimney(b, 30, 2, 24));
      roof(b, 4, 16, 104, 44, 'roofR', { seed: 23 });
      wall(b, 10, 60, 92, wb - 60, 'plaster'); eaveShade(b, 10, 61, 92, 'plaster');
      timber(b, 10, 62, 92, 30, [10, 40, 70, 99], [0, 2]);
      wall(b, 10, 92, 92, wb - 92, 'brick', 9); fill(b, 8, 90, 96, 3, 'wood3'); fill(b, 8, 90, 96, 1, 'wood1');
      for (const x of [22, 52, 80]) lit.push(win(b, x, 68, 12, 14, {}));
      for (const x of [24, 72]) lit.push(win(b, x, 102, 14, 16, { box: ['yellow', 'orange'] }));
      // the shop wing
      wall(b, 102, 80, 56, wb - 80, 'plaster'); post(b, 155, 80, wb - 80);
      gable(b, cx, 48, 32, 82, 18, 'roofR', (x, y) => px(b, x, y, x > cx + 26 ? 'wall2' : 'wall1'), 24);
      fill(b, cx - 15, 66, 31, 10, 'wood4'); fill(b, cx - 14, 67, 29, 8, 'cap0'); write(b, 'SEEDS', cx - 9, 69, 'cap4');
      const gx = 106, gy = 92;
      lit.push(win(b, gx, gy, 20, 22, { frame: GREEN, panes: 0 }));
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const c = ['rose', 'yellow', 'lilac', 'orange'][(i + j) % 4]; fill(b, gx + 1 + i * 5, gy + 3 + j * 10, 4, 6, 'cream0'); fill(b, gx + 2 + i * 5, gy + 4 + j * 10, 2, 2, c); px(b, gx + 2 + i * 5, gy + 7 + j * 10, 'cap2'); }
      lit.push(door(b, 132, wb - 34, 20, 34, { paint: GREEN, glass: true }));
      footing(b, 10, wb, 148);
      // open sacks: corn, beans, peas, sunflower seed; a tray of seedlings
      const seed = [['light1', X.yelD], ['wood3', 'wood4'], ['cap1', 'cap3'], ['stone4', 'cream0']];
      for (let i = 0; i < 4; i++) { const x = [44, 56, 150, 160][i] - 2; sack(b, x - (i > 1 ? 10 : 0), wb - 9 + (i & 1), { ramp: ['wood0', 'wood1', 'wood2'], open: seed[i][0] }); for (let k = 0; k < 3; k++) px(b, x - (i > 1 ? 10 : 0) + 3 + k * 2, wb - 7 + (i & 1), seed[i][1]); }
      fill(b, 84, wb - 2, 16, 4, 'wood2'); fill(b, 84, wb - 2, 16, 1, 'wood1'); for (let k = 0; k < 4; k++) stamp(b, 85 + k * 4, wb - 6, ['1.1', '.2.', '.2.'], { 1: 'cap1', 2: 'cap2' });
      return [[10, 148], cx + 14, 46];
    } },
  };
  function centreHome(kind = 'brick') {
    const H0 = HOMES[kind], lit = [], smoke = [];
    let g;
    const out = inked(H0.w, H0.h, b => { g = H0.draw(b, lit, smoke); });
    return pack(out, H0.w, H0.h, g[0], g[2], { lit, smoke, door: g[1] });
  }

  Object.assign(VIL, { fountain, hall, bakery, postOffice, stall, noticeBoard, bunting, bench, lamp, centreHome });
})();
