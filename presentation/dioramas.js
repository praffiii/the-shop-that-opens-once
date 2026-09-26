'use strict';
/* Night dioramas for "The Shop That Opens Once" (v2): seven 160x96 settings, every pixel authored in code.
   window.DIO = { names, create(name) }. Each scene follows the ART.md scene contract and also reads
   view.state.still (one calm frame) and view.state.glow (0..1, a stepped warm memory light around anchors.item). */
(() => {
  const { canvas, sprite, rect, dot, line, ellipse, shadow, text, rng } = PX;
  const W = 160, H = 96;

  // Extra colours for this module (hue-shifted from PAL ramps): pale gallery mint, kitchen sage.
  const MINT = ['#e4f7ee', '#c6ecd9'];
  const SAGE = ['#eef5de', '#d3e6b8', '#b0cc93', '#7fa36f'];

  // ---------- helpers ----------
  const bake = fn => { const [c, x] = canvas(W, H); fn(x); return c; };

  // Sky: stepped bands, each join feathered by a zipper of long streaks (no per-pixel dither).
  function skyBands(x, y, list, seed = 1) {
    const r = rng(seed);
    list.forEach(([c, n], i) => {
      rect(x, 0, y, W, n, c);
      if (i) {
        const up = list[i - 1][0];
        for (let k = -Math.floor(r() * 9); k < W;) { const len = 4 + Math.floor(r() * 10); rect(x, k, y, len, 1, up); k += len + 2 + Math.floor(r() * 5); }
        for (let k = -Math.floor(r() * 9); k < W;) { const len = 2 + Math.floor(r() * 5); rect(x, k, y - 1, len, 1, c); k += len + 6 + Math.floor(r() * 9); }
      }
      y += n;
    });
    return y;
  }

  // Bevelled paving / flagstones: rows of slabs with a lit top-left edge and a joint on the bottom-right.
  function paving(x, y0, y1, rowH, seed, [hi, base, joint], alt) {
    const r = rng(seed);
    for (let y = y0; y < y1; y += rowH) {
      const h = Math.min(rowH, y1 - y);
      for (let px = -Math.floor(r() * 12); px < W;) {
        const w = 13 + Math.floor(r() * 7), a = alt && r() < 0.2;
        rect(x, px, y, w, h, a ? alt[1] : base);
        rect(x, px, y, w, 1, a ? alt[0] : hi); rect(x, px, y, 1, h, a ? alt[0] : hi);
        rect(x, px + w - 1, y, 1, h, joint); rect(x, px, y + h - 1, w, 1, joint);
        px += w;
      }
    }
  }

  // Floor planks running left-right: seams between rows, staggered butt joints, a rare grain streak.
  function planks(x, y0, y1, h, seed, [hi, base, seam]) {
    const r = rng(seed);
    rect(x, 0, y0, W, y1 - y0, base);
    for (let y = y0; y < y1; y += h) {
      rect(x, 0, y + h - 1, W, 1, seam);
      for (let px = Math.floor(r() * 36); px < W; px += 30 + Math.floor(r() * 28)) { rect(x, px, y, 1, h - 1, seam); rect(x, px + 1, y, 1, h - 1, hi); }
      if (r() < 0.6) rect(x, Math.floor(r() * W), y + 1 + Math.floor(r() * (h - 2)), 3 + Math.floor(r() * 3), 1, hi);
    }
  }

  // Leafy clump: dark rim, body, lit upper-left, small highlight (light from the top-left).
  function bush(x, cx, cy, rx, ry, [hi, lit, body, rim] = ['grass1', 'leaf2', 'leaf3', 'leaf4']) {
    ellipse(x, cx, cy, rx, ry, rim);
    ellipse(x, cx, cy, rx - 1, ry - 1, body);
    ellipse(x, cx - 2, cy - 2, Math.max(1, rx - 4), Math.max(1, ry - 3), lit);
    ellipse(x, cx - 3, cy - 3, Math.max(1, rx - 7), Math.max(0, ry - 5), hi);
  }
  // Flower cluster (2x2 with a lit pixel).
  const flower = (x, px, py, c, hi = 'white') => { rect(x, px, py, 2, 2, c); dot(x, px, py, hi); };

  // Material ramps: [hi, base, lo, outline].
  const WOOD = ['wood1', 'wood2', 'wood3', 'wood4'], GOLD = ['brass0', 'brass1', 'brass2', 'brass4'];

  // Shaded block: outline, fill, lit top+left, shaded bottom+right.
  function block(x, px, py, w, h, [hi, base, lo, out]) {
    rect(x, px, py, w, h, out);
    rect(x, px + 1, py + 1, w - 2, h - 2, base);
    rect(x, px + 1, py + 1, w - 2, 1, hi); rect(x, px + 1, py + 1, 1, h - 2, hi);
    rect(x, px + 2, py + h - 2, w - 3, 1, lo); rect(x, px + w - 2, py + 2, 1, h - 3, lo);
  }

  // Flat runner rug: edge, border, field, two inner stripes, fringe on the short ends.
  function runner(x, px, py, w, h, [edge, border, field, stripe], fringe) {
    rect(x, px, py, w, h, edge);
    rect(x, px + 1, py + 1, w - 2, h - 2, border);
    rect(x, px + 3, py + 2, w - 6, h - 4, field);
    rect(x, px + 6, py + 4, w - 12, 1, stripe); rect(x, px + 6, py + h - 5, w - 12, 1, stripe);
    for (let k = py + 1; k < py + h - 1; k += 2) { dot(x, px - 1, k, fringe); dot(x, px + w, k, fringe); }
  }

  // Book spines standing on a shelf whose top surface is at y.
  const SPINES = [['rose', 'red'], ['blue', 'roofB2'], ['cap1', 'cap2'], ['yellow', 'brass2'], ['lilac', 'dusk4'], ['roofG1', 'roofG2'], ['cream0', 'cream2'], ['roofR0', 'roofR1']];
  function books(x, x0, x1, y, seed, maxH = 9, spines = SPINES) {
    const r = rng(seed);
    for (let px = x0; ;) {
      const w = 2 + (r() < 0.4 ? 1 : 0), h = maxH - Math.floor(r() * 4), [lit, dark] = spines[Math.floor(r() * spines.length)];
      if (px + w > x1) break;
      rect(x, px, y - h, w, h, dark); rect(x, px, y - h, w - 1, h, lit); rect(x, px, y - h + 2, w, 1, dark);
      px += w + (r() < 0.12 ? 2 : 0);
    }
  }

  // Hard-edged slanted light: one translucent row per y, shifting by `slope` px per row.
  function shaft(x, x0, y0, y1, w, slope, c) { for (let y = y0; y < y1; y++) rect(x, Math.round(x0 + (y - y0) * slope), y, w, 1, c); }

  // Run fn clipped to an integer rect.
  function clip(x, px, py, w, h, fn) { x.save(); x.beginPath(); x.rect(px, py, w, h); x.clip(); fn(); x.restore(); }

  // Additive light: flat, hard-edged shapes that brighten what lies under them instead of greying it.
  function lit(x, fn) { const o = x.globalCompositeOperation; x.globalCompositeOperation = 'lighter'; fn(); x.globalCompositeOperation = o; }

  // Picture frame: moulding with lit/shaded sides and an inner lip around pic(gx, gy, gw, gh).
  function frame(x, px, py, w, h, ramp, pic, wallShade) {
    if (wallShade) { rect(x, px + 1, py + h, w, 1, wallShade); rect(x, px + w, py + 1, 1, h, wallShade); }
    block(x, px, py, w, h, ramp);
    rect(x, px + 2, py + 2, w - 4, h - 4, ramp[3]);
    clip(x, px + 3, py + 3, w - 6, h - 6, () => pic(px + 3, py + 3, w - 6, h - 6));
  }

  // Draw img with a slight clockwise tilt: each column steps down 1px every `every` columns.
  function tilted(x, img, px, py, every) {
    for (let c = 0; c < img.width; c++) x.drawImage(img, c, 0, 1, img.height, px + c, py + Math.floor(c / every), 1, img.height);
  }

  // Small props drawn from ASCII; `out` adds a 1px outline in the material's darkest colour.
  const spr = (rows, key, out) => (out ? PX.outline(sprite(rows, key), out) : sprite(rows, key));
  const put = (x, img, px, bottom) => x.drawImage(img, px, bottom - img.height);

  // ---------- scene factory ----------
  // layers: plain functions are static and baked once; { add: fn } is baked static light drawn additively;
  // { live(x, t, still) } runs per frame; { sort: [[feetY, fn], ...] } bakes props that are depth-sorted
  // with the actors; 'glow' is the memory light.
  function scene(bg, anchors, layers) {
    const L = layers.map(l =>
      typeof l === 'function' ? { img: bake(l) } :
      l === 'glow' ? { glow: true } :
      l.add ? { img: bake(l.add), add: true } :
      l.sort ? { sort: l.sort.map(([y, fn]) => ({ y, img: bake(fn), prop: true })) } : l);
    if (!L.some(l => l.sort)) L.push({ sort: [] });
    return {
      w: W, h: H, bg, anchors,
      draw(ctx, view, actors = []) {
        const st = view.state || {}, still = !!st.still, t = still ? 0 : +view.t || 0;
        for (const l of L) {
          if (l.add) lit(ctx, () => ctx.drawImage(l.img, 0, 0));
          else if (l.img) ctx.drawImage(l.img, 0, 0);
          else if (l.live) l.live(ctx, t, still);
          else if (l.glow) memoryGlow(ctx, anchors.item, +st.glow || 0, t, still);
          else for (const it of l.sort.concat(actors).sort((p, q) => p.y - q.y)) it.prop ? ctx.drawImage(it.img, 0, 0) : it.draw(ctx);
        }
      },
    };
  }

  // Memory light: stepped, hard-edged warm bands (additive) that grow with g, plus a few rising motes.
  // Each band adds a little on top of the ones outside it: cumulative lift 0.05 / 0.09 / 0.13 / 0.18.
  const GLOW = ['rgba(255,190,100,0.05)', 'rgba(255,206,120,0.04)', 'rgba(255,224,150,0.04)', 'rgba(255,240,190,0.05)'];
  function memoryGlow(x, [cx, cy], g, t, still) {
    if (!(g > 0)) return;
    const s = Math.ceil(Math.min(1, g) * 8) / 8, R = 5 + Math.round(s * 39);
    const b = still ? 0 : [0, 1, 1, 0][Math.floor(t * 3) % 4];
    lit(x, () => [1, 0.72, 0.48, 0.26].forEach((k, i) => {
      const r = Math.max(1, Math.round(R * k) + b);
      ellipse(x, cx, cy, r, Math.max(1, Math.round(r * 0.8)), GLOW[i]);
    }));
    const T = still ? 0.4 : Math.floor(t * 8) / 8;
    for (let i = 0, n = Math.round(s * 7); i < n; i++) {
      const p = (T * 0.22 + i * 0.382) % 1;
      const mx = cx + Math.round(Math.sin(i * 2.4) * R * 0.55 + Math.sin(p * 6.28 + i) * 2);
      const my = cy + Math.round(R * 0.35 - p * R * 0.9);
      if (p > 0.2 && p < 0.7) { rect(x, mx - 1, my, 3, 1, 'light1'); rect(x, mx, my - 1, 1, 3, 'light1'); dot(x, mx, my, 'light0'); }
      else dot(x, mx, my, p < 0.9 ? 'light1' : 'light2');
    }
  }

  // ---------- 1. station: an old platform at pastel dusk ----------
  function station() {
    const anchors = { a: [44, 82], b: [116, 82], item: [80, 60] };
    const LX = 18, LY = 17;                                  // lamp glass centre

    const sky = x => {
      skyBands(x, 0, [['dusk4', 5], ['dusk3', 10], ['dusk2', 10], ['dusk1', 9], ['dusk0', 12]], 5);
      ellipse(x, 100, 41, 13, 13, 'dusk0');
      ellipse(x, 100, 41, 9, 9, 'light0');
      rect(x, 86, 36, 28, 1, 'dusk1'); rect(x, 94, 38, 16, 1, 'dusk0');
    };

    // [x, y, w, top, body, underside]: sunset clouds, lit from below
    const CLOUDS = [[8, 9, 42, 'dusk4', 'dusk2', 'dusk1'], [98, 19, 34, 'dusk3', 'dusk1', 'dusk0'], [44, 27, 22, 'dusk2', 'dusk0', 'light0']];
    const skyLife = (x, t, still) => {
      const s = still ? 0 : Math.floor(t / 1.5);
      for (const [cx0, cy, w, top, body, under] of CLOUDS) {
        const cx = ((cx0 + s) % (W + w)) - (w >> 1);
        rect(x, cx + 7, cy - 2, w >> 2, 1, top); rect(x, cx + 3, cy - 1, w - 12, 1, top);
        rect(x, cx, cy, w, 1, body); rect(x, cx + 2, cy + 1, w - 4, 1, under); rect(x, cx + 8, cy + 2, w >> 1, 1, under);
      }
      const f = still ? 0 : Math.floor(t * 6);
      for (const [sx, sy, ph] of [[136, 2, 0], [22, 2, 17], [66, 3, 31]]) {
        dot(x, sx, sy, 'light0');
        if ((f + ph) % 40 < 4) { dot(x, sx - 1, sy, 'dusk0'); dot(x, sx + 1, sy, 'dusk0'); dot(x, sx, sy + 1, 'dusk0'); }
      }
    };

    const land = x => {
      // far hills with rose rims, a small village with lit windows
      const hills = [[4, 20, 6], [36, 24, 9], [72, 20, 4], [132, 28, 8], [162, 16, 6]];
      for (const [cx, rx, ry] of hills) ellipse(x, cx, 44, rx, ry, 'dusk3');
      for (const [cx, rx, ry] of hills) ellipse(x, cx + 1, 45, rx, ry, 'dusk4');
      rect(x, 0, 44, W, 8, 'dusk4');
      const house = sprite(['..d..', '.ddd.', 'ddddd', '.dld.', '.ddd.'], { d: 'dusk5', l: 'light1' });
      for (const [hx, hy] of [[24, 35], [30, 33], [37, 35], [126, 37], [135, 36]]) x.drawImage(house, hx, hy);
      rect(x, 45, 29, 1, 3, 'dusk5'); rect(x, 44, 32, 3, 6, 'dusk5'); dot(x, 45, 34, 'light1');
      for (const [tx, ty, r2] of [[12, 40, 2], [16, 41, 1], [55, 39, 2], [150, 40, 2], [146, 41, 1]]) ellipse(x, tx, ty, r2, r2 + 1, 'dusk5');
      // hedge of rose bushes and two garden trees behind the fence
      bush(x, 58, 36, 11, 9); bush(x, 50, 41, 7, 6);
      bush(x, 104, 38, 9, 8);
      rect(x, 0, 50, W, 8, 'leaf3');
      for (const [cx, cy, rx, ry] of [[4, 47, 9, 6], [19, 45, 8, 7], [31, 49, 6, 4], [42, 46, 10, 6], [66, 48, 9, 5], [80, 46, 7, 6],
        [93, 49, 10, 5], [112, 46, 8, 6], [124, 48, 7, 5], [137, 45, 11, 7], [154, 48, 9, 6]]) bush(x, cx, cy, rx, ry);
      for (const [fx, fy, c] of [[14, 42, 'pink'], [17, 44, 'rose'], [38, 43, 'pink'], [41, 45, 'white'], [52, 37, 'pink'], [62, 33, 'rose'],
        [98, 36, 'pink'], [108, 44, 'rose'], [110, 42, 'pink'], [133, 42, 'pink'], [136, 44, 'rose'], [140, 41, 'white']]) flower(x, fx, fy, c, c === 'white' ? 'yellow' : 'white');
      // white picket fence
      for (const ry of [50, 55]) { rect(x, 0, ry, W, 1, 'stone1'); rect(x, 0, ry + 1, W, 1, 'stone2'); }
      for (let px = 1; px < W; px += 5) {
        if (px % 40 === 36) continue;
        dot(x, px + 1, 46, 'cream0'); rect(x, px, 47, 3, 11, 'cream1'); rect(x, px, 47, 1, 11, 'white'); rect(x, px + 2, 48, 1, 10, 'stone1');
      }
      for (let px = 35; px < W; px += 40) { rect(x, px, 43, 5, 15, 'stone1'); rect(x, px, 44, 4, 14, 'cream0'); rect(x, px + 4, 44, 1, 14, 'stone2'); rect(x, px - 1, 43, 7, 2, 'white'); rect(x, px - 1, 44, 7, 1, 'stone1'); }
      // platform paving, coping stones, a hint of rails
      paving(x, 58, 84, 7, 3, ['stone0', 'stone1', 'stone2'], ['white', 'stone0']);
      rect(x, 0, 58, W, 1, 'stone2');
      rect(x, 0, 84, W, 3, 'wall1'); rect(x, 0, 84, W, 1, 'wall0');
      for (let k = 7; k < W; k += 14) { rect(x, k, 84, 1, 3, 'wall3'); dot(x, k + 1, 85, 'wall0'); }
      rect(x, 0, 87, W, 1, 'wall2'); rect(x, 0, 88, W, 1, 'wall3'); rect(x, 0, 89, W, 1, 'stone4');
      rect(x, 0, 90, W, 6, 'stone2');
      for (let i = 0; i < 34; i++) rect(x, (i * 37 + 5) % W, 90 + (i * 5) % 6, 2 + (i % 2), 1, i % 3 ? 'stone1' : 'stone3');
      for (let k = 2; k < W; k += 11) { rect(x, k, 90, 6, 6, 'wood4'); rect(x, k, 90, 5, 5, 'wood3'); rect(x, k, 90, 5, 1, 'wood2'); }
      rect(x, 0, 92, W, 1, 'iron0'); rect(x, 0, 93, W, 1, 'iron2'); rect(x, 0, 94, W, 1, 'iron4');
      // fallen petals
      for (const [px, py] of [[58, 80], [101, 63], [30, 67], [138, 78]]) { rect(x, px, py, 2, 1, 'pink'); dot(x, px + 1, py - 1, 'rose'); }
      // timetable board under a little gable roof
      for (const px of [131, 151]) { shadow(x, px + 1, 69, 3, 1); rect(x, px - 1, 38, 4, 31, 'wood4'); rect(x, px, 38, 1, 30, 'wood1'); rect(x, px + 1, 38, 1, 30, 'wood2'); }
      const gable = [[139, 5], [135, 13], [131, 21], [127, 29], [125, 33]];
      gable.forEach(([rx, rw], i) => rect(x, rx - 1, 14 + i, rw + 2, 2, 'roofR4'));
      gable.forEach(([rx, rw], i) => { rect(x, rx, 15 + i, rw, 1, i < 3 ? 'roofR1' : 'roofR2'); rect(x, rx, 15 + i, Math.min(rw, 5), 1, 'roofR0'); });
      for (const [sx, sy] of [[134, 18], [142, 17], [148, 18], [138, 19], [152, 19]]) rect(x, sx, sy, 2, 1, 'roofR3');
      rect(x, 124, 20, 35, 1, 'roofR4');
      rect(x, 127, 21, 29, 19, 'wood4'); rect(x, 128, 21, 27, 18, 'wood2'); rect(x, 128, 21, 27, 1, 'wood1'); rect(x, 128, 22, 1, 17, 'wood1');
      rect(x, 130, 23, 23, 14, 'roofG3'); rect(x, 130, 23, 23, 1, 'roofG4');
      text(x, '18:17', 133, 26, 'light1');
      rect(x, 133, 33, 5, 1, 'roofG1'); rect(x, 140, 33, 10, 1, 'roofG2');
      rect(x, 133, 35, 5, 1, 'roofG1'); rect(x, 140, 35, 7, 1, 'roofG2');
    };

    const bench = x => {
      const X = 62;
      shadow(x, 80, 74, 19, 2);
      for (const ix of [X + 1, X + 33]) { rect(x, ix, 53, 3, 17, 'roofG4'); rect(x, ix + 1, 54, 1, 15, 'roofG1'); }
      for (const sy of [55, 59]) { rect(x, X + 1, sy, 35, 3, 'wood4'); rect(x, X + 2, sy, 33, 1, 'wood0'); rect(x, X + 2, sy + 1, 33, 1, 'wood2'); }
      rect(x, X, 63, 37, 6, 'wood4');
      rect(x, X + 1, 63, 35, 1, 'wood2'); rect(x, X + 1, 64, 35, 1, 'wood1'); rect(x, X + 1, 65, 35, 1, 'wood0');
      rect(x, X + 1, 66, 35, 1, 'wood1'); rect(x, X + 1, 67, 35, 1, 'wood3');
      for (const [ix, d] of [[X + 1, -1], [X + 33, 1]]) {
        rect(x, ix, 69, 3, 5, 'roofG4'); rect(x, ix + 1, 69, 1, 4, 'roofG2');
        rect(x, ix + d, 73, 3, 1, 'roofG4');
      }
    };

    const lamp = x => {
      shadow(x, LX + 1, 78, 7, 2);
      rect(x, LX - 4, 70, 9, 9, 'roofG4'); rect(x, LX - 3, 71, 7, 7, 'roofG2');
      rect(x, LX - 3, 71, 7, 1, 'roofG1'); rect(x, LX - 3, 71, 1, 7, 'roofG1'); rect(x, LX + 3, 72, 1, 6, 'roofG3');
      rect(x, LX - 2, 67, 5, 3, 'roofG4'); rect(x, LX - 1, 68, 3, 1, 'roofG1');
      rect(x, LX - 1, 22, 4, 46, 'roofG4'); rect(x, LX, 22, 1, 46, 'roofG1'); rect(x, LX + 1, 22, 1, 46, 'roofG2');
      for (const cy of [44, 58]) { rect(x, LX - 2, cy, 6, 3, 'roofG4'); rect(x, LX - 1, cy + 1, 4, 1, 'roofG1'); }
      rect(x, LX - 6, 24, 14, 3, 'roofG4'); rect(x, LX - 5, 25, 12, 1, 'roofG2');
      rect(x, LX - 7, 23, 2, 2, 'roofG4'); rect(x, LX + 7, 23, 2, 2, 'roofG4');
      // hanging flower basket
      rect(x, LX - 6, 27, 1, 3, 'iron3');
      rect(x, LX - 9, 31, 7, 3, 'wood4'); rect(x, LX - 8, 31, 5, 1, 'wood2'); rect(x, LX - 7, 34, 3, 1, 'wood4');
      rect(x, LX - 9, 29, 3, 2, 'rose'); rect(x, LX - 6, 28, 3, 2, 'pink'); dot(x, LX - 5, 28, 'white'); dot(x, LX - 8, 29, 'pink');
      rect(x, LX - 10, 32, 1, 3, 'leaf3'); rect(x, LX - 3, 32, 1, 4, 'leaf3'); dot(x, LX - 2, 35, 'leaf2');
      x.drawImage(sprite([
        '....o....',
        '...ogo...',
        '..oghgo..',
        '.oghggso.',
        'ooooooooo',
        '.o10001o.',
        '.o10001o.',
        '.o10001o.',
        '.o11011o.',
        '.o12221o.',
        'ooooooooo',
        '..ogggo..',
        '...ogo...',
      ], { o: 'roofG4', g: 'roofG2', h: 'roofG1', s: 'roofG3', 0: 'light0', 1: 'light1', 2: 'light2' }), LX - 4, LY - 7);
    };

    const planter = x => {
      shadow(x, 148, 82, 9, 2);
      block(x, 140, 71, 16, 11, WOOD);
      rect(x, 141, 74, 14, 1, 'iron2'); rect(x, 141, 78, 14, 1, 'iron2');
      bush(x, 147, 69, 8, 4); bush(x, 152, 68, 4, 3);
      for (const [fx, fy, c] of [[142, 66, 'pink'], [146, 64, 'rose'], [150, 66, 'white'], [153, 64, 'pink']]) flower(x, fx, fy, c, c === 'white' ? 'yellow' : 'white');
    };

    const FLICK = [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1];
    const lampPool = (x, t, still) => {
      const on = still ? 1 : FLICK[Math.floor(t * 8) % 16];
      ellipse(x, LX + 1, 79, 23 + on, 6, 'rgba(255,236,150,0.28)');
      ellipse(x, LX + 1, 79, 14 + on, 4, 'rgba(255,244,190,0.30)');
    };
    const moth = [sprite(['cc.cc', '.cbc.', '..b..'], { c: 'cream0', b: 'wood3' }), sprite(['.....', 'ccbcc', '.c.c.'], { c: 'cream0', b: 'wood3' })];
    const lampFront = (x, t, still) => {
      const f = still ? 0 : Math.floor(t * 8), on = still ? 1 : FLICK[f % 16];
      ellipse(x, LX, LY, 10 + on, 10 + on, 'rgba(255,236,150,0.24)');
      ellipse(x, LX, LY, 6 + on, 6 + on, 'rgba(255,251,230,0.28)');
      if (!on) rect(x, LX - 1, LY - 2, 3, 3, 'light1');
      const k = still ? 0.6 : Math.floor(t * 10) / 10;
      const mx = LX + Math.round(Math.sin(k * 1.7) * 8), my = LY + 1 + Math.round(Math.sin(k * 2.9 + 1) * 5);
      x.drawImage(moth[still ? 0 : Math.floor(t * 12) % 2], mx - 2, my - 1);
    };

    return scene('#fff0cf', anchors, [sky, { live: skyLife }, land, { live: lampPool }, { sort: [[74, bench], [78, lamp], [82, planter]] }, 'glow', { live: lampFront }]);
  }

  // ---------- 2. toyshop: a toymaker's cozy corner, honey and amber ----------
  function toyshop() {
    const anchors = { a: [42, 86], b: [118, 86], c: [141, 90], item: [80, 53] };

    const T = {
      teddy: spr(['bb...bb', 'bBbbbBb', '.bkbkb.', '.bbmbb.', '..bbb..', '.bbBbb.', 'bbBBBbb', '.bb.bb.'], { b: 'wood2', B: 'wood1', k: 'ink', m: 'cream1' }, 'wood4'),
      boat: spr(['...w...', '...wW..', '...wwW.', '...wwwW', '...m...', 'rrrrrrr', '.RRRRR.'], { w: 'white', W: 'cream2', m: 'wood3', r: 'blue', R: 'roofB2' }, 'roofB4'),
      ball: spr(['.rrr.', 'rhrrR', 'wwwww', 'rrrRR', '.RRR.'], { r: 'red', h: 'roofR0', R: 'roofR3', w: 'white' }, 'roofR4'),
      train: spr(['.......RRR.....', 'yyyy...rwr..cc.', 'yyyy.rrrrrrrrr.', 'YYYY-rrrrrrrrrr', '.k.k..kk...kk..'],
        { y: 'yellow', Y: 'brass2', R: 'roofR3', r: 'red', w: 'light1', c: 'iron3', k: 'ink2', '-': 'iron3' }, 'roofR4'),
      blocks: spr(['hhhh.gggg.', 'bbbbsGGGGs', 'bwbbsGwGGs', 'bbbbsGGGGs', '....dddd..', '..jjjj....', '..JJJJt...', '..JwJJt...', '..JJJJt...'],
        { h: 'roofR0', b: 'red', s: 'roofR3', w: 'white', g: 'sky2', G: 'blue', d: 'roofB2', j: 'light1', J: 'yellow', t: 'brass2' }, 'wood4'),
      duck: spr(['....yy.', '...yyko', 'y..yyy.', 'yyyyyy.', '.YYYYY.', '.k...k.'], { y: 'yellow', Y: 'brass2', k: 'ink2', o: 'orange' }, 'brass4'),
      drum: spr(['.cccc.', 'cccccc', 'rzrzrz', 'zrzrzr', 'rrrrrr', '.RRRR.'], { c: 'cream0', r: 'red', z: 'yellow', R: 'roofR3' }, 'roofR4'),
      top: spr(['..s..', '.aaa.', 'bbbbb', 'aaaaa', '.bbb.', '..s..'], { s: 'wood3', a: 'roofG1', b: 'yellow' }, 'roofG4'),
      horse: spr([
        '...............e......',
        '..............hHH.....',
        '.............mhHHHH...',
        '.............mHHkHHH..',
        '............mmHHHHHHn.',
        '............mHHHHHdHd.',
        '.tt.........mHHHH.dd..',
        'tTtt....rrr.mHHHd.....',
        't..t..rrRRrrHHHHd.....',
        '...tHHHrRRrHHHHHd.....',
        '....HHHHrrHHHHHHd.....',
        '....HHHHHHHHHHHdd.....',
        '....dHHHHHHHHHHd......',
        '.....dddddddddd.......',
        '.....Hd......Hd.......',
        'w....Hd......Hd.....w.',
        'ww...Wd......WdW...ww.',
        '.wwwwWWWWWWWWWWWwwww..',
        '...wwwwwwwwwwwwww.....',
      ], { e: 'cream2', h: 'cream0', H: 'cream1', d: 'cream2', k: 'ink2', n: 'cream2', m: 'brass2', t: 'brass2', T: 'brass1',
        r: 'red', R: 'roofR3', w: 'wood1', W: 'wood2' }, 'wood4'),
      spool: c => spr(['abbba', '.rrs.', '.rrs.', '.rrs.', '.rrs.', 'abbba'], { a: 'wood2', b: 'wood0', r: c[0], s: c[1] }, 'wood4'),
      pins: spr(['..y..', '..g..', '.hgr.', 'hrrrR', 'rrrRR', '.RRR.'], { y: 'yellow', g: 'cap2', h: 'roofR0', r: 'red', R: 'roofR3' }, 'roofR4'),
      scissors: spr(['ii.......', '.ii...rr.', '..iiLr..r', '..IILr..r', '.II...rr.', 'II.......'], { r: 'rose', L: 'iron3', i: 'iron0', I: 'iron1' }),
      car: spr(['..hhh...', '.hbwbb..', 'hbbbbbbs', 'bbbbbbbs', '.k...k..'], { h: 'wood0', b: 'wood1', s: 'wood2', w: 'sky1', k: 'ink2' }, 'wood4'),
      star: spr(['..y..', '.yyy.', 'yyyyy', '.yyy.', '.y.y.'], { y: 'yellow' }, 'brass3'),
      moon: spr(['.cc.', 'cc..', 'cc..', 'cc..', '.cc.'], { c: 'cream0' }, 'wood3'),
      bird: spr(['.bb..', 'bbbbk', '..bb.'], { b: 'blue', k: 'orange' }, 'roofB3'),
    };

    const room = x => {
      // wall: warm cream with tone-on-tone diamonds, a ceiling beam
      rect(x, 0, 0, W, 56, 'wall1');
      for (let row = 0, y = 11; y < 40; y += 8, row++) for (let px = 5 + (row & 1) * 6; px < W; px += 12) { dot(x, px, y - 1, 'wall2'); rect(x, px - 1, y, 3, 1, 'wall2'); dot(x, px, y + 1, 'wall2'); }
      rect(x, 0, 0, W, 5, 'wood3'); rect(x, 0, 0, W, 1, 'wood2'); rect(x, 0, 4, W, 1, 'wood4'); rect(x, 0, 5, W, 1, 'wall2');
      // painted mint wainscot and skirting
      rect(x, 0, 42, W, 14, 'roofG0');
      rect(x, 0, 42, W, 1, 'white'); rect(x, 0, 45, W, 1, 'roofG1');
      for (let px = 3; px < W; px += 16) { rect(x, px, 47, 12, 1, 'roofG1'); rect(x, px, 47, 1, 5, 'roofG1'); rect(x, px + 1, 51, 11, 1, 'cream0'); }
      rect(x, 0, 53, W, 3, 'roofG2'); rect(x, 0, 53, W, 1, 'roofG1');
      // floor: light honey planks, a periwinkle rug
      planks(x, 56, 96, 5, 21, ['dirt0', 'wood0', 'wood1']);
      rect(x, 0, 56, W, 1, 'wood2');
      ellipse(x, 80, 83, 60, 11, 'roofB3'); ellipse(x, 80, 83, 59, 10, 'cream1'); ellipse(x, 80, 83, 56, 9, 'roofB1');
      ellipse(x, 80, 83, 46, 6, 'roofB0'); ellipse(x, 80, 83, 44, 5, 'roofB1'); ellipse(x, 80, 83, 16, 2, 'roofB0');
      for (const fx of [18, 19, 141, 142]) rect(x, fx, 81, 1, 5, 'cream1');
      // window with a sunny garden view, pink drapes on a brass rod
      rect(x, 59, 7, 42, 32, 'wood4'); rect(x, 60, 8, 40, 30, 'wood2'); rect(x, 60, 8, 40, 1, 'wood1'); rect(x, 60, 8, 1, 30, 'wood1');
      clip(x, 63, 11, 34, 24, () => {
        rect(x, 63, 11, 34, 24, 'sky1'); rect(x, 63, 11, 34, 7, 'sky2');
        ellipse(x, 69, 15, 4, 4, 'sky0'); ellipse(x, 69, 15, 2, 2, 'light0');
        ellipse(x, 80, 38, 24, 7, 'grass1'); ellipse(x, 92, 29, 7, 6, 'leaf3'); ellipse(x, 91, 28, 5, 4, 'leaf2'); ellipse(x, 90, 27, 2, 2, 'grass1');
        rect(x, 66, 28, 9, 7, 'wall0'); rect(x, 65, 26, 11, 2, 'roofR1'); rect(x, 66, 25, 9, 1, 'roofR0'); rect(x, 69, 30, 3, 3, 'light2');
      });
      rect(x, 79, 11, 2, 24, 'wood2'); rect(x, 63, 22, 34, 2, 'wood2'); rect(x, 79, 11, 1, 24, 'wood1');
      for (const [gx, gy] of [[65, 13], [83, 13]]) { dot(x, gx + 3, gy, 'white'); dot(x, gx + 2, gy + 1, 'white'); dot(x, gx + 1, gy + 2, 'white'); dot(x, gx + 6, gy, 'sky0'); dot(x, gx + 5, gy + 1, 'sky0'); }
      rect(x, 56, 38, 48, 3, 'wood4'); rect(x, 57, 38, 46, 1, 'wood0'); rect(x, 57, 39, 46, 1, 'wood2');
      rect(x, 52, 6, 56, 1, 'brass2'); rect(x, 51, 5, 2, 3, 'brass3'); rect(x, 107, 5, 2, 3, 'brass3');
      for (const [dx, dir] of [[53, 1], [101, -1]]) {
        rect(x, dx, 7, 6, 20, 'pink'); rect(x, dx + (dir > 0 ? 0 : 5), 7, 1, 20, dir > 0 ? 'white' : 'rose');
        rect(x, dx + 2, 8, 1, 18, 'rose'); rect(x, dx + 1, 26, 4, 2, 'yellow');
        rect(x, dx + (dir > 0 ? 0 : 1), 28, 5, 8, 'pink'); rect(x, dx + (dir > 0 ? 0 : 1), 36, 6, 3, 'pink'); rect(x, dx + 2, 29, 1, 9, 'rose');
      }
      // pegboard of tools (left wall)
      block(x, 5, 11, 27, 26, ['dirt0', 'dirt1', 'dirt2', 'wood3']);
      for (let hy = 15; hy < 35; hy += 4) for (let hx = 9; hx < 30; hx += 4) dot(x, hx, hy, 'dirt3');
      rect(x, 10, 17, 1, 12, 'wood2'); rect(x, 8, 15, 5, 3, 'iron3'); rect(x, 8, 15, 5, 1, 'iron1');
      for (let i = 0; i < 9; i++) rect(x, 15 + (i >> 1), 16 + i, 5 - (i >> 1), 1, i & 1 ? 'iron1' : 'iron0');
      rect(x, 15, 15, 5, 2, 'wood2');
      rect(x, 27, 14, 2, 20, 'yellow'); for (let my = 16; my < 33; my += 3) dot(x, 27, my, 'brass3');
      ellipse(x, 21, 30, 3, 3, 'rose'); ellipse(x, 21, 30, 1, 1, 'wood1'); dot(x, 19, 28, 'pink');
      // toy shelves (right wall)
      rect(x, 121, 6, 39, 51, 'wood4'); rect(x, 123, 8, 35, 48, 'wall3'); rect(x, 123, 8, 35, 1, 'wall4');
      rect(x, 122, 7, 2, 49, 'wood1'); rect(x, 157, 7, 2, 49, 'wood3'); rect(x, 121, 5, 39, 3, 'wood2'); rect(x, 121, 5, 39, 1, 'wood1');
      for (const sy of [22, 36, 50]) { rect(x, 122, sy, 37, 3, 'wood4'); rect(x, 123, sy, 35, 1, 'wood1'); rect(x, 123, sy + 1, 35, 1, 'wood2'); rect(x, 123, sy + 3, 35, 1, 'wall4'); }
      put(x, T.teddy, 125, 23); put(x, T.boat, 136, 23); put(x, T.ball, 148, 23);
      put(x, T.train, 124, 37); put(x, T.blocks, 144, 37);
      put(x, T.duck, 125, 51); put(x, T.drum, 136, 51); put(x, T.top, 148, 51);
    };

    const bench = x => {
      shadow(x, 80, 76, 30, 3);
      for (const lx of [54, 102]) { rect(x, lx, 64, 4, 12, 'wood4'); rect(x, lx + 1, 64, 2, 11, 'wood2'); rect(x, lx + 1, 64, 1, 11, 'wood1'); }
      rect(x, 57, 70, 46, 3, 'wood4'); rect(x, 57, 71, 46, 1, 'wood3');
      rect(x, 51, 56, 58, 9, 'wood4');
      rect(x, 52, 57, 56, 3, 'wood1'); rect(x, 52, 57, 56, 1, 'wood0'); rect(x, 52, 60, 56, 1, 'wood0');
      rect(x, 52, 61, 56, 3, 'wood2'); rect(x, 52, 63, 56, 1, 'wood3');
      block(x, 72, 61, 16, 4, WOOD); rect(x, 79, 62, 2, 1, 'brass1');
      [['rose', 'red'], ['roofG1', 'roofG2'], ['yellow', 'orange']].forEach((c, i) => put(x, T.spool(c), 52 + i * 6, 61));
      put(x, T.pins, 70, 61); put(x, T.scissors, 89, 60); put(x, T.car, 99, 61);
    };

    const LIFT = [0, 1, 1, 0, 0, -1, -1, 0];
    const life = (x, t, still) => {
      // hanging mobile: a tilting bar with a star, a moon and a bird
      const f = still ? 0 : Math.floor(t * 6), s = still ? 0 : LIFT[f % 8];
      rect(x, 40, 5, 1, 6, 'wood4');
      rect(x, 32, 11 - s, 5, 1, 'wood3'); rect(x, 37, 11, 7, 1, 'wood3'); rect(x, 44, 11 + s, 5, 1, 'wood3');
      [[33, 4, T.star, -s], [40, 8, T.moon, 0], [47, 5, T.bird, s]].forEach(([cx, len, img, dy], i) => {
        const sw = still ? 0 : LIFT[(f + 2 + i * 3) % 8];
        rect(x, cx, 12 + dy, 1, len, 'wood4');
        x.drawImage(img, cx + sw - (img.width >> 1), 12 + dy + len);
      });
      // light motes drifting in the window light
      const k = still ? 0.8 : Math.floor(t * 8) / 8;
      for (let i = 0; i < 7; i++) {
        const p = (k * 0.09 + i * 0.143) % 1;
        const mx = 76 + i * 7 + Math.round(p * 14 + Math.sin(k * 0.9 + i * 2) * 2), my = 40 + Math.round(p * 34);
        dot(x, mx, my, i % 3 ? 'light0' : 'light1');
        if (i % 3 === 0) dot(x, mx + 1, my, 'light1');
      }
    };

    const horse = x => { shadow(x, 16, 84, 11, 2); x.drawImage(T.horse, 4, 64); };

    return scene('#fff0d4', anchors, [room, { sort: [[76, bench], [84, horse]] }, 'glow', { live: life }]);
  }

  // ---------- 3. darkroom: a small museum wall and a photo corner, mint and coral ----------
  function darkroom() {
    const anchors = { a: [42, 86], b: [118, 86], c: [142, 90], item: [80, 55] };
    const SAFE = ['rgba(255,90,90,0.10)', 'rgba(255,120,130,0.14)'];

    const room = x => {
      rect(x, 0, 0, W, 58, MINT[0]);
      rect(x, 0, 0, W, 2, MINT[1]);
      rect(x, 0, 6, W, 2, 'wood2'); rect(x, 0, 6, W, 1, 'wood1'); rect(x, 0, 8, W, 1, MINT[1]);
      rect(x, 0, 53, W, 5, 'cream0'); rect(x, 0, 53, W, 1, 'white'); rect(x, 0, 52, W, 1, MINT[1]); rect(x, 0, 57, W, 1, 'wall3');
      // floor: pale sand planks, a teal runner
      planks(x, 58, 96, 5, 33, ['dirt0', 'dirt1', 'dirt2']);
      rect(x, 0, 58, W, 1, 'dirt3');
      runner(x, 20, 74, 120, 18, ['roofG3', 'cream1', 'roofG1', 'roofG0'], 'cream1');
      for (let k = 30; k < 134; k += 12) { rect(x, k - 1, 83, 3, 1, 'roofG0'); dot(x, k, 82, 'roofG0'); dot(x, k, 84, 'roofG0'); }
      // hanging wires from the picture rail
      for (const [wx0, wx1, wy] of [[80, 64, 13], [80, 96, 13], [19, 13, 13], [19, 25, 13]]) line(x, wx0, 8, wx1, wy, 'iron2');
      // big centre photograph: a sunny meadow, two friends under a tree
      frame(x, 58, 13, 45, 29, GOLD, (gx, gy, gw, gh) => {
        rect(x, gx, gy, gw, gh, 'cream0');
        const px = gx + 2, py = gy + 2, pw = gw - 4, ph = gh - 4;
        rect(x, px, py, pw, ph, 'sky2'); rect(x, px, py + 7, pw, 4, 'sky1');
        ellipse(x, px + 7, py + 5, 3, 3, 'light0');
        ellipse(x, px + 12, py + ph + 3, 22, 7, 'grass1'); ellipse(x, px + 30, py + ph + 4, 18, 6, 'grass2');
        rect(x, px + 26, py + 8, 2, 8, 'wood3');
        bush(x, px + 27, py + 7, 7, 5);
        rect(x, px + 20, py + 13, 2, 3, 'ant2'); dot(x, px + 20, py + 12, 'ant3'); rect(x, px + 23, py + 13, 2, 3, 'ant1'); dot(x, px + 24, py + 12, 'ant3');
        for (const [fx, fy] of [[4, 16], [9, 18], [14, 15], [33, 17]]) dot(x, px + fx, py + fy, 'pink');
      }, MINT[1]);
      rect(x, 72, 44, 17, 5, 'cream0'); rect(x, 72, 44, 17, 1, 'white'); rect(x, 74, 46, 9, 1, 'cream2'); rect(x, 74, 47, 6, 1, 'cream2');
      // two smaller frames on the left: mountains by a lake, a portrait
      frame(x, 8, 13, 23, 17, WOOD, (gx, gy, gw, gh) => {
        rect(x, gx, gy, gw, gh, 'sky1'); rect(x, gx, gy + gh - 4, gw, 4, 'water2'); rect(x, gx, gy + gh - 4, gw, 1, 'water1');
        for (const [mx, mh] of [[4, 6], [10, 8], [15, 5]]) for (let i = 0; i < mh; i++) rect(x, gx + mx - i, gy + gh - 4 - mh + i, 2 * i + 1, 1, i < 2 ? 'white' : 'dusk4');
      }, MINT[1]);
      frame(x, 13, 33, 13, 15, ['roofR0', 'roofR1', 'roofR2', 'roofR4'], (gx, gy, gw, gh) => {
        rect(x, gx, gy, gw, gh, 'dusk0'); ellipse(x, gx + 3, gy + 5, 2, 2, 'ant1'); rect(x, gx + 1, gy + 7, 5, 2, 'blue');
        dot(x, gx + 2, gy + 2, 'ink2'); dot(x, gx + 4, gy + 2, 'ink2'); dot(x, gx + 4, gy + 4, 'ink');
      }, MINT[1]);
      // a frame hung a touch crooked on its wire
      const [cf, cx] = canvas(15, 13);
      frame(cx, 0, 0, 15, 13, ['roofB0', 'roofB1', 'roofB2', 'roofB4'], (gx, gy, gw, gh) => {
        rect(cx, gx, gy, gw, gh, 'dusk1'); ellipse(cx, gx + 4, gy + gh, 5, 3, 'dusk3'); ellipse(cx, gx + 6, gy + 2, 1, 1, 'light0');
      });
      tilted(x, cf, 36, 16, 8);
      line(x, 43, 9, 38, 16, 'iron2'); line(x, 43, 9, 49, 17, 'iron2');
      // photo corner: shelf with trays and bottles; the safelight sits on it (its red dome is live)
      rect(x, 106, 36, 52, 3, 'wood4'); rect(x, 106, 36, 52, 1, 'wood1'); rect(x, 106, 37, 52, 1, 'wood2'); rect(x, 107, 39, 50, 1, MINT[1]);
      for (const bx of [110, 152]) { rect(x, bx, 39, 2, 5, 'wood3'); dot(x, bx + 1, 43, 'wood4'); }
      for (const [ty, c, d] of [[34, 'red', 'roofR3'], [32, 'white', 'cream2'], [30, 'iron1', 'iron2']]) { rect(x, 108, ty, 14, 2, c); rect(x, 108, ty + 1, 14, 1, d); }
      block(x, 125, 26, 5, 10, ['brass1', 'brass2', 'brass3', 'brass4']); rect(x, 126, 24, 3, 2, 'wood4'); rect(x, 126, 29, 3, 3, 'cream0');
      block(x, 131, 29, 5, 7, ['roofG0', 'roofG1', 'roofG2', 'roofG4']); rect(x, 132, 27, 3, 2, 'iron3');
      rect(x, 140, 33, 13, 3, 'iron4'); rect(x, 141, 33, 11, 1, 'iron1'); rect(x, 145, 20, 3, 3, 'iron3'); rect(x, 146, 19, 1, 1, 'iron3');
      // a frame leaning against the wall, waiting to be hung, and a hammer
      shadow(x, 146, 60, 12, 2);
      frame(x, 134, 41, 23, 19, WOOD, (gx, gy, gw, gh) => {
        rect(x, gx, gy, gw, gh, 'cream0'); rect(x, gx + 2, gy + 2, gw - 4, gh - 4, 'water1');
        rect(x, gx + 2, gy + 8, gw - 4, 3, 'water2'); rect(x, gx + 2, gy + 11, gw - 4, 2, 'dirt1');
        rect(x, gx + 11, gy + 3, 3, 6, 'white'); rect(x, gx + 11, gy + 5, 3, 1, 'red'); rect(x, gx + 11, gy + 7, 3, 1, 'red'); rect(x, gx + 11, gy + 2, 3, 1, 'light1');
      });
      rect(x, 121, 60, 8, 1, 'wood2'); rect(x, 121, 61, 8, 1, 'wood3'); rect(x, 128, 58, 3, 5, 'iron3'); rect(x, 128, 58, 3, 1, 'iron0');
    };

    const plinth = x => {
      shadow(x, 81, 78, 15, 3);
      rect(x, 67, 61, 27, 18, 'stone3');
      rect(x, 68, 62, 25, 3, 'white'); rect(x, 68, 64, 25, 1, 'stone0');
      rect(x, 68, 65, 25, 13, 'stone0'); rect(x, 68, 65, 1, 13, 'white'); rect(x, 88, 65, 5, 13, 'stone1'); rect(x, 68, 77, 25, 1, 'stone2');
      rect(x, 66, 60, 29, 3, 'stone3'); rect(x, 67, 60, 27, 2, 'white');
      rect(x, 74, 69, 13, 5, 'brass2'); rect(x, 75, 70, 11, 3, 'brass0'); rect(x, 76, 71, 7, 1, 'brass3');
    };

    const PRINTS = [
      [105, (x, px, py) => { rect(x, px, py, 5, 3, 'dusk2'); rect(x, px, py + 3, 5, 3, 'dusk4'); dot(x, px + 3, py + 1, 'light0'); }],
      [117, (x, px, py) => { rect(x, px, py, 5, 3, 'sky2'); rect(x, px, py + 3, 5, 3, 'water3'); rect(x, px + 1, py + 3, 3, 1, 'water1'); }],
      [129, (x, px, py) => { rect(x, px, py, 5, 6, 'roofR0'); ellipse(x, px + 2, py + 3, 1, 1, 'ant2'); dot(x, px + 2, py + 5, 'blue'); }],
      [141, (x, px, py) => { rect(x, px, py, 5, 6, 'sky1'); ellipse(x, px + 2, py + 2, 2, 2, 'leaf3'); rect(x, px + 2, py + 4, 1, 2, 'wood3'); }],
    ];
    const lineY = lx => 9 + Math.round(3 * Math.sin(((lx - 100) / 58) * Math.PI));
    const SWAY = [0, 1, 1, 0, 0, -1, -1, 0];
    const BLINK = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0];
    const corner = (x, t, still) => {
      const f = still ? 0 : Math.floor(t * 6), on = still ? 1 : BLINK[f % BLINK.length];
      // safelight dome and its stepped rose halo
      if (on) lit(x, () => { ellipse(x, 146, 28, 11, 10, SAFE[0]); ellipse(x, 146, 28, 7, 6, SAFE[1]); });
      rect(x, 143, 23, 7, 10, on ? 'roofR3' : 'roofR4'); rect(x, 142, 25, 9, 8, on ? 'roofR3' : 'roofR4');
      rect(x, 144, 24, 5, 9, on ? 'red' : 'roofR2'); rect(x, 143, 26, 7, 7, on ? 'red' : 'roofR2');
      rect(x, 144, 25, 2, 5, on ? 'pink' : 'roofR1'); dot(x, 144, 25, on ? 'white' : 'roofR0');
      // drying line with four prints on pegs, swaying
      for (let lx = 100; lx < 159; lx++) dot(x, lx, lineY(lx), 'iron2');
      PRINTS.forEach(([px, pic], i) => {
        const sway = still ? 0 : SWAY[(f + i * 2) % 8], py = lineY(px + 3) + 1;
        rect(x, px + 2, py - 2, 2, 3, 'wood1'); dot(x, px + 3, py - 2, 'wood3');
        clip(x, px - 2, py, 11, 5, () => { rect(x, px, py + 1, 7, 4, 'white'); pic(x, px + 1, py + 2); });
        clip(x, px - 2, py + 5, 11, 6, () => { rect(x, px + sway, py + 5, 7, 5, 'white'); rect(x, px + sway, py + 9, 7, 1, 'cream2'); pic(x, px + 1 + sway, py + 2); });
      });
    };

    return scene(MINT[0], anchors, [room, { live: corner }, { sort: [[78, plinth]] }, 'glow']);
  }

  // ---------- 4. archive: tall shelves, a round window and its sunbeam ----------
  function archive() {
    const anchors = { a: [42, 86], b: [118, 86], item: [88, 55] };
    const WX = 64, WY = 18, SLOPE = 0.55;                       // round window centre, beam slope
    const BEAM = ['rgba(255,206,110,0.06)', 'rgba(255,226,150,0.06)', 'rgba(255,244,210,0.08)', 'rgba(255,214,130,0.16)'];
    const KRAFT = ['dirt1', 'dirt2', 'dirt3', 'dirt4'];

    const box = (x, px, bottom, w, h) => {
      block(x, px, bottom - h, w, h, KRAFT);
      rect(x, px + 2, bottom - h + 2, Math.min(5, w - 4), 3, 'cream0'); rect(x, px + 3, bottom - h + 3, Math.min(3, w - 6), 1, 'wood3');
    };
    // pigeonholes, each holding a rolled scroll seen end-on
    const cubbies = (x, px, top, cols, rows) => {
      rect(x, px, top, cols * 5 + 1, rows * 5 + 1, 'wood3');
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const cx = px + 1 + c * 5, cy = top + 1 + r * 5;
        rect(x, cx, cy, 4, 4, 'wood4');
        rect(x, cx, cy + 1, 3, 1, 'cream1'); rect(x, cx + 1, cy, 1, 3, 'cream1'); dot(x, cx, cy + 1, 'cream0'); dot(x, cx + 1, cy + 1, 'dirt3');
      }
    };
    const lyingScroll = (x, px, y, w, tie) => {
      rect(x, px, y, w, 3, 'cream1'); rect(x, px, y, w, 1, 'cream0'); rect(x, px - 1, y, 1, 3, 'cream2'); rect(x, px + w, y, 1, 3, 'cream2');
      rect(x, px + (w >> 1) - 1, y, 2, 3, tie);
    };
    const shelves = (x, x0, x1, boards) => {
      rect(x, x0, 0, x1 - x0, 58, 'wood4'); rect(x, x0 + 3, 0, x1 - x0 - 6, 57, 'cloud3');
      rect(x, x0 + 1, 0, 2, 58, 'wood1'); rect(x, x1 - 3, 0, 2, 58, 'wood2');
      for (const by of boards) { rect(x, x0 + 1, by, x1 - x0 - 2, 3, 'wood4'); rect(x, x0 + 1, by, x1 - x0 - 2, 1, 'wood1'); rect(x, x0 + 1, by + 1, x1 - x0 - 2, 1, 'wood2'); rect(x, x0 + 3, by + 3, x1 - x0 - 6, 1, 'stone3'); }
    };

    const room = x => {
      rect(x, 0, 0, W, 57, 'cloud2');
      // floor: warm flagstones, a dusty rose runner
      paving(x, 57, 96, 7, 12, ['wall0', 'wall1', 'wall2'], ['white', 'wall0']);
      rect(x, 0, 57, W, 1, 'wall3');
      runner(x, 20, 75, 120, 17, ['roofR3', 'cream1', 'dusk3', 'dusk2'], 'cream1');
      // left shelves: labelled boxes, pigeonholes of scrolls, binders
      shelves(x, 0, 40, [12, 25, 38, 51]);
      box(x, 3, 12, 12, 9); box(x, 16, 12, 10, 8); cubbies(x, 27, 1, 2, 2);
      cubbies(x, 3, 14, 3, 2); box(x, 21, 25, 16, 10);
      books(x, 3, 20, 38, 5, 10); box(x, 21, 38, 15, 9);
      box(x, 3, 51, 14, 10); lyingScroll(x, 20, 48, 14, 'red'); lyingScroll(x, 21, 45, 12, 'roofG2');
      // right shelves
      shelves(x, 125, 160, [12, 25, 38, 51]);
      cubbies(x, 128, 1, 3, 2); box(x, 146, 12, 12, 9);
      box(x, 128, 25, 13, 9); books(x, 142, 158, 25, 9, 10);
      lyingScroll(x, 129, 35, 12, 'blue'); lyingScroll(x, 128, 32, 13, 'red'); box(x, 144, 38, 14, 10);
      box(x, 128, 51, 11, 8); cubbies(x, 141, 40, 3, 2);
      // round window with stone surround
      ellipse(x, WX, WY, 15, 15, 'stone3'); ellipse(x, WX - 1, WY - 1, 13, 13, 'stone0'); ellipse(x, WX, WY, 13, 13, 'stone1');
      for (let a = 0; a < 8; a++) dot(x, WX + Math.round(Math.cos(a * Math.PI / 4) * 12), WY + Math.round(Math.sin(a * Math.PI / 4) * 12), 'stone2');
      ellipse(x, WX, WY, 10, 10, 'stone3'); ellipse(x, WX, WY, 9, 9, 'sky1');
      clip(x, WX - 9, WY - 9, 19, 9, () => ellipse(x, WX, WY, 9, 9, 'sky2'));
      ellipse(x, WX + 4, WY + 5, 6, 3, 'leaf2'); ellipse(x, WX + 3, WY + 4, 3, 2, 'grass1'); rect(x, WX - 7, WY - 5, 6, 2, 'cloud0'); rect(x, WX - 5, WY - 6, 3, 1, 'cloud0');
      rect(x, WX - 1, WY - 9, 2, 19, 'wood3'); rect(x, WX - 9, WY - 1, 19, 2, 'wood3'); dot(x, WX - 1, WY - 1, 'wood2');
      // key rack with one empty hook
      rect(x, 86, 38, 14, 3, 'wood4'); rect(x, 87, 38, 12, 1, 'wood1'); rect(x, 87, 39, 12, 1, 'wood2');
      for (const [hx, key] of [[88, 1], [91, 1], [94, 0], [97, 1]]) {
        dot(x, hx, 41, 'iron2');
        if (key) { rect(x, hx - 1, 42, 3, 2, 'brass1'); dot(x, hx, 42, 'brass3'); rect(x, hx, 44, 1, 3, 'brass2'); dot(x, hx + 1, 46, 'brass2'); }
      }
      // small arched door
      rect(x, 102, 31, 21, 26, 'stone2'); rect(x, 103, 29, 19, 2, 'stone2'); rect(x, 105, 28, 15, 1, 'stone2');
      rect(x, 104, 32, 17, 25, 'wood2'); rect(x, 105, 30, 15, 2, 'wood2'); rect(x, 107, 29, 11, 1, 'wood2');
      for (const px of [108, 112, 116]) rect(x, px, 31, 1, 26, 'wood3');
      rect(x, 104, 32, 1, 25, 'wood1'); rect(x, 105, 30, 1, 2, 'wood1');
      for (const hy of [36, 50]) { rect(x, 104, hy, 7, 2, 'iron3'); rect(x, 104, hy, 7, 1, 'iron2'); }
      rect(x, 116, 43, 2, 2, 'brass1'); dot(x, 117, 46, 'ink2'); dot(x, 117, 47, 'ink2');
      rect(x, 101, 56, 23, 2, 'stone1'); rect(x, 101, 56, 23, 1, 'stone0');
    };

    const beam = x => {
      shaft(x, WX - 9, WY + 2, 91, 19, SLOPE, BEAM[0]); shaft(x, WX - 6, WY + 2, 88, 13, SLOPE, BEAM[1]); shaft(x, WX - 3, WY + 2, 84, 7, SLOPE, BEAM[2]);
      rect(x, 80, 59, 11, 3, BEAM[3]);                       // warm hot spot where it lands on the table
    };

    const ladder = x => {
      shadow(x, 12, 86, 7, 2);
      for (let y = 2; y < 86; y++) {
        const off = Math.round((86 - y) * 0.08);
        rect(x, 5 + off, y, 2, 1, 'wood4'); dot(x, 5 + off, y, 'wood1');
        rect(x, 15 + off, y, 2, 1, 'wood4'); dot(x, 15 + off, y, 'wood2');
        if (y % 8 === 4) { rect(x, 7 + off, y, 8, 2, 'wood4'); rect(x, 7 + off, y, 8, 1, 'wood1'); }
      }
    };

    const table = x => {
      shadow(x, 82, 78, 28, 3);
      for (const lx of [57, 103]) { rect(x, lx, 65, 4, 13, 'wood4'); rect(x, lx + 1, 65, 2, 12, 'wood2'); dot(x, lx + 1, 65, 'wood1'); }
      rect(x, 54, 58, 56, 8, 'wood4'); rect(x, 55, 59, 54, 3, 'wood1'); rect(x, 55, 59, 54, 1, 'wood0'); rect(x, 55, 62, 54, 1, 'wood0');
      rect(x, 55, 63, 54, 2, 'wood2');
      // open ledger (its right page lifts, drawn live)
      rect(x, 57, 55, 20, 6, 'roofR3'); rect(x, 58, 55, 8, 5, 'cream0'); rect(x, 67, 55, 9, 5, 'cream0'); rect(x, 66, 55, 1, 5, 'cream2');
      for (const ly of [56, 58]) { rect(x, 59, ly, 6, 1, 'cream2'); rect(x, 68, ly, 6, 1, 'cream2'); }
      // a brass magnifier lying on the table
      ellipse(x, 101, 60, 3, 1, 'brass2'); rect(x, 99, 60, 5, 1, 'sky0'); dot(x, 99, 60, 'white'); rect(x, 104, 61, 4, 1, 'wood3');
    };

    const crates = x => {
      shadow(x, 148, 86, 12, 2);
      box(x, 137, 86, 22, 12); box(x, 140, 74, 16, 10);
      lyingScroll(x, 143, 61, 9, 'roofG2');
    };

    const PAGE = [null, null, null, [[75, 54, 2, 1]], [[73, 52, 3, 3]], [[70, 50, 2, 5]], [[68, 51, 2, 4]], [[67, 53, 3, 2]]];
    const life = (x, t, still) => {
      // a page lifting in a draft
      const f = still ? 0 : Math.floor(t * 8) % 40, st = f < 32 ? 0 : f - 32;
      for (const [px, py, pw, ph] of PAGE[st] || []) { rect(x, px, py, pw, ph, 'cream0'); rect(x, px, py + ph, pw, 1, 'cream2'); }
      // dust motes drifting down the beam
      const k = still ? 1.5 : Math.floor(t * 8) / 8;
      for (let i = 0; i < 9; i++) {
        const p = (k * 0.035 + i * 0.111) % 1, y = WY + 8 + Math.round(p * 62);
        const mx = Math.round(WX - 6 + (y - WY - 2) * SLOPE + ((i * 5) % 13) + Math.sin(k * 0.7 + i) * 1.5);
        dot(x, mx, y, i % 4 ? 'light0' : 'white');
      }
    };

    return scene('#d6def5', anchors, [room, { sort: [[78, table], [86, ladder], [86, crates]] }, { add: beam }, 'glow', { live: life }]);
  }

  // ---------- 5. lighthouse: a seaside path at golden hour ----------
  function lighthouse() {
    const anchors = { a: [40, 86], b: [120, 86], item: [80, 66] };
    const LX = 136;                                            // tower centre

    const sky = x => {
      skyBands(x, 0, [['sky3', 8], ['sky2', 9], ['sky1', 9], ['sky0', 8], ['dusk0', 8]], 9);
      ellipse(x, 30, 30, 13, 13, 'sky0'); ellipse(x, 30, 30, 9, 9, 'light0'); ellipse(x, 30, 30, 6, 6, 'light1'); ellipse(x, 29, 29, 3, 3, 'light0');
      for (const [cx, cy, w] of [[58, 11, 30], [92, 21, 22], [4, 17, 16]]) {
        rect(x, cx + 5, cy - 2, w >> 1, 1, 'cloud0'); rect(x, cx + 2, cy - 1, w - 5, 1, 'cloud0');
        rect(x, cx, cy, w, 1, 'cloud1'); rect(x, cx + 2, cy + 1, w - 4, 1, 'light1');
      }
      // the sea: hazy horizon, deepening bands, a glitter path under the sun
      rect(x, 0, 41, W, 3, 'water1'); rect(x, 0, 44, W, 7, 'water2'); rect(x, 0, 51, W, 12, 'water3');
      const r = rng(4);
      for (let i = 0; i < 22; i++) { const y = 43 + Math.floor(r() * 19); rect(x, Math.floor(r() * W), y, 3 + Math.floor(r() * 6), 1, y < 51 ? 'water1' : 'water2'); }
      for (let y = 42; y < 62; y += 2) { const hw = 3 + ((y - 42) >> 2); rect(x, 30 - hw + ((y * 7) % 3), y, hw * 2 - 2, 1, y < 50 ? 'light0' : 'light1'); }
    };

    const land = x => {
      // far promontory with a rocky face into the sea
      for (let y = 46; y < 64; y++) {
        const xl = Math.round(103 - (y - 46) * 0.4 + (y > 58 ? (y - 58) * 1.5 : 0));
        rect(x, xl, y, W - xl, 1, y < 50 ? 'grass1' : 'grass2');
        if (y >= 50) { rect(x, xl, y, 5, 1, y % 3 ? 'stone2' : 'stone3'); dot(x, xl, y, 'stone1'); }
      }
      rect(x, 97, 61, 10, 1, 'water0'); rect(x, 95, 62, 6, 1, 'white');
      // keeper's cottage, gable end on
      rect(x, 146, 42, 15, 12, 'wall0'); rect(x, 146, 42, 1, 12, 'white'); rect(x, 146, 53, 15, 1, 'wall3');
      rect(x, 156, 31, 3, 6, 'stone3'); rect(x, 156, 31, 1, 6, 'stone1');
      for (let i = 0; i < 9; i++) { rect(x, 152 - i - 1, 34 + i, 2 * i + 4, 1, 'roofR4'); rect(x, 152 - i, 34 + i, 2 * i + 2, 1, i < 2 ? 'roofR0' : i < 5 ? 'roofR1' : 'roofR2'); }
      rect(x, 150, 46, 5, 5, 'wood3'); rect(x, 151, 47, 3, 3, 'light2'); rect(x, 151, 48, 3, 1, 'wood3');
      // lighthouse: stone base, tapering striped tower with round shading, gallery, lantern, dome (lens light is live)
      for (let y = 15; y < 50; y++) {
        const hw = Math.round(5 + (y - 15) * 0.14), red = Math.floor((y - 15) / 7) % 2 === 1;
        const [hi, base, sh, dk, out] = red ? ['roofR0', 'roofR1', 'roofR2', 'roofR3', 'roofR4'] : ['white', 'cloud1', 'cloud2', 'cloud3', 'stone3'];
        rect(x, LX - hw - 1, y, hw * 2 + 3, 1, out); rect(x, LX - hw, y, hw * 2 + 1, 1, base);
        rect(x, LX - hw + 1, y, 2, 1, hi); rect(x, LX + hw - 3, y, 2, 1, sh); rect(x, LX + hw - 1, y, 2, 1, dk);
      }
      rect(x, LX - 12, 49, 25, 6, 'stone4'); rect(x, LX - 11, 50, 23, 4, 'stone1'); rect(x, LX - 11, 50, 23, 1, 'stone0'); rect(x, LX + 7, 51, 5, 3, 'stone2');
      rect(x, LX - 2, 42, 5, 9, 'wood4'); rect(x, LX - 1, 43, 3, 8, 'wood2'); dot(x, LX - 1, 43, 'wood1'); dot(x, LX + 1, 47, 'brass1');
      rect(x, LX - 1, 26, 3, 4, 'stone3'); rect(x, LX, 27, 1, 2, 'light2');
      rect(x, LX - 9, 12, 19, 3, 'roofR4'); rect(x, LX - 8, 12, 17, 1, 'roofR0'); rect(x, LX - 8, 13, 17, 1, 'roofR2');
      rect(x, LX - 5, 4, 11, 8, 'iron4');
      rect(x, LX - 8, 9, 17, 1, 'iron3'); for (let px = LX - 8; px <= LX + 8; px += 2) rect(x, px, 10, 1, 2, 'iron3');
      for (let i = 0; i < 4; i++) rect(x, LX - 6 + i, 3 - i, 13 - i * 2, 1, i < 2 ? 'roofR2' : 'roofR1');
      dot(x, LX - 2, 1, 'roofR0'); rect(x, LX, -1, 1, 2, 'roofR4');
      // near headland: grass meets the sea, fence posts with a rope
      for (let px = 0; px < 104; px++) { const y = 60 + Math.round(Math.sin(px / 7) * 0.8); rect(x, px, y, 1, 3, 'grass1'); rect(x, px, y + 3, 1, 96 - y - 3, 'grass2'); }
      rect(x, 104, 60, 56, 36, 'grass2');
      for (const [bx, by, rx, ry] of [[20, 72, 15, 3], [96, 82, 20, 3], [130, 66, 13, 2], [8, 90, 12, 2], [58, 90, 10, 2]]) ellipse(x, bx, by, rx, ry, 'grass1');
      for (let px = 6; px < 100; px += 18) {
        if (px + 18 < 100) for (let k = px + 2; k < px + 18; k++) dot(x, k, 60 + Math.round(Math.sin(((k - px - 2) / 16) * Math.PI) * 2), 'dirt3');
        rect(x, px, 57, 2, 7, 'wood4'); dot(x, px, 57, 'wood1'); rect(x, px, 58, 1, 5, 'wood2');
      }
      // sandy path winding up to the lighthouse door, with soft grassy edges and pebbles
      for (let y = 53; y < 96; y++) {
        const u = (y - 53) / 43, cx = Math.round(LX - u * 60 + Math.sin(u * 3.2) * 10), hw = Math.round(2 + u * 14);
        rect(x, cx - hw, y, hw * 2 + 1, 1, 'dirt1');
        dot(x, cx - hw, y, 'dirt2');
        if (y % 6 === 2 && hw > 4) { rect(x, cx - hw, y, 2, 1, 'grass2'); rect(x, cx + hw - 1, y + 1, 2, 1, 'grass2'); }
        if (y % 5 === 0) rect(x, cx - hw + 3, y, 3, 1, 'dirt0');
        if (y % 7 === 3 && hw > 5) { rect(x, cx + (hw >> 1), y, 2, 1, 'dirt2'); dot(x, cx + (hw >> 1), y - 1, 'dirt0'); }
      }
      // grass tufts and flower drifts
      const tuft = (px, py) => { dot(x, px, py, 'grass3'); dot(x, px + 2, py, 'grass3'); rect(x, px, py + 1, 3, 1, 'grass3'); dot(x, px + 1, py - 1, 'grass1'); };
      for (const [px, py] of [[10, 66], [30, 64], [54, 70], [64, 84], [22, 80], [110, 70], [140, 78], [150, 64], [118, 92]]) tuft(px, py);
      const drift = (cx, cy, cols, n, seed) => {
        const r = rng(seed);
        for (let i = 0; i < n; i++) {
          const fx = cx + Math.round((r() - 0.5) * 14), fy = cy + Math.round((r() - 0.5) * 6), c = cols[i % cols.length];
          dot(x, fx + 1, fy + 2, 'grass3'); flower(x, fx, fy, c, c === 'white' ? 'yellow' : 'white');
        }
      };
      drift(16, 71, ['pink', 'white'], 7, 1); drift(24, 89, ['yellow', 'white'], 6, 2); drift(60, 66, ['lilac', 'white'], 5, 3);
      drift(102, 90, ['pink', 'yellow'], 6, 4); drift(144, 72, ['white', 'pink'], 7, 5); drift(150, 89, ['yellow', 'lilac'], 6, 6);
    };

    const rock = x => {
      shadow(x, 81, 77, 15, 3);
      ellipse(x, 80, 74, 14, 5, 'stone4'); ellipse(x, 80, 73, 13, 4, 'stone2'); ellipse(x, 79, 71, 12, 3, 'stone1'); ellipse(x, 78, 70, 8, 2, 'stone0');
      rect(x, 67, 74, 26, 2, 'stone3'); ellipse(x, 71, 72, 3, 1, 'grass1'); dot(x, 70, 73, 'leaf2'); ellipse(x, 90, 73, 2, 1, 'grass1');
    };

    const gull = [spr(['w.....w', '.ww.ww.', '...w...'], { w: 'white' }), spr(['.......', 'www.www', '...w...'], { w: 'white' })];
    const TUFT = [spr(['.a...', '.a.a.', 'aaaa.', '.aaa.'], { a: 'grass3' }), spr(['..a..', '.aaa.', '.aaa.', '.aaa.'], { a: 'grass3' }), spr(['...a.', '.a.a.', '.aaaa', '.aaa.'], { a: 'grass3' })];
    const waves = (x, t, still) => {
      const f = still ? 0 : Math.floor(t * 6);
      for (let i = 0; i < 12; i++) {
        const ph = (f + i * 3) % 12; if (ph > 7) continue;
        const wx = (i * 29 + 7) % 100, wy = 45 + ((i * 11) % 15), len = ph < 2 || ph > 5 ? 2 : 4;
        rect(x, wx + (ph >> 1), wy, len, 1, 'water0');
      }
      for (let i = 0; i < 5; i++) {
        const ph = (f + i * 5) % 16; if (ph > 3) continue;
        const sx = 24 + ((i * 7) % 12), sy = 44 + i * 3;
        dot(x, sx, sy, 'white'); if (ph === 1 || ph === 2) { dot(x, sx - 1, sy, 'light0'); dot(x, sx + 1, sy, 'light0'); dot(x, sx, sy - 1, 'light0'); }
      }
      [[0, 14, 6], [70, 20, 4.5]].forEach(([x0, gy, v], i) => {
        const gx = Math.round(((x0 + (still ? 20 : t * v)) % 200) - 20), bob = still ? 0 : [0, 0, 1, 0][Math.floor(t * 4 + i) % 4];
        x.drawImage(gull[still ? 0 : Math.floor(t * 6 + i * 2) % 2], gx, gy + bob);
      });
    };
    const lens = (x, t, still) => {
      // lighthouse lens: a bright band sweeping round the glass, and a pale stepped beam over the sea
      const k = still ? 1 : Math.floor(t * 4) % 8;
      rect(x, LX - 4, 5, 9, 4, 'light1');
      if (k < 5) rect(x, LX - 4 + k * 2, 5, 2, 4, 'light0');
      rect(x, LX - 2, 5, 1, 4, 'iron3'); rect(x, LX + 1, 5, 1, 4, 'iron3');
      if (k < 3) lit(x, () => { for (let y = 3; y < 13; y++) { const d = Math.abs(y - 7), len = 64 - d * 11; if (len > 0) rect(x, LX - 6 - len, y, len, 1, 'rgba(255,240,200,0.16)'); } });
    };
    const breeze = (x, t, still) => {
      for (const [px, py, ph] of [[4, 92, 0], [18, 90, 2], [34, 93, 1], [58, 91, 3], [92, 93, 0], [104, 90, 2], [132, 92, 1], [146, 94, 3], [154, 88, 2], [70, 95, 1]]) {
        const f = still ? 1 : [0, 1, 2, 1][(Math.floor(t * 6) + ph) % 4];
        x.drawImage(TUFT[f], px, py - 3);
      }
    };

    const front = x => {                                       // flowering shrubs framing the bottom corners
      bush(x, 4, 90, 11, 8); bush(x, 14, 95, 7, 5);
      bush(x, 157, 90, 10, 8); bush(x, 148, 96, 6, 4);
      for (const [fx, fy, c] of [[1, 84, 'pink'], [6, 86, 'white'], [10, 83, 'pink'], [14, 90, 'yellow'], [151, 85, 'yellow'], [156, 87, 'white'], [154, 83, 'pink']]) flower(x, fx, fy, c, c === 'white' ? 'yellow' : 'white');
    };

    return scene('#9fd3fb', anchors, [sky, { live: waves }, land, { live: lens }, { sort: [[77, rock]] }, 'glow', { live: breeze }, front]);
  }

  // ---------- 6. desk: Marlow's writing desk under a night-blue pastel window ----------
  function desk() {
    const anchors = { a: [42, 86], b: [118, 86], c: [141, 90], item: [80, 55] };
    const CX = 57, CY = 52;                                   // candle wick
    const halfW = (dy, rx, ry) => Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))));
    const arch = (cx, top, rx, ry, bottom, fn) => { for (let y = top; y < bottom; y++) { const hw = y < top + ry ? halfW(top + ry - y, rx, ry) : rx; fn(y, cx - hw, hw * 2 + 1); } };

    const room = x => {
      rect(x, 0, 0, W, 57, 'cloud2');
      rect(x, 0, 42, W, 15, 'roofB0'); rect(x, 0, 42, W, 1, 'white'); rect(x, 0, 43, W, 1, 'cloud1');
      for (let px = 3; px < W; px += 16) { rect(x, px, 46, 12, 1, 'roofB1'); rect(x, px, 46, 1, 7, 'roofB1'); rect(x, px + 1, 52, 11, 1, 'cloud1'); }
      rect(x, 0, 54, W, 3, 'roofB2'); rect(x, 0, 54, W, 1, 'roofB1');
      planks(x, 57, 96, 5, 61, ['wood0', 'wood1', 'wood2']);
      rect(x, 0, 57, W, 1, 'wood2');
      // rug with a gold border and a small medallion
      runner(x, 24, 71, 112, 22, ['brass3', 'brass1', 'roofB2', 'roofB0'], 'cream1');
      rect(x, 76, 80, 9, 4, 'brass1'); rect(x, 78, 79, 5, 6, 'brass1'); rect(x, 78, 81, 5, 2, 'roofB0');
      // arched window: night-blue pastel sky, moon, rooftops with lit windows
      arch(80, 3, 21, 14, 41, (y, xl, w) => rect(x, xl, y, w, 1, 'wood4'));
      arch(80, 4, 20, 13, 40, (y, xl, w) => rect(x, xl, y, w, 1, 'wood2'));
      arch(80, 4, 20, 13, 40, (y, xl) => dot(x, xl, y, 'wood1'));
      arch(80, 7, 17, 11, 37, (y, xl, w) => rect(x, xl, y, w, 1, y < 16 ? 'roofB1' : y < 27 ? 'roofB0' : 'cloud2'));
      arch(80, 7, 17, 11, 37, (y, xl, w) => { if (y === 16 || y === 27) for (let k = xl + (y & 1); k < xl + w; k += 3) dot(x, k, y, y === 16 ? 'roofB1' : 'roofB0'); });
      ellipse(x, 70, 14, 3, 3, 'light1'); ellipse(x, 71, 13, 3, 3, 'roofB1'); dot(x, 67, 14, 'light0');
      for (const [hx, hy, hw, hh] of [[63, 29, 9, 8], [72, 31, 7, 6], [86, 27, 8, 10], [94, 30, 4, 7]]) {
        rect(x, hx, hy, hw, hh, 'roofB2'); for (let i = 0; i < 3; i++) rect(x, hx + i, hy - 1 - i, hw - i * 2, 1, 'roofB3');
        dot(x, hx + 2, hy + 3, 'light2'); if (hw > 6) dot(x, hx + hw - 3, hy + 3, 'light1');
      }
      rect(x, 89, 22, 2, 4, 'roofB3'); rect(x, 63, 36, 34, 1, 'roofB3');
      rect(x, 79, 7, 2, 30, 'wood2'); rect(x, 63, 25, 34, 2, 'wood2'); rect(x, 79, 7, 1, 30, 'wood1');
      rect(x, 57, 40, 46, 3, 'wood4'); rect(x, 58, 40, 44, 1, 'wood0'); rect(x, 58, 41, 44, 1, 'wood2');
      // lilac drapes
      for (const [dx, lit] of [[50, 1], [104, 0]]) {
        rect(x, dx, 1, 7, 42, 'dusk4'); rect(x, dx + (lit ? 0 : 5), 1, 2, 42, lit ? 'lilac' : 'dusk5');
        rect(x, dx + 3, 2, 1, 40, 'dusk5'); rect(x, dx + 1, 24, 5, 2, 'brass1');
      }
      rect(x, 48, 0, 64, 2, 'brass2'); rect(x, 48, 0, 64, 1, 'brass1');
      // bookcase (left)
      rect(x, 0, 3, 36, 55, 'wood4'); rect(x, 2, 4, 32, 53, 'wood3'); rect(x, 1, 3, 2, 55, 'wood1'); rect(x, 33, 3, 2, 55, 'wood2');
      for (const [by, seed] of [[15, 1], [28, 2], [41, 3], [54, 4]]) { books(x, 3, 33, by, seed, 10); rect(x, 1, by, 34, 2, 'wood4'); rect(x, 1, by, 34, 1, 'wood1'); }
      rect(x, 0, 2, 36, 2, 'wood2'); rect(x, 0, 2, 36, 1, 'wood1');
      // curio shelves (right): jars, a ship in a bottle, an hourglass, a small lantern
      for (const sy of [24, 42]) { rect(x, 122, sy, 38, 3, 'wood4'); rect(x, 122, sy, 38, 1, 'wood1'); rect(x, 122, sy + 1, 38, 1, 'wood2'); rect(x, 124, sy + 3, 36, 1, 'cloud3'); rect(x, 126, sy + 3, 2, 3, 'wood3'); rect(x, 154, sy + 3, 2, 3, 'wood3'); }
      const jar = (px, bottom, w, h, fill) => {
        rect(x, px, bottom - h, w, h, 'stone3'); rect(x, px + 1, bottom - h + 1, w - 2, h - 1, 'water1');
        rect(x, px + 1, bottom - (h >> 1), w - 2, h >> 1, fill); rect(x, px + 1, bottom - h + 1, 1, h - 2, 'white'); rect(x, px, bottom - h - 1, w, 1, 'wood3');
      };
      jar(125, 24, 6, 8, 'rose'); jar(132, 24, 5, 6, 'yellow');
      rect(x, 139, 19, 14, 5, 'stone3'); rect(x, 140, 20, 12, 3, 'water1'); rect(x, 152, 20, 3, 3, 'stone3'); rect(x, 153, 21, 2, 1, 'wood2');
      rect(x, 142, 21, 7, 1, 'wood2'); rect(x, 145, 18, 1, 3, 'wood3'); rect(x, 143, 19, 2, 2, 'white'); dot(x, 141, 20, 'white');
      rect(x, 125, 33, 7, 1, 'wood3'); rect(x, 125, 41, 7, 1, 'wood3'); rect(x, 126, 34, 5, 3, 'water1'); rect(x, 127, 37, 3, 1, 'light2');
      rect(x, 126, 38, 5, 3, 'water1'); rect(x, 127, 39, 3, 2, 'light2'); rect(x, 125, 34, 1, 7, 'wood3'); rect(x, 131, 34, 1, 7, 'wood3');
      rect(x, 137, 32, 9, 10, 'iron3'); rect(x, 138, 34, 7, 7, 'light1'); rect(x, 140, 30, 3, 2, 'iron3'); rect(x, 138, 34, 7, 1, 'iron1'); rect(x, 141, 35, 1, 6, 'iron3');
      jar(149, 42, 7, 9, 'roofG1'); jar(157, 42, 3, 7, 'lilac');
    };

    const table = x => {
      shadow(x, 80, 78, 30, 3);
      for (const lx of [54, 103]) { rect(x, lx, 67, 4, 11, 'wood4'); rect(x, lx + 1, 67, 2, 10, 'wood2'); rect(x, lx, 71, 4, 2, 'wood3'); dot(x, lx + 1, 67, 'wood1'); }
      rect(x, 51, 57, 58, 11, 'wood4'); rect(x, 52, 58, 56, 4, 'wood1'); rect(x, 52, 58, 56, 1, 'wood0'); rect(x, 52, 61, 56, 1, 'wood0');
      rect(x, 52, 62, 56, 5, 'wood2');
      for (const dx of [56, 88]) { block(x, dx, 63, 16, 4, WOOD); rect(x, dx + 7, 64, 2, 1, 'brass1'); }
      // candle in a brass holder, ink pot with a quill
      rect(x, CX - 3, 59, 7, 2, 'brass3'); rect(x, CX - 3, 59, 7, 1, 'brass1'); rect(x, CX + 4, 58, 2, 2, 'brass2');
      rect(x, CX - 1, CY + 1, 3, 6, 'cream1'); rect(x, CX - 1, CY + 1, 1, 6, 'cream0'); rect(x, CX + 1, CY + 1, 1, 6, 'cream2'); dot(x, CX - 2, CY + 3, 'cream0');
      rect(x, 63, 55, 6, 5, 'roofB4'); rect(x, 64, 56, 4, 3, 'roofB3'); dot(x, 64, 56, 'roofB0'); rect(x, 64, 54, 4, 1, 'roofB4');
      for (let i = 0; i < 9; i++) rect(x, 66 + (i >> 1), 53 - i, 2, 1, i < 2 ? 'cream2' : 'cream0');
      dot(x, 66, 54, 'ink2');
      // stacked books and a small framed photograph
      for (const [by, bx, bw, c0, c1] of [[58, 92, 15, 'roofG1', 'roofG2'], [55, 93, 13, 'rose', 'red'], [52, 94, 12, 'roofB1', 'roofB2']]) {
        rect(x, bx, by, bw, 3, c1); rect(x, bx, by, bw, 1, c0); rect(x, bx + 1, by + 1, bw - 2, 1, 'cream0');
      }
      block(x, 97, 43, 7, 9, GOLD); rect(x, 99, 45, 3, 5, 'dusk0'); dot(x, 100, 46, 'ant2'); rect(x, 99, 48, 3, 2, 'blue');
    };

    const FLAME = ['.2.|.1.|212|101|101|.3.', '2..|.1.|21.|101|101|.3.', '.2.|.2.|.1.|212|101|.3.', '..2|.1.|.12|101|101|.3.']
      .map(s => spr(s.split('|'), { 0: 'light0', 1: 'light1', 2: 'light2', 3: 'light3' }));
    const SEQ = [0, 0, 2, 0, 1, 0, 0, 3, 0, 2, 0, 0, 1, 0, 3, 0];
    const life = (x, t, still) => {
      const f = still ? 0 : Math.floor(t * 8), fl = still ? 0 : SEQ[f % 16], wob = fl === 2 ? 1 : 0;
      lit(x, () => {
        ellipse(x, CX, CY - 2, 13 + wob, 11 + wob, 'rgba(255,190,90,0.08)');
        ellipse(x, CX, CY - 2, 8 + wob, 7 + wob, 'rgba(255,210,120,0.08)');
        ellipse(x, CX, CY - 2, 4, 4, 'rgba(255,236,180,0.10)');
      });
      x.drawImage(FLAME[fl], CX - 1, CY - 6);
      // a drifting ember
      const P = 2.6, p = still ? 0.35 : (Math.floor(t * 8) / 8 % P) / P;
      if (p < 0.85) { const ex = CX + Math.round(Math.sin(p * 9) * 2 + p * 7), ey = CY - 8 - Math.round(p * 26); dot(x, ex, ey, p < 0.3 ? 'light0' : p < 0.6 ? 'light1' : 'light3'); }
      // stars twinkling in the window
      for (const [sx, sy, ph] of [[88, 11, 0], [75, 20, 9], [94, 17, 17], [66, 22, 27], [84, 8, 5]]) {
        dot(x, sx, sy, 'light0');
        const q = still ? 99 : (f + ph) % 32;
        if (q < 3) { dot(x, sx - 1, sy, 'light1'); dot(x, sx + 1, sy, 'light1'); dot(x, sx, sy - 1, 'light1'); dot(x, sx, sy + 1, 'light1'); }
      }
    };

    return scene('#d6def5', anchors, [room, { sort: [[78, table]] }, { live: life }, 'glow']);
  }

  // ---------- 7. home: the family kitchen table at sunrise ----------
  function home() {
    const anchors = { a: [44, 86], b: [118, 86], c: [141, 90], item: [80, 55] };
    const SUN = 'rgba(255,206,130,0.14)';
    const WXL = 46, WXR = 84, WYT = 7, WYB = 38;                    // window, outer frame box

    const room = x => {
      rect(x, 0, 0, W, 57, 'wall1');
      rect(x, 0, 0, W, 3, 'wall2');
      // sage beadboard below a chair rail
      rect(x, 0, 40, W, 17, SAGE[1]); rect(x, 0, 40, W, 2, SAGE[0]); rect(x, 0, 42, W, 1, SAGE[2]);
      for (let px = 2; px < W; px += 4) { rect(x, px, 43, 1, 11, SAGE[2]); dot(x, px + 1, 43, SAGE[0]); }
      rect(x, 0, 54, W, 3, SAGE[3]); rect(x, 0, 54, W, 1, SAGE[2]);
      // floor: glazed cream and peach checker tiles, a braided rag rug
      for (let y = 57, j = 0; y < 96; y += 6, j++) for (let px = 0, i = 0; px < W; px += 10, i++) {
        const lite = (i + j) & 1;
        rect(x, px, y, 10, 6, lite ? 'wall1' : 'dusk1'); rect(x, px, y, 10, 1, lite ? 'wall0' : 'dusk0');
      }
      [[58, 11, 'roofB2'], [57, 10, 'blue'], [52, 8, 'cream0'], [45, 7, 'sky2'], [37, 5, 'cream0'], [28, 3, 'blue'], [14, 1, 'sky2']].forEach(([rx, ry, c]) => ellipse(x, 80, 85, rx, ry, c));
      // window: sage frame, a sunrise over green hills
      rect(x, WXL - 1, WYT - 1, WXR - WXL + 2, WYB - WYT + 2, SAGE[3]); rect(x, WXL, WYT, WXR - WXL, WYB - WYT, SAGE[1]);
      rect(x, WXL, WYT, WXR - WXL, 1, SAGE[0]); rect(x, WXL, WYT, 1, WYB - WYT, SAGE[0]);
      clip(x, WXL + 3, WYT + 3, WXR - WXL - 6, WYB - WYT - 6, () => {
        skyBands(x, WYT + 3, [['dusk3', 5], ['dusk2', 6], ['dusk1', 6], ['dusk0', 6]], 3);
        ellipse(x, 62, 31, 8, 8, 'light1'); ellipse(x, 62, 31, 5, 5, 'light0');
        ellipse(x, 54, 36, 16, 5, 'grass1'); ellipse(x, 82, 36, 14, 6, 'grass2'); ellipse(x, 50, 30, 4, 4, 'leaf3'); ellipse(x, 49, 29, 2, 2, 'leaf2'); rect(x, 50, 33, 1, 3, 'wood3');
      });
      rect(x, 64, WYT + 3, 2, WYB - WYT - 6, SAGE[1]); rect(x, WXL + 3, 21, WXR - WXL - 6, 2, SAGE[1]); rect(x, 64, WYT + 3, 1, WYB - WYT - 6, SAGE[0]);
      rect(x, WXL - 4, WYB - 1, WXR - WXL + 8, 3, 'wood4'); rect(x, WXL - 3, WYB - 1, WXR - WXL + 6, 1, 'wood0'); rect(x, WXL - 3, WYB, WXR - WXL + 6, 1, 'wood2');
      // potted herb on the sill
      rect(x, 76, 33, 6, 5, 'roofR2'); rect(x, 76, 33, 6, 1, 'roofR1'); rect(x, 77, 34, 1, 3, 'roofR0'); bush(x, 79, 30, 4, 3, ['grass1', 'leaf2', 'leaf3', 'leaf4']);
      // coat hooks with the green cap and a scarf
      rect(x, 6, 18, 28, 3, 'wood4'); rect(x, 6, 18, 28, 1, 'wood1'); rect(x, 6, 19, 28, 1, 'wood2');
      for (const px of [10, 20, 29]) { rect(x, px, 21, 2, 2, 'wood3'); dot(x, px, 21, 'wood1'); }
      x.drawImage(spr(['..ggg...', '.gGGGg..', 'gGGwGGg.', 'gGGGGGg.', 'bbbbbbbbbb'], { g: 'cap2', G: 'cap1', w: 'cream0', b: 'cap3' }, 'cap4'), 6, 21);
      rect(x, 19, 22, 4, 15, 'rose'); rect(x, 19, 22, 1, 15, 'pink'); for (let sy = 25; sy < 37; sy += 4) rect(x, 19, sy, 4, 1, 'cream0'); rect(x, 19, 37, 1, 2, 'rose'); rect(x, 21, 37, 1, 2, 'rose');
      // dresser with plates and cups (right), painted sage
      rect(x, 120, 5, 40, 53, 'wood4'); rect(x, 122, 7, 36, 26, SAGE[0]); rect(x, 121, 6, 2, 52, SAGE[1]); rect(x, 157, 6, 2, 52, SAGE[2]);
      rect(x, 119, 3, 42, 3, 'wood2'); rect(x, 119, 3, 42, 1, 'wood1');
      for (const sy of [18, 32]) { rect(x, 121, sy, 37, 2, 'wood4'); rect(x, 121, sy, 37, 1, 'wood1'); }
      for (const px of [126, 135, 144, 153]) { ellipse(x, px, 13, 3, 4, 'roofB2'); ellipse(x, px, 13, 2, 3, 'cream0'); ellipse(x, px, 13, 1, 1, 'sky1'); dot(x, px - 1, 11, 'white'); }
      for (const px of [124, 132, 140, 148]) { rect(x, px, 27, 5, 5, 'cream0'); rect(x, px, 27, 5, 1, 'white'); rect(x, px + 4, 28, 1, 4, 'cream2'); rect(x, px + 5, 28, 1, 2, 'cream2'); rect(x, px + 1, 29, 3, 1, px % 16 ? 'rose' : 'blue'); }
      rect(x, 122, 34, 36, 22, SAGE[2]); rect(x, 122, 34, 36, 1, SAGE[0]);
      for (const dx of [123, 140]) { rect(x, dx, 36, 16, 18, SAGE[1]); rect(x, dx, 36, 16, 1, SAGE[0]); rect(x, dx, 36, 1, 18, SAGE[0]); rect(x, dx + 15, 37, 1, 17, SAGE[3]); rect(x, dx + (dx < 130 ? 13 : 2), 44, 1, 3, 'brass2'); }
      rect(x, 120, 55, 40, 2, 'wood4');
    };

    const sunlight = x => {
      for (let y = 80; y < 96; y++) {
        if (y === 87 || y === 88) continue;
        const x0 = Math.round(70 + (y - 80) * 0.6);
        rect(x, x0, y, 16, 1, SUN); rect(x, x0 + 19, y, 16, 1, SUN);
      }
    };

    const table = x => {
      shadow(x, 80, 78, 30, 3);
      for (const lx of [55, 102]) { rect(x, lx, 69, 4, 9, 'wood4'); rect(x, lx + 1, 69, 2, 8, 'wood2'); }
      // tablecloth: red gingham, a scalloped hem
      rect(x, 51, 57, 58, 13, 'roofR3');
      const gingham = (y0, y1, ch) => { for (let y = y0; y < y1; y++) for (let k = 52; k < 108; k += 3) { const r = Math.floor((y - y0) / ch) & 1, c = ((k - 52) / 3) & 1; rect(x, k, y, 3, 1, r && c ? 'rose' : r || c ? 'pink' : 'white'); } };
      gingham(58, 63, 2); rect(x, 52, 63, 56, 1, 'white'); gingham(64, 69, 3);
      for (let px = 52; px < 108; px += 4) { rect(x, px, 69, 3, 1, 'white'); dot(x, px + 1, 70, 'pink'); }
      // teapot, cup, vase of flowers
      x.drawImage(spr([
        '....hh.....',
        '...hccc....',
        '.hccccccc..',
        'hcccbcccccs',
        'ccccbbcccs.',
        'hccccccccs.',
        '.cccccccc..',
        '..dddddd...',
      ], { h: 'white', c: 'roofB0', b: 'blue', s: 'roofB1', d: 'roofB2' }, 'roofB3'), 55, 51);
      rect(x, 69, 58, 6, 3, 'cream0'); rect(x, 69, 58, 6, 1, 'white'); dot(x, 75, 59, 'cream2'); rect(x, 68, 61, 8, 1, 'cream2');
      rect(x, 97, 52, 7, 9, 'roofB2'); rect(x, 98, 52, 5, 8, 'sky2'); rect(x, 98, 52, 1, 8, 'white'); rect(x, 97, 51, 7, 1, 'roofB3');
      bush(x, 100, 47, 5, 4, ['grass1', 'leaf2', 'leaf3', 'leaf4']);
      for (const [fx, fy, c] of [[96, 43, 'yellow'], [100, 41, 'pink'], [103, 44, 'white'], [98, 46, 'rose'], [104, 40, 'yellow'], [94, 47, 'white']]) flower(x, fx, fy, c, c === 'white' ? 'yellow' : 'white');
    };

    const chair = x => {
      shadow(x, 19, 84, 10, 2);
      rect(x, 10, 57, 18, 4, 'wood4'); rect(x, 11, 58, 16, 1, 'wood0'); rect(x, 11, 59, 16, 1, 'wood2');
      for (const px of [10, 25]) { rect(x, px, 57, 3, 15, 'wood4'); rect(x, px + 1, 58, 1, 14, 'wood1'); }
      for (const px of [15, 19]) { rect(x, px, 61, 3, 8, 'wood4'); rect(x, px + 1, 61, 1, 8, 'wood1'); }
      rect(x, 8, 69, 22, 6, 'wood4'); rect(x, 9, 70, 20, 3, 'wood1'); rect(x, 9, 70, 20, 1, 'wood0'); rect(x, 9, 73, 20, 1, 'wood3');
      rect(x, 11, 68, 16, 3, 'rose'); rect(x, 11, 68, 16, 1, 'pink'); rect(x, 12, 70, 14, 1, 'roofR2');
      for (const px of [9, 26]) { rect(x, px, 75, 3, 9, 'wood4'); rect(x, px + 1, 75, 1, 8, 'wood2'); }
      rect(x, 12, 79, 14, 2, 'wood4'); rect(x, 12, 79, 14, 1, 'wood3');
    };

    const CURT = [0, 1, 1, 0, 0, -1, -1, 0];
    const bird = [spr(['..bb..', '.bbkb.', 'bbbbo.', '.rrb..', '..ww..'], { b: 'wood2', k: 'ink', o: 'brass2', r: 'orange', w: 'wood3' }),
      spr(['......', '..bb..', '.bbkb.', 'bbbbbo', '.rr.w.'], { b: 'wood2', k: 'ink', o: 'brass2', r: 'orange', w: 'wood3' })];
    const life = (x, t, still) => {
      const f = still ? 0 : Math.floor(t * 6);
      // a bird on the outside sill: sits, pecks, hops
      const bf = still ? 0 : f % 36, hop = bf >= 30 && bf < 33 ? 1 : 0;
      clip(x, WXL + 3, WYT + 3, WXR - WXL - 6, WYB - WYT - 6, () => x.drawImage(bird[bf >= 12 && bf < 18 ? 1 : 0], 66 + (bf >= 33 ? 2 : 0), 30 - hop));
      // curtains outside the frame, swaying at the hem
      for (const [cx, dir] of [[37, 1], [85, -1]]) {
        const s = still ? 0 : CURT[(f + (dir > 0 ? 0 : 3)) % 8];
        rect(x, cx, 4, 8, 24, 'cream0'); rect(x, cx + (dir > 0 ? 7 : 0), 4, 1, 24, 'cream2'); rect(x, cx + (dir > 0 ? 0 : 7), 4, 1, 24, 'white');
        rect(x, cx + 3, 5, 1, 22, 'cream1'); rect(x, cx + 1, 26, 6, 2, 'rose');
        rect(x, cx + s, 28, 8, 9, 'cream0'); rect(x, cx + s + 3, 29, 1, 8, 'cream1'); rect(x, cx + s + (dir > 0 ? 7 : 0), 28, 1, 9, 'cream2');
        for (let k = 0; k < 8; k += 2) rect(x, cx + s + k, 37, 1, 1, 'rose');
      }
      rect(x, 34, 3, 62, 1, 'wood3');
      // tea steam curling up from the spout
      const k = still ? 0.3 : Math.floor(t * 8) / 8;
      for (let i = 0; i < 3; i++) {
        const p = (k * 0.5 + i / 3) % 1, sx = 66 + Math.round(Math.sin(p * 7 + i) * 1.5 + p * 3), sy = 51 - Math.round(p * 14);
        if (p < 0.8) { rect(x, sx, sy, p < 0.4 ? 2 : 1, 1, 'white'); if (p < 0.5) dot(x, sx, sy - 1, 'cloud1'); }
      }
      // warm motes in the sunlight
      for (let i = 0; i < 7; i++) {
        const p = (k * 0.08 + i * 0.143) % 1, my = 40 + Math.round(p * 40), mx = 58 + i * 6 + Math.round((my - 40) * 0.6 + Math.sin(k + i) * 1.5);
        dot(x, mx, my, i % 3 ? 'light0' : 'light1');
      }
    };

    return scene('#fff0d4', anchors, [room, { add: sunlight }, { sort: [[78, table], [84, chair]] }, 'glow', { live: life }]);
  }

  const SCENES = { station, toyshop, darkroom, archive, lighthouse, desk, home };
  window.DIO = {
    names: Object.keys(SCENES),
    create(name) { const f = SCENES[name]; if (!f) throw new Error(`DIO.create: unknown scene '${name}'`); return f(); },
  };
})();
