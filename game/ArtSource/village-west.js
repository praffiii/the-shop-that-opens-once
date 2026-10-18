'use strict';
/* The West of Bellwood in the village kit: the old gate, stopped in time. Grey stone, rust-brown iron, deep moss and
   dark bark, with brass (the station clock, frozen at 10:17) and Helen's rose for accents. The station and its
   platform, rails, Helen's tea stall, the old engine and its wagons, the water tower, the tunnel portal, Mender's
   forge and Marlow's shop at the end of the grove path (both in 3D, model.js) and the shop's lanterns, and the homes of Helen, Mender and Bram.
   Every maker returns the VIL sprite contract; the extra fields are noted where they are made. */
(() => {
  const V = VIL, { fill, px, disc, inked } = V, P = PX.PAL, { hash } = KIT;
  // The West's own ramps, light to dark.
  const RUST = ['#e3a06c', '#bb6a40', '#8c4930', '#5f3127'];
  const SLATE = ['#a3adc6', '#7f89a8', '#616a8a', '#454c6b', P.stone5];
  const BARK = ['#ad937c', '#876c5d', '#654d45', '#46343a'];
  const MOSS = V.LEAF.deep, ROSE = V.LEAF.blossom, VERD = ['roofG0', 'roofG1', 'roofG2', 'roofG3', 'roofG4'];
  const STONE = ['stone1', 'stone2', 'stone3', 'stone4'], ROUGH = ['r1', 'r2', 'r3', 'r4'];
  const HOLLOW = '#1d1420', DEEP = P.pupil;
  const toImg = rs => rs.map(([x, y, w, h]) => [x + 1, y + 1, w, h]);

  /* ---------------- drawing helpers (all on a Buf) ---------------- */
  function line(b, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { px(b, x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  // Row j of a round-topped shape w wide: how far it is inset from each side.
  const archIn = (w, j) => { const r = w / 2, d = r - j - 0.5; return d > 0 ? Math.round(r - Math.sqrt(Math.max(0, r * r - d * d))) : 0; };
  function arch(b, x, y, w, h, c) { for (let j = 0; j < h; j++) { const i = archIn(w, j); fill(b, x + i, y + j, w - 2 * i, 1, c); } }
  // PX's sign font, written into a Buf.
  function text(b, s, x, y, c) { const g = { fillStyle: '', fillRect(x0, y0, w, h) { fill(b, x0, y0, w, h, this.fillStyle); } }; return PX.text(g, s, x, y, c); }
  const inEllipse = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const anyOf = fs => (x, y) => fs.some(f => f(x, y));

  // Dressed stone in courses (ch tall), half-offset blocks of varied width: lit top and left, mortar under and right.
  function stones(b, x, y, w, h, seed, R = STONE, ch = 6) {
    for (let r = 0, yy = y; yy < y + h; r++, yy += ch) {
      const hh = Math.min(ch, y + h - yy);
      for (let k = 0, xx = x - ((r & 1) ? 6 : 0) - ((hash(r, 0, seed) * 4) | 0); xx < x + w; k++) {
        const bw = ch + 2 + ((hash(k, r, seed) * ch) | 0), x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + bw);
        if (x1 > x0) {
          fill(b, x0, yy, x1 - x0, hh, hash(k, r, seed + 1) < 0.2 ? R[2] : R[1]);
          fill(b, x0, yy, x1 - x0, 1, R[0]); if (xx >= x) fill(b, x0, yy, 1, hh - 1, R[0]);
          fill(b, x0, yy + hh - 1, x1 - x0, 1, R[3]); if (xx + bw <= x + w) fill(b, x1 - 1, yy, 1, hh, R[3]);
        }
        xx += bw;
      }
    }
  }
  // Long-and-short corner stones down a wall edge (side: 1 left, -1 right).
  function quoins(b, x, y0, y1, side) {
    for (let y = y0, k = 0; y < y1; y += 6, k++) {
      const w = k & 1 ? 5 : 8, x0 = side > 0 ? x : x - w;
      fill(b, x0, y, w, Math.min(5, y1 - y), side > 0 ? 'stone1' : 'stone2'); fill(b, x0, y, w, 1, 'stone0');
      fill(b, x0, y + 5, w, 1, 'stone4');
    }
  }
  /* Roof tiles in rows between y0 and y1; span(y) gives the [l, r) of row y. R is a 5-step ramp. Tiles tw x th,
     half offset per row: a lit top edge, dark joints and hem; one in five weathered darker; the lower slope darker.
     edge: the colours of the left and right edge (a hip catches the light on its left). */
  function tiles(b, y0, y1, span, R, seed, tw = 8, th = 6, edge = [R[4], R[4]]) {
    for (let y = y0; y < y1; y++) {
      const [l, r] = span(y), ry = y - y0, row = Math.floor(ry / th), sy = ry % th, f = ry / (y1 - y0);
      for (let x = l; x < r; x++) {
        const xo = x + (row & 1) * (tw >> 1) + 64, sx = xo % tw, k = hash(Math.floor(xo / tw), row, seed);
        let c = sy === 0 ? R[sx === 0 ? 2 : 0] : sy === th - 1 || sx === 0 ? R[3] : k < 0.2 || (f > 0.6 && k < 0.45) ? R[2] : R[1];
        if (x === l) c = edge[0]; else if (x === r - 1) c = edge[1]; else if (x === r - 2) c = R[3];
        px(b, x, y, c);
      }
    }
  }
  // A ridge cap: five rows across [l, r).
  const ridge = (b, l, r, y, R) => [R[3], R[0], R[0], R[1], R[2]].forEach((c, k) => fill(b, l, y + k, r - l, 1, c));
  // A timber fascia board under an eave, with the eave's shadow on the wall below.
  function fascia(b, x, y, w, shade) { fill(b, x, y, w, 3, 'wood3'); fill(b, x, y, w, 1, 'wood2'); fill(b, x, y + 2, w, 1, 'wood4'); if (shade) fill(b, x + shade[0], y + 3, w - shade[0] * 2, 2, shade[1]); }

  // A window: frame, sky glass with a glint, mullions, a sill. Pushes its glass rect onto lit.
  function win(b, x, y, w, h, lit, o = {}) {
    const sh = o.arch ? arch : fill, fr = o.frame || 'wood4';
    if (o.surround) sh(b, x - 4, y - 4, w + 8, h + 5, o.surround);
    sh(b, x - 2, y - 2, w + 4, h + 4, fr);
    sh(b, x, y, w, h, 'sky3'); fill(b, x, y + h - 3, w, 3, 'sky4');
    const g0 = o.arch ? Math.ceil(w / 2) - 1 : 1;
    px(b, x + 1, y + g0 + 1, 'white'); px(b, x + 2, y + g0, 'white'); px(b, x + 1, y + g0 + 2, 'sky1');
    if (w >= 10) fill(b, x + (w >> 1) - 1, y, 2, h, fr);
    const my = o.arch ? y + Math.round(w / 2) + 2 : y + (h >> 1) - 1;
    if (h >= 12) fill(b, x, my, w, o.arch ? 1 : 2, fr);
    if (o.sill !== false) { fill(b, x - 3, y + h + 2, w + 6, 2, o.sill || 'stone1'); fill(b, x - 3, y + h + 3, w + 6, 1, 'stone3'); }
    lit.push([x, y, w, h]);
  }
  /* A plank door. c: a 4-step ramp for the planks; o.arch rounds the top, o.straps adds iron hinge straps. */
  function door(b, x, y, w, h, o = {}) {
    const c = o.c || ['wood1', 'wood2', 'wood3', 'wood4'], sh = o.arch ? arch : fill;
    sh(b, x - 2, y - 2, w + 4, h + 2, o.frame || 'wood4');
    sh(b, x, y, w, h, c[1]);
    for (let j = 0; j < h; j++) {
      const i = o.arch ? archIn(w, j) : 0;
      px(b, x + i, y + j, c[0]);
      for (let xx = x + 4; xx < x + w - 1; xx += 4) if (xx > x + i && xx < x + w - i - 1) px(b, xx, y + j, c[2]);
    }
    fill(b, x, y + h - 2, w, 2, c[2]);
    if (o.straps) for (const yy of [y + 9, y + h - 10]) { fill(b, x, yy, w - 3, 2, 'iron3'); fill(b, x, yy, w - 3, 1, 'iron2'); for (let xx = x + 2; xx < x + w - 4; xx += 5) px(b, xx, yy + 1, 'iron1'); }
    fill(b, x + w - 5, y + Math.round(h * 0.52), 2, 2, 'brass1'); px(b, x + w - 4, y + Math.round(h * 0.52) + 1, 'brass3');
  }
  // A cushion of moss along a ledge (row y), dripping a few strands.
  function moss(b, x, y, w, seed, drip = 3) {
    for (let i = 0; i < w; i++) {
      const up = i > 0 && i < w - 1 && hash((x + i) >> 1, y, seed) < 0.4 ? 2 : 1;
      for (let j = 0; j < up; j++) px(b, x + i, y - j, j === up - 1 ? MOSS[1] : MOSS[2]);
      px(b, x + i, y + 1, MOSS[3]);
      const d = hash((x + i) >> 1, y + 1, seed) < 0.3 ? 1 + ((hash(x + i, y, seed + 2) * drip) | 0) : 0;
      for (let j = 0; j < d; j++) px(b, x + i, y + 2 + j, j === d - 1 ? MOSS[4] : MOSS[3]);
    }
  }
  // A flat patch of moss on stone or tiles.
  function patch(b, cx, cy, rx, ry) { disc(b, cx, cy, rx, ry, MOSS[3]); disc(b, cx - 1, cy - 1, Math.max(1, rx - 1), Math.max(0, ry - 1), MOSS[2]); px(b, cx - rx + 2, cy - ry + 1, MOSS[1]); px(b, cx - 1, cy - ry, MOSS[1]); }
  // Ivy climbing from (x, y0) up to y1: a wandering stem with paired leaves.
  function ivy(b, x, y0, y1, seed) {
    let cx = x;
    for (let y = y0, k = 0; y > y1; y--, k++) {
      cx += hash(k, 1, seed) < 0.15 ? 1 : hash(k, 2, seed) < 0.15 ? -1 : 0;
      px(b, cx, y, MOSS[4]);
      if (k % 3 === 0) { const s = (k / 3) & 1 ? 1 : -2; fill(b, cx + s, y - 1, 2, 2, MOSS[2]); px(b, cx + s, y - 1, MOSS[1]); px(b, cx + s + 1, y, MOSS[3]); }
    }
  }
  // A garden bench, 32 wide: the seat top on row y, iron legs down to y + 9.
  function bench(b, x, y) {
    fill(b, x + 1, y - 7, 2, 7, 'iron3'); fill(b, x + 29, y - 7, 2, 7, 'iron3');
    fill(b, x, y - 8, 32, 3, 'wood2'); fill(b, x, y - 8, 32, 1, 'wood1'); fill(b, x, y - 6, 32, 1, 'wood3');
    fill(b, x, y, 32, 3, 'wood2'); fill(b, x, y, 32, 1, 'wood1'); fill(b, x, y + 2, 32, 1, 'wood4');
    for (const lx of [x + 2, x + 27]) { fill(b, lx, y + 3, 3, 6, 'iron3'); px(b, lx, y + 3, 'iron2'); fill(b, lx - 1, y + 8, 5, 1, 'iron4'); }
  }
  // A clay pot with a little leafy plant (or flowers) on top; the pot's bottom on row y.
  function potPlant(b, x, y, seed, bloom) {
    fill(b, x + 1, y - 6, 8, 6, 'roofR2'); fill(b, x, y - 7, 10, 2, 'roofR1'); fill(b, x, y - 7, 10, 1, 'roofR0'); fill(b, x + 7, y - 6, 2, 6, 'roofR3'); fill(b, x + 2, y - 1, 6, 1, 'roofR3');
    V.foliage(b, inEllipse(x + 5, y - 12, 7, 6), [x - 2, y - 18, x + 12, y - 7], V.LEAF.green, seed, { cw: 6, ch: 5, dx: 4, dy: 3 });
    if (bloom) for (const [i, j] of [[2, -14], [7, -16], [5, -11], [9, -12]]) { px(b, x + i, y + j, bloom); px(b, x + i + 1, y + j, bloom); px(b, x + i, y + j - 1, 'white'); }
  }
  // A spoked iron wheel, rusted inside; the rim lit at the upper left.
  function wheel(b, cx, cy, r) {
    disc(b, cx, cy, r, r, 'iron4'); disc(b, cx, cy, r - 1, r - 1, 'iron2'); disc(b, cx, cy, r - 2, r - 2, RUST[3]);
    const n = r > 6 ? 8 : 4;
    for (let k = 0; k < n; k++) { const a = k * Math.PI * 2 / n + 0.3; line(b, cx, cy, cx + Math.round(Math.cos(a) * (r - 2)), cy + Math.round(Math.sin(a) * (r - 2)), RUST[1]); }
    for (let k = 0; k <= 6; k++) { const a = Math.PI * (1 + k / 12); px(b, cx + Math.round(Math.cos(a) * (r - 1)), cy + Math.round(Math.sin(a) * (r - 1)), 'iron0'); }
    disc(b, cx, cy, 1, 1, 'brass2'); px(b, cx, cy, 'brass0');
  }
  // The station clock: a brass bezel round a cream face, the hands stopped at 10:17.
  function clock(b, cx, cy, r) {
    disc(b, cx, cy, r, r, 'brass3'); disc(b, cx - 1, cy - 1, r - 1, r - 1, 'brass1'); disc(b, cx, cy, r - 1, r - 1, 'brass2');
    disc(b, cx, cy, r - 3, r - 3, 'cream1'); disc(b, cx - 1, cy - 1, r - 4, r - 4, 'cream0');
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6, s = Math.sin(a), c = Math.cos(a);
      px(b, cx + Math.round(s * (r - 4)), cy - Math.round(c * (r - 4)), 'ink2');
      if (k % 3 === 0) px(b, cx + Math.round(s * (r - 5)), cy - Math.round(c * (r - 5)), 'ink2');
    }
    const hand = (a, l) => line(b, cx, cy, cx + Math.round(Math.sin(a) * l), cy - Math.round(Math.cos(a) * l), 'ink');
    hand((10 + 17 / 60) / 12 * Math.PI * 2, Math.round(r * 0.42)); hand(17 / 60 * Math.PI * 2, Math.round(r * 0.66));
    px(b, cx, cy, 'brass3');
  }

  /* ---------------- the station ---------------- */
  /* The old station: a long stone hall under a hipped slate roof, a timber-framed front gable over the arched
     entrance, the BELLWOOD board, and the clock tower behind with its verdigris spire. clock: the face's centre. */
  function station() {
    const W = 244, H = 206, cx = 122, wy = 146, wb = 200, lit = [];
    const out = inked(W, H, b => {
      // the clock tower
      const tx = cx - 18, tw = 36;
      stones(b, tx, 22, tw, 78, 3); quoins(b, tx, 22, 100, 1); quoins(b, tx + tw, 22, 100, -1);
      fill(b, tx - 1, 56, tw + 2, 2, 'stone1'); fill(b, tx - 1, 58, tw + 2, 1, 'stone4');
      tiles(b, 4, 20, y => { const hw = Math.round(2 + (y - 4) * 1.25); return [cx - hw, cx + hw + 1]; }, VERD.map(c => P[c]), 9, 6, 4, [P.roofG1, P.roofG4]);
      fill(b, tx - 4, 19, tw + 8, 3, 'roofG3'); fill(b, tx - 4, 19, tw + 8, 1, 'roofG1'); fill(b, tx - 4, 21, tw + 8, 1, 'roofG4');
      fill(b, cx, 0, 1, 4, 'brass3'); fill(b, cx - 1, 1, 3, 2, 'brass2'); px(b, cx - 1, 1, 'brass0');
      moss(b, tx - 3, 22, 12, 5, 2); moss(b, tx + tw - 6, 22, 9, 6, 2);
      clock(b, cx, 39, 13);
      // the hipped slate roof
      const hip = y => Math.round((wy - y) * 0.42);
      tiles(b, 92, wy - 3, y => [2 + hip(y), W - 2 - hip(y)], SLATE, 5, 8, 6, [SLATE[0], SLATE[3]]);
      ridge(b, 2 + hip(92), W - 2 - hip(92), 88, SLATE);
      for (const [x, y] of [[34, 134], [58, 122], [196, 130], [214, 138]]) patch(b, x, y, 4, 1);
      fill(b, 50, 98, 10, 16, 'stone2'); fill(b, 50, 98, 2, 16, 'stone1'); fill(b, 57, 98, 3, 16, 'stone3'); fill(b, 49, 96, 12, 3, 'stone1'); fill(b, 49, 98, 12, 1, 'stone4'); fill(b, 52, 96, 6, 1, 'stone4');
      moss(b, 49, 96, 7, 7, 1);
      // the walls
      stones(b, 10, wy, W - 20, wb - wy, 7);
      quoins(b, 10, wy, wb, 1); quoins(b, W - 10, wy, wb, -1);
      quoins(b, cx - 36, wy, wb, 1); quoins(b, cx + 36, wy, wb, -1);
      fascia(b, 1, wy - 3, W - 2, [9, 'stone3']);
      // the front gable: a tiled triangle round a timber-framed gable end with a round window
      const go = y => Math.round(2 + (y - 70) * 0.5), gi = y => Math.round((y - 86) * 0.5);
      tiles(b, 70, wy - 3, y => [cx - go(y), cx + go(y) + 1], SLATE, 6, 8, 6, [SLATE[0], SLATE[3]]);
      ridge(b, cx - 3, cx + 4, 66, SLATE);
      for (let y = 86; y < wy - 3; y++) {
        const i = gi(y); fill(b, cx - i, y, 2 * i + 1, 1, 'wall1');
        px(b, cx - i - 1, y, 'wood4'); px(b, cx - i - 2, y, 'wood3'); px(b, cx + i + 1, y, 'wood4'); px(b, cx + i + 2, y, 'wood5');
      }
      fill(b, cx - gi(124), 124, 2 * gi(124) + 1, 3, 'wood4'); fill(b, cx - gi(124), 124, 2 * gi(124) + 1, 1, 'wood3');
      for (let x = cx - 24; x <= cx + 24; x += 8) fill(b, x - 1, 127, 3, wy - 130, 'wood4');
      fill(b, cx - 1, 88, 3, 8, 'wood4');
      line(b, cx - 2, 108, cx - 12, 123, 'wood4'); line(b, cx - 1, 108, cx - 11, 123, 'wood4'); line(b, cx + 2, 108, cx + 12, 123, 'wood4'); line(b, cx + 1, 108, cx + 11, 123, 'wood4');
      disc(b, cx, 106, 7, 7, 'wood4'); disc(b, cx, 106, 5, 5, 'sky3'); fill(b, cx - 5, 109, 11, 2, 'sky4'); fill(b, cx, 101, 1, 11, 'wood4'); fill(b, cx - 5, 106, 11, 1, 'wood4'); px(b, cx - 3, 103, 'white'); px(b, cx - 2, 102, 'white');
      lit.push([cx - 4, 102, 9, 9]);
      // the name board over the door
      const nw = PX.textWidth('BELLWOOD'), nx = cx - (nw >> 1) - 4;
      fill(b, nx, 149, nw + 8, 10, 'wood4'); fill(b, nx + 1, 150, nw + 6, 8, 'wood5'); fill(b, nx + 1, 150, nw + 6, 1, 'wood3');
      text(b, 'BELLWOOD', nx + 4, 152, 'brass1');
      // the arched double door in a ring of voussoirs, a fanlight over it
      const dw = 26, dh = 36, dx = cx - 13, dy = wb - dh;
      arch(b, dx - 4, dy - 4, dw + 8, dh + 4, 'stone1'); arch(b, dx - 3, dy - 3, dw + 6, dh + 3, 'stone2');
      for (let k = 1; k < 6; k++) { const a = Math.PI * k / 6; line(b, cx - Math.round(Math.cos(a) * 14), dy + 13 - Math.round(Math.sin(a) * 14), cx - Math.round(Math.cos(a) * 17), dy + 13 - Math.round(Math.sin(a) * 17), 'stone3'); }
      fill(b, cx - 2, dy - 5, 5, 5, 'stone0'); fill(b, cx + 2, dy - 5, 1, 5, 'stone2');
      door(b, dx, dy, dw, dh, { arch: true, c: ['wood2', 'wood3', 'wood4', 'wood5'], straps: true });
      arch(b, dx, dy, dw, 12, 'sky3'); fill(b, dx, dy + 9, dw, 3, 'sky4'); fill(b, dx, dy + 12, dw, 2, 'wood5');
      for (const k of [-6, 0, 6]) line(b, cx, dy + 11, cx + k * 2, dy + 1, 'wood4');
      px(b, dx + 6, dy + 4, 'white'); px(b, dx + 7, dy + 3, 'white');
      fill(b, cx - 1, dy + 14, 2, dh - 14, 'wood5'); px(b, cx - 3, dy + 22, 'brass1'); px(b, cx + 2, dy + 22, 'brass1');
      lit.push([dx + 3, dy + 2, dw - 6, 8]);
      // wall lamps beside the door
      for (const x of [cx - 26, cx + 25]) {
        fill(b, x - 1, 160, 3, 1, 'iron3'); fill(b, x, 161, 1, 2, 'iron3');
        fill(b, x - 2, 163, 5, 8, 'iron4'); fill(b, x - 3, 162, 7, 1, 'iron3'); fill(b, x - 1, 164, 3, 5, 'sky2'); px(b, x - 1, 164, 'white'); fill(b, x - 1, 171, 3, 1, 'iron3');
        lit.push([x - 1, 164, 3, 5]);
      }
      // tall arched windows in stone surrounds, benches under them
      for (const x of [28, 58, W - 42, W - 72]) { win(b, x, 160, 14, 24, lit, { arch: true, surround: 'stone1' }); fill(b, x + 5, 155, 4, 3, 'stone0'); }
      bench(b, 33, 190); bench(b, W - 65, 190);
      // footing and steps
      for (let x = 8; x < W - 8; x += 12) { fill(b, x, wb, 12, H - wb, 'stone2'); fill(b, x, wb, 12, 1, 'stone1'); fill(b, x + 11, wb, 1, H - wb, 'stone3'); }
      fill(b, 8, H - 1, W - 16, 1, 'stone4');
      fill(b, dx - 8, wb, dw + 16, H - wb, 'stone1'); fill(b, dx - 8, wb, dw + 16, 1, 'stone0'); fill(b, dx - 8, wb + 3, dw + 16, 1, 'stone3'); fill(b, dx - 8, H - 1, dw + 16, 1, 'stone4');
      // time's marks: moss on the footing, ivy up the old corner
      moss(b, 10, wb, 26, 11, 2); moss(b, 92, wb, 8, 12, 1); moss(b, 160, wb, 18, 13, 2); moss(b, 212, wb, 22, 14, 2);
      for (const [x, y] of [[14, 192], [228, 186], [80, 196], [170, 194]]) patch(b, x, y, 3, 1);
      ivy(b, 12, wb - 1, wy + 6, 4); ivy(b, W - 13, wb - 1, wy + 22, 9);
      moss(b, 2, wy - 4, 30, 15, 4); moss(b, 186, wy - 4, 24, 16, 4); moss(b, cx - 40, wy - 4, 10, 17, 3);
    });
    return { img: out.canvas(), ax: cx + 1, ay: H, base: [-114, 114], body: [wy + 1, 89], foot: 50, door: 0, lit: toImg(lit), clock: [cx + 1, 40] };
  }

  /* A stone platform edge, w long: two courses of flagstones, a pale coping, and the kerb face dropping to the
     tracks. No ink along its back edge, so it joins the paving behind it. Feet: its left end, at the kerb's foot. */
  function platform(w = 96) {
    const H = 19, out = inked(w, H, b => {
      for (let r = 0; r < 2; r++) for (let k = 0, x = -((hash(r, 1, 5) * 9) | 0) - r * 6; x < w; k++) {
        const sw = 12 + ((hash(k, r, 9) * 7) | 0), y = r * 5;
        fill(b, x, y, sw, 5, hash(k, r, 3) < 0.25 ? 'stone2' : 'stone1'); fill(b, x, y, sw, 1, 'stone0'); fill(b, x, y + 4, sw, 1, 'stone3'); fill(b, x + sw - 1, y, 1, 5, 'stone3');
        if (hash(k, r, 4) < 0.3) { px(b, x + sw - 1, y + 3, MOSS[2]); px(b, x + sw - 2, y + 4, MOSS[3]); px(b, x + sw, y + 4, MOSS[2]); }
        x += sw;
      }
      fill(b, 0, 10, w, 3, 'wall0'); fill(b, 0, 12, w, 1, 'stone1');
      for (let x = 17; x < w; x += 20) fill(b, x, 10, 1, 3, 'stone2');
      fill(b, 0, 13, w, 6, 'stone3'); fill(b, 0, 13, w, 1, 'stone4'); fill(b, 0, 17, w, 2, 'stone4'); fill(b, 0, 18, w, 1, 'stone5');
      for (let x = 9; x < w; x += 16) fill(b, x, 14, 1, 3, 'stone4');
      for (let x = 3; x < w - 6; x += 11) if (hash(x, 2, 7) < 0.4) { const n = 3 + ((hash(x, 3, 7) * 4) | 0); fill(b, x, 18, n, 1, MOSS[3]); fill(b, x + 1, 17, n - 2, 1, MOSS[2]); px(b, x + 1, 16, MOSS[1]); }
      for (let x = 5; x < w - 6; x += 23) if (hash(x, 4, 7) < 0.5) { fill(b, x, 12, 4, 1, MOSS[2]); px(b, x + 1, 13, MOSS[3]); px(b, x + 2, 14, MOSS[3]); }
    });
    for (let x = 0; x < w + 2; x++) out.set(x, 0, 0);
    return { img: out.canvas(), ax: 1, ay: H };
  }

  // A straight stretch of track to paint flat on the ground: rusted rails on dark sleepers, moss between. { img }
  function rails(len = 128) {
    const H = 20, b = new KIT.Buf(len, H);
    for (let x = 2; x < len; x += 8) {
      fill(b, x, 1, 5, 18, 'wood3'); fill(b, x, 1, 5, 1, 'wood2'); fill(b, x, 1, 1, 17, 'wood2'); fill(b, x + 4, 2, 1, 17, 'wood4'); fill(b, x, 18, 5, 1, 'wood5');
      if (hash(x, 0, 3) < 0.3) fill(b, x + 1, 9, 3, 1, 'wood4');
    }
    for (const y of [4, 13]) {
      fill(b, 0, y, len, 1, 'iron1'); fill(b, 0, y + 1, len, 1, RUST[1]); fill(b, 0, y + 2, len, 1, RUST[3]);
      for (let x = 0; x < len; x++) { if (hash(x >> 2, y, 5) < 0.3) px(b, x, y, RUST[0]); if (b.get(x, y + 3)) px(b, x, y + 3, 'wood5'); }
      for (let x = 4; x < len; x += 8) { px(b, x, y - 1, 'iron3'); px(b, x, y + 3, 'iron3'); }
    }
    for (let x = 7; x < len - 2; x += 8) {
      const k = hash(x, 1, 11);
      if (k < 0.35) { px(b, x + 1, 10, MOSS[1]); fill(b, x, 11, 3, 1, MOSS[2]); px(b, x + 1, 12, MOSS[3]); }
      else if (k < 0.55) { px(b, x, 17, MOSS[2]); px(b, x + 1, 16, MOSS[1]); px(b, x + 2, 17, MOSS[3]); px(b, x + 1, 18, MOSS[3]); }
      else if (k < 0.7) { px(b, x, 8, 'r1'); px(b, x + 1, 8, 'r2'); px(b, x + 1, 9, 'r3'); }
    }
    return { img: b.canvas() };
  }

  /* Helen's tea stall: a little kiosk under a rose-and-cream striped awning; a teapot and cups on the counter, a
     brass kettle on a tiny stove, jars on the shelf, a menu slate and a potted plant. steam: the kettle's spout. */
  function teaStall() {
    const W = 88, H = 76, lit = [];
    const out = inked(W, H, b => {
      // back wall and shelf of jars
      fill(b, 8, 26, 72, 20, 'wood4'); for (let x = 13; x < 80; x += 7) fill(b, x, 26, 1, 20, 'wood5');
      fill(b, 8, 36, 72, 2, 'wood2'); fill(b, 8, 36, 72, 1, 'wood1'); fill(b, 8, 38, 72, 1, 'wood5');
      for (const [x, c] of [[11, 'brass2'], [16, MOSS[2]], [21, ROSE[3]], [27, 'cream1'], [33, 'brass2'], [38, ROSE[3]], [43, MOSS[2]], [74, 'cream1']]) { fill(b, x, 32, 4, 4, c); fill(b, x, 31, 4, 1, 'wood3'); px(b, x, 32, 'white'); }
      for (const x of [12, 30, 46, 74]) { fill(b, x, 41, 3, 3, 'cream0'); px(b, x + 3, 42, 'cream1'); fill(b, x - 1, 40, 5, 1, 'wood5'); }
      // posts and counter
      for (const x of [5, 79]) { fill(b, x, 24, 4, 48, 'wood3'); fill(b, x, 24, 1, 48, 'wood2'); fill(b, x + 3, 24, 1, 48, 'wood4'); }
      fill(b, 2, 44, 84, 4, 'wood1'); fill(b, 2, 44, 84, 1, 'wood0'); fill(b, 2, 47, 84, 1, 'wood3');
      fill(b, 4, 48, 80, 23, 'wall1'); for (let x = 10; x < 84; x += 6) fill(b, x, 50, 1, 18, 'wall2'); fill(b, 4, 48, 80, 2, 'wall3');
      fill(b, 4, 52, 80, 2, ROSE[3]); fill(b, 4, 52, 80, 1, ROSE[2]); fill(b, 4, 54, 80, 1, ROSE[4]);
      fill(b, 4, 67, 80, 4, 'wood3'); fill(b, 4, 67, 80, 1, 'wood2'); fill(b, 3, 71, 82, 5, 'wood4'); fill(b, 3, 71, 82, 1, 'wood3');
      // a painted teacup on the counter front
      fill(b, 39, 58, 9, 5, ROSE[3]); fill(b, 40, 63, 7, 1, ROSE[3]); fill(b, 39, 58, 9, 1, ROSE[2]); fill(b, 48, 59, 2, 3, ROSE[4]); px(b, 47, 60, 'wall1'); fill(b, 37, 64, 13, 1, ROSE[4]);
      for (const x of [41, 44]) { px(b, x, 55, ROSE[2]); px(b, x + 1, 56, ROSE[2]); }
      // the striped awning fans out toward the front, then ends in rounded tabs
      for (let y = 10; y < 28; y++) {
        const l = Math.round(8 - (y - 10) * 0.45), r = W - l, t = y < 13 ? 0 : y > 24 ? 2 : 1;
        for (let x = l; x < r; x++) px(b, x, y, Math.floor((x - l) / (r - l) * 12) & 1 ? ROSE[2 + t] : ['cream0', 'cream1', 'cream2'][t]);
        px(b, l, y, 'wood4'); px(b, r - 1, y, 'wood4');
      }
      for (let s = 0; s < 12; s++) {
        const x0 = Math.round(0.5 + s * 87 / 12), x1 = Math.round(0.5 + (s + 1) * 87 / 12);
        for (let j = 0; j < 5; j++) { const i = [0, 0, 0, 1, 2][j]; fill(b, x0 + i, 28 + j, x1 - x0 - 2 * i, 1, s & 1 ? ROSE[j > 2 ? 5 : 4] : j > 2 ? 'wall3' : 'cream2'); }
      }
      fill(b, 8, 9, 72, 2, 'wood3'); fill(b, 8, 9, 72, 1, 'wood2');
      // the sign
      fill(b, 28, 0, 32, 9, 'wood4'); fill(b, 29, 1, 30, 7, 'cream0'); fill(b, 29, 7, 30, 1, 'cream2');
      text(b, 'TEA', 38, 2, ROSE[4]);
      for (const x of [31, 53]) { fill(b, x, 3, 4, 3, ROSE[3]); px(b, x + 4, 4, ROSE[3]); }
      // teapot and cups on the counter
      disc(b, 24, 40, 6, 4, 'cream0'); fill(b, 18, 40, 13, 1, ROSE[3]); disc(b, 22, 38, 2, 1, 'white');
      fill(b, 21, 35, 7, 1, 'cream1'); px(b, 24, 34, ROSE[3]);
      line(b, 17, 40, 14, 37, 'cream1'); px(b, 13, 36, 'cream1'); px(b, 31, 38, 'cream2'); px(b, 32, 39, 'cream2'); px(b, 32, 40, 'cream2'); px(b, 31, 41, 'cream2');
      for (const x of [36, 43]) { fill(b, x, 40, 5, 4, 'cream0'); fill(b, x, 40, 5, 1, ROSE[3]); px(b, x + 5, 41, 'cream1'); px(b, x + 5, 42, 'cream1'); fill(b, x - 1, 43, 7, 1, 'cream1'); }
      // the stove and its kettle
      fill(b, 57, 34, 15, 10, 'iron3'); fill(b, 57, 34, 15, 1, 'iron1'); fill(b, 57, 34, 1, 10, 'iron2'); fill(b, 71, 34, 1, 10, 'iron4');
      fill(b, 60, 37, 9, 5, 'iron4'); fill(b, 61, 38, 7, 4, 'light3'); fill(b, 62, 39, 5, 2, 'light1'); px(b, 64, 39, 'light0'); lit.push([61, 38, 7, 4]);
      disc(b, 64, 29, 5, 4, 'brass2'); fill(b, 60, 32, 9, 1, 'brass3'); disc(b, 62, 28, 2, 1, 'brass1'); px(b, 61, 27, 'brass0');
      fill(b, 63, 24, 3, 1, 'brass3'); line(b, 59, 27, 61, 23, 'iron3'); line(b, 68, 23, 69, 26, 'iron3'); fill(b, 61, 22, 7, 1, 'iron3');
      line(b, 69, 29, 72, 26, 'brass3'); px(b, 73, 25, 'brass2');
      // the menu slate and a potted plant out front
      line(b, 1, 75, 4, 52, 'wood3'); line(b, 11, 75, 8, 52, 'wood3');
      fill(b, 2, 53, 9, 15, 'wood3'); fill(b, 3, 54, 7, 13, 'iron4'); for (const [y, n] of [[56, 5], [59, 4], [62, 5], [65, 3]]) fill(b, 4, y, n, 1, 'stone1'); px(b, 9, 56, ROSE[2]);
      potPlant(b, 76, 76, 7, ROSE[3]);
    });
    return { img: out.canvas(), ax: 45, ay: H, base: [-42, 42], foot: 10, lit: toImg(lit), steam: [74, 26] };
  }

  /* ---------------- the rail yard ---------------- */
  /* An old ant-made steam engine, side view, facing left: a verdigris-green boiler banded in brass, a tall stack
     with a fern growing out of it, the cab behind; rust and moss all over. Feet: under the wheels, on the rail. */
  function locomotive() {
    const W = 124, H = 78, lit = [];
    const out = inked(W, H, b => {
      // stack, dome, headlamp
      fill(b, 13, 8, 8, 20, 'iron3'); fill(b, 13, 8, 2, 20, 'iron2'); fill(b, 19, 8, 2, 20, 'iron4');
      fill(b, 11, 5, 12, 4, 'iron3'); fill(b, 11, 5, 12, 1, 'iron1'); fill(b, 11, 8, 12, 1, 'iron4'); fill(b, 13, 12, 8, 2, 'brass2'); fill(b, 13, 12, 8, 1, 'brass1');
      for (const [x, y, h] of [[13, 4, 4], [16, 1, 7], [19, 2, 6], [21, 4, 3]]) { fill(b, x, y, 1, h, MOSS[3]); px(b, x - 1, y + 1, MOSS[2]); px(b, x + 1, y + 2, MOSS[1]); }
      arch(b, 44, 16, 11, 12, 'brass2'); arch(b, 44, 16, 4, 12, 'brass1'); fill(b, 52, 18, 3, 10, 'brass3'); px(b, 46, 18, 'brass0');
      fill(b, 74, 20, 5, 7, 'brass2'); fill(b, 74, 20, 1, 7, 'brass1'); fill(b, 75, 17, 2, 3, 'brass3');
      fill(b, 2, 20, 9, 8, 'iron3'); fill(b, 2, 20, 9, 1, 'iron1'); fill(b, 0, 21, 3, 6, 'sky2'); px(b, 0, 22, 'white'); fill(b, 5, 28, 3, 2, 'iron4'); lit.push([0, 21, 3, 6]);
      // the boiler: smokebox in front, a green barrel with brass bands
      for (let y = 26; y < 52; y++) {
        const i = y < 28 ? 2 - (y - 26) : 0, t = y < 30 ? 1 : y < 44 ? 3 : 4;
        fill(b, 24 + i, y, 62 - 2 * i, 1, P[VERD[t === 1 ? 2 : t]]); fill(b, 8 + i, y, 16, 1, t === 1 ? 'iron2' : t === 3 ? 'iron3' : 'iron4');
      }
      fill(b, 24, 29, 62, 2, 'roofG1'); fill(b, 8, 29, 16, 1, 'iron1');
      for (const x of [24, 38, 56, 72]) { fill(b, x, 26, 2, 26, 'brass2'); fill(b, x, 26, 1, 26, 'brass1'); fill(b, x + 1, 44, 1, 8, 'brass3'); }
      for (let x = 10; x < 24; x += 3) px(b, x, 47, 'iron1');
      for (let x = 24; x < 86; x++) { const t = 48 - ((hash(x >> 1, 7, 3) * 4) | 0); fill(b, x, t, 1, 51 - t, RUST[2]); px(b, x, t, RUST[1]); }
      for (const [x, h] of [[26, 9], [40, 6], [58, 11], [74, 7]]) { fill(b, x, 32, 1, h, RUST[1]); px(b, x, 32 + h, RUST[2]); }
      moss(b, 27, 26, 10, 21, 2); moss(b, 58, 26, 13, 22, 3);
      // the cab
      fill(b, 86, 12, 32, 40, 'roofG3'); fill(b, 86, 12, 2, 40, 'roofG2'); fill(b, 115, 12, 3, 40, 'roofG4');
      fill(b, 91, 18, 14, 14, 'roofG4'); fill(b, 92, 19, 12, 12, 'sky3'); fill(b, 92, 27, 12, 4, 'sky4'); line(b, 95, 19, 101, 30, 'sky1'); px(b, 93, 20, 'white');
      fill(b, 89, 36, 26, 1, 'roofG2'); fill(b, 89, 49, 26, 1, 'roofG4'); fill(b, 89, 36, 1, 14, 'roofG2'); fill(b, 114, 36, 1, 14, 'roofG4');
      disc(b, 101, 42, 3, 3, 'brass2'); px(b, 100, 41, 'brass0'); line(b, 100, 39, 98, 36, 'brass2'); line(b, 102, 39, 104, 36, 'brass2');
      for (let y = 8; y < 13; y++) { const i = y === 8 ? 3 : y === 9 ? 1 : 0; fill(b, 82 + i, y, 40 - 2 * i, 1, y < 10 ? 'iron1' : y === 12 ? 'iron4' : 'iron3'); }
      moss(b, 84, 8, 36, 23, 4);
      for (const [x, y] of [[88, 46], [112, 24], [90, 14]]) patch(b, x, y, 2, 1);
      // the footplate, cylinder and pilot
      fill(b, 4, 52, 116, 4, 'iron4'); fill(b, 4, 52, 116, 1, 'iron2'); for (let x = 8; x < 118; x += 6) px(b, x, 54, 'iron3');
      fill(b, 0, 50, 6, 10, RUST[2]); fill(b, 0, 50, 6, 1, RUST[1]); fill(b, 118, 50, 6, 8, RUST[2]); fill(b, 118, 50, 6, 1, RUST[1]);
      for (let y = 58; y < 72; y++) { const l = Math.round((y - 58) * 0.5); fill(b, l, y, 14 - l, 1, (y & 1) ? 'iron3' : 'iron4'); }
      fill(b, 18, 56, 16, 9, 'iron3'); fill(b, 18, 56, 16, 1, 'iron1'); fill(b, 18, 56, 2, 9, 'brass2'); fill(b, 32, 56, 2, 9, 'iron4');
      // wheels and rods
      wheel(b, 16, 72, 5); wheel(b, 106, 72, 5);
      for (const x of [41, 62, 83]) wheel(b, x, 68, 9);
      fill(b, 41, 72, 43, 2, 'iron1'); fill(b, 41, 73, 43, 1, 'iron3'); for (const x of [41, 62, 83]) { px(b, x, 72, 'brass1'); px(b, x, 73, 'brass3'); }
      line(b, 33, 60, 62, 72, 'iron2'); line(b, 33, 61, 62, 73, 'iron3');
      for (const [x, y] of [[50, 76], [70, 76], [96, 76]]) { px(b, x, y, MOSS[2]); px(b, x + 1, y - 1, MOSS[1]); px(b, x + 2, y, MOSS[3]); }
    });
    return { img: out.canvas(), ax: 63, ay: H, base: [-60, 60], foot: 8, lit: toImg(lit) };
  }

  /* A goods wagon standing still: plank body, iron straps, a cross-braced sliding door, a curved roof gone mossy.
     seed picks its faded paint and weathering. */
  function wagon(seed = 1) {
    const W = 82, H = 60, R = [RUST, ['wood1', 'wood2', 'wood3', 'wood4'], VERD.slice(1).map(c => P[c]), SLATE][seed % 4];
    const out = inked(W, H, b => {
      fill(b, 2, 12, 78, 36, R[1]);
      for (let x = 7; x < 80; x += 6) fill(b, x, 12, 1, 36, R[2]);
      fill(b, 2, 12, 2, 36, R[0]); fill(b, 2, 12, 78, 2, R[3]); fill(b, 2, 46, 78, 2, R[3]);
      // iron straps at the corners and the door rail
      for (const x of [2, 76]) { fill(b, x, 12, 4, 36, 'iron3'); fill(b, x, 12, 1, 36, 'iron2'); for (let y = 15; y < 46; y += 6) px(b, x + 2, y, 'iron1'); }
      fill(b, 26, 14, 30, 1, 'iron4'); fill(b, 26, 15, 30, 1, 'iron2');
      fill(b, 28, 16, 26, 30, R[0]); fill(b, 29, 17, 24, 28, R[1]); fill(b, 28, 16, 26, 1, R[0]);
      line(b, 29, 17, 52, 44, R[3]); line(b, 30, 17, 53, 44, R[2]); line(b, 52, 17, 29, 44, R[3]); fill(b, 28, 30, 26, 2, R[3]); fill(b, 28, 30, 26, 1, R[0]);
      fill(b, 50, 28, 2, 6, 'iron2');
      // a chalked number plate
      fill(b, 60, 18, 12, 8, 'iron4'); text(b, String(10 + (seed * 37) % 90), 62, 20, 'stone1');
      for (let k = 0; k < 4; k++) { const x = 8 + ((hash(seed, k, 3) * 64) | 0); fill(b, x, 20 + k * 5, 1, 4 + k, RUST[2]); px(b, x, 24 + k * 6, RUST[3]); }
      // curved roof
      for (let y = 5; y < 12; y++) { const i = [4, 2, 1, 0, 0, 0, 0][y - 5]; fill(b, i, y, W - 2 * i, 1, y < 7 ? 'iron1' : y === 11 ? 'iron4' : 'iron2'); }
      for (let x = 10; x < W - 6; x += 12) fill(b, x, 7, 1, 4, 'iron3');
      moss(b, 4 + ((hash(seed, 1, 1) * 20) | 0), 5, 18 + ((hash(seed, 2, 1) * 16) | 0), seed + 30, 4);
      moss(b, 50, 5, 12, seed + 31, 2);
      // underframe, buffers and wheels
      fill(b, 4, 48, 74, 4, 'iron4'); fill(b, 4, 48, 74, 1, 'iron3');
      fill(b, 0, 48, 3, 3, 'iron3'); fill(b, 79, 48, 3, 3, 'iron3');
      wheel(b, 19, 52, 7); wheel(b, 63, 52, 7);
      fill(b, 16, 46, 7, 3, RUST[2]); fill(b, 60, 46, 7, 3, RUST[2]);
      const wx = 32 + ((hash(seed, 4, 2) * 20) | 0); for (const [i, h] of [[0, 4], [2, 6], [4, 3]]) { fill(b, wx + i, 52 - h, 1, h, MOSS[3]); px(b, wx + i - 1, 52 - h + 1, MOSS[2]); px(b, wx + i, 52 - h, MOSS[1]); }
    });
    return { img: out.canvas(), ax: 42, ay: H, base: [-40, 40], foot: 8 };
  }

  /* A wooden water tank on a timber trestle, its iron spout swung out to the right. */
  function waterTower() {
    const W = 62, H = 112;
    const out = inked(W, H, b => {
      // back legs, then front legs splayed, braced
      for (const x of [20, 34]) { fill(b, x, 60, 3, 48, 'wood4'); fill(b, x + 2, 60, 1, 48, 'wood5'); }
      const leg = (x0, x1) => { for (let y = 60; y < 108; y++) { const x = Math.round(x0 + (x1 - x0) * (y - 60) / 48); fill(b, x, y, 4, 1, 'wood3'); px(b, x, y, 'wood2'); px(b, x + 3, y, 'wood4'); } };
      leg(10, 5); leg(40, 45);
      for (const [y0, y1] of [[64, 86], [86, 106]]) { line(b, 12, y0, 42, y1, 'wood4'); line(b, 12, y0 + 1, 42, y1 + 1, 'wood3'); line(b, 42, y0, 12, y1, 'wood4'); line(b, 42, y0 + 1, 12, y1 + 1, 'wood3'); }
      fill(b, 8, 85, 38, 3, 'wood3'); fill(b, 8, 85, 38, 1, 'wood2'); fill(b, 8, 87, 38, 1, 'wood4');
      for (const x of [3, 44]) { fill(b, x, 106, 10, 5, 'stone2'); fill(b, x, 106, 10, 1, 'stone1'); fill(b, x, 110, 10, 1, 'stone4'); }
      moss(b, 3, 106, 6, 3, 1); moss(b, 47, 106, 5, 4, 1);
      // ladder up the left leg
      for (let y = 63; y < 105; y += 4) fill(b, 13, y, 6, 1, 'iron2'); fill(b, 13, 60, 1, 46, 'iron3'); fill(b, 18, 60, 1, 46, 'iron3');
      // deck
      fill(b, 2, 57, 52, 4, 'wood2'); fill(b, 2, 57, 52, 1, 'wood1'); fill(b, 2, 60, 52, 1, 'wood4'); for (let x = 7; x < 54; x += 6) px(b, x, 58, 'wood3');
      // the tank: staves lit on the left, iron hoops
      for (let x = 4; x < 52; x++) {
        const f = (x - 4) / 48, c = x % 4 === 3 ? 'wood4' : f < 0.25 ? 'wood1' : f < 0.7 ? 'wood2' : 'wood3';
        fill(b, x, 18, 1, 39, c);
      }
      for (const y of [24, 37, 50]) { fill(b, 4, y, 48, 2, RUST[2]); fill(b, 4, y, 48, 1, RUST[1]); fill(b, 4, y, 10, 1, RUST[0]); for (let x = 8; x < 52; x += 10) px(b, x, y + 1, 'iron1'); px(b, 20, y + 2, RUST[3]); px(b, 20, y + 3, RUST[3]); px(b, 38, y + 2, 'wood4'); px(b, 38, y + 3, 'wood4'); px(b, 38, y + 4, 'wood4'); }
      fill(b, 4, 55, 48, 2, 'wood4');
      // conical roof of shingles, a finial
      tiles(b, 4, 19, y => { const hw = Math.round(4 + (y - 4) * 1.75); return [28 - hw, 28 + hw + 1]; }, ['wood2', 'wood3', 'wood4', 'wood5', P.ink2].map(c => P[c] || c), 4, 6, 5, [P.wood2, P.wood5]);
      fill(b, 0, 17, 57, 2, 'wood4'); fill(b, 0, 17, 57, 1, 'wood3');
      fill(b, 28, 0, 1, 4, 'iron3'); px(b, 28, 0, 'iron1');
      moss(b, 8, 16, 16, 5, 3); patch(b, 30, 10, 3, 1); patch(b, 40, 14, 4, 1);
      // the spout: an iron arm swung out, a leather hose hanging
      fill(b, 51, 44, 9, 3, 'iron3'); fill(b, 51, 44, 9, 1, 'iron1'); fill(b, 58, 47, 3, 10, RUST[3]); fill(b, 58, 47, 1, 10, RUST[2]); fill(b, 57, 57, 5, 2, 'iron3');
      line(b, 55, 44, 58, 30, 'iron3'); px(b, 58, 29, 'iron2');
    });
    return { img: out.canvas(), ax: 29, ay: H, base: [-24, 24], foot: 10 };
  }

  /* A dressed-stone portal with a round tunnel mouth, to stand against the foot of a cliff face; a bell is carved on
     its datestone. The mouth (44 wide, centred on ax) is very dark, with a far ring and the rails fading into it; the
     rails leave it heading south, toward the viewer. */
  function tunnelPortal() {
    const W = 92, H = 72, cx = 46;
    const out = inked(W, H, b => {
      // wing walls and the facade
      stones(b, 0, 26, 12, 46, 2); stones(b, 80, 26, 12, 46, 3);
      fill(b, 0, 24, 12, 2, 'stone1'); fill(b, 80, 24, 12, 2, 'stone1'); fill(b, 0, 26, 12, 1, 'stone4'); fill(b, 80, 26, 12, 1, 'stone4');
      stones(b, 8, 12, 76, 60, 5);
      fill(b, 6, 9, 80, 4, 'stone1'); fill(b, 6, 9, 80, 1, 'stone0'); fill(b, 6, 12, 80, 1, 'stone4');
      fill(b, 34, 0, 24, 10, 'stone1'); fill(b, 34, 0, 24, 1, 'stone0'); fill(b, 57, 0, 1, 10, 'stone3');
      // the carved bell
      fill(b, 44, 2, 4, 1, 'stone3'); fill(b, 43, 3, 6, 3, 'stone3'); fill(b, 42, 6, 8, 1, 'stone3'); px(b, 46, 7, 'stone3'); fill(b, 44, 3, 3, 1, 'stone2');
      // voussoirs and the mouth
      arch(b, cx - 29, 15, 58, 57, 'stone1'); arch(b, cx - 27, 17, 54, 55, 'stone2');
      for (let k = 1; k < 9; k++) { const a = Math.PI * k / 9; line(b, cx - Math.round(Math.cos(a) * 24), 42 - Math.round(Math.sin(a) * 24), cx - Math.round(Math.cos(a) * 28), 42 - Math.round(Math.sin(a) * 28), 'stone3'); }
      fill(b, cx - 3, 13, 7, 7, 'stone0'); fill(b, cx + 3, 13, 1, 7, 'stone2');
      for (const x of [cx - 29, cx + 25]) { fill(b, x, 42, 4, 30, 'stone1'); fill(b, x, 42, 1, 30, 'stone0'); fill(b, x + 3, 42, 1, 30, 'stone3'); for (let y = 48; y < 72; y += 6) fill(b, x, y, 4, 1, 'stone3'); }
      arch(b, cx - 24, 20, 48, 52, P.ink2);
      arch(b, cx - 22, 23, 44, 49, HOLLOW);
      arch(b, cx - 15, 33, 30, 39, P.ink); arch(b, cx - 13, 35, 26, 37, DEEP);
      for (let y = 20; y < 72; y++) { const i = archIn(48, y - 20); if (y > 26) fill(b, cx + 24 - i - 4, y, 3, 1, P.ink); }
      // rails fading in
      for (let y = 50; y < 72; y++) {
        const f = (y - 50) / 21, o = Math.round(3 + f * 4), c = f > 0.6 ? 'iron3' : f > 0.25 ? 'iron4' : P.ink;
        px(b, cx - o - 1, y, c); px(b, cx + o, y, c);
        if (y % Math.max(2, 5 - Math.round(f * 3)) === 0 && f > 0.2) fill(b, cx - o - 2, y, 2 * o + 4, 1, f > 0.6 ? 'wood5' : P.ink);
      }
      // moss and ivy over the cornice, stains under it
      moss(b, 6, 9, 22, 8, 5); moss(b, 60, 9, 26, 9, 4); moss(b, 34, 0, 8, 10, 2); moss(b, 0, 24, 10, 11, 2);
      for (const x of [16, 30, 66, 74]) fill(b, x, 13, 1, 5 + (x % 7), 'stone3');
      ivy(b, 84, 71, 30, 7); ivy(b, 5, 71, 40, 3);
      for (const [x, y] of [[12, 66], [76, 60], [cx - 30, 70], [cx + 28, 68]]) patch(b, x, y, 3, 1);
    });
    return { img: out.canvas(), ax: cx + 1, ay: H, base: [-46, 46], foot: 8 };
  }

  /* ---------------- Mender's forge ---------------- */
  /* A stone smithy built in 3D (model.js): stone walls under a slate gable roof whose eaves face the road, boarded
     gables, a tall stone chimney with the hearth glowing in its foot, and an open lean-to shed of planks on two posts:
     tools on its back wall, the anvil on its stump, the bellows, a crate of scrap iron and brass. door: the door's
     centre from the feet. */
  function forge() {
    const m = MODEL.make(), X0 = -84, X1 = 13, D = 48, WALL = 50;
    const board = (b, w, h) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, w, 1, 'wood2'); fill(b, 0, h - 1, w, 1, 'wood4'); };
    // a stone wall h tall, its footing course and moss along the bottom
    const wall = (b, w, h, top, seed) => {
      stones(b, 0, top, w, h - top, seed);
      for (let x = 0; x < w; x += 12) { fill(b, x, h - 5, 12, 5, 'stone2'); fill(b, x, h - 5, 12, 1, 'stone1'); fill(b, x + 11, h - 5, 1, 5, 'stone3'); }
      moss(b, 1, h - 5, Math.min(14, w - 2), seed + 1, 2);
    };
    // a gable end: the stone wall to the eaves, boarded above, a vent under the peak, the corner stones down both edges
    const gableEnd = seed => (b, w, h) => {
      for (let x = 0; x < w; x++) fill(b, x, 0, 1, h - WALL, x % 5 === 0 ? 'wood4' : x % 5 === 1 ? 'wood2' : 'wood3');
      fill(b, 0, h - WALL - 2, w, 2, 'wood4');
      fill(b, (w >> 1) - 3, h - WALL - 13, 6, 7, 'wood5'); for (const y of [h - WALL - 11, h - WALL - 9]) fill(b, (w >> 1) - 3, y, 6, 1, 'wood3');
      wall(b, w, h, h - WALL, seed);
      quoins(b, 0, h - WALL, h, 1); quoins(b, w, h - WALL, h, -1);
    };
    const g = MODEL.gable(m, {
      x0: X0, x1: X1, d: D, wall: WALL, rise: 26, ov: 4, ridge: 'x', board,
      front(b, w, h, lit) {
        wall(b, w, h, 0, 4);
        quoins(b, 0, 0, h, 1); quoins(b, w, 0, h, -1);
        win(b, 13, 18, 16, 14, lit, { frame: 'wood4' }); for (const x of [17, 21, 25]) fill(b, x, 18, 1, 14, 'iron3');
        door(b, 56, h - 38, 24, 38, { straps: true, c: ['wood2', 'wood3', 'wood4', 'wood5'] });
        ivy(b, 4, h - 6, 12, 5);
      },
      left: gableEnd(5), right: gableEnd(7),
      roof(b, w, h) {
        tiles(b, 5, h, () => [0, w], SLATE, 3, 8, 6, [SLATE[3], SLATE[3]]);
        ridge(b, 0, w, 0, SLATE);
        patch(b, 22, h - 10, 4, 1); patch(b, 70, 18, 3, 1); patch(b, 46, h - 16, 3, 1);
      },
    });
    // the chimney, from the ground up past the ridge: its foot the hearth, glowing
    const chimney = (b, w, h, seed) => {
      stones(b, 0, 0, w, h, seed);
      fill(b, 0, 0, w, 4, 'stone1'); fill(b, 0, 0, w, 1, 'stone0'); fill(b, 0, 4, w, 1, 'stone4');
      const soot = new Map([['stone0', 'stone1'], ['stone1', 'stone2'], ['stone2', 'stone3'], ['stone3', 'stone4']].map(([f, t]) => [KIT.u32(P[f]), KIT.u32(P[t])]));
      for (let y = 5; y < 18; y++) for (let x = 0; x < w; x++) if (y < 10 + ((hash(x >> 2, 1, seed) * 8) | 0)) { const v = soot.get(b.get(x, y)); if (v) b.set(x, y, v); }
    };
    const TOP = 104;
    m.front(12, 6, 0, 22, TOP, (b, w, h, lit) => {
      chimney(b, w, h, 6);
      fill(b, 1, h - 30, 20, 3, 'stone1'); fill(b, 1, h - 28, 20, 1, 'stone4');
      arch(b, 3, h - 26, 16, 22, P.ink2); arch(b, 4, h - 24, 14, 20, 'light4'); arch(b, 6, h - 20, 10, 16, 'light3'); fill(b, 7, h - 14, 8, 8, 'light2'); fill(b, 8, h - 10, 6, 3, 'light1'); fill(b, 9, h - 9, 4, 1, 'light0');
      for (const x of [5, 8, 12, 15]) px(b, x, h - 5, 'ink2');
      fill(b, 2, h - 4, 18, 4, 'stone3'); fill(b, 2, h - 4, 18, 1, 'stone2');
      lit.push([4, h - 24, 14, 20]);
    });
    m.side(34, 1, 6, 0, 22, TOP, (b, w, h) => chimney(b, w, h, 8));
    m.side(12, -1, 6, g.E, 22, TOP - g.E, (b, w, h) => chimney(b, w, h, 9));
    m.top(12, 34, 6, 28, TOP, (b, w, h) => { fill(b, 0, 0, w, h, 'stone2'); fill(b, 4, 4, w - 8, h - 8, 'stone5'); fill(b, 4, 4, w - 8, 1, P.ink2); });
    // the lean-to: its plank back wall hung with tools, two posts, a plank roof sloping to the front
    // (the roof hides it above 25 texels up, so its tools hang low)
    m.front(34, 26, 0, 52, 55, (b, w, h) => {
      for (let x = 0; x < w; x++) fill(b, x, 0, 1, h, x % 6 === 0 ? 'wood5' : 'wood4');
      const r = h - 26;
      fill(b, 6, r, 38, 2, 'wood3'); fill(b, 6, r, 38, 1, 'wood2');
      for (const [x, l] of [[10, 9], [16, 11], [22, 8]]) { fill(b, x, r + 2, 1, l, 'wood2'); fill(b, x - 1, r + 2 + l, 3, 3, 'iron2'); px(b, x - 1, r + 2 + l, 'iron1'); }
      for (const x of [29, 35]) { line(b, x, r + 2, x - 2, r + 13, 'iron2'); line(b, x + 1, r + 2, x + 3, r + 13, 'iron3'); }
      disc(b, 43, r + 9, 4, 4, 'brass3'); disc(b, 43, r + 9, 3, 3, 'brass2'); disc(b, 43, r + 9, 1, 1, 'wood4'); px(b, 41, r + 7, 'brass0');
    });
    const post = (b, w, h) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, 1, h, 'wood2'); fill(b, w - 1, 0, 1, h, 'wood4'); };
    m.box(36, 39, -3, 0, 0, 47, post); m.box(83, 86, -3, 0, 0, 47, post);
    m.quad((b, w, h) => {
      for (let y = 0; y < h; y++) fill(b, 0, y, w, 1, y % 5 === 0 ? 'wood1' : y % 5 === 4 ? 'wood4' : 'wood3');
      for (let y = 0; y < h; y += 5) for (let x = 2 + ((y / 5) & 1) * 9; x < w; x += 18) fill(b, x, y + 1, 1, 3, 'wood4');
      moss(b, 22, 3, 18, 14, 2);
    }, [32, 56, 30], [89, 56, 30], [89, 48, -6], [32, 48, -6]);
    m.quad(board, [32, 48, -6], [89, 48, -6], [89, 45, -6], [32, 45, -6]);
    m.quad(board, [89, 48, -6], [89, 56, 30], [89, 53, 30], [89, 45, -6]);
    // in the shed: the anvil on its stump, the bellows by the hearth, the scrap crate; on the house, the anvil sign
    const anvil = inked(17, 22, b => {
      fill(b, 3, 10, 11, 12, 'wood3'); fill(b, 3, 10, 3, 12, 'wood2'); fill(b, 11, 10, 3, 12, 'wood4'); disc(b, 8, 10, 5, 1, 'wood1');
      fill(b, 1, 1, 15, 4, 'iron3'); fill(b, 1, 1, 15, 1, 'iron1'); fill(b, 0, 2, 2, 2, 'iron3');
      fill(b, 5, 5, 7, 2, 'iron4'); fill(b, 3, 7, 11, 3, 'iron3'); fill(b, 3, 7, 11, 1, 'iron2');
    });
    const bellows = inked(12, 14, b => {
      fill(b, 0, 9, 3, 3, 'wood4'); line(b, 1, 9, 1, 4, 'wood3');
      for (let y = 4; y < 14; y++) fill(b, 2, y, 9 - Math.abs(y - 9), 1, y < 9 ? RUST[1] : RUST[2]);
    });
    const crate = inked(20, 20, b => {
      fill(b, 0, 6, 20, 14, 'wood2'); fill(b, 0, 6, 20, 1, 'wood1'); fill(b, 0, 12, 20, 1, 'wood3'); fill(b, 0, 19, 20, 1, 'wood4'); fill(b, 0, 6, 2, 14, 'wood3'); fill(b, 18, 6, 2, 14, 'wood3');
      line(b, 2, 5, 8, 0, 'iron2'); line(b, 10, 5, 16, 1, 'iron3'); fill(b, 5, 3, 4, 3, 'iron1');
      for (const [x, y] of [[3, 3], [12, 4], [16, 3]]) { fill(b, x, y, 3, 2, 'brass1'); px(b, x, y, 'brass0'); }
    });
    const sign = inked(17, 16, b => {
      fill(b, 1, 0, 14, 2, 'iron3'); fill(b, 2, 2, 1, 3, 'iron3'); fill(b, 12, 2, 1, 3, 'iron3');
      fill(b, 0, 5, 16, 11, 'wood4'); fill(b, 1, 6, 14, 9, 'wood2'); fill(b, 1, 6, 14, 1, 'wood1');
      fill(b, 3, 8, 10, 2, 'iron4'); fill(b, 1, 8, 2, 1, 'iron4'); fill(b, 6, 10, 5, 2, 'iron4'); fill(b, 4, 12, 9, 1, 'iron4');
    });
    const card = (img, x, back, o = {}) => ({ img: img.canvas(), ax: img.w >> 1, ay: img.h - 1, x, back, up: 0, ...o });
    return {
      model: m, base: [X0, 88], depth: 40, door: -16, w: 180, ay: 150,
      cards: [card(anvil, 58, 12), card(bellows, 42, 18), card(crate, 74, 18), card(sign, -47, -1, { up: 30, wall: true, walk: true })],
      smoke: [[23, TOP, 17]],
    };
  }

  /* ---------------- Marlow's shop ---------------- */
  /* The Shop That Opens Once, at the end of the grove path, built in 3D (model.js) and half swallowed by the grove: an
     old bottle-green shopfront under a steep plum shingle roof whose gable faces the path, two curio windows of clocks,
     bottles and toys either side of an arched door, the CURIOS board over them, a round attic window, a crooked
     chimney. The roots of the ancient tree behind it come over the ridge and down both slopes and its corners; ivy
     hangs from the roof line, moss lies on everything, ferns grow at its walls. Its seven lanterns hang from the front
     verges (lantern_i lit, lantern_i_day dark), the CLOSED card hangs on the door by day. door: the door's centre. */
  function marlowShop() {
    const m = MODEL.make(), X0 = -52, X1 = 52, D = 64, WALL = 52, RISE = 48, OV = 6, OLD = V.OLD;
    const GREEN = ['#8fc3a8', '#5f9680', '#46755f', '#325747', '#213b35'], SHINGLE = ['#b49ab4', '#8a7196', '#68557a', '#4a3c5c', '#30263f'];
    const board = (b, w, h) => { fill(b, 0, 0, w, h, 'wood4'); fill(b, 0, 0, w, 1, 'wood3'); fill(b, 0, h - 1, w, 1, 'wood5'); };
    // painted planks from row top down, on a stone footing with moss along it
    const planks = (b, w, h, top, seed) => {
      for (let x = 0; x < w; x++) fill(b, x, top, 1, h - top, x % 6 === 0 ? GREEN[3] : x % 6 === 1 ? GREEN[1] : GREEN[2]);
      for (let x = 0; x < w; x += 10) { fill(b, x, h - 5, 10, 5, 'stone2'); fill(b, x, h - 5, 10, 1, 'stone1'); fill(b, x + 9, h - 5, 1, 5, 'stone3'); }
      for (let x = 2; x < w - 8; x += 17 + ((hash(x, 0, seed) * 12) | 0)) moss(b, x, h - 5, 6 + ((hash(x, 1, seed) * 8) | 0), seed + x, 2);
    };
    // ivy hanging from the row top(u) of each column, here and there
    const curtain = (b, w, top, seed) => {
      for (let u = 1; u < w - 1; u++) {
        if (hash(u >> 1, 0, seed) > 0.5) continue;
        const len = 2 + ((hash(u, 1, seed) * 14) | 0);
        for (let j = 0, y = top(u); j < len && b.get(u, y); j++, y++) {
          px(b, u, y, j === len - 1 ? MOSS[1] : MOSS[4]);
          if (j % 3 === 1) { const s = (j / 3) & 1 ? 1 : -1; px(b, u + s, y, MOSS[2]); px(b, u + s, y + 1, MOSS[3]); }
        }
      }
    };
    // leaves dropped from the crown above: a clump of foliage round (cx, cy)
    const leaves = (b, cx, cy, rx, ry, seed) => V.foliage(b, inEllipse(cx, cy, rx, ry), [cx - rx, cy - ry, cx + rx, cy + ry], MOSS, seed, { cw: 6, ch: 5, dx: 4, dy: 3 });
    // an old root running down a picture through pts ([x, y], downward), thinning from w0 to w1: lit left, dark right
    const hangRoot = (b, pts, w0, w1, seed) => {
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [cx, cy] = pts[i];
        for (let y = Math.round(ay); y <= Math.round(cy); y++) {
          const t = cy === ay ? 0 : (y - ay) / (cy - ay), w = Math.max(2, Math.round(w0 + (w1 - w0) * (i - 1 + t) / (pts.length - 1))), l = Math.round(ax + (cx - ax) * t - w / 2);
          for (let k = 0; k < w; k++) px(b, l + k, y, k === w - 1 ? OLD[3] : k < 2 ? OLD[0] : k >= w - 3 ? OLD[2] : Math.sin(y * 0.6 + k * 1.7 + seed) > 0.8 ? OLD[2] : OLD[1]);
        }
        if (i % 2 === 0) moss(b, Math.round(ax - w0 / 2), Math.round(ay), Math.max(3, w0 - 2), seed + i, 2);
      }
    };
    // a curio window: small panes, shelves of clocks, bottles and toys behind the glass, flowers along its box
    const curio = (b, x, y, w, h, lit) => {
      fill(b, x - 3, y - 3, w + 6, h + 6, 'wood5'); fill(b, x - 2, y - 2, w + 4, h + 4, 'wall2'); fill(b, x - 2, y - 2, w + 4, 1, 'wall1');
      fill(b, x, y, w, h, 'sky3'); fill(b, x, y + h - 5, w, 5, 'sky4');
      const shelves = [y + 8, y + 16, y + h - 1], ware = ['brass2', 'rose', 'blue', 'brass1', 'lilac', 'wood2', 'roofG2', 'red'];
      shelves.forEach((sy, r) => {
        fill(b, x, sy, w, 1, 'wood3');
        for (let k = 0, xx = x + 1 + r; xx < x + w - 3; k++, xx += 4 + ((hash(k, r, x) * 3) | 0)) {
          if (hash(k, r + 5, x) < 0.25) continue;
          const c = ware[(hash(k, r + 9, x) * ware.length) | 0], ch = 2 + ((hash(k, r + 3, x) * 4) | 0);
          fill(b, xx, sy - ch, 2 + (k & 1), ch, c); px(b, xx, sy - ch, 'white');
        }
      });
      for (const mx of [x + (w / 3 | 0), x + (2 * w / 3 | 0)]) fill(b, mx, y, 1, h, 'wall2');
      fill(b, x, y + (h >> 1), w, 1, 'wall2');
      lit.push([x, y, w, h]);
      fill(b, x - 4, y + h + 2, w + 8, 3, 'wood3'); fill(b, x - 4, y + h + 2, w + 8, 1, 'wood2');
      for (let k = 0; k < w + 6; k += 2) { px(b, x - 3 + k, y + h + 1, k % 4 ? 'pink' : 'white'); px(b, x - 3 + k + 1, y + h + 1, MOSS[2]); }
    };
    const g = MODEL.gable(m, {
      x0: X0, x1: X1, d: D, wall: WALL, rise: RISE, ov: OV, ridge: 'back', board,
      front(b, w, h, lit) {
        const wt = h - WALL, roofLine = u => Math.round(h - (WALL + RISE * Math.max(0, 1 - Math.abs(u + 0.5 - w / 2) / (w / 2))));
        // the gable: weathered dark boards and a round attic window
        for (let x = 0; x < w; x++) fill(b, x, 0, 1, wt, x % 4 === 0 ? 'wood5' : x % 4 === 1 ? 'wood3' : 'wood4');
        win(b, (w >> 1) - 6, 22, 12, 13, lit, { arch: true, frame: 'wood5', sill: 'wood3' });
        planks(b, w, h, wt, 11);
        fill(b, 0, wt - 2, w, 3, 'cream2'); fill(b, 0, wt - 2, w, 1, 'cream1'); fill(b, 0, wt + 1, w, 1, GREEN[4]);
        // the name board, the curio windows, the door with its round light and worn step
        fill(b, 16, wt + 3, 72, 10, 'wood5'); fill(b, 17, wt + 4, 70, 8, GREEN[4]); fill(b, 17, wt + 4, 70, 1, GREEN[3]);
        text(b, 'CURIOS', (w >> 1) - (PX.textWidth('CURIOS') >> 1), wt + 5, 'brass1');
        curio(b, 9, wt + 19, 26, 21, lit); curio(b, w - 35, wt + 19, 26, 21, lit);
        const dx = (w >> 1) - 11;
        door(b, dx, h - 40, 22, 35, { arch: true, c: [GREEN[1], GREEN[2], GREEN[3], GREEN[4]], frame: 'wood5' });
        disc(b, dx + 11, h - 30, 4, 4, 'wood5'); disc(b, dx + 11, h - 30, 3, 3, 'sky3'); px(b, dx + 10, h - 31, 'white'); lit.push([dx + 8, h - 33, 7, 7]);
        fill(b, dx - 4, h - 5, 30, 5, 'stone1'); fill(b, dx - 4, h - 5, 30, 1, 'stone0'); fill(b, dx - 4, h - 1, 30, 1, 'stone3');
        // the old roots down both corners, from the roof to the ground, and ivy hanging from the roof line
        hangRoot(b, [[(w >> 1) - 9, roofLine((w >> 1) - 9) + 1], [36, 24], [22, 38], [13, wt + 2], [9, wt + 22], [6, h - 12], [5, h]], 11, 15, 3);
        hangRoot(b, [[24, roofLine(24) + 1], [19, wt + 2], [16, wt + 12]], 6, 3, 4);
        hangRoot(b, [[(w >> 1) + 12, roofLine((w >> 1) + 12) + 1], [70, 30], [w - 14, wt], [w - 9, wt + 14], [w - 6, h - 8], [w - 5, h]], 8, 12, 5);
        curtain(b, w, roofLine, 6);
        leaves(b, 12, wt - 2, 10, 6, 9); leaves(b, w - 12, wt - 1, 9, 5, 10); leaves(b, (w >> 1) - 10, 12, 7, 4, 11);
        ivy(b, w - 18, h - 6, wt + 18, 7); ivy(b, 38, h - 6, h - 30, 8);
        patch(b, 34, wt + 15, 4, 1); patch(b, 70, wt + 15, 3, 1);
      },
      left: (b, w, h) => { planks(b, w, h, 0, 12); curtain(b, w, () => 0, 13); hangRoot(b, [[18, 0], [15, 20], [17, h]], 8, 11, 6); ivy(b, 44, h - 6, 8, 14); },
      right: (b, w, h) => { planks(b, w, h, 0, 15); curtain(b, w, () => 0, 16); hangRoot(b, [[24, 0], [27, 22], [25, h]], 8, 11, 7); ivy(b, 8, h - 6, 14, 17); },
      // shingles gone mossy, and the ancient tree's roots coming over the ridge from behind and down to the eave
      roof(b, w, h, which) {
        const back = u => which === 'left' ? u : w - 1 - u;
        tiles(b, 4, h, () => [0, w], SHINGLE, which === 'left' ? 31 : 32, 6, 5, [SHINGLE[3], SHINGLE[3]]);
        ridge(b, 0, w, 0, SHINGLE);
        for (const [u, v, r] of [[14, 20, 5], [52, 34, 4], [30, 58, 6], [62, 66, 4], [8, 48, 3]]) patch(b, back(u), v, r, 2);
        const s = which === 'left' ? 0 : 20;
        hangRoot(b, [[back(8), 0], [back(13), h * 0.3], [back(22), h * 0.6], [back(26), h]], 20, 10, s + 1);
        hangRoot(b, [[back(34), 0], [back(38), h * 0.25], [back(48), h * 0.55], [back(58), h * 0.8], [back(64), h]], 14, 6, s + 2);
        hangRoot(b, [[back(20), h * 0.4], [back(10), h * 0.7], [back(6), h]], 9, 4, s + 3);
        hangRoot(b, [[back(50), h * 0.5], [back(68), h]], 7, 3, s + 4);
        leaves(b, back(20), 8, 16, 8, s + 5); leaves(b, back(54), 14, 11, 6, s + 6); leaves(b, back(40), h - 8, 9, 5, s + 7);
        moss(b, 0, h - 3, w, s + 8, 1);
      },
    });
    // the crooked chimney through the right slope, ivy up its front
    m.box(18, 30, 40, 52, 56, 114, (b, w, h, lit, which) => {
      if (which === 'top') { fill(b, 0, 0, w, h, 'stone2'); fill(b, 3, 3, w - 6, h - 6, 'stone5'); return; }
      stones(b, 0, 0, w, h, which === 'front' ? 21 : 22);
      fill(b, 0, 0, w, 4, 'stone1'); fill(b, 0, 0, w, 1, 'stone0'); fill(b, 0, 4, w, 1, 'stone4');
      if (which === 'front') ivy(b, 4, h - 1, 10, 23);
    });
    // its lanterns along the verges, one under the peak; the CLOSED card; ferns and mossy rocks at its walls
    const card = (s, x, back, o = {}) => ({ img: s.img, ax: s.ax, ay: s.ay, x, back, up: 0, ...o });
    const on = V.lantern(true), off = V.lantern(false), lh = on.img.height, under = x => g.roofAt(x, 0) - 3;
    const lanterns = [-44, -30, -16, 0, 16, 30, 44].flatMap((x, i) => [[on, ''], [off, '_day']].map(([l, k]) =>
      card({ img: l.img, ax: l.ax, ay: lh - 1 }, x, -OV, { up: Math.round(under(x)) - lh, wall: true, walk: true, name: `lantern_${i}${k}`, ...(k ? { day: true } : { light: true }) })));
    const closed = V.closedCard();
    // the roots that come down its corners run out over the ground either side of the door
    const RW = 220, mat = inked(RW, 30, b => {
      for (const sd of [-1, 1]) {
        const x0 = (RW >> 1) + sd * 50;
        V.root(b, [[x0, 2], [x0 + sd * 20, 8], [x0 + sd * 38, 12], [x0 + sd * 56, 20]], 14, 4, OLD, 30 + sd);
        V.root(b, [[x0, 3], [x0 - sd * 6, 12], [x0 - sd * 10, 22]], 10, 3, OLD, 32 + sd);
        V.root(b, [[x0 + sd * 18, 7], [x0 + sd * 30, 18], [x0 + sd * 34, 27]], 7, 3, OLD, 34 + sd);
      }
    });
    return {
      model: m, base: [X0 - 4, X1 + 4], depth: D, door: 0, w: X1 - X0 + 2 * OV, ay: 160,
      cards: [
        ...lanterns,
        card({ img: closed, ax: closed.width >> 1, ay: closed.height - 1 }, 0, 0, { up: 24, wall: true, walk: true, name: 'closed', day: true }),
        card({ img: mat.canvas(), ax: (RW >> 1) + 1, ay: 0 }, 0, -1, { up: 1, walk: true, name: 'roots' }),   // lifted off the ground it lies on, along the camera's ray
        ...[[-62, 2, 12], [58, 4, 11], [-40, -4, 8], [44, -2, 9]].map(([x, back, r], i) => card(V.bush({ r, seed: 80 + i, leaf: 'deep' }), x, back, { name: 'bush_' + i })),
        ...[[-60, 6], [-50, -6], [-24, -8], [24, -8], [52, -6], [62, 8]].map(([x, back], i) => card(V.fern(i + 3), x, back, { walk: true, name: 'fern_' + i })),
        card(V.mossRock(4), -68, 14, { name: 'rock_0' }), card(V.mossRock(5), 66, 20, { name: 'rock_1' }),
      ],
      smoke: [[24, 114, 46]],
    };
  }

  /* The card in the shop's window by day. */
  function closedCard() {
    const w = PX.textWidth('CLOSED') + 6;
    return inked(w, 9, b => { fill(b, 0, 0, w, 9, 'wall0'); fill(b, 0, 8, w, 1, 'wall3'); text(b, 'CLOSED', 3, 2, 'red'); fill(b, (w >> 1) - 1, -3, 1, 3, 'iron3'); }).canvas();
  }

  /* A small hanging lantern on its cord. ax, ay is the hook (the top of the cord), not the feet; glass is the pane
     rect that glows when lit. */
  function lantern(lit = true) {
    const out = inked(7, 13, b => {
      fill(b, 3, 0, 1, 3, 'iron3');
      fill(b, 2, 2, 3, 1, 'iron2'); fill(b, 1, 3, 5, 1, 'iron3'); fill(b, 0, 4, 7, 1, 'iron4');
      fill(b, 0, 5, 7, 6, 'iron4');
      fill(b, 1, 5, 5, 6, lit ? 'light2' : 'stone5'); if (lit) { fill(b, 2, 6, 3, 4, 'light1'); fill(b, 3, 7, 1, 2, 'light0'); } else { px(b, 1, 5, 'sky3'); px(b, 1, 6, 'sky4'); }
      fill(b, 3, 5, 1, 6, lit ? 'brass2' : 'iron3');
      fill(b, 0, 11, 7, 1, 'iron3'); fill(b, 2, 12, 3, 1, 'iron4');
    });
    return { img: out.canvas(), ax: 4, ay: 0, glass: [2, 6, 5, 6] };
  }

  /* ---------------- homes ---------------- */
  /* Helen's cottage: a thatched loaf of a roof with an eyebrow dormer, cream walls framed in dark timber, a rose
     door under a rose trellis, rose shutters and window boxes. */
  function helenHouse() {
    const W = 140, H = 126, wy = 74, wb = 120, lit = [];
    const out = inked(W, H, b => {
      fill(b, 106, 0, 12, 26, 'stone2'); fill(b, 106, 0, 3, 26, 'stone1'); fill(b, 115, 0, 3, 26, 'stone3'); fill(b, 105, 0, 14, 3, 'stone1'); fill(b, 105, 2, 14, 1, 'stone4');
      for (let y = 6; y < 26; y += 5) fill(b, 106, y, 12, 1, 'stone3');
      // the walls: cream plaster in a dark timber frame
      fill(b, 10, wy, 120, wb - wy, 'wall1');
      for (const x of [10, 44, 96, 127]) fill(b, x, wy, 3, wb - wy, 'wood4');
      fill(b, 10, 96, 120, 3, 'wood4'); fill(b, 10, 96, 120, 1, 'wood3');
      for (const [x0, x1] of [[13, 44], [99, 127]]) { line(b, x0, wb - 1, x1 - 1, 99, 'wood4'); line(b, x0 + 1, wb - 1, x1, 99, 'wood4'); }
      fill(b, 126, wy, 1, wb - wy, 'wall2');
      // windows with rose shutters and window boxes
      for (const x of [22, 104]) {
        win(b, x, 80, 14, 13, lit, { sill: false });
        for (const s of [x - 8, x + 16]) { fill(b, s, 78, 6, 17, ROSE[3]); fill(b, s, 78, 6, 1, ROSE[2]); for (let y = 81; y < 94; y += 3) fill(b, s + 1, y, 4, 1, ROSE[4]); fill(b, s + 5, 78, 1, 17, ROSE[4]); }
        fill(b, x - 3, 100, 20, 5, 'wood3'); fill(b, x - 3, 100, 20, 1, 'wood2'); fill(b, x - 3, 104, 20, 1, 'wood4');
        for (let k = 0; k < 20; k += 3) { px(b, x - 2 + k, 98, k % 2 ? ROSE[2] : 'white'); px(b, x - 3 + k, 99, MOSS[2]); px(b, x - 1 + k, 99, MOSS[1]); }
      }
      // the rose door under a trellis of climbing roses
      const dx = 59, dy = wb - 36;
      door(b, dx, dy, 22, 36, { arch: true, c: [ROSE[2], ROSE[3], ROSE[4], ROSE[5]], frame: 'wood4' });
      disc(b, dx + 11, dy + 9, 3, 3, 'wood4'); disc(b, dx + 11, dy + 9, 2, 2, 'sky3'); px(b, dx + 10, dy + 8, 'white'); lit.push([dx + 9, dy + 7, 5, 5]);
      for (let j = 0; j < 44; j++) {
        const y = wb - 1 - j, i = j > 34 ? archIn(30, 44 - j) : 0;
        for (const x of [dx - 4 + i, dx + 25 - i]) { px(b, x, y, MOSS[3]); if ((j + (x > dx ? 2 : 0)) % 4 === 0) { px(b, x - 1, y, MOSS[2]); px(b, x + 1, y - 1, MOSS[1]); } if ((j * 7 + x) % 11 === 0) { fill(b, x - 1, y - 1, 2, 2, 'rose'); px(b, x - 1, y - 1, ROSE[1]); } }
      }
      for (let x = dx; x < dx + 22; x++) { const y = wb - 44 + (x === dx || x === dx + 21 ? 1 : 0); px(b, x, y, MOSS[3]); if (x % 4 === 1) { fill(b, x, y - 1, 2, 2, 'rose'); px(b, x, y - 1, ROSE[1]); } }
      // the thatch: courses of straw bundles on a rounded loaf, a thick rolled lip at the eave
      const roofTop = 12, eave = 80, TH = ['dirt0', 'dirt1', 'dirt2', 'dirt3', 'dirt4'];
      const span = y => { const r = 24, t = y - roofTop, i = t < r ? Math.round(r - Math.sqrt(r * r - (r - t) * (r - t))) : y > eave - 3 ? y - (eave - 3) : 0; return [2 + i, W - 2 - i]; };
      for (let y = roofTop; y < eave - 7; y++) {
        const [l, r] = span(y), c = Math.floor((y - roofTop) / 7), sy = (y - roofTop) % 7;
        for (let x = l; x < r; x++) {
          const sx = (x + (c & 1) * 3) % 6, end = Math.min(x - l, r - 1 - x);
          let t = sy < 2 ? 1 : sy < 5 ? 2 : 3;
          if (sy >= 2 && sy < 5 && sx === 2) t = 3;
          if (sy === 6 && (sx === 0 || sx === 5)) t = 4;
          if (sy === 0 && sx === 3 && c > 0) t = 0;
          if (end < 5) t = Math.min(4, t + 1);
          px(b, x, y, end === 0 ? 'dirt4' : TH[t]);
        }
      }
      for (let y = eave - 7; y < eave; y++) {
        const [l, r] = span(y), k = y - eave + 7;
        for (let x = l; x < r; x++) px(b, x, y, x === l || x === r - 1 ? 'dirt4' : k === 0 ? 'dirt4' : k < 3 ? (k === 1 ? 'dirt0' : 'dirt1') : k < 5 ? ((x % 3) ? 'dirt2' : 'dirt3') : k === 5 ? 'dirt3' : 'dirt4');
      }
      for (let y = roofTop - 4; y < roofTop + 4; y++) { const l = 26 - (y - roofTop + 4), w = W - 2 * l; if (w > 0) fill(b, l, y, w, 1, y === roofTop - 4 ? 'dirt2' : y > roofTop + 1 ? 'dirt4' : 'dirt3'); }
      for (let x = 24; x < W - 24; x += 6) { px(b, x, roofTop - 1, 'dirt1'); px(b, x + 1, roofTop - 2, 'dirt1'); px(b, x + 2, roofTop - 1, 'dirt1'); px(b, x + 3, roofTop, 'dirt4'); }
      // the eyebrow dormer: the thatch swells up and over a little window
      const ex = 70;
      for (let x = ex - 22; x < ex + 22; x++) {
        const h = Math.round(Math.sqrt(Math.max(0, 1 - ((x - ex) / 22) ** 2)) * 9), top = 47 - h;
        for (let y = top; y < 48; y++) px(b, x, y, y === top ? 'dirt4' : y === top + 1 ? 'dirt0' : y < top + 4 ? 'dirt1' : y > 45 ? 'dirt4' : (x % 3 ? 'dirt2' : 'dirt3'));
      }
      fill(b, ex - 10, 48, 20, 10, 'wood4'); fill(b, ex - 9, 48, 18, 9, 'sky3'); fill(b, ex - 9, 54, 18, 3, 'sky4'); fill(b, ex - 1, 48, 2, 9, 'wood4'); px(b, ex - 8, 49, 'white'); px(b, ex - 7, 49, 'white');
      fill(b, ex - 11, 58, 22, 2, 'wood3'); fill(b, ex - 11, 59, 22, 1, 'wood4'); lit.push([ex - 9, 48, 18, 9]);
      fill(b, 10, eave, 120, 3, 'wall3');
      // footing, step, pots
      for (let x = 9; x < W - 9; x += 10) { fill(b, x, wb, 10, H - wb, 'stone2'); fill(b, x, wb, 10, 1, 'stone1'); fill(b, x + 9, wb, 1, H - wb, 'stone3'); }
      fill(b, 9, H - 1, W - 18, 1, 'stone4');
      fill(b, dx - 4, wb, 30, H - wb, 'stone1'); fill(b, dx - 4, wb, 30, 1, 'stone0'); fill(b, dx - 4, H - 1, 30, 1, 'stone3');
      potPlant(b, 44, wb + 4, 3, ROSE[3]); potPlant(b, 88, wb + 4, 4, 'white');
    });
    return { img: out.canvas(), ax: 71, ay: H, base: [-62, 62], body: [81, 13], foot: 44, door: 0, lit: toImg(lit), smoke: [[113, 1]] };
  }

  /* Mender's house: rough grey stone under a patched corrugated-iron roof, a great stone chimney up its side, an
     iron-strapped door under an iron hood, a barred window, a gear for a weathervane, an old cog against the wall. */
  function menderHouse() {
    const W = 140, H = 128, wy = 72, wb = 122, lit = [];
    const out = inked(W, H, b => {
      // gear weathervane
      fill(b, 40, 4, 1, 14, 'iron3'); disc(b, 40, 6, 4, 4, 'brass3'); disc(b, 40, 6, 3, 3, 'brass2'); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; px(b, 40 + Math.round(Math.cos(a) * 5), 6 + Math.round(Math.sin(a) * 5), 'brass3'); } px(b, 40, 6, 'iron4'); px(b, 38, 4, 'brass0');
      // the roof: corrugated sheets, rust and grey, overlapping in two courses
      for (let y = 18; y < wy - 2; y++) {
        const course = y < 44 ? 0 : 1, sy = course ? y - 44 : y - 18;
        for (let x = 0; x < 118; x++) {
          const panel = ((x + course * 8) / 16) | 0, grey = hash(panel, course, 5) < 0.35, R4 = grey ? ['iron1', 'iron2', 'iron2', 'iron3'] : [RUST[0], RUST[1], RUST[1], RUST[2]];
          let c = R4[x % 4];
          if (sy === 0) c = grey ? 'iron0' : RUST[0]; else if (sy === 1 && course) c = grey ? 'iron4' : RUST[3];
          if ((x + course * 8) % 16 === 0) c = grey ? 'iron3' : RUST[2];
          px(b, x, y, c);
        }
      }
      fill(b, 0, 14, 118, 4, 'iron2'); fill(b, 0, 14, 118, 1, 'iron0'); fill(b, 0, 17, 118, 1, 'iron4'); for (let x = 6; x < 118; x += 12) px(b, x, 15, 'iron4');
      fill(b, 0, 14, 1, wy - 14, 'iron4'); fill(b, 117, 14, 1, wy - 14, 'iron4');
      patch(b, 30, 62, 4, 1); patch(b, 86, 36, 3, 1); moss(b, 52, 14, 14, 7, 2);
      // walls of rough stone, the gutter and downpipe
      stones(b, 6, wy, 106, wb - wy, 8, ROUGH, 8);
      quoins(b, 6, wy, wb, 1);
      fill(b, 6, wy, 106, 2, 'r3');
      fill(b, 0, wy - 3, 118, 3, 'iron2'); fill(b, 0, wy - 3, 118, 1, 'iron1'); fill(b, 0, wy - 1, 118, 1, 'iron4');
      fill(b, 9, wy, 3, wb - wy - 2, 'iron3'); fill(b, 9, wy, 1, wb - wy - 2, 'iron2'); for (let y = wy + 8; y < wb; y += 14) fill(b, 8, y, 5, 1, 'iron4'); fill(b, 8, wb - 3, 6, 2, 'iron3');
      for (const x of [30, 60, 98]) { fill(b, x, wy + 2, 1, 6 + (x % 5), RUST[2]); px(b, x, wy + 8 + (x % 5), RUST[3]); }
      // the door under an iron hood
      door(b, 32, wb - 38, 24, 38, { straps: true, c: ['wood2', 'wood3', 'wood4', 'wood5'] });
      for (let y = wb - 34; y < wb - 4; y += 6) for (let x = 36; x < 54; x += 6) px(b, x, y, 'iron1');
      fill(b, 27, wb - 46, 34, 3, 'iron2'); fill(b, 27, wb - 46, 34, 1, 'iron0'); fill(b, 27, wb - 44, 34, 1, 'iron4');
      for (const x of [28, 58]) line(b, x, wb - 43, x + (x < 40 ? 3 : -3), wb - 40, 'iron3');
      // barred window with iron shutters
      win(b, 74, 84, 16, 16, lit, { frame: 'iron4', sill: 'r1' });
      for (const x of [78, 82, 86]) fill(b, x, 84, 1, 16, 'iron3'); fill(b, 74, 91, 16, 1, 'iron3');
      for (const s of [66, 92]) { fill(b, s, 82, 6, 20, RUST[1]); fill(b, s, 82, 6, 1, RUST[0]); fill(b, s + 5, 82, 1, 20, RUST[3]); for (let y = 86; y < 100; y += 5) fill(b, s, y, 6, 1, RUST[2]); px(b, s + 1, 84, 'iron1'); px(b, s + 1, 98, 'iron1'); }
      // the chimney stack, wider at the shoulder
      stones(b, 116, 2, 16, 64, 9, ROUGH, 8); stones(b, 110, 66, 26, wb - 66, 10, ROUGH, 8);
      for (let y = 60; y < 66; y++) fill(b, 116 - (y - 60), y, 16 + 2 * (y - 60), 1, y === 60 ? 'r1' : 'r2');
      fill(b, 114, 0, 20, 4, 'r1'); fill(b, 114, 0, 20, 1, 'r0'); fill(b, 114, 3, 20, 1, 'r4');
      fill(b, 110, 66, 2, wb - 66, 'r1'); fill(b, 134, 66, 2, wb - 66, 'r4');
      moss(b, 114, 0, 7, 3, 2); moss(b, 110, 66, 6, 4, 2);
      // footing, step, an old cog against the wall, firewood
      for (let x = 4; x < W - 4; x += 12) { fill(b, x, wb, 12, H - wb, 'r2'); fill(b, x, wb, 12, 1, 'r1'); fill(b, x + 11, wb, 1, H - wb, 'r3'); }
      fill(b, 4, H - 1, W - 8, 1, 'r4');
      fill(b, 26, wb, 36, H - wb, 'stone1'); fill(b, 26, wb, 36, 1, 'stone0'); fill(b, 26, H - 1, 36, 1, 'stone3');
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; fill(b, 100 + Math.round(Math.cos(a) * 10) - 1, 112 + Math.round(Math.sin(a) * 10) - 1, 3, 3, RUST[2]); }
      disc(b, 100, 112, 9, 9, RUST[1]); disc(b, 99, 111, 7, 7, RUST[0]); disc(b, 100, 112, 5, 5, RUST[2]); disc(b, 100, 112, 3, 3, RUST[3]); disc(b, 100, 112, 1, 1, 'iron4');
      fill(b, 63, 106, 22, 16, 'wood4');
      for (let r = 0; r < 3; r++) for (let x = 64 + (r & 1) * 2; x < 82; x += 6) { const y = 107 + r * 5; disc(b, x + 2, y + 2, 2, 2, 'wood1'); px(b, x + 2, y + 2, 'wood2'); px(b, x + 1, y + 1, 'wood0'); }
      moss(b, 6, wb, 14, 8, 2); moss(b, 112, wb, 16, 9, 2);
    });
    return { img: out.canvas(), ax: 71, ay: H, base: [-66, 66], body: [wy + 1, 19], foot: 46, door: -26, lit: toImg(lit), smoke: [[125, 1]] };
  }

  /* Kapten Bram's home: an old railway carriage on sleepers, its clerestory roof grown green, a stovepipe, curtained
     windows, a tin canopy over the door, a little porch with steps, a rail and plants. */
  function bramHome() {
    const W = 150, H = 96, lit = [];
    const out = inked(W, H, b => {
      // stovepipe and the clerestory roof
      fill(b, 102, 4, 5, 16, 'iron3'); fill(b, 102, 4, 1, 16, 'iron2'); fill(b, 106, 4, 1, 16, 'iron4'); fill(b, 100, 2, 9, 2, 'iron3'); fill(b, 101, 1, 7, 1, 'iron2'); fill(b, 101, 9, 7, 1, 'iron4');
      fill(b, 28, 12, 68, 7, 'iron2'); fill(b, 28, 12, 68, 1, 'iron0'); fill(b, 28, 18, 68, 1, 'iron4');
      for (let x = 34; x < 92; x += 10) { fill(b, x, 14, 5, 3, 'sky3'); px(b, x, 14, 'white'); }
      for (let y = 18; y < 31; y++) { const i = [6, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0][y - 18]; fill(b, 2 + i, y, 124 - 2 * i, 1, y < 21 ? 'iron1' : y > 28 ? 'iron4' : 'iron2'); }
      for (let x = 10; x < 124; x += 14) fill(b, x, 21, 1, 7, 'iron3');
      moss(b, 8, 18, 22, 3, 3); moss(b, 64, 18, 26, 4, 4); patch(b, 40, 25, 4, 1); moss(b, 30, 12, 12, 6, 1);
      potPlant(b, 112, 19, 8, 'yellow');
      // the body: faded green panels, a cream window band
      fill(b, 8, 31, 112, 43, 'roofG2'); fill(b, 8, 31, 112, 1, 'roofG1');
      fill(b, 8, 36, 112, 18, 'wall1'); fill(b, 8, 36, 112, 1, 'wall0'); fill(b, 8, 53, 112, 1, 'wall3');
      for (let x = 14; x < 118; x += 12) { fill(b, x, 57, 1, 14, 'roofG3'); fill(b, x + 1, 57, 1, 14, 'roofG1'); }
      fill(b, 8, 56, 112, 1, 'roofG3'); fill(b, 8, 71, 112, 3, 'roofG3');
      fill(b, 8, 31, 2, 43, 'roofG1'); fill(b, 118, 31, 2, 43, 'roofG4');
      // windows with curtains
      for (const [x, cc] of [[16, [ROSE[3], ROSE[2]]], [36, ['orange', 'yellow']], [56, [ROSE[3], ROSE[2]]], [76, ['orange', 'yellow']]]) {
        win(b, x, 39, 12, 11, lit, { frame: 'roofG4', sill: false });
        fill(b, x, 39, 12, 2, cc[0]); fill(b, x, 39, 3, 11, cc[0]); fill(b, x + 9, 39, 3, 11, cc[0]); px(b, x + 1, 41, cc[1]); px(b, x + 10, 41, cc[1]); fill(b, x + 2, 45, 1, 1, cc[1]); fill(b, x + 9, 45, 1, 1, cc[1]);
      }
      fill(b, 56, 58, 13, 7, 'brass3'); fill(b, 57, 59, 11, 5, 'brass2'); text(b, '07', 59, 59, 'brass4');
      // the door: a carriage door with a drop-light, under a tin canopy
      door(b, 96, 38, 20, 36, { c: ['roofG1', 'roofG2', 'roofG3', 'roofG4'], frame: 'roofG4' });
      fill(b, 99, 41, 14, 10, 'sky3'); fill(b, 99, 41, 14, 2, ROSE[3]); px(b, 100, 44, 'white'); lit.push([99, 43, 14, 8]);
      fill(b, 92, 33, 28, 3, 'iron2'); fill(b, 92, 33, 28, 1, 'iron0'); fill(b, 92, 35, 28, 1, 'iron4'); line(b, 93, 36, 96, 39, 'iron3'); line(b, 118, 36, 115, 39, 'iron3');
      fill(b, 121, 40, 1, 4, 'iron3'); fill(b, 120, 44, 3, 5, 'iron4'); fill(b, 121, 45, 1, 3, 'light1'); lit.push([121, 45, 1, 3]);
      // underframe, buffers, wheels on sleepers
      fill(b, 10, 74, 108, 4, 'iron4'); fill(b, 10, 74, 108, 1, 'iron3');
      for (const y of [71, 75]) { fill(b, 1, y, 7, 3, 'iron3'); fill(b, 1, y, 7, 1, 'iron1'); fill(b, 0, y, 2, 3, 'iron2'); }
      for (const x of [24, 42]) wheel(b, x, 82, 7);
      for (const x of [14, 52]) { fill(b, x - 6, 89, 20, 6, 'wood3'); fill(b, x - 6, 89, 20, 1, 'wood2'); fill(b, x - 6, 94, 20, 1, 'wood5'); fill(b, x + 4, 89, 1, 6, 'wood4'); }
      // the porch: a plank deck, a rail on the right, steps down from the door
      fill(b, 86, 74, 62, 5, 'wood2'); fill(b, 86, 74, 62, 1, 'wood1'); fill(b, 86, 78, 62, 1, 'wood4'); for (let x = 92; x < 148; x += 7) px(b, x, 76, 'wood3');
      for (const x of [88, 145]) { fill(b, x, 79, 3, 16, 'wood3'); fill(b, x + 2, 79, 1, 16, 'wood4'); }
      for (const x of [126, 145]) { fill(b, x, 58, 3, 16, 'wood3'); fill(b, x, 58, 1, 16, 'wood2'); }
      fill(b, 124, 57, 26, 3, 'wood2'); fill(b, 124, 57, 26, 1, 'wood1'); fill(b, 124, 59, 26, 1, 'wood4');
      for (let x = 131; x < 145; x += 4) fill(b, x, 60, 1, 14, 'wood3');
      for (const [y, l, w] of [[79, 94, 26], [85, 92, 30], [90, 90, 34]]) { fill(b, l, y, w, 5, 'wood2'); fill(b, l, y, w, 1, 'wood1'); fill(b, l, y + 4, w, 1, 'wood4'); }
      fill(b, 90, H - 1, 34, 1, 'wood5');
      potPlant(b, 128, 74, 9, 'rose'); potPlant(b, 137, 74, 10); potPlant(b, 82, 95, 12, 'yellow');
      moss(b, 10, 74, 14, 13, 2);
    });
    return { img: out.canvas(), ax: 76, ay: H, base: [-75, 73], foot: 30, door: 31, lit: toImg(lit), smoke: [[105, 2]] };
  }

  Object.assign(VIL, { station, platform, rails, teaStall, locomotive, wagon, waterTower, tunnelPortal, forge, marlowShop, closedCard, lantern, helenHouse, menderHouse, bramHome });
})();
