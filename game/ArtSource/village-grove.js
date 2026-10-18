'use strict';
/* The grove in the village kit: the hidden way to Marlow's shop (village-west.js). A narrow path winds between
   ancient trees whose roots tangle over the ground, through ferns, moss and fallen logs.
   Every maker returns the VIL sprite contract ({ img, ax, ay } with the feet at ax, ay); rows below the feet are what
   lies on the ground in front (roots), which the game lays flat. */
(() => {
  const V = VIL, { fill, px, disc, inked, foliage, LEAF } = V, { hash } = KIT, P = PX.PAL;
  const OLD = ['#a59a88', '#7c7266', '#595049', '#3a3236'];    // ancient grey-brown bark
  const MOSS = LEAF.deep, FERN = LEAF.green;
  const inEllipse = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const anyOf = fs => (x, y) => fs.some(f => f(x, y));

  /* A root along pts ([x, y] in order away from the trunk), thinning from w0 to w1. Seen from above at a slant: its
     rounded back lit, its near side a dark band, so it reads as lying on the ground and humping over it. */
  function root(b, pts, w0, w1, R, seed) {
    const segs = [];
    let len = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push([pts[i - 1], pts[i], len, l]); len += l; }
    const at = f => { for (const [a, c, s, l] of segs) if (f <= s + l) { const t = (f - s) / l; return [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]; } return pts[pts.length - 1]; };
    const each = fn => { for (let f = 0; f <= len; f += 0.5) { const [x, y] = at(f), w = w0 + (w1 - w0) * (f / len); fn(Math.round(x), Math.round(y), w, f); } };
    each((x, y, w) => disc(b, x, y + Math.max(1, Math.round(w / 4)), Math.round(w / 2), Math.max(1, Math.round(w / 3)), R[3]));
    each((x, y, w) => disc(b, x, y, Math.round(w / 2), Math.max(1, Math.round(w / 3)), R[1]));
    each((x, y, w, f) => { if (w > 3) fill(b, x - Math.round(w / 4), y - Math.max(0, Math.round(w / 3) - 1), Math.max(1, Math.round(w / 2)), 1, (hash(f | 0, 0, seed) < 0.2 ? R[1] : R[0])); });
    // a few bark creases across it
    each((x, y, w, f) => { if (w > 4 && (f | 0) % 9 === 0 && f % 1 === 0) px(b, x, y, R[2]); });
  }

  // Moss on bark: a cushion w wide at (x, y), lit on top, with a few drips below.
  function moss(b, x, y, w, seed) {
    for (let i = 0; i < w; i++) {
      const h = 2 + ((hash(x + i, y, seed) * 3) | 0), top = y - (h >> 1);
      for (let j = 0; j < h; j++) px(b, x + i, top + j, j === 0 ? MOSS[1] : j === 1 ? MOSS[2] : MOSS[3]);
      if (hash(x + i, y, seed + 1) < 0.18) for (let j = 0; j < 2 + ((hash(i, y, seed) * 3) | 0); j++) px(b, x + i, top + h + j, MOSS[4]);
    }
  }

  // Bark down a column of a trunk: lit on the left edge, dark on the right, fissures wandering down it.
  function barkRow(b, x0, x1, y, R, seed) {
    const w = x1 - x0;
    for (let x = x0; x < x1; x++) {
      const i = x - x0, f = Math.sin((x * 0.9 + Math.sin(y / 9 + x * 0.3) * 2.2)) > 0.86;
      let c = i < 2 ? R[0] : i > w - 4 ? (i > w - 2 ? R[3] : R[2]) : R[1];
      if (f && i > 1 && i < w - 3) c = R[3];
      else if (i > 1 && i < w * 0.35 && hash(x >> 1, y >> 2, seed) < 0.25) c = R[0];
      px(b, x, y, c);
    }
  }

  /* An ancient tree: a huge dark crown over a thick trunk that flares into buttress roots, which run out over the
     ground and tangle. Moss climbs its lit side; vines hang from the crown. r: crown radius. */
  function grandTree(o = {}) {
    const r = o.r || 56, seed = o.seed || 1, ramp = LEAF[o.leaf || 'deep'], tw = o.trunk || Math.round(r * 0.78);
    const W = r * 2 + 96, cx = Math.round(W / 2), cy = Math.round(r * 0.8) + 4, feet = cy + Math.round(r * 0.7) + (o.tall || 70), H = feet + 26;
    // a ragged crown: a core and lobes of uneven size round it, heavier on one side
    const parts = [inEllipse(cx, cy + 4, r * 0.86, r * 0.62)];
    for (let k = 0; k < 9; k++) { const a = Math.PI * (0.75 + k * 0.19) + hash(k, 1, seed) * 0.35, d = r * (0.55 + hash(k, 4, seed) * 0.2), q = 0.32 + hash(k, 7, seed) * 0.2; parts.push(inEllipse(cx + Math.cos(a) * d * 1.15, cy + 4 + Math.sin(a) * d * 0.78, r * q * 1.15, r * q)); }
    const crown = anyOf(parts);
    const out = inked(W, H, b => {
      // roots behind the trunk first, then the trunk, then the roots in front
      const R = o.bark || OLD, roots = [];
      for (let k = 0; k < 9; k++) {
        const side = k % 2 ? 1 : -1, n = k >> 1, ang = side * (0.55 + n * 0.32 + hash(k, 2, seed) * 0.3), reach = 34 + hash(k, 3, seed) * 30;
        const x0 = cx + side * (tw / 2 - 6 - n * 3), y0 = feet - 10 + n * 3;
        const pts = [[x0, y0]];
        // each root snakes out and dips, and the far ones cross back under their neighbours
        for (let s = 1; s <= 6; s++) { const t = s / 6; pts.push([x0 + Math.sin(ang) * reach * t * 1.25 + Math.sin(s * 1.9 + k * 2) * 4, y0 + Math.cos(ang) * reach * t * 0.5 + Math.sin(s * 2.3 + k) * 3]); }
        roots.push([pts, 20 - n * 2, 3]);
      }
      const behind = roots.filter(([p]) => p[p.length - 1][1] < feet), front = roots.filter(([p]) => p[p.length - 1][1] >= feet);
      behind.forEach(([p, w0, w1], i) => root(b, p, w0, w1, R, seed + i));
      for (let y = cy; y < feet; y++) {
        const d = Math.max(0, y - (feet - 40)), hw = tw / 2 + d * d * 0.016;
        barkRow(b, Math.round(cx - hw), Math.round(cx + hw), y, R, seed);
      }
      front.forEach(([p, w0, w1], i) => root(b, p, w0, w1, R, seed + 10 + i));
      // moss on the lit side of the trunk and on the roots
      for (let y = cy + 30; y < feet - 4; y += 9 + ((hash(y, 0, seed) * 8) | 0)) moss(b, Math.round(cx - tw / 2) + 1, y, 5 + ((hash(y, 1, seed) * 8) | 0), seed + y);
      front.forEach(([p], i) => { const [x, y] = p[1]; moss(b, Math.round(x) - 3, Math.round(y) - 2, 6, seed + 40 + i); });
      // limbs reaching out under the crown
      for (const s of [-1, 1]) for (let k = 0; k < r * 0.7; k++) { const x = Math.round(cx + s * (tw / 2 - 4 + k)), y = Math.round(cy + r * 0.42 - k * 0.55 + Math.sin(k / 6) * 2); fill(b, x, y, 1, Math.max(2, 6 - (k >> 3)), R[2]); px(b, x, y, R[1]); }
      // the crown, dark under the forest's roof
      foliage(b, crown, [cx - Math.round(r * 1.4), cy - Math.round(r * 0.95), cx + Math.round(r * 1.4), cy + Math.round(r * 0.85)], ramp, seed, { cw: 12, ch: 9, dx: 8, dy: 6, tone: (_, my) => 1 + (my - cy) / (r * 1.1) });
      // vines hanging from the crown's hem
      for (let k = 0; k < 9; k++) {
        const x = Math.round(cx - r * 0.8 + hash(k, 5, seed) * r * 1.6);
        let y = cy; while (y < H && b.get(x, y + 1)) y++;
        if (Math.abs(x - cx) < tw / 2 + 2) continue;
        const len = 8 + ((hash(k, 6, seed) * 22) | 0);
        for (let j = 1; j <= len; j++) { px(b, x + (j % 7 > 4 ? 1 : 0), y + j, j % 5 === 0 ? MOSS[2] : MOSS[4]); if (j % 6 === 3) px(b, x - 1, y + j, MOSS[3]); }
      }
    });
    return { img: out.canvas(), ax: cx + 1, ay: feet + 1, base: [-Math.round(tw / 2) - 2, Math.round(tw / 2) + 2], foot: 10, shadow: [Math.round(r * 0.95), Math.round(r * 0.3)] };
  }

  // A fern: fronds arching out from (x, y) to one side (s) or both (0), lit tips.
  function fernAt(b, x, y, n, s, seed) {
    for (let k = 0; k < n; k++) {
      const dir = s || (k % 2 ? 1 : -1), a = (0.2 + (k / n) * 1.2) * dir, len = 10 + ((hash(k, 1, seed) * 8) | 0);
      for (let j = 0; j < len; j++) {
        const t = j / len, fx = Math.round(x + Math.sin(a) * j * 1.3), fy = Math.round(y - Math.cos(a) * j * 0.9 + t * t * len * 0.6);
        px(b, fx, fy, t > 0.75 ? FERN[1] : t > 0.4 ? FERN[2] : FERN[3]);
        if (j % 2 === 1 && j < len - 1) { px(b, fx, fy - 1, FERN[t > 0.6 ? 1 : 2]); px(b, fx, fy + 1, FERN[4]); }
      }
    }
  }
  function fern(seed = 1) {
    const out = inked(44, 22, b => fernAt(b, 22, 20, 15, 0, seed));
    return { img: out.canvas(), ax: 23, ay: 21, foot: 2 };
  }

  // A fallen log, mossy along its back, a fungus shelf on its side; its cut end faces the viewer's left.
  function log(len = 58, seed = 1) {
    const h = 15, out = inked(len + 4, h + 4, b => {
      fill(b, 4, 3, len - 4, h - 3, OLD[1]); fill(b, 4, 3, len - 4, 3, OLD[0]); fill(b, 4, h - 3, len - 4, 3, OLD[2]); fill(b, 4, h - 1, len - 4, 1, OLD[3]);
      for (let x = 8; x < len; x += 5 + ((hash(x, 0, seed) * 4) | 0)) fill(b, x, 6 + ((hash(x, 1, seed) * 4) | 0), 3 + ((hash(x, 2, seed) * 4) | 0), 1, OLD[2]);
      disc(b, 5, 2 + (h >> 1), 4, (h >> 1) - 1, 'wood2'); disc(b, 5, 2 + (h >> 1), 2, (h >> 1) - 3, 'wood1'); px(b, 5, 2 + (h >> 1), 'wood3');
      moss(b, 10, 3, len - 16, seed);
      for (const x of [len * 0.4, len * 0.7]) { fill(b, Math.round(x), h - 4, 5, 2, 'cream2'); fill(b, Math.round(x), h - 4, 5, 1, 'cream1'); }
    });
    return { img: out.canvas(), ax: (len >> 1) + 2, ay: h + 2, foot: 6 };
  }

  // A small mossy boulder.
  function mossRock(seed = 1) {
    const out = inked(22, 15, b => {
      disc(b, 11, 8, 10, 6, 'r3'); disc(b, 10, 7, 9, 5, 'r2'); disc(b, 8, 5, 5, 3, 'r1'); px(b, 6, 4, 'r0');
      moss(b, 4, 4, 13, seed);
    });
    return { img: out.canvas(), ax: 12, ay: 14, foot: 4, shadow: [10, 3] };
  }

  Object.assign(VIL, { grandTree, fern, log, mossRock, root, OLD });
})();
