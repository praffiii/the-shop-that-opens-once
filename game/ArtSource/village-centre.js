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
  const WALLS = { plaster: ['wall0', 'wall1', 'wall2', 'wall3'], white: ['white', 'wall0', 'wall1', 'wall2'], butter: BUT, brick: ['roofR1', 'roofR2', 'roofR3', 'roofR4'], stone: ['stone0', 'stone1', 'stone2', 'stone3'], clap: ['white', 'wall0', 'wall1', 'wall2'], plank: ['wood1', 'wood2', 'wood3', 'wood4'] };
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
  const step = (R, k) => typeof R === 'string' ? R + k : R[k]; // a ramp's step k: R a prefix ('roofR') or 5 colours
  function tile(R, u, v, t, f, seed) {
    const r = k => step(R, Math.max(0, Math.min(4, k + t))), row = Math.floor(v / 6), uu = u + (row & 1) * 4, sx = ((uu % 8) + 8) % 8, sy = ((v % 6) + 6) % 6;
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
  // A wall panel, flat colour with a shaded right end. kind: plaster | white | butter | brick | stone | clap (clapboards)
  // | plank (upright boards); C: its 4-step ramp, if not the kind's own.
  function wall(b, x, y, w, h, kind = 'plaster', seed = 1, C = WALLS[kind]) {
    if (kind === 'clap' || kind === 'plank') {
      fill(b, x, y, w, h, C[1]);
      if (kind === 'clap') for (let j = y + 4; j < y + h; j += 5) { fill(b, x, j, w, 1, C[2]); fill(b, x, j + 1, w, 1, C[0]); }
      else for (let i = x + 5; i < x + w; i += 6) { fill(b, i, y, 1, h, C[3]); fill(b, i + 1, y, 1, h, C[0]); }
      return;
    }
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

  /* ---------------- houses in 3D ---------------- */
  /* A house built in 3D (model.js), as Octopath builds its towns: on a stone plinth (or wooden stilts) with steps up to
     the door, its walls set back behind the steps under a tiled gable roof whose deep eaves shade the top of the walls,
     windows with flower boxes, a lantern by the door that glows after dark, a chimney. Every part of Bellwood builds
     with it, in its own walls and roofs. o:
       w, d, wall, rise: the walls' width, depth and height and the roof's rise (texels); ridge: 'x' (the eaves face the
         camera) or 'back' (a gable does); kind: the walls (WALLS), ramp: their colours if not the kind's own, trim: the
         corner boards' of clapboard and planks; roof: the tiles' ramp ('roofR', 'roofB', 'roofG', or 5 colours);
       plinth: its height (texels, even; 6 if not given) or stilts: the height of the stilts a deck stands on;
         porch: how much further the plinth or deck reaches out before the walls (texels), a veranda;
       paint(b, w, h, top): paints the walls' pictures instead of kind (a part of town's own stone, say);
       wins: [[x, y, w, h, win()'s options]] on the front, y down from the eaves; side: the same on both side walls,
         x from the front; door: [x, w, h, door()'s options] on the front, x from its left;
       bay: { w, out, rise, wall, wins, front } a gabled bay standing out from the middle of the front, the door in it
         (wall: its own height, a tower's);
       timber: [floor beam y, ...post x] a half-timber frame over the front; front(b, w, h, top, lit) paints more on it
         (top: the eaves' row; the bay's own front has bay.front);
       chimney: [x, back] where it rises through the roof, back from the walls' front; seed;
       extra(m, g, at): more of the model (g: the roof; at: { X0, X1, B0, F, cx, PH } the walls, their front, the bay's
         front, the door's middle and the plinth's height); cards.
     Returns the VIL model contract. */
  const OV = 10; // the eaves' overhang
  const tiled = (R, seed) => (b, w, h) => { for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) px(b, u, v, v < 4 ? step(R, [3, 0, 1, 2][v]) : tile(R, u, v - 4, 0, v / h, seed)); };
  const boards = (b, w, h) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); fill(b, 0, h - 1, w, 1, 'wood4'); };
  const ironBox = (b, w, h) => { fill(b, 0, 0, w, h, 'iron3'); fill(b, 0, 0, w, 1, 'iron2'); };
  const glassAt = (lit, r) => r && lit.push([r[0] - 1, r[1] - 1, r[2], r[3]]);
  function house(o) {
    const { w, d, wall: WALL, rise, ridge = 'x', kind = 'plaster', ramp: C = WALLS[kind], trim: T = TRIM, roof: R = 'roofR', seed = 1, bay, stilts } = o;
    // PH: what the walls stand on, n steps up to it, 2 texels each; F: the front of the walls (the bay's, if there is
    // one), behind the steps; B0: the front of the house's own walls
    const PH = stilts || o.plinth || 6, n = PH / 2, P = o.porch || 0, F = 3 * n + 6 + P, m = MODEL.make(), X0 = -Math.round(w / 2), X1 = X0 + w, out = bay ? bay.out : 0, B0 = F + out, smoke = [];
    const [dx, dw, dh, dopt = {}] = o.door, cx = bay ? 0 : X0 + dx + dw / 2;
    // a wall picture: its walls, flecks in plaster, corner stones, the footing and its windows
    const face = (b, bw, bh, wins, lit, high = WALL) => {
      const top = bh - high;
      if (o.paint) o.paint(b, bw, bh, top);
      else if (wall(b, 0, 0, bw, bh, kind, seed, C), kind === 'clap' || kind === 'plank') for (const x of [0, bw - 3]) { fill(b, x, top, 3, high, T[1]); fill(b, x, top, 1, high, T[0]); fill(b, x + 2, top, 1, high, T[2]); }
      else if (kind !== 'brick' && kind !== 'stone') {
        for (let y = top; y < bh; y++) for (let x = 0; x < bw; x++) if (hash(x, y, seed) < 0.03) px(b, x, y, C[2]);
        quoins(b, 0, top, high, false); quoins(b, bw, top, high, true);
      }
      if (!stilts) footing(b, 0, bh - 4, bw);
      for (const [x, y, ww, wh, wo = {}] of wins) glassAt(lit, win(b, x, top + y, ww, wh, wo));
      return top;
    };
    const attic = (b, bw, top, r, lit) => glassAt(lit, win(b, (bw >> 1) - 5, top - Math.round(r * 0.6), 10, 10, { arch: true, sill: false, panes: 0 }));
    const theDoor = (b, bw, bh, x, lit) => glassAt(lit, door(b, x, bh - dh, dw, dh, { step: false, ...dopt }));
    const front = (b, bw, bh, lit) => {
      const top = face(b, bw, bh, o.wins || [], lit);
      if (ridge === 'back') attic(b, bw, top, rise, lit);
      if (o.timber) { const [fy, ...xs] = o.timber; timber(b, 0, top, bw, fy + 3, xs, [0, xs.length - 2]); fill(b, 0, top + fy, bw, 3, 'wood4'); fill(b, 0, top + fy, bw, 1, 'wood3'); }
      if (o.front) o.front(b, bw, bh, top, lit);
      if (!bay) theDoor(b, bw, bh, dx, lit);
    };
    const side = (b, bw, bh, lit) => face(b, bw, bh, o.side || [], lit), plain = (b, bw, bh, lit) => face(b, bw, bh, [], lit);
    const roof = tiled(R, seed), opts = { ov: OV, up0: PH, thick: 4, shade: 6, board: boards, roof };
    const g = MODEL.gable(m, { x0: X0, x1: X1, back0: B0, d, wall: WALL, rise, ridge, front, left: side, right: side, ...opts });
    if (bay) MODEL.gable(m, {
      x0: -bay.w / 2, x1: bay.w / 2, back0: F, d: out + Math.round(d / 2), wall: bay.wall || WALL, rise: bay.rise, ridge: 'back', ...opts,
      left: (b, bw, bh, lit) => face(b, bw, bh, [], lit, bay.wall || WALL), right: (b, bw, bh, lit) => face(b, bw, bh, [], lit, bay.wall || WALL),
      front(b, bw, bh, lit) { const top = face(b, bw, bh, bay.wins || [], lit, bay.wall || WALL); attic(b, bw, top, bay.rise, lit); if (bay.front) bay.front(b, bw, bh, top, lit); theDoor(b, bw, bh, (bw - dw) >> 1, lit); },
    });
    // the plinth (or the deck on its stilts), and the steps up to the door
    const stone = (b, bw, bh, lit, which) => {
      if (which !== 'top') return wall(b, 0, 0, bw, bh, 'stone', seed + 3);
      fill(b, 0, 0, bw, bh, 'stone1'); for (let x = 9; x < bw; x += 10) fill(b, x, 0, 1, bh, 'stone2'); fill(b, 0, bh - 1, bw, 1, 'stone0');
    };
    const planks = (b, bw, bh, lit, which) => {
      fill(b, 0, 0, bw, bh, 'wood2');
      if (which === 'top') for (let x = 4; x < bw; x += 5) fill(b, x, 0, 1, bh, 'wood3'); else { fill(b, 0, 0, bw, 1, 'wood1'); fill(b, 0, bh - 1, bw, 1, 'wood4'); }
    };
    const post = (b, bw, bh) => { fill(b, 0, 0, bw, bh, 'wood3'); fill(b, 0, 0, 1, bh, 'wood2'); fill(b, bw - 1, 0, 1, bh, 'wood4'); };
    if (stilts) {
      m.box(X0 - 4, X1 + 4, F - P - 4, B0 + d + 3, PH - 3, PH, planks);
      for (let x = X0 - 2, k = 0; x <= X1 + 2; x += (X1 - X0 + 4) / Math.max(1, Math.round((X1 - X0) / 36)), k++) for (const z of [F - P - 3, B0 + d]) m.box(x - 2, x + 1, z, z + 3, 0, PH - 3, post);
    } else m.box(X0 - 3, X1 + 3, F - P - 3, B0 + d + 3, 0, PH, stone);
    const sw = dw / 2 + 5;
    for (let k = 0; k < n; k++) m.box(cx - sw, cx + sw, F - P - 3 - 3 * (n - k), F - P - 3, 2 * k, 2 * k + 2, stilts ? planks : stone);
    // the lantern by the door, on a short iron arm
    const lx = cx + dw / 2 + 8, lu = PH + dh - 3;
    m.box(lx - 3, lx + 3, F - 5, F - 1, lu - 9, lu, (b, bw, bh, lit, which) => {
      fill(b, 0, 0, bw, bh, 'iron4'); if (which === 'top') return;
      fill(b, 1, 2, bw - 2, bh - 4, 'sky3'); fill(b, 1, bh - 3, bw - 2, 1, 'sky4'); lit.push([1, 2, bw - 2, bh - 4]);
    });
    m.box(lx - 1, lx + 1, F - 3, F, lu, lu + 2, ironBox);
    if (o.chimney) {
      const [hx, hb] = o.chimney, c0 = B0 + hb, low = Math.min(...[[hx - 5, c0], [hx + 5, c0], [hx - 5, c0 + 10], [hx + 5, c0 + 10]].map(([x, k]) => g.roofAt(x, k)));
      m.box(hx - 5, hx + 5, c0, c0 + 10, low - 2, g.R + 12, (b, bw, bh, lit, which) => {
        if (which === 'top') { fill(b, 0, 0, bw, bh, 'stone1'); fill(b, 2, 2, bw - 4, bh - 4, X.soot); return; }
        wall(b, 0, 0, bw, bh, 'brick', seed + 5); fill(b, 0, 0, bw, 3, 'stone1'); fill(b, 0, 0, bw, 1, 'stone0');
      });
      smoke.push([hx, g.R + 12, c0 + 5]);
    }
    if (o.extra) o.extra(m, g, { X0, X1, B0, F, cx, PH });
    return { model: m, base: [X0 - 3, X1 + 3], depth: B0 + d + 3, door: cx, w: w + 2 * OV, ay: Math.round((B0 + d) * MODEL.DEEP + g.R), smoke, cards: o.cards };
  }
  // A sign hung out over the street on an iron arm from a wall (its front back texels back), its board w x h up
  // texels up, its picture painted by paint(b, w, h).
  function hangSign(m, x, back, up, w, h, paint) {
    m.box(x - 1, x + 1, back - 12, back, up + h, up + h + 2, ironBox);
    m.box(x - w / 2, x + w / 2, back - 11, back - 9, up, up + h, (b, bw, bh, lit, which) => which === 'front' ? paint(b, bw, bh) : boards(b, bw, bh));
  }
  // A striped awning out from a wall (its front back texels back) over x0..x1: its top edge up texels up, out texels
  // out and 8 down, and a scalloped valance.
  function awning3d(m, x0, x1, back, up, out, A, B) {
    const S = u => STRIPE[(Math.floor(u / 6) & 1) ? B : A];
    m.quad((b, bw, bh) => { for (let v = 0; v < bh; v++) for (let u = 0; u < bw; u++) px(b, u, v, S(u)[v < 2 ? 2 : v < 4 ? 0 : 1]); }, [x0, up, back], [x1, up, back], [x1, up - 8, back - out], [x0, up - 8, back - out]);
    m.front(x0, back - out, up - 14, x1 - x0, 6, (b, bw, bh) => { for (let u = 0; u < bw; u++) { const e = u % 6 === 0 || u % 6 === 5; for (let v = 0; v < (e ? bh - 1 : bh); v++) px(b, u, v, v === 0 || v === bh - 1 ? S(u)[2] : S(u)[1]); } });
  }
  // A card standing in or on a model (placeModel in areas.js).
  const card = (img, x, back, o = {}) => ({ img: img.canvas(), ax: img.w >> 1, ay: img.h - 1, x, back, up: 0, ...o });

  /* ---------------- Sam's hall ---------------- */
  /* The village hall at the head of the square: a long slate roof with a bell cupola on its ridge, cream walls with
     stone quoins, tall arched windows with flower boxes, red banners, and in the middle a gabled bay with the clock in
     its pediment and the double doors, under the VILLAGE HALL board. door: the double doors. */
  function hall() {
    const H = house({
      w: 208, d: 60, wall: 66, rise: 40, kind: 'plaster', roof: 'roofB', seed: 4,
      wins: [[14, 20, 18, 30], [50, 20, 18, 30], [140, 20, 18, 30], [176, 20, 18, 30]].map(r => [...r, { arch: true, frame: TRIM, box: ['rose', 'yellow'] }]),
      side: [[22, 20, 16, 28, { arch: true, frame: TRIM }]],
      door: [0, 26, 42, { double: true, arch: true, paint: GREEN, glass: true }],
      bay: {
        w: 64, out: 10, rise: 34,
        front(b, w, h, top) {
          fill(b, 4, top + 4, w - 8, 9, 'stone1'); fill(b, 4, top + 4, w - 8, 1, 'stone0'); fill(b, 5, top + 6, w - 10, 5, 'wall0');
          write(b, 'VILLAGE HALL', (w >> 1) - (PX.textWidth('VILLAGE HALL') >> 1), top + 6, 'roofB3');
          const cx = w >> 1, cy = top - 14;
          disc(b, cx, cy, 9, 9, 'brass3'); disc(b, cx, cy, 8, 8, 'brass1'); disc(b, cx, cy, 6, 6, 'cream0'); px(b, cx - 3, cy - 3, 'white');
          for (const [i, j] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) px(b, cx + i, cy + j, 'iron4');
          fill(b, cx, cy - 4, 1, 5, 'iron4'); fill(b, cx, cy, 4, 1, 'iron4'); px(b, cx, cy, 'red');
        },
      },
      front(b, w, h, top) {
        for (const bx of [34, w - 46]) { // the banners either side of the bay, swallowtail pennants from iron rods
          const keep = saved(b, bx, top + 8, 12, 30);
          fill(b, bx - 1, top + 6, 14, 2, 'iron3'); fill(b, bx, top + 8, 12, 30, 'red'); fill(b, bx, top + 8, 2, 30, X.redL); fill(b, bx + 10, top + 8, 2, 30, X.redD);
          for (let j = 0; j < 5; j++) for (let i = 5 - j; i < 7 + j; i++) keep(bx + i, top + 33 + j);
          stamp(b, bx + 3, top + 15, ['..11..', '.1221.', '.1221.', '122221', '.3..3.', '..33..'], { 1: 'yellow', 2: 'light1', 3: X.yelD });
        }
      },
      extra(m, g, { B0, F, PH }) {
        // the cupola on the ridge: a white bell house under its own little roof
        MODEL.gable(m, { x0: -9, x1: 9, back0: B0 + 22, d: 16, wall: 16, rise: 9, ridge: 'back', up0: g.R - 6, ov: 3, board: boards, roof: tiled('roofB', 3),
          front(b, w, h) { fill(b, 0, 0, w, h, 'wall0'); fill(b, 0, 0, 2, h, 'white'); fill(b, 5, h - 13, 8, 11, X.soot); arch(b, 5, h - 13, 8, 'wall0'); disc(b, 9, h - 7, 2, 2, 'brass2'); },
          left: (b, w, h) => fill(b, 0, 0, w, h, 'wall1'), right: (b, w, h) => fill(b, 0, 0, w, h, 'wall2') });
        // two columns before the bay, holding up its eaves
        const col = (b, w, h) => { fill(b, 0, 0, w, h, 'stone1'); fill(b, 0, 0, 1, h, 'stone0'); fill(b, w - 1, 0, 1, h, 'stone2'); fill(b, 0, 0, w, 2, 'stone0'); };
        for (const x of [-38, 33]) m.box(x, x + 5, F - 3, F, PH, PH + 66, col);
      },
    });
    return H;
  }

  /* ---------------- Baker's bakery ---------------- */
  /* Two storeys under a teal gable: the shop below in red brick with a green shopfront, the bread window lit under a
     striped awning, a glazed door, the loaf sign hung out on its arm; Baker's home above in half-timber; the oven's
     chimney (smoke). Flour sacks and the bread rack stand by the door. */
  function bakery() {
    const W = 124, rack = inked(26, 32, b => {
      post(b, 0, 0, 32); post(b, 23, 0, 32);
      for (const ry of [4, 16, 28]) { fill(b, 0, ry, 26, 3, 'wood2'); fill(b, 0, ry, 26, 1, 'wood1'); fill(b, 0, ry + 2, 26, 1, 'wood4'); }
      for (let i = 0; i < 3; i++) { loaf(b, 2 + i * 7, 0); roll(b, 3 + i * 7, 13); }
      baguette(b, 3, 24, 20);
    });
    const sacks = inked(22, 18, b => { sack(b, 0, 4, { mark: WHEAT, markC: X.yelD }); sack(b, 11, 4, { mark: WHEAT, markC: X.yelD }); sack(b, 5, 0, { open: 'cream0' }); });
    return house({
      w: W, d: 56, wall: 70, rise: 44, ridge: 'back', kind: 'plaster', roof: 'roofG', seed: 6,
      wins: [[14, 10, 14, 14, { box: ['rose', 'white'] }], [W - 28, 10, 14, 14, { box: ['rose', 'white'] }]],
      side: [[18, 10, 12, 14, { box: ['rose', 'white'] }]],
      timber: [30, 0, 40, 81, W - 3],
      door: [W - 34, 22, 36, { paint: GREEN, glass: true }],
      chimney: [36, 30],
      front(b, w, h, top, lit) {
        const sy = top + 33;
        wall(b, 0, sy, w, h - sy - 4, 'brick', 3); fill(b, 0, sy, w, 2, 'roofR4');
        fill(b, 4, sy + 3, 78, h - sy - 7, 'cap3'); fill(b, 5, sy + 4, 76, h - sy - 8, 'cap2'); fill(b, 5, sy + 4, 1, h - sy - 8, 'cap1');
        fill(b, 10, sy + 3, 64, 9, 'cream0'); fill(b, 10, sy + 11, 64, 1, 'cream2'); write(b, 'BAKERY', 42 - (PX.textWidth('BAKERY') >> 1), sy + 5, 'wood4');
        const gx = 10, gy = sy + 15, gw = 62, gh = h - gy - 7;
        glassAt(lit, win(b, gx, gy, gw, gh, { frame: GREEN, panes: 0 }));
        fill(b, gx, gy + 7, gw, 2, 'wood3'); fill(b, gx, gy + gh - 3, gw, 3, 'wood3');
        for (let i = 0; i < 7; i++) { loaf(b, gx + 2 + i * 8, gy + 3); roll(b, gx + 3 + i * 8, gy + gh - 6); }
        baguette(b, gx + 8, gy + 11, 16); baguette(b, gx + 36, gy + 12, 18);
        footing(b, 0, h - 4, w);
      },
      extra(m, g, { X0, B0, PH }) {
        awning3d(m, X0 + 6, X0 + 80, B0, PH + 26, 10, 'red', 'white');
        hangSign(m, X0 - 2, B0, PH + 50, 18, 8, (b, w, h) => { fill(b, 0, 0, w, h, 'wood4'); stamp(b, 1, 1, ['..0011111122..', '0011211121112.', '11112111211123', '11111111111123', '.223333333333.'], { 0: 'wood0', 1: 'wood1', 2: 'wood2', 3: 'wood3' }); });
      },
      cards: [card(sacks, -W / 2 - 4, 4), card(rack, W / 2 + 8, 6)],
    });
  }

  /* ---------------- the post office ---------------- */
  /* A slate-blue roof over cream plaster, blue shutters and flower boxes, and over the door a gabled bay with a round
     window and the POST board. The red post box and a stack of parcels stand outside. */
  function postOffice() {
    const W = 132, box = inked(12, 24, b => {
      fill(b, 0, 2, 12, 22, 'red'); fill(b, 0, 2, 3, 22, X.redL); fill(b, 9, 2, 3, 22, X.redD); disc(b, 5, 2, 6, 2, 'red'); disc(b, 4, 1, 4, 1, X.redL);
      fill(b, 2, 7, 8, 2, X.soot); fill(b, 2, 14, 8, 3, 'yellow'); fill(b, 0, 22, 12, 2, X.redD);
    });
    const parcels = inked(14, 18, b => {
      for (const [x, y, w, h] of [[0, 8, 14, 10], [2, 0, 11, 8]]) { fill(b, x, y, w, h, 'wood1'); fill(b, x, y, w, 2, 'wood0'); fill(b, x + w - 2, y, 2, h, 'wood2'); fill(b, x + (w >> 1), y, 1, h, 'red'); fill(b, x, y + (h >> 1), w, 1, 'red'); }
    });
    return house({
      w: W, d: 52, wall: 56, rise: 34, kind: 'plaster', roof: 'roofB', seed: 9,
      wins: [[14, 16, 18, 20], [W - 32, 16, 18, 20]].map(r => [...r, { frame: BLUE, shut: BLUE, box: ['red', 'yellow'] }]),
      side: [[18, 16, 14, 16, { frame: BLUE }]],
      door: [0, 22, 36, { paint: BLUE, glass: true }],
      bay: {
        w: 50, out: 8, rise: 26,
        front(b, w, h, top) {
          const cx = w >> 1;
          fill(b, cx - 18, top + 3, 37, 10, 'roofB4'); fill(b, cx - 17, top + 4, 35, 8, 'cream0'); fill(b, cx - 17, top + 11, 35, 1, 'cream2');
          write(b, 'POST', cx - 13, top + 6, 'red'); stamp(b, cx + 4, top + 5, ['1111111', '1211121', '1122211', '1111111'], { 1: 'white', 2: 'roofB2' });
        },
      },
      chimney: [-40, 34],
      cards: [card(box, W / 2 - 6, -2), card(parcels, -W / 2 + 10, -2)],
    });
  }

  /* ---------------- the square's homes ---------------- */
  // Each its own walls and roof: brick under red tiles, Mia's butter plaster with green shutters, the weaver's
  // half-timber, Sam's stone under slate, and four neighbours.
  const TOWN = {
    brick: { w: 112, d: 50, wall: 54, rise: 40, ridge: 'back', kind: 'brick', roof: 'roofR', seed: 11, wins: [[14, 14, 16, 18, { frame: TRIM, box: ['red', 'white'] }], [82, 14, 16, 18, { frame: TRIM, box: ['red', 'white'] }]], door: [44, 22, 34, { paint: GREEN }], chimney: [30, 28] },
    mia: { w: 104, d: 48, wall: 52, rise: 34, kind: 'butter', roof: 'roofR', seed: 12, wins: [[12, 14, 16, 18, { shut: GREEN, box: ['rose', 'yellow'] }], [76, 14, 16, 18, { shut: GREEN, box: ['rose', 'yellow'] }]], door: [41, 22, 34, { paint: GREEN, glass: true }], chimney: [-30, 26] },
    weaver: { w: 116, d: 50, wall: 60, rise: 36, kind: 'plaster', roof: 'roofG', seed: 13, timber: [26, 0, 38, 76, 113], wins: [[12, 6, 14, 14, { box: ['lilac', 'white'] }], [90, 6, 14, 14, { box: ['lilac', 'white'] }], [12, 34, 14, 16], [90, 34, 14, 16]], door: [47, 22, 34, { paint: WOOD }], chimney: [36, 24] },
    sam: { w: 108, d: 52, wall: 54, rise: 40, ridge: 'back', kind: 'stone', roof: 'roofB', seed: 14, wins: [[14, 14, 16, 18, { box: ['yellow', 'white'] }], [78, 14, 16, 18, { box: ['yellow', 'white'] }]], door: [43, 22, 34, { paint: BLUE, arch: true }], chimney: [-30, 30] },
    cream: { w: 100, d: 46, wall: 50, rise: 36, ridge: 'back', kind: 'white', roof: 'roofR', seed: 15, wins: [[12, 14, 14, 16, { frame: GREEN, box: ['red', 'yellow'] }], [74, 14, 14, 16, { frame: GREEN, box: ['red', 'yellow'] }]], door: [39, 22, 32, { paint: RED }] },
    corner: { w: 96, d: 46, wall: 50, rise: 30, kind: 'plaster', roof: 'roofG', seed: 16, wins: [[10, 14, 14, 16, { shut: BLUE, box: ['rose', 'white'] }], [72, 14, 14, 16, { shut: BLUE, box: ['rose', 'white'] }]], door: [37, 22, 32, { paint: BLUE }], chimney: [26, 24] },
    stone: { w: 100, d: 46, wall: 52, rise: 32, kind: 'stone', roof: 'roofR', seed: 17, wins: [[12, 14, 14, 16, { box: ['red', 'yellow'] }], [74, 14, 14, 16, { box: ['red', 'yellow'] }]], door: [39, 22, 34, { paint: GREEN, arch: true }], chimney: [-28, 24] },
    honey: { w: 96, d: 46, wall: 50, rise: 36, ridge: 'back', kind: 'butter', roof: 'roofG', seed: 18, wins: [[11, 14, 14, 16, { frame: TRIM, shut: RED, box: ['white', 'rose'] }], [71, 14, 14, 16, { frame: TRIM, shut: RED, box: ['white', 'rose'] }]], door: [37, 22, 32, { paint: WOOD, glass: true }], chimney: [24, 26] },
  };
  const townHome = kind => house(TOWN[kind]);

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

  Object.assign(VIL, { house, hangSign, awning3d, modelCard: card, fountain, hall, bakery, postOffice, townHome, stall, noticeBoard, bunting, bench, lamp });
})();
