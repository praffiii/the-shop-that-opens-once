'use strict';
/* Bellwood outdoors as small areas, each its own place with exits at its edges, as top-down RPGs build a town (one
   map per part of town, a short fade between them). AREAS[id] describes an area as shapes in art px; build(def)
   rasterises them onto the 16 px tile grid that VIL.ground paints, fills the rest with forest, places the area's
   things and returns it in the form export-world.js bakes:
   { id, w, h, bg, ground, clips, decals, items, anchors, paths, start, blocked(x, y), height(x, y), vertical(x, y) }.

   An area def: { w, h, seed, bg, start (the anchor the walk mask grows from),
     level(x, y): the ground level there (0 the lowest; each level a cliff FACE higher),
     roads: [[points, half width]], clear: [[cx, cy, rx, ry]] open ground with no forest,
     gap: how far the forest keeps back from a road, species(x, y, r, pools): the forest's tree there, under(pools):
     what grows instead, smallest last, where that tree's crown would hide open ground,
     things(at, S, G): places sprites with at(name, sprite, x, y, item fields),
     dress(S, G): paints and scatters what lies on its ground, anchors: { name: [x, y] },
     glow: [[cx, cy, rx, ry]] where fireflies fly at night }. */
(() => {
  const V = VIL, T = V.T;

  /* ---------- rasterising onto tiles ---------- */
  const near = (pts, hw, x, y) => KIT.lineDist(x, y, pts)[0] <= hw;
  const inEll = ([cx, cy, rx, ry], x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  function layout(def, lanes, clearings) {
    const TW = def.w / T, TH = def.h / T, roads = [...def.roads, ...lanes], clear = [...(def.clear || []), ...clearings];
    const mat = Array.from({ length: TH }, () => new Array(TW).fill('g')), lev = Array.from({ length: TH }, () => new Array(TW).fill(0));
    const each = f => { for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) f(tx, ty, tx * T + T / 2, ty * T + T / 2); };
    each((tx, ty, x, y) => { lev[ty][tx] = def.level(x, y); });
    // Forest wherever nothing else is: away from the clearings and the roads.
    each((tx, ty, x, y) => {
      if (clear.some(c => inEll(c, x, y)) || roads.some(([pts, hw]) => near(pts, hw + def.gap, x, y))) return;
      mat[ty][tx] = 'f';
    });
    for (const [pts, hw] of roads) each((tx, ty, x, y) => { if (near(pts, hw, x, y)) mat[ty][tx] = 'd'; });
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
  function dress(S, G) {
    const W = S.w, H = S.h, b = G.buf, P = pools();
    const open = (x, y) => G.mat(x, y) === 'g' && !G.forest(x, y) && !G.blocked(x, y);
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
  function bugs(S, G, glow) {
    const open = (x, y) => G.mat(x, y) === 'g' && !G.forest(x, y) && !G.blocked(x, y);
    const fly = (name, s, x, y, rx, ry, ph, o) => {
      const box = [x - rx - s.ax - 1, y - ry - s.ay - 1, 2 * rx + s.img.width + 2, 2 * ry + s.img.height + 2];
      S.items.push({ name, y: y + 24, box, animated: true, walk: true, ...o, draw: (g, t) => {
        const q = Math.floor(t * 7.5) / 7.5, a = ((q % 6) / 6) * 2 * Math.PI + ph;
        const fx = Math.round(x + rx * Math.sin(a) + (rx / 3) * Math.sin(3 * a)), fy = Math.round(y + ry * Math.sin(2 * a + ph));
        g.drawImage(s.frames[Math.floor(q * s.fps) % s.frames.length], fx - s.ax, fy - s.ay);
      } });
    };
    const B = [1, 2, 3, 4, 5].map(k => V.butterfly(k)), F = V.firefly();
    KIT.scatter(31, 160, [0, 0, S.w, S.h], (x, y) => open(x, y) && open(x, y + 30), 1).slice(0, 6).forEach(([x, y, r], i) => fly('butterfly_' + i, B[i % 5], x, y, 18, 8, r * 6, { day: true }));
    glow.forEach(([cx, cy, rx, ry], k) => KIT.scatter(40 + k, 30, [cx - rx, cy - ry, 2 * rx, 2 * ry], (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1, 1).slice(0, 14)
      .forEach(([x, y, r], i) => fly(`firefly_${k}_${i}`, F, x, y - 14, 10, 6, r * 6, { light: true })));
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
    S.canopy = new Uint8Array(def.w * def.h);
    S.height = G.height; S.vertical = G.vertical;
    S.blocked = (x, y) => G.blocked(x, y) || G.forest(x, y) || S.canopy[(y | 0) * def.w + (x | 0)] === 1;
    dress(S, G);
    if (def.dress) def.dress(S, G);
    S.ground = G.buf.canvas();
    P.forEach(t => place(S, t));
    if (def.after) def.after(S, P);
    bugs(S, G, def.glow || []);
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
  };

  window.AREA = { build, ids: Object.keys(AREAS) };
})();
