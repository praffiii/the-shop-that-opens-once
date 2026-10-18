'use strict';
/* Bellwood outdoors as small areas, each its own place with exits at its edges, as top-down RPGs build a town (one
   map per part of town, a short fade between them). AREAS[id] describes an area as shapes in art px; build(def)
   rasterises them onto the 16 px tile grid that VIL.ground paints, fills the rest with forest, places the area's
   things and returns it in the form export-world.js bakes:
   { id, w, h, bg, ground, clips, decals, items, anchors, paths, start, blocked(x, y), height(x, y), vertical(x, y) }.

   An area def: { w, h, seed, bg, start (the anchor the walk mask grows from),
     level(x, y): the ground level there (0 the lowest; each level a cliff FACE higher),
     water(x, y): '~' a river, '_' the sea, else nothing; sand(x, y), paving(x, y): true where those lie,
     roads: [[points, half width]] (a road over a river is a bridge), rails: [points] lines of track,
     clear: [[cx, cy, rx, ry]] open ground with no forest,
     gap: how far the forest keeps back from a road, species(x, y, r, pools): the forest's tree there, under(pools):
     what grows instead, smallest last, where that tree's crown would hide open ground,
     things(at): places sprites with at(name, sprite, x, y, item fields),
     jetty: [x, y, length] a walkable deck out over the sea, fields: [x, y] chamomile rows behind a fence,
     after(S, things), dress(S, G): adds to it and paints and scatters what lies on its ground, anchors: { name: [x, y] },
     glow: [[cx, cy, rx, ry]] where fireflies fly at night, dragonflies: [[x, y]] where they hover by day }. */
