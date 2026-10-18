'use strict';
/* The East of Bellwood, the green hills of home: stilt houses in pastel paint (Nora's toy maker's home and two
   neighbours), Satria's faded childhood cottage, the Gardener's glass porch, Leo's lookout, the bus stop, Pip's twig
   swing and the playground, the chamomile field with its picket fence, and the aphid pen. Every maker follows the
   sprite contract of village.js; positions are drawn in Buf px, and inked() shifts them by one into img px. */
(() => {
  const V = VIL, { fill, px, disc, inked } = V, { hash, Buf } = KIT;
  // Pastel paints, light to dark.
  const BLUE = ['#eaf5ff', '#c4e0fa', '#9cc4ec', '#7299cc'], MINT = ['#eafbe9', '#c6edca', '#9bd5a8', '#6eae85'];
  const PEACH = ['#fff0e6', '#ffd4c4', '#f0aa9a', '#c97f78'], TRIM = ['white', 'wall0', 'wall2', 'wall3'];
  const WOOD = ['wood1', 'wood2', 'wood3', 'wood4'], ramp = k => [0, 1, 2, 3, 4].map(i => k + i);
  const FADED = ['#ffd3bd', 'roofR0', 'roofR1', 'roofR2', 'roofR3'];
  const I = r => r.map(v => v + 1);                       // Buf rect -> img rect (inked adds a 1 px border)

  const line = (b, x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) px(b, Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), c); };
  const ring = (b, cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y); if (d <= r + 0.3 && d > r - 1.7) px(b, cx + x, cy + y, c); } };

  /* ---------------- building parts ---------------- */
  // A side roof (eaves to the viewer): tiles 8 x 6 in half-offset rows, or thatch bundles with a scalloped hem; a ridge
  // cap, gable ends that flare toward the eaves, a fascia board. R: a 5-step ramp.
  function roofSide(b, x0, top, w, depth, R, seed, thatch) {
    const eave = top + depth;
    for (let y = top; y < eave; y++) {
      const f = (y - top) / depth, inset = Math.round((1 - f) * 3), ry = y - top - 5;
      for (let x = x0 + inset; x < x0 + w - inset; x++) {
        const lx = x - x0; let c;
        if (thatch) {
          // bundles 6 x 6 in half-offset rows, rounded at the foot, straw streaks lit at the top
          const row = Math.floor(ry / 6), sy = ry - row * 6, u = (lx + (row & 1) * 3) % 6, edge = u === 0 || u === 5, hk = hash(Math.floor((lx + (row & 1) * 3) / 6), row, seed);
          c = sy === 5 ? (edge ? R[4] : R[3]) : sy === 4 && edge ? R[3] : (u === 2 || u === 4) && sy > 0 ? (sy < 2 ? R[1] : R[2]) : sy < 2 ? R[0] : hk < 0.25 ? R[2] : R[1];
        } else {
          const row = Math.floor(ry / 6), sx = (lx + (row & 1) * 4) % 8, sy = ry - row * 6;
          const tk = hash(Math.floor((lx + (row & 1) * 4) / 8), row, seed + 30), body = tk < 0.2 || (f > 0.6 && tk < 0.5) ? R[2] : R[1];
          c = sy === 0 ? (sx === 0 ? R[2] : R[f < 0.4 ? 0 : 1]) : sy === 5 ? R[3] : sx === 0 ? R[3] : sy === 4 ? R[f < 0.4 ? 1 : 2] : body;
          if (sy === 1 && sx === 1 && tk > 0.5) c = R[0];
        }
        if (x - x0 - inset < 2 || x0 + w - inset - x <= 2) c = x - x0 - inset === 0 || x0 + w - inset - x === 1 ? R[4] : R[3];
        if (ry < 0) c = [R[3], R[0], R[0], R[1], R[2]][ry + 5];
        px(b, x, y, c);
      }
    }
    if (thatch) for (let x = x0; x < x0 + w; x++) { const n = 3 + ((x * 7) % 5 > 2 ? 1 : 0) + (x % 4 === 1 ? 1 : 0); for (let j = 0; j < n; j++) px(b, x, eave - 3 + j, j === n - 1 ? R[4] : j === 0 ? R[1] : x % 2 ? R[2] : R[3]); }
    else { fill(b, x0, eave - 3, w, 3, R[3]); fill(b, x0, eave - 3, w, 1, R[2]); fill(b, x0, eave, w, 1, R[4]); }
  }
  // A front gable: the ridge points at the viewer. Two slopes in tile courses (lit left, shaded right) over a gable wall
  // of boards, trimmed by bargeboards in an inverted V. gh: the gable's height at the ridge.
  function roofGable(b, x0, top, w, depth, gh, R, paint) {
    const eave = top + depth, cx = x0 + w / 2;
    for (let x = x0; x < x0 + w; x++) {
      const left = x < cx, d = left ? cx - 1 - x : x - cx, yb = eave - Math.round(gh * (1 - (d + 0.5) / (w / 2))), s = left ? 0 : 1;
      for (let y = top; y < eave; y++) {
        let c;
        if (y < yb - 2) {
          const course = Math.floor(d / 6), sd = d - course * 6, ty = (y - top + (course & 1) * 4) % 8;
          c = sd === 5 ? R[3 + s] : ty === 0 ? R[2 + s] : sd === 0 ? R[s] : R[1 + s];
          if (d < 2) c = d === 0 ? R[left ? 0 : 1] : R[3];                  // the ridge cap
          if (y === top) c = R[3];
          if (x === x0 || x === x0 + w - 1) c = R[4];
        } else if (y < yb) c = y === yb - 2 ? TRIM[0] : TRIM[2];             // bargeboard
        else c = y === yb ? paint[3] : (x - x0) % 6 === 0 ? paint[2] : y < yb + 3 ? paint[2] : paint[1];
        px(b, x, y, c);
      }
    }
    fill(b, cx - 2, eave - gh - 4, 4, 3, TRIM[1]); px(b, cx - 1, eave - gh - 5, TRIM[0]);  // finial
    fill(b, x0, eave - 3, w, 3, TRIM[1]); fill(b, x0, eave - 3, w, 1, TRIM[0]); fill(b, x0, eave, w, 1, TRIM[3]);
  }
  // Walls: 'clap' horizontal clapboards, 'plank' vertical boards, 'plaster' with timber posts. R: 4-step ramp.
  function wall(b, x, y, w, h, R, style) {
    fill(b, x, y, w, h, R[1]);
    if (style === 'clap') for (let j = y + 4; j < y + h; j += 5) { fill(b, x, j, w, 1, R[2]); fill(b, x, j + 1, w, 1, R[0]); }
    else if (style === 'plank') for (let i = x + 5; i < x + w; i += 6) { fill(b, i, y, 1, h, R[3]); fill(b, i + 1, y, 1, h, R[0]); }
    fill(b, x + w - 7, y, 3, h, R[2]);
    const post = style === 'plaster' ? WOOD : TRIM;
    fill(b, x, y, 3, h, post[1]); px(b, x, y, post[0]); fill(b, x, y, 1, h, post[0]); fill(b, x + w - 3, y, 3, h, post[2]); fill(b, x + w - 1, y, 1, h, post[3]);
  }
  // A window: frame, glass with a glint and a cross bar, a sill; shutters and a flower box optional. Pushes its glass.
  function win(b, lit, x, y, w, h, o = {}) {
    const F = o.frame || TRIM;
    if (o.shutters) for (const [sx, dy] of [[x - 9, 0], [x + w + 2, o.askew ? 1 : 0]]) {
      const S = o.shutters; fill(b, sx, y - 2 + dy, 7, h + 4, S[1]); fill(b, sx, y - 2 + dy, 7, 1, S[0]); fill(b, sx + 6, y - 2 + dy, 1, h + 4, S[3]);
      for (let k = y + 1 + dy; k < y + h + dy; k += 3) fill(b, sx + 1, k, 5, 1, S[2]);
    }
    fill(b, x - 2, y - 2, w + 4, h + 4, F[2]); fill(b, x - 2, y - 2, w + 4, 1, F[0]); fill(b, x - 2, y - 2, 1, h + 4, F[1]);
    fill(b, x, y, w, h, 'sky3'); fill(b, x, y, w, 3, 'sky2'); fill(b, x, y + h - 3, w, 3, 'sky4');
    fill(b, x + (w >> 1) - 1, y, 2, h, F[1]); fill(b, x, y + (h >> 1) - 1, w, 2, F[1]);
    px(b, x + 1, y + 1, 'white'); px(b, x + 2, y + 1, 'white'); px(b, x + 1, y + 2, 'white');
    fill(b, x - 3, y + h + 2, w + 6, 3, F[2]); fill(b, x - 3, y + h + 2, w + 6, 1, F[0]);
    if (o.box) flowerBox(b, x - 2, y + h + 5, w + 4, o.box);
    lit.push([x, y, w, h]);
  }
  // A planter box with a row of blooms spilling over its lip.
  function flowerBox(b, x, y, w, cols = ['rose', 'yellow']) {
    fill(b, x, y, w, 5, 'wood2'); fill(b, x, y, w, 1, 'wood1'); fill(b, x, y + 4, w, 1, 'wood4'); fill(b, x + w - 2, y, 2, 5, 'wood3');
    fill(b, x + 1, y - 3, w - 2, 3, 'cap2'); for (let k = 1; k < w - 1; k += 2) px(b, x + k, y - 3, 'cap1');
    for (let k = 1, n = 0; k < w - 1; k += 3, n++) { const c = cols[n % cols.length]; px(b, x + k, y - 3, c); px(b, x + k + 1, y - 3, c); px(b, x + k, y - 4, c); px(b, x + k + 1, y - 2, 'white'); }
  }
  // A door: frame, a leaf in paint R (4 steps) with two panels or a round window, a brass knob. Pushes its glass.
  function door(b, lit, x, y, w, h, R, o = {}) {
    fill(b, x - 2, y - 3, w + 4, h + 3, 'wood4'); fill(b, x - 2, y - 3, w + 4, 1, 'wood2');
    fill(b, x, y, w, h, R[1]); fill(b, x, y, 1, h, R[0]); fill(b, x + w - 2, y, 2, h, R[2]);
    const panel = (py, ph) => { fill(b, x + 4, py, w - 8, ph, R[2]); fill(b, x + 5, py + 1, w - 9, ph - 1, R[1]); fill(b, x + 5, py + 1, w - 10, 1, R[0]); };
    if (o.round) { disc(b, x + w / 2 - 0.5, y + 9, 5, 5, R[3]); fill(b, x + w / 2 - 4, y + 6, 7, 7, 'sky3'); fill(b, x + w / 2 - 4, y + 6, 7, 2, 'sky2'); px(b, x + w / 2 - 3, y + 7, 'white'); fill(b, x + w / 2 - 1, y + 6, 1, 7, R[3]); lit.push([x + w / 2 - 4, y + 6, 7, 7]); }
    else panel(y + 4, 12);
    panel(y + 20, h - 24);
    fill(b, x + w - 6, y + 18, 2, 2, 'brass1'); px(b, x + w - 6, y + 18, 'brass0');
  }
  // A porch rail from x0 to x1 standing on y, h tall: posts at both ends, spindles every 4 px.
  function rail(b, x0, x1, y, h, R = TRIM) {
    for (let x = x0 + 4; x < x1 - 3; x += 4) { fill(b, x, y - h + 3, 2, h - 3, R[1]); px(b, x + 1, y - h + 3, R[2]); fill(b, x + 1, y - h + 4, 1, h - 4, R[2]); }
    fill(b, x0, y - h, x1 - x0, 3, R[1]); fill(b, x0, y - h, x1 - x0, 1, R[0]); fill(b, x0, y - h + 2, x1 - x0, 1, R[3]);
    for (const x of [x0, x1 - 3]) { fill(b, x, y - h - 1, 3, h + 1, R[1]); fill(b, x, y - h - 1, 1, h + 1, R[0]); fill(b, x + 2, y - h - 1, 1, h + 1, R[3]); }
  }
  // A plank deck seen from above (x, y, w, d) and its front beam with joist ends.
  function deck(b, x, y, w, d) {
    fill(b, x, y, w, d, 'wood1'); for (let j = y + 2; j < y + d; j += 3) fill(b, x, j, w, 1, 'wood2'); fill(b, x, y, w, 1, 'wood3');
    fill(b, x - 1, y + d, w + 2, 5, 'wood3'); fill(b, x - 1, y + d, w + 2, 1, 'wood2'); fill(b, x - 1, y + d + 4, w + 2, 1, 'wood4');
    for (let k = x + 4; k < x + w - 3; k += 12) { fill(b, k, y + d + 1, 3, 3, 'wood4'); px(b, k, y + d + 1, 'wood2'); }
  }
  // Stilts under a raised floor from y0 to the ground row g: front posts on stone pads with X braces between them,
  // back posts darker and shorter (further away). Returns the front posts' x.
  function stilts(b, x0, x1, y0, g, n) {
    const xs = [...Array(n)].map((_, k) => Math.round(x0 + (x1 - x0 - 5) * k / (n - 1))), back = g - 14;
    for (let k = 0; k < n - 1; k++) { const bx = Math.round((xs[k] + xs[k + 1]) / 2); fill(b, bx, y0, 4, back - y0, 'wood4'); fill(b, bx + 3, y0, 1, back - y0, 'wood5'); fill(b, bx - 1, back - 1, 6, 2, 'stone3'); }
    fill(b, x0, y0, x1 - x0, 2, 'wood5');
    for (let k = 0; k < n - 1; k++) { const a = xs[k] + 5, c = xs[k + 1] - 1; for (const p of [0, 1]) { line(b, a + p, y0 + 3, c + p, g - 7, p ? 'wood4' : 'wood3'); line(b, c - p, y0 + 3, a - p, g - 7, p ? 'wood4' : 'wood3'); } }
    for (const x of xs) {
      fill(b, x, y0, 5, g - y0, 'wood2'); fill(b, x, y0, 1, g - y0, 'wood1'); fill(b, x + 3, y0, 2, g - y0, 'wood3'); fill(b, x, y0, 5, 2, 'wood4');
      for (let y = y0 + 6; y < g - 6; y += 7) px(b, x + 2, y, 'wood3');
      fill(b, x - 2, g - 3, 9, 3, 'stone2'); fill(b, x - 2, g - 3, 9, 1, 'stone1'); fill(b, x + 5, g - 2, 2, 2, 'stone3');
    }
    return xs;
  }
  // Stairs from a porch edge (x, y) down to the ground row g, running sideways along the front (dir +1 right, -1 left),
  // with a handrail. Returns the foot's x.
  function stairs(b, x, y, g, dir) {
    const n = Math.round((g - y) / 4), run = n * 5, X = k => (dir > 0 ? x + k : x - k - 6);
    for (let k = 0; k <= run; k++) { const yy = y + 4 + Math.round(k * 4 / 5); const xx = dir > 0 ? x + k : x - k; fill(b, xx, yy, 1, Math.min(4, g - yy), 'wood3'); px(b, xx, yy + 3, 'wood4'); }
    for (let i = 0; i < n; i++) { const sx = X(i * 5), sy = y + i * 4; fill(b, sx, sy, 7, 2, 'wood1'); px(b, dir > 0 ? sx : sx + 6, sy, 'wood0'); fill(b, sx, sy + 2, 7, 2, 'wood3'); fill(b, sx, sy + 3, 7, 1, 'wood4'); }
    const fx = dir > 0 ? x + run : x - run, t0 = dir > 0 ? x : x - 3;
    fill(b, t0, y - 12, 3, 12, 'wood2'); fill(b, t0 + 2, y - 12, 1, 12, 'wood4');
    fill(b, fx - 1, g - 12, 3, 12, 'wood2'); fill(b, fx + 1, g - 12, 1, 12, 'wood4');
    line(b, t0 + 1, y - 12, fx, g - 12, 'wood1'); line(b, t0 + 1, y - 11, fx, g - 11, 'wood3');
    for (let k = 2; k < n; k += 2) { const sx = X(k * 5) + 3, sy = y + k * 4; line(b, sx, sy - 1, sx, sy - 10, 'wood3'); }
    return fx;
  }
  // A ladder from y down to g at x (11 wide), its rails poking up above the porch.
  function ladder(b, x, y, g) {
    for (let j = y + 3; j < g - 2; j += 5) { fill(b, x + 1, j, 9, 2, 'wood1'); fill(b, x + 1, j + 1, 9, 1, 'wood3'); }
    for (const rx of [x, x + 9]) { fill(b, rx, y - 7, 2, g - y + 7, 'wood2'); px(b, rx, y - 7, 'wood1'); fill(b, rx + 1, y - 6, 1, g - y + 6, 'wood3'); }
  }
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
  // A clay pot with a little plant (cols: bloom colours), its foot on (x, y).
  function pot(b, x, y, cols) {
    fill(b, x - 3, y - 6, 7, 6, 'roofR2'); fill(b, x - 4, y - 7, 9, 2, 'roofR1'); fill(b, x - 3, y - 7, 7, 1, 'roofR0'); fill(b, x + 2, y - 5, 2, 5, 'roofR3');
    disc(b, x, y - 11, 4, 3, 'cap3'); disc(b, x - 1, y - 12, 3, 2, 'cap2'); px(b, x - 2, y - 13, 'cap1');
    if (cols) for (const [dx, dy, i] of [[-3, -13, 0], [2, -12, 1], [0, -15, 0]]) { px(b, x + dx, y + dy, cols[i]); px(b, x + dx + 1, y + dy, cols[i]); px(b, x + dx, y + dy - 1, cols[i]); px(b, x + dx + 1, y + dy - 1, 'white'); }
  }

  // A bench, feet on y: a seat at knee height, a slatted back, two legs.
  function bench(b, x, y, w) {
    fill(b, x + 1, y - 20, w - 2, 7, 'wood2'); for (let i = x + 4; i < x + w - 3; i += 5) fill(b, i, y - 20, 1, 7, 'wood3'); fill(b, x + 1, y - 20, w - 2, 1, 'wood1');
    fill(b, x, y - 21, 2, 21, 'wood3'); fill(b, x + w - 2, y - 21, 2, 21, 'wood3'); px(b, x, y - 21, 'wood1'); px(b, x + w - 2, y - 21, 'wood1');
    fill(b, x, y - 12, w, 4, 'wood2'); fill(b, x, y - 12, w, 1, 'wood1'); fill(b, x, y - 9, w, 1, 'wood4'); fill(b, x + 2, y - 8, 2, 8, 'wood4'); fill(b, x + w - 4, y - 8, 2, 8, 'wood4');
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
  // A dormer on a roof: its own little gable over a window, at x (left of its roof), y (the roof's top).
  function dormer(b, lit, x, y, R, paint) {
    fill(b, x - 1, y - 1, 28, 20, R[4]); fill(b, x + 2, y + 16, 22, 16, R[4]);
    fill(b, x + 3, y + 16, 20, 15, paint[1]); fill(b, x + 3, y + 16, 2, 15, TRIM[1]); fill(b, x + 21, y + 16, 2, 15, TRIM[2]);
    fill(b, x + 7, y + 19, 12, 9, TRIM[2]); fill(b, x + 8, y + 20, 10, 7, 'sky3'); fill(b, x + 8, y + 20, 10, 2, 'sky2'); fill(b, x + 12, y + 20, 2, 7, TRIM[1]); px(b, x + 9, y + 21, 'white');
    fill(b, x + 6, y + 28, 14, 2, TRIM[1]); fill(b, x + 1, y + 31, 24, 2, R[3]);
    lit.push([x + 8, y + 20, 10, 7]);
    roofGable(b, x, y, 26, 18, 10, R, paint);
  }

  /* ---------------- stilt houses ---------------- */
  /* kind 'nora': Nenek Nora's, the toy maker: pastel blue clapboard, a coral door, the big scissors sign, bunting of
     fabric scraps, flower boxes, a stovepipe. 'a': a mint neighbour under a front gable. 'b': a peach neighbour under
     thatch, reached by a ladder. The feet line is the front stilts' foot; door is the porch door's centre (from ax);
     stair is the img px where the stairs (or ladder) meet the ground: the walk target. */
  const KIND = {
    nora: { ww: 136, paint: BLUE, R: ramp('roofR'), doorR: PEACH, door: 58, wins: [14, 110], up: 'left' },
    a: { ww: 122, paint: MINT, R: ramp('roofB'), doorR: WOOD, door: 70, wins: [16], up: 'right', gable: 24 },
    b: { ww: 126, paint: PEACH, R: ramp('brass'), doorR: MINT, door: 22, wins: [64], up: 'ladder', thatch: true },
  };
  function stiltHouse(kind = 'nora') {
    const k = KIND[kind], ww = k.ww, over = 5, w = ww + over * 2, top = 10, depth = k.gable ? 58 : 50, lit = [], smoke = [];
    const eave = top + depth, wy = eave - 3, fy = wy + 46, dk = fy + 9, beam = dk + 5, g = beam + 30, wx = over;
    const dx = wx + k.door, dw = 22, dh = 36;
    let up = 0;
    const out = inked(w, g + 1, b => {
      stilts(b, wx + 2, wx + ww - 2, beam, g, kind === 'a' ? 4 : 5);
      wall(b, wx, wy, ww, fy - wy, k.paint, 'clap');
      door(b, lit, dx, fy - dh, dw, dh, k.doorR, { round: kind !== 'a' });
      for (const x of k.wins) win(b, lit, wx + x, wy + 14, 16, 16, kind === 'b' ? { shutters: MINT } : { box: kind === 'nora' ? ['rose', 'yellow', 'pink'] : ['white', 'lilac'] });
      if (k.gable) {
        roofGable(b, 0, top, w, depth, k.gable, k.R, k.paint);
        const vx = w / 2, vy = eave - 11; disc(b, vx - 0.5, vy, 5, 5, TRIM[2]); disc(b, vx - 0.5, vy, 4, 4, 'sky3'); fill(b, vx - 4, vy - 4, 8, 3, 'sky2'); fill(b, vx - 1, vy - 4, 1, 9, TRIM[1]); fill(b, vx - 4, vy, 8, 1, TRIM[1]); px(b, vx - 3, vy - 2, 'white'); lit.push([vx - 4, vy - 1, 3, 4]);
      } else roofSide(b, 0, top, w, depth, k.R, kind === 'b' ? 7 : 3, k.thatch);
      fill(b, wx, eave + 1, ww, 3, k.paint[2]); fill(b, wx, eave + 1, ww, 1, k.paint[3]);
      deck(b, wx - 2, fy, ww + 4, 9);
      if (kind === 'nora') {
        // stovepipe and smoke, bunting under the eave, the scissors sign on its bracket, a basket of fabric rolls
        const sx = wx + 108; fill(b, sx, top - 8, 6, 26, 'iron2'); fill(b, sx, top - 8, 2, 26, 'iron1'); fill(b, sx + 5, top - 8, 1, 26, 'iron3'); fill(b, sx - 1, top - 10, 8, 3, 'iron3'); fill(b, sx - 1, top - 10, 8, 1, 'iron1'); fill(b, sx, top + 14, 6, 2, 'iron3'); smoke.push([sx + 3, top - 10]);
        bunting(b, wx + 2, eave + 3, wx + 50, eave + 3, 6, 0); bunting(b, wx + 86, eave + 3, wx + ww - 3, eave + 3, 6, 3);
        scissorsSign(b, dx + dw + 3, fy - 38);
        dormer(b, lit, 24, top + 4, k.R, k.paint);
        for (const [x, c] of [[wx + 8, ['pink', 'yellow']], [dx - 8, ['rose', 'white']]]) pot(b, x, fy + 6, c);
        // basket of fabric rolls by the door
        const kx = wx + 92; fill(b, kx, fy - 2, 12, 8, 'brass2'); fill(b, kx, fy - 2, 12, 1, 'brass1'); for (let i = kx + 1; i < kx + 12; i += 3) fill(b, i, fy - 1, 1, 7, 'brass3');
        disc(b, kx + 3, fy - 4, 2, 2, 'pink'); disc(b, kx + 7, fy - 5, 2, 2, 'lilac'); disc(b, kx + 10, fy - 3, 2, 2, 'yellow'); px(b, kx + 2, fy - 5, 'white'); px(b, kx + 6, fy - 6, 'white');
      } else if (kind === 'a') {
        // a brick chimney on the right slope, a hanging lantern, a fern, a broom by the door
        const cx = w / 2 + 30; fill(b, cx, top - 6, 10, 22, 'roofR2'); fill(b, cx, top - 6, 3, 22, 'roofR1'); fill(b, cx + 8, top - 6, 2, 22, 'roofR3'); for (let y = top - 3; y < top + 16; y += 4) fill(b, cx, y, 10, 1, 'roofR3'); fill(b, cx - 1, top - 8, 12, 3, 'stone2'); fill(b, cx - 1, top - 8, 12, 1, 'stone1'); fill(b, cx, top + 14, 10, 2, k.R[4]); smoke.push([cx + 5, top - 8]);
        fill(b, dx - 10, fy - 30, 2, 3, 'iron3'); fill(b, dx - 12, fy - 27, 6, 7, 'iron3'); fill(b, dx - 11, fy - 26, 4, 5, 'light1'); px(b, dx - 11, fy - 26, 'light0');
        pot(b, wx + 10, fy + 6, null); pot(b, dx + dw + 10, fy + 6, ['pink', 'white']);
        line(b, dx + dw + 3, fy - 24, dx + dw + 6, fy + 2, 'wood3'); fill(b, dx + dw + 4, fy - 4, 6, 6, 'brass1'); for (let i = 0; i < 6; i += 2) px(b, dx + dw + 4 + i, fy + 1, 'brass3');
      } else {
        // a hanging gourd planter, a bench on the porch, a wind chime
        line(b, wx + 50, eave + 1, wx + 50, eave + 8, 'wood4'); disc(b, wx + 50, eave + 13, 5, 5, 'brass2'); disc(b, wx + 49, eave + 12, 3, 3, 'brass1'); fill(b, wx + 45, eave + 8, 11, 2, 'cap2'); px(b, wx + 46, eave + 7, 'cap1'); px(b, wx + 53, eave + 7, 'rose');
        bench(b, wx + 92, fy + 2, 26); fill(b, wx + 97, fy - 12, 9, 4, MINT[1]); fill(b, wx + 97, fy - 12, 9, 1, MINT[0]); fill(b, wx + 105, fy - 12, 1, 4, MINT[3]);
        for (const i of [0, 3, 6]) { line(b, wx + 80 + i, eave + 1, wx + 80 + i, eave + 6 + i % 4, 'iron3'); fill(b, wx + 79 + i, eave + 7 + i % 4, 2, 4, 'iron1'); }
      }
      // the front rail, with a gap where the stairs or ladder arrive
      const gap = k.up === 'left' ? [wx - 2, wx + 14] : k.up === 'right' ? [wx + ww - 12, wx + ww + 2] : [wx + ww - 34, wx + ww - 20];
      if (gap[0] > wx - 2) rail(b, wx - 2, gap[0], dk, 12); if (gap[1] < wx + ww + 2) rail(b, gap[1], wx + ww + 2, dk, 12);
      if (k.up === 'ladder') { ladder(b, gap[0] + 2, dk, g); up = gap[0] + 7; }
      else up = stairs(b, k.up === 'left' ? wx + 1 : wx + ww - 1, dk, g, k.up === 'left' ? 1 : -1);
    });
    const ax = Math.round(w / 2) + 1, ay = g + 1;
    return { img: out.canvas(), ax, ay, base: [-ww / 2, ww / 2], foot: 16, door: dx + dw / 2 + 1 - ax, stair: [up + 1, ay], lit: lit.map(I), smoke: smoke.map(I), shadow: [Math.round(ww / 2) + 4, 10] };
  }

  /* ---------------- homes ---------------- */
  // A stone footing under a wall from x, w wide, on row y (4 tall).
  function footing(b, x, y, w) { for (let i = x; i < x + w; i += 6) { fill(b, i, y, Math.min(6, x + w - i), 4, 'stone2'); fill(b, i, y, Math.min(6, x + w - i), 1, 'stone1'); fill(b, i + 5, y, 1, 4, 'stone3'); } }
  // A chimney of stones at x on a roof whose top is y.
  function chimney(b, x, y) { fill(b, x, y - 8, 10, 20, 'stone2'); fill(b, x, y - 8, 3, 20, 'stone1'); fill(b, x + 7, y - 8, 3, 20, 'stone3'); for (let j = y - 4; j < y + 10; j += 5) fill(b, x + ((j >> 2) & 1) * 4, j, 5, 1, 'stone3'); fill(b, x - 1, y - 10, 12, 3, 'stone3'); fill(b, x - 1, y - 10, 12, 1, 'stone1'); fill(b, x, y + 10, 10, 2, 'stone4'); }

  /* Satria's childhood home in a quiet corner: a modest cottage gone soft with sun, its roof tiles bleached, a flake of
     plaster showing the boards, a shutter hanging a little askew. A small garden bed on its left, a bench by the door
     with a folded blanket, a clothesline on its right. ax is the cottage's centre; base spans its walls. */
  function satriaHome() {
    const ww = 104, over = 5, gw = 28, lit = [], top = 10, eave = top + 50, wy = eave - 3, wb = wy + 46, g = wb + 4;
    const hx = gw, wx = hx + over, rw = ww + over * 2, cl = hx + rw + 4, w = cl + 46, dx = wx + 58, dw = 22, dh = 36;
    const out = inked(w, g + 1, b => {
      wall(b, wx, wy, ww, wb - wy, ['wall0', 'wall1', 'wall2', 'wall3'], 'plaster');
      fill(b, wx + 3, wy + 9, ww - 6, 3, 'wood3'); fill(b, wx + 3, wy + 9, ww - 6, 1, 'wood2');
      for (const [x, y] of [[wx + 40, wy + 34], [wx + 92, wy + 18]]) { fill(b, x, y, 7, 4, 'wood1'); fill(b, x + 1, y + 4, 4, 1, 'wood1'); fill(b, x, y + 1, 7, 1, 'wood2'); px(b, x - 1, y + 1, 'wall3'); px(b, x + 7, y + 2, 'wall3'); }
      footing(b, wx - 1, wb, ww + 2);
      win(b, lit, wx + 18, wy + 16, 16, 16, { shutters: ['stone0', 'stone1', 'stone2', 'stone3'], askew: true, box: ['white', 'yellow'] });
      door(b, lit, dx, wb - dh, dw, dh, ['wood0', 'wood1', 'wood2', 'wood3'], { round: true });
      fill(b, dx - 3, wb, dw + 6, 4, 'stone1'); fill(b, dx - 3, wb + 3, dw + 6, 1, 'stone3');
      roofSide(b, hx, top, rw, 50, FADED, 11);
      for (const [x, y] of [[hx + 10, eave - 7], [hx + 66, eave - 6], [hx + 94, top + 9], [hx + 30, top + 20]]) { fill(b, x, y, 5, 2, 'g2'); fill(b, x + 1, y - 1, 3, 1, 'g1'); px(b, x + 4, y + 1, 'g4'); px(b, x, y + 2, 'g3'); }
      chimney(b, hx + 84, top);
      fill(b, wx, eave + 1, ww, 3, 'wall3'); fill(b, wx, eave + 1, ww, 1, 'wall4');
      // the bench by the door, a folded blanket on it, a pot of chamomile
      bench(b, dx + dw + 6, g, 28); fill(b, dx + dw + 18, g - 15, 12, 4, PEACH[1]); fill(b, dx + dw + 18, g - 15, 12, 1, PEACH[0]); fill(b, dx + dw + 18, g - 13, 12, 1, PEACH[3]); fill(b, dx + dw + 29, g - 15, 1, 4, PEACH[2]);
      pot(b, dx - 8, g, ['white', 'white']);
      // the garden bed: a stone kerb, dark soil in rows of sprouts, two tall flowers and a bean pole
      fill(b, 1, g - 14, gw + 2, 10, 'e1'); for (let y = g - 12; y < g - 4; y += 3) { fill(b, 2, y, gw, 1, 'e2'); for (let x = 3 + (y % 2); x < gw; x += 4) { px(b, x, y - 1, 'g1'); px(b, x + 1, y - 1, 'g2'); px(b, x, y - 2, 'g0'); } }
      for (let x = 0; x < gw + 4; x += 5) { fill(b, x, g - 4, 5, 4, 'stone2'); fill(b, x, g - 4, 5, 1, 'stone1'); px(b, x + 4, g - 3, 'stone3'); }
      for (const [x, h, c] of [[6, 22, 'yellow'], [14, 17, 'rose']]) { fill(b, x, g - 14 - h, 1, h, 'g3'); px(b, x + 1, g - 14 - h + 6, 'g1'); px(b, x - 1, g - 14 - h + 10, 'g1'); disc(b, x, g - 15 - h, 2, 2, c); px(b, x, g - 15 - h, 'orange'); px(b, x - 1, g - 16 - h, 'white'); }
      fill(b, 22, g - 40, 2, 26, 'wood3'); px(b, 22, g - 40, 'wood1'); for (let y = g - 36; y < g - 14; y += 4) { px(b, 21 + ((y >> 2) & 1) * 3, y, 'g2'); px(b, 21 + ((y >> 2) & 1) * 3, y + 1, 'g3'); }
      // the clothesline: two T posts, a sagging line, a shirt, a striped towel and a pair of socks
      for (const x of [cl + 2, cl + 40]) { fill(b, x, g - 34, 3, 34, 'wood3'); fill(b, x, g - 34, 1, 34, 'wood2'); fill(b, x - 3, g - 35, 9, 2, 'wood2'); fill(b, x - 3, g - 35, 9, 1, 'wood1'); fill(b, x - 1, g - 2, 5, 2, 'wood4'); }
      const Y = x => g - 33 + Math.round(5 * Math.sin(Math.PI * (x - cl - 3) / 40));
      for (let x = cl + 3; x < cl + 42; x++) px(b, x, Y(x), 'wall3');
      const cloth = (x, cw, ch, R, f) => { for (let i = 0; i < cw; i++) { const y = Y(x + i) + 1; fill(b, x + i, y, 1, ch, i === 0 ? R[0] : i === cw - 1 ? R[2] : R[1]); px(b, x + i, y + ch - 1, R[2]); if (f) f(x + i, y, i); } fill(b, x, Y(x) - 1, 1, 2, 'wood2'); fill(b, x + cw - 1, Y(x + cw - 1) - 1, 1, 2, 'wood2'); };
      cloth(cl + 7, 11, 9, BLUE, (x, y, i) => { if (i === 5) px(b, x, y + 1, BLUE[3]); if (i < 2 || i > 8) px(b, x, y + 8, 0); if (i < 2 || i > 8) px(b, x, y + 7, 0); });
      cloth(cl + 20, 8, 12, ['wall0', 'wall1', 'wall2'], (x, y) => { px(b, x, y + 3, 'rose'); px(b, x, y + 8, 'rose'); });
      cloth(cl + 30, 3, 7, ['white', 'wall0', 'wall2'], (x, y) => px(b, x, y + 6, 'red')); cloth(cl + 34, 3, 6, ['white', 'wall0', 'wall2'], (x, y) => px(b, x, y + 5, 'red'));
    });
    const ax = wx + ww / 2 + 1;
    return { img: out.canvas(), ax, ay: g + 1, base: [-ww / 2 - 1, ww / 2 + 1], foot: 44, door: dx + dw / 2 + 1 - ax, lit: lit.map(I), bench: [dx + dw + 20 + 1 - ax, -12] };
  }

  /* The Gardener's home by the fields: a honey-plank cottage under a green roof with a glass porch on its right (its
     door is the way in), tomatoes and greens inside; seed trays on a potting bench, watering cans and a seed sack. */
  function gardenerHome() {
    const ww = 112, over = 5, rw = ww + over * 2, w = rw + 6, top = 10, eave = top + 50, wy = eave - 3, wb = wy + 44, g = wb + 4 + 14, lit = [], smoke = [];
    const wx = over, gx0 = wx + 50, gx1 = w - 1, fe = g - 38, ge = fe - 14, dx = gx0 + 26, dw = 20;
    const out = inked(w, g + 1, b => {
      wall(b, wx, wy, ww, wb - wy, ['wood0', 'wood1', 'wood2', 'wood3'], 'clap');
      footing(b, wx - 1, wb, ww + 2);
      win(b, lit, wx + 16, wy + 13, 16, 16, { box: ['red', 'white'] });
      roofSide(b, 0, top, rw, 50, ramp('roofG'), 5);
      chimney(b, 22, top); smoke.push([27, top - 10]);
      fill(b, wx, eave + 1, ww, 3, 'wood3'); fill(b, wx, eave + 1, ww, 1, 'wood4');
      // a rake leaning on the wall
      line(b, wx + 44, wb - 34, wx + 41, wb + 2, 'wood3'); fill(b, wx + 40, wb - 37, 9, 2, 'iron2'); for (let i = 0; i < 9; i += 2) px(b, wx + 40 + i, wb - 35, 'iron3');
      // the glass porch: a glazed roof slanting to the front, glass walls on a plank kick-wall, plants inside
      fill(b, gx0, ge, gx1 - gx0, fe - ge, 'sky1'); for (let y = ge; y < fe; y += 4) fill(b, gx0, y, gx1 - gx0, 1, 'sky0');
      for (let x = gx0; x < gx1; x += 9) fill(b, x, ge, 2, fe - ge, TRIM[1]); fill(b, gx0, ge, gx1 - gx0, 2, TRIM[0]);
      fill(b, gx0, fe - 3, gx1 - gx0, 3, TRIM[1]); fill(b, gx0, fe - 3, gx1 - gx0, 1, TRIM[0]); fill(b, gx0, fe, gx1 - gx0, 1, TRIM[3]);
      fill(b, gx0, fe + 1, gx1 - gx0, g - 7 - fe, 'sky3'); fill(b, gx0, fe + 1, gx1 - gx0, 3, 'sky2');
      const leafy = (x0, x1) => V.foliage(b, (x, y) => y > g - 24 + Math.sin(x / 3) * 2 && y < g - 7, [x0, g - 26, x1, g - 7], V.LEAF.green, 9, { cw: 7, ch: 5, dx: 5, dy: 4 });
      leafy(gx0 + 2, dx - 3); leafy(dx + dw + 3, gx1 - 1);
      for (const [x, y] of [[gx0 + 6, g - 18], [gx0 + 14, g - 14], [gx0 + 20, g - 20], [gx1 - 12, g - 16], [gx1 - 6, g - 21]]) { fill(b, x, y, 2, 2, 'red'); px(b, x, y, 'pink'); }
      for (let x = gx0 + 5; x < gx1 - 1; x += 17) { line(b, x, fe + 1, x, fe + 5, 'wall3'); fill(b, x - 2, fe + 6, 5, 4, 'roofR2'); fill(b, x - 2, fe + 6, 5, 1, 'roofR1'); px(b, x - 3, fe + 10, 'cap2'); px(b, x + 3, fe + 11, 'cap2'); px(b, x - 3, fe + 11, 'cap3'); }
      for (let x = gx0; x < gx1; x += 9) fill(b, x, fe + 1, 2, g - 7 - fe, TRIM[1]);
      for (const x of [gx0 + 3, gx0 + 30, gx1 - 9]) { line(b, x, fe + 3, x + 4, fe + 7, 'white'); line(b, x + 1, fe + 3, x + 5, fe + 7, 'sky0'); }
      fill(b, gx0, g - 7, gx1 - gx0, 7, 'wood2'); fill(b, gx0, g - 7, gx1 - gx0, 1, 'wood1'); for (let x = gx0 + 5; x < gx1; x += 6) fill(b, x, g - 6, 1, 6, 'wood3'); fill(b, gx0, g - 1, gx1 - gx0, 1, 'wood4');
      fill(b, gx0, ge, 2, g - ge, TRIM[1]); fill(b, gx1 - 2, ge, 2, g - ge, TRIM[2]);
      // the porch door: white frame, glass above, a plank panel below
      fill(b, dx - 2, g - 38, dw + 4, 38, TRIM[2]); fill(b, dx - 2, g - 38, dw + 4, 1, TRIM[0]); fill(b, dx, g - 36, dw, 18, 'sky3'); fill(b, dx, g - 36, dw, 3, 'sky2'); fill(b, dx + dw / 2 - 1, g - 36, 2, 18, TRIM[1]);
      px(b, dx + 2, g - 34, 'white'); px(b, dx + 3, g - 34, 'white'); fill(b, dx, g - 18, dw, 18, MINT[1]); fill(b, dx, g - 18, dw, 1, MINT[0]); fill(b, dx + 3, g - 15, dw - 6, 12, MINT[2]); fill(b, dx + 4, g - 14, dw - 8, 10, MINT[1]); fill(b, dx + dw - 4, g - 20, 2, 2, 'brass1');
      lit.push([dx, g - 36, dw, 18]);
      // the potting bench with seed trays, a watering can, a seed sack
      const tx = wx + 2; fill(b, tx, g - 12, 34, 3, 'wood2'); fill(b, tx, g - 12, 34, 1, 'wood1'); fill(b, tx, g - 9, 34, 1, 'wood4'); fill(b, tx + 2, g - 9, 2, 9, 'wood3'); fill(b, tx + 30, g - 9, 2, 9, 'wood3'); fill(b, tx + 4, g - 4, 26, 2, 'wood3');
      for (const sx of [tx + 2, tx + 17]) { fill(b, sx, g - 17, 14, 5, 'wood3'); fill(b, sx, g - 17, 14, 1, 'wood1'); fill(b, sx + 1, g - 16, 12, 3, 'e2'); for (let x = sx + 2; x < sx + 13; x += 3) { px(b, x, g - 17, 'g1'); px(b, x, g - 16, 'g2'); px(b, x + 1, g - 18, 'g0'); } }
      const can = (x, y, R) => { fill(b, x, y - 8, 9, 8, R[1]); fill(b, x, y - 8, 2, 8, R[0]); fill(b, x + 7, y - 8, 2, 8, R[2]); fill(b, x, y - 9, 9, 1, R[0]); line(b, x + 9, y - 5, x + 13, y - 10, R[2]); fill(b, x + 12, y - 11, 3, 2, R[1]); ring(b, x + 4, y - 11, 3, R[2]); fill(b, x, y - 2, 9, 1, R[3]); };
      can(tx + 36, g, MINT); can(tx + 4, g - 12, ['iron0', 'iron1', 'iron2', 'iron3']);
      fill(b, gx0 - 12, g - 12, 11, 12, 'wall2'); fill(b, gx0 - 11, g - 14, 9, 3, 'wall1'); fill(b, gx0 - 12, g - 12, 2, 12, 'wall1'); fill(b, gx0 - 3, g - 12, 2, 12, 'wall3'); fill(b, gx0 - 10, g - 15, 7, 2, 'brass2'); px(b, gx0 - 8, g - 16, 'brass1'); px(b, gx0 - 6, g - 15, 'wood3'); fill(b, gx0 - 9, g - 8, 5, 1, 'wall3');
    });
    const ax = Math.round(w / 2) + 1;
    return { img: out.canvas(), ax, ay: g + 1, base: [-w / 2 + 3, w / 2 - 1], foot: 58, door: dx + dw / 2 + 1 - ax, lit: lit.map(I), smoke: smoke.map(I) };
  }

  /* Leo's lookout on the hill top: a plank hut with a porthole and a lookout platform beside it on stilts, a brass
     telescope on a tripod and a pennant on a pole (frames: the pennant waves, fps 6). ladder is the ground point of
     the platform's ladder; door the hut's. */
  function leoHut() {
    const W = 122, G = 92, D = G - 34, hx = 4, hw = 58, wb = G - 4, dx = hx + 30, dw = 22, lit = [];
    const draw = f => inked(W, G + 1, b => {
      // the hut
      wall(b, hx, wb - 40, hw, 40, WOOD, 'plank'); footing(b, hx - 1, wb, hw + 2);
      ring(b, hx + 13, wb - 24, 6, 'brass2'); disc(b, hx + 13, wb - 24, 4, 4, 'sky3'); fill(b, hx + 10, wb - 28, 7, 3, 'sky2'); px(b, hx + 11, wb - 27, 'white'); px(b, hx + 9, wb - 28, 'brass0'); px(b, hx + 18, wb - 21, 'brass3');
      if (!f) lit.push([hx + 10, wb - 27, 7, 7]);
      door(b, [], dx, wb - 36, dw, 36, ['wood0', 'wood1', 'wood2', 'wood3']);
      roofSide(b, 0, wb - 40 - 27, hw + 8, 30, ramp('roofR'), 13);
      fill(b, hx, wb - 37, hw, 3, 'wood4');
      fill(b, dx - 8, wb - 30, 2, 3, 'iron3'); fill(b, dx - 10, wb - 27, 6, 7, 'iron3'); fill(b, dx - 9, wb - 26, 4, 5, 'light1'); px(b, dx - 9, wb - 26, 'light0');
      // the platform
      const x0 = hx + hw + 2, x1 = W - 4;
      stilts(b, x0 + 2, x1 - 2, D + 5, G, 3);
      deck(b, x0, D - 9, x1 - x0, 9);
      // the telescope on its tripod, the flag pole with its pennant
      const tx = x0 + 18, ty = D - 24;
      for (const [x, c] of [[-6, 'iron2'], [6, 'iron3'], [1, 'iron4']]) line(b, tx, ty, tx + x, D - 5, c);
      for (let k = 0; k < 20; k++) { const x = tx - 9 + k, y = ty + 3 - Math.round(k * 0.5), r = k < 6 ? 1 : 2; for (let j = -r; j <= r; j++) px(b, x, y + j, j === -r ? 'brass0' : j === r ? 'brass3' : j < 0 ? 'brass1' : 'brass2'); }
      fill(b, tx + 7, ty - 9, 3, 7, 'brass3'); fill(b, tx + 7, ty - 8, 2, 5, 'sky2'); px(b, tx + 7, ty - 8, 'white');
      fill(b, tx - 11, ty + 2, 3, 4, 'iron3'); px(b, tx - 11, ty + 2, 'iron1'); fill(b, tx - 1, ty - 1, 3, 3, 'iron3');
      fill(b, tx - 2, ty + 3, 2, 1, 'brass4');
      const fx = x1 - 6; fill(b, fx, D - 52, 2, 46, 'wood2'); fill(b, fx + 1, D - 52, 1, 46, 'wood4'); fill(b, fx - 1, D - 55, 4, 3, 'brass1'); px(b, fx - 1, D - 55, 'brass0');
      for (let i = 0; i < 18; i++) {
        const hh = Math.round(5 * (1 - i / 18)), dy = Math.round(Math.sin(i / 3 - f * Math.PI / 2) * 1.2 * i / 18);
        for (let j = -hh; j <= hh; j++) px(b, fx - 1 - i, D - 46 + j + dy, j === hh ? 'orange' : Math.abs(j) < 2 && i > 3 && i < 12 ? 'red' : 'yellow');
      }
      rail(b, x0, x1, D, 11);
      ladder(b, x1 - 22, D, G);
      // a crate of maps by the hut
      fill(b, x0 - 4, G - 10, 12, 10, 'wood2'); fill(b, x0 - 4, G - 10, 12, 2, 'wood1'); fill(b, x0 - 3, G - 7, 10, 1, 'wood3'); fill(b, x0 - 2, G - 13, 6, 3, 'wall0'); fill(b, x0 + 1, G - 14, 4, 4, 'wall1'); px(b, x0 + 2, G - 12, 'blue');
    });
    const frames = [0, 1, 2, 3].map(f => draw(f).canvas()), ax = Math.round(W / 2) + 1;
    return { img: frames[0], frames, fps: 6, ax, ay: G + 1, base: [-W / 2 + 2, W / 2 - 2], foot: 18, door: dx + dw / 2 + 1 - ax, ladder: [W - 20, G + 1], lit: lit.map(I) };
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

  Object.assign(VIL, { stiltHouse, satriaHome, gardenerHome, leoHut, busStop, swing, playground, chamomile, fieldFence, aphidPen });
})();
