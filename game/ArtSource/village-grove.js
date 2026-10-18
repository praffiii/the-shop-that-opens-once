'use strict';
/* The banyan grove in the village kit: the hidden way to Marlow's shop. A narrow path winds between ancient trees
   whose roots tangle over the ground, through ferns, moss and fallen logs, to the great banyan. Its small wooden
   door sits back in the gap between two of its roots: easy to walk past, plain once you see it.
   Every maker returns the VIL sprite contract ({ img, ax, ay } with the feet at ax, ay); rows below the feet are what
   lies on the ground in front (roots), which the game lays flat. */
(() => {
  const V = VIL, { fill, px, disc, inked, foliage, LEAF } = V, { hash } = KIT, P = PX.PAL;
  const BARK = ['#ad937c', '#876c5d', '#654d45', '#46343a'];   // the banyan's, as the West's
  const OLD = ['#a59a88', '#7c7266', '#595049', '#3a3236'];    // ancient grey-brown bark
  const MOSS = LEAF.deep, FERN = LEAF.green, HOLLOW = '#1d1420';
  const inEllipse = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const anyOf = fs => (x, y) => fs.some(f => f(x, y));
  const archIn = (w, j) => { const r = w / 2, d = r - j - 0.5; return d > 0 ? Math.round(r - Math.sqrt(Math.max(0, r * r - d * d))) : 0; };
  function arch(b, x, y, w, h, c) { for (let j = 0; j < h; j++) { const i = archIn(w, j); fill(b, x + i, y + j, w - 2 * i, 1, c); } }

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

  /* The great banyan. A wide, low crown on heavy limbs, aerial roots hanging from them and thickened into pillars, a
     trunk of braided root strands that splays into buttresses. Between the two middle buttresses is a narrow gap,
     and set back in it, under a root that arches over, Marlow's small wooden door, half behind a curtain of hanging
     roots and ferns. door: 0 (the gap is at the feet's x); lanterns: the hooks of the seven story lanterns; lit: the
     door's little window and the glowing mushrooms. */
  function hiddenBanyan() {
    const W = 300, H = 252, cx = 150, feet = 226, seed = 31, lit = [], hooks = [];
    const limbY = x => { const u = Math.abs(x - cx) / 128; return Math.round(118 - u ** 1.5 * 14 + Math.sin(u * 8 + (x > cx ? 1 : 0)) * 3); };
    const limbT = x => Math.max(3, Math.round(12 - Math.abs((x - cx) / 128) * 8));
    const out = inked(W, H, b => {
      // prop roots: hanging roots that reached the ground and grew into pillars
      for (const [h, w] of [[-120, 5], [-92, 4], [-70, 3], [72, 3], [95, 4], [122, 5]]) for (let y = limbY(cx + h); y < feet - 4; y++) {
        const x = cx + h + Math.round(Math.sin(y / 15 + h) * 1.4), fl = y > feet - 12 ? (y - (feet - 12)) >> 1 : 0;
        fill(b, x - fl, y, w + 2 * fl, 1, BARK[1]); px(b, x - fl, y, BARK[0]); px(b, x + w - 1 + fl, y, BARK[3]); if (w > 3) px(b, x + w - 2 + fl, y, BARK[2]);
      }
      // the limbs
      for (let x = cx - 130; x <= cx + 130; x++) {
        const y = limbY(x), t = limbT(x), y0 = y - (t >> 1);
        fill(b, x, y0, 1, t, BARK[1]); px(b, x, y0, BARK[0]); px(b, x, y0 + t - 1, BARK[3]); if (t > 4) px(b, x, y0 + t - 2, BARK[2]);
      }
      // roots running out over the ground, behind and beside the trunk
      const spread = [[-1, 0.9, 70, 14], [1, 0.95, 74, 14], [-1, 1.35, 58, 12], [1, 1.3, 62, 12], [-1, 1.75, 44, 10], [1, 1.7, 46, 10]];
      spread.forEach(([s, ang, reach, w], k) => {
        const x0 = cx + s * 40, y0 = feet - 8, pts = [[x0, y0]];
        for (let i = 1; i <= 5; i++) { const t = i / 5; pts.push([x0 + s * Math.sin(ang) * reach * t * 1.2 + Math.sin(i * 1.7 + k) * 3, y0 + Math.cos(ang) * reach * t * 0.42 + (hash(k, i, seed) - 0.5) * 3]); }
        root(b, pts, w, 2, BARK, seed + k);
      });
      // the trunk: braided strands, outer ones first, splaying into buttresses at the foot
      const strands = [];
      for (let k = -7; k <= 7; k++) strands.push([k, 7 + ((hash(k, 5, seed) * 3) | 0), hash(k, 6, seed) * 6, hash(k, 8, seed) < 0.35]);
      strands.sort((p, q) => Math.abs(q[0]) - Math.abs(p[0]));
      for (const [k, sw0, ph, pale] of strands) for (let y = 96; y < feet; y++) {
        const d = Math.max(0, y - (feet - 52)), sw = sw0 + (d > 30 ? (d - 30) >> 2 : 0);
        const x0 = Math.round(cx + k * 6.6 - sw / 2 + Math.sign(k) * d * d * 0.004 * Math.abs(k) ** 0.8 + Math.sin(y / 11 + ph) * 2);
        const body = k > 2 ? BARK[2] : pale && k < 2 ? BARK[0] : BARK[1], lip = k > 2 ? BARK[1] : BARK[0];
        for (let s = 0; s < sw; s++) px(b, x0 + s, y, s === sw - 1 ? BARK[3] : s === sw - 2 ? BARK[2] : s < 2 && k <= 2 ? lip : body);
        if ((y + k * 7) % 13 === 0) { px(b, x0 + 2, y, BARK[2]); px(b, x0 + 3, y + 1, BARK[2]); }
      }
      // the crown's shade on the top of the trunk
      const dim = new Map(BARK.slice(0, 3).map((c, i) => [KIT.u32(c), KIT.u32(BARK[i + 1])]));
      for (let y = 96; y < 118; y++) for (let x = cx - 70; x < cx + 70; x++) if (y < 104 + ((hash(x >> 2, 0, seed) * 10) | 0)) { const v = dim.get(b.get(x, y)); if (v) b.set(x, y, v); }

      // the gap between the middle buttresses: deep shadow, the door set back in it
      const gw = 30, gh = 46, gx = cx - gw / 2, gy = feet - gh;
      arch(b, gx - 3, gy - 3, gw + 6, gh + 3, BARK[3]); arch(b, gx - 1, gy - 1, gw + 2, gh + 1, P.ink2); arch(b, gx + 1, gy + 1, gw - 2, gh - 1, HOLLOW);
      const dw = 16, dh = 25, dx = cx - dw / 2, dy = feet - 1 - dh;
      arch(b, dx - 2, dy - 2, dw + 4, dh + 2, 'wood4');
      arch(b, dx, dy, dw, dh, 'wood2');
      for (let x = dx + 4; x < dx + dw - 2; x += 4) for (let j = 2; j < dh; j++) if (archIn(dw, j) < Math.min(x - dx, dx + dw - 1 - x)) px(b, x, dy + j, 'wood3');
      for (let j = 0; j < dh; j++) { const i = archIn(dw, j); px(b, dx + i, dy + j, 'wood1'); px(b, dx + dw - 1 - i, dy + j, 'wood4'); }
      fill(b, dx + 1, dy + 9, dw - 2, 1, 'wood4'); fill(b, dx + 1, dy + dh - 6, dw - 2, 1, 'wood4');
      // a little round window and a ring knocker
      disc(b, cx, dy + 5, 2, 2, 'wood4'); disc(b, cx, dy + 5, 1, 1, 'light2'); px(b, cx, dy + 5, 'light1'); lit.push([cx - 1, dy + 4, 3, 3]);
      px(b, dx + dw - 4, dy + 14, 'brass1'); px(b, dx + dw - 5, dy + 15, 'brass2'); px(b, dx + dw - 3, dy + 15, 'brass3'); px(b, dx + dw - 4, dy + 16, 'brass3');
      // a worn step of root in front of it
      fill(b, dx - 3, feet - 2, dw + 6, 2, BARK[1]); fill(b, dx - 3, feet - 2, dw + 6, 1, BARK[0]);
      // the buttresses either side bulge over the gap's edges, and a root arches over its top
      for (const s of [-1, 1]) root(b, [[cx + s * 32, gy + 2], [cx + s * 21, gy + 16], [cx + s * 16, gy + 32], [cx + s * 17, feet - 4], [cx + s * 26, feet + 8], [cx + s * 40, feet + 18], [cx + s * 54, feet + 22]], 17, 6, BARK, seed + 20 + s);
      root(b, [[cx - 26, gy + 2], [cx - 10, gy - 6], [cx + 6, gy - 7], [cx + 24, gy + 1]], 9, 8, BARK, seed + 30);
      // hanging roots before the left half of the gap, a curtain to part
      for (let i = 0; i < 12; i++) {
        const x = gx + 1 + i + (i > 7 ? i - 7 : 0), len = 20 + ((hash(i, 9, seed) * 22) | 0);
        for (let j = 0; j < len; j++) px(b, x + (j % 9 > 6 ? 1 : 0), gy - 4 + j, j > len - 3 ? 'dirt2' : i % 3 === 0 ? BARK[0] : BARK[2]);
      }
      // moss on the roots and the buttresses
      for (const [x, y, w] of [[cx - 50, feet - 30, 10], [cx + 38, feet - 24, 12], [cx - 30, gy + 2, 8], [cx + 20, gy - 2, 8], [cx - 82, feet + 2, 12], [cx + 70, feet + 4, 10], [cx - 36, feet + 6, 7]]) moss(b, x, y, w, seed + x);
      // ferns tucked at the gap's feet, partly over it
      for (const [x, y, s] of [[cx - 22, feet + 4, -1], [cx + 24, feet + 5, 1], [cx - 64, feet + 14, 0], [cx + 62, feet + 16, 0]]) fernAt(b, x, y, 13, s, seed + x);
      // glowing mushrooms among the roots
      for (const [x, y] of [[cx - 44, feet + 10], [cx - 58, feet + 4], [cx + 40, feet + 12], [cx + 56, feet + 2], [cx - 20, feet - 34], [cx + 64, feet - 18]]) {
        fill(b, x, y, 1, 2, 'cream1'); fill(b, x - 1, y - 1, 3, 1, 'sky2'); px(b, x, y - 2, 'sky1');
        lit.push([x - 1, y - 2, 3, 2]);
      }
      // the crown: a dark fringe underneath, then great lobes of clumps
      foliage(b, inEllipse(cx, 92, 130, 12), [cx - 130, 80, cx + 130, 104], LEAF.teal, seed + 1, { tone: () => 1.6 });
      const lobes = [[0, 24, 50, 22], [-48, 32, 54, 26], [50, 30, 52, 26], [-100, 56, 38, 24], [102, 54, 38, 24], [-62, 64, 48, 26], [64, 62, 48, 26], [0, 60, 56, 28], [-118, 82, 26, 14], [118, 80, 26, 14], [-36, 88, 44, 16], [38, 88, 44, 16]];
      lobes.forEach(([h, y, rx, ry], i) => foliage(b, inEllipse(cx + h, y, rx, ry), [cx + h - rx, y - ry, cx + h + rx, y + ry], LEAF.deep, seed + i * 7, { cw: 11, ch: 8, dx: 8, dy: 5, tone: (_, my) => 0.9 + (my - 56) / 60 }));
      // aerial roots: frayed bundles hanging from the limbs and the crown's edge
      for (const [h, n] of [[-128, 2], [-106, 3], [-80, 3], [-52, 2], [52, 2], [82, 3], [106, 3], [128, 2]]) for (let i = 0; i < n; i++) {
        const x = cx + h + i, len = 14 + ((hash(h, i, seed) * (Math.abs(h) > 70 ? 46 : 28)) | 0);
        let y = 78; while (y < 140 && b.get(x, y + 1)) y++;
        for (let j = 1; j <= len; j++) px(b, x, y + j, j > len - 2 ? 'dirt2' : i === 0 ? BARK[1] : BARK[2]);
      }
      // lantern hooks: a knot under each limb, three a side, and one on the root over the gap
      for (const h of [-112, -84, -56, 56, 84, 112]) { const x = cx + h, y = limbY(x) - (limbT(x) >> 1) + limbT(x); px(b, x, y, BARK[3]); hooks.push([x + 1, y + 2]); }
      hooks.splice(3, 0, [cx + 1, gy - 6]);
    });
    return { img: out.canvas(), ax: cx + 1, ay: feet + 1, base: [-46, 46], foot: 14, door: 0, lit: lit.map(([x, y, w, h]) => [x + 1, y + 1, w, h]), lanterns: hooks, shadow: [120, 26] };
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

  Object.assign(VIL, { grandTree, hiddenBanyan, fern, log, mossRock });
})();
