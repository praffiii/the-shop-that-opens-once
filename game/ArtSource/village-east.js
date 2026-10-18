'use strict';
/* The East of Bellwood, the green hills of home: Nora the toy maker's pastel stilt house, Satria's faded childhood
   cottage and its clothesline, the Gardener's home and glasshouse, Leo's lookout (the homes in 3D, VIL.house), the bus
   stop, Pip's twig swing and the playground, the chamomile field with its picket fence, and the aphid pen. Every maker follows the
   sprite contract of village.js; positions are drawn in Buf px, and inked() shifts them by one into img px. */
(() => {
  const V = VIL, { fill, px, disc, inked } = V, { Buf } = KIT;
  // Pastel paints, light to dark.
  const BLUE = ['#eaf5ff', '#c4e0fa', '#9cc4ec', '#7299cc'], MINT = ['#eafbe9', '#c6edca', '#9bd5a8', '#6eae85'];
  const PEACH = ['#fff0e6', '#ffd4c4', '#f0aa9a', '#c97f78'], TRIM = ['white', 'wall0', 'wall2', 'wall3'];
  const WOOD = ['wood1', 'wood2', 'wood3', 'wood4'], ramp = k => [0, 1, 2, 3, 4].map(i => k + i);
  const FADED = ['#ffd3bd', 'roofR0', 'roofR1', 'roofR2', 'roofR3'];

  const line = (b, x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) px(b, Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), c); };
  const ring = (b, cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y); if (d <= r + 0.3 && d > r - 1.7) px(b, cx + x, cy + y, c); } };

  /* ---------------- building parts ---------------- */
  // Bunting of fabric scraps: a string from (x0, y0) to (x1, y1) sagging by sag, pennants every 7 px, some patterned.
  const FABRIC = [['pink', 'rose'], ['yellow', 'orange'], [MINT[1], MINT[3]], ['lilac', '#9a7fd8'], [PEACH[1], PEACH[3]], ['white', 'blue'], [BLUE[1], BLUE[3]]];
  function bunting(b, x0, y0, x1, y1, sag, seed) {
    const Y = x => { const t = (x - x0) / (x1 - x0); return Math.round(y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)); };
    for (let x = x0; x <= x1; x++) px(b, x, Y(x), 'wood4');
    for (let x = x0 + 3, k = seed; x < x1 - 3; x += 7, k++) {
      const [c, d] = FABRIC[k % FABRIC.length], y = Y(x + 2) + 1;
      for (let j = 0; j < 6; j++) { const hw = Math.max(0, 2 - (j >> 1)); for (let i = -hw; i <= hw; i++) px(b, x + 2 + i, y + j, i === hw && j < 4 ? d : c); }
      if (k % 3 === 0) px(b, x + 2, y + 1, d); else if (k % 3 === 1) fill(b, x + 1, y + 2, 3, 1, d);
    }
  }
  // Nora's sign: a cream board hung from an iron bracket at (x, y) on the wall, a big pair of scissors painted on it.
  function scissorsSign(b, x, y) {
    fill(b, x, y, 24, 2, 'iron3'); fill(b, x, y, 24, 1, 'iron2'); fill(b, x, y - 2, 2, 7, 'iron3'); line(b, x + 1, y + 6, x + 9, y + 2, 'iron3');
    for (const cx of [x + 7, x + 18]) fill(b, cx, y + 2, 1, 3, 'iron2');
    const bx = x + 2, by = y + 5;
    fill(b, bx, by + 1, 22, 25, 'wood3'); fill(b, bx + 1, by, 20, 27, 'wood3'); fill(b, bx + 1, by + 1, 20, 25, 'wall0'); fill(b, bx + 2, by + 2, 18, 23, 'wall1'); fill(b, bx + 19, by + 2, 1, 23, 'wall2'); fill(b, bx + 2, by + 24, 18, 1, 'wall2');
    const cx = bx + 11, cy = by + 15;
    for (let t = 0; t < 12; t++) {
      const wd = t < 4 ? 3 : t < 8 ? 2 : 1, l = cx - 1 - Math.round(t * 0.5), r = cx + Math.round(t * 0.5), yy = cy - 1 - t;
      fill(b, l - wd + 1, yy, wd, 1, 'iron1'); px(b, l - wd + 1, yy, 'iron0'); px(b, l - wd, yy, 'iron3');
      fill(b, r, yy, wd, 1, 'iron2'); px(b, r + wd, yy, 'iron4');
    }
    ring(b, cx - 4, cy + 4, 3, 'red'); ring(b, cx + 4, cy + 4, 3, 'red'); px(b, cx - 6, cy + 2, 'rose'); px(b, cx + 2, cy + 2, 'rose'); px(b, cx - 4, cy + 7, 'roofR3'); px(b, cx + 4, cy + 7, 'roofR3');
    fill(b, cx - 1, cy - 1, 3, 3, 'brass2'); px(b, cx - 1, cy - 1, 'brass0');
  }
  /* ---------------- the homes, in 3D (VIL.house) ---------------- */
  const sprite = (W, H, paint, o = {}) => ({ img: inked(W, H, paint).canvas(), ax: (W >> 1) + 1, ay: H + 1, base: [-(W >> 1), W >> 1], foot: 8, ...o });
  const planks = (b, w, h, lit, which) => { fill(b, 0, 0, w, h, 'wood2'); if (which === 'top') for (let x = 4; x < w; x += 5) fill(b, x, 0, 1, h, 'wood3'); else { fill(b, 0, 0, w, 1, 'wood1'); fill(b, 0, h - 1, w, 1, 'wood4'); } };
  const post = (b, w, h) => { fill(b, 0, 0, w, h, 'wood3'); fill(b, 0, 0, 1, h, 'wood2'); fill(b, w - 1, 0, 1, h, 'wood4'); };

  /* Nenek Nora's stilt house, the toy maker's, by the river: pastel blue clapboard on a plank deck high on stilts, a
     coral door up a flight of plank steps, the big scissors sign by it, bunting of fabric scraps under the eave, flower
     boxes, a stone chimney. Out on the deck her loom, a plum shawl half woven on it. */
  function noraHouse() {
    const loom = inked(20, 26, b => {
      for (let x = 4; x < 16; x += 2) fill(b, x, 3, 1, 10, 'cream1');                          // the warp
      for (let y = 13; y < 22; y++) fill(b, 3, y, 14, 1, ['#8a5fb8', '#8a5fb8', '#633f8f', 'rose', '#8a5fb8', '#8a5fb8', 'yellow', '#633f8f', '#8a5fb8'][y - 13]);
      for (let y = 14; y < 22; y += 2) for (let x = 4 + (y & 2); x < 16; x += 4) px(b, x, y, '#b48ad6'); // its knit catching the light
      for (const x of [1, 17]) { fill(b, x, 0, 2, 26, 'wood3'); fill(b, x, 0, 1, 26, 'wood2'); }   // the posts
      for (const [y, h] of [[1, 2], [11, 2], [22, 2]]) { fill(b, 1, y, 18, h, 'wood2'); fill(b, 1, y, 18, 1, 'wood1'); } // the beams and the beater
    });
    return V.house({
      w: 136, d: 50, wall: 46, rise: 32, kind: 'clap', ramp: BLUE, trim: TRIM, roof: ramp('roofR'), seed: 41, stilts: 16, porch: 12,
      cards: [{ img: loom.canvas(), ax: 10, ay: 26, x: -38, back: 34, up: 16 }],
      wins: [[14, 12, 16, 16, { box: ['rose', 'yellow'] }], [106, 12, 16, 16, { box: ['rose', 'yellow'] }]], side: [[16, 12, 14, 14]],
      door: [57, 22, 36, { paint: PEACH, arch: true }], chimney: [44, 24],
      front(b, w, h) { bunting(b, 3, 2, 52, 2, 6, 0); bunting(b, 84, 2, w - 4, 2, 6, 3); scissorsSign(b, 82, h - 40); },
    });
  }
  /* Satria's childhood home in a quiet corner: a modest cottage gone soft with sun, its roof tiles bleached, flakes of
     plaster showing the boards, a grey shutter hanging askew. */
  function satriaHome() {
    return V.house({
      w: 104, d: 48, wall: 48, rise: 34, kind: 'plaster', ramp: ['wall0', 'wall1', 'wall2', 'wall3'], roof: FADED, seed: 42,
      wins: [[18, 14, 16, 16, { box: ['white', 'yellow'] }]], side: [[16, 14, 14, 14]],
      door: [58, 22, 36, { paint: ['wood0', 'wood1', 'wood2', 'wood3'], arch: true }], chimney: [30, 24],
      front(b, w, h, top) {
        for (const [x, y] of [[40, top + 32], [88, top + 10], [8, top + 38]]) { fill(b, x, y, 7, 4, 'wood1'); fill(b, x + 1, y + 4, 4, 1, 'wood1'); fill(b, x, y + 1, 7, 1, 'wood2'); px(b, x - 1, y + 1, 'wall3'); }
        // the grey shutters: the right one has dropped from its top hinge
        for (let j = 0; j < 18; j++) fill(b, 9, top + 13 + j, 7, 1, j % 3 ? 'stone1' : 'stone2');
        for (let j = 0; j < 18; j++) { const x = 37 + Math.round(j * 0.25); fill(b, x, top + 14 + j, 7, 1, j % 3 ? 'stone1' : 'stone2'); px(b, x + 6, top + 14 + j, 'stone3'); }
      },
    });
  }
  // Satria's clothesline: two T posts, a sagging line, a shirt, a striped towel and a pair of socks.
  function clothesline() {
    const g = 36;
    return sprite(46, g + 1, b => {
      for (const x of [2, 40]) { fill(b, x, g - 34, 3, 34, 'wood3'); fill(b, x, g - 34, 1, 34, 'wood2'); fill(b, x - 2, g - 35, 7, 2, 'wood2'); fill(b, x - 2, g - 35, 7, 1, 'wood1'); }
      const Y = x => g - 33 + Math.round(5 * Math.sin(Math.PI * (x - 3) / 38));
      for (let x = 3; x < 41; x++) px(b, x, Y(x), 'wall3');
      const cloth = (x, cw, ch, R, f) => { for (let i = 0; i < cw; i++) { const y = Y(x + i) + 1; fill(b, x + i, y, 1, ch, i === 0 ? R[0] : i === cw - 1 ? R[2] : R[1]); px(b, x + i, y + ch - 1, R[2]); if (f) f(x + i, y, i); } };
      cloth(7, 11, 9, BLUE); cloth(20, 8, 12, ['wall0', 'wall1', 'wall2'], (x, y) => { px(b, x, y + 3, 'rose'); px(b, x, y + 8, 'rose'); });
      cloth(30, 3, 7, ['white', 'wall0', 'wall2'], (x, y) => px(b, x, y + 6, 'red')); cloth(34, 3, 6, ['white', 'wall0', 'wall2'], (x, y) => px(b, x, y + 5, 'red'));
    }, { foot: 4 });
  }
  /* The Gardener's home by the fields: a honey-plank cottage under a green roof, red geraniums in its window boxes,
     a glazed door. */
  function gardenerHome() {
    return V.house({
      w: 112, d: 50, wall: 46, rise: 34, kind: 'clap', ramp: ['wood0', 'wood1', 'wood2', 'wood3'], trim: TRIM, roof: ramp('roofG'), seed: 43,
      wins: [[14, 13, 16, 16, { box: ['red', 'white'] }], [82, 13, 16, 16, { box: ['red', 'white'] }]], side: [[16, 13, 14, 14]],
      door: [45, 22, 34, { paint: MINT, glass: true }], chimney: [-34, 24],
    });
  }
  /* The Gardener's glasshouse: white frames over glass on a plank kick-wall, tomatoes and greens inside, the glass roof
     catching the sky. */
  function glasshouse() {
    const m = MODEL.make(), X0 = -40, X1 = 40, D = 56;
    const glass = (b, w, h) => {
      fill(b, 0, 0, w, h, 'sky2'); fill(b, 0, 0, w, 3, 'sky1');
      V.foliage(b, (x, y) => y > h - 22 + Math.sin(x / 3) * 2 && y < h - 8, [0, h - 24, w, h - 8], V.LEAF.green, 9, { cw: 7, ch: 5, dx: 5, dy: 4 });
      for (let x = 4; x < w; x += 11) { fill(b, x, h - 18, 2, 2, 'red'); px(b, x, h - 18, 'pink'); }
      for (let x = 0; x < w; x += 10) fill(b, x, 0, 2, h, TRIM[1]);
      fill(b, 0, 0, w, 2, TRIM[0]); fill(b, 0, h - 8, w, 8, 'wood2'); fill(b, 0, h - 8, w, 1, 'wood1'); fill(b, 0, h - 1, w, 1, 'wood4');
      for (let x = 3; x < w; x += 13) { px(b, x, 4, 'white'); px(b, x + 1, 5, 'white'); }
    };
    const pane = (b, w, h) => { fill(b, 0, 0, w, h, 'sky1'); for (let x = 0; x < w; x += 10) fill(b, x, 0, 2, h, TRIM[0]); for (let y = 0; y < h; y += 12) fill(b, 0, y, w, 1, TRIM[1]); for (let x = 5; x < w; x += 23) { px(b, x, 3, 'white'); px(b, x + 1, 4, 'white'); } };
    const g = MODEL.gable(m, {
      x0: X0, x1: X1, back0: 3, d: D, wall: 30, rise: 18, ov: 2, up0: 2, thick: 2, board: (b, w, h) => fill(b, 0, 0, w, h, TRIM[1]), roof: pane,
      front(b, w, h) { glass(b, w, h); fill(b, (w >> 1) - 9, h - 30, 18, 30, TRIM[2]); fill(b, (w >> 1) - 8, h - 29, 16, 20, 'sky3'); fill(b, (w >> 1) - 8, h - 9, 16, 9, MINT[1]); fill(b, (w >> 1) + 5, h - 14, 2, 2, 'brass1'); },
      left: glass, right: glass,
    });
    m.box(X0 - 2, X1 + 2, 1, D + 5, 0, 2, (b, w, h) => { fill(b, 0, 0, w, h, 'stone2'); fill(b, 0, 0, w, 1, 'stone1'); });
    return { model: m, base: [X0 - 2, X1 + 2], depth: D + 5, w: 84, ay: Math.round((D + 3) * MODEL.DEEP + g.R) };
  }
  /* Leo's lookout on the hill top: a little plank hut with a porthole, and beside it a lookout deck high on posts, a
     brass telescope on its tripod and a pennant on a pole up there. */
  function leoHut() {
    const scope = inked(30, 34, b => {
      const tx = 15, ty = 12;
      for (const [x, c] of [[-6, 'iron2'], [6, 'iron3'], [1, 'iron4']]) line(b, tx, ty, tx + x, 33, c);
      for (let k = 0; k < 20; k++) { const x = tx - 9 + k, y = ty + 3 - Math.round(k * 0.5), r = k < 6 ? 1 : 2; for (let j = -r; j <= r; j++) px(b, x, y + j, j === -r ? 'brass0' : j === r ? 'brass3' : j < 0 ? 'brass1' : 'brass2'); }
      fill(b, tx + 7, ty - 9, 3, 7, 'brass3'); fill(b, tx + 7, ty - 8, 2, 5, 'sky2'); px(b, tx + 7, ty - 8, 'white');
    });
    const flag = inked(24, 52, b => {
      fill(b, 20, 3, 2, 49, 'wood2'); fill(b, 21, 3, 1, 49, 'wood4'); fill(b, 19, 0, 4, 3, 'brass1');
      for (let i = 0; i < 18; i++) { const hh = Math.round(5 * (1 - i / 18)); for (let j = -hh; j <= hh; j++) px(b, 19 - i, 9 + j, j === hh ? 'orange' : Math.abs(j) < 2 && i > 3 && i < 12 ? 'red' : 'yellow'); }
    });
    const DU = 30, card = (img, ax, ay, x, back) => ({ img: img.canvas(), ax, ay, x, back, up: DU });
    return V.house({
      w: 58, d: 40, wall: 40, rise: 22, kind: 'plank', ramp: WOOD, trim: ['wood1', 'wood2', 'wood4'], roof: ramp('roofR'), seed: 44, plinth: 2,
      wins: [[8, 10, 12, 12, { arch: true, frame: ['brass1', 'brass2', 'brass3'], panes: 0 }]], door: [30, 20, 34],
      extra(m, g, { X1, F }) {
        // the lookout deck beside the hut: planks on four posts, a rail along its front, a ladder up to it
        const x0 = X1 + 6, x1 = X1 + 50;
        m.box(x0, x1, F - 2, F + 34, DU - 3, DU, planks);
        for (const x of [x0 + 1, x1 - 4]) for (const z of [F - 1, F + 30]) m.box(x, x + 3, z, z + 3, 0, DU - 3, post);
        m.box(x0, x1, F - 3, F - 1, DU, DU + 10, (b, w, h) => { fill(b, 0, 0, w, 2, 'wood2'); fill(b, 0, 0, w, 1, 'wood1'); for (let x = 0; x < w; x += 6) fill(b, x, 0, 2, h, 'wood3'); });
        for (let u = 2; u < DU - 3; u += 5) m.box(x1 - 16, x1 - 6, F - 3, F - 2, u, u + 1, post);
      },
      cards: [card(scope, 15, 34, 70, 18), card(flag, 21, 52, 96, 28)],
    });
  }

  /* The bus stop at the village edge, ant-made: a big leaf roof on two twig posts, a woven grass back, a split-twig
     bench, a timetable pinned to the post, and the stop's pole sign (a beetle on a yellow disc). seat: the bench's
     sit point from ax. */
  function busStop() {
    const W = 92, G = 64, L = V.LEAF.green;
    const out = inked(W, G + 1, b => {
      // woven back, then posts
      for (let x = 12; x < 56; x++) for (let y = G - 34; y < G - 6; y++) px(b, x, y, (y - G) % 7 === 0 ? 'd2' : x % 2 ? 'g3' : 'g2');
      for (let x = 12; x < 56; x += 2) px(b, x, G - 34, 'g1');
      for (const x of [8, 54]) { fill(b, x, G - 40, 4, 40, 'wood3'); fill(b, x, G - 40, 1, 40, 'wood2'); fill(b, x + 3, G - 40, 1, 40, 'wood4'); for (let y = G - 34; y < G; y += 9) fill(b, x + 1, y, 2, 1, 'wood4'); }
      // the bench: a split twig on two stubs
      fill(b, 12, G - 12, 42, 4, 'wood2'); fill(b, 12, G - 12, 42, 1, 'wood1'); fill(b, 12, G - 9, 42, 1, 'wood4'); for (const x of [16, 46]) fill(b, x, G - 8, 3, 8, 'wood4');
      // the leaf roof: an arched blade, light midrib, veins, a dark underside along the front edge, a curl of stem
      const cy = u => G - 46 - Math.round(3 * Math.sin(Math.PI * u)), hw = u => Math.round(10 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.7));
      for (let x = 0; x <= 70; x++) {
        const u = x / 70, c = cy(u), h = hw(u);
        for (let y = c - h; y <= c + h + 2; y++) {
          const t = (y - c) / Math.max(1, h), vein = (x + Math.abs(y - c) * 2) % 8 === 0;
          px(b, x, y, y > c + h ? (y === c + h + 2 ? L[6] : L[5]) : y === c ? L[0] : vein ? L[4] : t < -0.4 ? L[1] : t < 0.5 ? L[2] : L[3]);
        }
      }
      px(b, 71, cy(1), L[3]); line(b, 0, G - 46, -1, G - 49, 'wood3');
      // the timetable on the left post
      fill(b, 1, G - 32, 11, 14, 'wall0'); fill(b, 1, G - 32, 11, 3, 'red'); for (let y = G - 27; y < G - 19; y += 2) fill(b, 2, y, 4 + (y % 3), 1, 'wood4'); fill(b, 8, G - 27, 3, 6, 'wall2'); fill(b, 11, G - 32, 1, 14, 'wall2'); px(b, 6, G - 31, 'brass1');
      // the pole sign
      const sx = W - 9; fill(b, sx, G - 44, 2, 44, 'iron2'); fill(b, sx + 1, G - 44, 1, 44, 'iron3'); fill(b, sx - 3, G - 3, 8, 3, 'stone2'); fill(b, sx - 3, G - 3, 8, 1, 'stone1');
      disc(b, sx + 0.5, G - 50, 7, 7, 'red'); disc(b, sx + 0.5, G - 50, 5, 5, 'yellow'); px(b, sx - 3, G - 53, 'light0');
      fill(b, sx - 1, G - 52, 4, 5, 'ink'); fill(b, sx, G - 54, 2, 2, 'ink'); for (const y of [G - 51, G - 49]) { px(b, sx - 2, y, 'ink'); px(b, sx + 3, y, 'ink'); } px(b, sx, G - 51, 'iron2');
      fill(b, sx - 5, G - 40, 12, 7, 'blue'); fill(b, sx - 5, G - 40, 12, 1, 'sky2'); fill(b, sx - 3, G - 38, 8, 1, 'white'); fill(b, sx - 3, G - 36, 6, 1, 'white');
    });
    return { img: out.canvas(), ax: 34, ay: G + 1, base: [-26, 22], foot: 10, seat: [0, -12], shadow: [28, 5] };
  }

  /* Pip's twig swing: two crossed-twig A-frames under a bar with a sprouting leaf, thread ropes, a twig seat that sways
     gently (frames, fps 4). seat: the sit point at rest, from the feet. */
  function swing() {
    const W = 42, G = 46, sway = [0, 1, 2, 1, 0, -1, -2, -1];
    const frames = sway.map(d => inked(W, G + 1, b => {
      for (const [a, c] of [[1, 8], [13, 9], [40, 33], [28, 32]]) { line(b, a, G, c, 5, 'wood3'); line(b, a + 1, G, c + 1, 5, 'wood4'); }
      fill(b, 3, 3, 36, 4, 'wood3'); fill(b, 3, 3, 36, 1, 'wood2'); fill(b, 3, 6, 36, 1, 'wood4'); for (const x of [10, 22, 30]) px(b, x, 4, 'wood4');
      px(b, 18, 2, 'cap3'); fill(b, 18, 0, 3, 2, 'cap1'); px(b, 21, 0, 'cap2');
      const sy = 35 - (Math.abs(d) > 1 ? 1 : 0);
      line(b, 15, 7, 14 + d, sy, 'wall2'); line(b, 27, 7, 28 + d, sy, 'wall2'); fill(b, 14, 7, 2, 1, 'wall3'); fill(b, 27, 7, 2, 1, 'wall3');
      fill(b, 12 + d, sy, 19, 4, 'wood2'); fill(b, 12 + d, sy, 19, 1, 'wood1'); fill(b, 12 + d, sy + 3, 19, 1, 'wood4'); px(b, 12 + d, sy + 1, 'wood3'); px(b, 30 + d, sy + 1, 'wood3');
      fill(b, 17 + d, sy - 1, 9, 1, 'cap2'); px(b, 18 + d, sy - 2, 'cap1'); px(b, 24 + d, sy - 2, 'cap2');
    }).canvas());
    return { img: frames[0], frames, fps: 4, ax: 22, ay: G + 1, base: [-20, 20], foot: 6, seat: [0, 35 - G] };
  }

  /* A small playground: a twig seesaw on a log pivot and a plank sandbox with a sand castle, an acorn-cap pail and a
     leaf spade. */
  function playground() {
    const W = 94, G = 30;
    const out = inked(W, G + 1, b => {
      fill(b, 18, G - 8, 10, 8, 'wood3'); fill(b, 18, G - 8, 3, 8, 'wood2'); fill(b, 26, G - 8, 2, 8, 'wood4'); disc(b, 23, G - 8, 5, 2, 'wood1'); px(b, 23, G - 8, 'wood3');
      for (let x = 2; x <= 44; x++) { const y = Math.round(G - 3 - (x - 2) * 12 / 42); fill(b, x, y - 3, 1, 4, 'wood2'); px(b, x, y - 3, 'wood1'); px(b, x, y, 'wood4'); }
      for (const x of [7, 39]) { const y = Math.round(G - 3 - (x - 2) * 12 / 42); fill(b, x, y - 9, 2, 6, 'wood3'); fill(b, x - 2, y - 10, 6, 2, 'wood2'); px(b, x - 2, y - 10, 'wood1'); }
      // the sandbox
      const sx = 52, sw = 40, T = G - 17;
      fill(b, sx, T, sw, 11, 'wood2'); fill(b, sx, T, sw, 1, 'wood0'); fill(b, sx + 2, T + 2, sw - 4, 2, 'wood3');
      fill(b, sx + 2, T + 4, sw - 4, 7, 'd0'); fill(b, sx + 2, T + 4, sw - 4, 1, 'd2'); fill(b, sx + 2, T + 4, 1, 7, 'd1');
      for (const [x, y] of [[sx + 29, T + 9], [sx + 5, T + 8], [sx + 23, T + 6]]) { px(b, x, y, 'd1'); px(b, x + 1, y, 'd1'); px(b, x, y - 1, 'wall0'); }
      fill(b, sx, G - 6, sw, 6, 'wood3'); fill(b, sx, G - 6, sw, 2, 'wood1'); px(b, sx + 19, G - 3, 'wood4'); fill(b, sx, G - 1, sw, 1, 'wood4');
      for (const x of [sx, sx + sw - 3]) { fill(b, x, T - 2, 3, G - T + 2, 'wood2'); fill(b, x, T - 2, 3, 1, 'wood0'); fill(b, x + 2, T - 1, 1, G - T + 1, 'wood4'); }
      // a sand castle with a petal flag, an acorn-cap pail, a leaf spade
      disc(b, sx + 13, T + 9, 6, 1, 'd2'); fill(b, sx + 8, T + 3, 10, 6, 'd1'); fill(b, sx + 8, T + 3, 3, 6, 'wall1'); fill(b, sx + 16, T + 3, 2, 6, 'd2');
      for (const x of [sx + 8, sx + 12, sx + 16]) fill(b, x, T + 1, 2, 2, x === sx + 16 ? 'd2' : 'wall1');
      fill(b, sx + 12, T + 6, 2, 3, 'd3'); fill(b, sx + 12, T - 5, 1, 6, 'wood3'); fill(b, sx + 13, T - 5, 3, 2, 'rose');
      fill(b, sx + 25, T + 3, 7, 5, 'wood3'); fill(b, sx + 25, T + 3, 7, 1, 'wood1'); for (let x = sx + 26; x < sx + 32; x += 2) px(b, x, T + 5, 'wood4'); ring(b, sx + 28, T + 3, 3, 'g4');
      line(b, sx + 19, T + 10, sx + 23, T + 6, 'wood4'); fill(b, sx + 16, T + 9, 4, 3, 'g2'); px(b, sx + 16, T + 9, 'g1');
    });
    return { img: out.canvas(), ax: 48, ay: G + 1, base: [-46, 44], foot: 20, shadow: [44, 4] };
  }

  /* ---------------- the fields ---------------- */
  // A patch of chamomile to paint on the ground (no outline): rows of low green clumps strewn with white daisies with
  // yellow hearts, w x h px; row ends are ragged so patches never read as rectangles.
  function chamomile(w = 96, h = 48, seed = 1) {
    const b = new Buf(w, h), rnd = PX.rng(seed);
    const daisy = (x, y) => { px(b, x, y - 1, 'white'); px(b, x - 1, y, 'white'); px(b, x + 1, y, 'white'); px(b, x, y + 1, 'wall2'); px(b, x, y, 'yellow'); };
    for (let y0 = 0; y0 + 8 <= h; y0 += 7) {
      // a row: overlapping mounds 7-9 px wide with a lit cap and a dark hem, a few daisies on each
      const off = (rnd() * 4) | 0, end = w - ((rnd() * 4) | 0), heads = [];
      for (let x = off; x < end - 4; x += 5 + ((rnd() * 3) | 0)) {
        const cw = Math.min(7 + ((rnd() * 3) | 0), end - x), cx = x + cw / 2 - 0.5, cy = y0 + 4;
        for (let j = 0; j < 7; j++) for (let i = 0; i < cw; i++) {
          const u = (x + i - cx) / (cw / 2), v = (y0 + j - cy) / 3.5;
          if (u * u + v * v > 1.05) continue;
          px(b, x + i, y0 + j, v > 0.55 ? 'g4' : v < -0.45 && u < 0.4 ? 'g1' : u > 0.6 ? 'g3' : 'g2');
        }
        px(b, x + 2, y0 + 1, 'g0');
        heads.push([x + 2 + ((rnd() * (cw - 3)) | 0), y0 + 2 + ((rnd() * 2) | 0)]);
        if (rnd() < 0.5) heads.push([x + ((rnd() * cw) | 0), y0 + 4]);
      }
      for (const [x, y] of heads) if (rnd() < 0.85) daisy(x, y); else { px(b, x, y, 'white'); px(b, x, y + 1, 'g3'); }
    }
    return { img: b.canvas(), w, h };
  }
  // A low white picket fence of n pickets (5 px apart); step: where the next piece's ax goes to continue it.
  function fieldFence(n = 6) {
    const w = n * 5, h = 13;
    const out = inked(w, h, b => {
      fill(b, 0, 4, w, 2, 'stone1'); fill(b, 0, 4, w, 1, 'stone0'); fill(b, 0, 9, w, 2, 'stone2'); fill(b, 0, 9, w, 1, 'stone1');
      for (let k = 0; k < n; k++) { const x = k * 5 + 1; fill(b, x, 1, 3, 12, 'stone0'); fill(b, x, 1, 1, 12, 'white'); fill(b, x + 2, 1, 1, 12, 'stone1'); px(b, x + 1, 0, 'white'); fill(b, x, 12, 3, 1, 'stone2'); }
    });
    return { img: out.canvas(), ax: 1, ay: h + 1, step: w };
  }

  /* A small pen of plank rails with three aphids (round, pale green, cute) grazing on clover; they dip their heads in
     turn (frames, fps 2). A heap of hay and a leaf of water in the corners. */
  function aphidPen() {
    const W = 78, G = 50, back = 12;
    // An aphid facing dir: a plump pale body, a small head with a big eye, antennae swept back, two cornicles.
    const aphid = (b, x, y, dir, down) => {
      const hx = x + dir * 5, hy = y + (down ? 3 : 1);
      for (const i of [-3, 0, 3]) line(b, x + i, y + 4, x + i + Math.sign(i), y + 6, 'ink');
      fill(b, x - dir * 4 - 1, y - 7, 3, 3, 'ink'); px(b, x - dir * 4, y - 6, 'g1');
      disc(b, x, y, 6, 5, 'ink'); disc(b, x, y, 5, 4, 'g0'); disc(b, x - dir, y - 2, 3, 2, 'grass0'); px(b, x - dir * 2, y - 3, 'white');
      for (let i = -4; i <= 4; i++) px(b, x + i, y + 4 - (Math.abs(i) > 3 ? 1 : 0), 'g1');
      disc(b, hx, hy, 3, 3, 'ink'); disc(b, hx, hy, 2, 2, 'g0'); px(b, hx - dir, hy - 1, 'grass0'); fill(b, hx + dir, hy - 1, 1, 2, 'ink'); px(b, hx, hy - 1, 'white');
      const ant = down ? [[2, -2], [3, -2], [4, -1], [1, -3]] : [[1, -3], [2, -4], [3, -5], [0, -4], [0, -5], [1, -6]];
      for (const [dx, dy] of ant) px(b, hx + dir * dx, hy + dy, 'ink');
    };
    const POS = [[18, 25, 1], [54, 21, -1], [42, 32, -1]];
    const frames = [0, 1, 2, 3].map(f => inked(W, G + 1, b => {
      fill(b, 3, back, W - 6, G - back - 2, 'g2'); for (const [x, y, r] of [[30, 30, 9], [56, 28, 7]]) disc(b, x, y, r, 3, 'd1');
      for (const [x, y] of [[14, 20], [44, 32], [60, 40], [28, 42], [66, 20]]) { px(b, x, y, 'g3'); px(b, x + 2, y, 'g3'); px(b, x + 1, y - 1, 'g0'); px(b, x + 1, y + 1, 'g3'); }
      for (const [x, y] of [[30, 18], [58, 34]]) { fill(b, x, y, 6, 2, 'g2'); px(b, x + 2, y - 1, 'g0'); }
      // back fence
      fill(b, 2, back - 9, W - 4, 2, 'wood2'); fill(b, 2, back - 4, W - 4, 2, 'wood3');
      for (let x = 2; x < W - 4; x += 18) { fill(b, x, 0, 3, back, 'wood3'); px(b, x, 0, 'wood1'); fill(b, x, 0, 1, back, 'wood2'); }
      fill(b, W - 5, 0, 3, back, 'wood3'); fill(b, W - 5, 0, 1, back, 'wood2');
      // hay and the water leaf
      disc(b, W - 14, back + 8, 7, 4, 'brass2'); disc(b, W - 15, back + 7, 5, 3, 'brass1'); px(b, W - 17, back + 5, 'brass0'); px(b, W - 12, back + 10, 'brass3');
      disc(b, 12, G - 12, 6, 3, 'g4'); disc(b, 12, G - 12, 4, 2, 'w2'); px(b, 10, G - 13, 'w0'); line(b, 18, G - 12, 21, G - 11, 'g4');
      POS.forEach(([x, y, dir], i) => aphid(b, x + (i === 2 && f >= 2 ? 1 : 0), y, dir, (f + i) % 2 === 0));
      // side fences and the front fence with its gate
      for (const x of [2, W - 5]) { fill(b, x, back - 9, 3, G - back + 9, 'wood3'); fill(b, x, back - 9, 1, G - back + 9, 'wood2'); fill(b, x + 2, back - 9, 1, G - back + 9, 'wood4'); for (let y = back + 6; y < G; y += 12) fill(b, x, y, 3, 1, 'wood4'); }
      fill(b, 2, G - 9, W - 4, 2, 'wood2'); fill(b, 2, G - 9, W - 4, 1, 'wood1'); fill(b, 2, G - 4, W - 4, 2, 'wood3'); fill(b, 2, G - 4, W - 4, 1, 'wood2');
      for (let x = 32; x < 46; x += 3) { fill(b, x, G - 11, 2, 11, 'wood2'); px(b, x, G - 11, 'wood1'); px(b, x + 1, G - 11, 'wood3'); }
      line(b, 32, G - 3, 45, G - 9, 'wood4');
      for (const x of [2, 20, 29, 46, 56, W - 5]) { fill(b, x, G - 13, 3, 13, 'wood3'); fill(b, x, G - 13, 1, 13, 'wood2'); fill(b, x + 2, G - 13, 1, 13, 'wood4'); px(b, x + 1, G - 14, 'wood2'); }
    }).canvas());
    return { img: frames[0], frames, fps: 2, ax: W / 2 + 1, ay: G + 1, base: [-W / 2, W / 2], foot: G - back, gate: [39 + 1 - (W / 2 + 1), 0] };
  }

  Object.assign(VIL, { noraHouse, satriaHome, clothesline, gardenerHome, glasshouse, leoHut, busStop, swing, playground, chamomile, fieldFence, aphidPen });
})();