(() => {
  const V = VIL, T = V.T;

  /* ---------- rasterising onto tiles ---------- */
  const near = (pts, hw, x, y) => KIT.lineDist(x, y, pts)[0] <= hw;
  const inEll = ([cx, cy, rx, ry], x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  function layout(def, lanes, clearings) {
    const TW = def.w / T, TH = def.h / T, roads = [...def.roads, ...lanes], clear = [...(def.clear || []), ...clearings], rails = def.rails || [];
    const mat = Array.from({ length: TH }, () => new Array(TW).fill('g')), lev = Array.from({ length: TH }, () => new Array(TW).fill(0));
    const each = f => { for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) f(tx, ty, tx * T + T / 2, ty * T + T / 2); };
    each((tx, ty, x, y) => {
      lev[ty][tx] = def.level(x, y);
      const w = def.water && def.water(x, y);
      if (w) mat[ty][tx] = w;
      else if (def.sand && def.sand(x, y)) mat[ty][tx] = 's';
    });
    // Forest wherever nothing else is: away from the clearings, the roads and the track.
    each((tx, ty, x, y) => {
      if (mat[ty][tx] !== 'g' || clear.some(c => inEll(c, x, y)) || roads.some(([pts, hw]) => near(pts, hw + def.gap, x, y)) || rails.some(pts => near(pts, 20 + def.gap, x, y))) return;
      mat[ty][tx] = 'f';
    });
    for (const [pts, hw] of roads) each((tx, ty, x, y) => { if (near(pts, hw, x, y) && mat[ty][tx] !== '_') mat[ty][tx] = mat[ty][tx] === '~' ? '=' : 'd'; });
    if (def.paving) each((tx, ty, x, y) => { if (def.paving(x, y)) mat[ty][tx] = 'p'; });
    // Stairs: where a road drops off a level, a flight of steps cut into the face, one tile wider than the road on
    // each side and spanning every row the drop takes across it.
    const drops = [];
    each((tx, ty) => { if (ty > 0 && ty + 1 < TH && mat[ty][tx] === 'd' && lev[ty][tx] < lev[ty - 1][tx]) drops.push([tx, ty]); });
    const groups = [];
    for (const d of drops) { const g = groups.find(g => g.some(([x, y]) => Math.abs(x - d[0]) <= 2 && Math.abs(y - d[1]) <= 2)); g ? g.push(d) : groups.push([d]); }
    for (const g of groups) {
      const x0 = Math.min(...g.map(d => d[0])) - 1, x1 = Math.max(...g.map(d => d[0])) + 1, y0 = Math.min(...g.map(d => d[1])), y1 = Math.max(...g.map(d => d[1])) + 1;
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) mat[ty][tx] = 'h';
    }
    return { rows: mat.map(r => r.join('')), lev, TW, TH };
  }

  /* ---------- the forest ---------- */
  const pool = (n, make) => Array.from({ length: n }, (_, k) => make(k + 1));
  let POOLS;
  const pools = () => POOLS || (POOLS = {
    pine: pool(5, k => V.pine({ h: 64 + k * 9, seed: k, leaf: 'teal' })),
    pineDeep: pool(4, k => V.pine({ h: 70 + k * 8, seed: k + 10, leaf: 'deep' })),
    oak: pool(5, k => V.tree({ r: 20 + k * 3, seed: k + 20, leaf: 'green' })),
    oakDeep: pool(4, k => V.tree({ r: 22 + k * 3, seed: k + 30, leaf: 'deep' })),
    autumn: pool(2, k => V.tree({ r: 22 + k * 3, seed: k + 40, leaf: 'autumn' })),
    bush: pool(4, k => V.bush({ r: 8 + k, seed: k + 50 })),
    grand: pool(4, k => V.grandTree({ r: 44 + k * 5, seed: k + 60, leaf: k % 2 ? 'teal' : 'deep' })),
    bushDeep: pool(4, k => V.bush({ r: 9 + k, seed: k + 70, leaf: 'deep' })),
  });
  /* Trees fill the forest, as decals: the ground under each crown is solid, so the player walks up to the forest and
     in front of its trees, never behind them. A crown that would hang over open ground (a path, a clearing) gives way
     to a bush, so what is open stays in sight. Every tree sways a little in the wind. */
  function forest(S, G, species, under = P => P.bush) {
    const W = S.w, H = S.h, alpha = new Map(), A = s => alpha.get(s) || alpha.set(s, s.img.getContext('2d').getImageData(0, 0, s.img.width, s.img.height).data).get(s);
    const crown = (s, x, y, f) => {
      const a = A(s), w = s.img.width, bx = x - s.ax + 1, by = y - s.ay + 1;
      for (let j = Math.max(0, -by); by + j < y; j++) for (let i = 0; i < w; i++) if (a[(j * w + i) * 4 + 3] && bx + i >= 0 && bx + i < W && f(bx + i, by + j)) return true;
      return false;
    };
    const onPath = (x, y) => !G.forest(x, y);
    const pts = KIT.scatter(11, 22, [0, 0, W, H], (x, y) => G.forest(x, y) && G.forest(x, y - 8) && !G.blocked(x, y), 2.2);
    const trees = pts.map(([x, y, r]) => {
      const s = [species(x, y, r, pools()), ...under(pools())].find(s => !crown(s, x, y, onPath));
      return s && { x, y, s };
    }).filter(Boolean).sort((a, b) => a.y - b.y);
    const clipOf = new Map();
    for (const { x, y, s } of trees) {
      if (s.shadow) S.shadows.push([x + 2, y - 1, s.shadow[0], s.shadow[1]]);
      if (!clipOf.has(s)) { const k = 'tree_' + clipOf.size; clipOf.set(s, k); S.clips[k] = { w: s.img.width, h: s.img.height, sway: s.img.height > 70 ? 2 : 1, draw: gg => gg.drawImage(s.img, 0, 0) }; }
      S.decals.below.push([clipOf.get(s), x - s.ax + 1, y - s.ay + 1, 0]);
      crown(s, x, y, (cx, cy) => { if (cy < H) S.canopy[cy * W + cx] = 1; });
    }
  }

  /* ---------- open ground: tufts, flowers, bushes along the forest's edge ---------- */
  function dress(S, G, rails = []) {
    const W = S.w, H = S.h, b = G.buf, P = pools();
    const open = (x, y) => G.mat(x, y) === 'g' && !G.forest(x, y) && !G.blocked(x, y) && !rails.some(pts => near(pts, 18, x, y));
    KIT.scatter(21, 30, [0, 0, W, H], (x, y) => open(x, y) && open(x + 6, y + 4), 1.6).forEach(([x, y]) => V.tuft(b, x, y, 21));
    KIT.scatter(22, 90, [0, 0, W, H], (x, y) => open(x - 10, y - 6) && open(x + 10, y + 6), 1.2).forEach(([x, y], k) => V.flowers(b, x, y, k + 1, 6 + (k % 5), 18));
    const edge = (x, y) => open(x, y) && open(x, y + 6) && !open(x, y - 26) && G.forest(x, y - 26);
    KIT.scatter(23, 34, [0, 0, W, H], edge, 2).forEach(([x, y, r]) => {
      const s = P.bush[(r * 97 | 0) % P.bush.length], bx = x - s.ax + 1, by = y - s.ay + 1;
      S.items.push({ name: 'bush', y, box: [bx, by, s.img.width, s.img.height], foot: 3, sway: 1, draw: g => g.drawImage(s.img, bx, by) });
      S.shadows.push([x + 2, y - 1, s.shadow[0], s.shadow[1]]);
    });
  }

  /* ---------- bugs: butterflies by day, fireflies at night ---------- */
  // Each flies a small loop that repeats every 6 s, its position stepped at 7.5 fps so the loop bakes to few frames.
  function bugs(S, G, glow, dragonflies = []) {
    const open = (x, y) => G.mat(x, y) === 'g' && !G.forest(x, y) && !G.blocked(x, y);
    const fly = (name, s, x, y, rx, ry, ph, o) => {
      const box = [x - rx - s.ax - 1, y - ry - s.ay - 1, 2 * rx + s.img.width + 2, 2 * ry + s.img.height + 2];
      S.items.push({ name, y: y + 24, box, animated: true, walk: true, ...o, draw: (g, t) => {
        const q = Math.floor(t * 7.5) / 7.5, a = ((q % 6) / 6) * 2 * Math.PI + ph;
        const fx = Math.round(x + rx * Math.sin(a) + (rx / 3) * Math.sin(3 * a)), fy = Math.round(y + ry * Math.sin(2 * a + ph));
        g.drawImage(s.frames[Math.floor(q * s.fps) % s.frames.length], fx - s.ax, fy - s.ay);
      } });
    };
    const B = [1, 2, 3, 4, 5].map(k => V.butterfly(k)), D = V.dragonfly(), F = V.firefly();
    KIT.scatter(31, 160, [0, 0, S.w, S.h], (x, y) => open(x, y) && open(x, y + 30), 1).slice(0, 6).forEach(([x, y, r], i) => fly('butterfly_' + i, B[i % 5], x, y, 18, 8, r * 6, { day: true }));
    dragonflies.forEach(([x, y], i) => fly('dragonfly_' + i, D, x, y, 26, 10, i, { day: true }));
    glow.forEach(([cx, cy, rx, ry], k) => KIT.scatter(40 + k, 30, [cx - rx, cy - ry, 2 * rx, 2 * ry], (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1, 1).slice(0, 14)
      .forEach(([x, y, r], i) => fly(`firefly_${k}_${i}`, F, x, y - 14, 10, 6, r * 6, { light: true })));
  }

  /* ---------- water: bridges, glints, waves ---------- */
  // Each run of bridge tiles gets a plank deck on the ground and a rail along each side; the deck is walkable.
  function bridges(S, rows, TW, TH) {
    const seen = new Set();
    for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
      if (rows[ty][tx] !== '=' || seen.has(ty * TW + tx)) continue;
      let x1 = tx, y1 = ty;
      while (x1 + 1 < TW && rows[ty][x1 + 1] === '=') x1++;
      while (y1 + 1 < TH && rows[y1 + 1][tx] === '=') y1++;
      for (let j = ty; j <= y1; j++) for (let i = tx; i <= x1; i++) seen.add(j * TW + i);
      const X0 = tx * T - 10, X1 = (x1 + 1) * T + 10, Y0 = ty * T + 2, Y1 = (y1 + 1) * T - 2, b = V.bridge(X0, X1, Y0, Y1);
      S.ground.getContext('2d').drawImage(b.deck, X0, Y0);
      S.items.push({ name: 'bridge_rail', y: Y0, box: [X0 + 1, Y0 - 9, b.rail.width, b.rail.height], walk: true, draw: g => g.drawImage(b.rail, X0 + 1, Y0 - 9) });
      S.items.push({ name: 'bridge_rail', y: Y1 + 1, box: [X0 + 1, Y1 - 8, b.rail.width, b.rail.height], walk: true, draw: g => g.drawImage(b.rail, X0 + 1, Y1 - 8) });
      S.decks.push([X0, Y0 + 3, X1, Y1 - 3]);
    }
  }
  /* Glints wink on open water; waves roll up the beach where sand meets the sea. Both are small loops placed many
     times, staggered. */
  const glint = { w: 7, h: 3, animated: true, draw: (g, t) => {
    const k = Math.floor(t * 6) % 18; if (k > 3) return;
    g.fillStyle = k === 1 || k === 2 ? '#ffffff' : V.C.w1; g.fillRect(k === 1 || k === 2 ? 0 : 2, 1, k === 1 || k === 2 ? 7 : 3, 1);
    if (k === 2) g.fillRect(3, 0, 1, 3);
  } };
  const wave = { w: 22, h: 6, animated: true, draw: (g, t) => {
    const k = Math.floor(t * 4) % 16, up = k < 8 ? k >> 1 : (15 - k) >> 1;
    g.fillStyle = '#ffffff'; g.fillRect(3, 4 - up, 16, 1); g.fillRect(1, 5 - up, 3, 1); g.fillRect(18, 5 - up, 3, 1);
    g.fillStyle = V.C.w1; g.fillRect(4, 5 - up, 14, 1);
  } };
  function waterLife(S, G) {
    const W = S.w, H = S.h, wet = (x, y) => G.mat(x, y) === 'w', put = (k, clip, x, y, o) => { S.clips[k] = clip; S.decals.below.push([k, x, y, o]); };
    KIT.scatter(17, 46, [0, 0, W, H], (x, y) => wet(x, y) && wet(x + 7, y) && wet(x, y - 3), 1.5).forEach(([x, y, r]) => put('glint', glint, x, y, (r * 720) | 0));
    for (let x = 6; x < W - 24; x += 22) for (let y = 1; y < H - 8; y++)
      if (G.mat(x + 11, y - 1) === 's' && wet(x + 11, y) && wet(x + 11, y + 4)) { put('wave', wave, x, y + 1, ((x * 37) % 64) * 6); break; }
  }

  /* ---------- the railway, painted on the ground: a gravel bed, sleepers, two rails with a lit top ---------- */
  function railway(b, rails) {
    const U = c => KIT.u32(V.col(c)), BED = ['#b7aa98', '#9d907e', '#7d7262'].map(U), WOOD = ['wood2', 'wood3', 'wood4'].map(U), IRON = ['#e8edf2', '#8d97a3', '#4b5260'].map(U);
    const along = (step, f) => {                // f(x, y, nx, ny, s) every `step` px along each line; (nx, ny) is its normal
      for (const pts of rails) for (let i = 1, s = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L, ny = (bx - ax) / L;
        for (let d = 0; d < L; d += step, s += step) f(ax + ((bx - ax) * d) / L, ay + ((by - ay) * d) / L, nx, ny, s);
      }
    };
    const R = Math.round;
    along(1, (x, y) => V.disc(b, x, y, 15, 12, BED[1]));
    along(1, (x, y) => { for (const [dx, dy] of [[-15, 0], [15, 0], [0, 12]]) if (b.get(R(x + dx), R(y + dy)) === BED[1]) b.set(R(x + dx), R(y + dy), BED[2]); });
    along(3, (x, y, nx, ny, s) => { if (KIT.hash(s, R(y), 5) < 0.3) { const t = ((s * 7) % 22) - 11; b.set(R(x + nx * t), R(y + ny * t), KIT.hash(s, 1, 6) < 0.5 ? BED[0] : BED[2]); } });
    // Sleepers: 4 px planks across the line, lit on the side toward the light.
    along(9, (x, y, nx, ny) => {
      const flat = Math.abs(ny) > 0.7;
      for (let t = -11; t <= 11; t++) for (let w = 0; w < 4; w++) b.set(R(x + nx * t) + (flat ? w : 0), R(y + ny * t) + (flat ? 0 : w), w === 0 ? WOOD[0] : w === 3 ? WOOD[2] : WOOD[1]);
    });
    along(0.5, (x, y, nx, ny) => { for (const t of [-6, 6]) { const X = R(x + nx * t), Y = R(y + ny * t); b.set(X, Y - 1, IRON[0]); b.set(X, Y, IRON[1]); b.set(X, Y + 1, IRON[2]); } });
  }

  /* ---------- the jetty: a deck over the sea (walkable), its posts and lantern standing on it ---------- */
  function jetty(S, [x, y, len]) {
    const j = V.jetty(len), X0 = x - j.dx, Y0 = y - j.dy;
    S.ground.getContext('2d').drawImage(j.deck, X0, Y0);
    S.decks.push([X0 + 4, Y0 - 12, X0 + j.deck.width - 4, y - 2]);
    j.parts.forEach((q, i) => { const ox = x + q.x - q.ax, oy = y + q.y - q.ay; S.items.push({ name: 'jetty_' + i, y: y + q.y, box: [ox, oy, q.img.width, q.img.height], walk: true, draw: g => g.drawImage(q.img, ox, oy) }); });
  }

  /* ---------- fields: chamomile in rows behind a picket fence, painted on the ground ---------- */
  function fields(S, [x, y]) {
    const g = S.ground.getContext('2d');
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) g.drawImage(V.chamomile(112, 48, r * 2 + c + 1).img, x + c * 124, y + r * 58);
    for (let k = 0, f = V.fieldFence(10); k < 5; k++) { const ox = x - 4 + k * f.step - f.ax, oy = y + 180 - f.ay; S.items.push({ name: 'field_fence_' + k, y: y + 180, box: [ox, oy, f.img.width, f.img.height], foot: 3, draw: gg => gg.drawImage(f.img, ox, oy) }); }
  }

  /* A sprite stands with its feet at (x, y). A building blocks its base, glows at night (its window glass as light
     items), smokes from its chimneys and casts a hard shadow to the lower right; a door is an anchor in front of it. */
  function place(S, { name, s, x, y, o }) {
    const ox = Math.round(x - s.ax), oy = Math.round(y - s.ay), fr = s.frames, fps = s.fps || 4;
    const it = { name, y, box: [ox, oy, s.img.width, s.img.height], foot: s.foot ?? 3, ...o };
    if (s.base) it.base = [x + s.base[0], x + s.base[1]];
    if (fr) { it.animated = true; it.draw = (g, t) => g.drawImage(fr[Math.floor(t * fps) % fr.length], ox, oy); } else it.draw = g => g.drawImage(s.img, ox, oy);
    S.items.push(it);
    (s.lit || []).forEach(([gx, gy, gw, gh], i) => {
      const c = KIT.litSprite(s.img, 0, 0, { gx, gy, gw, gh });
      S.items.push({ name: `${name}_lit_${i}`, y, box: [ox + gx, oy + gy, gw, gh], light: true, draw: g => g.drawImage(c, ox + gx, oy + gy) });
    });
    (s.smoke || []).forEach(([sx, sy], i) => S.items.push({ name: `${name}_smoke_${i}`, y, box: [ox + sx - 14, oy + sy - 46, 30, 48], animated: true, walk: true, draw: (g, t) => KIT.smoke(g, t, [[ox + sx, oy + sy]]) }));
    if (s.shadow) S.shadows.push([Math.round(x) + 2, Math.round(y) - 1, s.shadow[0], s.shadow[1]]);
    else if (s.base && s.foot > 20) S.shadows.push(['r', Math.round(x + s.base[1]) + 1, Math.round(y - s.foot), 6, s.foot + 3], ['r', Math.round(x + s.base[0]) + 6, Math.round(y), s.base[1] - s.base[0], 3]);
    if (s.door !== undefined) S.anchors[name + '_door'] = [Math.round(x + s.door), Math.round(y) + 8];
  }

  function build(id) {
    const def = AREAS[id], P = [], lanes = [], clearings = [];
    // Things are listed first: a building clears the forest around itself (unless clear is false), and its lane runs
    // from its door to a road.
    const at = (name, s, x, y, o = {}) => {
      const { lane, clear = true, ...rest } = o;
      P.push({ name, s, x, y, o: rest });
      if (s.base && clear) clearings.push([x, y - s.ay / 2, s.img.width / 2 + 36, s.ay / 2 + 36]);
      if (lane) lanes.push([[[x + (s.door || 0), y + 4], ...lane], 10]);
    };
    def.things(at);
    const { rows, lev, TW, TH } = layout(def, lanes, clearings);
    const G = V.ground(rows, { seed: def.seed, level: (tx, ty) => lev[Math.min(TH - 1, Math.max(0, ty))][Math.min(TW - 1, Math.max(0, tx))] });
    const S = { id, w: def.w, h: def.h, bg: def.bg, start: def.start, clips: {}, decals: { below: [] }, items: [], shadows: [], anchors: { ...def.anchors }, paths: {}, decks: [] };
    const onDeck = (x, y) => S.decks.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1);
    S.canopy = new Uint8Array(def.w * def.h);
    S.height = G.height; S.vertical = G.vertical;
    S.blocked = (x, y) => !onDeck(x, y) && (G.blocked(x, y) || G.forest(x, y) || S.canopy[(y | 0) * def.w + (x | 0)] === 1);
    railway(G.buf, def.rails || []);
    dress(S, G, def.rails);
    if (def.dress) def.dress(S, G);
    S.ground = G.buf.canvas();
    bridges(S, rows, TW, TH);
    waterLife(S, G);
    if (def.jetty) jetty(S, def.jetty);
    if (def.fields) fields(S, def.fields);
    P.forEach(t => place(S, t));
    if (def.after) def.after(S, P);
    bugs(S, G, def.glow || [], def.dragonflies);
    forest(S, G, def.species, def.under);
    V.shadows(S.ground, S.shadows);
    return S;
  }

  /* ---------- the areas ---------- */
  const smooth = (pts, n = 3) => n ? smooth([pts[0], ...pts.slice(1).flatMap((b, i) => { const a = pts[i]; return [[a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]]; }).slice(1, -1), pts[pts.length - 1]], n - 1) : pts;

  /* The banyan grove, west of the station: a narrow path winds in from the station's side between ancient trees,
     climbs root-steps onto the knoll and ends at the great banyan, Marlow's door in the gap between its roots. */
  const GROVE_PATH = smooth([[660, 498], [590, 508], [526, 486], [462, 500], [414, 466], [404, 420], [446, 380], [500, 352], [502, 312], [470, 282], [400, 270], [330, 266], [301, 254]]);
  const KNOLL = [300, 196, 196, 86];

  // How the town's trees mix, as [chance below, pool]: the old West dark pines, the Centre round broadleaves, the
  // East light and mixed, the coast wind-bent pines.
  const mix = table => (x, y, r, P) => { const a = table(P).find(([p]) => r < p)[1]; return a[(r * 997 | 0) % a.length]; };
  const wavy = (y0, a, f) => x => y0 + a * Math.sin(x / f);

  // The station: the line comes out of the ridge's tunnel and curves down past the platform; a siding runs to the yard.
  const RIDGE = wavy(136, 10, 53);
  const STATION_RAILS = [[[80, 190], [86, 260], [140, 350], [250, 408], [400, 418], [940, 418]], [[420, 418], [500, 428], [560, 466], [620, 476], [940, 476]]].map(p => smooth(p, 4));
  const PLATFORM = [300, 326, 780, 390];
  // The square: the hall and its neighbours up on a terrace, the round paved square below it.
  const TERRACE = wavy(270, 6, 40), PLAZA = [480, 440, 160];
  // The east: the river down its west side, Leo's hill in the north-east corner.
  const RIVER = smooth([[150, -20], [182, 200], [160, 400], [190, 620], [170, 852]]);
  const HILL = wavy(300, 8, 37);
  // The coast: a terrace along the north, then grass, the beach and the sea; the land runs out to a point in the east.
  const BLUFF = wavy(230, 7, 45), SHORE = x => 610 + 20 * Math.sin(x / 70) + Math.max(0, x - 800) * 0.8;

  const AREAS = {
    grove: {
      w: 640, h: 608, seed: 41, bg: '#1f4a2c', start: 'from_station',
      level: (x, y) => inEll(KNOLL, x, y) ? 1 : 0,
      roads: [[GROVE_PATH, 9]], gap: 10,
      clear: [[300, 240, 150, 54]],
      species: (x, y, r, P) => { const pick = a => a[(r * 997 | 0) % a.length]; return pick(r < 0.5 ? P.grand : r < 0.8 ? P.pineDeep : P.oakDeep); },
      under: P => [...P.oakDeep, ...P.bushDeep],
      things(at) {
        at('banyan', V.hiddenBanyan(), 300, 236, { clear: false });
        // ancient trees along the way, just behind the path so their roots reach it, never in front of it: in the
        // 3D view a crown between the camera and the path would hide it
        [[600, 470, 56, 1, 'deep'], [250, 548, 58, 2, 'teal'], [150, 432, 50, 3, 'deep'], [604, 340, 54, 4, 'teal'], [118, 300, 60, 5, 'deep'], [378, 412, 46, 6, 'deep'], [60, 590, 58, 7, 'teal'], [566, 196, 52, 8, 'deep']]
          .forEach(([x, y, r, seed, leaf], i) => at('ancient_' + i, V.grandTree({ r, seed, leaf }), x, y, { sway: 1, clear: false }));
        // undergrowth beside the path: ferns, logs, mossy rocks
        [[548, 528], [492, 470], [436, 506], [386, 452], [470, 404], [530, 380], [476, 330], [434, 296], [362, 290], [250, 280], [612, 488], [440, 448]]
          .forEach(([x, y], i) => at('fern_' + i, V.fern(i + 1), x, y, { walk: true, sway: 1 }));
        at('log_0', V.log(62, 1), 430, 548); at('log_1', V.log(48, 2), 560, 404);
        [[372, 492], [524, 446], [410, 330], [236, 292], [586, 540]].forEach(([x, y], i) => at('moss_rock_' + i, V.mossRock(i + 1), x, y));
      },
      // the banyan's lanterns, dark by day and lit at dusk and night
      after(S, P) {
        const bn = P.find(t => t.name === 'banyan'), bx = bn.x - bn.s.ax, by = bn.y - bn.s.ay;
        [false, true].forEach(on => { const l = V.lantern(on); bn.s.lanterns.forEach(([hx, hy], i) => { const ox = bx + hx - l.ax, oy = by + hy - l.ay; S.items.push({ name: `shop_lantern_${i}${on ? '' : '_day'}`, y: bn.y + 1, box: [ox, oy, l.img.width, l.img.height], walk: true, ...(on ? { light: true } : { day: true }), draw: g => g.drawImage(l.img, ox, oy) }); }); });
      },
      // moss in the shade and leaves fallen on the path
      dress(S, G) {
        const b = G.buf, U = c => KIT.u32(V.col(c)), MO = V.LEAF.deep.map(U), LEAVES = ['#c98d5b', '#a26744', '#d29a60'].map(U);
        KIT.scatter(61, 26, [0, 0, S.w, S.h], (x, y) => G.mat(x, y) === 'g' && !G.vertical(x, y), 1.4).forEach(([x, y, r]) => {
          const rx = 6 + ((r * 9) | 0), ry = 3 + ((r * 4) | 0);
          for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
            if ((i / rx) ** 2 + (j / ry) ** 2 > 1 - KIT.hash(x + i, y + j, 3) * 0.3 || G.mat(x + i, y + j) !== 'g') continue;
            b.set(x + i, y + j, KIT.hash(x + i, y + j, 4) < 0.12 ? MO[1] : j < -ry / 2 ? MO[2] : MO[3]);
          }
        });
        for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) if (G.mat(x, y) === 'd' && KIT.hash(x, y, 9) < 0.025) b.set(x, y, LEAVES[(KIT.hash(x, y, 10) * 3) | 0]);
      },
      anchors: { from_station: [612, 500], from_shop: [301, 256] },
      glow: [[300, 290, 200, 60], [500, 440, 110, 90]],
    },

    /* The old station: Helen and the mender live either side of it, a train waits at the platform, the forge and Bram's
       carriage stand in the yard by the road. West to the grove, east to the square. */
    station: {
      w: 960, h: 768, seed: 7, bg: '#2f6a37', start: 'start',
      level: (x, y) => y < RIDGE(x) ? 1 : 0,
      roads: [[[[-20, 690], [300, 684], [600, 694], [980, 686]], 22], [[[800, 360], [812, 450], [818, 690]], 16]],
      rails: STATION_RAILS, gap: 40,
      paving: (x, y) => x >= PLATFORM[0] && x < PLATFORM[2] && y >= PLATFORM[1] && y < PLATFORM[3],
      clear: [[540, 360, 330, 90], [600, 560, 380, 120]],
      species: mix(P => [[0.45, P.pine], [0.75, P.pineDeep], [1, P.oakDeep]]),
      things(at) {
        at('station', V.station(), 530, 326);
        at('tea_stall', V.teaStall(), 400, 372);
        at('info_board', V.noticeBoard(), 740, 368);
        at('helen_house', V.helenHouse(), 330, 300, { lane: [[330, 340]] });
        at('mender_house', V.menderHouse(), 730, 300, { lane: [[704, 340]] });
        at('tunnel', V.tunnelPortal(), 80, 186, { walk: true });
        at('locomotive', V.locomotive(), 640, 424); at('wagon_0', V.wagon(1), 532, 424); at('wagon_1', V.wagon(2), 890, 482);
        at('water_tower', V.waterTower(), 900, 404);
        at('forge', V.forge(), 600, 630, { lane: [[584, 690]] });
        at('bram_home', V.bramHome(), 330, 626, { lane: [[361, 690]] });
        at('gate', V.gateArch('BELLWOOD'), 816, 600, { walk: true });
        [[150, 560], [700, 560]].forEach(([x, y], i) => at('boulder_' + i, V.boulder(i + 1), x, y));
      },
      anchors: { start: [530, 360], from_grove: [40, 690], from_square: [920, 686] },
      glow: [[200, 560, 140, 70]],
    },

    /* The square: the hall, the bakery and a home up on the terrace, the fountain in the paved round below with
       stalls, benches and lamps round it, the post office and homes on its sides. West to the station, east to the
       east, south down to the coast. */
    square: {
      w: 960, h: 800, seed: 12, bg: '#2f7a3a', start: 'from_station',
      level: (x, y) => y < TERRACE(x) ? 1 : 0,
      roads: [[[[-20, 470], [980, 470]], 22], [[[480, 600], [480, 820]], 20], [[[208, 740], [760, 740]], 12]],
      gap: 40,
      paving: (x, y) => Math.hypot(x - PLAZA[0], y - PLAZA[1]) <= PLAZA[2],
      clear: [[480, 450, 360, 220], [480, 690, 380, 110]],
      species: mix(P => [[0.6, P.oak], [0.77, P.oakDeep], [0.98, P.pine], [1, P.autumn]]),
      things(at) {
        at('hall', V.hall(), 480, 226, { lane: [[480, 300]] });
        at('bakery', V.bakery(), 190, 236, { lane: [[236, 320], [330, 380]] });
        at('home_brick', V.centreHome('brick'), 780, 236, { lane: [[770, 320], [640, 380]] });
        at('fountain', V.fountain(), 480, 450);
        [['veg', 360, 380], ['fruit', 600, 380], ['flowers', 360, 560], ['bread', 600, 560]].forEach(([k, x, y]) => at('stall_' + k, V.stall(k), x, y));
        at('bench_w', V.bench(), 420, 512); at('bench_e', V.bench(), 540, 512);
        [[330, 320], [630, 320], [320, 590], [640, 590]].forEach(([x, y], i) => at('lamp_' + i, V.lamp(), x, y));
        at('notice_square', V.noticeBoard(), 690, 420);
        at('post_office', V.postOffice(true), 150, 420);
        at('home_mia', V.centreHome('mia'), 820, 420);
        at('home_weaver', V.centreHome('plaster'), 220, 700);
        at('home_sam', V.centreHome('sam'), 760, 700);
        at('bus_stop', V.busStop(), 880, 444);
        [[90, 570], [870, 570], [330, 650], [640, 650]].forEach(([x, y], i) => at('blossom_' + i, V.blossom(i + 1), x, y, { sway: 2 }));
      },
      anchors: { from_station: [40, 470], from_east: [920, 470], from_coast: [480, 756] },
      glow: [[480, 680, 200, 60]],
    },

    /* The east: a bridge over the river, stilt houses along the road, chamomile fields, the playground, the gardener
       and the aphid pen, Satria below Leo's hill and Leo's lookout on top. West to the square. */
    east: {
      w: 1024, h: 832, seed: 23, bg: '#2f7a3a', start: 'from_square',
      level: (x, y) => x > 640 && y < HILL(x) ? 1 : 0,
      water: (x, y) => near(RIVER, 34, x, y) ? '~' : null,
      roads: [[[[-20, 470], [260, 470], [600, 486], [1044, 480]], 20], [[[640, 480], [640, 740]], 12], [[[220, 740], [960, 740]], 12]],
      gap: 40,
      clear: [[600, 480, 440, 120], [380, 190, 170, 110], [580, 690, 420, 100]],
      species: mix(P => [[0.58, P.oak], [0.61, P.autumn], [1, P.pine]]),
      fields: [260, 100],
      things(at) {
        at('stilt_nora', V.stiltHouse('nora'), 330, 430);
        at('stilt_a', V.stiltHouse('a'), 520, 430);
        at('satria_home', V.satriaHome(), 900, 420);
        at('leo_hut', V.leoHut(), 840, 200, { lane: [[824, 250], [790, 270], [790, 360], [740, 480]] });
        at('stilt_b', V.stiltHouse('b'), 300, 690, { lane: [[300, 740]] });
        at('home_seeds', V.centreHome('corner'), 480, 690, { lane: [[538, 740]] });
        at('playground', V.playground(), 730, 600); at('swing', V.swing(), 800, 598);
        at('aphid_pen', V.aphidPen(), 760, 700);
        at('gardener_home', V.gardenerHome(), 900, 690, { lane: [[927, 740]] });
        [[700, 400], [730, 420], [990, 640]].forEach(([x, y], i) => at('birch_' + i, V.birch(i + 1), x, y, { sway: 2 }));
        [[620, 400, 'apple'], [980, 560, 'orange']].forEach(([x, y, f], i) => at('fruit_tree_' + i, V.fruitTree(i + 1, f), x, y, { sway: 1 }));
        at('willow_0', V.willow(1), 236, 570, { sway: 2 });
      },
      anchors: { from_square: [40, 470] },
      glow: [[380, 190, 150, 90], [176, 620, 60, 120]],
      dragonflies: [[176, 300], [196, 640]],
    },

    /* The coast: Theo's studio up on the bluff with the rope bridge's remains, stairs down to the beach, the salt
       store and Arlo's home, the jetty and the boats, the lighthouse out on the point. North up to the square. */
    coast: {
      w: 960, h: 800, seed: 31, bg: '#3f86b4', start: 'from_square',
      level: (x, y) => y < BLUFF(x) ? 1 : 0,
      water: (x, y) => y > SHORE(x) ? '_' : null,
      sand: (x, y) => y > SHORE(x) - 190 + 14 * Math.sin(x / 33),
      roads: [[[[480, -20], [480, 180], [470, 300], [470, 430]], 20]],
      gap: 40,
      clear: [[480, 330, 480, 80]],
      species: mix(P => [[0.7, P.pine], [1, P.oak]]),
      jetty: [500, 760, 150],
      things(at) {
        at('theo_studio', V.theoStudio(), 250, 200, { lane: [[360, 196], [480, 190]] });
        at('rope_bridge', V.ropeBridgeRemains(), 80, 214);
        at('salt_store', V.saltStore(), 220, 430);
        at('arlo_home', V.arloHome(), 740, 430);
        at('lighthouse', { ...V.lighthouse(), door: undefined }, 900, 650);   // seen, not entered
        const B = V.beachProps;
        at('fish_rack', B.fishRack(), 680, 520); at('nets', B.nets(), 650, 560, { walk: true }); at('driftwood', B.driftwood(), 300, 590, { walk: true });
        [[180, 560, 'scallop'], [350, 600, 'spiral'], [620, 592, 'clam'], [780, 600, 'scallop'], [110, 600, 'clam']].forEach(([x, y, k], i) => at('shell_' + i, B.shell(k), x, y, { walk: true }));
        [[140, 740], [760, 772], [300, 790]].forEach(([x, y], i) => at('sea_rock_' + i, V.rockStack(i + 1), x, y, { walk: true }));
        at('boat_0', V.boat(1), 590, 740, { walk: true }); at('boat_1', V.boat(2), 380, 770, { walk: true }); at('rowboat', V.rowboat(), 430, 680, { walk: true });
      },
      anchors: { from_square: [480, 44] },
      glow: [[250, 300, 160, 50]],
    },
  };

  window.AREA = { build, ids: Object.keys(AREAS) };
})();
