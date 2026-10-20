'use strict';
/* Interiors, props, keepsake items and UI icons for "The Shop That Opens Once" (v2).
   Every pixel is authored here in code on top of px.js (no image files).
   window.IT        = { item(name, size, variant), icon(name) }   ART.md items contract */
(() => {
  const P = PX.PAL;
  const { canvas, sprite, rect, dot, line, ellipse, text, textWidth, rng } = PX;
  const C = c => PX.col(c);

  // An extra colour for this module: the lilac ramp's highlight.
  const X = { lil0: '#e6dbff' };

  /* ---------------------------------------------------------------- helpers */
  const S = (str, key) => sprite(str.trim().split('\n').map(r => r.trim()), key);
  function silhouette(src, color) {
    const [c, x] = canvas(src.width, src.height);
    x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = C(color); x.fillRect(0, 0, c.width, c.height);
    return c;
  }
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
  // Pointed lens (leaf / ear) from a base point along an angle, filled at pixel centres.
  function lens(x, bx, by, ang, L, Wd, c, pow = 0.75) {
    const ca = Math.cos(ang), sa = Math.sin(ang), R0 = Math.ceil(L) + 2;
    x.fillStyle = C(c);
    for (let j = Math.floor(by - R0); j <= by + R0; j++) for (let i = Math.floor(bx - R0); i <= bx + R0; i++) {
      const dx = i + 0.5 - bx, dy = j + 0.5 - by, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      if (u < 0.5 || u > L) continue;
      if (Math.abs(v) <= Wd * Math.pow(Math.sin(Math.PI * Math.pow(u / L, pow)), 0.8) + 0.25) x.fillRect(i, j, 1, 1);
    }
  }
  // Engrave a 1-bit glyph map: groove pixels in `groove`, lit lip below-right in `lip`.
  function engrave(x, rows, px, py, groove, lip) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') { const nb = (rows[j + 1] || '')[i + 1] === '#'; if (!nb) dot(x, px + i + 1, py + j + 1, lip); } });
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') dot(x, px + i, py + j, groove); });
  }
  // Scaled sign text (each font pixel becomes an s x s block).
  function bigText(x, s, px, py, c, k) {
    const w = textWidth(s), [tc, tx] = canvas(w, 5); text(tx, s, 0, 0, c);
    x.imageSmoothingEnabled = false; x.drawImage(tc, 0, 0, w, 5, Math.round(px), Math.round(py), w * k, 5 * k);
    return w * k;
  }

  /* ================================================================ ITEMS & ICONS (filled below) */
  const itemCache = new Map();
  function item(name, size = 'sm', variant) {
    const key = name + '|' + size + '|' + (variant || '');
    let c = itemCache.get(key);
    if (!c) { const f = (size === 'lg' ? LG : size === 'xs' ? XS : SM)[name]; if (!f) throw new Error(`IT.item: no ${size} ${name}`); c = f(variant); itemCache.set(key, c); }
    return c;
  }
  const SM = {}, LG = {}, XS = {};
  const iconCache = new Map();
  function icon(name) {
    let c = iconCache.get(name);
    if (!c) { const f = ICONS[name]; if (!f) throw new Error('IT.icon: unknown icon ' + name); c = f(); iconCache.set(name, c); }
    return c;
  }
  const ICONS = {};

  /* ================================================================ SMALL ITEMS (12-16 px, hand-authored) */
  const BR = { o: 'brass4', a: 'brass0', b: 'brass1', c: 'brass2', d: 'brass3' };
  SM.watch = (v = 'front') => {
    if (v === 'side') return S(`
      .ooo.
      o...o
      .ooo.
      .obo.
      .ooo.
      .oao.
      oabco
      oabco
      oabdo
      oabdo
      oabdo
      oabdo
      oabdo
      oacdo
      .ocd.
      .ooo.`, BR);
    const [c, x] = canvas(13, 16);
    disc(x, 6.5, 9.5, 6.5, (d, lit) => d > 5.6 ? 'brass4' : v === 'back' ? (d > 3.9 && d < 4.8 ? 'brass3' : lit > 0.45 ? 'brass0' : lit > -0.25 ? 'brass1' : 'brass2')
      : d > 4.4 ? (lit > 0.5 ? 'brass0' : lit > 0 ? 'brass1' : lit > -0.5 ? 'brass2' : 'brass3') : d > 3.7 ? 'brass3' : (d > 2.6 && lit > 0.4 ? 'cream2' : 'cream0'));
    x.drawImage(S(`
      .ooo.
      o...o
      .ooo.
      .obo.`, BR), 4, 0);
    if (v === 'back') { rect(x, 4, 8, 2, 1, 'brass3'); dot(x, 4, 9, 'brass3'); dot(x, 5, 9, 'brass3'); rect(x, 7, 8, 3, 1, 'brass3'); dot(x, 8, 9, 'brass3'); dot(x, 8, 10, 'brass3'); dot(x, 4, 10, 'brass3'); dot(x, 5, 10, 'brass3'); }
    else { line(x, 6, 9, 9, 10, 'ink2'); line(x, 6, 9, 4, 8, 'ink2'); dot(x, 6, 9, 'brass3'); dot(x, 4, 7, 'white'); }   // 10:17
    return c;
  };
  SM.letter = () => S(`
    oooooooooooooo
    owWWWWWWWWWWwo
    owfWWWWWWWWfwo
    owwfWWWWWWfwwo
    owwwfWWWWfwwwo
    owwwwfrrfwwwwo
    owwwwrRRrwwwwo
    owwwwwrrwwwwwo
    owwwwwwwwwwwwo
    oooooooooooooo`, { o: 'dirt4', w: 'cream1', W: 'cream0', f: 'cream2', r: 'roofR2', R: 'rose' });
  SM.parcel = () => S(`
    ...oooooooooo.
    ..oaaattaaaaoo
    .oaaaattaaaoco
    oooooottooooco
    obbbbbttbbbocco
    obbbbbttbbboco
    obbwwwwbbbboco
    obbwkkwbbbboco
    obbwwwwbbbbocO
    obbbbbttbbboo.
    oooooooooooo..`.split('\n').map(s => s.trim().slice(0, 14)).join('\n'), { o: 'dirt4', a: 'dirt1', b: 'dirt2', c: 'dirt3', t: 'cream0', w: 'cream0', k: 'stone3', O: 'dirt4' });
  // A village letter for the day's rounds: a plain envelope, two lines of address, a leaf stamp in its corner
  SM.post = () => S(`
    oooooooooooooo
    owwwwwwwwwssso
    owwwwwwwwwsgso
    owwwwwwwwwssso
    owwwwwwwwwwwwo
    owwwkkkkkkwwwo
    owwwwwwwwwwwwo
    owwwkkkkkwwwwo
    owwwwwwwwwwwwo
    oooooooooooooo`, { o: 'dirt4', w: 'cream0', k: 'stone2', s: 'roofB2', g: 'leaf3' });
  /* ================================================================ HELD ITEMS (xs, 7-10 px, for ant hands) */
  XS.watch = (v = 'front') => {
    const key = { o: 'brass4', a: 'brass0', b: 'brass1', c: 'brass2', d: 'brass3', f: 'cream0', k: 'ink2' };
    if (v === 'side') return sprite(['.o.', '.o.', 'obo', 'oac', 'oac', 'oac', 'oac', '.o.'], key);
    const f = v === 'back' ? ['bbb', 'bdb', 'bbb'] : ['kff', 'fkk', 'fff'];   // front: hands at 10:17
    return sprite(['..ooo..', '..obo..', '.oaabo.', `oa${f[0]}co`, `oa${f[1]}co`, `oa${f[2]}co`, '.obcco.', '..ooo..'], key);
  };
  XS.letter = () => S(`
    ooooooooo
    owfwwwfwo
    owwfwfwwo
    owwwrwwwo
    owwwwwwwo
    ooooooooo`, { o: 'dirt4', w: 'cream0', f: 'cream2', r: 'red' });
  XS.post = () => S(`
    ooooooooo
    owwwwwsso
    owwwwwsgo
    owkkkkwwo
    owwkkkwwo
    ooooooooo`, { o: 'dirt4', w: 'cream0', k: 'stone2', s: 'roofB2', g: 'leaf3' });
  XS.parcel = () => S(`
    oooooooo
    oaaataao
    obbbtbbo
    otttttto
    obbbtbbo
    obwwtbco
    oooooooo`, { o: 'dirt4', a: 'dirt1', b: 'dirt2', c: 'dirt3', t: 'dirt0', w: 'cream0' });

  /* ================================================================ LARGE ITEMS (40-48 px, inspect view and showcase) */
  const brassLit = lit => lit > 0.55 ? 'brass0' : lit > 0.05 ? 'brass1' : lit > -0.5 ? 'brass2' : 'brass3';
  LG.watch = (v = 'front') => {
    if (v === 'side') {
      const [c, x] = canvas(12, 48);
      // bow seen edge-on, crown, then the thin case (lens-shaped profile)
      rect(x, 4, 0, 4, 9, 'brass4'); rect(x, 5, 1, 2, 7, 'brass1'); dot(x, 5, 1, 'brass0');
      rect(x, 3, 8, 6, 5, 'brass4'); for (let i = 4; i < 8; i++) rect(x, i, 9, 1, 3, i % 2 ? 'brass2' : 'brass0');
      for (let j = 12; j < 48; j++) {
        const u = (j - 11.5) / 36, half = 1.2 + 3.6 * Math.pow(Math.sin(Math.PI * u), 0.55), a = Math.round(6 - half), b = Math.round(6 + half);
        rect(x, a, j, b - a, 1, 'brass4');
        if (b - a > 2) { rect(x, a + 1, j, 1, 1, 'brass0'); rect(x, a + 2, j, Math.max(0, b - a - 4), 1, 'brass1'); rect(x, b - 2, j, 1, 1, 'brass3'); }
        if (b - a > 4) dot(x, 6, j, 'brass2');
      }
      return c;
    }
    const [c, x] = canvas(44, 48), cx = 22, cy = 29, R = 18.5;
    // bow ring and knurled crown
    disc(x, 22, 5.5, 5.5, (d, lit) => d < 2.6 ? null : d > 4.7 || d < 3.3 ? 'brass4' : brassLit(lit));
    rect(x, 18, 9, 9, 6, 'brass4'); for (let i = 19; i < 26; i++) rect(x, i, 10, 1, 4, i % 2 ? 'brass2' : 'brass0'); rect(x, 19, 10, 7, 1, 'brass0');
    if (v === 'back') {
      disc(x, cx, cy, R, (d, lit) => d > R - 0.9 ? 'brass4' : d > R - 3 ? brassLit(lit) : d > R - 3.8 ? 'brass3'
        : (Math.abs(d - 11.5) < 0.5 ? 'brass3' : Math.abs(d - 12.4) < 0.5 && lit < 0.2 ? 'brass0' : lit > 0.6 && d > 5 && d < 10 ? 'brass0' : lit > -0.2 ? 'brass1' : 'brass2'));
      // ornament dots on the engraved ring, and Marcus Bell's monogram M.B. engraved in the centre
      for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; dot(x, Math.round(cx + Math.cos(a) * 13.9), Math.round(cy + Math.sin(a) * 13.9), 'brass3'); }
      engrave(x, [
        '#...#....###....',
        '##.##....#..#...',
        '#.#.#....#..#...',
        '#...#....###....',
        '#...#....#..#...',
        '#...#.##.#..#.##',
        '#...#.##.###..##'], cx - 8, cy - 4, 'brass4', 'brass0');
      rect(x, cx - 7, cy + 5, 14, 1, 'brass3'); dot(x, cx - 8, cy + 4, 'brass3'); dot(x, cx + 7, cy + 4, 'brass3');
      return c;
    }
    disc(x, cx, cy, R, (d, lit) => d > R - 0.9 ? 'brass4' : d > R - 3 ? brassLit(lit) : d > R - 3.8 ? 'brass3'
      : d > R - 6 && lit > 0.35 ? 'cream2' : d > R - 7 && lit > 0.05 ? 'cream1' : 'cream0');
    // hour ticks and numerals
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * Math.PI * 2, s = Math.sin(a), co = -Math.cos(a);
      if (h % 3) line(x, cx + s * 12.2, cy + co * 12.2, cx + s * 13.4, cy + co * 13.4, 'wood3');
    }
    text(x, '12', cx - 3, cy - 12, 'ink2'); text(x, '6', cx - 1, cy + 8, 'ink2'); text(x, '3', cx + 9, cy - 2, 'ink2'); text(x, '9', cx - 11, cy - 2, 'ink2');
    // hands at 10:17, when it stopped
    const am = (17 / 60) * Math.PI * 2, ah = ((10 + 17 / 60) / 12) * Math.PI * 2;
    const mx = Math.round(cx + Math.sin(am) * 11), my = Math.round(cy - Math.cos(am) * 11), hx = Math.round(cx + Math.sin(ah) * 7), hy = Math.round(cy - Math.cos(ah) * 7);
    line(x, cx, cy, mx, my, 'ink2'); line(x, cx, cy + 1, mx, my, 'ink2');
    line(x, cx, cy, hx, hy, 'ink2'); line(x, cx + 1, cy, hx + 1, hy, 'ink2');
    rect(x, cx - 1, cy - 1, 3, 3, 'brass3'); dot(x, cx, cy, 'brass0');
    // glass glint (kept clear of the numerals)
    line(x, cx - 8, cy - 7, cx - 5, cy - 10, 'white'); line(x, cx - 7, cy - 5, cx - 6, cy - 6, 'white');
    return c;
  };
  LG.parcel = () => {
    const [c, x] = canvas(44, 40);
    // 3/4 box: top, front and right side faces
    poly(x, [[2, 10], [12, 2], [42, 2], [32, 10]], 'dirt4'); poly(x, [[4, 10], [13, 3], [40, 3], [31, 10]], 'dirt1');
    rect(x, 2, 10, 31, 28, 'dirt4'); rect(x, 3, 11, 29, 26, 'dirt2'); rect(x, 3, 11, 29, 1, 'dirt1');
    poly(x, [[33, 10], [42, 2], [42, 30], [33, 38]], 'dirt4'); poly(x, [[33, 11], [41, 4], [41, 30], [33, 37]], 'dirt3');
    // tape along the top seam and down the front
    poly(x, [[12, 10], [21, 3], [27, 3], [18, 10]], 'dirt0'); poly(x, [[14, 10], [22, 3], [23, 3], [15, 10]], 'white');
    rect(x, 12, 10, 6, 28, 'dirt0'); rect(x, 13, 10, 1, 27, 'white'); rect(x, 17, 10, 1, 27, 'dirt1');
    rect(x, 3, 11, 29, 1, 'dirt1');
    // address label (blank) and a red stamp
    rect(x, 20, 20, 11, 9, 'dirt3'); rect(x, 21, 21, 9, 7, 'cream0'); rect(x, 22, 23, 6, 1, 'stone2'); rect(x, 22, 25, 4, 1, 'stone2');
    rect(x, 5, 30, 5, 5, 'roofR2'); rect(x, 6, 31, 3, 3, 'rose'); dot(x, 7, 32, 'roofR2');
    // string tied round the box
    rect(x, 3, 22, 9, 1, 'wood3'); rect(x, 18, 22, 2, 1, 'wood3'); line(x, 33, 22, 41, 15, 'wood3');
    return c;
  };
  LG.post = () => {
    const [c, x] = canvas(44, 30);
    x.drawImage(bevel(mask(44, 30, g => rect(g, 1, 2, 42, 27, '#000')), ENVELOPE, 1, 2), 0, 0);
    // the stamp in its corner, perforated, a leaf on blue, and the postmark's rings half over it
    rect(x, 32, 5, 8, 9, 'cream0'); for (let i = 32; i < 40; i += 2) { dot(x, i, 5, 'cream2'); dot(x, i, 13, 'cream2'); }
    rect(x, 33, 6, 6, 7, 'roofB2'); rect(x, 34, 7, 4, 5, 'roofB1'); dot(x, 36, 8, 'leaf2'); dot(x, 35, 9, 'leaf3'); dot(x, 36, 9, 'leaf3'); dot(x, 36, 10, 'leaf4');
    for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; dot(x, Math.round(30 + Math.cos(t) * 4), Math.round(11 + Math.sin(t) * 4), 'roofB3'); }
    // the address, in a careful hand
    rect(x, 9, 15, 20, 1, 'stone2'); rect(x, 9, 18, 16, 1, 'stone2'); rect(x, 9, 21, 18, 1, 'stone2');
    rect(x, 3, 26, 38, 1, 'cream1');
    return c;
  };
  /* ================================================================ SATRIA'S OWN THINGS (the prologue's bag) and what the villagers carry */
  // Valdo's draft sale contract: a thick manila folder, the agreement's top sheet clipped to it, a red company stamp.
  SM.contract = () => S(`
    ..ooooo.......
    .oaaaaao......
    oooooooooooooo
    oaWWWWWWWWWWao
    oaWkkkkkkWWWao
    oaWWWWWWWWWWao
    oaWkkkkkkkWWao
    oaWkkkkWWWWWao
    oaWWWWWWWrrWao
    oaWWWWWWWrrWao
    obbbbbbbbbbbbo
    oooooooooooooo`, { o: 'dirt4', a: 'dirt1', b: 'dirt2', W: 'cream0', k: 'stone2', r: 'red' });
  LG.contract = () => {
    const [c, x] = canvas(44, 40);
    // the folder: its tab, back and front cover peeking out under the sheets
    rect(x, 3, 2, 14, 5, 'dirt4'); rect(x, 4, 3, 12, 4, 'dirt1');
    const folder = mask(44, 40, g => rect(g, 1, 5, 42, 34, '#000'));
    x.drawImage(bevel(folder, { o: 'dirt4', ol: 'dirt3', h: 'dirt0', b: 'dirt1', s: 'dirt2' }, 1, 2), 0, 0);
    // a thick stack of sheets, the top one typed
    for (const k of [3, 2, 1]) rect(x, 4 + k, 7 + k, 34, 29, k > 1 ? 'cream2' : 'cream1');
    rect(x, 4, 7, 34, 29, 'cream0'); rect(x, 4, 7, 34, 1, 'white');
    text(x, 'DRAFT', 8, 10, 'ink2'); rect(x, 8, 16, 26, 1, 'stone3');
    for (const [y, w] of [[19, 26], [21, 22], [23, 25], [25, 18], [27, 24]]) rect(x, 8, y, w, 1, 'stone2');
    rect(x, 8, 32, 12, 1, 'ink2');   // the line to sign on, still empty
    // the firm's red stamp and a paper clip
    disc(x, 31, 31, 4, d => d > 3.2 ? 'roofR3' : d > 2 ? 'red' : 'cream0'); dot(x, 30, 30, 'red'); dot(x, 32, 31, 'red');
    rect(x, 30, 4, 3, 9, 'stone3'); rect(x, 31, 5, 1, 7, 'stone1'); rect(x, 29, 6, 1, 6, 'stone3');
    return c;
  };

  // The courier's coin purse: a leather pouch on a drawstring, a coin showing at its mouth.
  SM.purse = () => S(`
    ....o..o......
    ...o.oo.o.....
    ...oooooo.....
    ..oyyccco.....
    .oaaaaaaao....
    oaabbbbbbbo...
    oabbbbbbbco...
    oabbbbbbbco...
    oabbbbbbcco...
    .occcccccco...
    ..oooooooo....`, { o: 'wood4', a: 'wood1', b: 'wood2', c: 'wood3', y: 'brass1' });
  LG.purse = () => {
    const [c, x] = canvas(40, 40);
    // the drawstring, tied in a bow above the gathered neck
    line(x, 14, 4, 20, 10, 'wood4'); line(x, 26, 4, 20, 10, 'wood4'); line(x, 15, 4, 19, 9, 'wood2'); line(x, 25, 4, 21, 9, 'wood2');
    const bag = mask(40, 40, g => { rect(g, 13, 10, 14, 6, '#000'); g.beginPath(); g.ellipse(20, 26, 15, 12, 0, 0, Math.PI * 2); g.fill(); });
    x.drawImage(bevel(bag, { o: 'wood5', ol: 'wood4', h: 'wood1', b: 'wood2', s: 'wood3' }, 1, 2), 0, 0);
    for (let i = 14; i < 27; i += 3) rect(x, i, 11, 1, 5, 'wood3');   // gathers at the neck
    rect(x, 12, 15, 16, 2, 'wood4'); rect(x, 13, 15, 14, 1, 'wood3');
    // a few coins showing at the mouth, a stitched seam
    for (const [cx, cy] of [[16, 13], [21, 12], [24, 14]]) disc(x, cx, cy, 2.5, (d, lit) => d > 1.8 ? 'brass3' : lit > 0.3 ? 'brass0' : 'brass1');
    for (let i = 10; i < 31; i += 3) dot(x, i, 30, 'wood4');
    return c;
  };

  // A spare city shirt, folded: pale blue cotton, its collar and buttons up.
  SM.shirt = () => S(`
    ...oo..oo.....
    .ooWWooWWoo...
    oaaaWWWWaaao..
    oaaaaWWaaaaao.
    oaaaaayaaaaao.
    oaaaaaaaaaaao.
    oaaaaayaaaaao.
    oaaaaaaaaaabo.
    oaaaaayaaaabo.
    obbbbbbbbbbbo.
    ooooooooooooo.`, { o: 'roofB4', a: 'sky1', b: 'sky2', W: 'white', y: 'stone2' });
  LG.shirt = () => {
    const [c, x] = canvas(44, 38);
    const body = mask(44, 38, g => rect(g, 2, 6, 40, 30, '#000'));
    x.drawImage(bevel(body, { o: 'roofB4', ol: 'roofB3', h: 'white', b: 'sky1', s: 'sky2' }, 1, 2), 0, 0);
    // the collar: two white points either side of the placket, folded down
    poly(x, [[14, 4], [22, 6], [22, 13], [13, 9]], 'white'); poly(x, [[30, 4], [22, 6], [22, 13], [31, 9]], 'cream0');
    line(x, 14, 4, 22, 13, 'stone2'); line(x, 30, 4, 22, 13, 'stone2');
    rect(x, 21, 13, 3, 22, 'sky2'); for (let y = 16; y < 34; y += 5) { rect(x, 21, y, 2, 2, 'stone1'); dot(x, 21, y, 'white'); }
    // the fold lines of the sleeves tucked behind, a breast pocket
    rect(x, 7, 8, 1, 26, 'sky2'); rect(x, 36, 8, 1, 26, 'sky2'); rect(x, 26, 17, 8, 7, 'sky2'); rect(x, 26, 17, 8, 1, 'white');
    return c;
  };

  // Pak Baker's ginger biscuit, warm from the oven: a round cracked top dusted with sugar.
  SM.biscuit = () => S(`
    ...oooooo...
    ..oaaaaaao..
    .oaaWbaaaao.
    oaaabbaWaaco
    oaWaaabbaaco
    oaaaWaaabaco
    oaaaaaWaaaco
    .oaaaaaaacco
    ..occccccco.
    ...oooooo...`, { o: 'dirt4', a: 'dirt1', b: 'dirt3', c: 'dirt2', W: 'cream0' });
  XS.biscuit = () => S(`
    .oooo.
    oaWaao
    oabaWo
    oaaWco
    .oooo.`, { o: 'dirt4', a: 'dirt1', b: 'dirt3', c: 'dirt2', W: 'cream0' });
  LG.biscuit = () => {
    const [c, x] = canvas(40, 40);
    disc(x, 20, 21, 16, (d, lit) => d > 15 ? 'dirt4' : d > 13.5 ? (lit > 0 ? 'dirt3' : 'dirt4') : lit > 0.5 ? 'dirt1' : lit > -0.4 ? 'dirt2' : 'dirt3');
    // the cracks of a well-risen top, and sugar caught in them
    for (const pts of [[[9, 18], [15, 20], [19, 17], [24, 21]], [[17, 27], [22, 25], [28, 28]], [[24, 12], [27, 16], [31, 15]]])
      for (let i = 1; i < pts.length; i++) line(x, ...pts[i - 1], ...pts[i], 'dirt4');
    for (const [a, b] of [[12, 14], [26, 19], [16, 24], [29, 25], [21, 31], [11, 24], [20, 11], [25, 30]]) dot(x, a, b, 'cream0');
    for (const [a, b] of [[14, 13], [27, 23], [19, 29]]) dot(x, a, b, 'white');
    return c;
  };

  // Night 1's watch through the day: as it comes out of the box its back is burnt black with soot (scorched); the
  // damar oil lifts it to show the M.B. (the plain back); set going, its back opens on Marcus's words to Helen (open).
  // watch_clean and watch_ticking are the same watch at its later states, so each state has its own bag entry.
  const soot = src => {
    const [c, x] = canvas(src.width, src.height), w = src.width, h = src.height;
    x.drawImage(src, 0, 0);
    const d = x.getImageData(0, 0, w, h).data, on = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 0;
    const n = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
    const k = w > 20 ? 3 : 2, top = Math.round(h * 0.3);
    // soot in clots, the case's rim still showing brass through it in places
    for (let j = top; j < h; j++) for (let i = 0; i < w; i++) {
      if (!on(i, j) || !on(i - 1, j) || !on(i + 1, j) || !on(i, j - 1) || !on(i, j + 1)) continue;
      const v = n(Math.floor(i / k), Math.floor(j / k)) * 0.7 + n(i, j) * 0.3;
      if (v < 0.78) dot(x, i, j, v < 0.4 ? 'ink2' : v < 0.62 ? 'stone4' : 'dirt4');
    }
    return c;
  };
  for (const T of [LG, SM, XS]) {
    const base = T.watch;
    T.watch = (v = 'front') => v === 'scorched' ? soot(base('back')) : v === 'open' ? (T === LG ? openBack() : base('back')) : base(v);
    T.watch_clean = T.watch_ticking = T.watch;
  }
  // The back swung open: the inside of the lid, engraved FOR HELEN over the lines of Marcus's message, signed M.
  function openBack() {
    const [c, x] = canvas(44, 48), cx = 22, cy = 29, R = 18.5;
    disc(x, 22, 5.5, 5.5, (d, lit) => d < 2.6 ? null : d > 4.7 || d < 3.3 ? 'brass4' : brassLit(lit));
    rect(x, 18, 9, 9, 6, 'brass4'); for (let i = 19; i < 26; i++) rect(x, i, 10, 1, 4, i % 2 ? 'brass2' : 'brass0');
    disc(x, cx, cy, R, (d, lit) => d > R - 0.9 ? 'brass4' : d > R - 2.5 ? brassLit(lit) : d > R - 3.3 ? 'brass3' : lit > 0.5 && d > 9 ? 'brass0' : 'brass1');
    text(x, 'FOR', cx - 5, cy - 11, 'brass4'); text(x, 'HELEN', cx - 9, cy - 5, 'brass4');
    for (const [y, w] of [[2, 22], [5, 18], [8, 20]]) for (let i = 0; i < w; i += 3) rect(x, cx - (w >> 1) + i, cy + y, 2, 1, 'brass3');
    text(x, '-M.', cx + 2, cy + 11, 'brass4');
    line(x, cx - 12, cy - 13, cx - 9, cy - 16, 'white');
    return c;
  }

  // Mr Baker's sweet bread, warm, for Arlo: a round glazed bun with a split top and sugar on it.
  XS.bread = () => S(`
    .oooo.
    oabbao
    oaWbco
    .occo.`, { o: 'dirt4', a: 'orange', b: 'light2', c: 'roofR3', W: 'cream0' });
  SM.bread = () => S(`
    ...oooooo...
    ..oabbbbao..
    .oabWbbWbbo.
    oabbbccbbbco
    oabWbcWcbbco
    oabbbbbbbbco
    .occcccccco.
    ..oooooooo..`, { o: 'dirt4', a: 'light1', b: 'orange', c: 'roofR3', W: 'cream0' });
  LG.bread = () => {
    const [c, x] = canvas(40, 36);
    // a domed bun on its darker baked foot, lit from the top left, glazed, split along its top and sugared
    ellipse(x, 20, 26, 16, 7, 'dirt4'); ellipse(x, 20, 25, 15, 6, 'roofR3');
    disc(x, 20, 19, 14, (d, lit, dx, dy) => { const l = Math.hypot(dx + 5, dy + 6); return d > 13 ? 'dirt4' : l < 5 ? 'light0' : l < 10 ? 'light1' : l < 17 ? 'orange' : 'roofR2'; });
    line(x, 11, 19, 29, 15, 'roofR3'); line(x, 12, 20, 28, 16, 'cream0');
    for (const [a, b] of [[16, 9], [23, 10], [27, 20], [11, 24], [19, 25], [25, 25]]) { dot(x, a, b, 'white'); dot(x, a + 1, b, 'cream0'); }
    return c;
  };
  // Arlo's damar oil: a little bottle of amber resin oil, corked, string round its neck and a tag.
  XS.damar_oil = () => S(`
    .oo.
    .oo.
    oaao
    obco
    oooo`, { o: 'dirt4', a: 'light2', b: 'orange', c: 'roofR3' });
  SM.damar_oil = () => S(`
    ...oo....
    ..obbo...
    ..oooo...
    ..oyyo...
    .oaWaao..
    oaWabbco.
    oabbbbcoo
    oabbbbcoW
    oabbbbco.
    .occcco..
    ..oooo...`, { o: 'dirt4', a: 'light1', b: 'orange', c: 'roofR3', y: 'cream2', W: 'cream0' });
  LG.damar_oil = () => {
    const [c, x] = canvas(32, 44);
    rect(x, 12, 2, 8, 6, 'wood4'); rect(x, 13, 2, 6, 5, 'dirt2'); rect(x, 13, 2, 6, 1, 'dirt1');
    rect(x, 11, 8, 10, 3, 'dirt4'); rect(x, 12, 9, 8, 1, 'cream2');
    disc(x, 16, 28, 11, (d, lit) => d > 10 ? 'dirt4' : lit > 0.6 && d > 5 ? 'light0' : lit > 0 ? 'light2' : lit > -0.5 ? 'orange' : 'roofR3');
    rect(x, 13, 11, 6, 7, 'light2'); rect(x, 12, 11, 1, 7, 'dirt4'); rect(x, 19, 11, 1, 7, 'dirt4');
    line(x, 20, 10, 26, 18, 'cream2'); rect(x, 24, 18, 7, 9, 'cream0'); rect(x, 24, 18, 7, 1, 'cream2'); for (const y of [21, 23]) rect(x, 25, y, 5, 1, 'stone2');
    line(x, 9, 22, 11, 19, 'white');
    return c;
  };
  // The Mender's oil lantern for the dark platform: an iron frame round its glass, a wire handle, the wick low.
  XS.oil_lantern = () => S(`
    .oo.
    o..o
    oooo
    oabo
    oabo
    oooo`, { o: 'iron4', a: 'cream0', b: 'light2' });
  SM.oil_lantern = () => S(`
    ...ooo...
    ..o...o..
    ..o...o..
    ..ooooo..
    .ooiiioo.
    .oaWbbco.
    .oabldco.
    .oabddco.
    .oaaaaco.
    .ooiiioo.
    oiiiiiiio
    ooooooooo`, { o: 'iron4', i: 'iron2', a: 'cream0', b: 'cream1', c: 'cream2', W: 'white', l: 'light1', d: 'orange' });
  LG.oil_lantern = () => {
    const [c, x] = canvas(32, 46);
    // wire handle and its ring, the cap, the glass chimney between four iron bars with the flame low inside, the font
    line(x, 8, 10, 16, 2, 'iron3'); line(x, 24, 10, 16, 2, 'iron3'); rect(x, 15, 0, 3, 3, 'iron4');
    rect(x, 9, 9, 14, 4, 'iron4'); rect(x, 10, 9, 12, 1, 'iron2'); rect(x, 12, 13, 8, 2, 'iron3');
    rect(x, 9, 15, 14, 18, 'cream0'); rect(x, 10, 15, 4, 18, 'white'); rect(x, 19, 15, 4, 18, 'cream1');
    rect(x, 14, 22, 4, 7, 'light1'); rect(x, 15, 20, 2, 3, 'light0'); rect(x, 15, 28, 2, 4, 'dirt3');
    for (const i of [8, 15, 23]) rect(x, i, 14, 1, 20, 'iron3');
    rect(x, 6, 33, 20, 5, 'iron4'); rect(x, 7, 33, 18, 1, 'iron2'); rect(x, 4, 38, 24, 4, 'iron3'); rect(x, 4, 38, 24, 1, 'iron2'); rect(x, 4, 41, 24, 1, 'iron4');
    return c;
  };

  // Mochi, Pip's patchwork rabbit (Night 2): pink polka-dot cotton with a sky-blue patch down its right side, sewn by
  // Ratih. Torn, as the box gives it: the left ear ripped half off and drooping with its stuffing out, the left eye
  // gone to a frayed hole, and two years of mud-flood dust in the weave. Mended (rabbit_mended): the ear sewn back
  // with big red cross stitches, Nora's wooden button for the eye, and a red heart patched on its back.
  const rabbitKey = { o: 'roofR3', a: 'pink', b: 'rose', w: 'white', q: 'sky1', Q: 'sky2', e: 'ink', x: 'cream2', s: 'cream0', n: 'roofR2', r: 'red', B: 'wood2', h: 'red', W: 'cream0' };
  XS.rabbit = (v = 'front') => v === 'back' ? S(`
    ........
    ....oo..
    oo..oao.
    saooaao.
    .oaaaaao
    .oaasaao
    ..oaxao.
    .oaaaaqo
    .oaaWWqo
    ..oo.WW.`, rabbitKey) : S(`
    ........
    ....oo..
    oo..oao.
    saooaao.
    .oaaaaao
    .oxaeaqo
    ..oanqo.
    .oawaqqo
    .oaaaqqo
    ..oo.oo.`, rabbitKey);
  XS.rabbit_mended = (v = 'front') => v === 'back' ? S(`
    .o...o..
    oro.oao.
    oao.oao.
    .oaoaao.
    .oaaaaao
    .oaaaaao
    ..oaaao.
    .oahhaqo
    .oahhWWo
    ..oo.WW.`, rabbitKey) : S(`
    .o...o..
    oro.oao.
    oao.oao.
    .oaoaao.
    .oaaaaao
    .oBaeaqo
    ..oanqo.
    .oawaqqo
    .oaaaqqo
    ..oo.oo.`, rabbitKey);
  SM.rabbit = (v = 'front') => v === 'back' ? S(`
    ............
    .......oo...
    ......oaao..
    ......oaao..
    .oo...oaao..
    saaoooaao...
    .ooaaaaaaoo.
    ..oaaawaaaao
    ..oawaaaawao
    ..oaaaaaaaao
    ...oaasaaao.
    ...oaxsxaqo.
    ..oaaasaaqqo
    ..oawaaaWWqo
    ...oaaaaWWo.
    ....ooo.ooo.`, rabbitKey) : S(`
    ............
    .......oo...
    ......oapo..
    ......oapo..
    .oo...oapo..
    saaoooaao...
    .ooaaaaaaoo.
    ..oaaawaaaqo
    ..oaxaaeaqqo
    ..oaaanaaqqo
    ...oaaaaqqo.
    ...oaawaqqo.
    ..oaawaaqqqo
    ..oaaaaqqqqo
    ...oaaaqqqo.
    ....ooo.ooo.`, { ...rabbitKey, p: 'pink' });
  SM.rabbit_mended = (v = 'front') => v === 'back' ? S(`
    ...oo..oo...
    ..oaro.oaao.
    ..orao.oaao.
    ..oaro.oaao.
    ...oao.oao..
    ...oaooaao..
    ..oaaaaaaao.
    .oaaawaaaaao
    .oawaaaaawao
    .oaaaaaaaaao
    ..oaaaaaaao.
    ..oahhahhao.
    .oaahhhhhaqo
    .oaaahhhaqqo
    ..oaaahaWWo.
    ...ooo.oWWo.`, rabbitKey) : S(`
    ...oo..oo...
    ..oaro.oapo.
    ..orao.oapo.
    ..oaro.oapo.
    ...oao.oao..
    ...oaooaao..
    ..oaaaaaaao.
    .oaaaawaaaqo
    .oaBaaeaaqqo
    .oaaanaaaqqo
    ..oaaaaaqqo.
    ..oaawaaqqo.
    .oaawaaqqqqo
    .oaaaaaqqqqo
    ..oaaaaqqqo.
    ...ooo.ooo..`, { ...rabbitKey, p: 'pink' });
  // LG: built from bevelled pieces, then the polka dots, stitches, eye and (torn) dust laid over them.
  const rabbit = (mended, back) => {
    const [c, x] = canvas(40, 48);
    const cotton = { o: 'roofR3', ol: 'roofR2', h: '#ffd0e8', b: 'pink', s: 'rose' };
    const sky = { o: 'roofB3', ol: 'roofB2', h: 'sky0', b: 'sky1', s: 'sky2' };
    const piece = (f, ramp, hl = 1, sh = 1) => {
      const p = bevel(mask(40, 48, f), ramp, hl, sh), g = p.getContext('2d'), w = 40, h = 48;
      if (ramp === cotton) {
        // white polka dots on the cotton, kept off the outline
        const d = g.getImageData(0, 0, w, h).data, on = (i, j) => d[(j * w + i) * 4 + 3] > 0;
        for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++)
          if ((i + (Math.floor(j / 4) % 2) * 3) % 6 === 0 && j % 4 === 1 && on(i, j) && on(i - 1, j) && on(i + 1, j) && on(i, j - 1) && on(i, j + 1)) dot(g, i, j, 'white');
      }
      x.drawImage(p, 0, 0);
    };
    const cross = (sx, sy, k = 'red') => { dot(x, sx - 1, sy - 1, k); dot(x, sx + 1, sy + 1, k); dot(x, sx + 1, sy - 1, k); dot(x, sx - 1, sy + 1, k); dot(x, sx, sy, k); };
    // ears: the right one upright; the left drooping, ripped half off (torn), or sewn back on with red crosses (mended)
    const rightEar = g => lens(g, back ? 15 : 25, 19, back ? -1.72 : -1.42, 18, 4.2, '#000');
    const leftEar = mended ? g => lens(g, back ? 25 : 15, 19, back ? -1.42 : -1.72, 18, 4.2, '#000')
      : g => lens(g, droop.x, droop.y, droop.a, 11, 4, '#000');
    const droop = { x: back ? 27 : 13, y: 20, a: back ? 0.45 : Math.PI - 0.45 };
    piece(rightEar, cotton); piece(leftEar, cotton);
    if (!back) lens(x, 25, 17, -1.42, 13, 1.6, 'sky1');
    if (mended) {
      // a cream band where the ear was sewn back on, crossed with red
      const ear = back ? g => lens(g, 25, 19, -1.42, 18, 4.2, '#000') : g => lens(g, 15, 19, -1.72, 18, 4.2, '#000');
      x.drawImage(bevel(mask(40, 48, g => { ear(g); g.globalCompositeOperation = 'source-in'; g.fillRect(0, 9, 40, 5); }), { o: 'roofR3', h: 'white', b: 'cream0', s: 'cream1' }, 1, 1), 0, 0);
      for (const sx of back ? [24, 27] : [13, 16]) cross(sx, 11);
    } else {
      // the torn end: stuffing bursting out and a loose thread hanging
      const ex = Math.round(droop.x + 11 * Math.cos(droop.a)), ey = Math.round(droop.y + 11 * Math.sin(droop.a)), sx = Math.sign(Math.cos(droop.a));
      for (const [a, b] of [[0, 0], [1, -1], [1, 1], [0, -2], [0, 2], [-1, 0]]) dot(x, ex + a * sx, ey + b, (a + b) % 2 ? 'cream0' : 'white');
      line(x, ex, ey + 2, ex + sx, ey + 7, 'cream2');
    }
    // body: front, the pink cotton with a sky patch down its right side; from behind, all cotton with a cotton tail
    piece(g => { ellipse(g, 20, 37, 10, 8, '#000'); rect(g, 12, 31, 16, 6, '#000'); }, cotton, 1, 2);
    if (!back) {
      x.drawImage(bevel(mask(40, 48, g => { ellipse(g, 20, 37, 10, 8, '#000'); rect(g, 12, 31, 16, 6, '#000'); g.globalCompositeOperation = 'source-in'; g.fillRect(22, 0, 18, 48); }), sky, 1, 2), 0, 0);
      for (let j = 32; j < 45; j += 2) dot(x, 21, j, 'white');
    }
    piece(g => { ellipse(g, 9, 34, 3, 4, '#000'); ellipse(g, 31, 34, 3, 4, '#000'); ellipse(g, 14, 45, 4, 2, '#000'); ellipse(g, 26, 45, 4, 2, '#000'); }, cotton);
    // head
    piece(g => ellipse(g, 20, 24, 11, 8, '#000'), cotton, 1, 2);
    if (back) {
      for (let j = 17; j < 31; j += 2) dot(x, 20, j, 'roofR2');
      if (mended) {
        // the red heart on its back, cross-stitched round in cream
        const heart = mask(40, 48, g => { disc(g, 17.5, 34.5, 3, () => '#000'); disc(g, 22.5, 34.5, 3, () => '#000'); poly(g, [[14.5, 35.5], [25.5, 35.5], [20, 41]], '#000'); });
        x.drawImage(bevel(heart, { o: 'roofR4', ol: 'roofR3', h: 'rose', b: 'red', s: 'roofR2' }, 1, 1), 0, 0);
        for (const [a, b] of [[15, 32], [18, 31], [20, 33], [22, 31], [25, 32], [23, 38], [17, 38]]) dot(x, a, b, 'cream0');
      } else {
        // the back seam split, its stuffing showing
        rect(x, 19, 33, 3, 6, 'cream0'); dot(x, 20, 34, 'white'); dot(x, 19, 37, 'white');
        for (let j = 33; j < 39; j += 2) { dot(x, 18, j, 'roofR3'); dot(x, 22, j, 'roofR3'); }
      }
      disc(x, 20.5, 43.5, 2.8, (d, lit) => d > 2.2 ? 'cream2' : lit > 0.3 ? 'white' : 'cream0');
    } else {
      // eyes: the right a black bead; the left a frayed hole (torn) or Nora's wooden button sewn on with red (mended)
      rect(x, 25, 23, 2, 2, 'ink'); dot(x, 25, 23, 'white');
      if (mended) {
        disc(x, 14, 24, 2.6, (d, lit) => d > 2 ? 'wood4' : lit > 0.3 ? 'wood1' : 'wood2');
        dot(x, 13, 23, 'red'); dot(x, 14, 24, 'red'); dot(x, 15, 25, 'red');
      } else {
        dot(x, 13, 23, 'cream2'); dot(x, 14, 24, 'rose'); dot(x, 15, 23, 'cream2'); line(x, 14, 25, 13, 28, 'cream2');
      }
      rect(x, 19, 26, 3, 1, 'roofR2'); dot(x, 20, 27, 'roofR2');
      rect(x, 10, 26, 2, 1, 'rose'); rect(x, 28, 26, 2, 1, 'rose');
    }
    if (!mended) {
      // two years of mud-flood dust in the weave
      const d = x.getImageData(0, 0, 40, 48).data, n = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
      for (let j = 0; j < 48; j++) for (let i = 0; i < 40; i++)
        if (d[(j * 40 + i) * 4 + 3] > 0 && n(Math.floor(i / 2), Math.floor(j / 2)) < 0.1 && n(i, j) < 0.6 && j > 14) dot(x, i, j, n(j, i) < 0.5 ? 'dirt1' : 'dirt2');
    }
    return c;
  };
  LG.rabbit = (v = 'front') => rabbit(false, v === 'back');
  LG.rabbit_mended = (v = 'front') => rabbit(true, v === 'back');

  // The Gardener's chamomile: four full white blooms with yellow hearts, their stems tied in a twist of grass.
  XS.chamomile = () => S(`
    ow.wo.
    wyw.wy
    .w.wyw
    ..gw..
    ..gg..
    .gg...`, { o: 'cream2', w: 'white', y: 'yellow', g: 'leaf3' });
  SM.chamomile = () => S(`
    .w....w..w..
    wyw..wyw.yw.
    .w.w..w.ww..
    ..wyw.g.g...
    ...wg.g.g...
    ....g.gg....
    .....ggg....
    .....ddd....
    .....ggg....
    ....gg.g....
    ....g...g...`, { w: 'white', y: 'yellow', g: 'leaf3', d: 'cream2' });
  LG.chamomile = () => {
    const [c, x] = canvas(36, 40);
    const bloom = (bx, by) => {
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; lens(x, bx, by, a, 6, 1.4, k % 2 ? 'cream0' : 'white'); }
      disc(x, bx, by, 2.4, (d, lit) => d > 1.9 ? 'orange' : lit > 0.2 ? 'light0' : 'yellow');
    };
    for (const [a, b, e, f] of [[8, 9, 17, 30], [27, 8, 18, 30], [12, 20, 17, 30], [24, 19, 18, 30]]) line(x, a, b, e, f, 'leaf4');
    line(x, 17, 30, 15, 38, 'leaf4'); line(x, 18, 30, 20, 38, 'leaf4'); line(x, 18, 30, 18, 38, 'leaf3');
    for (const [a, b] of [[8, 9], [27, 8], [12, 20], [24, 19]]) bloom(a, b);
    rect(x, 15, 29, 6, 3, 'cream2'); rect(x, 15, 29, 6, 1, 'cream0'); line(x, 20, 31, 24, 34, 'cream2');
    return c;
  };
  // Ratih's red thread from Nora's sewing box: a wooden spool wound with red cotton, the needle stuck in it.
  XS.red_thread = () => S(`
    oooooo
    .rRrr.
    .rrRr.
    .rRrr.
    oooooo`, { o: 'wood3', r: 'red', R: 'roofR2' });
  SM.red_thread = () => S(`
    ..........i.
    oooooooooi..
    owwwwwwwwo..
    .ornrrrrro..
    .orrnrrrro..
    .ornrrrrri..
    .orrnrrrio..
    .ornrrrrro..
    owwwwwwwwo..
    oooooooooo..`, { o: 'wood4', w: 'wood1', r: 'red', n: 'roofR2', i: 'iron1' });
  LG.red_thread = () => {
    const [c, x] = canvas(32, 36);
    // the spool's two wooden flanges and the red cotton wound between them, light from the top left
    const flange = y => { ellipse(x, 15, y + 1, 13, 3, 'wood4'); ellipse(x, 15, y, 12, 2.5, 'wood1'); ellipse(x, 15, y, 4, 1.2, 'wood3'); };
    flange(30);
    for (let y = 9; y < 30; y++) { rect(x, 5, y, 20, 1, y % 2 ? 'red' : 'roofR2'); dot(x, 6, y, 'rose'); dot(x, 7, y, 'rose'); rect(x, 22, y, 3, 1, 'roofR3'); }
    rect(x, 4, 9, 1, 21, 'roofR4'); rect(x, 25, 9, 1, 21, 'roofR4');
    flange(7);
    // the needle through the thread, and a loose end trailing off
    line(x, 26, 2, 18, 22, 'iron1'); dot(x, 26, 2, 'iron3'); line(x, 25, 20, 30, 26, 'red'); line(x, 30, 26, 29, 33, 'red');
    return c;
  };
  // Nora's wooden button for Mochi's missing eye: a small round of polished teak with two holes.
  XS.button = () => S(`
    .oo.
    oabo
    obbo
    .oo.`, { o: 'wood4', a: 'wood1', b: 'wood2' });
  SM.button = () => S(`
    ..oooo..
    .oaabbo.
    oaabbbco
    oab.b.co
    oabbbbco
    obbbbcco
    .occcco.
    ..oooo..`, { o: 'wood4', a: 'wood0', b: 'wood1', c: 'wood2' });
  LG.button = () => {
    const [c, x] = canvas(28, 28);
    // a disc of teak, a raised rim, its grain, and two thread holes
    disc(x, 14, 14, 12, (d, lit) => d > 11 ? 'wood4' : d > 9 ? (lit > 0.3 ? 'wood0' : lit > -0.3 ? 'wood1' : 'wood3') : lit > 0.4 ? 'wood1' : 'wood2');
    for (const hx of [11, 16]) { rect(x, hx, 12, 2, 4, 'wood4'); rect(x, hx, 13, 2, 2, 'ink'); }
    line(x, 6, 7, 9, 4, 'white');
    return c;
  };

  // Daniel's 8mm cine camera (Night 3): an upright bronze body with black leather sides, the lens turret on its front,
  // the viewfinder tube on top beside the brass plate with his D, the folding wind crank on its side. Out of the box
  // its glass is clouded with twenty years of dust, its bronze dull; cleaned in Theo's studio (camera_clean) the
  // lens is clear and the bronze glows.
  const camKey = (clean) => ({ o: 'brass4', a: clean ? 'brass1' : 'brass2', b: clean ? 'brass2' : 'brass3', c: 'brass3', L: 'ink2', l: 'iron4', g: clean ? 'water4' : 'stone2', G: clean ? 'water5' : 'stone3', w: clean ? 'white' : 'stone1', k: 'iron2', y: clean ? 'brass0' : 'brass1', d: clean ? 'brass3' : 'stone2' });
  XS.camera = () => S(`
    ..ooooo.
    .oayyao.
    oooooooo
    ogoLLLao
    owoLLLak
    oooLLLao
    .oooooo.`, camKey(false));
  XS.camera_clean = () => S(`
    ..ooooo.
    .oayyao.
    oooooooo
    ogoLLLao
    owoLLLak
    oooLLLao
    .oooooo.`, camKey(true));
  const camSM = `
    ....ooooooo...
    ....oaayyao...
    ..oooooooooo..
    ooooaaaaaaaao.
    oggoabLLLLLaok
    owgoabLLLLLaokk
    oGGoabLLLLLao.k
    ooooabLLLLLao.
    ...oabbbbbbao.
    ...oooooooooo.
    .....oc..co...`;
  SM.camera = () => S(camSM, camKey(false));
  SM.camera_clean = () => S(camSM, camKey(true));
  const camera = clean => {
    const [c, x] = canvas(48, 36);
    const B = clean ? { o: 'brass4', ol: 'brass3', h: 'brass0', b: 'brass1', s: 'brass2' } : { o: 'brass4', ol: 'brass3', h: 'brass1', b: 'brass2', s: 'brass3' };
    const glass = (cx, cy, r) => disc(x, cx, cy, r, (d, lit) => d > r - 0.8 ? 'iron4' : clean ? (lit > 0.5 && d > r * 0.4 ? 'water2' : d < r * 0.35 ? 'water6' : 'water5') : lit > 0.3 ? 'stone1' : 'stone3');
    // the viewfinder tube along the top, its rubber eyepiece at the back, the red run button at the front
    x.drawImage(bevel(mask(48, 36, g => rect(g, 14, 3, 24, 5, '#000')), B, 1, 1), 0, 0);
    rect(x, 38, 2, 3, 7, 'ink2'); rect(x, 38, 2, 1, 7, 'iron4');
    rect(x, 15, 2, 3, 1, 'roofR3'); dot(x, 15, 2, 'roofR1');
    // the body, bronze; black pebbled leather round its lower half
    x.drawImage(bevel(mask(48, 36, g => { rect(g, 14, 8, 27, 25, '#000'); rect(g, 15, 33, 25, 1, '#000'); }), B, 1, 2), 0, 0);
    rect(x, 15, 22, 25, 10, 'ink2'); rect(x, 15, 22, 25, 1, 'iron4');
    for (let j = 24; j < 31; j += 2) for (let i = 16 + (j % 4 ? 1 : 0); i < 39; i += 2) dot(x, i, j, 'iron4');
    // the plate on its side: an engraved border and Daniel's D cut big in the middle
    rect(x, 18, 10, 19, 10, 'brass4'); rect(x, 19, 11, 17, 8, clean ? 'brass1' : 'brass2'); rect(x, 20, 12, 15, 6, clean ? 'brass0' : 'brass1');
    for (let i = 21; i < 34; i += 2) { dot(x, i, 12, 'brass3'); dot(x, i + 1, 17, 'brass3'); }
    ['###.', '#..#', '#..#', '###.'].forEach((r, j) => [...r].forEach((ch, i) => ch === '#' && dot(x, 26 + i, 13 + j, 'brass4')));
    // the lens turret on the front: a round plate, the long lens and the short one under it
    disc(x, 12, 19, 7, (d, lit) => d > 6.2 ? 'iron4' : lit > 0.4 ? 'iron1' : 'iron2');
    x.drawImage(bevel(mask(48, 36, g => { rect(g, 2, 13, 9, 9, '#000'); rect(g, 5, 23, 6, 6, '#000'); }), { o: 'iron4', ol: 'iron3', h: 'iron0', b: 'iron1', s: 'iron2' }, 1, 1), 0, 0);
    for (let k = 4; k < 10; k += 2) rect(x, k, 14, 1, 7, 'iron3');
    rect(x, 1, 14, 2, 7, 'iron4'); glass(2, 17.5, 3.4); glass(5, 26, 2.4);
    // the wind key on its side: a round boss and the folding butterfly key
    disc(x, 42, 22, 2.6, (d, lit) => d > 2 ? 'brass4' : lit > 0 ? 'brass1' : 'brass3');
    x.drawImage(bevel(mask(48, 36, g => { rect(g, 43, 16, 3, 13, '#000'); rect(g, 44, 15, 3, 15, '#000'); }), B, 1, 1), 0, 0);
    rect(x, 44, 21, 2, 3, 'brass4');
    if (!clean) { camDust(x, 48, 36, 83); line(x, 2, 14, 4, 21, 'stone1'); }
    else { rect(x, 15, 9, 1, 12, 'brass0'); dot(x, 1, 15, 'white'); dot(x, 2, 15, 'white'); dot(x, 4, 25, 'white'); }
    return c;
  };
  // twenty years of dust: grey bloom over the glass and in the leather's grain, the bronze dull
  const camDust = (x, w, h, seed) => {
    const r = rng(seed);
    for (let k = 0; k < w * h / 16; k++) { const i = Math.floor(r() * w), j = Math.floor(r() * h); if (x.getImageData(i, j, 1, 1).data[3] && r() < 0.6) dot(x, i, j, r() < 0.7 ? 'stone2' : 'cream2'); }
  };
  const camB = clean => clean ? { o: 'brass4', ol: 'brass3', h: 'brass0', b: 'brass1', s: 'brass2' } : { o: 'brass4', ol: 'brass3', h: 'brass1', b: 'brass2', s: 'brass3' };
  const camIron = { o: 'iron4', ol: 'iron3', h: 'iron0', b: 'iron1', s: 'iron2' };
  // front: the lens turret head-on, the long lens over the short one, both glasses clouded until it is cleaned
  const cameraFront = clean => {
    const [c, x] = canvas(40, 40), B = camB(clean);
    const glass = (cx, cy, r) => disc(x, cx, cy, r, (d, lit) => d > r - 0.8 ? 'iron4' : clean ? (lit > 0.5 && d > r * 0.4 ? 'water2' : d < r * 0.35 ? 'water6' : 'water5') : lit > 0.3 ? 'stone1' : d < r * 0.5 ? 'stone3' : 'stone2');
    // the viewfinder tube's round end over the body, and the body itself with its leather band
    x.drawImage(bevel(mask(40, 40, g => rect(g, 22, 1, 9, 7, '#000')), B, 1, 1), 0, 0);
    glass(26.5, 4.5, 2.4);
    x.drawImage(bevel(mask(40, 40, g => { rect(g, 7, 7, 26, 29, '#000'); rect(g, 8, 36, 24, 1, '#000'); }), B, 1, 2), 0, 0);
    rect(x, 8, 27, 24, 8, 'ink2'); rect(x, 8, 27, 24, 1, 'iron4');
    for (let j = 29; j < 35; j += 2) for (let i = 9 + (j % 4 ? 1 : 0); i < 31; i += 2) dot(x, i, j, 'iron4');
    // the folding wind key, edge-on beyond the right side
    x.drawImage(bevel(mask(40, 40, g => { rect(g, 33, 15, 3, 13, '#000'); rect(g, 36, 19, 2, 5, '#000'); }), B, 1, 1), 0, 0);
    // the turret: a round iron plate on a pin, the long lens barrel ringed with grip ridges, the short one below
    disc(x, 19, 20, 10.5, (d, lit) => d > 9.8 ? 'iron4' : d > 8.6 ? (lit > 0.2 ? 'iron0' : 'iron2') : lit > 0.4 ? 'iron1' : 'iron2');
    disc(x, 16, 16, 6.5, (d, lit, dx, dy) => d > 5.8 ? 'iron4' : (Math.round(Math.atan2(dy, dx) * 10 / Math.PI) & 1) ? 'iron3' : lit > 0 ? 'iron0' : 'iron1');
    glass(16, 16, 4.6);
    disc(x, 24, 25, 4.2, (d, lit) => d > 3.5 ? 'iron4' : lit > 0 ? 'iron0' : 'iron2');
    glass(24, 25, 2.8);
    rect(x, 18, 19, 3, 3, 'iron4'); dot(x, 19, 20, 'iron1');
    if (!clean) { camDust(x, 40, 40, 31); line(x, 13, 18, 15, 13, 'stone1'); }
    else { line(x, 13, 16, 15, 13, 'white'); dot(x, 23, 24, 'white'); rect(x, 8, 8, 1, 18, 'brass0'); }
    return c;
  };
  // top: looking down on it, the viewfinder along the top, the run button, and the footage dial stopped part-way:
  // a reel is still inside
  const cameraTop = clean => {
    const [c, x] = canvas(48, 28), B = camB(clean);
    x.drawImage(bevel(mask(48, 28, g => { rect(g, 13, 5, 28, 17, '#000'); rect(g, 14, 22, 26, 1, '#000'); }), B, 1, 2), 0, 0);
    // the long lens out the front, ridged, and the turret plate's edge behind it
    x.drawImage(bevel(mask(48, 28, g => { rect(g, 1, 9, 10, 8, '#000'); rect(g, 10, 3, 3, 21, '#000'); }), camIron, 1, 1), 0, 0);
    for (let k = 3; k < 10; k += 2) rect(x, k, 10, 1, 6, 'iron3');
    // the viewfinder tube with its rubber eyepiece, the red run button
    x.drawImage(bevel(mask(48, 28, g => rect(g, 14, 6, 24, 5, '#000')), B, 1, 1), 0, 0);
    rect(x, 38, 5, 3, 7, 'ink2'); rect(x, 38, 5, 1, 7, 'iron4');
    disc(x, 17.5, 16.5, 2, (d, lit) => d > 1.4 ? 'roofR4' : lit > 0 ? 'roofR1' : 'roofR3');
    // the footage dial: a cream face, its red hand stopped a third of the way round
    disc(x, 30, 16, 4.5, (d, lit) => d > 3.8 ? 'brass4' : lit > 0.3 ? 'cream0' : 'cream1');
    for (const [a, b] of [[29, 12], [33, 15], [29, 19], [26, 15]]) dot(x, a, b, 'wood4');
    line(x, 29, 15, 32, 13, 'red'); dot(x, 29, 15, 'ink2');
    // the wind key folded flat at its side
    x.drawImage(bevel(mask(48, 28, g => { rect(g, 41, 11, 3, 6, '#000'); rect(g, 43, 9, 4, 10, '#000'); }), B, 1, 1), 0, 0);
    if (!clean) camDust(x, 48, 28, 57);
    else { rect(x, 14, 6, 20, 1, 'brass0'); dot(x, 27, 14, 'white'); }
    return c;
  };
  LG.camera = (v = 'side') => v === 'front' ? cameraFront(false) : v === 'top' ? cameraTop(false) : camera(false);
  LG.camera_clean = (v = 'side') => v === 'front' ? cameraFront(true) : v === 'top' ? cameraTop(true) : camera(true);
  // Arlo's hemp rope, coiled for the cliff: loops of twisted rope, its end whipped with twine.
  XS.rope = () => S(`
    .oooo.
    oabbao
    ob..bo
    oabbao
    .oooo.`, { o: 'dirt4', a: 'dirt1', b: 'dirt2' });
  SM.rope = () => S(`
    ...oooooo...
    ..oaabbaao..
    .oaboooobao.
    oaboaabboabo
    obo.o..o.obo
    oaboaabboabo
    .oaboooobao.
    ..oaabbaao.o
    ...oooooo.oo`, { o: 'dirt4', a: 'dirt1', b: 'dirt2' });
  LG.rope = () => {
    const [c, x] = canvas(40, 34);
    // three loops, each a ring of rope whose twist shows as light and dark dashes round it
    for (const [cx, cy, r] of [[19, 18, 14], [19, 18, 10.5], [19, 18, 7]]) disc(x, cx, cy, r + 2, (d, lit, dx, dy) => {
      if (d < r - 1.5) return null;
      const a = Math.atan2(dy, dx), tw = ((Math.round(a * r) + Math.round(d * 2)) & 3);
      return d > r + 1.4 ? 'dirt4' : tw === 0 ? 'dirt4' : lit > 0.2 ? 'dirt1' : tw === 1 ? 'dirt3' : 'dirt2';
    });
    // the end, whipped with dark twine, trailing out
    line(x, 31, 26, 38, 33, 'dirt2'); line(x, 32, 26, 39, 32, 'dirt3'); rect(x, 34, 28, 2, 3, 'wood4'); dot(x, 38, 33, 'dirt1');
    return c;
  };
  // Sea mint off the south cliff: three clumps of dark, crinkled leaves, tied together.
  XS.mint = () => S(`
    gG.Gg
    GgGgG
    .gGg.
    ..s..
    ..s..`, { g: 'leaf2', G: 'leaf4', s: 'leaf5' });
  SM.mint = () => S(`
    ..gG...Gg...
    .gGGg.gGGg..
    gGgGG.GgGGg.
    .GgG.g.GgG..
    ..G.gGg.G...
    ...gGgGg....
    ....sss.....
    ....ttt.....
    ....s.s.....
    ...s...s....`, { g: 'leaf2', G: 'leaf4', s: 'leaf5', t: 'dirt3' });
  LG.mint = () => {
    const [c, x] = canvas(34, 34);
    // a leaf: a pointed oval, crinkled at the edge, its lit side and its midrib
    const leaf = (cx, cy, ang, L) => {
      const ux = Math.cos(ang), uy = Math.sin(ang);
      for (let t = -L; t <= L; t += 0.5) {
        const w = Math.max(0, (1 - (t / L) ** 2) * L * 0.55), mx = cx + ux * t, my = cy + uy * t;
        for (let q = -w; q <= w; q += 0.5) {
          const qx = Math.round(mx - uy * q), qy = Math.round(my + ux * q), edge = Math.abs(q) > w - 1;
          dot(x, qx, qy, edge ? (((qx + qy) & 1) ? 'leaf5' : 'leaf4') : q * (ux - uy) < 0 ? 'leaf2' : 'leaf3');
        }
      }
      line(x, Math.round(cx - ux * L * 0.8), Math.round(cy - uy * L * 0.8), Math.round(cx + ux * L * 0.7), Math.round(cy + uy * L * 0.7), 'leaf5');
    };
    // three short stems and the twine round them
    for (const [a, b] of [[9, 12], [17, 8], [25, 12]]) line(x, a, b, 17, 26, 'leaf5');
    for (const [cx, cy] of [[9, 12], [25, 12], [17, 8]]) for (let k = 0; k < 4; k++) leaf(cx + Math.round(Math.cos(k * 1.6 + cx) * 3), cy + Math.round(Math.sin(k * 1.6 + cx) * 3), -Math.PI / 2 + (k - 1.5) * 0.9, 5);
    rect(x, 14, 25, 6, 3, 'dirt3'); rect(x, 14, 25, 6, 1, 'dirt1'); dot(x, 19, 28, 'dirt3'); dot(x, 20, 29, 'dirt3');
    line(x, 16, 28, 14, 33, 'leaf5'); line(x, 18, 28, 20, 33, 'leaf5');
    return c;
  };
  // The mint tea brewed for Theo: a clay cup of pale green tea, a sprig on its rim, the steam rising.
  XS.mint_tea = () => S(`
    .s.s.
    ooooo
    obggo
    obbbo
    .ooo.`, { o: 'roofR3', b: 'roofR2', g: 'leaf1', s: 'white' });
  SM.mint_tea = () => S(`
    ...s..s....
    ..s..s.....
    ...s..s.G..
    .oooooooGG.
    oaaggggaao.
    obbbbbbbbo.
    obbbbbbbbo.
    .obbbbbbo..
    ..oooooo...`, { o: 'roofR4', a: 'roofR1', b: 'roofR2', g: 'leaf1', G: 'leaf3', s: 'white' });
  LG.mint_tea = () => {
    const [c, x] = canvas(32, 34);
    // the cup: unglazed clay, a lit rim, a band pressed round it
    const cup = mask(32, 34, g => { rect(g, 6, 14, 20, 16, '#000'); rect(g, 8, 30, 16, 2, '#000'); });
    x.drawImage(bevel(cup, { o: 'roofR4', ol: 'roofR3', h: 'roofR0', b: 'roofR1', s: 'roofR2' }, 1, 2), 0, 0);
    rect(x, 7, 14, 18, 3, 'leaf1'); rect(x, 7, 14, 18, 1, 'leaf0'); rect(x, 6, 21, 20, 1, 'roofR3');
    // a sprig of mint over the rim, and the steam
    for (const [bx, by, a] of [[24, 12, -0.6], [27, 9, -1.2], [21, 10, -1.9]]) { lens(x, bx, by, a, 5, 2.4, 'leaf4'); lens(x, bx, by, a, 4, 1.4, 'leaf2'); }
    for (const sx of [11, 16, 21]) for (let j = 0; j < 10; j++) if (j % 3 !== 2) dot(x, sx + Math.round(Math.sin((j + sx) / 2) * 1.5), 2 + j, j < 4 ? 'cream1' : 'white');
    return c;
  };

  // Wear on a drawn thing, kept off its outline: clots of `cols` wherever the noise falls under `rate`.
  const grime = (x, seed, rate, cols) => {
    const { width: w, height: h } = x.canvas, d = x.getImageData(0, 0, w, h).data, on = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 0;
    const n = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233 + seed * 7.13) * 43758.5453; return v - Math.floor(v); };
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
      if (on(i, j) && on(i - 1, j) && on(i + 1, j) && on(i, j - 1) && on(i, j + 1) && n(i >> 1, j >> 1) < rate && n(i, j) < 0.75) dot(x, i, j, cols[Math.floor(n(j, i) * cols.length)]);
  };
  // A four-pointed glint on something polished.
  const glint = (x, cx, cy, r = 2) => { rect(x, cx - r, cy, 2 * r + 1, 1, 'white'); rect(x, cx, cy - r, 1, 2 * r + 1, 'white'); };

  // Night 4's key from Sam's box: plain black iron forged by the old station service, nothing engraved on it, a hollow
  // acorn for its bow and four stepped notches cut in its bit. Out of the box it is cold and freckled with rust (key);
  // once the vault's four tumblers have turned it, the rust is worn off its bit and the notches shine (key_turned).
  const IRON = { o: 'ink', ol: 'iron4', h: 'iron2', b: 'iron3', s: 'iron4' }, IRON_LIT = { o: 'ink', ol: 'iron3', h: 'iron1', b: 'iron2', s: 'iron3' };
  const RUST = ['wood3', 'wood4', 'dirt3'];
  const keyFront = turned => {
    const [c, x] = canvas(48, 24), ramp = turned ? IRON_LIT : IRON;
    // the bow, an acorn on its side: the nut and its tip to the left, the scaly cup to the right, hollow through the nut
    x.drawImage(bevel(mask(48, 24, g => {
      ellipse(g, 9, 12, 7, 7, '#000'); poly(g, [[0, 12], [4, 9], [4, 15]], '#000'); ellipse(g, 17, 12, 4, 9, '#000');
      g.globalCompositeOperation = 'destination-out'; ellipse(g, 8, 12, 3, 3, '#000');
    }), ramp, 1, 2), 0, 0);
    for (let j = 5; j < 20; j += 2) for (let i = 15 + (j % 4 === 1 ? 1 : 0); i < 21; i += 2) if (x.getImageData(i, j, 1, 1).data[3]) dot(x, i, j, ramp.s);
    rect(x, 13, 6, 1, 13, 'ink');
    // the collar, the shaft and the bit with its four steps, deepest at the tip
    x.drawImage(bevel(mask(48, 24, g => { rect(g, 20, 8, 4, 9, '#000'); rect(g, 23, 10, 24, 5, '#000'); rect(g, 34, 14, 12, 2, '#000'); [3, 4, 5, 6].forEach((d, k) => rect(g, 34 + k * 3, 15, 3, d, '#000')); }), ramp, 1, 1), 0, 0);
    rect(x, 22, 9, 1, 7, 'ink');
    grime(x, 4, turned ? 0.04 : 0.12, RUST);
    if (turned) { [3, 4, 5, 6].forEach((d, k) => rect(x, 34 + k * 3, 14 + d, 3, 1, 'iron0')); rect(x, 24, 11, 21, 1, 'iron1'); glint(x, 40, 11); glint(x, 6, 7, 1); }
    return c;
  };
  // turned over it is just as bare
  LG.key = (v = 'front') => v === 'back' ? PX.flip(keyFront(false)) : keyFront(false);
  LG.key_turned = (v = 'front') => v === 'back' ? PX.flip(keyFront(true)) : keyFront(true);
  const keySM = `
    .ooo..............
    oabbo.............
    ob.coooooooooooo..
    ob.ccaaaaaaaaaaco.
    obccoooobbrbbbbco.
    .ooo....obobobobo.
    .........oobobobo.
    ...........oobobo.
    .............oobo.
    ...............oo.`;
  const keyXS = `
    .oo.......
    obcooooo..
    o.caaaaco.
    obcoobrbo.
    .oo.obobo.
    .....oobo.
    .......oo.`;
  const keyKey = turned => ({ o: 'ink', a: turned ? 'iron1' : 'iron2', b: turned ? 'iron2' : 'iron3', c: turned ? 'iron3' : 'iron4', r: turned ? 'iron2' : 'wood3' });
  SM.key = () => S(keySM, keyKey(false));
  SM.key_turned = () => S(keySM, keyKey(true));
  XS.key = () => S(keyXS, keyKey(false));
  XS.key_turned = () => S(keyXS, keyKey(true));

  // The copy Sam writes out of the 1952 register's page for Satria: ticket 041 struck through in red ink, and Marcus
  // Bell's red note under it, cancelled at 10:15.
  LG.register = () => {
    const [c, x] = canvas(36, 44);
    x.drawImage(bevel(mask(36, 44, g => rect(g, 2, 2, 32, 40, '#000')), { o: 'dirt3', ol: 'dirt2', h: 'cream0', b: 'cream1', s: 'cream2' }, 1, 2), 0, 0);
    rect(x, 3, 22, 30, 1, 'cream2');   // where it was folded
    text(x, 'NO.', 5, 5, 'wood4'); rect(x, 17, 7, 13, 1, 'wood3'); rect(x, 5, 11, 26, 1, 'wood3');
    for (const [y, s] of [[14, '040'], [20, '041'], [26, '042']]) { text(x, s, 5, y - 2, s === '041' ? 'ink2' : 'wood3'); for (let i = 18; i < 31; i += 4) rect(x, i, y, 3, 1, 'stone3'); }
    rect(x, 4, 20, 28, 1, 'red'); dot(x, 31, 19, 'red');
    text(x, '10:15', 5, 31, 'red');
    for (const [y, w] of [[33, 9], [37, 26], [40, 18]]) for (let i = 0; i < w; i += 3) rect(x, (y === 33 ? 23 : 5) + i, y, 2, 1, 'roofR2');
    return c;
  };
  SM.register = () => S(`
    oooooooooooo
    oWWWWWWWWWWo
    okkWWkkkkkWo
    oWWWWWWWWWWo
    orrrrrrrrrro
    oWWWWWWWWWWo
    okkWWkkkkkWo
    oWWWWWWWWWWo
    oWrrWrrrWWWo
    oWWWrrrrrWWo
    oooooooooooo`, { o: 'dirt3', W: 'cream0', k: 'stone3', r: 'red' });
  XS.register = () => S(`
    ooooooo
    oWkkkWo
    orrrrro
    oWkkkWo
    oWrrWWo
    ooooooo`, { o: 'dirt3', W: 'cream0', k: 'stone3', r: 'red' });

  // Night 5's shoes from Leo's box: a pair of old canvas running shoes, faded dark red with white laces, their soles two
  // sizes, the left long and slender, the right short and thick with dull iron spikes. Out of the box the canvas is hard
  // and mossy, the laces broken, the rubber stiff and caked with dried mud, the tongue's seam gaping (shoes); bonded,
  // cleaned and waxed in the Mender's press they shine (shoes_mended).
  const shoeRamp = mended => ({
    up: mended ? { o: 'roofR4', ol: 'roofR3', h: 'rose', b: 'red', s: 'roofR2' } : { o: 'roofR4', ol: 'roofR3', h: 'roofR1', b: 'roofR2', s: 'roofR3' },
    sole: mended ? { o: 'wood5', ol: 'wood4', h: 'cream0', b: 'dirt1', s: 'dirt2' } : { o: 'wood5', ol: 'wood4', h: 'dirt2', b: 'dirt3', s: 'wood3' },
  });
  // one shoe side-on, toe to the right: the canvas upper from the heel's collar down the laces to the toe, its sole under it
  const shoeSide = (x, W, H, x0, len, top, base, sole, mended, spikes) => {
    const r = shoeRamp(mended), up = new Array(4);
    x.drawImage(bevel(mask(W, H, g => poly(g, [[x0, top + 3], [x0 + 2, top], [x0 + len * 0.36, top + 1], [x0 + len * 0.62, top + (base - top) * 0.45], [x0 + len * 0.9, base - (base - top) * 0.35], [x0 + len, base - 2], [x0 + len, base], [x0, base]], '#000')), r.up, 1, 1), 0, 0);
    // the stitched toe cap and heel tab, and the eyelets down the throat
    rect(x, x0 + Math.round(len * 0.8), base - 3, Math.round(len * 0.2), 1, 'roofR4'); rect(x, x0 + 1, top + 4, 2, base - top - 5, mended ? 'roofR2' : 'roofR3');
    for (let k = 0; k < 4; k++) up[k] = [Math.round(x0 + len * (0.4 + k * 0.12)), Math.round(top + 2 + (base - top) * 0.13 * k)];
    for (const [ex, ey] of up) dot(x, ex, ey, 'brass3');
    // the laces: crossed and tied (mended), or snapped short with one frayed end hanging (broken)
    if (mended) { for (let k = 0; k < 3; k++) line(x, up[k][0], up[k][1], up[k + 1][0], up[k + 1][1] - 1, 'white'); line(x, up[0][0], up[0][1] - 1, up[0][0] - 3, up[0][1] - 3, 'white'); line(x, up[0][0], up[0][1] - 1, up[0][0] + 2, up[0][1] - 4, 'white'); }
    else { dot(x, up[1][0] + 1, up[1][1] - 1, 'cream1'); dot(x, up[3][0] + 1, up[3][1] - 1, 'cream1'); line(x, up[0][0], up[0][1], up[0][0] - 2, up[0][1] + 6, 'cream1'); dot(x, up[0][0] - 2, up[0][1] + 7, 'cream2'); }
    x.drawImage(bevel(mask(W, H, g => rect(g, x0 - 1, base, len + 2, sole, '#000')), r.sole, 1, 1), 0, 0);
    if (spikes) for (let i = x0 + 2; i <= x0 + len - 3; i += 5) { rect(x, i, base + sole, 3, 1, mended ? 'iron1' : 'iron3'); dot(x, i + 1, base + sole + 1, mended ? 'iron0' : 'iron4'); }
  };
  const shoesPair = mended => {
    const [c, x] = canvas(48, 32);
    shoeSide(x, 48, 32, 2, 30, 7, 19, 2, mended, false);
    shoeSide(x, 48, 32, 22, 23, 12, 24, 4, mended, true);
    if (!mended) grime(x, 21, 0.16, ['leaf3', 'leaf4', 'stone2', 'dirt4']);
    else { glint(x, 29, 9, 1); glint(x, 41, 19); dot(x, 6, 10, 'rose'); dot(x, 25, 15, 'rose'); }
    return c;
  };
  // turned over: the two soles side by side, the left long and slim, the right short and broad with six spikes
  const shoesSoles = mended => {
    const [c, x] = canvas(44, 44), r = shoeRamp(mended);
    const left = g => poly(g, [[10, 2], [16, 2], [19, 8], [19, 28], [17, 40], [12, 42], [9, 37], [8, 10]], '#000');
    const right = g => poly(g, [[27, 10], [37, 10], [41, 16], [41, 31], [38, 39], [30, 39], [26, 33], [25, 17]], '#000');
    for (const f of [left, right]) x.drawImage(bevel(mask(44, 44, f), r.sole, 1, 2), 0, 0);
    // tread bars across both, the right's six spikes in its ball, its heel worn
    for (let y = 6; y < 39; y += 4) rect(x, 11, y, 6, 1, r.sole.s);
    for (let y = 30; y < 37; y += 3) rect(x, 29, y, 9, 1, r.sole.s);
    for (const [sx, sy] of [[29, 14], [33, 13], [37, 14], [29, 20], [33, 19], [37, 20]]) { rect(x, sx - 1, sy - 1, 3, 3, mended ? 'iron2' : 'iron4'); dot(x, sx, sy, mended ? 'white' : 'iron2'); }
    if (!mended) {
      grime(x, 13, 0.28, ['dirt4', 'wood4', 'dirt2']);
      line(x, 12, 15, 16, 19, 'wood5'); line(x, 30, 25, 35, 27, 'wood5'); line(x, 14, 31, 13, 35, 'wood5');
    } else { glint(x, 33, 16); rect(x, 10, 4, 1, 10, 'white'); }
    return c;
  };
  // the left shoe up close: its tongue standing out of the throat, its seam gaping (broken) or stitched (mended)
  const shoesTongue = mended => {
    const [c, x] = canvas(46, 34), r = shoeRamp(mended);
    const tongue = mended ? [[15, 15], [14, 5], [20, 4], [25, 16]] : [[15, 15], [11, 6], [17, 3], [25, 16]];
    x.drawImage(bevel(mask(46, 34, g => poly(g, tongue, '#000')), { o: 'roofR4', ol: 'roofR3', h: r.up.h, b: r.up.b, s: r.up.s }, 1, 1), 0, 0);
    shoeSide(x, 46, 34, 3, 40, 13, 27, 3, mended, false);
    if (mended) { for (let k = 0; k < 4; k++) dot(x, 16 + k * 2, 14 - k * 2 + 4, 'cream0'); glint(x, 38, 21); dot(x, 9, 17, 'rose'); }
    else {
      // the seam split between the tongue and the vamp, threads pulled loose from it
      poly(x, [[18, 12], [25, 15], [28, 20], [21, 16]], 'wood5');
      for (const [a, b] of [[19, 11], [23, 12], [27, 16], [26, 19], [22, 17]]) dot(x, a, b, 'cream2');
      grime(x, 17, 0.14, ['leaf3', 'leaf4', 'stone2', 'dirt4']);
    }
    return c;
  };
  for (const [id, mended] of [['shoes', false], ['shoes_mended', true]]) LG[id] = (v = 'pair') => v === 'soles' ? shoesSoles(mended) : v === 'tongue' ? shoesTongue(mended) : shoesPair(mended);
  const shoesSM = `
    .ooo.............
    obbbo............
    obabbooo.........
    obbawawbooo......
    obbbbbbbbbbo.ooo.
    ossssssssssoobbbo
    .ooooooooooobbawwo
    ...........obbbbbo
    ...........osssssso
    ...........oooooooo
    ............i.i.i..`;
  const shoesXS = `
    .oo.......
    obboo.....
    obbwbo.oo.
    osssssobbo
    .ooooosssso
    ......ooooo
    .......i.i.`;
  const shoeKey = mended => ({ o: 'roofR4', a: mended ? 'rose' : 'roofR1', b: mended ? 'red' : 'roofR2', w: mended ? 'white' : 'cream2', s: mended ? 'dirt1' : 'dirt3', i: mended ? 'iron1' : 'iron3' });
  SM.shoes = () => S(shoesSM, shoeKey(false));
  SM.shoes_mended = () => S(shoesSM, shoeKey(true));
  XS.shoes = () => S(shoesXS, shoeKey(false));
  XS.shoes_mended = () => S(shoesXS, shoeKey(true));

  // Night 6's ledger from the sixth box: Marcus Bell's station accounts for 1952, a thick book in dark deer leather with
  // brass corner plates, copper stitching round its board and a bronze clasp, its title tooled in gold. Its last page
  // leaves the balance blank under a red question mark, over the railway's unbroken red wax seal (ledger); balanced in
  // 6B, the page is stamped PAID IN FULL WITH FAMILY LOVE and the clasp hangs open (ledger_balanced).
  const LEATHER = { o: 'ink', ol: 'wood5', h: 'wood3', b: 'wood4', s: 'wood5' }, PAGE = { o: 'dirt3', ol: 'dirt2', h: 'cream0', b: 'cream1', s: 'cream2' };
  const gold = (x, s, px, py) => { text(x, s, px + 1, py + 1, 'wood5'); text(x, s, px, py, 'brass1'); };
  // the railway's seal in red wax: a rim, a spoked wheel pressed in it, a drip
  const waxSeal = (x, cx, cy, r) => {
    disc(x, cx, cy, r, (d, lit, dx, dy) => d > r - 0.8 ? 'roofR4' : Math.abs(d - r * 0.55) < 0.5 || (d < r * 0.55 && (Math.round(Math.atan2(dy, dx) * 4 / Math.PI) & 1) === 0 && d > 1) ? 'roofR3' : lit > 0.5 ? 'rose' : 'roofR2');
    rect(x, cx - 1, cy + r - 1, 2, 2, 'roofR3');
  };
  const ledgerCover = done => {
    const [c, x] = canvas(48, 48);
    // the page block at the fore-edge, receipts sticking out of it
    rect(x, 6, 3, 39, 42, 'cream2'); for (let j = 5; j < 44; j += 2) rect(x, 43, j, 2, 1, 'cream0');
    for (const [ry, rw] of [[9, 3], [21, 4], [32, 2]]) { rect(x, 44, ry, rw, 4, 'dirt3'); rect(x, 44, ry + 1, rw - 1, 2, 'cream0'); }
    x.drawImage(bevel(mask(48, 48, g => rect(g, 1, 1, 42, 44, '#000')), LEATHER, 1, 2), 0, 0);
    // the spine's raised bands, the copper stitching round the board, brass plates on its corners
    rect(x, 1, 1, 7, 44, 'ink'); rect(x, 2, 2, 5, 42, 'wood4'); rect(x, 2, 2, 1, 42, 'wood3');
    for (const j of [6, 14, 31, 39]) { rect(x, 2, j, 5, 2, 'wood5'); rect(x, 2, j, 5, 1, 'wood3'); }
    for (let i = 11; i < 40; i += 2) { dot(x, i, 4, 'brass3'); dot(x, i, 41, 'brass3'); }
    for (let j = 6; j < 41; j += 2) { dot(x, 9, j, 'brass3'); dot(x, 40, j, 'brass3'); }
    for (const [cx, cy, sy] of [[43, 1, 1], [43, 45, -1]]) {
      poly(x, [[cx, cy], [cx - 8, cy], [cx, cy + sy * 8]].map(([a, b]) => [a, sy < 0 ? b : b]), 'brass4');
      poly(x, [[cx - 1, cy + sy], [cx - 6, cy + sy], [cx - 1, cy + sy * 6]], 'brass1'); dot(x, cx - 3, cy + sy * 2, 'brass3');
    }
    // the title tooled in gold
    gold(x, 'BELLWOOD', 10, 8); gold(x, 'STATION', 12, 15);
    for (let i = 13; i < 37; i += 3) dot(x, i, 22, 'brass2');
    gold(x, '1952', 17, 25); gold(x, 'M. BELL', 13, 34);
    // the bronze clasp: its strap over the fore-edge, buckled shut (ledger) or hanging loose (balanced)
    if (!done) { rect(x, 37, 20, 11, 7, 'ink'); rect(x, 38, 21, 10, 5, 'wood4'); rect(x, 35, 19, 6, 9, 'brass4'); rect(x, 36, 20, 4, 7, 'brass2'); rect(x, 36, 20, 4, 1, 'brass1'); dot(x, 37, 23, 'brass4'); dot(x, 38, 23, 'brass4'); }
    else { rect(x, 43, 26, 5, 12, 'ink'); rect(x, 44, 26, 3, 11, 'wood4'); rect(x, 42, 36, 6, 6, 'brass4'); rect(x, 43, 37, 4, 4, 'brass2'); dot(x, 43, 37, 'brass1'); glint(x, 41, 3); }
    return c;
  };
  // the spine: BELL / WOOD, the railway's wheel and 1952 in gold between its raised bands
  const ledgerSpine = () => {
    const [c, x] = canvas(22, 48);
    x.drawImage(bevel(mask(22, 48, g => rect(g, 2, 1, 18, 46, '#000')), LEATHER, 1, 2), 0, 0);
    for (const j of [3, 18, 32, 43]) { rect(x, 2, j, 18, 3, 'ink'); rect(x, 3, j, 16, 1, 'wood3'); rect(x, 3, j + 1, 16, 1, 'wood4'); }
    gold(x, 'BELL', 4, 6); gold(x, 'WOOD', 4, 12);
    disc(x, 11, 25.5, 5, (d, lit, dx, dy) => d > 4.2 ? 'brass3' : d < 1.2 ? 'brass1' : (Math.round(Math.atan2(dy, dx) * 4 / Math.PI) & 1) === 0 ? 'brass2' : null);
    gold(x, '1952', 4, 36);
    return c;
  };
  // the last pages open: Daniel's gifts of timber and cement down the left in faded gold ink with Marcus Bell's stamps,
  // and the balance page on the right
  const ledgerPage = done => {
    const [c, x] = canvas(70, 46);
    x.drawImage(bevel(mask(70, 46, g => rect(g, 0, 3, 70, 42, '#000')), LEATHER, 1, 1), 0, 0);
    for (const px of [2, 35]) x.drawImage(bevel(mask(70, 46, g => rect(g, px, 1, 33, 42, '#000')), PAGE, 1, 1), 0, 0);
    rect(x, 34, 1, 2, 42, 'dirt3'); rect(x, 33, 2, 1, 40, 'cream2'); rect(x, 36, 2, 1, 40, 'cream2');
    for (const [rx, rw] of [[8, 7], [20, 5]]) { rect(x, rx, 0, rw, 4, 'dirt3'); rect(x, rx + 1, 0, rw - 2, 3, 'cream0'); }
    rect(x, 12, 5, 1, 36, 'roofR0'); rect(x, 26, 5, 1, 36, 'roofR0');
    for (let y = 6; y < 34; y += 4) { rect(x, 4, y, 6, 1, 'brass3'); rect(x, 14, y, 3 + (y * 7) % 9, 1, 'brass3'); rect(x, 28, y, 4, 1, 'wood3'); }
    for (const y of [9, 25]) { rect(x, 4, y - 2, 6, 4, 'roofR2'); rect(x, 5, y - 1, 4, 2, 'roofR1'); }
    if (!done) {
      for (let y = 6; y < 30; y += 4) rect(x, 38, y, 28, 1, 'cream2');
      bigText(x, '?', 46, 9, 'red', 3); rect(x, 47, 9, 1, 1, 'rose');
      waxSeal(x, 51, 37, 5);
    } else {
      // Marcus Bell's stamp, bright red and square on the page, the station's new seal pressed beside it
      rect(x, 37, 2, 30, 36, 'red'); rect(x, 38, 3, 28, 34, 'cream1'); rect(x, 39, 4, 26, 1, 'red'); rect(x, 39, 35, 26, 1, 'red');
      ['PAID IN', 'FULL', 'WITH', 'FAMILY', 'LOVE'].forEach((s, k) => text(x, s, 52 - (textWidth(s) >> 1), 6 + k * 6, 'red'));
      for (const [a, b] of [[44, 8], [57, 14], [49, 26], [60, 31], [42, 20]]) dot(x, a, b, 'roofR0');
      rect(x, 4, 34, 28, 1, 'wood3'); text(x, '4800', 16, 35, 'ink2'); rect(x, 15, 41, 16, 1, 'ink2');
      waxSeal(x, 62, 39, 5);
    }
    return c;
  };
  LG.ledger = (v = 'cover') => v === 'spine' ? ledgerSpine() : v === 'page' ? ledgerPage(false) : ledgerCover(false);
  LG.ledger_balanced = (v = 'page') => v === 'spine' ? ledgerSpine() : v === 'cover' ? ledgerCover(true) : ledgerPage(true);
  const ledgerSM = `
    .ooooooooooo.
    oSyLLLLLLLyyo
    oSLLLLLLLLLyw
    oSLLggggLLLLw
    oSLLLLLLLLLLw
    oSLLggggLLccw
    oSLLLLLLLLcqw
    oSLLLggLLLccw
    oSLLLLLLLLLLw
    oSLLLLLLLLLLw
    oSyLLLLLLLLyw
    oSyyLLLLLLyyo
    .oooooooooooo`;
  const ledgerXS = `
    .oooooo.
    oSyLLyyw
    oSLggLLw
    oSLLLccw
    oSLggLLw
    oSyLLLyw
    .oooooo.`;
  const ledgerKey = done => ({ o: 'ink', S: 'wood5', L: 'wood4', y: 'brass1', g: 'brass2', w: 'cream1', c: done ? 'wood4' : 'brass3', q: done ? 'wood4' : 'brass1' });
  SM.ledger = () => S(ledgerSM, ledgerKey(false));
  SM.ledger_balanced = () => S(ledgerSM, ledgerKey(true));
  XS.ledger = () => S(ledgerXS, ledgerKey(false));
  XS.ledger_balanced = () => S(ledgerXS, ledgerKey(true));

  // Father's savings book from the village post office, hidden behind his radio: blue cloth, DANIEL on its label, every
  // page a withdrawal for the bridge's beams, down to nothing.
  const CLOTH = { o: 'roofB4', ol: 'roofB3', h: 'roofB1', b: 'roofB2', s: 'roofB3' };
  LG.savings_book = (v = 'cover') => {
    if (v === 'inside') {
      const [c, x] = canvas(58, 38);
      x.drawImage(bevel(mask(58, 38, g => rect(g, 0, 2, 58, 35, '#000')), CLOTH, 1, 1), 0, 0);
      for (const px of [2, 29]) x.drawImage(bevel(mask(58, 38, g => rect(g, px, 1, 27, 34, '#000')), PAGE, 1, 1), 0, 0);
      rect(x, 28, 1, 2, 34, 'dirt3');
      // each line a withdrawal with the post office's blue mark beside it, the balance running down to 0
      for (let k = 0; k < 9; k++) {
        const px = k < 5 ? 4 : 31, y = 5 + (k % 5) * 6;
        rect(x, px, y, 7, 1, 'stone3'); rect(x, px + 10, y, 5 - (k % 3), 1, 'ink2');
        disc(x, px + 21.5, y + 0.5, 2, d => d > 1.3 ? 'roofB3' : null);
      }
      text(x, '0', 47, 27, 'red'); rect(x, 44, 33, 9, 1, 'red');
      return c;
    }
    const [c, x] = canvas(34, 44);
    rect(x, 4, 3, 29, 39, 'cream2');
    x.drawImage(bevel(mask(34, 44, g => rect(g, 1, 1, 30, 40, '#000')), CLOTH, 1, 2), 0, 0);
    for (const [a, b] of [[2, 2], [29, 2], [2, 38], [29, 38]]) { rect(x, a, b, 2, 2, 'roofB1'); dot(x, a + (a > 9 ? 1 : 0), b + (b > 9 ? 1 : 0), 'sky1'); }
    text(x, 'POST', 9, 5, 'cream0'); text(x, 'SAVINGS', 3, 11, 'cream0');
    // the post's mark, a letter with a leaf for its stamp
    rect(x, 10, 18, 12, 8, 'roofB4'); rect(x, 11, 19, 10, 6, 'cream0'); line(x, 11, 19, 16, 22, 'roofB3'); line(x, 20, 19, 16, 22, 'roofB3'); dot(x, 19, 20, 'leaf3'); dot(x, 19, 21, 'leaf2');
    // the name label
    rect(x, 3, 29, 26, 9, 'roofB4'); rect(x, 4, 30, 24, 7, 'cream0'); text(x, 'DANIEL', 5, 31, 'ink2');
    return c;
  };
  SM.savings_book = () => S(`
    oooooooooo.
    obbbbbbbbbo
    obWWWWWWbbw
    obbbbbbbbbw
    obbbeeebbbw
    obbbeeebbbw
    obbbbbbbbbw
    obWWWWWWWbw
    obWkkkkkWbw
    obWWWWWWWbw
    oooooooooow`, { o: 'roofB4', b: 'roofB2', W: 'cream0', e: 'cream1', k: 'ink2', w: 'cream2' });
  XS.savings_book = () => S(`
    oooooo.
    obWWbo.
    obbbbow
    oWkkWow
    oooooow`, { o: 'roofB4', b: 'roofB2', W: 'cream0', k: 'ink2', w: 'cream2' });

  // Night 7's music box from the last box, FOR THE COURIER: fine walnut carved by Father's hand, a chamomile on its lid,
  // brass hinges and a small brass crank on its right side; Father's D and Mother's R cut under its base. It comes
  // silent and a little dusty (musicbox); wound three times at Mother's sewing table it plays, open, its lid lined with
  // the Gardener's dried lavender (musicbox_open).
  const WALNUT = { o: 'wood5', ol: 'wood4', h: 'wood2', b: 'wood3', s: 'wood4' }, WALNUT_TOP = { o: 'wood5', ol: 'wood4', h: 'wood1', b: 'wood2', s: 'wood3' };
  const musicBody = (x, W, H, open) => {
    // the front with its carved border, brass feet, the crank on the right side
    x.drawImage(bevel(mask(W, H, g => rect(g, 3, 23, 36, 14, '#000')), WALNUT, 1, 2), 0, 0);
    rect(x, 6, 26, 30, 1, 'wood4'); rect(x, 6, 33, 30, 1, 'wood4'); rect(x, 6, 26, 1, 8, 'wood4'); rect(x, 35, 26, 1, 8, 'wood4'); rect(x, 7, 27, 28, 1, 'wood2');
    for (let i = 9; i < 34; i += 4) { dot(x, i, 30, 'wood4'); dot(x, i + 1, 29, 'wood2'); }
    for (const fx of [4, 35]) { rect(x, fx, 37, 3, 2, 'brass4'); rect(x, fx, 37, 2, 1, 'brass1'); }
    rect(x, 39, 28, 2, 3, 'brass4'); rect(x, 41, open ? 23 : 25, 2, open ? 8 : 6, 'brass3'); rect(x, 41, open ? 23 : 25, 1, open ? 8 : 6, 'brass1');
    disc(x, 42, open ? 22.5 : 24.5, 1.8, (d, lit) => d > 1.2 ? 'brass4' : lit > 0 ? 'brass0' : 'brass2');
  };
  // the chamomile Father set into the lid in pale wood, its heart a brass pin
  const chamomileInlay = (x, cx, cy) => {
    lens(x, cx - 5, cy + 1, Math.PI - 0.3, 6, 1.4, 'wood1'); lens(x, cx + 5, cy + 1, 0.3, 6, 1.4, 'wood1');
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; lens(x, cx, cy, a, 4.5, 1.5, 'wood4'); lens(x, cx, cy, a, 3.8, 0.8, k < 4 ? 'cream0' : 'cream1'); }
    disc(x, cx, cy, 1.8, (d, lit) => d > 1.2 ? 'brass3' : 'brass1');
  };
  const musicClosed = dusty => {
    const [c, x] = canvas(46, 40);
    x.drawImage(bevel(mask(46, 40, g => rect(g, 3, 9, 36, 12, '#000')), WALNUT_TOP, 1, 1), 0, 0);
    for (const hx of [9, 30]) { rect(x, hx, 9, 4, 2, 'brass4'); rect(x, hx + 1, 9, 2, 1, 'brass1'); }
    chamomileInlay(x, 21, 15);
    rect(x, 3, 20, 36, 3, 'wood5'); rect(x, 4, 20, 34, 1, 'wood3');   // the lid's edge over the box
    musicBody(x, 46, 40, false);
    if (dusty) grime(x, 41, 0.05, ['stone2']);
    else glint(x, 33, 13);
    return c;
  };
  // turned over: its base, a brass foot at each corner, and the letters Father cut there: D, a heart, R
  const musicUnder = () => {
    const [c, x] = canvas(42, 30);
    x.drawImage(bevel(mask(42, 30, g => rect(g, 2, 3, 38, 24, '#000')), WALNUT_TOP, 1, 2), 0, 0);
    for (const [a, b] of [[5, 6], [36, 6], [5, 23], [36, 23]]) disc(x, a + 0.5, b + 0.5, 2, (d, lit) => d > 1.4 ? 'brass4' : lit > 0 ? 'brass0' : 'brass2');
    for (let i = 10; i < 33; i += 5) rect(x, i, 4, 1, 22, 'wood3');   // the grain
    engrave(x, ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'], 10, 11, 'wood5', 'wood1');
    engrave(x, ['.#.#.', '#####', '#####', '.###.', '..#..'], 18, 12, 'roofR3', 'wood1');
    engrave(x, ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'], 26, 11, 'wood5', 'wood1');
    return c;
  };
  // open and playing: the lid up, lined with lavender, the brass cylinder turning its pins past the steel comb,
  // notes rising and chamomile petals falling round it
  const musicOpen = () => {
    const [c, x] = canvas(46, 42);
    x.drawImage(bevel(mask(46, 42, g => rect(g, 5, 0, 32, 17, '#000')), WALNUT, 1, 1), 0, 0);
    rect(x, 8, 3, 26, 11, 'dusk5'); rect(x, 9, 4, 24, 9, 'lilac'); rect(x, 9, 4, 24, 1, X.lil0);
    for (const [lx, ly] of [[11, 7], [17, 10], [24, 6], [29, 9]]) { line(x, lx, ly + 3, lx + 2, ly - 1, 'leaf3'); dot(x, lx + 1, ly, 'dusk5'); dot(x, lx + 2, ly - 1, 'dusk5'); dot(x, lx + 1, ly + 1, 'dusk5'); }
    for (const hx of [9, 30]) { rect(x, hx, 15, 4, 3, 'brass4'); rect(x, hx + 1, 15, 2, 2, 'brass1'); }
    x.drawImage(bevel(mask(46, 42, g => rect(g, 3, 17, 36, 7, '#000')), WALNUT_TOP, 1, 1), 0, 0);
    rect(x, 6, 18, 30, 5, 'wood5');
    rect(x, 8, 19, 16, 3, 'brass2'); rect(x, 8, 19, 16, 1, 'brass0'); for (let i = 9; i < 24; i += 2) dot(x, i, 20 + (i % 4 ? 0 : 1), 'brass4');
    rect(x, 25, 19, 10, 3, 'iron1'); for (let i = 26; i < 35; i += 2) rect(x, i, 19, 1, 3, 'iron3');
    musicBody(x, 46, 42, true);
    const note = S(`
      ..oo.
      ..o.o
      ..o..
      ooo..
      oo...`, { o: 'wood4' });
    x.drawImage(note, 39, 4); x.drawImage(note, 0, 8);
    for (const [px, py, a] of [[41, 14, 0.6], [2, 20, -0.8], [43, 37, 2.2], [1, 33, 1.4]]) lens(x, px, py, a, 3, 1, 'white');
    glint(x, 33, 26);
    return c;
  };
  LG.musicbox = (v = 'closed') => v === 'under' ? musicUnder() : v === 'open' ? musicOpen() : musicClosed(true);
  LG.musicbox_open = (v = 'open') => v === 'under' ? musicUnder() : v === 'closed' ? musicClosed(false) : musicOpen();
  const musicKey = { o: 'wood5', a: 'wood2', b: 'wood3', c: 'wood4', w: 'cream0', y: 'brass1', q: 'brass3', l: 'lilac', n: 'wood4' };
  SM.musicbox = SM.musicbox_open = (v = 'closed') => v === 'open' ? S(`
    ..oooooooooo...
    ..ollllllllo.n.
    ..ollllllllo.nn
    ..oyoooooyoo...
    .oaaaaaaaaaao..
    oooooooooooooo.
    obbbbbbbbbbbboq
    obcbbbbbbbbcbqy
    obbbbbbbbbbbbo.
    oooooooooooooo.
    .qq.......qq...`, musicKey) : S(`
    .oooooooooooo..
    oaaaaawaaaaao..
    oaaaawywaaaao..
    oaaaaawaaaaao..
    oooooooooooooo.
    obbbbbbbbbbbboq
    obcbbbbbbbbcbqy
    obbbbbbbbbbbbo.
    oooooooooooooo.
    .qq.......qq...`, musicKey);
  XS.musicbox = XS.musicbox_open = (v = 'closed') => v === 'open' ? S(`
    .oooooo...
    .ollllo.n.
    .oyooyo.nn
    ooooooooo.
    obbbbbbboq
    obcbbbcboy
    ooooooooo.`, musicKey) : S(`
    .ooooooo..
    oaaawaaao.
    ooooooooo.
    obbbbbbboq
    obcbbbcboy
    ooooooooo.`, musicKey);

  // Mother's letter in the last box: a thick envelope, no name on it and no sender, sealed in red wax pressed with a
  // chamomile, a sprig of dried lavender caught under the seal (letter); opened and read, the pages in her hand (letter_read).
  const ENVELOPE = { o: 'dirt4', ol: 'dirt3', h: 'white', b: 'cream0', s: 'cream1' };
  LG.letter = (v = 'back') => {
    const [c, x] = canvas(44, 30);
    x.drawImage(bevel(mask(44, 30, g => rect(g, 1, 2, 42, 27, '#000')), ENVELOPE, 1, 2), 0, 0);
    if (v === 'front') {
      // the face: blank, not a name on it; only the lavender's faint stain in a corner
      for (const [a, b] of [[34, 6], [36, 7], [35, 8], [37, 6]]) dot(x, a, b, X.lil0);
      rect(x, 3, 26, 38, 1, 'cream1');
      return c;
    }
    poly(x, [[2, 3], [42, 3], [22, 18]], 'cream1'); line(x, 2, 3, 22, 17, 'dirt3'); line(x, 42, 3, 22, 17, 'dirt3');
    line(x, 2, 27, 16, 15, 'cream2'); line(x, 42, 27, 28, 15, 'cream2');
    // the lavender under the seal
    line(x, 12, 24, 22, 17, 'leaf3'); for (const [a, b] of [[13, 22], [15, 21], [14, 23], [16, 20], [12, 23]]) { dot(x, a, b, 'lilac'); dot(x, a + 1, b - 1, 'dusk5'); }
    disc(x, 22, 17.5, 5.5, (d, lit) => d > 4.8 ? 'roofR4' : lit > 0.55 && d > 2.5 ? 'red' : lit > -0.3 ? 'roofR2' : 'roofR3');
    rect(x, 18, 22, 2, 2, 'roofR3'); rect(x, 25, 22, 1, 3, 'roofR3');
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; dot(x, Math.round(21.5 + Math.cos(a) * 2.6), Math.round(17 + Math.sin(a) * 2.6), 'roofR4'); }
    dot(x, 22, 17, 'rose'); dot(x, 19, 14, 'white');
    return c;
  };
  LG.letter_read = () => {
    const [c, x] = canvas(38, 46);
    x.drawImage(bevel(mask(38, 46, g => rect(g, 2, 1, 34, 44, '#000')), { o: 'dirt3', ol: 'dirt2', h: 'white', b: 'cream0', s: 'cream1' }, 1, 2), 0, 0);
    rect(x, 3, 15, 32, 1, 'cream2'); rect(x, 3, 30, 32, 1, 'cream2');   // its folds
    // her hand: a greeting, line on line of it, and RATIH at the foot
    for (let i = 0; i < 12; i += 3) rect(x, 6 + i, 5, 2, 1, 'wood4');
    for (let y = 9; y < 37; y += 3) { if (y === 15 || y === 30) continue; for (let i = 6; i < 32 - (y * 5) % 7; i += 1) if ((i + y) % 5 !== 0) dot(x, i, y + ((i >> 1) % 2), 'wood3'); }
    text(x, 'RATIH', 14, 39, 'wood4');
    for (const [a, b] of [[30, 3], [32, 4], [31, 5], [33, 3]]) dot(x, a, b, 'lilac');
    return c;
  };
  SM.letter_read = () => S(`
    oooooooooo
    oWWWWWWWWo
    okkkWkkkWo
    oWkkkkWkWo
    occccccccc
    okkWkkkkWo
    oWkkkWkkWo
    occccccccc
    oWkkkkWkWo
    oWWWWWkkko
    oooooooooo`, { o: 'dirt3', W: 'cream0', k: 'wood3', c: 'cream2' });
  XS.letter_read = () => S(`
    oooooo
    oWkkWo
    occcco
    okkWko
    oWWkko
    oooooo`, { o: 'dirt3', W: 'cream0', k: 'wood3', c: 'cream2' });

  // The photo from the sewing table's hidden drawer: Father, Mother and little Satria laughing over grilled corn in the
  // kitchen, taken by Theo when none of them was looking; his studio's stamp and a line of his pencil on the back. The
  // print is the cast's own sprites at their own size, washed to sepia like the film is washed to grey.
  const SEPIA = ['wood5', 'wood4', 'wood3', 'dirt3', 'dirt2', 'dirt1', 'dirt0'].map(c => PX.col(c).match(/\w\w/g).map(h => parseInt(h, 16)));
  LG.photo = (v = 'front') => {
    const W = 64, H = 54, [c, x] = canvas(W, H);
    x.drawImage(bevel(mask(W, H, g => rect(g, 1, 1, W - 2, H - 2, '#000')), { o: 'stone3', ol: 'stone2', h: 'white', b: 'cream0', s: 'cream1' }, 1, 1), 0, 0);
    if (v === 'back') {
      disc(x, 19, 19, 12, d => d > 11.2 || (d > 9.6 && d < 10.4) ? 'roofB3' : null); text(x, 'THEO', 19 - (textWidth('THEO') >> 1), 17, 'roofB3');
      for (const [y, w] of [[36, 40], [41, 30], [46, 18]]) for (let i = 0; i < w; i++) if (i % 7 !== 6) dot(x, 10 + i, y + ((i >> 2) % 2), 'stone3');
      return c;
    }
    // the print, 56x42 under a deeper bottom margin: the kitchen wall and its window, the three of them behind the
    // table, the corn on its clay grill and the smoke going up
    const PW = 56, PH = 42, [pc, g] = canvas(PW, PH);
    rect(g, 0, 0, PW, PH, 'cream1'); rect(g, 0, 0, PW, 3, 'wood1');
    rect(g, 36, 5, 14, 13, 'wood3'); rect(g, 37, 6, 12, 11, 'white'); rect(g, 42, 6, 1, 11, 'wood3'); rect(g, 37, 11, 12, 1, 'wood3');
    rect(g, 4, 9, 14, 1, 'wood3'); for (const i of [5, 9, 13]) rect(g, i, 6, 3, 3, i === 9 ? 'stone1' : 'roofR2');
    CH.draw(g, 'daniel', 'laugh', 1, 17, 39, 1, { shadow: false });
    CH.draw(g, 'mother', 'laugh', 2, 41, 39, -1, { shadow: false });
    CH.draw(g, 'young_satria', 'laugh', 0, 30, 45, 1, { shadow: false });
    rect(g, 0, 37, PW, 5, 'wood4'); rect(g, 0, 37, PW, 1, 'wood2'); rect(g, 0, 38, PW, 1, 'wood3');
    rect(g, 43, 34, 11, 4, 'roofR4'); rect(g, 43, 34, 11, 1, 'roofR2'); rect(g, 44, 35, 9, 1, 'roofR0');
    for (const i of [44, 48]) { rect(g, i, 32, 4, 2, 'light1'); dot(g, i + 1, 32, 'brass3'); dot(g, i + 3, 33, 'brass3'); }
    for (let j = 0; j < 14; j++) dot(g, 49 + Math.round(Math.sin(j * 0.7) * 1.6), 30 - j, j % 3 ? 'white' : 'cream0');
    // washed to sepia by its light
    const im = g.getImageData(0, 0, PW, PH), d = im.data;
    for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) {
      const o = (j * PW + i) * 4, l = (0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]) / 255;
      const [r, gg, b] = SEPIA[Math.min(6, Math.round(6 * l ** 1.6))];
      d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    x.drawImage(pc, 4, 4);
    return c;
  };
  SM.photo = () => S(`
    ooooooooooooo
    oWWWWWWWWWWWo
    oWllllllllyWo
    oWlhlllllhyWo
    oWlblhlllblWo
    oWlblblllblWo
    oWddddddddWWo
    oWWWWWWWWWWWo
    ooooooooooooo`, { o: 'stone3', W: 'cream0', l: 'dirt1', h: 'wood3', b: 'wood4', d: 'wood3', y: 'dirt0' });
  XS.photo = () => S(`
    oooooooo
    oWWWWWWo
    oWhlhlWo
    oWddddWo
    oWWWWWWo
    oooooooo`, { o: 'stone3', W: 'cream0', l: 'dirt1', h: 'wood3', d: 'wood3' });

  // Day 8: Valdo's contract torn in two before the whole village, the halves apart, scraps on the wind.
  const SHEET = { o: 'stone3', ol: 'stone2', h: 'white', b: 'cream0', s: 'cream1' };
  LG.contract_torn = () => {
    const [c, x] = canvas(46, 40);
    const edge = [[21, 3], [19, 8], [22, 12], [18, 17], [21, 22], [17, 27], [20, 32], [18, 37]];
    x.drawImage(bevel(mask(46, 40, g => poly(g, [[2, 3], ...edge, [2, 37]], '#000')), SHEET, 1, 1), 0, 0);
    x.drawImage(bevel(mask(46, 40, g => poly(g, [...edge.map(([a, b]) => [a + 5, b + 2]), [42, 39], [42, 5]].reverse(), '#000')), SHEET, 1, 1), 0, 0);
    text(x, 'DR', 5, 6, 'ink2'); text(x, 'AFT', 26, 8, 'ink2');
    for (const [y, w] of [[13, 13], [16, 11], [19, 12], [22, 9]]) { rect(x, 5, y, w, 1, 'stone2'); rect(x, 26, y + 2, w + 2, 1, 'stone2'); }
    rect(x, 5, 32, 10, 1, 'ink2');   // the line to sign on, empty for good
    disc(x, 35, 31, 4, d => d > 3.2 ? 'roofR3' : d > 2 ? 'red' : 'cream0');
    for (const [a, b, w, h] of [[38, 0, 3, 2], [43, 4, 2, 2], [11, 0, 2, 2], [1, 0, 2, 1]]) { rect(x, a, b, w, h, 'cream0'); dot(x, a + w - 1, b + h - 1, 'stone2'); }
    return c;
  };
  SM.contract_torn = () => S(`
    oooooo..ooooo.
    oWkkWo.oWkkWo.
    oWWWWWooWWWWo.
    okkkWo.okkkWo.
    oWWWWWooWWrWo.
    okkkWo.oWrrWo.
    oWWWWWooWWWWo.
    oooooo..ooooo.`, { o: 'stone3', W: 'cream0', k: 'stone2', r: 'red' });
  XS.contract_torn = () => S(`
    oooo.ooo.
    oWko.oWo.
    okWooWro.
    oWko.oko.
    oooo.ooo.`, { o: 'stone3', W: 'cream0', k: 'stone2', r: 'red' });
  XS.contract = () => S(`
    .ooo.....
    ooooooooo
    oWkkkWWao
    oWWWWWWao
    oWkkWrWao
    ooooooooo`, { o: 'dirt4', a: 'dirt1', W: 'cream0', k: 'stone2', r: 'red' });

  // Day 8: the new stamp for the post office Satria opens again, its turned handle still bright with varnish, and the
  // mark it leaves: BELLWOOD POST 1972.
  LG.post_stamp = (v = 'handle') => {
    if (v === 'face') {
      const [c, x] = canvas(46, 30);
      x.drawImage(bevel(mask(46, 30, g => rect(g, 1, 1, 44, 28, '#000')), SHEET, 1, 2), 0, 0);
      const ink = 'roofB3';
      rect(x, 4, 4, 38, 22, ink); rect(x, 5, 5, 36, 20, 'cream0'); rect(x, 6, 6, 34, 18, ink); rect(x, 7, 7, 32, 16, 'cream0');
      text(x, 'BELLWOOD', 8, 9, ink); rect(x, 8, 15, 30, 1, ink); text(x, 'POST', 8, 17, ink); text(x, '1972', 24, 17, ink);
      for (const [a, b] of [[12, 4], [30, 6], [40, 14], [9, 18], [26, 25], [19, 11]]) dot(x, a, b, 'roofB1');
      return c;
    }
    const [c, x] = canvas(30, 44);
    // the knob and neck turned from honey wood, the brass ferrule, the rubber block and its blue-inked face
    x.drawImage(bevel(mask(30, 44, g => { ellipse(g, 15, 7, 7, 6, '#000'); rect(g, 12, 12, 6, 14, '#000'); ellipse(g, 15, 25, 6, 3, '#000'); }), { o: 'wood4', ol: 'wood3', h: 'wood0', b: 'wood1', s: 'wood2' }, 1, 2), 0, 0);
    x.drawImage(bevel(mask(30, 44, g => rect(g, 8, 27, 14, 4, '#000')), { o: 'brass4', ol: 'brass3', h: 'brass0', b: 'brass1', s: 'brass2' }, 1, 1), 0, 0);
    x.drawImage(bevel(mask(30, 44, g => rect(g, 5, 31, 20, 9, '#000')), { o: 'ink', ol: 'iron4', h: 'iron2', b: 'iron3', s: 'iron4' }, 1, 1), 0, 0);
    rect(x, 5, 40, 20, 2, 'roofB3'); rect(x, 6, 40, 18, 1, 'roofB2');
    glint(x, 11, 4); dot(x, 13, 15, 'wood0');
    return c;
  };
  SM.post_stamp = () => S(`
    ..oooo..
    .oaabbo.
    .oabbbo.
    ..obbo..
    ..obbo..
    .ooooooo
    oyyyyyyo
    oiiiiiio
    oiiiiiio
    ouuuuuuo
    oooooooo`, { o: 'wood4', a: 'wood0', b: 'wood1', y: 'brass1', i: 'iron3', u: 'roofB2' });
  XS.post_stamp = () => S(`
    .oo..
    oabo.
    .obo.
    oyyyo
    oiiio
    ouuuo`, { o: 'wood4', a: 'wood0', b: 'wood1', y: 'brass1', i: 'iron3', u: 'roofB2' });

  // The key to Satria's home: an old brass key, mossy from two years under the geranium pot.
  SM.homekey = () => S(`
    .oooo..........
    oyyddo.........
    oy..do.........
    oy..doooooooo..
    oyyddyyyymyyyo.
    .oooooooooydmo.
    .........oyo.o.
    .........oo....`, { o: 'brass4', y: 'brass1', d: 'brass2', m: 'g3' });
  XS.homekey = () => S(`
    .ooo....
    oy.do...
    oyydoooo
    .ooomydo
    ....oyo.`, { o: 'brass4', y: 'brass1', d: 'brass2', m: 'g3' });
  LG.homekey = () => {
    const [c, x] = canvas(44, 24);
    const lit = (d, l) => d > 6.2 ? 'brass4' : l > 0.5 ? 'brass0' : l > -0.3 ? 'brass1' : 'brass2';
    // the bow, a ring with a hole, then the shank and its bit
    disc(x, 9, 11, 8, lit); disc(x, 9, 11, 3.5, () => 'brass4'); x.clearRect(7, 9, 5, 5); x.clearRect(8, 8, 3, 7); x.clearRect(6, 10, 7, 3);
    rect(x, 16, 9, 26, 5, 'brass4'); rect(x, 16, 10, 25, 3, 'brass1'); rect(x, 16, 10, 25, 1, 'brass0');
    rect(x, 33, 13, 8, 8, 'brass4'); rect(x, 34, 13, 6, 7, 'brass2'); rect(x, 36, 17, 2, 4, 'brass4');
    // moss and verdigris in the grooves
    for (const [a, b] of [[4, 6], [5, 15], [13, 15], [22, 12], [27, 11], [35, 15], [38, 19], [12, 5]]) { dot(x, a, b, 'g3'); dot(x, a + 1, b, 'g2'); }
    return c;
  };

  // Helen's market basket, held by its handle: woven twig, two loaves poking out.
  XS.basket = () => S(`
    ..ooooo..
    .o.....o.
    .oaabbao.
    ooooooooo
    occccccco
    ocdcdcdco
    ocdcdcdco
    .ooooooo.`, { o: 'wood4', a: 'dirt1', b: 'dirt0', c: 'wood2', d: 'wood3' });

  // Valdo's briefcase, held by its handle: polished dark leather, brass clasps.
  XS.briefcase = () => S(`
    ...oooo...
    ...o..o...
    oooooooooo
    ohbhhhhbho
    ollllllllo
    oddddddddo
    oooooooooo`, { o: 'ink', h: 'wood3', b: 'brass1', l: 'wood4', d: 'wood5' });

  /* ================================================================ ICONS (16x16, ink outline) */
  const ICK = { o: 'ink' };
  ICONS.bag = () => S(`
    ................
    .....oooooo.....
    ....oo....oo....
    ....o......o....
    ..oooooooooooo..
    .oaaaaaaaaaaaao.
    .oabbbbbbbbbbco.
    .oobbbbbbbbbboo.
    .ocooooyyooooco.
    .occcccoyoccccco
    .occccccooccccco
    .occccccccccccco
    .ocdcccccccccdco
    .odddddddddddddo
    ..ooooooooooooo.
    ................`.split('\n').map(s => s.trim().slice(0, 16)).join('\n'), { ...ICK, a: 'wood0', b: 'wood1', c: 'wood2', d: 'wood3', y: 'brass1' });
  ICONS.look = () => S(`
    ................
    ....ooooo.......
    ...oaaaaao......
    ..oaWWgaaao.....
    .oaWggggggao....
    .oaWgggggGao....
    .oagggggGGao....
    .oaggggGGGao....
    ..oagGGGGao.....
    ...oaaaaaoo.....
    ....ooooobbo....
    ..........obbo..
    ...........obbo.
    ............obbo
    .............oo.
    ................`, { ...ICK, a: 'brass1', W: 'white', g: 'sky1', G: 'sky2', b: 'wood2' });
  ICONS.talk = () => S(`
    ................
    ..oooooooooooo..
    .owwwwwwwwwwwwo.
    owwwwwwwwwwwwwwo
    owwwwwwwwwwwwwwo
    owwrrwwrrwwrrwwo
    owwrrwwrrwwrrwwo
    owwwwwwwwwwwwwco
    owwwwwwwwwwwwcco
    .occccccccccccoo
    ..oooowwoooooo..
    .....owwo.......
    ....owwo........
    ....ooo.........
    ................
    ................`, { ...ICK, w: 'cream0', c: 'cream2', r: 'rose' });
  ICONS.hand = () => S(`
    ................
    .....oo.oo......
    ....oaaoaao.oo..
    ....oabkabkoaao.
    .oo.oabkabkoabo.
    oaaooabkabkoabo.
    oabboabkabkabbo.
    .obbbbbbbbbbbbo.
    ..obbbbbbbbbbbo.
    ..obbbbbbbbbbco.
    ...obbbbbbbbbco.
    ...obbbbbbbbco..
    ....obbbbbbcco..
    .....occcccco...
    ......oooooo....
    ................`, { ...ICK, a: 'ant0', b: 'roofR0', c: 'ant1', k: 'ant1' });
  ICONS.lantern = () => S(`
    .......oo.......
    ......o..o......
    .......oo.......
    .....oooooo.....
    ....oaabbbco....
    ...ooooooooo....
    ....oyWWWyo.....
    ....oyWFWyo.....
    ....oyWFFyo.....
    ....oyyFyyo.....
    ....oyyyyyo.....
    ...ooooooooo....
    ....oabbbco.....
    .....oooooo.....
    ................
    ................`.split('\n').map(s => s.trim()).join('\n'), { ...ICK, a: 'brass0', b: 'brass1', c: 'brass2', y: 'light1', W: 'light0', F: 'light3' });
  ICONS.clock = () => S(`
    ..oo.......oo...
    .orro.....orro..
    .oroooooooooro..
    ..oowwwwwwwoo...
    ..owwwwkwwwwo...
    .owwwwwkwwwwwo..
    .owwwwwkwwwwwo..
    .owwwwwkkkkwwo..
    .owwwwwwwwwwwo..
    .owwwwwwwwwwco..
    ..owwwwwwwwco...
    ..oocwwwwwcoo...
    ...ooooooooo....
    ..oo.......oo...
    ................
    ................`, { ...ICK, r: 'rose', w: 'cream0', c: 'cream2', k: 'ink2' });
  ICONS.heart = () => S(`
    ................
    ..oooo...oooo...
    .orrrro.orrrro..
    orWWrrrorrrrrro.
    orWrrrrrrrrrrro.
    orrrrrrrrrrrRro.
    orrrrrrrrrrrRro.
    .orrrrrrrrrRro..
    ..orrrrrrrRro...
    ...orrrrrRro....
    ....orrrRro.....
    .....orRro......
    ......oro.......
    .......o........
    ................
    ................`, { ...ICK, r: 'rose', R: 'roofR2', W: 'white' });
  ICONS.note = () => S(`
    ................
    ..ooooooooo.....
    ..owwwwwwwoo....
    ..owllllwwoco...
    ..owwwwwwwoooo..
    ..owllllllllwo..
    ..owwwwwwwwwwo..
    ..owllllllllwo..
    ..owwwwwwwwwwo..
    ..owllllllwwwo..
    ..owwwwwwwwwwo..
    ..owllllwwwrro..
    ..owwwwwwwwrro..
    ..occcccccccco..
    ..oooooooooooo..
    ................`, { ...ICK, w: 'cream0', l: 'stone2', c: 'cream2', r: 'rose' });
  const speaker = `
    ................
    ......oo........
    .....oao........
    ....oabo........
    .ooooabo........
    .oaaabbo........
    .oabbbbo........
    .oabbbbo........
    .occcbbo........
    .ooooccoo.......
    ....occo........
    .....oco........
    ......oo........
    ................
    ................
    ................`;
  ICONS['sound-on'] = () => { const c = S(speaker, { ...ICK, a: 'cream0', b: 'brass1', c: 'brass2' }), x = c.getContext('2d');
    const w = C('roofG2'); for (const [px, py] of [[10, 5], [11, 6], [11, 7], [11, 8], [10, 9], [12, 3], [13, 4], [14, 5], [14, 6], [14, 7], [14, 8], [14, 9], [13, 10], [12, 11]]) rect(x, px, py, 1, 1, w);
    return c; };
  ICONS['sound-off'] = () => { const c = S(speaker, { ...ICK, a: 'cream0', b: 'brass1', c: 'brass2' }), x = c.getContext('2d');
    for (let k = 0; k < 5; k++) { rect(x, 10 + k, 5 + k, 2, 1, 'roofR2'); rect(x, 14 - k, 5 + k, 2, 1, 'roofR2'); }
    return c; };

  // The HUD's day-and-phase dial (GDD 10.2), one per phase: a round window on the sky over a hill, the sun rising,
  // high, setting, or the moon and two stars. Inside the ink ring, sky above the hill's line and hill below it.
  function phaseDial(sky, hill, draw) {
    const [c, x] = canvas(16, 16);
    for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) {
      const d = Math.hypot(px - 7.5, py - 7.5);
      if (d > 8) continue;
      const ground = py > 10 + Math.round(Math.sin(px * 0.5) * 0.8);
      rect(x, px, py, 1, 1, d > 7 ? 'ink' : ground ? hill : sky[Math.min(sky.length - 1, Math.floor(py / 4))]);
    }
    draw(x);
    return c;
  }
  const sun = (x, cy, r, col) => { for (let py = -r; py <= r; py++) for (let px = -r; px <= r; px++) if (px * px + py * py <= r * r + 1 && cy + py <= 10) rect(x, 7 + px, cy + py, 1, 1, col); };
  ICONS.morning = () => phaseDial(['sky2', 'sky1', 'dusk0'], 'roofG2', x => { sun(x, 10, 3, 'light2'); rect(x, 6, 8, 2, 1, 'light0'); });
  ICONS.midday = () => phaseDial(['sky3', 'sky2', 'sky1'], 'roofG2', x => {
    sun(x, 5, 2, 'light2'); rect(x, 6, 4, 1, 1, 'light0');
    for (const [px, py] of [[7, 1], [3, 5], [11, 5], [4, 2], [10, 2]]) rect(x, px, py, 1, 1, 'light1');
  });
  ICONS.dusk = () => phaseDial(['dusk4', 'dusk3', 'dusk2'], 'roofG3', x => { sun(x, 11, 3, 'light3'); rect(x, 5, 9, 4, 1, 'light2'); });
  ICONS.night = () => phaseDial(['iron4', 'dusk5', 'dusk4'], 'roofG4', x => {
    sun(x, 5, 3, 'light0');
    for (let py = -3; py <= 3; py++) for (let px = -3; px <= 3; px++) if ((px - 2) * (px - 2) + (py + 1) * (py + 1) <= 8) rect(x, 7 + px, 5 + py, 1, 1, ['iron4', 'dusk5', 'dusk4'][Math.floor((5 + py) / 4)]);
    rect(x, 3, 6, 1, 1, 'light1'); rect(x, 11, 3, 1, 1, 'white'); rect(x, 12, 8, 1, 1, 'light1');
  });

  /* ================================================================ FOLIAGE (shared by the station) */
  // Canopy from clumps [cx, cy, r]; each clump lit from the top-left with a scalloped rim and leaf clusters.
  function canopy(w, h, clumps, seed, pal = ['leaf0', 'leaf1', 'leaf2', 'leaf3', 'leaf4', 'leaf5']) {
    const [c, x] = canvas(w, h), r = rng(seed), own = new Int16Array(w * h).fill(-1);
    const bump = clumps.map(() => [r() * 6.28, 3 + Math.floor(r() * 3)]);
    clumps.forEach(([cx, cy, cr], k) => {
      const [ph, n] = bump[k];
      for (let j = Math.max(0, Math.floor(cy - cr - 2)); j < Math.min(h, cy + cr + 2); j++) for (let i = Math.max(0, Math.floor(cx - cr - 2)); i < Math.min(w, cx + cr + 2); i++) {
        const dx = i + 0.5 - cx, dy = j + 0.5 - cy, a = Math.atan2(dy, dx), rr = cr + 1.1 * Math.sin(a * n * 2 + ph);
        if (dx * dx + dy * dy <= rr * rr) own[j * w + i] = k;
      }
    });
    const col = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = own[j * w + i]; if (k < 0) continue;
      const [cx, cy, cr] = clumps[k], dx = i + 0.5 - cx, dy = j + 0.5 - cy, lit = -(dx * 0.8 + dy) / (cr * 1.3);
      const edgeBR = (i + 1 < w && own[j * w + i + 1] !== k && own[j * w + i + 1] >= 0) || (j + 1 < h && own[(j + 1) * w + i] !== k && own[(j + 1) * w + i] >= 0);
      let t = lit > 0.55 ? 1 : lit > 0.1 ? 2 : lit > -0.45 ? 3 : 4;
      if (edgeBR) t = Math.min(5, t + 1);
      col.push([i, j, t]);
    }
    for (const [i, j, t] of col) { x.fillStyle = C(pal[t]); x.fillRect(i, j, 1, 1); }
    // leaf clusters: small hooked marks on a jittered grid, lighter in the lit area, darker in shade
    for (let j = 2; j < h - 2; j += 4) for (let i = 2 + ((j >> 2) % 2) * 2; i < w - 2; i += 5) {
      const k = own[j * w + i]; if (k < 0 || r() < 0.35) continue;
      const [cx, cy, cr] = clumps[k], lit = -((i - cx) * 0.8 + (j - cy)) / (cr * 1.3);
      const tone = lit > 0.3 ? pal[0] : lit > -0.2 ? pal[1] : lit > -0.6 ? pal[2] : pal[3];
      if (own[j * w + i + 1] === k && own[(j + 1) * w + i] === k) { x.fillStyle = C(tone); x.fillRect(i, j, 2, 1); x.fillRect(i + (lit > 0 ? 0 : 1), j + 1, 1, 1); }
    }
    // silhouette outline (sel-out: lighter on the top-left)
    const [o, ox] = canvas(w + 2, h + 2), a = x.getImageData(0, 0, w, h).data, M = (i, j) => i >= 0 && j >= 0 && i < w && j < h && a[(j * w + i) * 4 + 3] > 0;
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
      if (M(i, j)) continue;
      const n = M(i + 1, j) || M(i, j + 1), s = M(i - 1, j) || M(i, j - 1);
      if (n || s) { ox.fillStyle = C(s ? pal[5] : pal[4]); ox.fillRect(i + 1, j + 1, 1, 1); }
    }
    ox.drawImage(c, 1, 1);
    return o;
  }
  window.IT = { item, icon };
})();
