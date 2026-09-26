'use strict';
/* Title lettering for "The Shop That Opens Once", hand-authored glyphs. The O of OPENS is a clock.
   TITLE.render(minutes) -> canvas (native art px); cached per minute value. */
(() => {
  const { PAL, canvas, outline } = PX;
  const BIG = {
    S: ['..########.', '.##########', '###.....###', '###.....###', '###........', '####.......', '.########..', '..########.', '.......####', '........###', '###.....###', '###.....###', '###.....###', '.##########', '..########.'],
    H: ['###.....###', '###.....###', '###.....###', '###.....###', '###.....###', '###.....###', '###########', '###########', '###########', '###.....###', '###.....###', '###.....###', '###.....###', '###.....###', '###.....###'],
    O: ['...######...', '.##########.', '.###....###.', '###......###', '###......###', '###......###', '###......###', '###......###', '###......###', '###......###', '###......###', '###......###', '.###....###.', '.##########.', '...######...'],
    P: ['#########..', '##########.', '###....####', '###.....###', '###.....###', '###....####', '##########.', '#########..', '###........', '###........', '###........', '###........', '###........', '###........', '###........'],
    E: ['##########', '##########', '###.......', '###.......', '###.......', '###.......', '########..', '########..', '###.......', '###.......', '###.......', '###.......', '###.......', '##########', '##########'],
    N: ['####.....###', '#####....###', '######...###', '###.##...###', '###.###..###', '###..##..###', '###..###.###', '###...##.###', '###...######', '###....#####', '###....#####', '###.....####', '###.....####', '###......###', '###......###'],
    C: ['...#######.', '.##########', '.###....###', '###......##', '###........', '###........', '###........', '###........', '###........', '###........', '###........', '###......##', '.###....###', '.##########', '...#######.'],
  };
  const SMALL = {
    T: ['#######', '#######', '..##...', '..##...', '..##...', '..##...', '..##...', '..##...', '..##...'],
    H: ['##...##', '##...##', '##...##', '##...##', '#######', '##...##', '##...##', '##...##', '##...##'],
    E: ['######', '##....', '##....', '##....', '#####.', '##....', '##....', '##....', '######'],
    A: ['..##...', '.####..', '##..##.', '##..##.', '##..##.', '######.', '##..##.', '##..##.', '##..##.'],
  };
  const FACE = [PAL.cream0, PAL.light1, PAL.light2]; // top, middle, bottom bands

  // Letter face: warm cream -> gold bands, white rim-light on top/left edges.
  function face(rows) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length)), [c, x] = canvas(w, h);
    const on = (i, j) => j >= 0 && j < h && rows[j][i] === '#';
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!on(i, j)) continue;
      const band = j < h * 0.34 ? 0 : j < h * 0.67 ? 1 : 2;
      x.fillStyle = !on(i, j - 1) || !on(i - 1, j) ? '#ffffff' : FACE[band];
      x.fillRect(i, j, 1, 1);
    }
    return c;
  }

  // Clock face in place of an O: brass rim, cream dial, four ticks, hands from `minutes`.
  function clock(minutes, size = 17) {
    const [c, x] = canvas(size, size), r = size / 2, cx = (size - 1) / 2, cy = (size - 1) / 2;
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const d = Math.hypot(i - cx, j - cy);
      if (d > r - 0.2) continue;
      x.fillStyle = d > r - 2.2 ? (j < cy ? PAL.brass1 : PAL.brass2) : j < cy - 3 && i < cx ? '#ffffff' : PAL.cream0;
      x.fillRect(i, j, 1, 1);
    }
    x.fillStyle = PAL.brass3; // 12, 3, 6, 9 ticks
    [[cx, 3], [size - 4, cy], [cx, size - 4], [3, cy]].forEach(([i, j]) => x.fillRect(Math.round(i), Math.round(j), 1, 1));
    const m = ((minutes % 720) + 720) % 720, hA = (m / 720) * Math.PI * 2, mA = ((m % 60) / 60) * Math.PI * 2;
    const end = (a, len) => [cx + Math.sin(a) * len, cy - Math.cos(a) * len];
    const [hx, hy] = end(hA, 3.6), [mx, my] = end(mA, 5.6);
    PX.line(x, cx, cy, hx, hy, PAL.ink); PX.line(x, cx + 1, cy, hx + 1, hy, PAL.ink); // 2px hour hand
    PX.line(x, cx, cy, mx, my, PAL.ink);
    return c;
  }

  const cache = new Map();
  function render(minutes = 18 * 60 + 17) {
    if (cache.has(minutes)) return cache.get(minutes);
    const gap = 2, wordGap = 6, lineGap = 9, pad = 6;
    const glyphs = (txt, set, clockAt = -1) => [...txt].map((ch, i) => (ch === ' ' ? null : i === clockAt ? Object.assign(clock(minutes), { dy: 1 }) : face(set[ch])));
    const width = gs => gs.reduce((w, g) => w + (g ? g.width : wordGap) + gap, -gap);
    const l1s = glyphs('THE', SMALL), l1b = glyphs('SHOP', BIG), l2s = glyphs('THAT', SMALL), l2b = glyphs('OPENS ONCE', BIG, 0);
    const w1 = width(l1s) + wordGap + width(l1b), w2 = width(l2s) + wordGap + width(l2b);
    const W = Math.max(w1, w2), bigH = 15;
    const [txt, tx] = canvas(W, bigH * 2 + lineGap + 1);
    const place = (gs, x0, base) => { let x = x0; gs.forEach(g => { if (g) { tx.drawImage(g, x, base - g.height + (g.dy || 0)); x += g.width + gap; } else x += wordGap + gap; }); return x; };
    let x = Math.round((W - w1) / 2); x = place(l1s, x, bigH); place(l1b, x + wordGap - gap, bigH);
    x = Math.round((W - w2) / 2); x = place(l2s, x, bigH * 2 + lineGap); place(l2b, x + wordGap - gap, bigH * 2 + lineGap);

    // ink outline -> 4px terracotta extrusion -> outline the whole block -> soft cream halo.
    const inked = outline(txt, PAL.ink);
    const depth = 4, [ex, ey] = canvas(inked.width, inked.height + depth);
    const sil = (col) => { const [s, sx] = canvas(inked.width, inked.height); sx.drawImage(inked, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = col; sx.fillRect(0, 0, s.width, s.height); return s; };
    const deep = sil(PAL.roofR3), mid = sil(PAL.roofR2);
    for (let d = depth; d >= 1; d--) ey.drawImage(d === depth ? deep : d >= depth - 1 ? deep : mid, 0, d);
    ey.drawImage(inked, 0, 0);
    const block = outline(outline(ex, PAL.ink), PAL.cream0);
    const [out, ox] = canvas(block.width + pad * 2, block.height + pad * 2);
    ox.drawImage(block, pad, pad);
    cache.set(minutes, out);
    return out;
  }
  window.TITLE = { render, clock };
})();
