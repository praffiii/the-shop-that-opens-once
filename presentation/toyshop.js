'use strict';
/* Nora's toy shop for "The Shop That Opens Once" (Night 2). Every pixel is authored here in code on top of px.js.
   window.TOYSHOP = { createToyShop }     ART.md scene contract.
   The presentation page does not load it: toyshop-preview.html shows it, and game/tools/export-art bakes it for the game. */
(() => {
  const P = PX.PAL;
  const { canvas, sprite, rect, dot, line, ellipse, rng } = PX;
  const C = c => PX.col(c);

  // Extra colours for this module, hue-shifted from PX.PAL ramps.
  const X = {
    pkL: '#f6c586', pkD: '#e3a262',                                    // floor plank tones between wood0/1 and wood1/2 (as interiors.js)
    pk0: '#ffd4ea',                                                    // pale pink (pink ramp top)
    lil0: '#e6dbff',                                                   // lilac highlight (lilac ramp top)
    mint0: '#e3f6e6', mint1: '#bde6cf', mint2: '#93cfb6',              // mint felt (roofG lifted toward cream)
    glow: 'rgba(255,196,92,0.24)', glow2: 'rgba(255,236,150,0.42)',    // warm light bands (light2 / light1), stacked into stepped pools
    glint: 'rgba(255,255,255,0.5)',                                    // glass glints
    shade: 'rgba(92,64,150,0.18)',                                     // soft violet cast shade
  };

  /* ---------------------------------------------------------------- helpers (as in interiors.js) */
  const S = (str, key) => sprite(str.trim().split('\n').map(r => r.trim()), key);
  // Filled polygon sampled at pixel centres (crisp, integer spans).
  function poly(x, pts, c) {
    x.fillStyle = C(c);
    const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y < y1; y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const a = Math.round(xs[k]), b = Math.round(xs[k + 1]); if (b > a) x.fillRect(a, y, b - a, 1); }
    }
  }
  // Per-pixel disc. fn(d, lit, dx, dy) -> colour | null; lit is +1 on the rim facing the top-left light, -1 opposite.
  function disc(x, cx, cy, r, fn) {
    const X0 = Math.floor(cx - r) - 1, X1 = Math.ceil(cx + r) + 1;
    for (let j = Math.floor(cy - r) - 1; j <= Math.ceil(cy + r); j++) {
      let run = null, rs = X0;
      for (let i = X0; i <= X1 + 1; i++) {
        let c = null;
        if (i <= X1) { const dx = i + 0.5 - cx, dy = j + 0.5 - cy, d = Math.hypot(dx, dy); if (d <= r) c = fn(d, d ? -(dx + dy) / (d * Math.SQRT2) : 1, dx, dy); }
        if (c !== run) { if (run) { x.fillStyle = C(run); x.fillRect(rs, j, i - rs, 1); } run = c; rs = i; }
      }
    }
  }
  // Cel-shade a silhouette: 1px outline (lighter on lit edges), top-left highlight band, bottom-right shade band.
  function bevel(src, r, hl = 1, sh = 2) {
    const w = src.width, h = src.height, a = src.getContext('2d').getImageData(0, 0, w, h).data;
    const M = (i, j) => i >= 0 && j >= 0 && i < w && j < h && a[(j * w + i) * 4 + 3] > 0;
    const [c, x] = canvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!M(i, j)) continue;
      const up = !M(i, j - 1), lf = !M(i - 1, j), dn = !M(i, j + 1), rt = !M(i + 1, j);
      let k;
      if (up || lf || dn || rt) k = r.ol && (up || lf) && !dn && !rt ? r.ol : r.o;
      else {
        let tl = 9, br = 9;
        for (let s = 2; s <= 6; s++) {
          if (tl === 9 && (!M(i - s, j) || !M(i, j - s) || !M(i - s + 1, j - s + 1))) tl = s;
          if (br === 9 && (!M(i + s, j) || !M(i, j + s) || !M(i + s - 1, j + s - 1))) br = s;
        }
        k = br <= sh + 1 && br <= tl ? r.s : tl <= hl + 1 ? r.h : r.b;
      }
      x.fillStyle = C(k); x.fillRect(i, j, 1, 1);
    }
    return c;
  }
  const mask = (w, h, f) => { const [c, x] = canvas(w, h); x.fillStyle = '#000'; f(x); return c; };
  // Bevelled shape in world coordinates: f(g) paints the silhouette (world coords) into a w x h mask at (x0, y0).
  const shape = (x, x0, y0, w, h, ramp, f, hl, sh) => x.drawImage(bevel(mask(w, h, g => { g.translate(-x0, -y0); f(g); }), ramp, hl, sh), x0, y0);
  function silhouette(src, color) {
    const [c, x] = canvas(src.width, src.height);
    x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = C(color); x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  // Prop drawn in world coordinates into its own canvas; sorted with actors by its base line y.
  function prop(x0, y0, w, h, y, f, dyn) {
    const [c, x] = canvas(w, h); x.translate(-x0, -y0); f(x);
    return { y, c, x0, y0, draw: dyn ? (g, t) => { g.drawImage(c, x0, y0); dyn(g, t); } : g => g.drawImage(c, x0, y0) };
  }
  // Draw sorted props and actors (actors win ties so they stand in front of same-line props).
  function drawSorted(g, list, actors, t) {
    const all = list.slice();
    for (const a of actors || []) all.push({ y: a.y + 0.01, actor: a });
    all.sort((a, b) => a.y - b.y);
    for (const it of all) it.actor ? it.actor.draw(g) : it.draw(g, t);
  }
  // Soft puffy cloud from stacked flat ellipses: [top, mid, underside] colours.
  function puffCloud(x, cx, cy, w, [top, mid, bot]) {
    const h = Math.max(4, Math.round(w / 4));
    ellipse(x, cx + (w >> 1), cy + h - 2, (w >> 1), 2, bot);
    ellipse(x, cx + (w >> 1), cy + h - 3, (w >> 1) - 1, 2, mid);
    ellipse(x, cx + Math.round(w * 0.35), cy + 1, Math.round(w * 0.22), Math.round(h * 0.55), mid);
    ellipse(x, cx + Math.round(w * 0.62), cy + 2, Math.round(w * 0.2), Math.round(h * 0.45), mid);
    ellipse(x, cx + Math.round(w * 0.35), cy, Math.round(w * 0.18), Math.round(h * 0.45), top);
    ellipse(x, cx + Math.round(w * 0.6), cy + 1, Math.round(w * 0.15), Math.round(h * 0.35), top);
  }
  // Gingham: s x s checks aligned to the world grid; where both stripes cross is darkest.
  function gingham(x, x0, y0, w, h, [light, mid, dark], s = 2) {
    for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) {
      const a = ((i / s) | 0) & 1, b = ((j / s) | 0) & 1;
      dot(x, i, j, a && b ? dark : a || b ? mid : light);
    }
  }
  const shadowRect = (x, sx, sy, w, h) => { rect(x, sx + 2, sy, w, h, X.shade); rect(x, sx + w + 2, sy + 1, 2, h - 1, X.shade); };
  const step = (t, fps) => Math.floor(t * fps);
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; };
  const LOOP = 24;          // seconds: the game plays the room as a 24 s loop, so motion that repeats within it loops seamlessly

  // Material ramps for bevel(): outline, lit outline, highlight, base, shade.
  const M = {
    wood: { o: 'wood4', ol: 'wood3', h: 'wood1', b: 'wood2', s: 'wood3' },
    fur: { o: 'wood4', ol: 'wood3', h: 'white', b: 'cream0', s: 'cream2' },
    cream: { o: 'wood3', ol: 'wood2', h: 'white', b: 'cream0', s: 'cream1' },
    pink: { o: 'roofR3', ol: 'rose', h: X.pk0, b: 'pink', s: 'rose' },
    sky: { o: 'roofB2', ol: 'sky4', h: 'white', b: 'sky1', s: 'sky2' },
    lilac: { o: 'roofB3', ol: 'dusk5', h: X.lil0, b: 'lilac', s: 'dusk5' },
  };

  /* ---------------------------------------------------------------- toys (small sprites for the shelves and the floor) */
  // Plush rabbit, the keepsake doll's pattern: fur [light, base, shade, inner ear], dress [light, base, shade].
  const RABBIT = `
    .oo....oo...
    oapo..oapo..
    oapo..oapo..
    oapo..oapo..
    .obo..obo...
    .oboooobo...
    oaabbbbbbo..
    oabbbbbbbco.
    oabebbbebco.
    oabbbnbbbco.
    .obbbbbbco..
    oolLLLLLdoo.
    oblLLLLLdbo.
    .olLLLLLdo..
    ..oao.oao...
    ...o...o....`;
  const rabbit = ([a, b, c, p], [l, L, d]) => S(RABBIT, { o: 'wood4', a, b, c, p, n: 'rose', e: 'ink', l, L, d });
  const FUR = { cream: ['white', 'cream0', 'cream2', 'pink'], pink: [X.pk0, 'pink', 'rose', 'roofR1'], lilac: [X.lil0, 'lilac', 'dusk5', 'pink'], peach: ['dusk0', 'dusk1', 'dusk2', 'roofR1'], grey: ['stone0', 'stone1', 'stone2', 'pink'], honey: ['wood0', 'wood1', 'wood2', 'pink'] };
  const CLOTH = { rose: ['roofR0', 'roofR1', 'roofR2'], cream: ['cream0', 'cream1', 'cream2'], sun: ['light1', 'yellow', 'brass2'], mint: [X.mint0, X.mint1, X.mint2], lilac: [X.lil0, 'lilac', 'dusk5'] };
  const teddy = (a, b, c) => S(`
    .oo...oo.
    oaao.oaao
    oabbobbco
    .obbbbbo.
    .obebebo.
    .obbmmbo.
    oobbbbboo
    oabbbbbco
    oabbccbco
    .obbccbo.
    oabo.obco
    .oo...oo.`, { o: 'wood4', a, b, c, e: 'ink', m: 'cream1' });
  const TOY = {
    drum: S(`
      .oooooo.
      ocwwwwco
      oCccccCo
      orzrzrzo
      ozrzrzro
      orrrrrro
      .oRRRRo.`, { o: 'roofR4', c: 'cream1', C: 'cream2', w: 'cream0', r: 'red', z: 'yellow', R: 'roofR3' }),
    boat: S(`
      ....w....
      ....wW...
      ....wwW..
      ....wwwW.
      ....m....
      orrrrrrro
      .oRRRRRo.
      ..ooooo..`, { o: 'roofR4', w: 'white', W: 'cream2', m: 'wood3', r: 'rose', R: 'roofR2' }),
    ball: S(`
      ..oooo..
      .owrrro.
      owwryyro
      orrryyyo
      orryyyro
      oRrrrrRo
      .oRRRRo.
      ..oooo..`, { o: 'roofR4', w: 'white', r: 'red', R: 'roofR2', y: 'yellow' }),
    duck: S(`
      ....oo..
      ...oyyo.
      ...oykbb
      o..oyyo.
      oyooyyo.
      oyyyyyo.
      .oYYYo..
      ..ooo...`, { o: 'brass3', y: 'yellow', Y: 'brass1', k: 'ink', b: 'orange' }),
    top: S(`
      ...o...
      ..oao..
      .obbbo.
      ocaaaco
      oyyyyyo
      .ocaco.
      ..oco..
      ...o...`, { o: 'roofG4', a: 'roofG0', b: 'roofG1', c: 'roofG2', y: 'yellow' }),
    blockA: S(`
      oooooo
      oaaaao
      oawwao
      oawaao
      oaaaao
      oooooo`, { o: 'roofR3', a: 'roofR1', w: 'white' }),
    blockB: S(`
      oooooo
      oaaaao
      oawwao
      oaawao
      oaaaao
      oooooo`, { o: 'brass3', a: 'yellow', w: 'white' }),
    blockC: S(`
      oooooo
      oaaaao
      oawwao
      oawwao
      oaaaao
      oooooo`, { o: 'roofG3', a: X.mint1, w: 'white' }),
  };
  // Felt shapes for the mobile.
  const FELT = {
    star: S(`
      ...o...
      ..oyo..
      oooyooo
      oyyyyyo
      .oyyyo.
      .oyoyo.
      .oo.oo.`, { o: 'brass3', y: 'yellow' }),
    moon: S(`
      ..ooo.
      .occo.
      occo..
      oco...
      oco...
      occo..
      .occoo
      ..ooo.`, { o: 'wood3', c: 'cream0' }),
    cloud: S(`
      ...oo....
      ..owwo...
      .owwwwoo.
      owwwwwwwo
      owcwwwcwo
      .ooooooo.`, { o: 'stone3', w: 'white', c: 'cloud2' }),
    bird: S(`
      ..oo....
      .oppo...
      oppkpooo
      .opppyyo
      ..oppoo.
      ...oo...`, { o: 'roofR3', p: 'pink', k: 'ink', y: 'orange' }),
    heart: S(`
      .oo.oo.
      orroRro
      orrrrro
      .orrro.
      ..oro..
      ...o...`, { o: 'roofR3', r: 'rose', R: 'pink' }),
  };

  /* ================================================================ NORA'S TOY SHOP */
  function createToyShop() {
    const W = 360, H = 240, FY = 124, WY = 98;                          // FY: wall / floor line; WY: chair rail
    const WB = { x0: 118, x1: 246, top: 146, front: 156, base: 168 };  // workbench: top slab, front face, base line
    const WINS = [[164, 50, 44, 40], [294, 52, 34, 34]];               // windows: x, y, w, h (the glass shows the dusk sky)
    const DR = { x0: 272, x1: 350, top: 97, front: 110, base: 125 };   // low dresser against the back wall; the frame lies on it
    const LAMPS = [150, 222], LAMP_Y = 78;                              // wall lamps either side of the middle window
    const SPOOL = [238, WB.top + 3];                                    // the blue spool's foot on the bench
    // anchors are feet points: Nora behind her bench, the courier's spot to talk to her, the way out to the square, and for each
    // hotspot (clickable rect) the spot where the courier stands to use it, under the same name
    const anchors = { nora: [184, 154], customer: [150, 184], door: [180, 234], rabbits: [50, 140], frame: [300, 140], shirt: [210, 182], spool: [238, 182] };
    const hotspots = { rabbits: [10, 52, 80, 72], frame: [283, 96, 28, 15], shirt: [198, 145, 24, 13], spool: [231, 136, 14, 16] };

    /* ---------- static layers. A: the wall surface, lit by the lamp pools. B: furniture and floor, drawn over the pools. */
    const [bgA, a] = canvas(W, FY);
    const [bg, b] = canvas(W, H);
    const poolClip = new Path2D(); poolClip.rect(0, 0, W, FY);

    // plaster with a stencilled frieze, the ceiling beam, timber posts and bunting
    rect(a, 0, 0, W, FY, 'wall1');
    { const r = rng(5); for (let k = 0; k < 70; k++) { const px = Math.floor(r() * (W - 4)), py = 30 + Math.floor(r() * 64); rect(a, px, py, 2, 1, 'wall2'); dot(a, px + 1, py + 1, 'wall2'); } }
    for (let px = 6, k = 0; px < W; px += 12, k++) {
      const c = ['pink', 'lilac', 'dusk2'][k % 3];
      rect(a, px - 1, 25, 3, 1, c); rect(a, px, 24, 1, 3, c); dot(a, px, 25, 'light1');
      dot(a, px + 3, 26, 'roofG1'); dot(a, px + 4, 25, 'roofG1');
    }
    rect(a, 0, 0, W, 9, 'wood4'); rect(a, 0, 0, W, 2, 'wood1'); rect(a, 0, 2, W, 5, 'wood2'); rect(a, 0, 7, W, 1, 'wood3');
    { const r = rng(9); for (let k = 0; k < 18; k++) { const gx = Math.floor(r() * (W - 20)), gl = 6 + Math.floor(r() * 12); rect(a, gx, 3 + Math.floor(r() * 3), gl, 1, 'wood3'); } }
    rect(a, 0, 9, W, 2, X.shade);
    wainscot(a);
    for (const px of [96, 262]) post(a, px);
    for (const [px, dir] of [[102, 1], [262, -1]]) {                   // braces in the corners of the middle bay
      poly(a, [[px, 30], [px, 24], [px + dir * 18, 9], [px + dir * 24, 9]], 'wood4');
      poly(a, [[px, 29], [px, 25], [px + dir * 19, 9], [px + dir * 22, 9]], 'wood2');
    }
    bunting(a);

    // wall furniture (window glass is cut out of both layers so the sky shows through)
    for (const w of WINS) windowFrame(b, ...w);
    rabbitCabinet(b, 10, 52, 80, FY - 52);
    boltStand(b, 104, 62);
    threadRack(b, 228, 54);
    for (const lx of LAMPS) sconce(b, lx, LAMP_Y);
    hoops(b);
    shawlPegs(b, 337, 58);
    dresser(b);
    // floor, rugs, light, door
    floor(b); playRug(b, 58, 186); patchRug(b, 116, 178, 132, 44); lightPatches(b); doorway(b);
    for (const sx of [0, W - 4]) { rect(b, sx, FY, 4, H - FY, 'wood2'); rect(b, sx + (sx ? 0 : 3), FY, 1, H - FY, 'wood4'); rect(b, sx + (sx ? 1 : 0), FY, 1, H - FY, 'wood1'); }

    function post(x, px) {
      rect(x, px + 6, 11, 2, FY - 11, X.shade);
      rect(x, px, 9, 6, FY - 9, 'wood4'); rect(x, px + 1, 9, 4, FY - 9, 'wood2'); rect(x, px + 1, 9, 1, FY - 9, 'wood1'); rect(x, px + 4, 9, 1, FY - 9, 'wood3');
      for (const ky of [40, 72]) { rect(x, px + 2, ky, 2, 3, 'wood3'); dot(x, px + 2, ky, 'wood4'); }
    }
    function wainscot(x) {
      // beadboard in powder blue under a honey chair rail
      rect(x, 0, WY + 3, W, FY - WY - 3, 'sky1');
      for (let px = 0; px < W; px += 6) { rect(x, px, WY + 3, 1, FY - WY - 8, 'sky3'); rect(x, px + 1, WY + 3, 1, FY - WY - 8, 'white'); rect(x, px + 5, WY + 3, 1, FY - WY - 8, 'sky2'); }
      rect(x, 0, WY + 3, W, 2, 'sky2');
      rect(x, 0, WY, W, 3, 'wood2'); rect(x, 0, WY, W, 1, 'wood0'); rect(x, 0, WY + 2, W, 1, 'wood3');
      rect(x, 0, FY - 5, W, 5, 'wood2'); rect(x, 0, FY - 5, W, 1, 'wood1'); rect(x, 0, FY - 1, W, 1, 'wood4');
    }
    // pastel pennants on a string, in shallow swags between the posts
    function bunting(x) {
      const cols = [['pink', 'rose'], [X.mint1, X.mint2], ['light1', 'yellow'], [X.lil0, 'lilac'], ['dusk1', 'dusk2'], ['cream0', 'cream2']];
      for (const [x0, x1] of [[4, 96], [102, 262], [268, 356]]) {
        const sag = px => 12 + Math.round(5 * Math.sin(Math.PI * (px - x0) / (x1 - x0)));
        for (let px = x0; px <= x1; px++) dot(x, px, sag(px), 'wood3');
        for (let px = x0 + 4, k = x0; px + 6 < x1; px += 10, k++) {
          const [lt, dk] = cols[k % cols.length], y = sag(px + 3) + 1;
          poly(x, [[px, y], [px + 7, y], [px + 3.5, y + 8]], dk);
          poly(x, [[px, y], [px + 6, y], [px + 3, y + 6]], lt);
          dot(x, px + 1, y, 'white');
        }
      }
    }
    function windowFrame(x, wx, wy, ww, wh) {
      // painted white frame, outlined in honey wood
      rect(x, wx - 3, wy - 3, ww + 6, wh + 6, 'wood3');
      rect(x, wx - 2, wy - 2, ww + 4, wh + 4, 'cream0');
      rect(x, wx - 2, wy - 2, ww + 4, 1, 'white'); rect(x, wx - 2, wy - 2, 1, wh + 4, 'white');
      rect(x, wx - 2, wy + wh + 1, ww + 4, 1, 'cream2'); rect(x, wx + ww + 1, wy - 2, 1, wh + 4, 'cream2');
      // six small panes cut out
      const pw = (ww - 3) / 2, ph = (wh - 4) / 3;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
        const ax = Math.round(wx + 1 + i * (pw + 1)), ay = Math.round(wy + 1 + j * (ph + 1)), aw = Math.round(pw), ah = Math.round(ph);
        rect(x, ax - 1, ay - 1, aw + 2, ah + 2, 'cream2');
        x.clearRect(ax, ay, aw, ah); a.clearRect(ax, ay, aw, ah); poolClip.rect(ax, ay, aw, ah);
        rect(x, ax + 1, ay + 1, 3, 1, X.glint); rect(x, ax + 1, ay + 2, 1, 2, X.glint); dot(x, ax + aw - 3, ay + ah - 2, X.glint);
      }
      // gingham valance with a scalloped hem, and tied-back side curtains
      const vx = wx - 6, vw = ww + 12;
      rect(x, vx - 1, wy - 8, vw + 2, 2, 'brass3'); rect(x, vx - 1, wy - 8, vw + 2, 1, 'brass1');
      gingham(x, vx, wy - 6, vw, 6, ['white', 'pink', 'rose']);
      for (let px = vx; px < vx + vw; px += 4) { rect(x, px + 1, wy, 2, 1, 'pink'); rect(x, px, wy, 1, 1, 'roofR2'); rect(x, px + 1, wy + 1, 2, 1, 'roofR2'); }
      curtain(x, wx - 6, wy - 1, 1, wh); curtain(x, wx + ww - 1, wy - 1, -1, wh);
      // sill
      rect(x, wx - 5, wy + wh + 2, ww + 10, 4, 'wood4');
      rect(x, wx - 4, wy + wh + 2, ww + 8, 1, 'wood0'); rect(x, wx - 4, wy + wh + 3, ww + 8, 1, 'wood1'); rect(x, wx - 4, wy + wh + 4, ww + 8, 1, 'wood2');
      rect(x, wx - 3, wy + wh + 6, ww + 6, 1, X.shade);
    }
    function curtain(x, cx, cy, dir, h) {
      // a gingham drape, pinched at a rose tie and flared to the sill
      for (let j = 0; j < h + 2; j++) {
        const n = j < 16 ? 7 - Math.round(j * 0.2) : Math.min(7, 4 + Math.round((j - 16) * 0.2)), x0 = dir > 0 ? cx : cx + 7 - n;
        for (let i = 0; i < n; i++) { const a2 = ((i + (dir > 0 ? 0 : 1)) >> 1) & 1, b2 = (j >> 1) & 1; dot(x, x0 + i, cy + j, a2 && b2 ? 'rose' : a2 || b2 ? 'pink' : 'white'); }
        dot(x, dir > 0 ? x0 + n - 1 : x0, cy + j, 'roofR2');
      }
      const ty = cy + 16, tx = dir > 0 ? cx + 1 : cx + 3;
      rect(x, tx, ty, 4, 2, 'roofR3'); rect(x, tx, ty, 4, 1, 'rose'); rect(x, tx + (dir > 0 ? 3 : 0), ty + 2, 1, 3, 'rose');
    }
    // A cream display cabinet under a little rose roof: two shelves of plush rabbits over a shelf of other toys.
    function rabbitCabinet(x, cx, cy, cw, ch) {
      const shelves = [
        [[rabbit(FUR.cream, CLOTH.rose), 3], [rabbit(FUR.pink, CLOTH.cream), 18], [rabbit(FUR.lilac, CLOTH.sun), 33], [rabbit(FUR.peach, CLOTH.mint), 48], [rabbit(FUR.grey, CLOTH.lilac), 61]],
        [[rabbit(FUR.honey, CLOTH.mint), 3], [rabbit(FUR.cream, CLOTH.sun), 17], [rabbit(FUR.pink, CLOTH.lilac), 32], [rabbit(FUR.grey, CLOTH.rose), 47], [rabbit(FUR.peach, CLOTH.cream), 61]],
        [[teddy('wood1', 'wood2', 'wood3'), 3], [TOY.drum, 14], [TOY.boat, 24], [teddy('pink', 'rose', 'roofR2'), 36], [TOY.duck, 48], [TOY.top, 60]],
      ];
      rect(x, cx + cw, cy + 3, 3, ch - 3, X.shade);
      // roof: a rose gable with a heart in the pediment
      const mid = cx + (cw >> 1), rt = cy - 16;
      poly(x, [[cx - 3, cy + 1], [mid, rt], [cx + cw + 3, cy + 1]], 'roofR3');
      poly(x, [[cx - 1, cy], [mid, rt + 2], [cx + cw + 1, cy]], 'roofR1');
      poly(x, [[cx - 1, cy], [mid, rt + 2], [mid, cy]], 'roofR0');
      for (let k = 1; k < 4; k++) { const yy = rt + 2 + k * 4, hw = Math.round((yy - rt) * (cw + 2) / 32); rect(x, mid - hw + 2, yy, 2 * hw - 4, 1, 'roofR2'); }
      rect(x, mid - 5, cy - 10, 11, 8, 'cream0'); rect(x, mid - 5, cy - 10, 11, 1, 'roofR3'); rect(x, mid - 5, cy - 3, 11, 1, 'cream2');
      x.drawImage(S(`
        .rr.rr.
        rRWrRRr
        rRRRRRr
        .rRRRr.
        ..rRr..
        ...r...`, { r: 'roofR3', R: 'rose', W: 'white' }), mid - 3, cy - 9);
      dot(x, mid, rt - 1, 'roofR3'); rect(x, mid - 1, rt - 3, 3, 2, 'brass2'); dot(x, mid, rt - 4, 'brass1');
      // body: painted cream with pale mint backs to the shelves
      const n = shelves.length, top = 4, base = 6, board = 3, cav = Math.floor((ch - top - base - board * (n - 1)) / n);
      rect(x, cx, cy, cw, ch, 'wood3');
      rect(x, cx + 1, cy + 1, cw - 2, ch - 1, 'cream1');
      rect(x, cx + 1, cy + 1, cw - 2, 1, 'white'); rect(x, cx + 1, cy + 2, cw - 2, 2, 'cream0');
      rect(x, cx + 1, cy + 1, 1, ch - 1, 'cream0'); rect(x, cx + cw - 2, cy + 3, 1, ch - 3, 'cream2');
      let yy = cy + top;
      shelves.forEach((items, k) => {
        const ix = cx + 4, iw = cw - 8;
        rect(x, ix, yy, iw, cav, X.mint1);
        rect(x, ix, yy, iw, 2, X.mint2); rect(x, ix, yy, 2, cav, X.mint2);
        for (let px = ix + 6; px < ix + iw; px += 8) rect(x, px, yy + 2, 1, cav - 2, X.mint0);
        rect(x, ix - 1, yy, 1, cav, 'wood3'); rect(x, ix + iw, yy, 1, cav, 'wood3');
        const floorY = yy + cav;
        for (const [spr, dx] of items) { x.drawImage(silhouette(spr, X.mint2), ix + dx + 2, floorY - spr.height); x.drawImage(spr, ix + dx, floorY - spr.height); }
        yy += cav;
        if (k < n - 1) { rect(x, cx + 1, yy, cw - 2, board, 'cream1'); rect(x, cx + 1, yy, cw - 2, 1, 'white'); rect(x, cx + 1, yy + board - 1, cw - 2, 1, 'cream2'); yy += board; }
      });
      const py = cy + ch - base;
      rect(x, cx + 1, py, cw - 2, base, 'cream2'); rect(x, cx + 1, py, cw - 2, 1, 'white'); rect(x, cx + 2, py + 2, cw - 4, 2, 'cream1');
      for (let px = cx + 4; px < cx + cw - 4; px += 6) dot(x, px, py + 3, 'roofR1');
    }
    // Bolts of fabric leaning in a low wooden bin: soft rounded tops, a lit fold on the left, a print on the front.
    function boltStand(x, sx, top) {
      const bolts = [[X.pk0, 'pink', 'rose', 'roofR3', 'dots', 'white', 52, -0.05], [X.mint0, X.mint1, X.mint2, 'roofG3', 'stripes', X.mint2, 60, 0.02], ['light0', 'light1', 'yellow', 'brass3', 'check', 'yellow', 55, -0.02],
        [X.lil0, 'lilac', 'dusk5', 'roofB3', 'flowers', 'white', 58, 0.03], ['dusk0', 'dusk1', 'dusk2', 'roofR3', 'stripes', 'dusk2', 50, -0.05]];
      const foot = FY - 8;
      rect(x, sx + 44, foot - 44, 3, 44, X.shade);
      bolts.forEach(([lt, base, sh, ol, pat, ink, h, lean], k) => {
        const x0 = sx + 3 + k * 8;
        for (let j = 0; j < h; j++) {
          const y = foot - h + j, bx = x0 + Math.round((h - j) * lean);
          if (j === 0) { rect(x, bx + 2, y, 4, 1, ol); continue; }
          if (j === 1) { dot(x, bx + 1, y, ol); rect(x, bx + 2, y, 4, 1, lt); dot(x, bx + 6, y, ol); continue; }
          dot(x, bx, y, ol); dot(x, bx + 7, y, ol);
          rect(x, bx + 1, y, 6, 1, j === 2 ? lt : base); dot(x, bx + 1, y, lt); dot(x, bx + 6, y, sh);
          const q = j - 4;
          if (q > 0 && q % 4 === 0) {
            if (pat === 'dots') { dot(x, bx + 3, y, ink); dot(x, bx + 5, y + 2, ink); }
            else if (pat === 'stripes') rect(x, bx + 2, y, 4, 2, ink);
            else if (pat === 'check') { rect(x, bx + 2, y, 4, 1, ink); dot(x, bx + 3, y - 2, ink); dot(x, bx + 3, y - 1, ink); }
            else { rect(x, bx + 3, y, 2, 1, ink); dot(x, bx + 3, y - 1, 'pink'); dot(x, bx + 4, y + 1, 'roofG2'); }
          }
        }
      });
      // a length of pink gingham draped over the front of the bin
      rect(x, sx - 1, foot - 6, 46, 14, 'wood4'); rect(x, sx, foot - 5, 44, 1, 'wood0'); rect(x, sx, foot - 4, 44, 11, 'wood2'); rect(x, sx, foot + 5, 44, 1, 'wood3');
      for (let px = sx + 6; px < sx + 40; px += 11) rect(x, px, foot - 3, 1, 8, 'wood3');
      const pal = ['white', 'pink', 'rose'];
      gingham(x, sx + 8, foot - 7, 16, 3, pal);
      for (let j = 0; j < 9; j++) { gingham(x, sx + 10 + (j >> 1), foot - 4 + j, 12 - j, 1, pal); dot(x, sx + 21 - (j >> 1) - (j & 1), foot - 4 + j, 'roofR2'); }
      rect(x, sx + 8, foot - 7, 16, 1, 'roofR2');
    }
    // Board of pegs holding spools of thread in warm colours; one peg stands empty (its blue spool is on the bench).
    function threadRack(x, rx, ry) {
      const w = 30, h = 42;
      rect(x, rx + 2, ry + 2, w, h, X.shade);
      rect(x, rx, ry, w, h, 'wood4'); rect(x, rx + 1, ry + 1, w - 2, h - 2, 'wood3'); rect(x, rx + 1, ry + 1, w - 2, 1, 'wood2'); rect(x, rx + 1, ry + 1, 1, h - 2, 'wood2');
      rect(x, rx + 10, ry - 3, 10, 3, 'wood4'); rect(x, rx + 11, ry - 2, 8, 2, 'wood2'); dot(x, rx + 15, ry - 4, 'brass2');
      const cols = [['pink', 'rose'], ['dusk1', 'dusk2'], ['light1', 'yellow'], [X.mint0, X.mint2], [X.lil0, 'lilac'], ['white', 'cream2'], ['roofR0', 'red'], ['light2', 'orange'], ['cap0', 'cap2'], ['roofG0', 'roofG2']];
      for (let j = 0; j < 4; j++) {
        const sy = ry + 3 + j * 10;
        rect(x, rx + 1, sy + 8, w - 2, 1, 'wood1'); rect(x, rx + 1, sy + 9, w - 2, 1, 'wood4');
        for (let i = 0; i < 5; i++) {
          const px = rx + 3 + i * 5;
          rect(x, px + 1, sy, 2, 1, 'wood4');                                                                    // the peg
          if (j === 1 && i === 3) { rect(x, px + 1, sy + 1, 2, 4, 'wood4'); dot(x, px + 1, sy + 1, 'wood2'); continue; }
          const [c0, c1] = cols[(i * 3 + j * 7) % cols.length];
          rect(x, px, sy + 1, 4, 1, 'wood0'); rect(x, px, sy + 7, 4, 1, 'wood1');                               // flanges
          rect(x, px + 1, sy + 2, 2, 5, c1); dot(x, px + 1, sy + 2, c0); dot(x, px + 1, sy + 4, c0); dot(x, px + 2, sy + 3, c0);
        }
      }
    }
    // Wall lamp: a brass arm holding a small oil lamp (its flame is dynamic).
    function sconce(x, lx, ly) {
      rect(x, lx - 2, ly + 3, 5, 6, 'brass3'); rect(x, lx - 1, ly + 4, 3, 4, 'brass1'); dot(x, lx - 1, ly + 4, 'brass0');
      rect(x, lx, ly + 1, 1, 3, 'brass3');
      rect(x, lx - 3, ly, 7, 2, 'brass3'); rect(x, lx - 2, ly, 5, 1, 'brass1');
      rect(x, lx - 2, ly - 10, 5, 10, 'stone2'); rect(x, lx - 1, ly - 9, 3, 8, 'cream0'); dot(x, lx - 1, ly - 9, 'white');
      rect(x, lx - 2, ly - 11, 5, 1, 'brass2');
    }
    // Embroidery hoops hung beside the right window.
    function hoops(x) {
      const hoop = (hx, hy, r, cloth, pic) => {
        rect(x, hx, hy - r - 3, 1, 3, 'brass3');
        disc(x, hx + 1.5, hy + 1.5, r, () => X.shade);
        disc(x, hx + 0.5, hy + 0.5, r, (d, lit) => d > r - 1 ? 'wood4' : d > r - 2.2 ? (lit > 0 ? 'wood0' : 'wood2') : cloth);
        rect(x, hx - 1, hy - r, 3, 1, 'brass2');
        pic(hx, hy);
      };
      hoop(276, 66, 6.5, 'cream0', (hx, hy) => { rect(x, hx - 1, hy - 2, 3, 3, 'rose'); dot(x, hx, hy - 1, 'yellow'); rect(x, hx, hy + 1, 1, 3, 'roofG2'); dot(x, hx + 1, hy + 2, 'roofG1'); dot(x, hx - 1, hy + 3, 'roofG1'); });
      hoop(280, 84, 5.5, X.pk0, (hx, hy) => { rect(x, hx - 2, hy - 1, 2, 2, 'roofR2'); rect(x, hx + 1, hy - 1, 2, 2, 'roofR2'); rect(x, hx - 1, hy + 1, 3, 1, 'roofR2'); dot(x, hx, hy + 2, 'roofR2'); dot(x, hx, hy, 'roofR2'); });
    }
    // A peg rail with Nora's knitted shawl and a straw hat.
    function shawlPegs(x, px, py) {
      rect(x, px, py, 18, 3, 'wood4'); rect(x, px + 1, py, 16, 1, 'wood1'); rect(x, px + 1, py + 1, 16, 1, 'wood2');
      for (const k of [3, 13]) { rect(x, px + k, py + 3, 2, 2, 'wood4'); dot(x, px + k, py + 3, 'wood2'); }
      for (let j = 0; j < 26; j++) {
        const hw = j < 4 ? 3 + j : Math.max(2, 7 - ((j - 4) >> 2)), cx = px + 4;
        for (let i = -hw; i <= hw; i++) dot(x, cx + i, py + 5 + j, (i + j) % 3 === 0 ? 'lilac' : (i - j) % 4 === 0 ? X.lil0 : 'lilac');
        dot(x, cx - hw - 1, py + 5 + j, 'dusk5'); dot(x, cx + hw + 1, py + 5 + j, 'dusk5');
      }
      for (let i = 0; i < 5; i++) { rect(x, px + 1 + i * 2, py + 31, 1, 3, X.lil0); }
      ellipse(x, px + 14, py + 8, 6, 2, 'dirt3'); ellipse(x, px + 14, py + 8, 5, 1, 'dirt1');
      rect(x, px + 11, py + 4, 7, 4, 'dirt3'); rect(x, px + 12, py + 4, 5, 3, 'dirt1'); rect(x, px + 12, py + 6, 5, 1, 'rose'); dot(x, px + 12, py + 4, 'dirt0');
    }
    // Low dresser: its top seen from above, three drawers; a photo frame lies face down on it.
    function dresser(x) {
      const { x0, x1, top, front, base } = DR, w = x1 - x0;
      rect(x, x0 + 3, base, w, 2, X.shade); rect(x, x1, front + 2, 3, base - front - 2, X.shade);
      rect(x, x0, top, w, base - top, 'wood4');
      rect(x, x0 + 1, top + 1, w - 2, front - top - 2, 'wood1'); rect(x, x0 + 1, top + 1, w - 2, 1, 'wood2');
      rect(x, x0 + 1, front - 1, w - 2, 1, 'wood0'); rect(x, x0 + 1, front, w - 2, 1, 'wood3');
      rect(x, x0 + 1, front + 1, w - 2, base - front - 3, 'wood2');
      for (let k = 0; k < 3; k++) {
        const dx = x0 + 3 + k * 25, dw = 22, dy = front + 3, dh = base - front - 8;
        rect(x, dx, dy, dw, dh, 'wood3'); rect(x, dx + 1, dy + 1, dw - 2, dh - 2, 'wood1'); rect(x, dx + 1, dy + 1, dw - 2, 1, 'wood0');
        rect(x, dx + (dw >> 1) - 1, dy + (dh >> 1) - 1, 3, 2, 'brass3'); dot(x, dx + (dw >> 1) - 1, dy + (dh >> 1) - 1, 'brass0');
      }
      rect(x, x0 + 2, base - 2, 3, 2, 'wood4'); rect(x, x1 - 5, base - 2, 3, 2, 'wood4');
      // the photo frame, put down face down and a little askew: a gilt moulding round its kraft back, the folded easel stand, four turn buttons
      const fq = [[285, 100], [307, 98], [308, 107], [286, 109]], inset = i => [[i, i], [-i, i], [-i, -i], [i, -i]].map(([dx, dy], k) => [fq[k][0] + dx, fq[k][1] + dy]);
      poly(x, fq.map(([px, py]) => [px + 2, py + 1]), X.shade);
      poly(x, inset(0), 'brass4'); poly(x, inset(1), 'brass2'); poly(x, [[286, 101], [306, 99], [306, 100], [286, 102]], 'brass1');
      poly(x, inset(2), 'dirt2'); poly(x, [[287, 102], [305, 100], [305, 101], [287, 103]], 'dirt1');
      poly(x, [[294, 101], [298, 100.5], [300, 107], [292, 107.5]], 'dirt3'); line(x, 298, 101, 300, 106, 'dirt4'); rect(x, 294, 100, 4, 1, 'brass1');
      for (const [cx, cy] of [[289, 103], [304, 101], [304, 105], [289, 106]]) dot(x, cx, cy, 'iron1');
      // a jug of flowers and a jar of buttons
      const vx = 334;
      ellipse(x, vx, top + 2, 9, 2, 'cream2'); ellipse(x, vx, top + 2, 8, 1, 'white');
      for (let k = -8; k <= 8; k += 2) dot(x, vx + k, top + 4 - (Math.abs(k) > 6 ? 1 : 0), 'white');
      for (const [sx, sy] of [[-3, -12], [1, -14], [4, -11], [0, -10], [-2, -9]]) line(x, vx + sx, top + sy + 2, vx, top - 8, 'leaf3');
      for (const [fx2, fy2, c] of [[-4, -14, 'pink'], [0, -17, 'yellow'], [3, -13, 'rose'], [-1, -12, 'white'], [5, -16, 'lilac'], [-3, -10, 'pink']]) { rect(x, vx + fx2, top + fy2, 2, 2, c); dot(x, vx + fx2, top + fy2, c === 'white' ? 'yellow' : 'white'); }
      rect(x, vx - 3, top - 8, 7, 10, 'roofB2'); rect(x, vx - 2, top - 8, 5, 9, 'sky2'); rect(x, vx - 2, top - 8, 2, 9, 'sky1'); rect(x, vx - 2, top - 4, 5, 1, 'white'); rect(x, vx + 4, top - 6, 2, 4, 'roofB2');
      const jx = 316;
      rect(x, jx, top - 8, 9, 10, 'water4'); rect(x, jx + 1, top - 7, 7, 8, 'water1'); rect(x, jx + 1, top - 8, 7, 1, 'brass2');
      for (const [bx, by, c] of [[2, -4, 'rose'], [5, -3, 'yellow'], [3, -1, X.mint1], [6, -1, 'lilac'], [2, 0, 'white'], [5, 0, 'roofR1']]) rect(x, jx + bx - 1, top + by, 2, 2, c);
      rect(x, jx + 1, top - 7, 1, 7, 'white');
    }
    function floor(x) {
      const r = rng(17), tones = [X.pkL, 'wood1', 'wood1', X.pkD], dark = { [X.pkL]: 'wood1', wood1: X.pkD, [X.pkD]: 'wood2' };
      for (let y = FY; y < H; y += 8) {
        let px = -Math.floor(r() * 50);
        while (px < W) {
          const len = 40 + Math.floor(r() * 46), tone = tones[Math.floor(r() * tones.length)];
          rect(x, px, y, len, 7, tone);
          const g = dark[tone];
          if (r() < 0.8) { const gx = px + 4 + Math.floor(r() * (len - 20)), gy = y + 2 + Math.floor(r() * 3); rect(x, gx, gy, 6 + Math.floor(r() * 10), 1, g); }
          if (r() < 0.5) { const gx = px + 6 + Math.floor(r() * (len - 18)), gy = y + 1 + Math.floor(r() * 5); rect(x, gx, gy, 4 + Math.floor(r() * 6), 1, g); }
          if (r() < 0.18) { const kx = px + 8 + Math.floor(r() * (len - 16)), ky = y + 2; rect(x, kx, ky, 3, 2, g); rect(x, kx + 1, ky, 1, 1, 'wood3'); rect(x, kx - 2, ky + 2, 7, 1, g); }
          rect(x, px + len - 1, y, 1, 7, 'wood3');
          px += len;
        }
        rect(x, 0, y + 7, W, 1, 'wood3');
      }
      rect(x, 0, FY, W, 2, X.shade);
    }
    // Round braided rag rug in the play corner.
    function playRug(x, cx, cy) {
      const rings = ['roofR2', 'pink', 'cream0', 'light1', 'cream0', X.mint1, 'cream0', X.lil0, 'cream0', 'dusk1', 'cream0'];
      ellipse(x, cx + 2, cy + 2, 40, 13, X.shade);
      rings.forEach((c, k) => ellipse(x, cx, cy, 40 - k * 3, Math.max(1, 13 - k), c));
      for (let a2 = 0; a2 < Math.PI * 2; a2 += 0.16) dot(x, cx + Math.round(Math.cos(a2) * 38), cy + Math.round(Math.sin(a2) * 12), 'rose');
    }
    // Patchwork quilt rug: rows of pastel patches with small prints, a cream border and a rose binding.
    function patchRug(x, rx, ry, w, h) {
      rect(x, rx + 2, ry + h, w, 2, X.shade);
      rect(x, rx, ry, w, h, 'roofR3'); rect(x, rx + 1, ry + 1, w - 2, h - 2, 'roofR1'); rect(x, rx + 1, ry + 1, w - 2, 1, 'roofR0'); rect(x, rx + 1, ry + h - 2, w - 2, 1, 'roofR2');
      rect(x, rx + 3, ry + 3, w - 6, h - 6, 'cream0');
      for (let px = rx + 5; px < rx + w - 5; px += 3) { dot(x, px, ry + 4, 'rose'); dot(x, px, ry + h - 5, 'rose'); }
      for (let py = ry + 6; py < ry + h - 5; py += 3) { dot(x, rx + 4, py, 'rose'); dot(x, rx + w - 5, py, 'rose'); }
      const cols = 8, rows = 3, pw = Math.floor((w - 12) / cols), ph = Math.floor((h - 12) / rows), ox = rx + 6 + ((w - 12 - pw * cols) >> 1), oy = ry + 6;
      const tints = [['pink', X.pk0, 'rose'], ['roofG0', X.mint0, 'roofG2'], ['yellow', 'light0', 'brass2'], ['lilac', X.lil0, 'dusk5'], ['dusk2', 'dusk0', 'roofR1'], ['sky3', 'sky1', 'sky4']];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const [base, lt, dk] = tints[(i * 2 + j * 3) % tints.length], px = ox + i * pw, py = oy + j * ph, k = (i + j * 5) % 4;
        rect(x, px, py, pw, ph, base);
        if (k === 0) for (let yy = py + 2; yy < py + ph - 1; yy += 3) for (let xx = px + 2 + ((yy - py) % 2); xx < px + pw - 1; xx += 4) dot(x, xx, yy, lt);
        else if (k === 1) for (let yy = py + 1; yy < py + ph; yy += 3) rect(x, px, yy, pw, 1, lt);
        else if (k === 2) { const mx = px + (pw >> 1), my = py + (ph >> 1); rect(x, mx - 1, my, 3, 1, dk); rect(x, mx, my - 1, 1, 3, dk); dot(x, mx, my, 'light0'); }
        else gingham(x, px, py, pw, ph, [base, lt, lt]);
        rect(x, px + pw - 1, py, 1, ph, dk);
        rect(x, px, py + ph - 1, pw, 1, dk);
      }
      for (const [cx, cy] of [[rx + 3, ry + 3], [rx + w - 4, ry + 3], [rx + 3, ry + h - 4], [rx + w - 4, ry + h - 4]]) dot(x, cx, cy, 'rose');
    }
    function lightPatches(x) {
      // window light on the floor below each window, skewed right (light from the top-left); mullions leave bars
      for (const [wx, , ww] of WINS) {
        const half = (ww - 3) >> 1;
        for (const [a0, a1] of [[1, 1 + half], [2 + half, ww - 1]]) for (const [y0, y1] of [[FY + 2, FY + 10], [FY + 12, FY + 20]]) {
          poly(x, [[wx + a0 + (y0 - FY) * 0.5, y0], [wx + a1 + (y0 - FY) * 0.5, y0], [wx + a1 + (y1 - FY) * 0.5, y1], [wx + a0 + (y1 - FY) * 0.5, y1]], X.glow2);
        }
      }
    }
    function doorway(x) {
      const dx = 166, dw = 28;
      poly(x, [[dx - 14, 196], [dx + dw + 14, 196], [dx + dw + 2, H], [dx - 2, H]], X.glow);
      poly(x, [[dx - 6, 210], [dx + dw + 6, 210], [dx + dw, H], [dx, H]], X.glow);
      // a braided rag doormat
      rect(x, dx + 1, 223, dw - 2, 11, 'roofR3');
      for (let j = 224; j < 233; j++) for (let i = dx + 2; i < dx + dw - 2; i++) dot(x, i, j, ['roofR1', 'cream0', X.mint1, 'cream0'][((i >> 1) + j) & 3]);
      rect(x, dx + 2, 224, dw - 4, 1, 'roofR0');
      for (const [a0, bw] of [[0, dx - 2], [dx + dw + 2, W - dx - dw - 2]]) { rect(x, a0, 234, bw, 6, 'wood3'); rect(x, a0, 234, bw, 2, 'wood1'); rect(x, a0, 236, bw, 1, 'wood2'); rect(x, a0, 239, bw, 1, 'wood4'); }
      for (const px of [dx - 4, dx + dw]) { rect(x, px, 228, 4, 12, 'wood4'); rect(x, px + 1, 228, 2, 12, 'wood2'); dot(x, px + 1, 228, 'wood0'); }
      rect(x, dx, 236, dw, 4, 'brass3'); rect(x, dx, 236, dw, 1, 'brass1'); rect(x, dx, 237, dw, 2, 'brass2');
    }

    /* ---------- window sky (static bands + drifting clouds + rooftops); the sun sets behind the cat on the middle sill */
    const SKX = 160, SKY = 46, SKW = 172, SKH = 46;
    const [sky, sk] = canvas(SKW, SKH);
    {
      const bands = [['dusk4', 0, 8], ['dusk3', 8, 9], ['dusk2', 17, 10], ['dusk1', 27, 9], ['dusk0', 36, 10]];
      for (const [c, y, h] of bands) rect(sk, 0, y, SKW, h, c);
      ellipse(sk, 38, 38, 10, 9, 'dusk0'); ellipse(sk, 38, 38, 7, 7, 'light1'); ellipse(sk, 38, 38, 5, 5, 'light0');
    }
    const [roofs, rf] = canvas(SKW, SKH);
    {
      const far = 'dusk3', mid = 'dusk4', near = 'dusk5', rim = 'dusk2';
      for (let i = 0; i < SKW; i++) { const h = Math.round(4 + 2 * Math.sin(i * 0.09) + 1.5 * Math.sin(i * 0.23 + 2)); rect(rf, i, SKH - 9 - h, 1, h + 9, far); }
      const houses = [[4, 14, 6, 7], [22, 12, 5, 6], [132, 12, 6, 6], [150, 16, 5, 8]];
      for (const [hx, w, wh, rh] of houses) {
        const top = SKH - wh;
        rect(rf, hx, top, w, wh, mid);
        poly(rf, [[hx - 1, top], [hx + w / 2, top - rh], [hx + w + 1, top]], near);
        line(rf, hx - 1, top - 1, hx + w / 2, top - rh, rim);
        rect(rf, hx + w - 5, top - rh + 1, 2, rh - 1, near);
        rect(rf, hx + 3, top + 2, 2, 2, 'light2'); if (w > 12) rect(rf, hx + w - 5, top + 2, 2, 2, 'light2');
      }
      for (const [tx, ty, r] of [[46, 39, 4], [142, 37, 5], [166, 38, 5]]) { ellipse(rf, tx, ty, r, r, near); rect(rf, tx - r + 1, ty - r + 1, 2, 1, rim); }
    }
    const clouds = [[6, 5, 22], [70, 9, 18], [120, 4, 26], [36, 16, 14]];
    const cloud = (x, cx, cy, w) => puffCloud(x, cx, cy, w, ['cloud0', 'dusk0', 'dusk1']);

    /* ---------- props sorted with actors */
    const props = [];
    // workbench: fabric rolls, spools (one blue), shears, a pincushion and a small unfinished shirt; the lamp's flame is dynamic
    props.push(prop(110, 118, 144, 54, WB.base, workbench, (g, t) => {
      const f = step(t, 8), lx = 124, ly = WB.top - 11;
      rect(g, lx - 1, ly + (f % 3 === 0 ? 1 : 0), 3, f % 3 === 0 ? 3 : 4, 'light3'); rect(g, lx, ly + 2, 1, 2, 'light0');
    }));
    function workbench(x) {
      const { x0, x1, top, front, base } = WB, w = x1 - x0;
      poly(x, [[x0 + 4, base], [x1 + 6, base], [x1 + 6, front + 2], [x1, front - 2], [x1, base]], X.shade);
      rect(x, x0 + 3, base, w, 2, X.shade);
      rect(x, x0, top, w, base - top, 'wood4');
      rect(x, x0 + 1, top + 1, w - 2, front - top - 2, 'wood1');
      for (let k = x0 + 32; k < x1 - 4; k += 32) rect(x, k, top + 1, 1, front - top - 2, 'wood2');
      rect(x, x0 + 1, top + 1, w - 2, 1, 'wood2');
      rect(x, x0 + 1, front - 1, w - 2, 1, 'wood0'); rect(x, x0 + 1, front, w - 2, 1, 'wood3');
      // front: a gathered lilac skirt round the table, a white ric-rac under the top and a scalloped hem
      for (let y = front + 1; y < base; y++) {
        const fl = y >= base - 3 ? 1 : 0, xa = x0 - fl, xb = x1 + fl;
        for (let i = xa; i < xb; i++) { const f = (i - x0 + 50) % 5; dot(x, i, y, i === xa || i === xb - 1 ? 'roofB3' : f === 0 ? X.lil0 : f === 3 ? 'dusk5' : 'lilac'); }
      }
      rect(x, x0, front + 1, w, 1, 'dusk5');
      for (let i = x0 + 1; i < x1 - 1; i++) dot(x, i, front + 2 + ((i >> 1) & 1), 'white');
      for (let i = x0 - 1; i < x1 + 1; i++) { const k = (i - x0 + 1) % 4; if (k === 1 || k === 2) { dot(x, i, base - 1, 'lilac'); dot(x, i, base, 'roofB3'); } else dot(x, i, base - 1, 'roofB3'); }
      for (let i = x0 + 1; i < x1 - 1; i += 4) dot(x, i + 1, base - 2, 'white');
      // --- on top, left to right: a small oil lamp (flame is dynamic)
      const lpx = 124, lpy = top - 14;
      ellipse(x, lpx, lpy + 5, 9, 8, X.glow); ellipse(x, lpx, lpy + 5, 6, 5, X.glow2);
      rect(x, lpx - 3, lpy + 13, 7, 2, 'brass4'); rect(x, lpx - 2, lpy + 13, 5, 1, 'brass1');
      rect(x, lpx - 2, lpy + 10, 5, 3, 'brass2'); rect(x, lpx - 2, lpy + 10, 2, 1, 'brass0');
      rect(x, lpx - 2, lpy, 5, 10, 'stone1'); rect(x, lpx - 1, lpy + 1, 3, 8, 'cream0'); dot(x, lpx - 1, lpy + 1, 'white');
      rect(x, lpx - 2, lpy, 5, 1, 'stone3');
      // fabric rolls lying on the top, stacked two and one
      const roll = (rx, ry, rw, [lt, base2, dk], pat) => {
        rect(x, rx, ry, rw, 6, dk); rect(x, rx + 1, ry, rw - 2, 5, base2); rect(x, rx + 1, ry, rw - 2, 2, lt);
        if (pat) for (let px = rx + 3; px < rx + rw - 4; px += 4) dot(x, px, ry + 3, pat);
        rect(x, rx + rw - 3, ry, 3, 6, 'cream2'); rect(x, rx + rw - 2, ry + 1, 1, 4, 'cream0'); dot(x, rx + rw - 2, ry + 2, 'wood3');
      };
      roll(132, top - 1, 22, [X.pk0, 'pink', 'rose'], 'white');
      roll(155, top, 19, [X.mint0, X.mint1, X.mint2]);
      roll(139, top - 6, 24, ['light0', 'light1', 'yellow'], 'dusk2');
      // big tailor's shears, open, in front of the rolls
      line(x, 158, top + 8, 170, top + 4, 'iron1'); line(x, 158, top + 9, 170, top + 5, 'iron3');
      line(x, 160, top + 4, 170, top + 7, 'iron0'); line(x, 160, top + 5, 170, top + 8, 'iron2');
      rect(x, 169, top + 3, 5, 3, 'roofR3'); rect(x, 170, top + 4, 3, 1, 'dirt1'); rect(x, 170, top + 7, 5, 3, 'roofR3'); rect(x, 171, top + 8, 3, 1, 'dirt1');
      dot(x, 168, top + 6, 'brass1');
      // pincushion: a tomato full of pins, with its strawberry
      disc(x, 186.5, top + 2.5, 4.2, (d, lit) => d > 3.5 ? 'roofR4' : lit > 0.45 ? 'roofR0' : lit > -0.3 ? 'red' : 'roofR2');
      rect(x, 185, top - 2, 3, 1, 'leaf3'); dot(x, 186, top - 3, 'leaf2');
      for (const [px, py, c] of [[183, -1, 'yellow'], [189, -1, 'white'], [185, 0, X.lil0], [188, 1, 'yellow']]) { dot(x, px, top + py, c); dot(x, px, top + py + 1, 'iron2'); }
      rect(x, 192, top + 4, 2, 3, 'roofR1'); dot(x, 192, top + 4, 'leaf2'); dot(x, 193, top + 6, 'yellow');
      // the unfinished child's shirt: pale yellow with a white collar and buttons, the hem half stitched in blue; its second sleeve lies pinned beside it
      const shx = 200, shy = top + 1;
      x.drawImage(S(`
        ...oooooo....
        .ooowwwwooo..
        oyyowwwwoyyo.
        oyyyowwoyyyyo
        oyyyyoyyyyyyo
        .ooyyyyyyyoo.
        ..oyyyYyyyo..
        ..oyyyyyyyo..
        ..oyyyYyyyo..
        ..obbbbbyyo..
        ..ooooooooo..`, { o: 'brass3', w: 'white', y: 'light1', Y: 'brass2', b: 'roofB2' }), shx, shy);
      x.drawImage(S(`
        .ooo.
        oyyyo
        oyyyo
        oyyyo
        .ooo.`, { o: 'brass3', y: 'light1' }), shx + 14, shy + 4);
      dot(x, shx + 16, shy + 3, 'white'); dot(x, shx + 16, shy + 4, 'iron2');
      // the needle in the hem, its blue thread running to the spool
      line(x, shx + 8, shy + 9, shx + 10, shy + 7, 'iron1'); dot(x, shx + 10, shy + 7, 'white');
      line(x, shx + 10, shy + 8, SPOOL[0] - 3, SPOOL[1] - 5, 'roofB2');
      // spools: three warm ones behind, the blue one in front
      const spool = (px, py, [c0, c1]) => { rect(x, px, py - 7, 5, 1, 'wood1'); rect(x, px, py - 1, 5, 1, 'wood2'); rect(x, px + 1, py - 6, 3, 5, c1); rect(x, px + 1, py - 6, 1, 5, c0); };
      spool(226, top + 1, ['pink', 'rose']); spool(231, top, ['light1', 'yellow']); spool(240, top, [X.mint0, X.mint2]);
      const [bx2, by2] = SPOOL;
      rect(x, bx2 - 4, by2 - 11, 9, 2, 'wood3'); rect(x, bx2 - 3, by2 - 11, 7, 1, 'wood1');
      rect(x, bx2 - 3, by2 - 9, 7, 7, 'roofB3'); rect(x, bx2 - 2, by2 - 9, 5, 7, 'roofB2'); rect(x, bx2 - 2, by2 - 9, 2, 7, 'roofB1'); dot(x, bx2 - 2, by2 - 8, 'roofB0'); dot(x, bx2 - 1, by2 - 7, 'roofB0');
      for (let j = by2 - 8; j < by2 - 2; j += 2) rect(x, bx2, j, 2, 1, 'roofB3');
      rect(x, bx2 - 4, by2 - 2, 9, 2, 'wood3'); rect(x, bx2 - 3, by2 - 2, 7, 1, 'wood1');
    }
    // rocking horse in the play corner
    props.push(prop(22, 146, 72, 50, 192, x => rockingHorse(x, 56, 192)));
    function rockingHorse(x, hx, hy) {
      ellipse(x, hx + 3, hy - 1, 25, 3, X.shade);
      // rockers: a bow of honey wood, curling up at both ends
      const bow = i => hy - 2 - Math.round(6 * Math.pow((i - hx) / 25, 2));
      // legs: [hip x, hoof x], far pair first (in shade), near pair with the body
      const legs = list => g => list.forEach(([ax, bx]) => poly(g, [[hx + ax, hy - 20], [hx + ax + 6, hy - 20], [hx + bx + 4, bow(hx + bx) - 2], [hx + bx - 1, bow(hx + bx) - 2]], '#000'));
      shape(x, hx - 30, hy - 26, 60, 26, { o: 'wood4', ol: 'wood4', h: 'cream1', b: 'cream1', s: 'cream2' }, legs([[-10, -16], [9, 14]]), 1, 1);
      for (let i = hx - 25; i <= hx + 25; i++) { const y = bow(i); rect(x, i, y - 3, 1, 5, 'wood4'); rect(x, i, y - 2, 1, 3, 'wood2'); dot(x, i, y - 2, 'wood1'); dot(x, i, y, 'wood3'); }
      for (const ex of [hx - 25, hx + 25]) { rect(x, ex - 1, bow(ex) - 4, 3, 4, 'wood4'); dot(x, ex, bow(ex) - 3, 'wood1'); }
      shape(x, hx - 30, hy - 50, 64, 50, M.fur, g => {
        ellipse(g, hx - 1, hy - 25, 13, 7, '#000');                                                       // body
        ellipse(g, hx - 11, hy - 26, 6, 6, '#000'); ellipse(g, hx + 9, hy - 27, 6, 6, '#000');             // rump, chest
        poly(g, [[hx + 5, hy - 28], [hx + 11, hy - 43], [hx + 18, hy - 44], [hx + 16, hy - 25]], '#000');  // neck
        ellipse(g, hx + 16, hy - 42, 5, 4, '#000');                                                       // head
        poly(g, [[hx + 15, hy - 45], [hx + 25, hy - 38], [hx + 24, hy - 34], [hx + 16, hy - 37]], '#000'); // muzzle
        legs([[-14, -21], [4, 9]])(g);
      }, 1, 2);
      for (const [, bx] of [[-14, -21], [4, 9]]) { const fx = hx + bx, fy = bow(fx) - 3; rect(x, fx - 1, fy - 2, 6, 2, 'wood4'); }
      // dapples, ear, eye, nostril and a red bridle
      for (const [dx, dy] of [[-9, -28], [-4, -25], [-10, -22], [2, -27], [-2, -21]]) { rect(x, hx + dx, hy + dy, 2, 1, 'cream2'); dot(x, hx + dx + 1, hy + dy + 1, 'cream2'); }
      poly(x, [[hx + 12, hy - 45], [hx + 13, hy - 50], [hx + 16, hy - 45]], 'wood4'); dot(x, hx + 13, hy - 47, 'pink'); dot(x, hx + 14, hy - 46, 'pink');
      rect(x, hx + 16, hy - 44, 2, 2, 'ink'); dot(x, hx + 16, hy - 44, 'white');
      dot(x, hx + 23, hy - 37, 'wood4');
      line(x, hx + 14, hy - 43, hx + 19, hy - 35, 'red'); line(x, hx + 18, hy - 36, hx + 24, hy - 36, 'red'); rect(x, hx + 18, hy - 37, 2, 2, 'brass1');
      // pink yarn mane and tail
      for (let k = 0; k < 8; k++) { const mx = hx + 11 - Math.round(k * 0.9), my = hy - 45 + k * 2; rect(x, mx - 2, my, 3, 2, k & 1 ? 'rose' : 'pink'); dot(x, mx - 2, my, X.pk0); }
      for (let k = 0; k < 7; k++) { const tx = hx - 17 - (k >> 1), ty = hy - 29 + k * 2; rect(x, tx, ty, 3, 2, k & 1 ? 'rose' : 'pink'); }
      // saddle with a brass stirrup
      shape(x, hx - 8, hy - 34, 16, 8, { o: 'roofR4', ol: 'roofR3', h: 'roofR0', b: 'red', s: 'roofR2' }, g => { rect(g, hx - 7, hy - 33, 13, 5, '#000'); rect(g, hx - 8, hy - 31, 15, 3, '#000'); }, 1, 1);
      rect(x, hx - 7, hy - 29, 13, 1, 'brass2');
      rect(x, hx, hy - 28, 1, 5, 'wood3'); rect(x, hx - 1, hy - 23, 3, 2, 'brass2'); dot(x, hx, hy - 23, 'brass0');
    }
    // blocks and a ball left on the play rug
    props.push(prop(76, 180, 30, 18, 196, x => {
      rect(x, 80, 194, 24, 2, X.shade);
      x.drawImage(TOY.blockA, 80, 188); x.drawImage(TOY.blockB, 86, 188); x.drawImage(TOY.blockC, 83, 182); x.drawImage(TOY.ball, 94, 187);
    }));
    // toy chest in the front-left corner, its lid open
    props.push(prop(6, 196, 46, 42, 234, x => toyChest(x, 10, 234)));
    function toyChest(x, cx, cy) {
      const w = 34, h = 16;
      rect(x, cx + 3, cy - 1, w, 2, X.shade);
      rect(x, cx + 1, cy - h - 10, w - 2, 10, 'wood4'); rect(x, cx + 2, cy - h - 9, w - 4, 8, 'wood2'); rect(x, cx + 2, cy - h - 9, w - 4, 1, 'wood1');
      x.drawImage(teddy('light1', 'yellow', 'brass2'), cx + 4, cy - h - 11);
      x.drawImage(TOY.ball, cx + 21, cy - h - 6);
      rect(x, cx + 15, cy - h - 12, 2, 10, 'roofR2'); rect(x, cx + 14, cy - h - 13, 4, 2, 'roofR0');
      shape(x, cx, cy - h, w, h, M.wood, g => rect(g, cx, cy - h, w, h, '#000'), 1, 2);
      rect(x, cx + 1, cy - h + 1, w - 2, 2, 'wood1');
      rect(x, cx + 3, cy - h + 5, w - 6, h - 8, 'wood3'); rect(x, cx + 4, cy - h + 6, w - 8, h - 10, 'roofB1'); rect(x, cx + 4, cy - h + 6, w - 8, 1, 'roofB0');
      [['A', 'rose'], ['B', 'yellow'], ['C', X.mint1]].forEach(([s, c], k) => { const px = cx + 6 + k * 8; rect(x, px - 1, cy - h + 7, 7, 5, c); PX.text(x, s, px + 1, cy - h + 7, 'wood4'); });
    }
    // sewing basket beside the bench
    props.push(prop(90, 150, 28, 26, 172, x => sewingBasket(x, 102, 172)));
    function sewingBasket(x, bx, by) {
      shadowRect(x, bx - 8, by - 2, 16, 3);
      rect(x, bx - 8, by - 10, 17, 10, 'wood4');
      for (let j = by - 9; j < by - 1; j += 2) { rect(x, bx - 7, j, 15, 1, 'wood1'); rect(x, bx - 7, j + 1, 15, 1, 'wood2'); }
      for (let i = bx - 5; i < bx + 8; i += 3) rect(x, i, by - 9, 1, 8, 'wood3');
      disc(x, bx - 3.5, by - 11.5, 3.5, (d, lit) => d > 2.9 ? 'roofR3' : lit > 0.3 ? X.pk0 : 'pink');
      disc(x, bx + 3.5, by - 12.5, 3.5, (d, lit) => d > 2.9 ? 'roofB3' : lit > 0.3 ? X.lil0 : 'lilac');
      line(x, bx + 1, by - 12, bx + 6, by - 20, 'wood3'); line(x, bx + 3, by - 12, bx + 9, by - 19, 'wood3'); dot(x, bx + 6, by - 21, 'brass1'); dot(x, bx + 9, by - 20, 'brass1');
      rect(x, bx - 8, by - 11, 17, 2, 'wood2'); rect(x, bx - 8, by - 11, 17, 1, 'wood1');
      line(x, bx - 8, by - 11, bx - 4, by - 17, 'wood4'); line(x, bx - 4, by - 17, bx + 4, by - 17, 'wood4'); line(x, bx + 4, by - 17, bx + 8, by - 11, 'wood4');
    }
    // wooden pull-along train on the floor
    props.push(prop(54, 208, 44, 20, 226, x => train(x, 58, 226)));
    function train(x, tx, ty) {
      rect(x, tx + 2, ty - 1, 38, 2, X.shade);
      x.drawImage(S(`
        .......oooo.......
        ..oo...oyyo.......
        .orro..oyyo.......
        .orro.oooooooooo..
        oooooooRRRRRRRRo..
        orrrrrrrrrrrrrrro.
        oRRRRRRRRRRRRRRRo.
        .oko...oko...oko..`, { o: 'roofR4', r: 'red', R: 'roofR2', y: 'light1', k: 'ink2' }), tx + 20, ty - 8);
      x.drawImage(S(`
        .oooo.oooo..
        .oaao.obbo..
        .oaao.obbo..
        oooooooooooo
        oyyyyyyyyyyo
        oYYYYYYYYYYo
        .oko....oko.`, { o: 'brass3', y: 'yellow', Y: 'brass2', a: X.mint1, b: 'pink', k: 'ink2' }), tx + 6, ty - 7);
      line(x, tx + 1, ty - 3, tx + 6, ty - 3, 'wood3'); line(x, tx + 17, ty - 3, tx + 20, ty - 3, 'wood3');
      rect(x, tx - 2, ty - 4, 3, 3, 'roofR1');
    }
    // a tea party for two plush guests
    props.push(prop(250, 178, 56, 40, 212, x => teaParty(x, 278, 212)));
    function teaParty(x, tx, ty) {
      const stool = sx => { rect(x, sx - 4, ty - 1, 11, 2, X.shade); for (const lx of [sx - 3, sx + 3]) rect(x, lx, ty - 6, 1, 6, 'wood4'); rect(x, sx - 4, ty - 8, 9, 3, 'wood4'); rect(x, sx - 3, ty - 8, 7, 1, 'wood1'); rect(x, sx - 3, ty - 7, 7, 1, 'wood2'); };
      stool(tx - 18); stool(tx + 18);
      x.drawImage(teddy('wood1', 'wood2', 'wood3'), tx - 22, ty - 19);
      x.drawImage(PX.flip(rabbit(FUR.cream, CLOTH.mint)), tx + 12, ty - 23);
      // a round table under a lace cloth, on a turned pedestal
      ellipse(x, tx + 2, ty - 1, 8, 2, X.shade);
      rect(x, tx - 5, ty - 3, 11, 3, 'wood4'); rect(x, tx - 4, ty - 3, 9, 1, 'wood1');
      rect(x, tx - 1, ty - 12, 3, 10, 'wood4'); rect(x, tx, ty - 12, 1, 9, 'wood2'); rect(x, tx - 2, ty - 8, 5, 2, 'wood4'); dot(x, tx - 1, ty - 8, 'wood1');
      ellipse(x, tx, ty - 15, 12, 4, 'cream2'); ellipse(x, tx, ty - 16, 12, 3, 'white'); ellipse(x, tx - 2, ty - 17, 7, 1, 'cream0');
      for (let px = tx - 11; px <= tx + 10; px += 3) { rect(x, px, ty - 13, 2, 1, 'white'); dot(x, px, ty - 12, 'cream2'); }
      // teapot, two cups and a little cake
      x.drawImage(S(`
        ..oo...
        .oppo..
        oppWpoo
        opppppo
        oppppo.
        .oooo..`, { o: 'roofR3', p: 'pink', W: 'white' }), tx - 3, ty - 23);
      for (const cx of [tx - 9, tx + 6]) { rect(x, cx, ty - 19, 4, 3, 'roofB2'); rect(x, cx, ty - 19, 4, 1, 'white'); rect(x, cx + 4, ty - 18, 1, 1, 'roofB2'); }
      rect(x, tx + 1, ty - 18, 5, 2, 'cream1'); rect(x, tx + 1, ty - 19, 5, 1, X.pk0); dot(x, tx + 3, ty - 20, 'red');
    }
    // a doll's pram with a rabbit tucked in under a lilac hood
    props.push(prop(252, 140, 44, 40, 178, x => pram(x, 270, 178)));
    function pram(x, px, py) {
      ellipse(x, px + 3, py - 1, 15, 2, X.shade);
      // big spoked wheels
      for (const wx of [px - 9, px + 9]) {
        disc(x, wx + 0.5, py - 5.5, 5.5, (d, lit) => d > 4.6 ? 'iron4' : d > 3.6 ? (lit > 0 ? 'iron1' : 'iron2') : d < 1.2 ? 'iron3' : null);
        for (const [dx, dy] of [[0, -3], [0, 3], [-3, 0], [3, 0], [-2, -2], [2, 2], [2, -2], [-2, 2]]) dot(x, wx + dx, py - 6 + dy, 'iron2');
      }
      line(x, px - 9, py - 6, px + 9, py - 6, 'iron3');
      // handle rising at the back
      line(x, px + 11, py - 16, px + 18, py - 30, 'iron3'); line(x, px + 12, py - 16, px + 19, py - 30, 'iron2');
      rect(x, px + 16, py - 32, 7, 3, 'wood4'); rect(x, px + 17, py - 32, 5, 1, 'cream0'); rect(x, px + 17, py - 31, 5, 1, 'cream1');
      // the rabbit, then the body over it
      x.drawImage(rabbit(FUR.pink, CLOTH.cream), px - 2, py - 30);
      shape(x, px - 15, py - 22, 30, 14, M.cream, g => { poly(g, [[px - 14, py - 21], [px + 14, py - 21], [px + 11, py - 11], [px - 11, py - 11]], '#000'); ellipse(g, px, py - 11, 11, 2, '#000'); }, 1, 2);
      rect(x, px - 12, py - 17, 25, 2, 'lilac'); rect(x, px - 12, py - 17, 25, 1, X.lil0);
      for (let k = px - 10; k < px + 12; k += 4) dot(x, k, py - 14, 'cream2');
      // the folded hood
      shape(x, px - 17, py - 34, 20, 16, M.lilac, g => { ellipse(g, px - 8, py - 21, 8, 11, '#000'); g.clearRect(px - 17, py - 20, 20, 14); rect(g, px - 16, py - 22, 17, 2, '#000'); }, 1, 1);
      for (const k of [-12, -8, -4]) line(x, px + k, py - 29 + Math.abs(k + 8) / 2, px + k, py - 22, 'dusk5');
    }
    // dress form with a half-made pink dress
    props.push(prop(296, 128, 40, 64, 190, x => dressForm(x, 316, 190)));
    function dressForm(x, fx, fy) {
      ellipse(x, fx + 2, fy - 1, 9, 2, X.shade);
      line(x, fx, fy - 4, fx - 7, fy - 1, 'wood4'); line(x, fx, fy - 4, fx + 7, fy - 1, 'wood4'); line(x, fx, fy - 4, fx + 2, fy, 'wood4');
      rect(x, fx - 1, fy - 22, 2, 18, 'wood4'); rect(x, fx - 1, fy - 22, 1, 18, 'wood2');
      shape(x, fx - 12, fy - 58, 24, 40, M.cream, g => { ellipse(g, fx, fy - 46, 8, 9, '#000'); rect(g, fx - 5, fy - 52, 10, 3, '#000'); ellipse(g, fx, fy - 32, 9, 8, '#000'); rect(g, fx - 2, fy - 56, 4, 4, '#000'); }, 1, 2);
      rect(x, fx - 2, fy - 57, 4, 2, 'wood3'); rect(x, fx - 1, fy - 58, 2, 1, 'wood4');
      shape(x, fx - 12, fy - 50, 24, 30, M.pink, g => { rect(g, fx - 6, fy - 48, 12, 9, '#000'); poly(g, [[fx - 7, fy - 40], [fx + 7, fy - 40], [fx + 10, fy - 23], [fx - 10, fy - 23]], '#000'); }, 1, 2);
      for (let px = fx - 9; px <= fx + 9; px += 3) dot(x, px, fy - 24, 'white');
      rect(x, fx - 6, fy - 40, 13, 1, 'roofR2'); rect(x, fx - 1, fy - 41, 3, 3, 'white');
      for (const [px, py] of [[fx - 4, fy - 36], [fx + 3, fy - 31], [fx - 2, fy - 28]]) { dot(x, px, py, 'iron0'); dot(x, px, py - 1, 'yellow'); }
      for (let j = 0; j < 16; j++) { dot(x, fx - 7 - (j > 8 ? 1 : 0), fy - 50 + j, j & 1 ? 'yellow' : 'brass2'); if (j < 11) dot(x, fx + 7 + (j > 6 ? 1 : 0), fy - 50 + j, j & 1 ? 'yellow' : 'brass2'); }
    }
    // potted geranium in the front-right corner
    props.push(prop(316, 184, 44, 56, 236, x => geranium(x, 338, 236)));
    function geranium(x, px, py) {
      ellipse(x, px + 3, py - 1, 13, 3, X.shade);
      const leaves = [[-9, -22, 5], [-3, -27, 5], [4, -26, 5], [10, -21, 5], [-11, -16, 4], [-4, -19, 5], [4, -18, 5], [11, -14, 4]];
      for (const [dx, dy, r] of leaves) disc(x, px + dx + 0.5, py + dy + 0.5, r, (d, lit) => d > r - 1 ? 'leaf5' : lit > 0.45 ? 'leaf1' : lit > -0.2 ? 'leaf2' : 'leaf3');
      for (const [dx, dy, r] of leaves) { dot(x, px + dx, py + dy, 'leaf4'); dot(x, px + dx - 1, py + dy + 1, 'leaf3'); }
      for (const [dx, dy] of [[-7, -33], [2, -37], [10, -31], [-12, -27], [6, -29]]) {
        line(x, px + dx, py + dy + 3, px + dx + (dx > 0 ? -1 : 1), py + dy + 9, 'leaf3');
        for (const [ox, oy, c] of [[-2, 0, 'rose'], [1, -1, 'pink'], [0, 1, 'rose'], [-1, -2, 'pink'], [2, 1, 'roofR1']]) rect(x, px + dx + ox, py + dy + oy, 2, 2, c);
        dot(x, px + dx, py + dy - 1, X.pk0);
      }
      shape(x, px - 10, py - 15, 21, 15, M.sky, g => { rect(g, px - 10, py - 15, 21, 4, '#000'); rect(g, px - 8, py - 11, 17, 11, '#000'); }, 1, 2);
      rect(x, px - 8, py - 11, 17, 1, 'sky3');
      for (let k = -6; k <= 6; k += 4) { dot(x, px + k, py - 7, 'roofB1'); dot(x, px + k + 1, py - 6, 'roofB1'); dot(x, px + k, py - 5, 'roofB1'); }
    }
    // wrapped parcels by the door, waiting to be delivered
    props.push(prop(200, 208, 32, 30, 234, x => parcels(x, 204, 234)));
    function parcels(x, px, py) {
      shadowRect(x, px, py - 2, 22, 3);
      const box = (bx, by, w, h, [lt, base, dk], rib) => {
        rect(x, bx, by, w, h, dk); rect(x, bx + 1, by + 1, w - 2, h - 2, base); rect(x, bx + 1, by + 1, w - 2, 1, lt); rect(x, bx + 1, by + 1, 1, h - 2, lt);
        rect(x, bx + (w >> 1), by, 1, h, rib); rect(x, bx, by + (h >> 1), w, 1, rib);
      };
      box(px, py - 12, 16, 12, ['cream0', 'cream1', 'dirt3'], 'rose');
      box(px + 13, py - 9, 10, 9, [X.lil0, 'lilac', 'roofB3'], 'white');
      box(px + 3, py - 21, 10, 9, [X.mint0, X.mint1, 'roofG3'], 'roofR1');
      rect(x, px + 6, py - 24, 2, 3, 'roofR1'); rect(x, px + 8, py - 24, 2, 3, 'roofR1'); dot(x, px + 8, py - 22, 'roofR3');
    }
    // a basket of fabric scraps, left of the door
    props.push(prop(136, 208, 26, 30, 234, x => scrapBasket(x, 148, 234)));
    function scrapBasket(x, bx, by) {
      shadowRect(x, bx - 8, by - 2, 17, 3);
      for (const [dx, dy, c, c2] of [[-6, -17, 'pink', 'rose'], [-1, -19, X.mint1, X.mint2], [3, -16, 'light1', 'yellow'], [-3, -15, X.lil0, 'lilac'], [5, -18, 'dusk1', 'dusk2']]) {
        poly(x, [[bx + dx, by + dy + 6], [bx + dx + 2, by + dy], [bx + dx + 5, by + dy + 6]], c2); poly(x, [[bx + dx + 1, by + dy + 6], [bx + dx + 2, by + dy + 2], [bx + dx + 4, by + dy + 6]], c);
      }
      rect(x, bx - 8, by - 11, 17, 11, 'wood4');
      for (let j = by - 10; j < by - 1; j += 2) { rect(x, bx - 7, j, 15, 1, 'wood1'); rect(x, bx - 7, j + 1, 15, 1, 'wood2'); }
      for (let i = bx - 5; i < bx + 8; i += 3) rect(x, i, by - 10, 1, 9, 'wood3');
      rect(x, bx - 8, by - 12, 17, 2, 'wood2'); rect(x, bx - 8, by - 12, 17, 1, 'wood1');
    }

    /* ---------- dynamic pieces */
    // ginger cat on the middle window's sill, watching the sunset; its tail hangs over the sill and swishes
    const catBack = S(`
      ..o.......o..
      .oao.....obo.
      .oaaooooobbo.
      oabbbbbbbbbbo
      oabdbbbbbdbbo
      oabbbbbbbbbco
      .oabbbbbbbco.
      ..oobbbbboo..
      ..oabbbbbbo..
      .oabbdbdbbbo.
      .oabbbbbbbbo.
      oabbdbbbdbbco
      oabbbbbbbbbco
      oabbbbbbbbbco
      .occccccccco.`, { o: 'wood4', a: 'light1', b: 'orange', c: 'light3', d: 'light4' });
    const TAIL = [[[0, 0], [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [3, 5]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6]], [[0, 0], [0, 1], [0, 2], [-1, 3], [-1, 4], [-2, 5], [-3, 5]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [-1, 6]]];
    function cat(g, t, still) {
      const [wx, wy, ww, wh] = WINS[0], cx = wx + ww - 18, cy = wy + wh + 2;
      g.drawImage(catBack, cx, cy - catBack.height);
      const f = still ? 1 : [0, 1, 2, 1, 1, 3, 1, 1][step(t, 3) % 8], tx = cx + 8, ty = cy + 1;
      for (const [dx, dy] of TAIL[f]) rect(g, tx + dx - 1, ty + dy, 3, 1, 'wood4');
      for (const [dx, dy] of TAIL[f]) dot(g, tx + dx, ty + dy, dy & 1 ? 'orange' : 'light3');
    }
    // felt mobile turning slowly in front of the right window: one turn of the top bar per loop, two of the lower one
    function mobile(g, t, still) {
      const cx = 311, barY = 58, th = still ? 0.6 : (step(t, 4) / 4) * (2 * Math.PI / LOOP), pieces = [];
      line(g, cx, 9, cx, barY, 'wood3');
      const arm = (hx, hy, r, ang, list) => {
        const dx = Math.round(Math.cos(ang) * r);
        line(g, hx - dx, hy, hx + dx, hy, 'wood3'); dot(g, hx, hy, 'wood4');
        list.forEach(([img, len], k) => { const s = k ? -1 : 1; pieces.push({ px: hx + s * dx, py: hy, len, img, depth: s * Math.sin(ang), flip: s * Math.sin(ang) < 0 }); });
        return hx - dx;
      };
      const hub = arm(cx, barY, 13, th, [[FELT.star, 8], [FELT.cloud, 5]]);
      arm(hub, barY + 14, 7, -2 * th + 1, [[FELT.moon, 4], [FELT.bird, 6]]);
      line(g, hub, barY, hub, barY + 14, 'wood3');
      pieces.push({ px: cx, py: barY, len: 17, img: FELT.heart, depth: 0 });
      pieces.sort((p, q) => p.depth - q.depth);
      for (const p of pieces) {
        line(g, p.px, p.py, p.px, p.py + p.len, 'wood3');
        const im = p.flip ? PX.flip(p.img) : p.img;
        g.drawImage(im, p.px - (im.width >> 1), p.py + p.len);
      }
    }

    function draw(g, view, actors) {
      const st = view.state || {}, still = !!st.still, t = still ? 0 : view.t;
      // export hook (game/tools/export-art): st.part draws one piece alone: 'below' is the room without the sorted props, 'item' is props[st.item]
      if (st.part === 'item') { props[st.item].draw(g, t); return; }

      // window sky: bands, drifting clouds, rooftops
      g.drawImage(sky, SKX, SKY);
      g.save(); g.beginPath(); g.rect(SKX, SKY, SKW, SKH); g.clip();
      for (const [cx, cy, w] of clouds) { const span = SKW + 40, px = Math.round(((cx + t * (1.2 + w / 30)) % span + span) % span) - 30; cloud(g, SKX + px, SKY + cy, w); }
      g.restore();
      g.drawImage(roofs, SKX, SKY);
      g.drawImage(bgA, 0, 0);

      // lamp light pools on the wall (stepped, hard-edged; clipped away from the window glass)
      g.save(); g.clip(poolClip, 'evenodd');
      LAMPS.forEach((lx, i) => {
        const f = still ? 0 : Math.floor(hash(step(t, 6) * 7 + i * 131) * 3) - 1, ly = LAMP_Y - 6;
        ellipse(g, lx, ly, 20 + f, 18 + f, X.glow);
        ellipse(g, lx, ly, 13 + (f > 0 ? 1 : 0), 12, X.glow);
        ellipse(g, lx, ly, 7, 7, X.glow2);
      });
      g.restore();
      g.drawImage(bg, 0, 0);

      // lamp flames, the cat and the mobile
      LAMPS.forEach((lx, i) => {
        const f = still ? 1 : step(t, 8) + i * 2, ly = LAMP_Y - 7;
        rect(g, lx - 1, ly + (f % 3 === 0 ? 1 : 0), 3, f % 3 === 0 ? 3 : 4, 'light3'); rect(g, lx, ly + 2, 1, 2, 'light0');
      });
      cat(g, t, still);
      mobile(g, t, still);

      // dust motes drifting down through the window light (each falls a whole number of times per loop)
      if (!still) for (let k = 0; k < 12; k++) {
        const [wx, , ww] = WINS[k % 2], n = 2 + (k % 3), yy = FY - 16 + ((hash(k * 13) * 30 + (t * n * 30) / LOOP) % 30);
        const xx = wx + 4 + hash(k * 29) * (ww - 8) + (yy - FY) * 0.5 + Math.sin((2 * Math.PI * t * (1 + (k % 2))) / LOOP + k * 1.7) * 2;
        dot(g, Math.round(xx), Math.round(yy), k % 3 ? 'light0' : 'white');
      }

      if (st.part === 'below') return;
      drawSorted(g, props, actors, t);
    }

    // props: the sorted items; floor and door: [x, y, w, h] of the floor between the walls and the doorway (for walk masks)
    return { w: W, h: H, bg: P.wall2, anchors, hotspots, paths: {}, draw, props, floor: [4, FY, W - 8, 234 - FY], door: [166, 234, 28, H - 234] };
  }

  window.TOYSHOP = { createToyShop };
})();
