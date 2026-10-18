'use strict';
/* Bellwood outdoors: one seamless map of the four zones, laid out after the GDD's world map. Two rivers wind down to
   the sea and split the land into the West (the old station, the rail yard, the forge, the banyan with Marlow's
   shop), the Centre (the round square), the East (stilt houses, chamomile fields, Leo's hill) and the South (down the
   cliff stairs: the jetty, the beach, the lighthouse, Theo's studio on the cliff). A rock ridge closes the north edge;
   the town stands on a plateau above the coast. Forest fills the land between places, with roads cut through it.

   The layout is written as shapes in art px (levels, rivers, the sea, roads, plazas, clearings) and rasterised onto
   the 16 px tile grid that VIL.ground paints. window.WORLD.create() returns the world in the form export-world.js
   bakes: { w, h, bg, ground, clips, decals, items, anchors, paths, blocked(x, y) }. */
(() => {
  const V = VIL, T = V.T, W = 4800, H = 3200, TW = W / T, TH = H / T;

  /* ---------- the layout (art px) ---------- */
  const RIDGE = [[0, 0], [4800, 0], [4800, 600], [4560, 612], [4270, 566], [4160, 330], [3700, 276], [3000, 236], [2300, 256], [1700, 214], [1150, 276], [620, 252], [566, 700], [420, 862], [0, 884]];
  const COAST = [[0, 2236], [480, 2330], [900, 2276], [1250, 2384], [1700, 2330], [2100, 2284], [2350, 2236], [2560, 2262], [2900, 2302], [3300, 2352], [3700, 2300], [4200, 2262], [4800, 2302], [4800, 3200], [0, 3200]];
  const MID = [[0, 1880], [600, 2000], [1100, 1950], [1600, 2010], [2000, 1960], [2300, 1900], [2600, 1930], [3100, 2000], [3600, 1950], [4100, 1900], [4800, 1960], [4800, 3200], [0, 3200]];
  const SHORE = [[0, 2700], [380, 2764], [760, 2708], [1180, 2826], [1520, 2770], [1900, 2700], [2300, 2742], [2700, 2790], [3060, 2770], [3260, 2900], [3420, 2860], [3700, 2760], [4100, 2700], [4500, 2760], [4800, 2720]];
  const SEA = [...SHORE, [4800, 3200], [0, 3200]];
  const RIVER_W = [[820, -20], [900, 150], [1080, 300], [1250, 560], [1380, 800], [1362, 1000], [1320, 1210], [1262, 1450], [1300, 1700], [1430, 1900], [1520, 2150], [1500, 2400], [1420, 2620], [1380, 2900]];
  const RIVER_E = [[3200, -20], [3262, 260], [3330, 700], [3400, 1100], [3420, 1420], [3500, 1700], [3700, 1950], [3800, 2150], [3740, 2450], [3660, 2660], [3640, 2900]];
  const BASIN = [650, 1900, 330, 200];                       // the banyan grove, one level down
  // Levels: 3 the north ridge and Leo's hill, 2 the town, 1 the terrace above the coast (and the grove), 0 the coast.
  const LEO = [[4250, 600], [4800, 600]];                    // Leo's hill is the ridge's south-east bulge
  const PLAZA = [2380, 1340, 230];
  // Roads: [points, half width]. Main roads are 3 tiles wide, lanes 2.
  const ROADS = {
    main: [[[1040, 1210], [1500, 1210], [1800, 1290], [2160, 1340], [2600, 1340], [3000, 1400], [3560, 1420], [4000, 1334], [4400, 1284], [4800, 1262]], 24],
    south: [[[2380, 1560], [2400, 1800], [2440, 2000], [2450, 2400], [2520, 2560], [2600, 2730]], 22],
    crossing: [[[1120, 1210], [1120, 1640]], 16],
    yard: [[[1120, 1400], [800, 1420], [500, 1430], [300, 1460]], 16],
    grove: [[[1120, 1620], [960, 1680], [856, 1700], [850, 1780], [700, 1880], [640, 1920]], 14],
    hall: [[[2380, 1120], [2380, 1340]], 20],
    bakery: [[[2380, 1180], [2060, 1130], [1760, 1100]], 14],
    homes: [[[2380, 1180], [2800, 1110], [3020, 1000]], 14],
    theo: [[[2440, 2120], [2240, 2120], [2060, 2110]], 14],
    beachW: [[[2460, 2420], [2200, 2560], [1900, 2600], [1640, 2620]], 14],
    beachE: [[[2560, 2580], [2860, 2600], [3100, 2680], [3280, 2780]], 14],
    stilts: [[[3800, 1400], [3800, 1000], [3720, 820]], 14],
    fields: [[[4200, 1300], [4240, 1160], [4300, 1000]], 14],
    leo: [[[4300, 1000], [4440, 900], [4450, 600], [4520, 440]], 12],
    satria: [[[4100, 1320], [4150, 1700], [4300, 2000], [4320, 2060]], 12],
  };
  const PLATFORM = [470, 1160, 1060, 1222];                   // paving: x0, y0, x1, y1
  const TRACK_Y = 1252;
  // The line comes out of the ridge's tunnel, curves down past the platform and ends at a buffer stop; a siding
  // branches off to the yard.
  // Corner cutting (Chaikin) rounds a polyline into a curve.
  const smooth = (pts, n = 4) => n ? smooth([pts[0], ...pts.slice(1).flatMap((b, i) => { const a = pts[i]; return [[a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]]; }).slice(1, -1), pts[pts.length - 1]], n - 1) : pts;
  const RAILS = [[[236, 912], [240, 1000], [290, 1140], [400, 1230], [540, 1252], [1180, 1252]], [[560, 1252], [650, 1262], [720, 1300], [780, 1312], [1060, 1312]]].map(p => smooth(p));
  const JETTY = [2600, 2934, 170];                            // feet (the south end's centre) and length
  // Places that are open ground (no forest): [cx, cy, rx, ry].
  const CLEAR = [
    [760, 1180, 460, 210], [1150, 1520, 300, 200], [420, 1420, 320, 140], BASIN.slice(0, 2).concat([BASIN[2] - 30, BASIN[3] - 30]),
    [2380, 1220, 520, 330], [1900, 1200, 300, 180], [2900, 1180, 300, 220],
    [2050, 2120, 160, 90], [2600, 2560, 700, 240], [3250, 2760, 200, 120], [1700, 2600, 250, 140],
    [3780, 900, 300, 300], [3700, 1200, 200, 120], [4480, 920, 300, 300], [4560, 430, 220, 140], [4300, 2030, 200, 130], [4620, 1260, 200, 100],
  ];

  /* ---------- rasterising onto tiles ---------- */
  const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [ax, ay] = pts[i], [bx, by] = pts[j]; if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) c = !c; } return c; };
  const inEll = ([cx, cy, rx, ry], x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const near = (pts, hw, x, y) => KIT.lineDist(x, y, pts)[0] <= hw;
  function layout(town) {
    const roads = [...Object.values(ROADS), ...town.lanes], clear = [...CLEAR, ...town.clear];
    const mat = Array.from({ length: TH }, () => new Array(TW).fill('g')), lev = Array.from({ length: TH }, () => new Array(TW).fill(2));
    const each = f => { for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) f(tx, ty, tx * T + T / 2, ty * T + T / 2); };
    each((tx, ty, x, y) => {
      if (inPoly(RIDGE, x, y) || (x > LEO[0][0] && y < LEO[0][1] + 10)) lev[ty][tx] = 3;
      if (inPoly(MID, x, y)) lev[ty][tx] = 1;
      if (inPoly(COAST, x, y)) lev[ty][tx] = 0;
      if (inEll(BASIN, x, y)) lev[ty][tx] = 1;
      if (near(RIVER_W, 40, x, y) || near(RIVER_E, 40, x, y)) mat[ty][tx] = '~';
      if (inPoly(SEA, x, y)) mat[ty][tx] = '_';
    });
    // Sand along the shore, on the low land.
    each((tx, ty, x, y) => { if (mat[ty][tx] === 'g' && lev[ty][tx] === 0 && !inEll(BASIN, x, y) && near(SHORE, 120, x, y)) mat[ty][tx] = 's'; });
    // Forest wherever nothing else is: away from the clearings and the roads.
    each((tx, ty, x, y) => {
      if (mat[ty][tx] !== 'g') return;
      if (clear.some(c => inEll(c, x, y))) return;
      if (roads.some(([pts, hw]) => near(pts, hw + 64, x, y)) || RAILS.some(pts => near(pts, 60, x, y))) return;
      mat[ty][tx] = 'f';
    });
    // Roads, the square, the platform; where a road meets a river it becomes a bridge.
    for (const [pts, hw] of roads) each((tx, ty, x, y) => { if (near(pts, hw, x, y)) if (mat[ty][tx] !== '_') mat[ty][tx] = mat[ty][tx] === '~' ? '=' : 'd'; });
    each((tx, ty, x, y) => { if (Math.hypot(x - PLAZA[0], y - PLAZA[1]) <= PLAZA[2]) mat[ty][tx] = 'p'; });
    each((tx, ty, x, y) => { if (x >= PLATFORM[0] && x < PLATFORM[2] && y >= PLATFORM[1] && y < PLATFORM[3]) mat[ty][tx] = 'p'; });
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
    return { rows: mat.map(r => r.join('')), lev };
  }

  /* ---------- the forest ---------- */
  // Which trees grow where: the old West is dark pines and deep-green broadleaves, the Centre is round broadleaves,
  // the East light and mixed, the coast wind-bent pines. Each species is a small pool of drawn variants.
  const pool = (n, make) => Array.from({ length: n }, (_, k) => make(k + 1));
  let POOLS;
  const pools = () => POOLS || (POOLS = {
    pine: pool(5, k => V.pine({ h: 64 + k * 9, seed: k, leaf: 'teal' })),
    pineDeep: pool(4, k => V.pine({ h: 70 + k * 8, seed: k + 10, leaf: 'deep' })),
    oak: pool(5, k => V.tree({ r: 20 + k * 3, seed: k + 20, leaf: 'green' })),
    oakDeep: pool(4, k => V.tree({ r: 22 + k * 3, seed: k + 30, leaf: 'deep' })),
    autumn: pool(2, k => V.tree({ r: 22 + k * 3, seed: k + 40, leaf: 'autumn' })),
    bush: pool(4, k => V.bush({ r: 8 + k, seed: k + 50 })),
  });
  function species(x, y, r) {
    const P = pools(), pick = a => a[(r * 997 | 0) % a.length];
    if (y > 2300) return pick(r < 0.7 ? P.pine : P.oak);
    if (x < 1400) return pick(r < 0.45 ? P.pine : r < 0.75 ? P.pineDeep : P.oakDeep);
    if (x < 3400) return pick(r < 0.6 ? P.oak : r < 0.77 ? P.oakDeep : r < 0.98 ? P.pine : P.autumn);
    return pick(r < 0.58 ? P.oak : r < 0.61 ? P.autumn : P.pine);
  }
  /* Trees fill the forest. Each is a decal under everything (one clip per drawn variant, the decals in feet order, so
     they overlap each other correctly), and the ground under its crown is solid: the player walks up to the forest
     and in front of its trees, never behind them, so a crown never needs to be drawn over the player. A crown that
     would hang over a path gives way to a bush. Every tree sways a little in the wind. */
  function forest(S, G) {
    const alpha = new Map(), A = s => alpha.get(s) || alpha.set(s, s.img.getContext('2d').getImageData(0, 0, s.img.width, s.img.height).data).get(s);
    // Calls f(x, y) for each opaque crown pixel above the feet of sprite s standing at (x, y); stops when f is true.
    const crown = (s, x, y, f) => {
      const a = A(s), w = s.img.width, bx = x - s.ax + 1, by = y - s.ay + 1;
      for (let j = Math.max(0, -by); by + j < y; j++) for (let i = 0; i < w; i++) if (a[(j * w + i) * 4 + 3] && bx + i >= 0 && bx + i < W && f(bx + i, by + j)) return true;
      return false;
    };
    const onPath = (x, y) => 'dph'.includes(G.mat(x, y));
    const pts = KIT.scatter(11, 22, [0, 0, W, H], (x, y) => G.forest(x, y) && G.forest(x, y - 8) && !G.blocked(x, y), 2.2);
    const trees = pts.map(([x, y, r]) => {
      const s = [species(x, y, r), ...pools().bush].find(s => !crown(s, x, y, onPath));
      return s && { x, y, s };
    }).filter(Boolean).sort((a, b) => a.y - b.y);
    const clipOf = new Map();
    for (const { x, y, s } of trees) {
      if (s.shadow) S.shadows.push([x + 2, y - 1, s.shadow[0], s.shadow[1]]);
      if (!clipOf.has(s)) { const k = 'tree_' + clipOf.size; clipOf.set(s, k); S.clips[k] = { w: s.img.width, h: s.img.height, sway: s.img.height > 70 ? 2 : 1, draw: gg => gg.drawImage(s.img, 0, 0) }; }
      S.decals.below.push([clipOf.get(s), x - s.ax + 1, y - s.ay + 1, 0]);
      crown(s, x, y, (cx, cy) => { S.canopy[cy * W + cx] = 1; });
    }
    return trees.length;
  }

  /* ---------- water: bridges, glints, waves ---------- */
  // Each run of bridge tiles gets a plank deck on the ground and a rail along each side (items).
  function bridges(S, rows) {
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
      S.bridges.push([X0, Y0, X1, Y1]);
      S.decks.push([X0, Y0 + 3, X1, Y1 - 3]);             // the deck is walkable, banks and all
    }
  }
  /* Glints wink on open water; waves roll up the beaches. Both are small loops placed many times, staggered. */
  const glint = { w: 7, h: 3, animated: true, draw: (g, t) => {
    const k = Math.floor(t * 6) % 18; if (k > 3) return;
    g.fillStyle = k === 1 || k === 2 ? '#ffffff' : VIL.C.w1; g.fillRect(k === 1 || k === 2 ? 0 : 2, 1, k === 1 || k === 2 ? 7 : 3, 1);
    if (k === 2) g.fillRect(3, 0, 1, 3);
  } };
  const wave = { w: 22, h: 6, animated: true, draw: (g, t) => {
    const k = Math.floor(t * 4) % 16, up = k < 8 ? k >> 1 : (15 - k) >> 1;
    g.fillStyle = '#ffffff'; g.fillRect(3, 4 - up, 16, 1); g.fillRect(1, 5 - up, 3, 1); g.fillRect(18, 5 - up, 3, 1);
    g.fillStyle = VIL.C.w1; g.fillRect(4, 5 - up, 14, 1);
  } };
  function waterLife(S, G) {
    S.clips.glint = glint; S.clips.wave = wave;
    KIT.scatter(17, 46, [0, 0, W, H], (x, y) => G.mat(x, y) === 'w' && G.mat(x + 7, y) === 'w' && G.mat(x, y - 3) === 'w', 1.5)
      .forEach(([x, y, r]) => S.decals.below.push(['glint', x, y, (r * 720) | 0]));
    for (let x = 6; x < W - 24; x += 22) {
      let y = Math.round(shoreY(x)) - 40;
      while (y < H && G.mat(x + 11, y) !== 'w') y++;
      if (y < H - 8 && G.mat(x + 11, y + 4) === 'w') S.decals.below.push(['wave', x, y + 1, ((x * 37) % 64) * 6]);
    }
  }
  const shoreY = x => { for (let i = 1; i < SHORE.length; i++) if (x <= SHORE[i][0]) { const [ax, ay] = SHORE[i - 1], [bx, by] = SHORE[i]; return ay + ((x - ax) / (bx - ax)) * (by - ay); } return SHORE[SHORE.length - 1][1]; };

  /* ---------- the railway, painted on the ground: a gravel bed, sleepers, two rails with a lit top ---------- */
  function railway(b) {
    const U = c => KIT.u32(V.col(c)), BED = ['#b7aa98', '#9d907e', '#7d7262'].map(U), WOOD = ['wood2', 'wood3', 'wood4'].map(U), IRON = ['#e8edf2', '#8d97a3', '#4b5260'].map(U);
    const along = (step, f) => {                // f(x, y, nx, ny, s) every `step` px along each line; (nx, ny) is its normal
      for (const pts of RAILS) for (let i = 1, s = 0; i < pts.length; i++) {
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

  /* ---------- open ground: tufts, flowers, bushes along the forest's edge, stones ---------- */
  function dress(S, G) {
    const b = G.buf, P = pools();
    const open = (x, y) => G.mat(x, y) === 'g' && !G.forest(x, y) && !G.blocked(x, y) && !RAILS.some(pts => near(pts, 18, x, y));
    KIT.scatter(21, 30, [0, 0, W, H], (x, y) => open(x, y) && open(x + 6, y + 4), 1.6).forEach(([x, y]) => V.tuft(b, x, y, 21));
    KIT.scatter(22, 90, [0, 0, W, H], (x, y) => open(x - 10, y - 6) && open(x + 10, y + 6), 1.2).forEach(([x, y], k) => V.flowers(b, x, y, k + 1, 6 + (k % 5), 18));
    // Bushes soften the line where the forest meets open ground.
    const edge = (x, y) => open(x, y) && open(x, y + 6) && !open(x, y - 26) && G.forest(x, y - 26);
    KIT.scatter(23, 34, [0, 0, W, H], edge, 2).forEach(([x, y, r]) => {
      const s = P.bush[(r * 97 | 0) % P.bush.length], bx = x - s.ax + 1, by = y - s.ay + 1;
      S.items.push({ name: 'bush', y, box: [bx, by, s.img.width, s.img.height], foot: 3, sway: 1, draw: g => g.drawImage(s.img, bx, by) });
      S.shadows.push([x + 2, y - 1, s.shadow[0], s.shadow[1]]);
    });
    const stone = [V.rock({ rx: 7, ry: 5 }), V.rock({ rx: 5, ry: 4 }), V.rock({ rx: 9, ry: 6 })];
    KIT.scatter(24, 160, [0, 0, W, H], (x, y) => open(x - 12, y - 8) && open(x + 12, y + 4), 1).forEach(([x, y, r]) => {
      const s = stone[(r * 31 | 0) % 3], bx = x - s.ax + 1, by = y - s.ay + 1;
      S.items.push({ name: 'stone', y, box: [bx, by, s.img.width, s.img.height], foot: 3, draw: g => g.drawImage(s.img, bx, by) });
    });
  }

  /* ---------- the town: buildings, props and the things that live in it ---------- */
  /* Every placed thing is { name, s, x, y, o }: sprite s with its feet at (x, y), o extra item fields. A building
     (anything with a base) clears the forest around it; `lane` runs a path from its door to a road. */
  function town() {
    const P = [], lanes = [], clear = [];
    const at = (name, s, x, y, o = {}) => {
      const { lane, ...rest } = o;
      P.push({ name, s, x, y, o: rest });
      if (s.base) clear.push([x, y - s.ay / 2, s.img.width / 2 + 36, s.ay / 2 + 36]);
      if (lane) lanes.push([[[x + (s.door || 0), y + 4], ...lane], 10]);
    };
    // The West: the station over the platform, the tea stall and notice board on it, Helen and the mender either side,
    // the yard (engine, wagons, water tower, forge, Bram's carriage), the tunnel the line comes out of, and down in
    // the grove the banyan with Marlow's shop in its roots.
    at('station', V.station(), 760, 1160);
    at('tea_stall', V.teaStall(), 580, 1200);
    at('info_board', V.noticeBoard(), 1030, 1196);
    at('helen_house', V.helenHouse(), 500, 1128);
    at('mender_house', V.menderHouse(), 1010, 1120);
    at('tunnel', V.tunnelPortal(), 236, 914, { walk: true });
    at('locomotive', V.locomotive(), 996, 1318); at('wagon_0', V.wagon(1), 888, 1318); at('wagon_1', V.wagon(2), 240, 1330);
    at('water_tower', V.waterTower(), 1190, 1236);
    at('forge', V.forge(), 600, 1404);
    at('bram_home', V.bramHome(), 330, 1432);
    at('gate', V.gateArch('BELLWOOD'), 1120, 1370, { walk: true });
    at('banyan', V.banyan(), 650, 1930);
    // The Centre: the hall over the square, the fountain in its middle, stalls round it, shops and homes on the lanes.
    at('hall', V.hall(), 2380, 1104);
    at('fountain', V.fountain(), 2380, 1352);
    [['veg', 2236, 1268], ['fruit', 2524, 1268], ['flowers', 2246, 1452], ['bread', 2514, 1452]].forEach(([k, x, y]) => at('stall_' + k, V.stall(k), x, y));
    at('bench_w', V.bench(), 2318, 1420); at('bench_e', V.bench(), 2442, 1420);
    [[2190, 1196], [2570, 1196], [2176, 1500], [2584, 1500]].forEach(([x, y], i) => at('lamp_' + i, V.lamp(), x, y));
    at('notice_square', V.noticeBoard(), 2532, 1150);
    at('bakery', V.bakery(), 2080, 1106);
    at('post_office', V.postOffice(true), 1820, 1080);
    at('home_brick', V.centreHome('brick'), 2620, 1116);
    at('home_mia', V.centreHome('mia'), 2830, 1080);
    at('home_sam', V.centreHome('sam'), 3040, 984);
    at('home_weaver', V.centreHome('plaster'), 2250, 1650, { lane: [[2240, 1676], [2380, 1680]] });
    at('home_seeds', V.centreHome('corner'), 2580, 1660, { lane: [[2638, 1686], [2420, 1690]] });
    at('bus_stop', V.busStop(), 3150, 1376);
    // The South: the jetty and boats, the salt store and Arlo on the beach, Theo up on the cliff, the lighthouse.
    at('theo_studio', V.theoStudio(), 2035, 2098);
    at('salt_store', V.saltStore(), 2150, 2546);
    at('arlo_home', V.arloHome(), 2880, 2578);
    at('rope_bridge', V.ropeBridgeRemains(), 1600, 2598);
    at('lighthouse', { ...V.lighthouse(), door: undefined }, 3340, 2892);   // seen, not entered
    const B = V.beachProps;
    at('fish_rack', B.fishRack(), 3010, 2600); at('nets', B.nets(), 2980, 2650, { walk: true }); at('driftwood', B.driftwood(), 2300, 2700, { walk: true });
    [[2050, 2690, 'scallop'], [2400, 2740, 'spiral'], [2780, 2730, 'clam'], [3150, 2790, 'scallop'], [1800, 2680, 'clam'], [3550, 2720, 'spiral']].forEach(([x, y, k], i) => at('shell_' + i, B.shell(k), x, y, { walk: true }));
    [[2150, 2960], [2950, 3010], [3720, 2930], [1050, 2990], [4300, 2930], [600, 2900]].forEach(([x, y], i) => at('sea_rock_' + i, V.rockStack(i + 1), x, y, { walk: true }));
    at('boat_0', V.boat(1), 2690, 2930, { walk: true }); at('boat_1', V.boat(2), 2490, 3010, { walk: true }); at('rowboat', V.rowboat(), 2530, 2880, { walk: true });
    // The East: stilt houses along the river lane, the bus stop, the playground, the gardener and the chamomile fields,
    // Leo's lookout on the hill, Satria on the terrace.
    at('stilt_nora', V.stiltHouse('nora'), 3700, 1000);
    at('stilt_a', V.stiltHouse('a'), 3900, 960);
    at('stilt_b', V.stiltHouse('b'), 3880, 1200);
    at('playground', V.playground(), 3990, 1250); at('swing', V.swing(), 4080, 1248);
    at('gardener_home', V.gardenerHome(), 4620, 1240);
    at('aphid_pen', V.aphidPen(), 4470, 1236);
    at('leo_hut', V.leoHut(), 4560, 424);
    at('satria_home', V.satriaHome(), 4300, 2040);
    // Accents: blossoms round the square, birches and fruit trees in the East, willows by the bridges, boulders.
    [[2050, 1262], [2720, 1262], [2010, 1520], [2770, 1540]].forEach(([x, y], i) => at('blossom_' + i, V.blossom(i + 1), x, y, { sway: 2 }));
    [[4110, 1110], [4150, 1140], [4190, 1100], [3620, 1300], [3660, 1320], [4380, 1380]].forEach(([x, y], i) => at('birch_' + i, V.birch(i + 1), x, y, { sway: 2 }));
    [[4740, 1236, 'apple'], [4380, 1250, 'orange'], [1700, 1150, 'apple']].forEach(([x, y, f], i) => at('fruit_tree_' + i, V.fruitTree(i + 1, f), x, y, { sway: 1 }));
    [[1390, 1160], [3490, 1490], [1210, 1720]].forEach(([x, y], i) => at('willow_' + i, V.willow(i + 1), x, y, { sway: 2 }));
    [[2950, 1320], [1500, 1400], [4000, 1060], [1720, 2480]].forEach(([x, y], i) => at('boulder_' + i, V.boulder(i + 1), x, y));
    return { P, lanes, clear };
  }

  /* ---------- the jetty: a deck over the sea (walkable), its posts and lantern standing on it ---------- */
  function jetty(S) {
    const [x, y, len] = JETTY, j = V.jetty(len), X0 = x - j.dx, Y0 = y - j.dy;
    S.ground.getContext('2d').drawImage(j.deck, X0, Y0);
    S.decks.push([X0 + 4, Y0 - 12, X0 + j.deck.width - 4, y - 2]);
    j.parts.forEach((q, i) => { const ox = x + q.x - q.ax, oy = y + q.y - q.ay; S.items.push({ name: 'jetty_' + i, y: y + q.y, box: [ox, oy, q.img.width, q.img.height], walk: true, draw: g => g.drawImage(q.img, ox, oy) }); });
  }

  /* ---------- fields: chamomile in rows behind a picket fence, painted on the ground ---------- */
  function fields(S) {
    const g = S.ground.getContext('2d');
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) g.drawImage(V.chamomile(112, 48, r * 2 + c + 1).img, 4330 + c * 124, 1010 + r * 58);
    for (let k = 0, f = V.fieldFence(10); k < 5; k++) { const ox = 4326 + k * f.step - f.ax, oy = 1190 - f.ay; S.items.push({ name: 'field_fence_' + k, y: 1190, box: [ox, oy, f.img.width, f.img.height], foot: 3, draw: gg => gg.drawImage(f.img, ox, oy) }); }
  }

  /* ---------- bugs: butterflies and dragonflies by day, fireflies at night ---------- */
  // Each flies a small loop that repeats every 6 s, its position stepped at 7.5 fps so the loop bakes to few frames.
  function bugs(S, G) {
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
    KIT.scatter(31, 260, [0, 0, W, H], (x, y) => open(x, y) && open(x, y + 30), 1).slice(0, 18).forEach(([x, y, r], i) => fly('butterfly_' + i, B[i % 5], x, y, 18, 8, r * 6, { day: true }));
    [[1330, 1300], [1290, 1600], [3440, 1250], [3560, 1760], [1460, 2050]].forEach(([x, y], i) => fly('dragonfly_' + i, D, x, y, 26, 10, i, { day: true }));
    const glow = [[650, 1840, 260, 130], [3500, 1500, 300, 160], [1300, 1500, 220, 300], [4450, 1100, 200, 140]];
    glow.forEach(([cx, cy, rx, ry], k) => KIT.scatter(40 + k, 40, [cx - rx, cy - ry, 2 * rx, 2 * ry], (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1, 1).slice(0, 12)
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

  function create() {
    const TOWN = town(), { rows, lev } = layout(TOWN);
    const G = V.ground(rows, { seed: 7, level: (tx, ty) => lev[Math.min(TH - 1, Math.max(0, ty))][Math.min(TW - 1, Math.max(0, tx))] });
    const S = { w: W, h: H, bg: '#2f7a3a', clips: {}, decals: { below: [] }, items: [], shadows: [], anchors: {}, paths: {}, bridges: [], decks: [] };
    S.canopy = new Uint8Array(W * H);
    S.height = G.height; S.vertical = G.vertical;
    S.blocked = (x, y) => !S.decks.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1) && (G.blocked(x, y) || G.forest(x, y) || S.canopy[(y | 0) * W + (x | 0)] === 1);
    railway(G.buf);
    dress(S, G);
    S.ground = G.buf.canvas();
    bridges(S, rows);
    waterLife(S, G);
    jetty(S);
    fields(S);
    TOWN.P.forEach(t => place(S, t));
    bugs(S, G);
    // The banyan's lanterns: dark by day, lit at dusk and night.
    const bn = TOWN.P.find(t => t.name === 'banyan'), bx = bn.x - bn.s.ax, by = bn.y - bn.s.ay;
    [false, true].forEach(on => { const l = V.lantern(on); bn.s.lanterns.forEach(([hx, hy], i) => { const ox = bx + hx - l.ax, oy = by + hy - l.ay; S.items.push({ name: `shop_lantern_${i}${on ? '' : '_day'}`, y: bn.y + 1, box: [ox, oy, l.img.width, l.img.height], walk: true, ...(on ? { light: true } : { day: true }), draw: g => g.drawImage(l.img, ox, oy) }); }); });
    Object.assign(S.anchors, { start: [760, 1192], from_shop: [650, 1950] });
    S.trees = forest(S, G);
    V.shadows(S.ground, S.shadows);
    return S;
  }

  window.WORLD = { create, W, H, ROADS, PLAZA, PLATFORM, TRACK_Y, BASIN, RIVER_W, RIVER_E, SHORE };
})();
