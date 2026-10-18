'use strict';
/* The ant-planet kit: what Bellwood's ants build with. Walnut and acorn shells, hollow stumps, bark planks, leaf
   shingles, river stone, clay, iron from the forge, glass. Every pixel is authored in code (ART.md); shapes are lit
   from the top-left and shaded in flat, stepped bands. Builds on KIT (kit.js) and PX (px.js).

   Every building returns the contract bellwood.js expects:
   { img, ox, oy, y, wins, foot, base: [x0, x1], door: [x, y], keep, shadow, smoke, name }, in world coordinates. */
(() => {
  const K = KIT, { R, D, E, poly, Buf, u32, hash, vnoise, scatter, rng } = { ...KIT, rng: PX.rng };

  // Extra ramps for natural materials, light to dark (ART.md rule 4: hue-shifted from PX.PAL's woods and stones).
  const M = {
    shell: ['#f8dcae', '#e7b97c', '#cc9155', '#a26a3a', '#73452a', '#4c2c22'],
    bark: ['#d6b48c', '#b48d66', '#8f6a4c', '#6b4c3a', '#4a332c', '#33241f'],
    acorn: ['#ffe2a6', '#f2bf74', '#d99a4e', '#b07438', '#7d4f2a', '#53321f'],
    cap: ['#e9cf9a', '#c9a46a', '#a47d4b', '#7d5a37', '#56402b', '#3a2a21'],
    clay: ['#ffd2b0', '#f4ab82', '#dc8560', '#b5634a', '#86453a', '#5a2e2b'],
    moss: ['#d7f08c', '#a8dc63', '#7cc152', '#57a148', '#3e7f45', '#2a5c3f'],
    autumn: ['#ffe9a0', '#ffc965', '#f59e42', '#d9722f', '#a8502a', '#743628'],
    rust: ['#f3b58a', '#d98a5c', '#b5653f', '#8a4a33', '#61352b', '#40251f'],
  };
  const hex = c => (typeof c === 'string' && c[0] !== '#' ? K.hex(c) : c);

  /* ---------- lighting ---------- */
  // Light from the top-left and a little towards the viewer. n = surface normal (unit). Returns 0 (lit) .. 1 (dark).
  const LIGHT = (() => { const v = [-0.55, -0.62, 0.56], l = Math.hypot(...v); return v.map(a => a / l); })();
  const shadeOf = (nx, ny, nz) => 1 - Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
  // Map a 0..1 darkness onto a ramp's indices lo..hi in hard bands.
  const band = (v, lo, hi) => Math.min(hi, Math.max(lo, lo + Math.floor(v * (hi - lo + 1))));

  // A 1px rim on a Buf's silhouette: transparent pixels touching an opaque one take the material's darkest colour.
  function rim(b, c, only) {
    const v = u32(hex(c)), d = b.d, w = b.w, h = b.h, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[y * w + x]) continue;
      const n = (x > 0 && d[y * w + x - 1]) || (x < w - 1 && d[y * w + x + 1]) || (y > 0 && d[(y - 1) * w + x]) || (y < h - 1 && d[(y + 1) * w + x]);
      if (n && (!only || only(x, y))) add.push(y * w + x);
    }
    for (const i of add) d[i] = v;
  }

  /* ---------- small parts ---------- */
  // A round-topped door, planks of a ramp, framed in twig; base is the threshold row. Returns its rect.
  function archDoor(x, cx, base, w, h, o = {}) {
    const ramp = o.ramp || ['wood1', 'wood2', 'wood3', 'wood4'], frame = o.frame || M.bark, r = w >> 1, top = base - h;
    const inArch = (px, py, pad) => py >= top + r ? Math.abs(px + 0.5 - cx) <= r + pad : (px + 0.5 - cx) ** 2 + (py + 0.5 - (top + r)) ** 2 <= (r + pad) ** 2;
    for (let py = top - 3; py < base; py++) for (let px = cx - r - 3; px <= cx + r + 3; px++) {
      if (inArch(px, py, 0)) {
        const plank = Math.floor((px - (cx - r)) / 4), seam = (px - (cx - r)) % 4 === 3;
        R(x, px, py, 1, 1, seam ? ramp[3] : plank === 0 ? ramp[0] : plank % 2 ? ramp[1] : ramp[2]);
      } else if (inArch(px, py, 2)) R(x, px, py, 1, 1, px < cx && py < top + r ? frame[2] : frame[3]);
      else if (inArch(px, py, 3)) R(x, px, py, 1, 1, frame[4]);
    }
    R(x, cx - r, base - Math.round(h * 0.45), w, 1, ramp[3]);
    R(x, cx + r - 4, base - Math.round(h * 0.45) - 3, 2, 2, 'brass1'); D(x, cx + r - 3, base - Math.round(h * 0.45) - 2, 'brass3');
    // threshold stone
    R(x, cx - r - 4, base, w + 8, 3, 'stone1'); R(x, cx - r - 4, base, w + 8, 1, 'stone0'); R(x, cx - r - 4, base + 3, w + 8, 1, 'stone3');
    return { x: cx - r, y: top, w, h };
  }
  // A round window with a twig rim and four panes; glass uses the colours KIT.litSprite turns to light at night.
  function roundWindow(x, cx, cy, r, o = {}) {
    const rim = o.rim || M.bark;
    E(x, cx, cy, r + 2, r + 2, rim[4]); E(x, cx, cy, r + 1, r + 1, rim[2]); E(x, cx - 1, cy - 1, r + 1, r, rim[1]);
    E(x, cx, cy, r, r, 'sky3'); E(x, cx - 1, cy - 1, r - 1, r - 1, 'sky2');
    for (let k = 0; k < 3; k++) { D(x, cx - r + 2 + k, cy - 1 - k, 'white'); D(x, cx - r + 3 + k, cy - 1 - k, 'white'); }
    R(x, cx, cy - r, 1, r * 2 + 1, rim[3]); R(x, cx - r, cy, r * 2 + 1, 1, rim[3]);
    if (o.sill !== false) { R(x, cx - r - 2, cy + r + 2, r * 2 + 5, 2, rim[2]); R(x, cx - r - 2, cy + r + 2, r * 2 + 5, 1, rim[1]); }
    return { gx: cx - r, gy: cy - r, gw: r * 2 + 1, gh: r * 2 + 1 };
  }
  // A big leaf lying over a roof: a pointed oval with a midrib and veins; ramp is a 6-step leaf ramp.
  function leafShape(b, cx, cy, rx, ry, ramp, o = {}) {
    const tilt = o.tilt || 0, tip = o.tip || 1.6, droop = o.droop || 0;
    const inside = (dx, dy) => { const u = dx / rx, v = dy / ry; return Math.abs(v) <= Math.pow(Math.max(0, 1 - Math.abs(u) ** tip), 0.5); };
    for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy - dx * tilt - droop * (dx / rx) ** 2;
      if (!inside(dx, dy)) { if (inside(dx * 0.985, dy * 0.92 - 0.6)) b.set(x, y, ramp[5]); continue; }
      const u = dx / rx, v = dy / ry;
      // the leaf arches along its length: lit near the midrib's upper side, dark at the lower edge
      let s = 0.32 + 0.5 * Math.max(0, v) + 0.18 * Math.abs(u) ** 2 - 0.2 * Math.max(0, -v);
      const vein = Math.abs(((Math.abs(u) * 7 + Math.abs(v) * 2.2) % 1) - 0.5) < 0.07 && Math.abs(v) > 0.12;
      if (Math.abs(dy) < 1) { b.set(x, y, ramp[0]); continue; }
      if (vein) s -= 0.18;
      b.set(x, y, ramp[band(s, 1, 4)]);
    }
  }
  // A cast shadow list entry: an ellipse under a building, in world coordinates.
  const footShadow = (cx, y, rx, ry = 6) => [cx + 4, y + 1, rx, ry];

  /* ---------- materials ----------
     Each fills the pixels of a Buf where inside(x, y) holds (or a rect), in a pattern of courses, planks or shingles.
     Ramps run light to dark. Every unit (stone, plank, shingle) is lit on its top-left and shaded on its bottom-right. */
  const H = (x, y, s) => hash(x, y, s);
  const STONE = ['#f4f3f7', '#d9d8e6', '#b3b3cb', '#8b8aa8', '#65627f', '#46425a'];
  const STONE_WARM = ['#f5efe6', '#e2d8cc', '#c4b6a8', '#9c8d86', '#74656a', '#4f444e'];
  const SLATE = ['#d4def0', '#a9b8d4', '#8493b6', '#64709a', '#4a5279', '#343a5a'];
  const IRON = ['#dfe4ee', '#aab3c5', '#7a8398', '#525970', '#353a4d'];
  const BRASS = ['#fff0b3', '#f7cf6a', '#d9a443', '#a8732f', '#6f4722'];
  const DARKBARK = ['#b39478', '#8f7058', '#6e5444', '#523d35', '#3a2b28', '#271d1d'];
  const ROSE = ['#ffe0ea', '#ffb3c9', '#ff8fae', '#e5678e', '#b34d72', '#7d3656'];
  Object.assign(M, { stone: STONE, stoneWarm: STONE_WARM, slate: SLATE, iron: IRON, brass: BRASS, darkBark: DARKBARK, rose: ROSE });
  const all = () => true;

  // River-stone masonry in courses: rounded stones of varied width, two tones mixed, mortar in ramp[4].
  function masonry(b, x0, y0, w, h, ramp, seed, o = {}) {
    const { inside = all, course = [6, 8], width = [8, 15], warm = null, moss = 0 } = o;
    for (let ry = y0, row = 0; ry < y0 + h; row++) {
      const rh = course[0] + (H(row, 1, seed) * (course[1] - course[0] + 1)) | 0;
      for (let sx = x0 - ((H(row, 2, seed) * 10) | 0), col = 0; sx < x0 + w; col++) {
        const sw = width[0] + (H(col, row, seed + 3) * (width[1] - width[0] + 1)) | 0, R0 = warm && H(col, row, seed + 5) < 0.3 ? warm : ramp;
        const tone = H(col, row, seed + 7);
        for (let y = ry; y < ry + rh && y < y0 + h; y++) for (let x = sx; x < sx + sw; x++) {
          if (x < x0 || x >= x0 + w || !inside(x, y)) continue;
          const u = x - sx, v = y - ry, last = u === sw - 1 || v === rh - 1;
          const corner = (u === 0 || u >= sw - 2) && (v === 0 || v >= rh - 2);
          let c;
          if (last || (corner && !(u === sw - 2 && v === rh - 2))) c = ramp[4];
          else if (v === 0 || u === 0) c = R0[tone < 0.5 ? 0 : 1];
          else if (v === rh - 2 || u === sw - 2) c = R0[3];
          else c = R0[tone < 0.35 ? 1 : 2];
          b.set(x, y, c);
        }
        if (moss && H(col, row, seed + 9) < moss) for (let k = 0; k < Math.min(sw - 2, 5); k++) { const x = sx + 1 + k; if (inside(x, ry)) { b.set(x, ry, k % 2 ? M.moss[1] : M.moss[2]); if (k > 0 && k < 4) b.set(x, ry + 1, M.moss[3]); } }
        sx += sw;
      }
      ry += rh;
    }
  }
  // Planks: vertical (or horizontal) boards with a lit left edge, a dark seam, grain marks and the odd knot.
  function planks(b, x0, y0, w, h, ramp, seed, o = {}) {
    const { inside = all, size = 6, horizontal = false } = o;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (!inside(x, y)) continue;
      const a = horizontal ? y - y0 : x - x0, along = horizontal ? x : y, k = Math.floor(a / size), u = a % size, tone = H(k, 0, seed);
      let c = u === size - 1 ? ramp[4] : u === 0 ? ramp[tone < 0.5 ? 1 : 2] : ramp[tone < 0.3 ? 1 : tone < 0.8 ? 2 : 3];
      if (u > 0 && u < size - 1 && H(k, (along / 7) | 0, seed + 1) < 0.18 && (along % 7) < 4) c = ramp[3];   // grain
      b.set(x, y, c);
    }
  }
  // Clay bricks in running bond, each with a lit top edge; mortar in ramp[0].
  function bricks(b, x0, y0, w, h, ramp, seed, o = {}) {
    const { inside = all, bw = 9, bh = 4 } = o;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (!inside(x, y)) continue;
      const row = Math.floor((y - y0) / bh), v = (y - y0) % bh, xx = x - x0 + (row % 2 ? bw >> 1 : 0), u = xx % bw, k = Math.floor(xx / bw), tone = H(k, row, seed);
      b.set(x, y, v === bh - 1 || u === bw - 1 ? ramp[0] : v === 0 ? ramp[tone < 0.5 ? 1 : 2] : ramp[tone < 0.25 ? 2 : tone < 0.85 ? 3 : 4]);
    }
  }
  // Overlapping shingles (stone chips, bark, leaves) in offset rows; each row's top sits in the shadow of the row above.
  function shingles(b, x0, y0, w, h, ramp, seed, o = {}) {
    const { inside = all, sw = 10, sh = 6, shape = 'round', moss = 0 } = o;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (!inside(x, y)) continue;
      const row = Math.floor((y - y0) / sh), v = (y - y0) % sh, xx = x - x0 + (row % 2 ? sw >> 1 : 0) + 64 * sw, u = xx % sw, k = Math.floor(xx / sw), tone = H(k, row, seed);
      const cx = u - (sw - 1) / 2, edge = shape === 'leaf' ? v >= sh - 1 - Math.round((Math.abs(cx) / (sw / 2)) * (sh - 2)) : shape === 'round' ? v >= sh - 1 - (Math.abs(cx) > sw / 2 - 2 ? 1 : 0) : v === sh - 1;
      let c;
      if (edge) c = ramp[4];
      else if (v === 0) c = ramp[3];
      else if (u === 0 || (shape === 'leaf' && Math.abs(cx) < 0.6)) c = ramp[tone < 0.5 ? 0 : 1];
      else if (cx > sw / 2 - 2.5) c = ramp[3];
      else c = ramp[tone < 0.3 ? 1 : 2];
      if (moss && H(k, row, seed + 3) < moss && v < sh - 1) c = v === 0 ? M.moss[3] : u < sw / 2 ? M.moss[1] : M.moss[2];
      b.set(x, y, c);
    }
  }
  // Corrugated iron sheet, rusting from its bolts and lower edge.
  function ironSheet(b, x0, y0, w, h, seed, o = {}) {
    const { inside = all, rust = 0.35 } = o;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (!inside(x, y)) continue;
      const u = (x - x0) % 4, r = vnoise(x / 5, y / 9, seed) + ((y - y0) / h) * 0.4 > 1 - rust;
      const P = r ? M.rust : IRON;
      b.set(x, y, P[u === 0 ? 0 : u === 1 ? 1 : u === 2 ? 2 : 3]);
    }
  }
  // Fill a polygon with color(x, y).
  function fill(b, pts, color) {
    const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const xs = [], yy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) color(x, y);
    }
  }
  // An inside(x, y) test for a polygon, by even-odd crossings.
  const inPoly = pts => (x, y) => {
    let c = false; const px = x + 0.5, py = y + 0.5;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  /* A hip roof seen from the front and above: the front slope from the eave up to the ridge, its ends (hips) slanting
     in by `hip` px; pattern(b, x0, y0, w, h, inside) paints the slope. The end slopes take the pattern a tone darker on
     the right. A fascia board runs along the eave, and a ridge cap along the top. o.left / o.right = false keep an end
     square (where the roof meets a tower). */
  function hipRoof(b, x0, x1, ridge, eave, hip, pattern, o = {}) {
    const { left = true, right = true, fascia = DARKBARK, cap = null } = o;
    const L = left ? x0 + hip : x0, Rr = right ? x1 - hip : x1;
    const front = inPoly([[x0, eave], [L, ridge], [Rr, ridge], [x1, eave]]);
    pattern(b, x0, ridge, x1 - x0, eave - ridge, front);
    // the right hip in shade, the left one lit: recolour by one ramp step via a darkening overlay of the slope pixels
    if (right) for (let y = ridge; y < eave; y++) { const xe = Math.round(Rr + ((x1 - Rr) * (y - ridge)) / (eave - ridge)); for (let x = xe - 2; x < xe; x++) if (front(x, y)) b.set(x, y, fascia[3]); }
    if (left) for (let y = ridge; y < eave; y++) { const xe = Math.round(L - ((L - x0) * (y - ridge)) / (eave - ridge)); if (front(xe, y)) b.set(xe, y, fascia[1]); }
    for (let x = L; x < Rr; x++) { b.set(x, ridge - 1, (cap || fascia)[3]); b.set(x, ridge, (cap || fascia)[1]); }
    for (let x = x0 - 1; x <= x1; x++) { b.set(x, eave, fascia[2]); b.set(x, eave + 1, fascia[3]); b.set(x, eave + 2, fascia[4]); }
  }
  // The shadow a roof's eave casts on its wall: the top rows of the wall a step darker (ramp a -> b by index map).
  function eaveShadow(b, x0, x1, y, rows, from, to) {
    const map = new Map(from.map((c, i) => [u32(K.hex(c)), u32(K.hex(to[i]))]));
    for (let j = 0; j < rows; j++) for (let x = x0; x < x1; x++) { const v = b.get(x, y + j), t = map.get(v); if (t) b.set(x, y + j, t); }
  }

  /* ---------- doors, windows, signs ---------- */
  // An arched window in a stone surround: returns its glass rect (glass is sky2/sky3/white, so KIT.litSprite lights it).
  function archWindow(b, cx, top, w, h, o = {}) {
    const { frame = STONE, mullion = DARKBARK, sill = true } = o, r = w >> 1, x0 = cx - r;
    const inArch = (x, y, pad) => (y >= top + r ? x >= x0 - pad && x < x0 + w + pad && y < top + h + pad : (x + 0.5 - cx) ** 2 + (y + 0.5 - (top + r)) ** 2 <= (r + pad) ** 2);
    for (let y = top - 4; y < top + h + 2; y++) for (let x = x0 - 4; x < x0 + w + 4; x++) {
      if (inArch(x, y, 0)) {
        const lit = (x - x0) + (y - top) < w * 0.7;
        b.set(x, y, (x - x0 + y - top) % 9 === 3 && y < top + h - 4 ? '#ffffff' : lit ? '#c2e6ff' : '#9fd3fb');
      } else if (inArch(x, y, 2)) b.set(x, y, x < cx && y < top + h * 0.6 ? frame[1] : frame[2]);
      else if (inArch(x, y, 3)) b.set(x, y, frame[4]);
    }
    for (let y = top + 1; y < top + h; y++) b.set(cx, y, mullion[2]);
    for (let x = x0; x < x0 + w; x++) b.set(x, top + r + 2, mullion[2]);
    if (sill) for (let x = x0 - 3; x < x0 + w + 3; x++) { b.set(x, top + h + 1, frame[1]); b.set(x, top + h + 2, frame[3]); b.set(x, top + h + 3, frame[4]); }
    return { gx: x0, gy: top, gw: w, gh: h };
  }
  // A clock face frozen at hh:mm, in a brass rim.
  function clock(b, cx, cy, r, hh, mm) {
    for (let y = -r - 2; y <= r + 2; y++) for (let x = -r - 2; x <= r + 2; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d > r + 2.2) continue;
      b.set(cx + x, cy + y, d > r + 1.2 ? BRASS[4] : d > r - 0.6 ? (x + y < 0 ? BRASS[1] : BRASS[2]) : d > r - 1.6 ? BRASS[3] : x + y < -r * 0.6 ? '#ffffff' : '#fffaf0');
    }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, x = Math.round(cx + Math.sin(a) * (r - 3)), y = Math.round(cy - Math.cos(a) * (r - 3)); b.set(x, y, '#3d2a2e'); if (i % 3 === 0) b.set(x - Math.round(Math.sin(a)), y + Math.round(Math.cos(a)), '#3d2a2e'); }
    const hand = (a, len, w) => { for (let k = 0; k <= len; k += 0.5) { const x = Math.round(cx + Math.sin(a) * k), y = Math.round(cy - Math.cos(a) * k); b.set(x, y, '#2a1b22'); if (w > 1 && k < len - 1) b.set(x + 1, y, '#2a1b22'); } };
    hand(((hh % 12) + mm / 60) / 12 * Math.PI * 2, r * 0.5, 2); hand((mm / 60) * Math.PI * 2, r * 0.78, 1);
    b.set(cx, cy, BRASS[2]);
  }
  // A board with letters (PX.text) on it: dark bark, brass corner nails.
  function signBoard(b, cx, top, text, o = {}) {
    const { board = DARKBARK, ink = '#fff0d4' } = o, tw = PX.textWidth(text), w = tw + 10, x0 = cx - (w >> 1), h = 11;
    for (let y = top; y < top + h; y++) for (let x = x0; x < x0 + w; x++) b.set(x, y, y === top ? board[1] : y === top + h - 1 || x === x0 + w - 1 ? board[4] : x === x0 ? board[2] : board[3]);
    for (const [x, y] of [[x0 + 1, top + 1], [x0 + w - 3, top + 1], [x0 + 1, top + h - 3], [x0 + w - 3, top + h - 3]]) b.set(x, y, BRASS[1]);
    const [c, g] = K.canvas(w, h); PX.text(g, text, 5, 3, ink); const d = g.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]) b.set(x0 + x, top + y, ink);
    return { x: x0, y: top, w, h };
  }
  // A double door with a round fanlight, plank leaves banded in iron; base is the threshold row.
  function doubleDoor(b, cx, base, w, h, o = {}) {
    const { wood = DARKBARK, frame = STONE } = o, r = w >> 1, x0 = cx - r, top = base - h;
    const inArch = (x, y, pad) => (y >= top + r ? x >= x0 - pad && x < x0 + w + pad && y < base : (x + 0.5 - cx) ** 2 + (y + 0.5 - (top + r)) ** 2 <= (r + pad) ** 2);
    for (let y = top - 5; y < base; y++) for (let x = x0 - 5; x < x0 + w + 5; x++) {
      if (inArch(x, y, 0)) {
        if (y < top + r) { const lit = x < cx; b.set(x, y, (x + y) % 7 === 0 ? '#ffffff' : lit ? '#c2e6ff' : '#9fd3fb'); continue; }
        const u = (x - x0) % 5, leaf = x < cx ? 0 : 1;
        b.set(x, y, x === cx - 1 || x === cx ? wood[5] : u === 4 ? wood[4] : u === 0 ? wood[1] : wood[2 + leaf]);
      } else if (inArch(x, y, 3)) b.set(x, y, x < cx && y < top + r + 6 ? frame[0] : frame[1]);
      else if (inArch(x, y, 5)) b.set(x, y, frame[3]);
    }
    for (let x = x0; x < x0 + w; x++) { b.set(x, top + r, wood[5]); for (const yy of [top + r + 6, base - 8]) { b.set(x, yy, IRON[3]); b.set(x, yy + 1, IRON[4]); } }
    for (let i = 0; i < 2 * r; i += 4) { const a = Math.PI * (i / (2 * r)), x = Math.round(cx - Math.cos(a) * r), y = Math.round(top + r - Math.sin(a) * r); b.set(x, y, wood[4]); }
    b.set(cx - 3, base - 18, BRASS[1]); b.set(cx + 2, base - 18, BRASS[1]); b.set(cx - 3, base - 17, BRASS[3]); b.set(cx + 2, base - 17, BRASS[3]);
    for (let x = x0 - 6; x < x0 + w + 6; x++) { b.set(x, base, STONE[1]); b.set(x, base + 1, STONE[2]); b.set(x, base + 2, STONE[3]); }
    return { glass: { gx: x0, gy: top, gw: w, gh: r }, door: [cx, base + 3] };
  }
  // An iron wall lamp on a curled bracket: its glass (gx..) lights at night.
  function wallLamp(b, x, y, dir = 1) {
    for (let k = 0; k < 6; k++) b.set(x + dir * k, y, IRON[3]);
    b.set(x + dir * 5, y + 1, IRON[3]); b.set(x + dir * 1, y + 1, IRON[4]); b.set(x + dir * 2, y + 2, IRON[4]);
    const lx = x + dir * 5 - 3;
    for (let j = 0; j < 9; j++) for (let i = 0; i < 7; i++) {
      const edge = i === 0 || i === 6 || j === 0 || j === 8;
      b.set(lx + i, y + 2 + j, j < 2 ? IRON[i < 3 ? 2 : 3] : edge ? IRON[4] : i === 1 && j < 5 ? '#ffffff' : i < 3 ? '#c2e6ff' : '#9fd3fb');
    }
    b.set(lx + 3, y + 1, IRON[2]);
    return { gx: lx + 1, gy: y + 4, gw: 5, gh: 6 };
  }
  // Ivy climbing a wall from the ground: leafy clusters along a wandering vine.
  function ivy(b, x, base, h, seed, inside = all) {
    const rnd = rng(seed);
    let px = x;
    for (let y = base; y > base - h; y -= 2) {
      px += Math.round((rnd() - 0.5) * 3);
      for (const [dx, dy, c] of [[0, 0, M.moss[4]], [1, 0, M.moss[3]], [-1, 1, M.moss[3]]]) if (inside(px + dx, y + dy)) b.set(px + dx, y + dy, c);
      if (rnd() < 0.55) { const s = rnd() < 0.5 ? -1 : 1, lx = px + s * (2 + ((rnd() * 3) | 0)); for (const [dx, dy, c] of [[0, 0, M.moss[2]], [1, 0, M.moss[1]], [0, 1, M.moss[3]], [1, 1, M.moss[2]], [-1, 0, M.moss[3]]]) if (inside(lx + dx, y + dy)) b.set(lx + dx, y + dy, c); }
    }
  }

  // Planks nailed across an opening (a boarded window).
  function boards(b, x0, y0, w, h, seed) {
    for (let k = 0; k < 3; k++) {
      const y = y0 + Math.round((k * (h - 5)) / 2), tilt = k === 1 ? -2 : 1;
      for (let x = x0; x < x0 + w; x++) { const yy = y + Math.round((tilt * (x - x0)) / w); for (let j = 0; j < 4; j++) b.set(x, yy + j, j === 0 ? M.bark[1] : j === 3 ? M.bark[4] : (x + k) % 9 ? M.bark[2] : M.bark[3]); }
      b.set(x0 + 2, y + 1, IRON[2]); b.set(x0 + w - 3, y + 1 + tilt, IRON[2]);
    }
  }
  // Moss hanging over an eave: soft clumps along y, dripping in places.
  function mossEdge(b, x0, x1, y, seed) {
    const rnd = rng(seed);
    for (let x = x0; x < x1; x++) {
      if (vnoise(x / 6, 0, seed) < 0.45) continue;
      const n = 1 + ((rnd() * 3) | 0) + (vnoise(x / 3, 2, seed) > 0.8 ? 3 : 0);
      for (let j = -1; j < n; j++) if (b.get(x, y + j)) b.set(x, y + j, j < 0 ? M.moss[1] : j === n - 1 ? M.moss[4] : j ? M.moss[3] : M.moss[2]);
    }
  }

  /* ---------- the station ---------- */
  /* The old station of the West: a river-stone hall with two wings under stone-chip roofs, its clock tower frozen at
     10:17, a double door under the BELLWOOD board, iron lamps either side, moss and ivy. Landmark size: about 260 wide
     and 220 tall. Returns { img, ax, ay, foot, half, wins, door, clock } in local coordinates. */
  function station(o = {}) {
    const seed = o.seed || 11, W = 300, Hh = 236, b = new Buf(W, Hh), base = Hh - 10;
    const wing = [[24, 122], [178, 276]], cb = [116, 184], tw = [128, 172];
    const wingTop = base - 60, cTop = base - 74, wins = [];
    const stoneWall = (x0, x1, top) => {
      masonry(b, x0, top, x1 - x0, base - top - 14, STONE, seed + x0, { warm: STONE_WARM, moss: 0.04 });
      masonry(b, x0, base - 14, x1 - x0, 14, ['#c4c3d6', '#a6a5bf', '#8b8aa8', '#6b6888', '#46425a'], seed + x0 + 1, { course: [6, 7], width: [11, 18], moss: 0.18 });
      for (let y = top; y < top + 3; y++) for (let x = x0; x < x1; x++) b.set(x, y, y === top ? DARKBARK[2] : DARKBARK[3]);   // the timber wall plate
      for (let x = x0; x < x1; x++) b.set(x, base - 1, STONE[5]);
    };
    // the tower, rising behind the centre block
    masonry(b, tw[0], 58, tw[1] - tw[0], cTop - 58, STONE, seed + 3, { warm: STONE_WARM, course: [7, 8] });
    for (let y = 58; y < cTop; y++) { b.set(tw[0], y, STONE[4]); b.set(tw[1] - 1, y, STONE[5]); b.set(tw[1] - 2, y, STONE[4]); }
    for (let y = 58; y < cTop; y += 8) for (let k = 0; k < 6; k++) { b.set(tw[0] + 1 + k, y, STONE[0]); b.set(tw[1] - 2 - k, y + 4, STONE[3]); }   // quoins
    clock(b, 150, 96, 16, 10, 17);
    for (let x = tw[0] - 3; x < tw[1] + 3; x++) { b.set(x, 116, STONE[1]); b.set(x, 117, STONE[3]); b.set(x, 118, STONE[4]); }        // string course
    archWindow(b, 150, 124, 10, 14, { sill: false }).gx && wins.push({ gx: 145, gy: 124, gw: 10, gh: 14 });
    // the tower's spire: a steep pyramid of stone chips with a brass leaf for a vane
    const spire = inPoly([[tw[0] - 4, 60], [150, 14], [tw[1] + 4, 60]]);
    shingles(b, tw[0] - 4, 14, tw[1] - tw[0] + 8, 46, SLATE, seed + 4, { inside: spire, sw: 8, sh: 5 });
    for (let y = 14; y < 60; y++) { const xe = Math.round(150 + ((tw[1] + 4 - 150) * (y - 14)) / 46); for (let x = xe - 3; x < xe; x++) if (spire(x, y)) b.set(x, y, SLATE[3]); }
    for (let x = tw[0] - 5; x <= tw[1] + 4; x++) { b.set(x, 60, DARKBARK[2]); b.set(x, 61, DARKBARK[3]); b.set(x, 62, DARKBARK[4]); }
    for (let y = 2; y < 15; y++) b.set(150, y, BRASS[3]);
    for (const [x, y, c] of [[151, 4, 1], [152, 4, 1], [153, 5, 1], [154, 5, 2], [155, 6, 2], [152, 6, 2], [153, 6, 2], [156, 7, 3], [149, 9, 2], [148, 9, 2], [147, 10, 3], [151, 13, 1], [149, 13, 2], [150, 12, 0]]) b.set(x, y, BRASS[c]);
    // the wings
    for (const [x0, x1] of wing) {
      stoneWall(x0, x1, wingTop);
      for (const cx of [x0 + 26, x1 - 26]) {
        const g = archWindow(b, cx, wingTop + 12, 16, 26);
        if (cx === wing[1][1] - 26) boards(b, g.gx - 2, g.gy + 6, g.gw + 4, g.gh - 4, seed); else wins.push(g);
      }
    }
    // the centre block and its roof (drawn after the tower, covering its foot)
    stoneWall(cb[0], cb[1], cTop);
    for (const x of [cb[0], cb[0] + 1, cb[1] - 2, cb[1] - 1]) for (let y = cTop; y < base; y++) b.set(x, y, x < 150 ? STONE[4] : STONE[5]);
    const slate = (b2, x0, y0, w, h, inside) => shingles(b2, x0, y0, w, h, SLATE, seed + x0, { inside, sw: 10, sh: 6 });
    hipRoof(b, cb[0] - 6, cb[1] + 6, cTop - 22, cTop, 10, slate);
    hipRoof(b, wing[0][0] - 8, wing[0][1] + 2, wingTop - 46, wingTop, 26, slate, { right: false });
    hipRoof(b, wing[1][0] - 2, wing[1][1] + 8, wingTop - 46, wingTop, 26, slate, { left: false });
    eaveShadow(b, 0, W, wingTop + 3, 3, STONE, [STONE[1], STONE[2], STONE[3], STONE[4], STONE[5], STONE[5]]);
    eaveShadow(b, cb[0], cb[1], cTop + 3, 3, STONE, [STONE[1], STONE[2], STONE[3], STONE[4], STONE[5], STONE[5]]);
    // the doorway, the board and the lamps
    const d = doubleDoor(b, 150, base - 1, 30, 46);
    wins.push(d.glass);
    signBoard(b, 150, cTop + 6, 'BELLWOOD');
    wins.push(wallLamp(b, cb[0] + 6, base - 46, -1), wallLamp(b, cb[1] - 7, base - 46, 1));
    // a timetable board by the door, ivy on the west corner, moss on the plinth
    for (let y = base - 34; y < base - 12; y++) for (let x = 196; x < 212; x++) b.set(x, y, y === base - 34 ? DARKBARK[1] : x === 196 ? DARKBARK[2] : x === 211 || y === base - 13 ? DARKBARK[4] : y % 3 === 0 && x > 198 && x < 209 ? '#fff0d4' : DARKBARK[3]);
    for (const x of [198, 209]) for (let y = base - 12; y < base; y++) b.set(x, y, DARKBARK[3]);
    ivy(b, 28, base - 2, 54, seed + 8, (x, y) => b.get(x, y) !== 0); ivy(b, 120, base - 2, 30, seed + 9, (x, y) => b.get(x, y) !== 0); ivy(b, 270, base - 2, 40, seed + 10, (x, y) => b.get(x, y) !== 0);
    mossEdge(b, 16, 124, wingTop, seed + 11); mossEdge(b, 176, 284, wingTop, seed + 12); mossEdge(b, 110, 190, cTop, seed + 13);
    rim(b, STONE[5]);
    return { img: b.canvas(), ax: 150, ay: base, foot: 22, half: 126, wins, door: [0, 2], name: 'station' };
  }

  /* ---------- Helen's tea stall ---------- */
  /* A little tea kiosk on the dead platform: walls of pale birch planks, a rose striped awning over the serving
     hatch, a door on its side, a stovepipe with steam, a teapot sign, chamomile in pots. About 110 wide, 100 tall. */
  function teaStall(o = {}) {
    const seed = o.seed || 21, W = 140, Hh = 120, b = new Buf(W, Hh), base = Hh - 8, x0 = 20, x1 = 120, top = base - 52;
    const BIRCH = ['#fffaf0', '#f2e6d4', '#dcc9b0', '#b8a088', '#8a7262', '#5c4a44'];
    planks(b, x0, top, x1 - x0, base - top, BIRCH, seed, { size: 6 });
    for (let y = top; y < base; y++) { b.set(x0, y, BIRCH[3]); b.set(x1 - 1, y, BIRCH[5]); b.set(x1 - 2, y, BIRCH[4]); }
    // a leaf-shingle roof, rose-tinted edge
    const rosy = (b2, X, Y, w, h, inside) => shingles(b2, X, Y, w, h, ['#ffd9e3', '#f7b0c4', '#e58aa6', '#c46a8a', '#8f4a68'], seed, { inside, sw: 9, sh: 5, shape: 'leaf' });
    hipRoof(b, x0 - 8, x1 + 8, top - 30, top, 14, rosy, { fascia: DARKBARK });
    eaveShadow(b, x0, x1, top + 3, 3, BIRCH, [BIRCH[2], BIRCH[3], BIRCH[3], BIRCH[4], BIRCH[5], BIRCH[5]]);
    // the serving hatch with its counter, cups and a kettle on it
    const hx = 30, hw = 46, hy = top + 12, hh = 22;
    for (let y = hy; y < hy + hh; y++) for (let x = hx; x < hx + hw; x++) b.set(x, y, y < hy + 3 ? '#5c4a44' : '#8a6f62');
    for (let x = hx + 4; x < hx + hw - 4; x += 7) for (let y = hy + 5; y < hy + 9; y++) { b.set(x, y, '#f5e6c8'); b.set(x + 1, y, '#e3cfa6'); b.set(x + 2, y, '#c9b48a'); }   // cups on a shelf
    for (let x = hx - 3; x < hx + hw + 3; x++) { b.set(x, hy + hh, DARKBARK[1]); b.set(x, hy + hh + 1, DARKBARK[2]); b.set(x, hy + hh + 2, DARKBARK[3]); b.set(x, hy + hh + 3, DARKBARK[4]); }
    for (const [cx, c] of [[hx + 8, 0], [hx + 14, 1], [hx + 38, 0]]) for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) b.set(cx + i, hy + hh - 4 + j, j === 0 ? '#ffffff' : i === 3 ? (c ? '#e5678e' : '#c9b48a') : c ? '#ff8fae' : '#f5e6c8');
    // the kettle: an acorn-cap pot, brass handle
    for (let j = 0; j < 9; j++) for (let i = -6; i <= 6; i++) if (i * i / 36 + (j - 5) ** 2 / 25 <= 1) b.set(hx + 26 + i, hy + hh - 9 + j, i < -2 ? M.acorn[1] : i > 2 ? M.acorn[4] : M.acorn[2]);
    for (let i = -6; i <= 6; i++) b.set(hx + 26 + i, hy + hh - 7, M.cap[3]);
    for (let k = 0; k < 4; k++) b.set(hx + 32 + k, hy + hh - 6 - k, BRASS[2]);
    // the striped awning over the hatch
    for (let y = hy - 6; y < hy + 4; y++) for (let x = hx - 6; x < hx + hw + 6; x++) {
      const stripe = Math.floor((x - hx + 64) / 5) % 2, t = y - (hy - 6);
      if (t > 7 && (x - hx + 64) % 5 === 2) continue;                                          // scalloped lower edge
      b.set(x, y, t === 0 ? DARKBARK[3] : stripe ? (t < 3 ? ROSE[1] : ROSE[2]) : t < 3 ? '#fffaf0' : '#f5e6c8');
    }
    for (let x = hx - 6; x < hx + hw + 6; x++) if ((x - hx + 64) % 5 !== 2) b.set(x, hy + 4, Math.floor((x - hx + 64) / 5) % 2 ? ROSE[4] : '#c9b48a');
    // the door on the right
    const dx = 92, dtop = top + 8;
    for (let y = dtop; y < base; y++) for (let x = dx; x < dx + 20; x++) b.set(x, y, x === dx || x === dx + 19 ? DARKBARK[4] : y === dtop ? DARKBARK[4] : (x - dx) % 5 === 0 ? ROSE[4] : y < dtop + 12 && x > dx + 4 && x < dx + 15 ? (y < dtop + 5 ? '#c2e6ff' : '#9fd3fb') : ROSE[3]);
    for (let x = dx + 4; x < dx + 15; x++) b.set(x, dtop + 7, ROSE[4]);
    b.set(dx + 16, base - 18, BRASS[1]); b.set(dx + 16, base - 17, BRASS[3]);
    // a teapot sign on a bracket and a stovepipe with a cap
    for (let k = 0; k < 10; k++) b.set(x0 + 2 - k, top + 2, IRON[3]);
    for (const [i, j, c] of [[0, 0, 1], [1, 0, 1], [2, 0, 1], [3, 0, 2], [-1, 1, 1], [0, 1, 0], [1, 1, 0], [2, 1, 1], [3, 1, 2], [4, 1, 2], [-1, 2, 1], [0, 2, 1], [1, 2, 1], [2, 2, 2], [3, 2, 2], [4, 2, 3], [0, 3, 2], [1, 3, 2], [2, 3, 3], [3, 3, 3], [-2, 1, 2], [-3, 0, 2], [5, 0, 3], [1, -1, 2]]) b.set(x0 - 6 + i, top + 5 + j, ROSE[c]);
    for (let y = top - 38; y < top - 14; y++) { b.set(104, y, IRON[1]); b.set(105, y, IRON[2]); b.set(106, y, IRON[3]); }
    for (let x = 101; x < 110; x++) { b.set(x, top - 40, IRON[3]); b.set(x, top - 39, IRON[2]); }
    rim(b, DARKBARK[5]);
    const glass = { gx: hx, gy: hy + 3, gw: hw, gh: hh - 3 };
    return { img: b.canvas(), ax: 70, ay: base, foot: 14, half: 52, wins: [{ gx: dx + 5, gy: dtop + 1, gw: 10, gh: 6 }], hatch: glass, steam: [105, top - 41], door: [32, 3], name: 'tea_stall' };
  }

  /* ---------- Mender's forge ---------- */
  /* A clay-brick smithy with a rusting corrugated iron roof, a tall brick chimney, an open bay with the glowing hearth,
     and a side door. About 180 wide, 160 tall. */
  function forge(o = {}) {
    const seed = o.seed || 31, W = 210, Hh = 176, b = new Buf(W, Hh), base = Hh - 8, x0 = 16, x1 = 196, top = base - 62;
    bricks(b, x0, top, x1 - x0, base - top, M.clay, seed, { bw: 10, bh: 5 });
    for (let y = top; y < base; y++) { b.set(x0, y, M.clay[2]); b.set(x1 - 1, y, M.clay[5]); b.set(x1 - 2, y, M.clay[4]); }
    // the roof: corrugated iron sheets over a bark frame
    hipRoof(b, x0 - 10, x1 + 10, top - 40, top, 18, (b2, X, Y, w, h, inside) => ironSheet(b2, X, Y, w, h, seed, { inside, rust: 0.45 }), { fascia: DARKBARK });
    for (let x = x0 - 6; x < x1 + 6; x += 34) for (let y = top - 38; y < top; y++) if (b.get(x, y)) b.set(x, y, IRON[4]);      // sheet seams
    eaveShadow(b, x0, x1, top + 3, 4, M.clay, [M.clay[2], M.clay[3], M.clay[4], M.clay[5], M.clay[5], M.clay[5]]);
    // the chimney, rising through the roof on the left
    const cx0 = 34, cx1 = 54, ctop = 10;
    bricks(b, cx0, ctop, cx1 - cx0, top - 20 - ctop, M.clay, seed + 1, { bw: 7, bh: 4 });
    for (let y = ctop; y < top - 20; y++) { b.set(cx1 - 1, y, M.clay[5]); b.set(cx1 - 2, y, M.clay[4]); b.set(cx0, y, M.clay[1]); }
    for (let x = cx0 - 3; x < cx1 + 3; x++) { b.set(x, ctop - 4, STONE[1]); b.set(x, ctop - 3, STONE[2]); b.set(x, ctop - 2, STONE[3]); b.set(x, ctop - 1, STONE[4]); }
    for (let x = cx0; x < cx1; x++) b.set(x, ctop - 5, '#3d2a2e');
    // the open bay: a dark interior, the hearth glowing in the back, a bark lintel
    const bx = 64, bw = 72, btop = top + 10;
    for (let y = btop; y < base; y++) for (let x = bx; x < bx + bw; x++) b.set(x, y, y < btop + 4 ? '#3a2b28' : '#523d35');
    for (let y = btop + 18; y < base - 4; y++) for (let x = bx + 8; x < bx + 34; x++) b.set(x, y, y < btop + 22 ? M.clay[4] : y > base - 12 ? M.clay[5] : '#a8333a');
    for (let y = btop + 24; y < base - 12; y++) for (let x = bx + 12; x < bx + 30; x++) b.set(x, y, (x + y) % 4 ? '#f28c38' : '#ffd86a');
    for (let x = bx - 4; x < bx + bw + 4; x++) { b.set(x, btop - 4, DARKBARK[1]); b.set(x, btop - 3, DARKBARK[2]); b.set(x, btop - 2, DARKBARK[3]); b.set(x, btop - 1, DARKBARK[4]); }
    for (const px of [bx - 4, bx + bw]) for (let y = btop; y < base; y++) for (let i = 0; i < 4; i++) b.set(px + i, y, i === 0 ? DARKBARK[1] : i === 3 ? DARKBARK[4] : DARKBARK[2]);
    // tools on the back wall: tongs and hammers
    for (const [tx, len] of [[bx + 44, 18], [bx + 52, 14], [bx + 60, 20]]) { for (let y = btop + 6; y < btop + 6 + len; y++) b.set(tx, y, IRON[2]); for (let i = -2; i <= 2; i++) b.set(tx + i, btop + 6 + len, IRON[1]); }
    // the side door
    const dx = 152, dtop = top + 14;
    for (let y = dtop; y < base; y++) for (let x = dx; x < dx + 24; x++) b.set(x, y, x === dx || x === dx + 23 || y === dtop ? DARKBARK[4] : (x - dx) % 6 === 0 ? DARKBARK[4] : x < dx + 4 ? DARKBARK[1] : DARKBARK[2]);
    for (const yy of [dtop + 8, base - 10]) for (let x = dx + 1; x < dx + 23; x++) { b.set(x, yy, IRON[3]); b.set(x, yy + 1, IRON[4]); }
    b.set(dx + 19, base - 20, BRASS[1]); b.set(dx + 19, base - 19, BRASS[3]);
    // a gear sign over the door
    for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) { const d = Math.hypot(i, j), a = Math.atan2(j, i); if (d <= 4.2 + (Math.cos(a * 8) > 0.3 ? 2 : 0) && d > 1.6) b.set(dx + 12 + i, dtop - 12 + j, i + j < 0 ? BRASS[1] : BRASS[3]); }
    // a small window on the left
    const w1 = { gx: 26, gy: top + 16, gw: 20, gh: 16 };
    for (let y = w1.gy - 2; y < w1.gy + w1.gh + 2; y++) for (let x = w1.gx - 2; x < w1.gx + w1.gw + 2; x++) b.set(x, y, DARKBARK[3]);
    for (let y = w1.gy; y < w1.gy + w1.gh; y++) for (let x = w1.gx; x < w1.gx + w1.gw; x++) b.set(x, y, x === w1.gx + 10 || y === w1.gy + 8 ? DARKBARK[2] : (x + y) % 9 === 0 ? '#ffffff' : y < w1.gy + 6 ? '#c2e6ff' : '#9fd3fb');
    rim(b, M.clay[5]);
    return { img: b.canvas(), ax: 106, ay: base, foot: 20, half: 92, wins: [w1], hearth: { gx: bx + 8, gy: btop + 18, gw: 26, gh: base - 4 - btop - 18 }, chimney: [44, ctop - 6], door: [58, 3], name: 'forge' };
  }

  /* ---------- acorn house ---------- */
  // An acorn standing on the ground as a house: a glossy shell, a scaly cap for a roof with its stalk as a chimney.
  function acornHouse(o = {}) {
    const seed = o.seed || 41, W = 150, Hh = 168, b = new Buf(W, Hh), base = Hh - 8, cx = 75, rx = 54, A = M.acorn, C = M.cap;
    const bodyTop = base - 96, bodyCy = base - 52;
    // the shell: an egg tapering to the ground, glossy highlight top-left
    for (let y = bodyTop; y <= base; y++) {
      const v = (y - bodyCy) / (y < bodyCy ? 50 : 52), hw = rx * Math.sqrt(Math.max(0, 1 - v * v)) * (y > bodyCy ? 1 - (y - bodyCy) / 160 : 1);
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = v * 0.8, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        let sh = shadeOf(nx, ny, nz);
        if (Math.abs(nx + 0.42) < 0.06 && ny < 0.2 && ny > -0.6) sh = -1;                 // the gloss streak
        b.set(x, y, sh < 0 ? '#fff6dc' : A[band(sh * 1.05, 0, 5)]);
      }
    }
    // faint vertical grain lines
    for (const gx of [-30, -14, 4, 22, 38]) for (let y = bodyTop + 30; y < base - 6; y += 1) if ((y >> 3) % 3 && b.get(cx + gx + Math.round(Math.sin(y / 20) * 2), y)) { const x = cx + gx + Math.round(Math.sin(y / 20) * 2); b.set(x, y, A[Math.min(5, band(shadeOf((x - cx) / rx, 0, 0.8), 0, 5) + 1)]); }
    // the cap: a wide dome of overlapping scales
    const capTop = bodyTop - 44, capBot = bodyTop + 22, crx = rx + 14;
    const inCap = (x, y) => { const nx = (x + 0.5 - cx) / crx, ny = (y + 0.5 - capBot) / (capBot - capTop); return y <= capBot && nx * nx + ny * ny <= 1; };
    for (let y = capTop; y <= capBot + 2; y++) for (let x = cx - crx - 1; x <= cx + crx + 1; x++) {
      if (!inCap(x, y)) continue;
      const nx = (x + 0.5 - cx) / crx, ny = (y + 0.5 - capBot) / (capBot - capTop), nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), sh = shadeOf(nx, ny, nz);
      const row = Math.floor((capBot - y) / 5), v = (capBot - y) % 5, u = (x - cx + 64 * 7 + (row % 2) * 3) % 7;
      const scale = v === 0 || (v === 1 && (u === 0 || u === 6));
      b.set(x, y, scale ? C[Math.min(5, band(sh, 1, 4) + 1)] : C[band(sh, 0, 4)]);
    }
    for (let x = cx - crx; x <= cx + crx; x++) if (inCap(x, capBot)) { b.set(x, capBot + 1, C[4]); b.set(x, capBot + 2, C[5]); }
    // the stalk: a chimney with a little hat
    for (let y = capTop - 18; y < capTop + 3; y++) for (let x = cx - 4; x < cx + 4; x++) b.set(x, y, x < cx - 2 ? C[1] : x > cx + 1 ? C[4] : C[2]);
    for (let x = cx - 6; x < cx + 6; x++) { b.set(x, capTop - 20, IRON[2]); b.set(x, capTop - 19, IRON[3]); }
    // a round door with brass studs, two round windows, a gear wind chime
    const door = archDoor(b2ctx(b), cx - 6, base - 1, 22, 40, { ramp: [M.bark[1], M.bark[2], M.bark[3], M.bark[4]] });
    const wins = [roundWindow(b2ctx(b), cx - 30, bodyTop + 44, 8), roundWindow(b2ctx(b), cx + 26, bodyTop + 40, 7)];
    rim(b, C[5]);
    flush(b);
    return { img: b.canvas(), ax: cx, ay: base, foot: 16, half: 46, wins, door: [-6, 4], chimney: [cx, capTop - 22], name: 'acorn_house' };
  }
  // archDoor and roundWindow draw on a 2D context; let them draw onto a Buf through a canvas that is merged back.
  const ctxOf = new WeakMap();
  function b2ctx(b) { let e = ctxOf.get(b); if (!e) { const [c, x] = K.canvas(b.w, b.h); e = { c, x }; ctxOf.set(b, e); } return e.x; }
  function flush(b) {
    const e = ctxOf.get(b); if (!e) return;
    const d = new Uint32Array(e.x.getImageData(0, 0, b.w, b.h).data.buffer);
    for (let i = 0; i < d.length; i++) if (d[i] >>> 24) b.d[i] = d[i];
    ctxOf.delete(b);
  }

  /* ---------- Kapten Bram's wagon home ---------- */
  /* An old goods wagon on a short length of track, made a home: faded teal planks, an iron hoop roof, a stovepipe,
     a porch of crates with steps, a whistle and a driver's lamp by the door. About 160 wide, 110 tall. */
  function wagonHome(o = {}) {
    const seed = o.seed || 51, W = 190, Hh = 132, b = new Buf(W, Hh), base = Hh - 8, x0 = 22, x1 = 160, floor = base - 18, top = floor - 54;
    const TEAL = ['#cdeee6', '#9fd6cb', '#74b8ae', '#55938f', '#3f6e70', '#2b4c52'];
    // rails and sleepers under it
    for (let x = 4; x < W - 4; x++) for (const [y, c] of [[base - 3, IRON[1]], [base - 2, IRON[3]]]) b.set(x, y, c);
    for (let x = 8; x < W - 8; x += 12) for (let y = base - 1; y < base + 2; y++) for (let i = 0; i < 8; i++) b.set(x + i, y, y === base - 1 ? M.bark[2] : M.bark[3]);
    // the chassis and wheels
    for (let x = x0 - 4; x < x1 + 4; x++) for (let y = floor; y < floor + 5; y++) b.set(x, y, y === floor ? IRON[2] : IRON[3]);
    for (const wx of [x0 + 22, x1 - 22]) for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) { const d = Math.hypot(i, j); if (d <= 9.3) b.set(wx + i, base - 11 + j, d > 7.8 ? IRON[4] : d < 2.5 ? IRON[1] : Math.abs(i) < 1 || Math.abs(j) < 1 ? IRON[2] : i + j < 0 ? IRON[2] : IRON[3]); }
    // the body: teal planks, a darker band of trim
    planks(b, x0, top, x1 - x0, floor - top, TEAL, seed, { size: 7 });
    for (let x = x0; x < x1; x++) for (const [y, c] of [[top + 2, TEAL[4]], [floor - 6, TEAL[4]], [floor - 5, TEAL[5]]]) b.set(x, y, c);
    for (let y = top; y < floor; y++) { b.set(x0, y, TEAL[3]); b.set(x1 - 1, y, TEAL[5]); b.set(x1 - 2, y, TEAL[4]); }
    for (const px of [x0 + 2, x0 + 46, x0 + 92, x1 - 4]) for (let y = top + 3; y < floor - 6; y++) { b.set(px, y, IRON[3]); b.set(px + 1, y, IRON[4]); }
    // the hooped roof
    for (let y = top - 14; y < top + 2; y++) for (let x = x0 - 6; x < x1 + 6; x++) {
      const t = (y - (top - 14)) / 16, hw = (x1 - x0) / 2 + 6, ux = (x - (x0 + x1) / 2) / hw;
      if (t < 1 - Math.sqrt(Math.max(0, 1 - ux * ux)) * 0.0 && ux * ux + (1 - t) ** 2 * 3 > 3.2) continue;
      b.set(x, y, y === top + 1 ? DARKBARK[4] : y === top ? DARKBARK[3] : t < 0.3 ? IRON[1] : (x - x0) % 12 === 0 ? IRON[3] : IRON[2]);
    }
    // windows (curtains) and the door
    const wins = [];
    for (const gx of [x0 + 12, x0 + 60]) {
      const g = { gx, gy: top + 10, gw: 20, gh: 16 };
      for (let y = g.gy - 2; y < g.gy + g.gh + 2; y++) for (let x = g.gx - 2; x < g.gx + g.gw + 2; x++) b.set(x, y, DARKBARK[3]);
      for (let y = g.gy; y < g.gy + g.gh; y++) for (let x = g.gx; x < g.gx + g.gw; x++) b.set(x, y, x < g.gx + 4 || x > g.gx + g.gw - 5 ? (y % 3 ? '#fff0d4' : '#f2d9ae') : (x + y) % 8 === 0 ? '#ffffff' : y < g.gy + 6 ? '#c2e6ff' : '#9fd3fb');
      wins.push(g);
    }
    const dx = x1 - 40, dtop = top + 6;
    for (let y = dtop; y < floor - 6; y++) for (let x = dx; x < dx + 22; x++) b.set(x, y, x === dx || x === dx + 21 || y === dtop ? TEAL[5] : (x - dx) % 7 === 0 ? TEAL[4] : x < dx + 3 ? TEAL[1] : TEAL[2]);
    b.set(dx + 17, floor - 22, BRASS[1]); b.set(dx + 17, floor - 21, BRASS[3]);
    // steps of stacked crates down to the ground
    for (const [sx, sy, sw] of [[dx - 2, floor, 26], [dx + 2, floor + 8, 22]]) for (let y = sy; y < sy + 8; y++) for (let x = sx; x < sx + sw; x++) b.set(x, y, y === sy ? M.bark[1] : x === sx || x === sx + sw - 1 || y === sy + 7 ? M.bark[4] : (y - sy) % 4 === 0 ? M.bark[3] : M.bark[2]);
    // the stovepipe and a driver's whistle on a hook
    for (let y = top - 36; y < top - 10; y++) { b.set(x0 + 30, y, IRON[1]); b.set(x0 + 31, y, IRON[2]); b.set(x0 + 32, y, IRON[3]); }
    for (let x = x0 + 27; x < x0 + 36; x++) { b.set(x, top - 38, IRON[3]); b.set(x, top - 37, IRON[2]); }
    for (let j = 0; j < 10; j++) { b.set(x1 + 2, top + 8 + j, BRASS[j < 2 ? 1 : 2]); b.set(x1 + 3, top + 8 + j, BRASS[3]); }
    b.set(x1 + 1, top + 18, BRASS[3]); b.set(x1 + 4, top + 18, BRASS[4]);
    rim(b, TEAL[5]);
    return { img: b.canvas(), ax: 91, ay: base, foot: 18, half: 76, wins, door: [dx + 10 - 91, 10], chimney: [x0 + 31, top - 40], name: 'wagon_home' };
  }

  /* ---------- the cooper's shed ---------- */
  // A bark-plank workshop under leaf shingles, its front open on stacked seed-pod barrels and hoops.
  function cooperShed(o = {}) {
    const seed = o.seed || 61, W = 160, Hh = 128, b = new Buf(W, Hh), base = Hh - 8, x0 = 18, x1 = 142, top = base - 50;
    planks(b, x0, top, x1 - x0, base - top, M.bark, seed, { size: 7 });
    for (let y = top; y < base; y++) { b.set(x0, y, M.bark[3]); b.set(x1 - 1, y, M.bark[5]); b.set(x1 - 2, y, M.bark[4]); }
    const leafy = (b2, X, Y, w, h, inside) => shingles(b2, X, Y, w, h, ['#e9f5a0', '#c3e07a', '#98c25c', '#6f9a46', '#4a6e36'], seed, { inside, sw: 11, sh: 6, shape: 'leaf' });
    hipRoof(b, x0 - 10, x1 + 10, top - 34, top, 20, leafy, { fascia: M.bark });
    eaveShadow(b, x0, x1, top + 3, 3, M.bark, [M.bark[2], M.bark[3], M.bark[4], M.bark[5], M.bark[5], M.bark[5]]);
    // the open front, dark inside, with barrels
    const ox0 = 70, ox1 = 134;
    for (let y = top + 8; y < base; y++) for (let x = ox0; x < ox1; x++) b.set(x, y, '#4a332c');
    for (const [bx, by, r] of [[84, base - 9, 9], [104, base - 9, 9], [94, base - 26, 9], [124, base - 8, 8]]) barrelAt(b, bx, by, r);
    // a small window and a door on the left
    const g = { gx: 28, gy: top + 12, gw: 16, gh: 14 };
    for (let y = g.gy - 2; y < g.gy + g.gh + 2; y++) for (let x = g.gx - 2; x < g.gx + g.gw + 2; x++) b.set(x, y, M.bark[4]);
    for (let y = g.gy; y < g.gy + g.gh; y++) for (let x = g.gx; x < g.gx + g.gw; x++) b.set(x, y, x === g.gx + 8 ? M.bark[3] : (x + y) % 7 === 0 ? '#ffffff' : y < g.gy + 5 ? '#c2e6ff' : '#9fd3fb');
    for (let y = top + 10; y < base; y++) for (let x = 48; x < 66; x++) b.set(x, y, x === 48 || x === 65 || y === top + 10 ? M.bark[5] : (x - 48) % 6 === 0 ? M.bark[4] : M.bark[1]);
    b.set(61, base - 18, BRASS[1]);
    rim(b, M.bark[5]);
    return { img: b.canvas(), ax: 80, ay: base, foot: 16, half: 62, wins: [g], door: [-23, 3], name: 'cooper_shed' };
  }
  // A seed-pod barrel lying on its side or standing: hooped staves, seen from the front.
  function barrelAt(b, cx, cy, r) {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (i * i + j * j > r * r + r) continue;
      const hoop = Math.abs(j + r * 0.45) < 1 || Math.abs(j - r * 0.45) < 1, stave = (i + 64) % 4 === 0;
      b.set(cx + i, cy + j, hoop ? (i < 0 ? '#d9a443' : '#a8732f') : stave ? M.acorn[4] : i + j < -r * 0.5 ? M.acorn[1] : i > r * 0.4 ? M.acorn[3] : M.acorn[2]);
    }
  }

  /* ---------- the banyan ---------- */
  /* The great banyan by the station: a crown wider than a house over a trunk of twisting root-columns, aerial roots
     hanging to the ground, and between its two middle columns the gap where Marlow's shop door appears at night.
     Returns the tree and the hanging points of its seven lanterns, in local coordinates. */
  function banyan(o = {}) {
    const seed = o.seed || 71, W = 380, Hh = 320, b = new Buf(W, Hh), base = Hh - 10, cx = W >> 1, rnd = rng(seed), BK = M.bark;
    const crownY = 96, crownRx = 176, crownRy = 64;
    // aerial roots behind the trunk
    const aerial = [];
    for (let i = 0; i < 16; i++) { const x = cx - 150 + (i / 15) * 300 + (rnd() - 0.5) * 10; if (Math.abs(x - cx) < 60) continue; aerial.push([x, crownY + 40 + rnd() * 16, base - 4 - (rnd() < 0.5 ? 0 : 30 + rnd() * 40)]); }
    for (const [x, y0, y1] of aerial) for (let y = Math.round(y0); y < y1; y++) { const px = Math.round(x + Math.sin(y / 17 + x) * 2); b.set(px, y, BK[2]); b.set(px + 1, y, BK[3]); if (y % 6 === 0) b.set(px - 1, y, BK[1]); }
    // the trunk: root-columns twisting up into the crown
    const cols = [[-58, 13], [-38, 15], [-18, 13], [18, 13], [38, 15], [58, 12], [-4, 10], [6, 10]];
    const colX = (dx, y) => cx + dx * (0.45 + 0.55 * Math.max(0, (y - 120) / (base - 120))) + Math.sin(y / 23 + dx) * 3;
    for (const [dx, w] of cols) for (let y = 110; y <= base; y++) {
      const x0 = colX(dx, y), hw = w / 2 + (y > base - 14 ? (y - base + 14) * 0.7 : 0);
      for (let x = Math.round(x0 - hw); x <= Math.round(x0 + hw); x++) {
        const u = (x + 0.5 - (x0 - hw)) / (2 * hw), ridge = vnoise(x / 2, y / 14, seed) > 0.62;
        b.set(x, y, u < 0.1 ? BK[4] : u < 0.35 ? BK[1] : u < 0.7 ? (ridge ? BK[3] : BK[2]) : u < 0.9 ? BK[3] : BK[4]);
      }
    }
    // the gap between the middle columns: dark, arched
    const gapTop = base - 50;
    for (let y = gapTop; y < base; y++) {
      const hw = y < gapTop + 13 ? Math.sqrt(Math.max(0, 169 - (gapTop + 13 - y) ** 2)) : 13;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) b.set(x, y, y < gapTop + 3 ? '#271d1d' : '#3a2b28');
    }
    // ground roots spreading out
    for (const [dx, side, len] of [[-64, -1, 30], [-44, -1, 18], [-20, -1, 12], [20, 1, 12], [42, 1, 20], [62, 1, 34]]) {
      const x0 = colX(dx, base);
      for (let i = 0; i < len; i++) {
        const px = Math.round(x0 + side * i), py = Math.round(base - 3 + i * 0.25), th = Math.max(2, Math.round(7 - i * 0.22));
        for (let j = 0; j < th; j++) b.set(px, py - j, j === 0 ? BK[5] : j === 1 ? BK[3] : j === th - 1 ? BK[1] : BK[2]);
      }
    }
    // branches into the crown
    for (const [x1, y1] of [[-120, 92], [-70, 70], [-20, 60], [30, 64], [80, 72], [130, 96]]) {
      const pts = Array.from({ length: 20 }, (_, i) => { const t = i / 19; return [cx + x1 * 0.25 * (1 - t) + x1 * t, 130 * (1 - t) + y1 * t]; });
      for (const [px, py] of pts) for (let j = -3; j <= 3; j++) b.set(Math.round(px), Math.round(py + j), j < -1 ? BK[1] : j > 1 ? BK[4] : BK[2]);
    }
    // the crown: a wide dome of deep clumps, darker underneath
    const clumps = [];
    for (let y = -crownRy + 10; y <= crownRy - 6; y += 13) {
      const hw = crownRx * Math.sqrt(Math.max(0, 1 - (y / crownRy) ** 2)), n = Math.max(1, Math.round((2 * hw) / 17));
      for (let i = 0; i < n; i++) { const x = (n === 1 ? 0 : (i / (n - 1)) * 2 - 1) * Math.max(0, hw - 12) + (rnd() - 0.5) * 6; clumps.push([x, y + (rnd() - 0.5) * 5, 12 + rnd() * 4, rnd() * 6, y > crownRy * 0.3 || x > crownRx * 0.45 ? 1 : 0]); }
    }
    clumps.sort((p, q) => p[1] - q[1]);
    K.paintClumps(b, clumps, ['#d8f28a', '#9fd65e', '#6dbb4e', '#4a9848', '#347647', '#255443'], cx, crownY, 0, -1e9);
    K.leafMarks(b, seed + 2, ['#d8f28a', '#9fd65e', '#6dbb4e', '#4a9848', '#347647', '#255443'], [0, 0, W, crownY + crownRy]);
    // aerial roots in front, hanging from the crown's underside
    for (const [x, len] of [[cx - 96, 70], [cx - 82, 120], [cx + 88, 110], [cx + 110, 60], [cx - 126, 40]]) {
      for (let y = crownY + 48; y < crownY + 48 + len; y++) { const px = Math.round(x + Math.sin(y / 15) * 2); b.set(px, y, BK[1]); b.set(px + 1, y, BK[3]); }
    }
    // lantern hooks: where the seven lanterns hang (their strings start in the crown)
    const lanterns = [[-118, 168], [-84, 156], [-48, 150], [0, 148], [48, 150], [84, 156], [118, 168]].map(([dx, y]) => [cx + dx, y]);
    for (const [lx, ly] of lanterns) for (let y = ly - 26; y < ly - 8; y++) b.set(lx, y, BK[3]);
    rim(b, '#1b3b3c');
    return { img: b.canvas(), ax: cx, ay: base, foot: 10, half: 70, door: [cx, base], gap: [cx, gapTop, base], lanterns, name: 'banyan' };
  }
  // A lantern hanging at (x, y) (its top hook): brass cap, glass, a flame that flickers when lit. draws on a 2D ctx.
  function lantern(g, x, y, t, lit, i = 0) {
    const f = Math.floor(t * 7) + i * 3, glow = lit ? (f % 11 === 0 ? '#fff0a8' : '#ffd86a') : '#e4f4ff';
    const rows = ['..44..', '.2112.', '3gGgw3', '3gggg3', '3gggg3', '3gggw3', '.2222.', '..22..'];
    const key = { 4: IRON[3], 2: BRASS[2], 1: BRASS[1], 3: BRASS[3], g: glow, G: lit ? '#fffbe6' : '#ffffff', w: lit ? '#ffd86a' : '#c2e6ff' };
    rows.forEach((r, j) => { for (let k = 0; k < 6; k++) if (key[r[k]]) { g.fillStyle = key[r[k]]; g.fillRect(x - 3 + k, y + j, 1, 1); } });
    if (lit) { g.globalAlpha = 0.28; PX.ellipse(g, x, y + 4, 7, 7, '#fff0a8'); g.globalAlpha = 1; }
  }
  // Marlow's door glowing in the banyan's root gap: drawn at night only (a light). (x, base) is the gap's foot centre.
  function shopDoor(g, x, base, t) {
    const R2 = (px, py, w, h, c) => { g.fillStyle = c; g.fillRect(px, py, w, h); };
    const fl = Math.floor(t * 6) % 9 === 0, top = base - 46;
    for (let y = top; y < base; y++) { const hw = y < top + 11 ? Math.round(Math.sqrt(Math.max(0, 121 - (top + 11 - y) ** 2))) : 11; R2(x - hw, y, hw * 2 + 1, 1, y < top + 3 ? '#ffb347' : fl ? '#fff0a8' : '#ffd86a'); }
    R2(x - 8, top + 12, 17, base - top - 12, '#3aa287'); R2(x - 8, top + 12, 2, base - top - 12, '#5cc9a3'); R2(x + 7, top + 12, 2, base - top - 12, '#2b7a6c');
    for (let y = top + 18; y < base - 2; y += 7) R2(x - 6, y, 13, 1, '#2b7a6c');
    PX.ellipse(g, x, top + 20, 3, 3, '#fffbe6'); R2(x + 5, base - 20, 2, 2, BRASS[1]);
    R2(x - 2, top + 4, 4, 4, BRASS[1]); R2(x - 1, top + 8, 2, 2, BRASS[3]);                      // the brass bell
    g.globalAlpha = 0.25; PX.ellipse(g, x, base + 4, 22, 4, '#ffd86a'); PX.ellipse(g, x, base + 4, 12, 2, '#fff0a8'); g.globalAlpha = 1;
  }

  /* ---------- the rail yard ---------- */
  // The old locomotive, standing still for twenty years: an iron boiler gone rusty, a brass dome, a bark-plank cab
  // under a leaf roof, red wheels, a twig cowcatcher, moss on its back. Faces left. About 180 x 110.
  function locomotive(o = {}) {
    const seed = o.seed || 81, W = 200, Hh = 120, b = new Buf(W, Hh), base = Hh - 8, R0 = 14;
    const by0 = base - 64, by1 = base - 26, bx0 = 30, bx1 = 128;
    // the boiler, a cylinder seen from the side, shaded top-lit
    for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) {
      const v = (y - by0) / (by1 - by0), rust = vnoise(x / 8, y / 6, seed) > 0.6 - v * 0.3, P = rust ? M.rust : IRON;
      b.set(x, y, P[v < 0.15 ? 0 : v < 0.4 ? 1 : v < 0.75 ? 2 : 3]);
    }
    for (const x of [bx0 + 20, bx0 + 50, bx0 + 80]) for (let y = by0; y < by1; y++) { b.set(x, y, BRASS[y < by0 + 6 ? 1 : 2]); b.set(x + 1, y, BRASS[3]); }
    // the smokebox front (round, darker) and its door
    for (let j = 0; j < by1 - by0; j++) { const v = j / (by1 - by0), hw = 6 * Math.sqrt(Math.max(0, 1 - (2 * v - 1) ** 2)); for (let i = 0; i <= hw; i++) b.set(bx0 - i, by0 + j, IRON[v < 0.3 ? 2 : 3]); }
    for (let j = -8; j <= 8; j++) for (let i = -5; i <= 5; i++) if (i * i / 25 + j * j / 64 <= 1) b.set(bx0 - 2 + i, (by0 + by1) / 2 + j, i < 0 ? IRON[3] : IRON[4]);
    // the stack and the brass dome
    for (let y = by0 - 26; y < by0; y++) for (let x = bx0 + 6; x < bx0 + 18; x++) { const flare = y < by0 - 20 ? 3 : 0; b.set(x, y, x < bx0 + 9 ? IRON[1] : x > bx0 + 15 ? IRON[4] : IRON[3]); if (flare) { b.set(bx0 + 5, y, IRON[2]); b.set(bx0 + 18, y, IRON[4]); } }
    for (let x = bx0 + 3; x < bx0 + 21; x++) { b.set(x, by0 - 27, IRON[2]); b.set(x, by0 - 28, IRON[3]); }
    for (let j = -9; j <= 0; j++) for (let i = -9; i <= 9; i++) if (i * i / 81 + j * j / 81 <= 1) b.set(bx0 + 54 + i, by0 + j, i + j < -6 ? BRASS[0] : i < 2 ? BRASS[1] : BRASS[3]);
    // the cab: bark planks, a window, a leaf roof
    const cx0 = bx1 - 4, cx1 = bx1 + 44, ctop = by0 - 22;
    planks(b, cx0, ctop, cx1 - cx0, by1 - ctop, DARKBARK, seed, { size: 6 });
    for (let y = ctop + 8; y < ctop + 26; y++) for (let x = cx0 + 12; x < cx0 + 32; x++) b.set(x, y, '#3a2b28');
    for (let y = ctop - 8; y < ctop + 2; y++) for (let x = cx0 - 6; x < cx1 + 6; x++) b.set(x, y, y === ctop + 1 ? '#3f6e45' : y < ctop - 5 ? '#a8dc63' : (x + y) % 6 === 0 ? '#57a148' : '#7cc152');
    // the frame and wheels
    for (let x = bx0 - 10; x < cx1 + 2; x++) for (let y = by1; y < by1 + 6; y++) b.set(x, y, y === by1 ? IRON[2] : IRON[3]);
    for (const [wx, r] of [[bx0 + 14, 11], [bx0 + 44, R0], [bx0 + 76, R0], [cx0 + 24, 10]]) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i, j); if (d > r + 0.3) continue;
      b.set(wx + i, base - r + j, d > r - 1.5 ? IRON[4] : d < 2.5 ? BRASS[2] : (Math.abs(i) < 1 || Math.abs(j) < 1 || Math.abs(i - j) < 1 || Math.abs(i + j) < 1) ? '#a8333a' : i + j < 0 ? '#f2665a' : '#d9483b');
    }
    for (let x = bx0 + 14; x <= bx0 + 76; x++) { b.set(x, base - R0 - 1, IRON[1]); b.set(x, base - R0, IRON[3]); }          // coupling rod
    // the cowcatcher of twigs
    for (let k = 0; k < 6; k++) for (let j = 0; j < 14; j++) b.set(bx0 - 12 - j + k * 3, base - 16 + j, k % 2 ? M.bark[3] : M.bark[2]);
    // moss on its back and a clover sprout from the stack
    mossEdge(b, bx0 + 2, bx1, by0, seed + 4);
    for (const [x, y, c] of [[bx0 + 12, by0 - 31, 2], [bx0 + 13, by0 - 32, 1], [bx0 + 10, by0 - 33, 2], [bx0 + 11, by0 - 34, 1], [bx0 + 14, by0 - 34, 2], [bx0 + 15, by0 - 35, 1]]) b.set(x, y, M.moss[c]);
    rim(b, IRON[4]);
    return { img: b.canvas(), ax: 100, ay: base, foot: 12, half: 86, name: 'locomotive' };
  }
  // A wagon: 'logs' (a flatbed with a stack of logs) or 'cover' (a leaf tarpaulin roped over its load).
  function wagon(o = {}) {
    const { seed = 91, kind = 'logs' } = o, W = 130, Hh = 80, b = new Buf(W, Hh), base = Hh - 6, x0 = 10, x1 = 120, deck = base - 24;
    for (let x = x0; x < x1; x++) for (let y = deck; y < deck + 8; y++) b.set(x, y, y === deck ? DARKBARK[1] : y === deck + 7 ? DARKBARK[4] : (x - x0) % 9 === 0 ? DARKBARK[4] : DARKBARK[2]);
    for (const wx of [x0 + 20, x1 - 20]) for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) { const d = Math.hypot(i, j); if (d <= 9.3) b.set(wx + i, base - 9 + j, d > 7.8 ? IRON[4] : d < 2.5 ? IRON[1] : i + j < 0 ? IRON[2] : IRON[3]); }
    if (kind === 'logs') {
      for (const [lx, ly, r] of [[x0 + 14, deck - 7, 7], [x0 + 30, deck - 7, 7], [x0 + 46, deck - 7, 7], [x0 + 22, deck - 19, 7], [x0 + 38, deck - 19, 7]]) {
        for (let x = lx; x < lx + 62; x++) for (let j = -r; j <= r; j++) b.set(x - 4 + 40 - 40, ly + j, j < -r + 2 ? M.bark[1] : j > r - 2 ? M.bark[4] : M.bark[2]);
        for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) b.set(lx - 4 + i, ly + j, i * i + j * j > (r - 2) ** 2 ? M.bark[3] : (Math.round(Math.hypot(i, j)) % 2 ? M.acorn[1] : M.acorn[0]));
      }
    } else {
      for (let y = deck - 30; y < deck; y++) for (let x = x0 + 4; x < x1 - 4; x++) {
        const t = (y - (deck - 30)) / 30, bulge = Math.sin(((x - x0) / (x1 - x0)) * Math.PI);
        if (t < 0.25 - bulge * 0.25 && y < deck - 26) continue;
        b.set(x, y, (x - x0) % 22 === 0 ? '#2e5c3a' : t < 0.25 ? '#a8dc63' : t < 0.6 ? '#7cc152' : '#57a148');
      }
      for (const rx of [x0 + 30, x0 + 70]) for (let y = deck - 28; y < deck; y++) b.set(rx, y, '#d9c8a0');
    }
    rim(b, DARKBARK[5]);
    return { img: b.canvas(), ax: 65, ay: base, foot: 10, half: 54, name: 'wagon' };
  }
  // The water tower: a great seed pod on four twig legs, with a canvas spout.
  function waterTower(o = {}) {
    const seed = o.seed || 101, W = 90, Hh = 150, b = new Buf(W, Hh), base = Hh - 6, cx = 45, podY = 52, P = ['#e8f2b8', '#c8de8a', '#a3c46a', '#7ea052', '#5c7a42', '#3f5a36'];
    for (const [dx, lean] of [[-22, -6], [22, 6], [-10, -2], [10, 2]]) { const x0 = cx + dx * 0.6; for (let y = podY + 20; y < base; y++) { const x = Math.round(x0 + ((lean + dx * 0.4) * (y - podY - 20)) / (base - podY - 20)); b.set(x, y, M.bark[2]); b.set(x + 1, y, M.bark[3]); if (dx < 0) b.set(x - 1, y, M.bark[1]); } }
    for (const y of [podY + 50, base - 24]) for (let x = cx - 26; x < cx + 26; x++) { b.set(x, y, M.bark[2]); b.set(x, y + 1, M.bark[4]); }
    for (let y = podY - 36; y < podY + 30; y++) for (let x = cx - 30; x <= cx + 30; x++) {
      const nx = (x + 0.5 - cx) / 30, ny = (y + 0.5 - podY) / (y < podY ? 36 : 30), r2 = nx * nx + ny * ny; if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2), rib = Math.abs(Math.sin(Math.atan2(nx, nz) * 5)) < 0.18, sh = shadeOf(nx, ny, nz);
      b.set(x, y, P[Math.min(5, band(sh, 0, 4) + (rib ? 1 : 0))]);
    }
    for (let i = -12; i <= 12; i++) for (let j = 0; j < 6; j++) b.set(cx + i, podY - 38 - j + Math.abs(i) / 3, j === 0 ? P[3] : ((i + 12) >> 2) % 2 ? P[2] : P[1]);   // the crown
    for (let k = 0; k < 18; k++) { b.set(cx + 26 + k, podY + 10 + (k >> 1), '#d9c8a0'); b.set(cx + 26 + k, podY + 11 + (k >> 1), '#b8a07a'); }
    rim(b, P[5]);
    return { img: b.canvas(), ax: cx, ay: base, foot: 6, half: 22, name: 'water_tower' };
  }
  // A semaphore signal on a twig mast: a red leaf arm with a white band, and its lamp.
  function signal(o = {}) {
    const W = 40, Hh = 110, b = new Buf(W, Hh), base = Hh - 4, x = 14;
    for (let y = 14; y < base; y++) { b.set(x, y, M.bark[1]); b.set(x + 1, y, M.bark[2]); b.set(x + 2, y, M.bark[4]); }
    for (let i = 0; i < 22; i++) for (let j = 0; j < 5; j++) b.set(x + 3 + i, 18 + j - Math.round(i * 0.35), i > 12 && i < 16 ? '#ffffff' : j === 4 ? '#a8333a' : j === 0 ? '#ff9a8a' : '#f2665a');
    for (let j = 0; j < 7; j++) for (let i = 0; i < 6; i++) b.set(x - 6 + i, 24 + j, i === 0 || i === 5 || j === 0 || j === 6 ? IRON[3] : j < 3 ? '#f2665a' : '#9fd3fb');
    for (let y = base - 30; y < base; y += 6) { b.set(x - 2, y, IRON[2]); b.set(x - 1, y, IRON[2]); b.set(x + 3, y + 3, IRON[2]); b.set(x + 4, y + 3, IRON[2]); }
    rim(b, M.bark[5]);
    return { img: b.canvas(), ax: x + 1, ay: base, foot: 3, half: 3, glass: { gx: x - 5, gy: 25, gw: 4, gh: 5 }, name: 'signal' };
  }

  /* ---------- street furniture and clutter ---------- */
  // A mushroom street lamp: a tall pale stalk, a cap that glows at night. kind: red | gold | lilac.
  function mushroomLamp(o = {}) {
    const { kind = 'gold', h: H0 = 48 } = o, C = { red: ['#ff9a8a', '#f2665a', '#d9483b', '#a8333a'], gold: ['#fff0a8', '#ffd25a', '#f2a93d', '#c47a2b'], lilac: ['#ead9ff', '#c9b0f2', '#a588d9', '#7d66b5'] }[kind];
    const W = 36, Hh = H0 + 10, b = new Buf(W, Hh), base = Hh - 4, cx = 18;
    for (let y = base - H0 + 10; y < base; y++) { const w = 2 + (y > base - 6 ? 1 : 0); for (let i = -w; i <= w; i++) b.set(cx + i, y, i < -1 ? '#fffaf0' : i > 0 ? '#e3cfa6' : '#f5e6c8'); }
    for (let j = -10; j <= 2; j++) for (let i = -14; i <= 14; i++) {
      if (j <= 0 && (i * i) / 196 + (j * j) / 100 > 1) continue; if (j > 0 && Math.abs(i) > 13 - j * 2) continue;
      b.set(cx + i, base - H0 + 8 + j, j > 0 ? '#e9d6c0' : i + j < -10 ? C[0] : i - j > 8 ? C[3] : i > 0 ? C[2] : C[1]);
    }
    for (const [i, j] of [[-6, -6], [3, -8], [8, -3], [-1, -3]]) { b.set(cx + i, base - H0 + 8 + j, '#ffffff'); b.set(cx + i + 1, base - H0 + 8 + j, '#fffaf0'); }
    rim(b, C[3]);
    return { img: b.canvas(), ax: cx, ay: base, foot: 3, half: 3, glow: [cx, base - H0 + 6], kind, name: 'mushroom_lamp' };
  }
  // The West's old iron lamp post (Mender's work): an iron column, brass collar, a glass lantern head.
  function ironLamp() {
    const W = 20, Hh = 64, b = new Buf(W, Hh), base = Hh - 3, cx = 10;
    for (let y = 14; y < base; y++) { b.set(cx - 1, y, IRON[1]); b.set(cx, y, IRON[2]); b.set(cx + 1, y, IRON[3]); }
    for (let i = -3; i <= 3; i++) { b.set(cx + i, base - 1, IRON[3]); b.set(cx + i, base - 2, IRON[2]); b.set(cx + i, 30, BRASS[i < 0 ? 1 : 3]); }
    for (let j = 0; j < 13; j++) for (let i = -4; i <= 4; i++) b.set(cx + i, 2 + j, j < 3 ? IRON[i < 0 ? 2 : 3] : Math.abs(i) === 4 || j === 12 ? IRON[4] : i === -2 && j < 7 ? '#ffffff' : i < 1 ? '#c2e6ff' : '#9fd3fb');
    b.set(cx, 1, BRASS[2]);
    rim(b, IRON[4]);
    return { img: b.canvas(), ax: cx, ay: base, foot: 2, half: 3, glass: { gx: cx - 3, gy: 5, gw: 7, gh: 9 }, name: 'iron_lamp' };
  }
  // A bench: a split log seat on two stones.
  function bench() {
    const W = 40, Hh = 22, b = new Buf(W, Hh), base = Hh - 3;
    for (const x of [6, 28]) for (let j = 0; j < 6; j++) for (let i = 0; i < 7; i++) b.set(x + i, base - 6 + j, j === 0 ? STONE[1] : i === 6 || j === 5 ? STONE[3] : STONE[2]);
    for (let x = 2; x < 38; x++) for (let j = 0; j < 7; j++) b.set(x, base - 12 + j, j === 0 ? M.bark[0] : j === 1 ? M.acorn[1] : j < 4 ? M.acorn[2] : j === 6 ? M.bark[4] : M.bark[3]);
    for (let x = 6; x < 34; x += 7) b.set(x, base - 11, M.acorn[3]);
    rim(b, M.bark[5]);
    return { img: b.canvas(), ax: 20, ay: base, foot: 4, half: 16, name: 'bench' };
  }
  // A twig fence run of n bays; each bay 14 px.
  function fence(n = 4) {
    const W = n * 14 + 6, Hh = 26, b = new Buf(W, Hh), base = Hh - 3;
    for (let k = 0; k <= n; k++) { const x = 2 + k * 14; for (let y = base - 18; y < base; y++) { b.set(x, y, M.bark[1]); b.set(x + 1, y, M.bark[2]); b.set(x + 2, y, M.bark[4]); } b.set(x + 1, base - 19, M.bark[1]); }
    for (const y of [base - 14, base - 7]) for (let x = 1; x < W - 1; x++) { b.set(x, y, M.bark[1]); b.set(x, y + 1, M.bark[3]); }
    return { img: b.canvas(), ax: W >> 1, ay: base, foot: 2, half: W >> 1, name: 'fence' };
  }
  // Clutter: a sack of seeds, a crate of crumbs, a coil of silk rope, a stack of twigs, a pile of pebbles, a log.
  function clutter(kind, seed = 1) {
    const rnd = rng(seed), W = 34, Hh = 30, b = new Buf(W, Hh), base = Hh - 3, cx = 17;
    if (kind === 'sack') {
      for (let j = 0; j < 18; j++) { const hw = 7 + Math.sin((j / 17) * Math.PI) * 3 + (j > 14 ? 1 : 0); for (let i = -hw; i <= hw; i++) b.set(cx + i, base - 18 + j, j < 3 && Math.abs(i) > 3 ? 0 : i < -hw + 3 ? '#fff0d4' : i > hw - 3 ? '#c9b48a' : '#e9d6b0'); }
      for (let i = -4; i <= 4; i++) b.set(cx + i, base - 15, '#a08460');
      for (const [i, j] of [[-2, -19], [0, -20], [2, -19], [-1, -21], [1, -21]]) b.set(cx + i, base + j, '#ffe066');
    } else if (kind === 'crate') {
      for (let j = 0; j < 16; j++) for (let i = -9; i <= 9; i++) b.set(cx + i, base - 16 + j, j === 0 ? M.bark[0] : Math.abs(i) === 9 || j === 15 ? M.bark[4] : j === 8 || Math.abs(i - j + 8) < 1 ? M.bark[3] : M.bark[1]);
      for (const [i, c] of [[-6, '#f2665a'], [-2, '#ffe066'], [3, '#a8dc63'], [6, '#f2665a']]) { b.set(cx + i, base - 17, c); b.set(cx + i + 1, base - 17, c); b.set(cx + i, base - 18, c); }
    } else if (kind === 'rope') {
      for (let r = 9; r >= 3; r -= 2) for (let a = 0; a < 6.28; a += 0.08) { const x = Math.round(cx + Math.cos(a) * r), y = Math.round(base - 5 + Math.sin(a) * r * 0.45); b.set(x, y, Math.sin(a) < 0 ? '#fffaf0' : '#e3dcd0'); }
    } else if (kind === 'twigs') {
      for (let k = 0; k < 9; k++) { const y = base - 2 - (k % 3) * 3 - (k > 5 ? 3 : 0), x0 = 3 + (rnd() * 6) | 0; for (let x = x0; x < x0 + 24; x++) { b.set(x, y, M.bark[1]); b.set(x, y + 1, M.bark[3]); } b.set(x0 + 24, y, M.acorn[1]); }
    } else if (kind === 'pebbles') {
      for (let k = 0; k < 9; k++) { const x = cx - 10 + rnd() * 20, y = base - 2 - rnd() * 5 - (Math.abs(x - cx) < 5 ? 4 : 0), r = 2 + rnd() * 2; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j * 1.6 <= r * r) b.set(x + i, y + j, i + j < -r * 0.5 ? STONE[0] : i + j > r * 0.5 ? STONE[3] : STONE[1]); }
    } else if (kind === 'log') {
      for (let x = 4; x < 30; x++) for (let j = 0; j < 9; j++) b.set(x, base - 9 + j, j < 2 ? M.bark[1] : j > 6 ? M.bark[4] : M.bark[2]);
      for (let j = 0; j < 9; j++) for (let i = 0; i < 6; i++) if ((i - 2.5) ** 2 / 9 + (j - 4) ** 2 / 20 <= 1) b.set(27 + i, base - 9 + j, (Math.round(Math.hypot(i - 2.5, j - 4)) % 2) ? M.acorn[1] : M.acorn[0]);
    }
    rim(b, kind === 'pebbles' ? STONE[4] : kind === 'rope' ? '#b8ad9c' : M.bark[5]);
    return { img: b.canvas(), ax: cx, ay: base, foot: 3, half: 8, name: kind };
  }
  // The forge yard: an anvil on a stump, and a pile of scrap with brass bits.
  function anvil() {
    const W = 34, Hh = 30, b = new Buf(W, Hh), base = Hh - 3, cx = 17;
    for (let j = 0; j < 10; j++) for (let i = -7; i <= 7; i++) b.set(cx + i, base - 10 + j, j === 0 ? M.acorn[0] : i < -4 ? M.bark[1] : i > 4 ? M.bark[4] : M.bark[2]);
    for (let j = 0; j < 9; j++) { const hw = j < 3 ? 12 - j * 0 : j < 6 ? 5 : 8; for (let i = -hw; i <= hw; i++) b.set(cx + i + (j < 3 && i < -8 ? 0 : 0), base - 19 + j, j === 0 ? IRON[0] : i < -hw + 2 ? IRON[1] : i > hw - 2 ? IRON[4] : IRON[2]); }
    for (let i = 0; i < 5; i++) b.set(cx - 12 - i, base - 18 + (i >> 1), IRON[2]);
    rim(b, IRON[4]);
    return { img: b.canvas(), ax: cx, ay: base, foot: 3, half: 7, name: 'anvil' };
  }
  function scrap(seed = 1) {
    const rnd = rng(seed), W = 52, Hh = 30, b = new Buf(W, Hh), base = Hh - 3;
    for (let k = 0; k < 14; k++) {
      const x = 6 + rnd() * 38, y = base - 2 - rnd() * 10 * (1 - Math.abs(x - 26) / 26), P = rnd() < 0.25 ? BRASS : rnd() < 0.5 ? M.rust : IRON, w = 4 + rnd() * 8, h = 2 + rnd() * 4;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.set(x + i, y - j, j === h - 1 ? P[0] : i === w - 1 ? P[3] : P[1 + ((i + j) % 2)]);
    }
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const d = Math.hypot(i, j), a = Math.atan2(j, i); if (d <= 2.6 + (Math.cos(a * 6) > 0.3 ? 1.6 : 0) && d > 1) b.set(38 + i, base - 12 + j, i + j < 0 ? BRASS[1] : BRASS[3]); }
    rim(b, IRON[4]);
    return { img: b.canvas(), ax: 26, ay: base, foot: 4, half: 20, name: 'scrap' };
  }
  // A signpost on a twig: arrow boards.
  function signpost(labels = ['STATION', 'FORGE']) {
    const W = 64, Hh = 50, b = new Buf(W, Hh), base = Hh - 3, cx = 32;
    for (let y = 8; y < base; y++) { b.set(cx - 1, y, M.bark[1]); b.set(cx, y, M.bark[2]); b.set(cx + 1, y, M.bark[4]); }
    labels.forEach((t, k) => {
      const tw = PX.textWidth(t) + 8, dir = k % 2 ? -1 : 1, y0 = 8 + k * 13, x0 = dir > 0 ? cx - 4 : cx + 4 - tw;
      for (let j = 0; j < 10; j++) for (let i = 0; i < tw; i++) { const tip = dir > 0 ? i > tw - 5 && Math.abs(j - 4.5) > tw - i : i < 4 && Math.abs(j - 4.5) > i; if (!tip) b.set(x0 + i, y0 + j, j === 0 ? M.acorn[0] : j === 9 ? M.bark[4] : M.acorn[1]); }
      const [c2, g] = K.canvas(tw, 10); PX.text(g, t, 4, 2, '#4a332c'); const d = g.getImageData(0, 0, tw, 10).data;
      for (let j = 0; j < 10; j++) for (let i = 0; i < tw; i++) if (d[(j * tw + i) * 4 + 3]) b.set(x0 + i, y0 + j, '#4a332c');
    });
    rim(b, M.bark[5]);
    return { img: b.canvas(), ax: cx, ay: base, foot: 2, half: 2, name: 'signpost' };
  }

  /* ---------- bugs: the only animals ---------- */
  const BUG = {
    snail: [['....1111..', '...122221.', '..12333321', '..13344331', '..12344321', '5512233216', '6555555556', '.66666666.'], { 1: '#ffd9a0', 2: '#eeb06e', 3: '#cf8a4c', 4: '#a8643a', 5: '#c9d9b0', 6: '#9fb38a' }],
    ladybug: [['..k..', '.1k2.', '12k23', '1k3k3', '.333.'], { 1: '#ff9a8a', 2: '#f2665a', 3: '#d9483b', k: '#2a1b22' }],
    beetle: [['..kk...', '.1223..', '122334k', '12k334.', '.k.k.k.'], { 1: '#9fe0d0', 2: '#4fb3a0', 3: '#2b7a6c', 4: '#1f5552', k: '#2a1b22' }],
    aphid: [['.11.', '1221', '.33.'], { 1: '#d8f28a', 2: '#a8dc63', 3: '#57a148' }],
    cricket: [['k.....k', '.k...k.', '..122..', '.12233.', 'k.3.3.k'], { 1: '#b6e36b', 2: '#5aac4c', 3: '#3d8a4a', k: '#2c6448' }],
  };
  const bugImg = (kind, flip) => { const [rows, key] = BUG[kind]; let c = K.sprite(rows, key); return flip ? PX.flip(c) : c; };
  // A butterfly fluttering around (x, y): drawn into g at time t (day). colours [wing, spot].
  function butterfly(g, x, y, t, c = ['#ffe066', '#f5a623'], i = 0) {
    const a = (t / 6 + i * 0.37) * Math.PI * 2, px = Math.round(x + Math.cos(a) * 18 + Math.sin(a * 3) * 4), py = Math.round(y + Math.sin(a * 2) * 8), f = Math.floor(t * 10 + i) % 2;
    const R2 = (X, Y, w, h, col) => { g.fillStyle = col; g.fillRect(X, Y, w, h); };
    if (f) { R2(px - 3, py - 2, 3, 3, c[0]); R2(px + 1, py - 2, 3, 3, c[0]); R2(px - 2, py - 1, 1, 1, c[1]); R2(px + 2, py - 1, 1, 1, c[1]); }
    else { R2(px - 2, py - 3, 2, 4, c[0]); R2(px + 1, py - 3, 2, 4, c[0]); }
    R2(px, py - 2, 1, 4, '#3d2a2e');
  }
  // A firefly blinking around (x, y) at night.
  function firefly(g, x, y, t, i = 0) {
    const a = (t / 8 + i * 0.29) * Math.PI * 2, px = Math.round(x + Math.cos(a) * 12), py = Math.round(y + Math.sin(a * 2) * 6), on = (Math.floor(t * 4) + i * 5) % 9 < 5;
    if (!on) return;
    g.globalAlpha = 0.35; PX.ellipse(g, px, py, 3, 3, '#fff0a8'); g.globalAlpha = 1;
    g.fillStyle = '#fffbe6'; g.fillRect(px, py, 1, 1);
  }

  /* ---------- walnut-shell house ---------- */
  // A walnut half-shell standing on its rim like a dome, its wrinkled furrows running top to bottom, a door and round
  // windows cut into it, and a big leaf thrown over the crown as a roof. o: { x, y (base row), w, h, leaf, seed, name }.
  function walnutHouse(o) {
    const { w = 140, h = 104, seed = 1, leaf = 'leaf', name } = o, pad = 26;
    const W = w + pad * 2, H = h + pad + 14, cx = W >> 1, base = H - 8, rx = w / 2, ry = h;
    const b = new Buf(W, H), S = M.shell;
    for (let y = base - ry; y <= base; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - base) / ry, r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2), lon = Math.atan2(nx, nz);                 // longitude across the dome
      const furrow = Math.sin(lon * 11 + vnoise(lon * 3, ny * 4, seed) * 3.2 + ny * 2);
      const wrinkle = vnoise(lon * 9 + 40, ny * 9, seed + 7);
      let s = shadeOf(nx, ny * 0.7, nz) * 0.95 + (furrow > 0.55 ? 0.24 : furrow < -0.75 ? -0.1 : 0) + (wrinkle > 0.68 ? 0.16 : wrinkle < 0.22 ? -0.08 : 0);
      if (r2 > 0.93) s += 0.25;                                              // the rim darkens
      b.set(x, y, S[band(s, 0, 5)]);
    }
    // the cut rim along the ground
    for (let x = cx - rx; x <= cx + rx; x++) { b.set(x, base, S[5]); b.set(x, base - 1, S[4]); }
    rim(b, S[5]);
    const c = b.canvas(), x = c.getContext('2d');
    // door and windows cut into the shell
    const door = archDoor(x, cx - 8, base - 1, 20, 40, { frame: M.bark });
    const wins = [roundWindow(x, cx + 26, base - 46, 7), roundWindow(x, cx - 40, base - 40, 6)];
    // the leaf roof, laid over the crown and drooping to the left
    const lb = new Buf(W, H), ramp = leaf === 'autumn' ? M.autumn : ['leaf0', 'leaf1', 'leaf2', 'leaf3', 'leaf4', 'leaf6'].map(K.hex);
    const lrx = Math.round(rx * 0.95), lcy = base - ry + 4;
    leafShape(lb, cx + 2, lcy, lrx, Math.round(ry * 0.22), ramp, { tilt: 0.06, droop: ry * 0.36 });
    // the stalk, curling off the tip
    for (let k = 0; k < 10; k++) { lb.set(cx + 2 + lrx + k - 2, lcy + Math.round(lrx * 0.06 + ry * 0.36) - (k >> 1) - (k > 6 ? k - 6 : 0), M.bark[3]); }
    x.drawImage(lb.canvas(), 0, 0);
    const ox = o.x - cx, oy = o.y - base;
    return {
      img: c, ox, oy, y: o.y, foot: 18, base: [o.x - rx + 6, o.x + rx - 6], door: [o.x - 8, o.y + 4],
      wins: wins.map(g => ({ ...g, gx: g.gx + ox, gy: g.gy + oy })), shadow: [footShadow(o.x, o.y, rx + 6)], name,
    };
  }

  /* ---------- hollow-stump cottage ---------- */
  // A sawn tree stump hollowed into a home: a bark cylinder with roots spreading at its foot, the sawn top seen from
  // above with its rings, a mushroom-cap or moss roof on top. o: { x, y, w, h, roof: 'mushroom' | 'moss', name, seed }.
  function stumpHouse(o) {
    const { w = 112, h = 92, seed = 3, roof = 'mushroom', name } = o, pad = 34;
    const W = w + pad * 2, H = h + pad + 46, cx = W >> 1, base = H - 10, rx = w / 2, topY = base - h, ery = Math.round(rx * 0.32);
    const b = new Buf(W, H), B = M.bark;
    // the cylinder: shaded by its curvature, vertical bark ridges
    for (let y = topY; y <= base + ery; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      const nx = (x + 0.5 - cx) / rx; if (Math.abs(nx) > 1) continue;
      const bottom = base + ery * Math.sqrt(1 - nx * nx); if (y > bottom) continue;
      const nz = Math.sqrt(1 - nx * nx), ridge = vnoise(x * 0.45, y * 0.035, seed) + 0.35 * Math.sin(x * 0.9 + vnoise(x * 0.2, y * 0.05, seed + 1) * 4);
      const s = shadeOf(nx, 0.05, nz) * 0.9 + (ridge > 0.95 ? 0.2 : ridge < 0.2 ? -0.12 : 0);
      b.set(x, y, B[band(s, 0, 5)]);
    }
    // roots flaring out at the foot, in front of the trunk
    const rnd = rng(seed);
    for (const [fx, side] of [[-0.95, -1], [-0.45, -1], [0.55, 1], [0.92, 1]]) {
      const x0 = cx + fx * rx, y0 = base + ery * Math.sqrt(1 - fx * fx) - 2, len = 16 + rnd() * 12;
      for (let i = 0; i < len; i++) {
        const px = Math.round(x0 + side * i * 0.9), py = Math.round(y0 + i * 0.28), th = Math.max(2, Math.round(9 - i * 0.4));
        for (let j = 0; j < th; j++) b.set(px, py - j, B[j === 0 ? 5 : j === 1 ? 4 : j === th - 1 ? 1 : 2]);
      }
    }
    rim(b, B[5]);
    // the sawn top: an ellipse of rings
    for (let y = topY - ery; y <= topY + ery; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - topY) / ery, r = Math.sqrt(u * u + v * v); if (r > 1) continue;
      b.set(x, y, r > 0.9 ? B[1] : Math.floor(r * 7 + vnoise(u * 3, v * 3, seed) * 0.8) % 2 ? M.acorn[1] : M.acorn[0]);
    }
    const c = b.canvas(), x = c.getContext('2d');
    const door = archDoor(x, cx + 6, base + ery - 4, 22, 42, { frame: M.bark, ramp: [M.shell[1], M.shell[2], M.shell[3], M.shell[4]] });
    const wins = [roundWindow(x, cx - 28, topY + 36, 7, { rim: M.cap })];
    // the roof
    if (roof === 'mushroom') {
      const rb = new Buf(W, H), crx = rx + 16, cry = Math.round(h * 0.44), ccy = topY + 6;
      for (let y = ccy - cry; y <= ccy + 8; y++) for (let x2 = cx - crx; x2 <= cx + crx; x2++) {
        const nx = (x2 + 0.5 - cx) / crx, ny = (y + 0.5 - ccy) / cry; if (nx * nx + ny * ny > 1 && y < ccy) continue;
        if (y >= ccy && (Math.abs(nx) > 1 || y > ccy + 6 - Math.abs(nx) * 3)) continue;
        if (y >= ccy) { rb.set(x2, y, y > ccy + 2 ? '#e9d6c0' : '#d7bfa6'); continue; }      // the gills' rim underneath
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), s = shadeOf(nx, ny, nz);
        rb.set(x2, y, ['#ff8f7a', '#f2665a', '#d9483b', '#b5363a', '#8a2a34'][band(s, 0, 4)]);
      }
      // white spots, chunky
      for (const [sx, sy, sr] of [[-0.45, -0.45, 5], [0.1, -0.7, 4], [0.5, -0.35, 6], [-0.1, -0.2, 3], [0.75, -0.1, 3], [-0.7, -0.1, 3]]) {
        const px = Math.round(cx + sx * crx), py = Math.round(ccy + sy * cry);
        for (let j = -sr; j <= sr; j++) for (let i = -sr - 1; i <= sr + 1; i++) if ((i / (sr + 1)) ** 2 + (j / sr) ** 2 <= 1) rb.set(px + i, py + Math.round(j * 0.7), j < 0 && i < 0 ? '#ffffff' : '#f3ece6');
      }
      x.drawImage(rb.canvas(), 0, 0);
    }
    const ox = o.x - cx, oy = o.y - base;
    return {
      img: c, ox, oy, y: o.y, foot: 16, base: [o.x - rx + 4, o.x + rx - 4], door: [o.x + 6, o.y + ery + 4],
      wins: wins.map(g => ({ ...g, gx: g.gx + ox, gy: g.gy + oy })), shadow: [footShadow(o.x, o.y + ery, rx + 10)], name,
    };
  }

  window.ANT = { M, LIGHT, shadeOf, band, rim, masonry, planks, bricks, shingles, ironSheet, fill, inPoly, hipRoof, eaveShadow, archDoor, roundWindow, archWindow, clock, signBoard, doubleDoor, wallLamp, ivy, leafShape, boards, mossEdge, station, teaStall, forge, acornHouse, wagonHome, cooperShed, barrelAt, banyan, lantern, shopDoor, locomotive, wagon, waterTower, signal, mushroomLamp, ironLamp, bench, fence, clutter, anvil, scrap, signpost, BUG, bugImg, butterfly, firefly, walnutHouse, stumpHouse };
})();
