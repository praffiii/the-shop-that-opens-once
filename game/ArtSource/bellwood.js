'use strict';
/* Bellwood: the whole outdoor world of the UTS GDD as one seamless map. Every pixel is authored here in code.
   West: the old station, the rails and the banyan where Marlow's shop appears. Centre: the gravel square and the
   market. East: the stilt houses, the chamomile garden, the bus stop, Satria's childhood home and Leo's hill. South:
   the road to the cliffs, Theo's studio, the lighthouse, the steps down to the beach and Arlo's jetty. Two rivers run
   from the northern woods to the sea and fall off the cliff; bridges join West and Centre, and Centre and East.
   The GDD's maps were a layout guide only (GAME-CONTEXT.md, Decisions).

   window.BELLWOOD.createWorld() returns a scene (ART.md scene contract) drawn at midday; the game grades it for the
   time of day (KIT.GRADES). Lights (lit windows, lamps, the shop door, fireflies) are entries of their own with
   `light` set, shown at dusk and night and never graded. Every motion repeats within the baked 24 s loop. Everything
   moving on the ground repeats every 2 s and the water moves on a fixed lattice, so the baked ground tiles hold few
   frames and share most of them. */
(() => {
  const K = KIT, { PAL: P, rng } = PX;
  const { canvas, hex, clamp, R, D, E, TX, L, S, poly, hash, vnoise, scatter, lineDist, u32, Buf, stamp } = K;

  const W = 1536, H = 1152;
  const idx = (x, y) => y * W + x, inW = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const step = (t, fps) => Math.floor(t * fps);
  const LOOP = 24, TAU = Math.PI * 2, wv = k => (TAU * k) / LOOP; // angular speeds that repeat within the loop
  const H01 = (i, k) => hash(i, k, 97);

  /* ---------- layout (world coordinates, art px; y is the feet line) ---------- */
  // Rivers [x, y, half width], from the northern woods, under the bridges, over the cliff and across the beach.
  const RIVER_W = [[446, -12, 13], [452, 110, 14], [466, 240, 15], [458, 360, 16], [470, 470, 17], [486, 590, 18], [474, 710, 19], [458, 820, 20], [452, 905, 21], [456, 1010, 22], [470, 1160, 30]];
  const RIVER_E = [[1082, -12, 13], [1076, 120, 14], [1064, 250, 15], [1074, 370, 16], [1066, 480, 17], [1050, 600, 18], [1064, 720, 19], [1086, 830, 20], [1096, 912, 21], [1092, 1010, 22], [1078, 1160, 30]];
  const cliffTop = x => Math.round(930 + 5 * Math.sin(x * 0.019 + 1.2) + 3 * Math.sin(x * 0.047));
  const CLIFF_H = 58;
  const cliffBot = x => cliffTop(x) + CLIFF_H;
  const seaTop = x => Math.round(1066 + 4 * Math.sin(x * 0.013 + 0.4) + 2 * Math.sin(x * 0.041 + 2));
  const forestY = x => Math.round(140 + 9 * Math.sin(x * 0.012 + 0.8) + 5 * Math.sin(x * 0.037 + 2.2));
  const STEPS = { x0: 718, x1: 744 };                                        // stone steps down the cliff face
  const HILL = { x0: 1384, faceH: 22, steps: [1394, 1420] };                 // Leo's hill: the plateau in the north-east
  const hillFront = x => Math.round(292 + 4 * Math.sin(x * 0.045 + 0.7));
  const SQUARE = { cx: 772, cy: 520, rx: 124, ry: 62 };
  const PLATFORM = { x0: 60, x1: 404, y0: 548, y1: 590, face: 7 };
  const RAILS = { x0: -4, x1: 424, y0: 600, y1: 622 };
  const BRIDGES = [{ x0: 438, x1: 504, y0: 466, y1: 485 }, { x0: 1034, x1: 1100, y0: 474, y1: 493 }];
  const JETTY = { x0: 652, x1: 688, y0: 1008, y1: 1116, head: [618, 724, 1098, 1118] };
  const GARDEN = { x0: 1172, x1: 1364, y0: 512, y1: 648 };
  const FOUNTAIN = [772, 530];
  const WHEAT = { x0: 800, x1: 944, y0: 652, y1: 728 };

  // Sand paths [points, half width]. The square, the platform, the garden and the beach are their own materials.
  const PATHS_SAND = [
    [[[392, 572], [418, 548], [432, 512], [446, 478]], 7],                                      // platform end to the west bridge
    [[[446, 478], [400, 458], [346, 448], [300, 432], [240, 418], [170, 414], [124, 416]], 6],   // to the forge
    [[[346, 448], [338, 400], [334, 375]], 5],                                                  // to the banyan
    [[[500, 478], [552, 488], [604, 496], [650, 508]], 7],                                      // west bridge to the square
    [[[772, 433], [772, 462]], 11],                                                             // hall steps
    [[[612, 488], [626, 500]], 6],                                                              // bakery door
    [[[892, 516], [960, 504], [1010, 494], [1036, 486]], 7],                                    // square to the east bridge
    [[[772, 580], [770, 640], [760, 720], [766, 800], [776, 868], [754, 912], [731, 926]], 7],  // the south road to the steps
    [[[776, 868], [836, 890], [850, 914], [904, 914]], 5],                                      // Theo's studio
    [[[904, 912], [946, 916], [972, 926]], 4],                                                  // the lighthouse
    [[[1100, 486], [1160, 480], [1222, 470]], 7],
    [[[1222, 470], [1236, 430], [1210, 404], [1198, 392]], 5],                                  // Nora's house
    [[[1236, 430], [1290, 392], [1306, 372]], 5],                                               // the other stilt house
    [[[1222, 470], [1300, 462], [1376, 470], [1440, 484], [1500, 494], [W + 12, 498]], 6],      // the bus stop and the road out
    [[[1376, 470], [1400, 400], [1407, 316]], 4],                                               // to the steps up Leo's hill
    [[[1376, 470], [1386, 530], [1380, 570], [1382, 618], [1412, 618]], 4],                                  // the gardener's shed
    [[[1380, 570], [1386, 660], [1360, 700], [1290, 720], [1280, 790], [1290, 852], [1344, 852]], 5], // down to Satria's home
    [[[1268, 664], [1300, 700], [1360, 700]], 4],                                               // the garden gate
    [[[1407, 288], [1424, 268], [1468, 258]], 4],                                               // on the hill, to Leo's hut
  ];
  // The garden fence gate, the beach paths and the hill steps join these to the rest.
  const A = {
    start: [300, 470], stationDoor: [206, 558], teaStall: [352, 584], forgeDoor: [124, 418], banyanDoor: [334, 376],
    bridgeWest: [472, 476], square: [772, 566], hallDoor: [772, 438], bakeryDoor: [612, 490], stall: [944, 582],
    noticeBoard: [690, 482], bridgeEast: [1068, 484], noraDoor: [1198, 394], stiltDoor: [1306, 374], swing: [1270, 438],
    garden: [1268, 664], shedDoor: [1412, 614], busStop: [1496, 492], homeDoor: [1344, 846], hillTop: [1424, 270],
    leoHut: [1468, 262], southRoad: [770, 700], studioDoor: [904, 912], lighthouse: [988, 0], cliffSteps: [731, 0],
    beach: [731, 0], saltStore: [588, 1044], jetty: [670, 1104], ropeBridge: [418, 0], infoBoard: [394, 538],
  };
  A.lighthouse[0] = 970; A.lighthouse[1] = cliffTop(970) - 7; A.cliffSteps[1] = cliffTop(731) - 3; A.beach[1] = cliffBot(731) + 10; A.ropeBridge[1] = cliffTop(418) - 18;

  /* ---------- terrain masks ---------- */
  const M = { water: new Uint8Array(W * H), sand: new Uint8Array(W * H), gravel: new Uint8Array(W * H), beach: new Uint8Array(W * H) };
  const chain = (pts, hw) => ({
    pts, hw,
    x0: Math.min(...pts.map(p => p[0] - (p[2] || 0))) - hw - 8, x1: Math.max(...pts.map(p => p[0] + (p[2] || 0))) + hw + 8,
    y0: Math.min(...pts.map(p => p[1] - (p[2] || 0))) - hw - 8, y1: Math.max(...pts.map(p => p[1] + (p[2] || 0))) + hw + 8,
  });
  const near = (c, x, y) => x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1;
  const RW = chain(RIVER_W, 6), RE = chain(RIVER_E, 6), CAPS = PATHS_SAND.map(([p, hw]) => chain(p, hw));
  const halfW = (pts, i, t) => pts[i][2] + (pts[i + 1][2] - pts[i][2]) * t;
  // Signed distance into the nearer river (negative inside) and its local half width, or [99, 0] when far.
  function riverAt(x, y) {
    let best = [99, 0];
    for (const c of [RW, RE]) if (near(c, x, y)) {
      const [dd, i, t] = lineDist(x, y, c.pts), hw = halfW(c.pts, i, t), d = dd - hw - (vnoise(x / 9, y / 9, 5) - 0.5) * 3;
      if (d < best[0]) best = [d, hw, dd];
    }
    return best;
  }
  const onCliff = (x, y) => y >= cliffTop(x) && y < cliffBot(x);
  const onSteps = (x, y) => x >= STEPS.x0 && x < STEPS.x1 && onCliff(x, y);
  const onHillFace = (x, y) => x >= HILL.x0 && y >= hillFront(x) && y < hillFront(x) + HILL.faceH;
  const onHillSteps = (x, y) => x >= HILL.steps[0] && x < HILL.steps[1] && onHillFace(x, y);
  const inSquare = (x, y) => ((x - SQUARE.cx) / SQUARE.rx) ** 2 + ((y - SQUARE.cy) / SQUARE.ry) ** 2 < 1 - (vnoise(x / 6, y / 5, 13) - 0.5) * 0.08;
  const inForest = (x, y) => y < forestY(x);
  function sandField(x, y) {
    let d = 99;
    for (const c of CAPS) if (near(c, x, y)) d = Math.min(d, lineDist(x, y, c.pts)[0] - c.hw);
    return d > 10 ? d : d + (vnoise(x / 7, y / 6, 11) - 0.5) * 4;
  }
  const onPlatform = (x, y) => x >= PLATFORM.x0 && x <= PLATFORM.x1 && y >= PLATFORM.y0 && y < PLATFORM.y1;
  const onPlatformFace = (x, y) => x >= PLATFORM.x0 && x <= PLATFORM.x1 && y >= PLATFORM.y1 && y < PLATFORM.y1 + PLATFORM.face;
  const onRails = (x, y) => x >= RAILS.x0 && x <= RAILS.x1 && y >= RAILS.y0 && y < RAILS.y1;
  const inGarden = (x, y) => x >= GARDEN.x0 && x < GARDEN.x1 && y >= GARDEN.y0 && y < GARDEN.y1;
  const inWheat = (x, y) => x >= WHEAT.x0 && x < WHEAT.x1 && y >= WHEAT.y0 && y < WHEAT.y1;
  const onBridge = (x, y) => BRIDGES.some(b => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
  const onJetty = (x, y) => (x >= JETTY.x0 && x <= JETTY.x1 && y >= JETTY.y0 && y <= JETTY.y1) ||
    (x >= JETTY.head[0] && x <= JETTY.head[1] && y >= JETTY.head[2] && y <= JETTY.head[3]);
  const onDeck = (x, y) => onBridge(x, y) || onJetty(x, y);
  function buildMasks() {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (y >= seaTop(x) || riverAt(x, y)[0] < 0) { M.water[i] = 1; continue; }
      if (y >= cliffBot(x)) { M.beach[i] = 1; continue; }
      if (onCliff(x, y) || onHillFace(x, y) || inForest(x, y) || onPlatform(x, y) || onPlatformFace(x, y) || onRails(x, y) || inGarden(x, y) || inWheat(x, y) || onHillSide(x, y)) continue;
      if (inSquare(x, y)) M.gravel[i] = 1;
      else if (sandField(x, y) < 0) M.sand[i] = 1;
    }
    // No one-pixel spurs or pits on material edges.
    for (const m of [M.sand, M.water, M.gravel]) for (let pass = 0; pass < 2; pass++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = idx(x, y), s = m[i - 1] + m[i + 1] + m[i - W] + m[i + W];
      if (m[i] && s <= 1) m[i] = 0;
      else if (!m[i] && s >= 3 && !onCliff(x, y) && !onPlatform(x, y) && !onRails(x, y) && !inGarden(x, y)) m[i] = 1;
    }
    for (let i = 0; i < W * H; i++) if (M.water[i]) { M.sand[i] = 0; M.gravel[i] = 0; M.beach[i] = 0; }
  }
  const water = (x, y) => inW(x, y) && M.water[idx(x | 0, y | 0)] === 1;
  const sand = (x, y) => inW(x, y) && M.sand[idx(x | 0, y | 0)] === 1;
  const gravel = (x, y) => inW(x, y) && M.gravel[idx(x | 0, y | 0)] === 1;
  const beach = (x, y) => inW(x, y) && M.beach[idx(x | 0, y | 0)] === 1;
  const sea = (x, y) => y >= seaTop(x);
  const falls = (x, y) => water(x, y) && onCliff(x, y);
  // Props register keep-out rects so grass details and flowers stay clear of them.
  const keep = [];
  const blocked = (x, y) => keep.some(([a, b, w, h]) => x >= a && y >= b && x < a + w && y < b + h);
  const grass = (x, y) => inW(x, y) && !water(x, y) && !sand(x, y) && !gravel(x, y) && !beach(x, y) && !onCliff(x, y) && !onHillFace(x, y) &&
    !onPlatform(x, y) && !onPlatformFace(x, y) && !onRails(x, y) && !inGarden(x, y) && !inForest(x, y) && !inWheat(x, y) && !onHillSide(x, y);

  /* ---------- ground: base materials ---------- */
  const isAny = (b, x, y, ...cs) => { const v = b.get(x, y); return cs.some(c => v === u32(c)); };
  const grassy = (b, x, y) => isAny(b, x, y, 'grass0', 'grass1', 'grass2', 'grass3');
  function groundBase(b) {
    b.d.fill(u32('grass2'));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (M.sand[i] || M.water[i] || M.gravel[i] || M.beach[i]) continue;
      const n = vnoise(x / 15, y / 9, 23) * 0.8 + vnoise(x / 5, y / 4, 24) * 0.2;
      if (n > 0.64) b.d[i] = u32(n > 0.76 ? 'grass0' : 'grass1');
      else if (n < 0.2) b.d[i] = u32('grass3');
    }
    const gs = ['grass0', 'grass1', 'grass2', 'grass3'].map(u32);
    for (let pass = 0; pass < 2; pass++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { // no lone pixels
      const i = idx(x, y), v = b.d[i]; if (!gs.includes(v)) continue;
      const same = (b.d[i - 1] === v) + (b.d[i + 1] === v) + (b.d[i - W] === v) + (b.d[i + W] === v);
      if (same <= 1) b.d[i] = b.d[i - 1] === v ? b.d[i + 1] : b.d[i - 1];
    }
    // The forest floor, in deep shade under the canopy drawn over it later.
    for (let x = 0; x < W; x++) for (let y = 0; y < forestY(x) + 3 && y < H; y++) {
      if (water(x, y)) continue;
      const d = forestY(x) - y;
      b.set(x, y, d > 6 ? (vnoise(x / 6, y / 5, 33) > 0.5 ? 'leaf5' : 'leaf4') : d > 0 ? 'grass4' : 'grass3');
    }
    // Sand with bitten edges: shade under the grass lip, a lit lower rim, wear patches.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!sand(x, y)) continue;
      const up = !sand(x, y - 1) && !water(x, y - 1), side = !sand(x - 1, y) || !sand(x + 1, y);
      b.set(x, y, up || (side && !water(x - 1, y) && !water(x + 1, y)) ? 'dirt2' : 'dirt1');
    }
    for (const [x, y, q] of scatter(22, 18, [0, 0, W, H], (x, y) => sand(x, y) && sand(x, y - 3) && sand(x, y + 3))) {
      const r = rng(x * 7 + y * 3);
      for (let k = 0; k < 2; k++) K.blob(b, x + (r() - 0.5) * 10, y + (r() - 0.5) * 4, 3 + r() * 6, 1 + r() * 2, q < 0.55 ? 'dirt0' : 'dirt2', (x, y) => sand(x, y) && sand(x, y - 1) && sand(x - 1, y) && sand(x + 1, y));
    }
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
      if (sand(x, y) || water(x, y) || !grassy(b, x, y)) continue;
      if (sand(x, y + 1) || gravel(x, y + 1)) b.set(x, y, 'grass3');            // grass lip above sand
      else if (sand(x, y - 1) || gravel(x, y - 1)) b.set(x, y, 'grass1');       // lit grass rim below sand
    }
  }
  // The square: fine gravel ringed by a kerb of laid stones.
  function square(b) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (gravel(x, y)) b.set(x, y, !gravel(x, y - 1) ? 'dirt2' : 'dirt0');
    for (const [x, y, q] of scatter(41, 3.2, [SQUARE.cx - SQUARE.rx, SQUARE.cy - SQUARE.ry, SQUARE.rx * 2, SQUARE.ry * 2], (x, y) => gravel(x, y) && gravel(x + 1, y + 1) && gravel(x, y - 1), 2)) {
      const c = q < 0.45 ? 'dirt1' : q < 0.7 ? 'cream1' : q < 0.88 ? 'stone1' : 'dirt2';
      b.set(x, y, c); b.set(x + 1, y, c); if (q > 0.6) b.set(x, y + 1, q < 0.88 ? 'dirt2' : 'stone2');
    }
    const rr = rng(43), n = 74;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, x = Math.round(SQUARE.cx + (SQUARE.rx - 3) * Math.cos(a)), y = Math.round(SQUARE.cy + (SQUARE.ry - 2) * Math.sin(a));
      const pathGap = sand(x, y + 6) || sand(x, y - 6) || sand(x + 6, y) || sand(x - 6, y);
      if (pathGap) continue;
      K.pave(b, x - 3, y - 2, Math.abs(Math.sin(a)) > 0.5 ? 7 : 5, 4, K.PAVE[(rr() * K.PAVE.length) | 0], rr() < 0.3);
    }
  }
  function waterBase(b) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!water(x, y)) continue;
      if (falls(x, y)) { b.set(x, y, (x + (y >> 2)) % 5 ? 'water2' : 'water1'); continue; }
      if (sea(x, y)) {
        const d = y - seaTop(x), n = vnoise(x / 18, y / 5, 62);
        b.set(x, y, d < 2 ? 'water1' : d < 6 ? 'water2' : d < 18 + n * 8 ? 'water3' : d < 60 + n * 10 ? 'water4' : 'water5');
        continue;
      }
      const [, hw, dd] = riverAt(x, y), edge = !water(x - 1, y) || !water(x + 1, y) || !water(x, y - 1);
      const n = vnoise(x / 6, y / 7, 61);
      let c = dd < hw * (0.32 + n * 0.25) ? 'water4' : 'water3';
      if (!water(x - 2, y) || !water(x + 2, y)) c = 'water2';
      if (edge) c = 'water1';
      if (beach(x, y + 1)) c = 'water0';
      b.set(x, y, c);
    }
    // Banks: a dark grass lip on either side of the rivers, stones where the bank turns.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (water(x, y) || onCliff(x, y) || beach(x, y) || inForest(x, y)) continue;
      if (water(x + 1, y) || water(x - 1, y)) b.set(x, y, 'grass4');
      else if (water(x + 2, y) || water(x - 2, y) || water(x, y + 1)) { if (grassy(b, x, y)) b.set(x, y, 'grass3'); }
    }
    for (const [x, y, q] of scatter(64, 9, [0, 0, W, cliffTop(0) + 80], (x, y) => !water(x, y) && (water(x + 2, y) || water(x - 2, y)) && !onCliff(x, y) && !inForest(x, y) && !sand(x, y))) {
      if (q > 0.45) continue;
      K.stone(b, x, y, 2 + (q > 0.2 ? 1 : 0), 1 + (q > 0.3 ? 1 : 0), K.STONES[3], 'grass4');
    }
  }
  function beachBase(b) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!beach(x, y)) continue;
      const d = seaTop(x) - y, n = vnoise(x / 11, y / 5, 71);
      b.set(x, y, d <= 3 ? 'dirt2' : d <= 9 ? 'dirt1' : y < cliffBot(x) + 3 ? 'dirt1' : n > 0.62 ? 'cream0' : 'cream1');
    }
    // Wind ripples, shells, pebbles and dry seaweed, in small clusters.
    for (const [x, y, q] of scatter(72, 7, [0, cliffTop(0) + 40, W, 200], (x, y) => beach(x, y) && beach(x + 5, y) && seaTop(x) - y > 10 && !onJetty(x, y))) {
      if (q < 0.45) { b.set(x, y, 'cream2'); b.set(x + 1, y, 'cream2'); b.set(x + 2, y + 1, 'cream2'); b.set(x + 3, y + 1, 'cream2'); }
      else if (q < 0.55) stamp(b, x, y, ['pw', 'pp'], { p: 'pink', w: 'white' });
      else if (q < 0.62) stamp(b, x, y, ['11.', '123'], { 1: 'stone1', 2: 'stone2', 3: 'stone3' });
      else if (q < 0.66) stamp(b, x, y, ['g.g', '.gg'], { g: 'leaf4' });
    }
    // The wet line the waves leave.
    for (let x = 0; x < W; x++) { const y = seaTop(x) - 4; if (beach(x, y) && (x >> 2) % 3) b.set(x, y, 'dirt3'); }
  }
  // Pale coral limestone cliff: strata, boulders, a grassy lip with moss and vines, steps carved down to the beach.
  function boulder(b, cx, cy, rx, ry, ramp, clip) {
    const inside = (x, y) => clip(x, y) && ((x - cx) / (rx + 0.4)) ** 2 + ((y - cy) / (ry + 0.4)) ** 2 <= 1;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (!inside(x, y)) continue;
      const tl = !inside(x - 1, y) || !inside(x, y - 1), br = !inside(x + 1, y) || !inside(x, y + 1), br2 = !inside(x + 2, y + 1) || !inside(x + 1, y + 2);
      b.set(x, y, br ? ramp[3] : tl ? ramp[0] : br2 ? ramp[2] : ramp[1]);
    }
  }
  const ROCK_LIT = ['wall1', 'wall2', 'wall3', 'wall4'], ROCK_SHADE = ['wall2', 'wall3', 'wall4', 'dirt4'];
  // Layered limestone: three ledges, each lit along its top and shaded under its lip, cracked, with a few jutting blocks.
  function strata(b, x0, x1, top, height, face, seed) {
    for (let x = x0; x < x1; x++) {
      const t = top(x), h = height(x);
      for (let y = t; y < t + h; y++) {
        if (!face(x, y)) continue;
        const v = y - t, w = v + 4 * (vnoise(x / 23, 0, seed) - 0.5), layer = clamp(Math.floor((w / h) * 3), 0, 2), lv = w - (layer * h) / 3, lh = h / 3;
        let c = layer === 1 ? 'wall3' : 'wall2';
        if (lv < 2) c = 'wall1'; else if (lv < 3) c = layer === 1 ? 'wall2' : 'wall1';
        if (lv > lh - 2) c = 'wall4';
        if (v >= h - 2) c = 'dirt4';
        b.set(x, y, c);
      }
    }
    for (const [x, y, q] of scatter(seed + 1, 9, [x0, top(x0) - 4, x1 - x0, 120], (x, y) => face(x, y) && face(x, y + 6), 3)) {
      const len = 3 + ((q * 7) | 0);
      for (let j = 0; j < len; j++) if (face(x + (j > len / 2 ? 1 : 0), y + j)) { b.set(x + (j > len / 2 ? 1 : 0), y + j, 'wall4'); if (face(x - 1, y + j)) b.set(x - 1 + (j > len / 2 ? 1 : 0), y + j, 'wall1'); }
    }
    for (const [x, y, q, r] of scatter(seed + 2, 22, [x0, top(x0) - 4, x1 - x0, 120], face, 2).sort((p, s) => p[1] - s[1]))
      if (q < 0.55) boulder(b, x, y, 6 + ((q * 10) | 0), 4 + ((r * 4) | 0), y - top(x) > height(x) * 0.6 ? ROCK_SHADE : ROCK_LIT, face);
  }
  function cliffFace(b) {
    const face = (x, y) => onCliff(x, y) && !water(x, y) && !onSteps(x, y);
    strata(b, 0, W, cliffTop, () => CLIFF_H, face, 81);
    for (const [x, q, r] of scatter(85, 6, [0, 0, W, 1], () => true, 6).map(([x, , q, r]) => [x, q, r])) { // rubble at the foot
      const y = cliffBot(x) - 1; if (q < 0.5 && beach(x, y + 2) && !water(x, y + 2)) boulder(b, x, y, 2 + ((r * 3) | 0), 2, ROCK_SHADE, (px, py) => !water(px, py) && py < cliffBot(px) + 3);
    }
    for (let x = 0; x < W; x++) {
      const y0 = cliffTop(x); if (water(x, y0) || water(x, y0 - 1)) continue;
      if (x < STEPS.x0 - 4 || x >= STEPS.x1 + 4) { b.set(x, y0 - 2, 'grass1'); b.set(x, y0 - 1, 'grass3'); }
      const m = vnoise(x / 4, 9, 41), n = m > 0.44 ? 1 + (((m - 0.44) * 12) | 0) : 0;
      for (let j = 0; j < n; j++) if (face(x, y0 + j)) b.set(x, y0 + j, j === n - 1 ? 'leaf4' : j ? 'leaf3' : 'grass2');
      const yb = cliffBot(x); if (beach(x, yb)) b.set(x, yb, 'dirt3');
    }
    for (const [vx, len, f] of [[86, 14, 'pink'], [204, 9, 'white'], [338, 16, 'yellow'], [602, 12, 'pink'], [826, 18, 'white'], [962, 10, 'lilac'], [1180, 15, 'pink'], [1290, 8, 'white'], [1438, 13, 'yellow']]) {
      const y0 = cliffTop(vx);
      for (let j = 0; j < len; j++) { b.set(vx + ((j >> 2) & 1), y0 + j, 'leaf3'); if (j % 3 === 1) b.set(vx - 1 + ((j >> 2) & 1) * 2, y0 + j, 'leaf2'); }
      b.set(vx + 1, y0 + len, f); b.set(vx, y0 + len - 4, f);
    }
    // Steps: treads and risers between two cheek walls.
    for (let x = STEPS.x0; x < STEPS.x1; x++) for (let y = cliffTop(x) - 2; y < cliffBot(x); y++) {
      const v = (y - cliffTop(STEPS.x0) + 60) % 6;
      b.set(x, y, v === 0 ? 'stone0' : v < 3 ? 'stone1' : v < 5 ? 'stone2' : 'stone3');
    }
    for (const cx of [STEPS.x0 - 4, STEPS.x1]) for (let y = cliffTop(cx) - 3; y < cliffBot(cx); y++) for (let x = cx; x < cx + 4; x++)
      b.set(x, y, (y + 1) % 7 === 0 ? 'stone4' : x === cx ? 'stone1' : x === cx + 3 ? 'stone3' : 'stone2');
  }
  const HILL_SIDE = 7;
  const onHillSide = (x, y) => x >= HILL.x0 - HILL_SIDE && x < HILL.x0 && y >= forestY(x) - 4 && y < hillFront(HILL.x0) + HILL.faceH;
  function hillFace(b) {
    const face = (x, y) => onHillFace(x, y) && !onHillSteps(x, y);
    for (let x = HILL.x0; x < W; x++) for (let y = 0; y < hillFront(x); y++) { // the plateau, a tone sunnier
      const v = b.get(x, y), up = { [u32('grass2')]: 'grass1', [u32('grass3')]: 'grass2', [u32('grass1')]: 'grass0' }[v];
      if (up && !inForest(x, y)) b.set(x, y, up);
    }
    strata(b, HILL.x0, W, hillFront, () => HILL.faceH, face, 84);
    for (let x = HILL.x0; x < W; x++) for (let y = hillFront(x); y < hillFront(x) + HILL.faceH; y++) if (face(x, y)) { // earth, not stone
      const v = b.get(x, y), to = { [u32('wall1')]: 'dirt1', [u32('wall2')]: 'dirt2', [u32('wall3')]: 'dirt3', [u32('wall4')]: 'dirt4' }[v];
      if (to) b.set(x, y, to);
    }
    // its west side: a grass bank, lit on the rim, shaded where it meets the lower meadow
    for (let y = forestY(HILL.x0) - 4; y < hillFront(HILL.x0) + HILL.faceH; y++) {
      const low = y >= hillFront(HILL.x0) - 2;
      for (let i = 0; i < HILL_SIDE; i++) { const x = HILL.x0 - HILL_SIDE + i; if (!low) b.set(x, y, i < 2 ? 'grass3' : i < 4 ? 'grass2' : i === HILL_SIDE - 1 ? 'grass0' : 'grass1'); }
      if (low) for (let i = 0; i < HILL_SIDE; i++) b.set(HILL.x0 - HILL_SIDE + i, y, y >= hillFront(HILL.x0) + HILL.faceH - 2 ? 'dirt4' : i < 3 ? 'dirt3' : 'dirt2');
      b.set(HILL.x0 - HILL_SIDE - 1, y, 'grass4');
    }
    for (let x = HILL.x0; x < W; x++) { const y0 = hillFront(x); if (x < HILL.steps[0] - 3 || x > HILL.steps[1] + 3) { b.set(x, y0 - 2, 'grass0'); b.set(x, y0 - 1, 'grass3'); } b.set(x, y0 + HILL.faceH, 'grass4'); }
    for (const [vx, len] of [[1430, 9], [1452, 12], [1490, 7], [1512, 10]]) for (let j = 0; j < len; j++) { b.set(vx + ((j >> 2) & 1), hillFront(vx) + j, 'leaf3'); if (j % 3 === 1) b.set(vx - 1, hillFront(vx) + j, 'leaf2'); }
    for (let x = HILL.steps[0]; x < HILL.steps[1]; x++) for (let y = hillFront(x) - 2; y < hillFront(x) + HILL.faceH + 1; y++) {
      const v = (y - hillFront(HILL.steps[0]) + 60) % 5;
      b.set(x, y, x === HILL.steps[0] || x === HILL.steps[1] - 1 ? 'stone3' : v === 0 ? 'stone0' : v < 3 ? 'stone1' : 'stone3');
    }
  }
  function platform(b) {
    const { x0, x1, y0, y1, face } = PLATFORM, r = rng(91);
    for (let y = y0, row = 0; y < y1; y += 6, row++) for (let x = x0 - (row % 2) * 7; x <= x1;) {
      const w = 12 + ((r() * 4) | 0), a = Math.max(x, x0), e = Math.min(x + w, x1 + 1);
      if (e - a > 2) K.stoneBlock(b, a, y, e - a - 1, 5, r() < 0.2 ? ['stone1', 'stone2', 'stone3', 'stone4'] : ['stone0', 'stone1', 'stone2', 'stone3']);
      for (let i = a; i < e; i++) b.set(i, y + 5, 'stone3');
      for (let j = y; j < y + 6; j++) b.set(e - 1, j, 'stone3');
      x += w;
    }
    for (let x = x0; x <= x1; x++) { b.set(x, y1 - 4, (x >> 2) % 2 ? 'cream0' : 'yellow'); b.set(x, y1 - 3, 'cream2'); b.set(x, y1 - 1, 'stone0'); }
    for (let y = y1; y < y1 + face; y++) for (let x = x0; x <= x1; x++)
      b.set(x, y, y === y1 ? 'stone2' : y === y1 + face - 1 ? 'stone5' : (x + (y - y1 > 3 ? 6 : 0)) % 12 === 0 ? 'stone4' : y - y1 === 3 ? 'stone4' : 'stone3');
    for (let x = x0; x <= x1; x++) { const m = vnoise(x / 4, 2, 92); if (m > 0.62) for (let j = 1; j < 1 + ((m - 0.62) * 14 | 0) && j < face; j++) b.set(x, y1 + j, j % 2 ? 'grass3' : 'leaf3'); }
    for (let y = y0; y < y1 + face; y++) { b.set(x0 - 1, y, 'stone4'); b.set(x0, y, 'stone2'); }
  }
  function rails(b) {
    const { x0, x1, y0, y1 } = RAILS, rA = y0 + 6, rB = y1 - 8;
    for (let y = y0; y < y1; y++) for (let x = Math.max(0, x0); x <= x1; x++) {
      const n = vnoise(x / 3, y / 2, 95);
      b.set(x, y, y === y0 ? 'stone4' : y === y0 + 1 ? 'stone3' : n > 0.66 ? 'stone1' : n < 0.3 ? 'stone3' : 'stone2');
    }
    for (let x = Math.max(0, x0); x <= x1 - 4; x += 8) {
      const mossy = hash(x, 1, 96) < 0.4;
      for (let y = y0 + 3; y < y1 - 2; y++) for (let i = 0; i < 4; i++)
        b.set(x + i, y, i === 3 || y === y1 - 3 ? 'wood5' : i === 0 || y === y0 + 3 ? 'wood3' : 'wood4');
      if (mossy) { b.set(x, y0 + 4, 'grass2'); b.set(x + 1, y0 + 4, 'grass2'); b.set(x + 1, y0 + 5, 'grass3'); b.set(x + 2, y1 - 5, 'grass3'); b.set(x + 1, y1 - 4, 'grass2'); }
    }
    for (const ry of [rA, rB]) for (let x = Math.max(0, x0); x <= x1 - 6; x++) {
      const rust = vnoise(x / 5, ry, 97) > 0.6;
      b.set(x, ry - 1, rust ? 'wood2' : 'iron0'); b.set(x, ry, rust ? 'wood3' : 'iron2'); b.set(x, ry + 1, 'iron4');
    }
    // A sapling and grass growing through the ballast, the old line given back to the meadow.
    for (const [gx, gy] of [[96, y0 + 9], [214, y0 + 14], [306, y0 + 4], [372, y0 + 12]]) stamp(b, gx, gy, K.TUFT[3], { d: 'grass3', l: 'grass1' });
  }
  function bridgeDeck(b, BR) {
    const { x0, x1, y0, y1 } = BR;
    for (let x = x0; x <= x1; x++) {
      const k = Math.floor((x - x0) / 6), p = (x - x0) % 6, dark = hash(k, 3 + x0, 77) < 0.25, jig = hash(k, 5 + x0, 77) < 0.3 ? 1 : 0;
      for (let y = y0 + jig; y < y1 + jig - 1; y++) {
        let c = p === 0 ? 'wood3' : p === 1 ? 'wood0' : p === 5 ? 'wood2' : dark ? 'wood2' : 'wood1';
        if (p && y === y0 + jig) c = 'wood2';
        b.set(x, y, c);
      }
      if (p === 3) { b.set(x, y0 + 2 + jig, 'wood3'); b.set(x, y1 - 3 + jig, 'wood3'); }
      b.set(x, y0 - 1 + jig, 'wood4');
      b.set(x, y1, 'wood2'); b.set(x, y1 + 1, 'wood3'); b.set(x, y1 + 2, 'wood4'); b.set(x, y1 + 3, 'wood5');
      for (let y = y1 + 4; y < y1 + 8; y++) if (water(x, y)) b.set(x, y, y < y1 + 6 ? 'water5' : 'water4');
    }
    for (const px of [x0 + 16, ((x0 + x1) >> 1) - 1, x1 - 18]) for (let y = y1 + 4; y < y1 + 10; y++) if (water(px, y)) { b.set(px, y, 'wood2'); b.set(px + 1, y, 'wood3'); b.set(px + 2, y, 'wood4'); }
  }
  function jettyDeck(b) {
    const planks = (x0, x1, y0, y1, seed) => {
      for (let y = y0; y <= y1; y++) {
        const k = Math.floor((y - y0) / 4), p = (y - y0) % 4, dark = hash(k, seed, 78) < 0.25, jog = hash(k, seed + 1, 78) < 0.3 ? 1 : 0;
        for (let x = x0 + jog; x <= x1 + jog; x++) b.set(x, y, x === x0 + jog || x === x1 + jog ? 'wood4' : p === 3 ? 'wood4' : p === 0 ? 'wood0' : dark ? 'wood2' : 'wood1');
      }
      for (let x = x0; x <= x1 + 1; x++) for (let y = y1 + 1; y < y1 + 4; y++) if (water(x, y)) b.set(x, y, y === y1 + 1 ? 'wood4' : 'water5');
      for (let y = y0; y <= y1; y++) if (water(x1 + 2, y)) { b.set(x1 + 2, y, 'water5'); b.set(x1 + 3, y, 'water4'); }
    };
    planks(JETTY.x0, JETTY.x1, JETTY.y0, JETTY.y1, 1);
    const [hx0, hx1, hy0, hy1] = JETTY.head;
    planks(hx0, hx1, hy0, hy1, 9);
    for (const [px, py] of [[JETTY.x0 - 2, 1040], [JETTY.x1 + 1, 1040], [JETTY.x0 - 2, 1072], [JETTY.x1 + 1, 1072], [hx0 - 1, hy1 + 1], [hx1, hy1 + 1], [670, hy1 + 1]])
      for (let y = py; y < py + 4; y++) if (water(px, y) || water(px + 1, y)) { b.set(px, y, 'wood3'); b.set(px + 1, y, 'wood4'); }
  }
  // Chamomile in raised rows, white petals around yellow hearts.
  function garden(b) {
    const { x0, x1, y0, y1 } = GARDEN;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const v = (y - y0) % 12;
      b.set(x, y, v < 8 ? (v === 0 ? 'grass2' : v === 7 ? 'grass4' : 'grass3') : v === 8 ? 'dirt3' : v === 11 ? 'dirt2' : 'dirt2');
    }
    for (const [x, y, q] of scatter(111, 4, [x0 + 2, y0 + 1, x1 - x0 - 6, y1 - y0 - 3], (x, y) => (y - y0) % 12 >= 1 && (y - y0) % 12 <= 4, 3)) {
      stamp(b, x, y + 1, ['l.l', '.l.'], { l: q < 0.5 ? 'grass4' : 'leaf4' });
      stamp(b, x, y - 1, q < 0.75 ? ['.w.', 'wyw', '.w.'] : ['ww', 'wy'], { w: q < 0.15 ? 'cream1' : 'white', y: 'yellow' });
    }
  }
  function wheatBase(b) {
    const { x0, x1, y0, y1 } = WHEAT;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) b.set(x, y, (y - y0) % 6 === 5 ? 'dirt3' : y === y0 ? 'dirt2' : (y - y0) % 6 < 2 ? 'wood1' : 'dirt2');
    for (let x = x0 - 1; x <= x1; x++) { b.set(x, y1, 'grass4'); b.set(x, y0 - 1, 'grass3'); }
  }
  // Wheat stalks drawn every frame: a gust runs across the field and bows the ears it passes.
  const STALKS = [];
  function buildWheat() {
    const { x0, x1, y0, y1 } = WHEAT;
    for (let y = y0 + 4; y < y1 + 1; y += 3) for (let x = x0 + 1 + ((y >> 1) % 2); x < x1 - 1; x += 3) STALKS.push([x, y, (hash(x, y, 7) * 3) | 0]);
  }
  function wheat(ctx, t, v) {
    const g = step(t, 4) % 8;
    for (const [x, y, k] of STALKS) {
      if (x < v.x - 2 || x > v.x + v.w + 2 || y < v.y - 8 || y > v.y + v.h + 2) continue;
      const lean = ((((x - WHEAT.x0) >> 4) - g + 80) % 8) < 2 ? 1 : 0, h = 5 + k;
      R(ctx, x, y - h + 2, 1, h - 2, k === 2 ? 'brass2' : 'wood1');
      R(ctx, x + lean, y - h - 1, 1, 3, k === 1 ? 'brass1' : 'yellow'); D(ctx, x + lean, y - h - 2, 'brass0');
    }
  }
  function tufts(b) {
    const ok = (x, y) => grassy(b, x, y) && grassy(b, x + 6, y + 4) && grassy(b, x, y + 4) && !blocked(x, y);
    for (const [x, y, q] of scatter(81, 6, [0, 0, W, H], ok, 2)) {
      if (q > 0.75) continue;
      const under = b.get(x + 2, y + 2), light = under === u32('grass1') || under === u32('grass0'), rows = K.TUFT[Math.min(3, (q * 7.3) | 0)];
      stamp(b, x, y, rows, light ? { d: 'grass2', l: 'grass0' } : under === u32('grass3') ? { d: 'grass4', l: 'grass2' } : { d: 'grass3', l: 'grass1' });
    }
    for (const [x, y, q] of scatter(82, 9, [0, 0, W, H], (x, y) => sand(x, y) && !sand(x, y - 2) && grassy(b, x, y - 3) && !blocked(x, y)))
      stamp(b, x - 2, y - 3, q < 0.5 ? ['l.l.l', 'd.d.d', '.ddd.'] : ['.l.l', 'd.d.', '.dd.'], { d: 'grass3', l: 'grass1' });
  }
  function flowers(b) {
    const ok = (x, y) => grassy(b, x, y) && !blocked(x, y);
    for (const [x, y, q] of scatter(91, 16, [0, 0, W, H], ok, 2)) {
      const edge = sand(x, y + 6) || sand(x, y - 6) || sand(x + 8, y) || sand(x - 8, y) || water(x, y + 8) || water(x + 8, y) || water(x - 8, y);
      if (q < (edge ? 0.85 : 0.4)) K.flowerPatch(b, x, y, x * 13 + y, ok, 3 + ((q * 5) | 0));
    }
    for (const [x, y, q] of scatter(95, 13, [0, 0, W, H], (x, y) => grassy(b, x, y) && !blocked(x, y) && (sand(x, y + 4) || water(x + 5, y) || water(x - 5, y) || sand(x, y - 4)))) {
      if (q < 0.5) stamp(b, x, y, ['112', '233'], { 1: 'stone1', 2: 'stone2', 3: 'stone3' });
      else stamp(b, x, y, ['02', '3.'], { 0: 'stone0', 2: 'stone2', 3: 'stone3' });
    }
  }

  /* ---------- buildings (each drawn in world coordinates on its own canvas) ---------- */
  const { roof, wall, windowAt, doorAt, gableAt, chimneyAt, bracketSign, onCanvas, moss } = K;
  const SHADOW = (x0, x1, top, base) => [['r', x1 + 1, top + 4, 4, base - top - 2], ['r', x0 + 2, base + 1, x1 - x0 + 2, 3]];
  const RAMP_W = ['wood1', 'wood2', 'wood3', 'wood4'];
  const ICON = {
    ...K.ICON,
    hammer: (x, l, t) => S(x, l + 2, t + 1, ['33333.', '33333.', '..1...', '..1...', '..1...', '..1...'], { 3: 'iron2', 1: 'wood2' }),
    cup: (x, l, t) => S(x, l + 2, t + 2, ['.w.w..', '1111..', '11112.', '1111.2', '.11...'], { 1: 'cream0', 2: 'cream2', w: 'stone1' }),
    camera: (x, l, t) => S(x, l + 1, t + 2, ['..33...', '3333333', '3311133', '3310133', '3333333'], { 3: 'iron3', 1: 'iron0', 0: 'ink2' }),
    salt: (x, l, t) => S(x, l + 2, t + 1, ['..0..', '.010.', '01110', '01110', '.111.'], { 0: 'stone2', 1: 'white' }),
    fish: (x, l, t) => S(x, l + 1, t + 2, ['....1..', '1.11111', '.111101', '1.11111', '....1..'], { 1: 'water3', 0: 'ink2' }),
  };
  // Hand-written clock face: hands at 10:17, the moment Bellwood stopped.
  function clockFace(x, cx, cy, r) {
    E(x, cx, cy, r + 1, r + 1, 'brass3'); E(x, cx, cy, r, r, 'brass1'); E(x, cx, cy, r - 1, r - 1, 'cream0'); E(x, cx - 1, cy - 1, r - 3, r - 3, 'wall0');
    for (let h = 0; h < 12; h++) { const a = (h / 12) * TAU; D(x, Math.round(cx + Math.sin(a) * (r - 2)), Math.round(cy - Math.cos(a) * (r - 2)), h % 3 ? 'stone3' : 'ink2'); }
    const ha = ((10 + 17 / 60) / 12) * TAU, ma = (17 / 60) * TAU;
    L(x, cx, cy, Math.round(cx + Math.sin(ha) * (r - 4)), Math.round(cy - Math.cos(ha) * (r - 4)), 'ink');
    L(x, cx, cy, Math.round(cx + Math.sin(ma) * (r - 2)), Math.round(cy - Math.cos(ma) * (r - 2)), 'ink2');
    D(x, cx, cy, 'red');
  }
  function station() {
    const x0 = 112, x1 = 300, base = 548, top = 500, cx = 206;
    const [c, x] = onCanvas(96, 372, 316, 556);
    wall(x, x0, x1, top, base, { stoneTo: 524, beam: 522, posts: [160, 252], plaster: 'wall1' });
    const wins = [];
    for (const wx of [124, 168, 230, 274]) {
      const boarded = wx === 274;
      wins.push(windowAt(x, wx, 506, 14, 14, { box: wx !== 274, flowers: ['white', 'yellow'] }));
      if (boarded) { for (const [py, d] of [[507, 0], [512, 1], [517, 0]]) { R(x, wx - 2, py + d, 18, 2, 'wood2'); R(x, wx - 2, py + d + 1, 18, 1, 'wood4'); D(x, wx, py + d, 'iron2'); D(x, wx + 13, py + d, 'iron2'); } wins.pop(); }
    }
    doorAt(x, cx - 9, base, 18, 27, { window: true, ramp: ['roofB0', 'roofB1', 'roofB2', 'roofB3'] });
    R(x, cx, base - 27, 1, 27, 'roofB3');
    roof(x, 104, 308, 452, top + 2, 'B', 'slate', 6, 61);
    moss(x, [[128, 474, 3], [258, 488, 3], [170, 492, 2], [282, 470, 2]]);
    // The clock tower, frozen at 10:17.
    const tx0 = cx - 15, tx1 = cx + 15, ttop = 404;
    R(x, tx0, ttop, tx1 - tx0, 76, 'stone1');
    for (let y = ttop + 3, r = 0; y < ttop + 76; y += 6, r++) for (let px = tx0 + (r % 2 ? 4 : 0); px < tx1; px += 9) K.stoneBlock_c(x, px, y, Math.min(8, tx1 - px - 1), 5);
    R(x, tx0, ttop, 2, 76, 'stone0'); R(x, tx1 - 3, ttop, 3, 76, 'stone3'); R(x, tx0 - 1, ttop, 1, 76, 'stone4'); R(x, tx1, ttop, 1, 76, 'stone4');
    R(x, tx0 - 2, ttop + 2, tx1 - tx0 + 4, 3, 'stone2'); R(x, tx0 - 2, ttop + 2, tx1 - tx0 + 4, 1, 'stone0'); R(x, tx0 - 2, ttop + 5, tx1 - tx0 + 4, 1, 'stone4');
    clockFace(x, cx, ttop + 20, 10);
    for (const ly of [ttop + 40, ttop + 52]) { R(x, cx - 3, ly, 6, 8, 'stone4'); R(x, cx - 2, ly + 1, 4, 7, 'ink2'); D(x, cx - 2, ly + 1, 'stone3'); }
    poly(x, [[cx, 372], [tx0 - 4, ttop + 2], [tx1 + 4, ttop + 2]], 'roofB4');
    poly(x, [[cx, 373], [tx0 - 3, ttop + 1], [cx, ttop + 1]], 'roofB1');
    poly(x, [[cx, 373], [cx + 1, ttop + 1], [tx1 + 3, ttop + 1]], 'roofB2');
    for (let y = 380; y < ttop; y += 4) L(x, cx - Math.round((y - 372) * 0.55), y, cx + Math.round((y - 372) * 0.55), y, 'roofB3');
    R(x, cx, 364, 1, 9, 'iron3'); S(x, cx - 3, 366, ['1..1', '.11.'], { 1: 'iron2' });
    R(x, cx - 21, 488, 42, 11, 'wood4'); R(x, cx - 20, 489, 40, 9, 'cream0'); R(x, cx - 20, 497, 40, 1, 'cream2');
    TX(x, 'BELLWOOD', cx - 15, 491, 'roofB4');
    moss(x, [[tx0 + 2, ttop + 66, 3], [tx1 - 8, ttop + 34, 2]]);
    for (let j = 0; j < 22; j++) { D(x, tx1 - 1 - ((j >> 2) & 1), ttop + 44 + j, 'leaf3'); if (j % 3 === 0) D(x, tx1 - 2, ttop + 44 + j, 'leaf2'); }
    return { img: c, ox: 96, oy: 372, y: base, wins, foot: 30, base: [x0, x1], keep: [100, 400, 212, 152], shadow: SHADOW(x0, x1, top, base), name: 'station' };
  }
  // Helen's tea stall at the end of the platform: a counter under a rose awning, jars, cups and a kettle.
  function teaStall() {
    const x0 = 330, x1 = 380, base = 574;
    const [c, x] = onCanvas(322, 520, 388, 580);
    R(x, x0 + 2, 538, x1 - x0 - 4, 22, 'wood3');
    for (let px = x0 + 4; px < x1 - 3; px += 6) R(x, px, 538, 1, 22, 'wood4');
    for (const sy of [544, 552]) { R(x, x0 + 3, sy, x1 - x0 - 6, 2, 'wood1'); R(x, x0 + 3, sy + 2, x1 - x0 - 6, 1, 'wood4'); }
    for (let i = 0; i < 7; i++) { const jx = x0 + 6 + i * 6, col = ['yellow', 'orange', 'leaf2', 'rose', 'wood1', 'yellow', 'leaf3'][i]; R(x, jx, 539 + (i % 2 ? 2 : 0), 4, 5 - (i % 2 ? 2 : 0), 'sky2'); R(x, jx + 1, 541, 2, 3, col); D(x, jx, 539 + (i % 2 ? 2 : 0), 'white'); }
    for (let i = 0; i < 6; i++) S(x, x0 + 6 + i * 7, 547, ['.33.', '3113', '.33.'], { 3: i % 2 ? 'roofG2' : 'cream2', 1: 'cream0' });
    for (const px of [x0, x1 - 3]) { R(x, px, 528, 3, 46, 'wood3'); R(x, px, 528, 1, 46, 'wood2'); R(x, px + 2, 528, 1, 46, 'wood4'); }
    // counter
    R(x, x0 - 1, 558, x1 - x0 + 2, 3, 'wood1'); R(x, x0 - 1, 558, x1 - x0 + 2, 1, 'wood0'); R(x, x0 - 1, 561, x1 - x0 + 2, 1, 'wood4');
    R(x, x0, 562, x1 - x0, 12, 'wood2');
    for (let px = x0 + 3; px < x1; px += 5) R(x, px, 562, 1, 12, 'wood3');
    R(x, x0, 573, x1 - x0, 1, 'wood4');
    R(x, x0 + 6, 564, 22, 7, 'cream0'); R(x, x0 + 7, 565, 20, 5, 'cream1'); TX(x, 'TEA', x0 + 12, 565, 'roofR3');
    // kettle on a small stove, cups and a teapot on the counter
    S(x, x0 + 32, 550, ['..33..', '.3333.', '311113', '311113', '.3333.', '.4..4.'], { 3: 'iron2', 1: 'iron1', 4: 'iron4' });
    S(x, x0 + 31, 545, ['..111..', '.11111.', '1111112', '1111112', '.22222.'], { 1: 'roofG1', 2: 'roofG3' });
    S(x, x0 + 6, 555, ['1111.', '11112', '1111.'], { 1: 'cream0', 2: 'cream2' }); S(x, x0 + 14, 555, ['1111.', '11112', '1111.'], { 1: 'roofR1', 2: 'roofR3' });
    S(x, x0 + 22, 554, ['.11..', '11112', '1111.'], { 1: 'roofB1', 2: 'roofB3' });
    // rose and cream awning
    for (let y = 524; y <= 532; y++) for (let px = x0 - 3 - ((y - 524) >> 2); px <= x1 + 2 + ((y - 524) >> 2); px++) {
      const s = Math.floor((px - x0 + 64) / 5) % 2, lit = y < 526;
      D(x, px, y, s ? (lit ? 'cream0' : y > 530 ? 'cream2' : 'cream1') : lit ? 'roofR0' : y > 530 ? 'roofR2' : 'roofR1');
    }
    for (let px = x0 - 5; px <= x1 + 4; px++) { const s = Math.floor((px - x0 + 64) / 5) % 2, i = (px - x0 + 64) % 5; D(x, px, 533, s ? 'cream1' : 'roofR2'); if (i > 0 && i < 4) D(x, px, 534, s ? 'cream2' : 'roofR3'); }
    R(x, x0 - 4, 523, x1 - x0 + 8, 1, 'roofR3');
    return { img: c, ox: 322, oy: 520, y: base, wins: [{ gx: x0 + 4, gy: 538, gw: x1 - x0 - 8, gh: 20 }], foot: 6, base: [x0, x1], keep: [324, 530, 62, 50], shadow: [['r', x0, base + 1, x1 - x0 + 2, 3]], name: 'tea_stall' };
  }
  // Mender's forge: a stone smithy with an open bay, the anvil and the hearth (its glow is a light of its own).
  function forge() {
    const x0 = 72, x1 = 178, base = 408, top = 372;
    const [c, x] = onCanvas(58, 300, 192, 416);
    wall(x, x0, x1, top, base, { stoneTo: top + 6, plaster: 'stone1' });
    // open bay with the hearth, anvil and tools
    const bx0 = 92, bx1 = 132;
    R(x, bx0, 382, bx1 - bx0, base - 382, 'ink2'); R(x, bx0 + 1, 383, bx1 - bx0 - 2, base - 384, 'stone5');
    R(x, bx0 - 2, 380, bx1 - bx0 + 4, 3, 'wood3'); R(x, bx0 - 2, 380, bx1 - bx0 + 4, 1, 'wood2'); R(x, bx0 - 2, 382, bx1 - bx0 + 4, 1, 'wood5');
    R(x, bx0 + 3, 392, 14, 14, 'stone3'); R(x, bx0 + 3, 392, 14, 1, 'stone2'); R(x, bx0 + 5, 396, 10, 6, 'ink'); R(x, bx0 + 6, 399, 8, 3, 'roofR3');
    S(x, bx0 + 22, 396, ['33333333', '.333333.', '...33...', '..3333..', '.333333.'], { 3: 'iron3' }); R(x, bx0 + 22, 396, 8, 1, 'iron1');
    for (const [tx, ty] of [[bx0 + 34, 386], [bx0 + 37, 387]]) { R(x, tx, ty, 1, 8, 'wood2'); R(x, tx - 1, ty, 3, 2, 'iron2'); }
    R(x, bx0 + 4, 404, 12, 4, 'wood3'); for (let i = 0; i < 4; i++) E(x, bx0 + 6 + i * 3, 404, 1, 1, 'wood1');
    const wins = [windowAt(x, 146, 382, 18, 13, { flowers: ['orange', 'yellow', 'red'] })];
    doorAt(x, 139, base, 0, 0, {}); // the step only
    R(x, 135, base, 30, 4, 'grass2');
    roof(x, 64, 186, 326, top + 2, 'S', 'slate', 5, 71);
    moss(x, [[80, 340, 3], [150, 356, 2]]);
    gableAt(x, 112, 22, 330, top + 2, 'S', { round: 350, braces: true });
    const smoke = chimneyAt(x, 166, 306, 334, 12, ['stone2', 'stone3', 'stone1', 'stone1']);
    bracketSign(x, x1 + 1, 378, 1, 11, 10, ICON.hammer);
    // a rail cart wheel and scrap leaning on the wall
    E(x, 82, 400, 6, 6, 'iron3'); E(x, 82, 400, 4, 4, 'stone1'); E(x, 82, 400, 1, 1, 'iron3'); L(x, 78, 400, 86, 400, 'iron3'); L(x, 82, 396, 82, 404, 'iron3');
    return { img: c, ox: 58, oy: 300, y: base, wins, smoke: [smoke], hearth: [bx0 + 5, 396, 10, 6], foot: 30, base: [x0, x1], keep: [62, 320, 126, 96], shadow: SHADOW(x0, x1, top, base), name: 'forge' };
  }
  // The giant banyan: a crown of lobed clumps on a buttressed trunk, aerial roots and the gap where the shop's door appears.
  function banyan() {
    const T = K.makeTree({ rx: 72, ry: 42, th: 30, tw: 34, seed: 777, pal: K.PAL_DEEP, rMin: 7, rMax: 12 });
    const out = { frames: [], ax: T.ax, ay: T.ay, w: T.w, h: T.h };
    const gx = Math.round(T.ax), gy = Math.round(T.ay);
    for (const f of T.frames) {
      const [c, x] = canvas(T.w, T.h); x.drawImage(f, 0, 0);
      // buttress roots
      for (const [dx, w] of [[-24, 7], [-13, 6], [14, 6], [24, 8]]) {
        for (let y = gy - 22; y <= gy; y++) { const sp = Math.round(((y - gy + 22) / 22) * 3); R(x, gx + dx - sp, y, w + sp, 1, 'wood3'); D(x, gx + dx - sp, y, 'wood2'); D(x, gx + dx + w - 1, y, 'wood4'); }
        R(x, gx + dx - 3, gy, w + 6, 1, 'wood5');
      }
      // aerial roots hanging from the crown
      for (const [dx, y0, len] of [[-58, gy - 60, 40], [-44, gy - 66, 54], [-34, gy - 58, 36], [36, gy - 60, 44], [50, gy - 64, 52], [62, gy - 54, 30], [-8, gy - 70, 26], [8, gy - 72, 30]]) {
        for (let y = y0; y < y0 + len; y++) { D(x, gx + dx + ((y >> 3) & 1), y, 'wood3'); if (y % 5 === 0) D(x, gx + dx + 1 + ((y >> 3) & 1), y, 'wood4'); }
        if (y0 + len > gy - 4) R(x, gx + dx - 1, gy - 1, 4, 1, 'wood4');
      }
      // the root gap: a dark arch between the buttresses
      for (let y = gy - 22; y <= gy - 1; y++) { const hw = y < gy - 16 ? Math.round(Math.sqrt(Math.max(0, 36 - (gy - 16 - y) ** 2))) : 6; R(x, gx - hw, y, hw * 2 + 1, 1, y < gy - 20 ? 'wood5' : 'ink2'); }
      R(x, gx - 6, gy - 1, 13, 1, 'wood5');
      out.frames.push(c);
    }
    return out;
  }
  // The shop's door in the root gap: warm light, a tiny round window and a bell, for the nights it is there.
  function shopDoor(ctx, gx, gy, t) {
    const fl = (step(t, 6) % 9 === 0);
    for (let y = gy - 21; y <= gy - 1; y++) { const hw = y < gy - 15 ? Math.round(Math.sqrt(Math.max(0, 25 - (gy - 15 - y) ** 2))) : 5; R(ctx, gx - hw, y, hw * 2 + 1, 1, y < gy - 19 ? 'light3' : fl ? 'light1' : 'light2'); }
    R(ctx, gx - 4, gy - 14, 9, 13, 'roofG2'); R(ctx, gx - 4, gy - 14, 1, 13, 'roofG1'); R(ctx, gx + 4, gy - 14, 1, 13, 'roofG3');
    E(ctx, gx, gy - 10, 2, 2, 'light0'); D(ctx, gx + 2, gy - 6, 'brass1');
    ctx.globalAlpha = 0.25; PX.ellipse(ctx, gx, gy + 3, 14, 3, P.light2); PX.ellipse(ctx, gx, gy + 3, 8, 2, P.light1); ctx.globalAlpha = 1;
  }
  // Seven lanterns hung in the banyan's roots: one goes out each night (shop_lantern_0..6).
  const LANTERNS = [[268, 318], [286, 300], [304, 290], [334, 284], [362, 290], [380, 300], [398, 316]];
  function lantern(ctx, i, t, lit) {
    const [lx, ly] = LANTERNS[i];
    L(ctx, lx, ly - 8, lx, ly - 1, 'wood4');
    S(ctx, lx - 3, ly, K.LANTERN, lit ? { 4: 'iron3', 2: 'brass2', 1: 'brass1', 3: 'brass3', g: (step(t, 7) + i) % 11 ? 'light1' : 'light2', G: 'light0', w: 'light2' } : K.LANTERN_OFF);
    if (lit) { ctx.globalAlpha = 0.3; PX.ellipse(ctx, lx, ly + 4, 6, 6, P.light1); ctx.globalAlpha = 1; }
  }
  function hall() {
    const x0 = 690, x1 = 854, base = 428, top = 384, cx = 772;
    const [c, x] = onCanvas(676, 280, 868, 436);
    wall(x, x0, x1, top, base, { stoneTo: 414, beam: 412, posts: [726, 744, 800, 818], plaster: 'wall0' });
    const wins = [];
    for (const wx of [700, 750, 782, 832]) wins.push(windowAt(x, wx, 392, 14, 16, { shutters: ['roofR1', 'roofR3'], box: false }));
    doorAt(x, cx - 10, base, 20, 30, { ramp: ['roofR0', 'roofR1', 'roofR2', 'roofR3'] });
    R(x, cx, base - 30, 1, 30, 'roofR3');
    roof(x, 682, 862, 330, top + 2, 'R', 'barrel', 6, 81);
    gableAt(x, cx, 34, 326, top + 2, 'R', { round: 350, braces: true });
    R(x, cx - 17, 368, 34, 11, 'wood4'); R(x, cx - 16, 369, 32, 9, 'cream0'); R(x, cx - 16, 377, 32, 1, 'cream2');
    TX(x, 'HALL', cx - 7, 371, 'roofR4');
    // the bell turret on the ridge: Bellwood's bell
    R(x, cx - 7, 300, 14, 24, 'wall1'); R(x, cx - 7, 300, 2, 24, 'wall0'); R(x, cx + 5, 300, 2, 24, 'wall3');
    R(x, cx - 4, 304, 8, 12, 'ink2'); S(x, cx - 3, 306, ['.11..', '1111.', '11112', '22222', '..3..'], { 1: 'brass1', 2: 'brass2', 3: 'brass3' });
    poly(x, [[cx, 284], [cx - 11, 301], [cx + 11, 301]], 'roofR4'); poly(x, [[cx, 285], [cx - 10, 300], [cx, 300]], 'roofR1'); poly(x, [[cx, 285], [cx + 1, 300], [cx + 10, 300]], 'roofR2');
    R(x, cx, 280, 1, 5, 'iron3'); D(x, cx + 1, 281, 'brass1'); D(x, cx + 2, 281, 'brass1');
    return { img: c, ox: 676, oy: 280, y: base, wins, foot: 34, base: [x0, x1], keep: [680, 300, 186, 136], shadow: SHADOW(x0, x1, top, base), name: 'hall' };
  }
  function bakery() {
    const x0 = 540, x1 = 650, base = 482, top = 448;
    const [c, x] = onCanvas(526, 388, 664, 490);
    wall(x, x0, x1, top, base, { posts: [582, 627] });
    const wins = [windowAt(x, 552, 457, 20, 13, { shutters: ['cap1', 'cap3'] }), windowAt(x, 630, 457, 14, 13, { flowers: ['yellow', 'white', 'orange'] })];
    doorAt(x, 605, base, 14, 25, { window: true });
    roof(x, 534, 656, 408, top + 2, 'R', 'barrel', 5, 11);
    gableAt(x, 596, 25, 413, top + 2, 'R', { round: 435 });
    const smoke = chimneyAt(x, 640, 396, 418, 10, ['roofR2', 'roofR3', 'roofR1', 'roofR1']);
    bracketSign(x, x0 - 1, 453, -1, 13, 9, ICON.bread);
    return { img: c, ox: 526, oy: 388, y: base, wins, smoke: [smoke], foot: 30, base: [x0, x1], keep: [528, 404, 132, 86], shadow: SHADOW(x0, x1, top, base), name: 'bakery' };
  }
  // Mia's vegetable stalls: two counters under green awnings (two flutter frames).
  function stalls() {
    const ox = 890, oy = 500, frames = [];
    for (let f = 0; f < 2; f++) {
      const [c, x] = canvas(112, 70);
      for (const px of [4, 52, 56, 104]) { R(x, px, 14, 3, 54, 'wood3'); R(x, px, 14, 1, 54, 'wood2'); R(x, px + 2, 14, 1, 54, 'wood4'); }
      for (const [l, r, goods] of [[2, 54, [['greens', 6], ['apples', 22], ['oranges', 36]]], [54, 108, [['pears', 58], ['greens', 74], ['apples', 88]]]]) {
        R(x, l + 1, 46, r - l - 2, 4, 'wood4'); R(x, l + 2, 47, r - l - 4, 2, 'wood1');
        R(x, l + 2, 50, r - l - 4, 15, 'wood2'); for (let px = l + 6; px < r - 2; px += 7) R(x, px, 51, 1, 14, 'wood3');
        R(x, l + 2, 50, r - l - 4, 6, 'cream0'); for (let px = l + 2; px < r - 2; px++) D(x, px, 56, px % 6 < 3 ? 'cap2' : 'cream1');
        R(x, l + 1, 65, r - l - 2, 1, 'wood4');
        for (const [k, px] of goods) x.drawImage(K.crate(k).img, px, 32);
        K.awning(x, l + 1, r - 2, 10, 20, 5);
        if (f) for (let px = l; px <= r - 1; px++) { const i = (px - l - 1 + 64) % 5, s = Math.floor((px - l - 1 + 64) / 5) % 2; if (i > 0 && i < 4 && s) { D(x, px, 23, 'cream2'); D(x, px, 24, 'cap4'); } }
      }
      R(x, 40, 1, 32, 9, 'wood4'); R(x, 41, 2, 30, 7, 'cream0'); R(x, 41, 8, 30, 1, 'cream2'); TX(x, "MIA'S", 46, 3, 'cap4');
      // pumpkins and a basket on the ground
      S(x, 10, 62, ['.oo.oo.', 'oyoooyo', 'ooooooo', '.33.33.'], { o: 'orange', y: 'yellow', 3: 'wood4' });
      x.drawImage(K.basket().img, 92, 58);
      frames.push(c);
    }
    return { frames, ox, oy, y: oy + 66, foot: 5, keep: [ox, oy + 12, 112, 58], shadow: [['r', ox + 3, oy + 66, 106, 3]], name: 'mia_stalls', lamp: [ox + 106, oy + 26] };
  }
  // The walnut-shell fountain: a round stone basin, a carved walnut on a pedestal and its spouts (four frames).
  function fountain() {
    const [cx, cy] = FOUNTAIN, frames = [];
    for (let f = 0; f < 4; f++) {
      const [c, x] = canvas(64, 56), ox = cx - 32, oy = cy - 44, X = px => px - ox, Y = py => py - oy;
      E(x, X(cx), Y(cy), 28, 11, 'stone4'); E(x, X(cx), Y(cy) - 1, 27, 10, 'stone1'); E(x, X(cx), Y(cy) - 2, 24, 8, 'stone3'); E(x, X(cx), Y(cy) - 2, 23, 7, 'water3');
      E(x, X(cx) - 3, Y(cy) - 4, 17, 4, 'water2');
      for (let i = 0; i < 3; i++) { const r = 6 + ((f + i * 4) % 12) * 1.4, ry = Math.max(1, Math.round(r * 0.35)); for (let a = 0; a < 24; a++) { if ((a + f) % 3 === 0) continue; const t = (a / 24) * TAU; D(x, Math.round(X(cx) + Math.cos(t) * r), Math.round(Y(cy) - 2 + Math.sin(t) * ry), 'water1'); } }
      R(x, X(cx) - 27, Y(cy) + 1, 55, 4, 'stone2'); R(x, X(cx) - 27, Y(cy) + 1, 55, 1, 'stone1');
      for (let px = X(cx) - 26; px < X(cx) + 27; px += 7) R(x, px, Y(cy) + 2, 1, 3, 'stone3');
      R(x, X(cx) - 26, Y(cy) + 5, 53, 1, 'stone4');
      // pedestal and the walnut shell (ridged, two halves parted like a cup)
      R(x, X(cx) - 3, Y(cy) - 16, 7, 14, 'stone1'); R(x, X(cx) - 3, Y(cy) - 16, 2, 14, 'stone0'); R(x, X(cx) + 2, Y(cy) - 16, 2, 14, 'stone3');
      E(x, X(cx), Y(cy) - 22, 10, 7, 'wood4'); E(x, X(cx), Y(cy) - 23, 9, 6, 'wood2'); E(x, X(cx) - 2, Y(cy) - 25, 6, 3, 'wood1');
      for (const dx of [-6, -2, 2, 6]) L(x, X(cx) + dx, Y(cy) - 28, X(cx) + dx + (dx > 0 ? 1 : -1), Y(cy) - 17, 'wood3');
      E(x, X(cx), Y(cy) - 28, 8, 2, 'wood4'); E(x, X(cx), Y(cy) - 28, 7, 1, 'water2');
      // spouts: arcs of water falling into the basin, stepped
      for (const s of [-1, 1]) for (let k = 0; k < 9; k++) {
        const px = X(cx) + s * (3 + k * 1.7), py = Y(cy) - 31 + Math.round((k - 3) ** 2 * 0.55);
        D(x, Math.round(px), py, (k + f) % 4 === 0 ? 'white' : 'water1'); if ((k + f) % 2) D(x, Math.round(px), py + 1, 'water2');
      }
      R(x, X(cx) - 1, Y(cy) - 36, 3, 6, 'water1'); D(x, X(cx), Y(cy) - 37 - (f % 2), 'white'); D(x, X(cx) - 1 + (f % 3), Y(cy) - 34, 'white');
      frames.push(c);
    }
    return { frames, ox: cx - 32, oy: cy - 44, y: cy + 6, foot: 12, keep: [cx - 32, cy - 14, 64, 22], shadow: [[cx + 3, cy + 5, 27, 4]], name: 'fountain' };
  }
  // A stilt house: a timber room raised on posts, a porch and stairs down to the ground.
  function stiltHouse(o) {
    const { x0, x1, floor, ground, name, rampKey, seed, stair, plaster } = o, top = floor - 30;
    const [c, x] = onCanvas(x0 - 14, top - 50, x1 + 14, ground + 6);
    // stilts and the shade under the floor
    R(x, x0 + 2, floor, x1 - x0 - 2, ground - floor, 'leaf5');
    for (let px = x0 + 1; px < x1; px += 14) for (let y = floor; y < ground; y++) { D(x, px, y, 'wood2'); D(x, px + 1, y, 'wood3'); D(x, px + 2, y, 'wood4'); }
    for (let px = x0 + 4; px < x1 - 4; px += 14) { L(x, px, floor + 2, px + 10, ground - 3, 'wood4'); L(x, px + 10, floor + 2, px, ground - 3, 'wood4'); }
    R(x, x0 - 2, ground - 1, x1 - x0 + 5, 1, 'wood5');
    // floor beam and porch
    R(x, x0 - 4, floor - 1, x1 - x0 + 9, 4, 'wood2'); R(x, x0 - 4, floor - 1, x1 - x0 + 9, 1, 'wood1'); R(x, x0 - 4, floor + 3, x1 - x0 + 9, 1, 'wood5');
    wall(x, x0, x1, top, floor, { posts: o.posts || [], plaster: plaster || 'wall1', plinth: 3 });
    const wins = (o.windows || []).map(([wx, ww]) => windowAt(x, wx, top + 9, ww, 12, { shutters: o.shutters, flowers: o.flowers }));
    const [dx, dw] = stair;
    doorAt(x, dx, floor - 1, dw, 24, { ramp: o.doorRamp });
    // railing along the porch
    for (let px = x0 - 4; px <= x1 + 4; px += 5) if (px < dx - 4 || px > dx + dw + 3) R(x, px, floor - 8, 1, 7, 'wood3');
    for (const ry of [floor - 8, floor - 4]) for (let px = x0 - 4; px <= x1 + 4; px++) if (px < dx - 4 || px > dx + dw + 3) D(x, px, ry, ry === floor - 8 ? 'wood1' : 'wood3');
    // stairs down to the ground
    for (let y = floor + 3, k = 0; y < ground; y += 4, k++) { R(x, dx - 2, y, dw + 4, 2, 'wood1'); R(x, dx - 2, y + 2, dw + 4, 1, 'wood3'); R(x, dx - 2, y + 3, dw + 4, 1, 'leaf5'); }
    for (const sx of [dx - 3, dx + dw + 2]) { R(x, sx, floor + 2, 1, ground - floor - 2, 'wood4'); R(x, sx, floor - 6, 1, 8, 'wood3'); }
    roof(x, x0 - 8, x1 + 8, top - 40, top + 2, rampKey, o.tiles || 'barrel', 5, seed);
    if (o.gable) gableAt(x, o.gable, 18, top - 44, top + 2, rampKey, { round: top - 22 });
    const smoke = o.chimney ? chimneyAt(x, o.chimney, top - 46, top - 30, 8, ['stone2', 'stone3', 'stone1']) : null;
    if (o.sign) bracketSign(x, x1 + 1, top + 6, 1, 11, 10, o.sign);
    return { img: c, ox: x0 - 14, oy: top - 50, y: ground, wins, smoke: smoke ? [smoke] : [], foot: ground - floor + 4, base: [x0 - 4, x1 + 4], keep: [x0 - 6, top - 44, x1 - x0 + 12, ground - top + 48], shadow: [['r', x0 - 2, ground, x1 - x0 + 6, 3], ['r', x1 + 5, floor + 4, 3, ground - floor - 4]], name };
  }
  // Pip's twig swing: two leaning sticks a side, a crossbar and a seat swinging on ropes (six frames).
  function swing() {
    const cx = 1284, base = 432, frames = [];
    for (let f = 0; f < 6; f++) {
      const [c, x] = canvas(40, 40), ox = cx - 20, oy = base - 37, X = px => px - ox;
      for (const s of [-1, 1]) { L(x, X(cx) + s * 16, 37, X(cx) + s * 12, 4, 'wood3'); L(x, X(cx) + s * 9, 37, X(cx) + s * 12, 4, 'wood3'); L(x, X(cx) + s * 16 + 1, 37, X(cx) + s * 12 + 1, 4, 'wood4'); }
      R(x, X(cx) - 15, 3, 31, 2, 'wood2'); R(x, X(cx) - 15, 3, 31, 1, 'wood1'); R(x, X(cx) - 15, 5, 31, 1, 'wood4');
      for (const s of [-1, 1]) { S(x, X(cx) + s * 13 - 1, 1, ['l.l', '.l.'], { l: 'leaf2' }); D(x, X(cx) + s * 13, 0, 'leaf1'); }
      const sw = [0, 2, 3, 2, 0, -2][f] + [0, 0, 0, 0, 0, 0][f], seatX = X(cx) + sw * 2, seatY = 28 - Math.abs(sw) * 0;
      L(x, X(cx) - 5, 6, seatX - 5, seatY, 'dirt3'); L(x, X(cx) + 5, 6, seatX + 5, seatY, 'dirt3');
      R(x, seatX - 7, seatY, 15, 2, 'wood1'); R(x, seatX - 7, seatY + 2, 15, 1, 'wood4');
      frames.push(c);
    }
    return { frames, ox: cx - 20, oy: base - 37, y: base, foot: 3, keep: [cx - 18, base - 8, 36, 10], shadow: [[cx, base, 14, 2]], name: 'swing' };
  }
  function shed() {
    const x0 = 1392, x1 = 1434, base = 606, top = 580;
    const [c, x] = onCanvas(1380, 540, 1446, 612);
    R(x, x0, top, x1 - x0, base - top, 'wood2');
    for (let px = x0; px < x1; px += 5) { R(x, px, top, 1, base - top, 'wood3'); D(x, px + 2, top + 4 + (px % 7), 'wood3'); }
    R(x, x0, top, 2, base - top, 'wood1'); R(x, x0 - 1, top, 1, base - top, 'wood5'); R(x, x1, top, 1, base - top, 'wood5'); R(x, x0, base - 1, x1 - x0, 1, 'wood5');
    doorAt(x, 1406, base, 12, 21, { ramp: ['cap0', 'cap1', 'cap3', 'cap4'] });
    const wins = [windowAt(x, 1422, 586, 9, 8, { box: false })];
    roof(x, x0 - 6, x1 + 6, 552, top + 2, 'G', 'barrel', 4, 91);
    // a rake, a spade, a watering can and pots of seedlings
    L(x, x0 - 3, base - 1, x0 - 1, top + 2, 'wood3'); S(x, x0 - 5, top, ['1.1.1', '11111'], { 1: 'iron2' });
    S(x, x1 + 2, base - 7, ['.11...', '1111.1', '111111', '1111..'], { 1: 'roofB1' });
    for (const [px, fl] of [[1384, 'white'], [1442, 'yellow']]) { R(x, px - 2, base - 4, 5, 4, 'roofR2'); R(x, px - 3, base - 5, 7, 1, 'roofR1'); D(x, px, base - 7, fl); D(x, px - 1, base - 6, 'leaf3'); D(x, px + 1, base - 6, 'leaf3'); }
    return { img: c, ox: 1380, oy: 540, y: base, wins, foot: 20, base: [x0, x1], keep: [1382, 556, 62, 56], shadow: SHADOW(x0, x1, top, base), name: 'shed' };
  }
  function busStop() {
    const x0 = 1474, x1 = 1526, base = 478;
    const [c, x] = onCanvas(1462, 430, 1534, 484);
    R(x, x0 + 2, 448, x1 - x0 - 4, 26, 'wood2');
    for (let px = x0 + 4; px < x1 - 2; px += 6) R(x, px, 448, 1, 26, 'wood3');
    for (const px of [x0, x1 - 3]) { R(x, px, 442, 3, 36, 'wood3'); R(x, px, 442, 1, 36, 'wood2'); R(x, px + 2, 442, 1, 36, 'wood4'); }
    R(x, x0 + 3, 466, x1 - x0 - 6, 3, 'wood1'); R(x, x0 + 3, 469, x1 - x0 - 6, 1, 'wood4'); R(x, x0 + 6, 470, 2, 6, 'wood4'); R(x, x1 - 9, 470, 2, 6, 'wood4');
    poly(x, [[x0 - 5, 444], [x1 + 4, 438], [x1 + 4, 443], [x0 - 5, 449]], 'roofG3');
    poly(x, [[x0 - 4, 444], [x1 + 3, 438], [x1 + 3, 441], [x0 - 4, 447]], 'roofG1');
    // timetable and the round sign on its pole
    R(x, x0 + 8, 452, 14, 10, 'cream0'); for (let k = 454; k < 461; k += 2) R(x, x0 + 10, k, 10, 1, 'stone2');
    R(x, 1466, 440, 2, 38, 'iron3'); R(x, 1466, 440, 1, 38, 'iron1'); E(x, 1467, 437, 6, 6, 'red'); E(x, 1467, 437, 5, 5, 'white'); TX(x, 'BUS', 1462, 435, 'red');
    return { img: c, ox: 1462, oy: 430, y: base, wins: [], foot: 32, base: [x0, x1], keep: [1460, 438, 72, 42], shadow: [['r', x0, base + 1, x1 - x0 + 2, 3]], name: 'bus_stop' };
  }
  // Satria's childhood home in the quiet valley corner.
  function home() {
    const x0 = 1300, x1 = 1396, base = 836, top = 804;
    const [c, x] = onCanvas(1280, 744, 1416, 844);
    wall(x, x0, x1, top, base, { posts: [1331, 1357], plaster: 'wall0' });
    const wins = [windowAt(x, 1309, 813, 16, 11, { shutters: ['roofB1', 'roofB3'] }), windowAt(x, 1367, 813, 18, 11, { flowers: ['rose', 'yellow', 'white'] })];
    doorAt(x, 1337, base, 14, 25, { ramp: ['roofB0', 'roofB1', 'roofB2', 'roofB3'] });
    roof(x, 1294, 1402, 766, top + 2, 'S', 'slate', 5, 37);
    moss(x, [[1308, 780, 3], [1372, 796, 2], [1358, 774, 2]]);
    gableAt(x, 1344, 19, 771, top + 2, 'S', { round: 790 });
    const smoke = chimneyAt(x, 1382, 754, 774, 8, ['stone2', 'stone3', 'stone1']);
    // the mailbox by the door
    R(x, 1322, 822, 1, 14, 'wood3'); R(x, 1318, 817, 9, 6, 'roofR2'); R(x, 1318, 817, 9, 1, 'roofR1'); R(x, 1319, 822, 7, 1, 'roofR3'); D(x, 1326, 818, 'yellow');
    return { img: c, ox: 1280, oy: 744, y: base, wins, smoke: [smoke], foot: 30, base: [x0, x1], keep: [1288, 760, 120, 84], shadow: SHADOW(x0, x1, top, base), name: 'home' };
  }
  function leoHut() {
    const x0 = 1446, x1 = 1494, base = 254, top = 228;
    const [c, x] = onCanvas(1436, 168, 1512, 260);
    // the lookout: a ladder tower behind the hut
    for (const px of [1490, 1504]) { R(x, px, 178, 2, 76, 'wood3'); R(x, px, 178, 1, 76, 'wood2'); }
    for (let y = 184; y < 250; y += 7) R(x, 1490, y, 16, 1, 'wood4');
    R(x, 1486, 176, 24, 3, 'wood2'); R(x, 1486, 176, 24, 1, 'wood1'); for (let px = 1486; px < 1510; px += 4) R(x, px, 170, 1, 6, 'wood3'); R(x, 1486, 170, 24, 1, 'wood1');
    R(x, x0, top, x1 - x0, base - top, 'wood2');
    for (let y = top + 3; y < base; y += 4) R(x, x0, y, x1 - x0, 1, 'wood3');
    R(x, x0, top, x1 - x0, 1, 'wood1'); R(x, x0 - 1, top, 1, base - top, 'wood5'); R(x, x1, top, 1, base - top, 'wood5'); R(x, x0, base - 1, x1 - x0, 1, 'wood5');
    doorAt(x, 1462, base, 12, 21, {});
    const wins = [windowAt(x, 1450, 234, 9, 9, { box: false }), windowAt(x, 1480, 234, 9, 9, { box: false })];
    roof(x, x0 - 6, x1 + 6, 200, top + 2, 'R', 'barrel', 4, 101);
    // a pennant on the tower, and his old spiked shoes hung by the door
    R(x, 1508, 158, 1, 18, 'iron3'); poly(x, [[1509, 158], [1521, 161], [1509, 165]], 'red'); D(x, 1510, 159, 'rose');
    S(x, 1477, 242, ['.1.1', '1111', '2.2.'], { 1: 'blue', 2: 'iron1' });
    return { img: c, ox: 1436, oy: 168, y: base, wins, foot: 18, base: [x0, x1], keep: [1438, 196, 72, 64], shadow: SHADOW(x0, x1, top, base), name: 'leo_hut' };
  }
  function studio() {
    const x0 = 862, x1 = 944, base = 906, top = 876;
    const [c, x] = onCanvas(848, 820, 958, 914);
    wall(x, x0, x1, top, base, { posts: [892], plaster: 'wall0' });
    const wins = [windowAt(x, 870, 884, 16, 11, { flowers: ['white', 'lilac', 'blue'] }), windowAt(x, 922, 884, 14, 11, { box: false })];
    doorAt(x, 897, base, 14, 24, { ramp: ['roofB0', 'roofB1', 'roofB2', 'roofB3'], window: true });
    roof(x, 856, 950, 840, top + 2, 'B', 'slate', 5, 111);
    // the big skylight he works by
    R(x, 878, 846, 30, 18, 'roofB4'); R(x, 879, 847, 28, 16, 'sky2'); R(x, 879, 856, 28, 7, 'sky3'); R(x, 892, 847, 1, 16, 'roofB4'); R(x, 879, 854, 28, 1, 'roofB4');
    for (let k = 0; k < 3; k++) { D(x, 881 + k, 850 - k, 'white'); D(x, 882 + k, 850 - k, 'white'); }
    const smoke = chimneyAt(x, 934, 830, 848, 8, ['stone2', 'stone3', 'stone1']);
    bracketSign(x, x0 - 1, 882, -1, 13, 10, ICON.camera);
    wins.push({ gx: 879, gy: 847, gw: 28, gh: 16 });
    return { img: c, ox: 848, oy: 820, y: base, wins, smoke: [smoke], foot: 26, base: [x0, x1], keep: [852, 836, 104, 78], shadow: SHADOW(x0, x1, top, base), name: 'studio' };
  }
  // The little fog lighthouse on the cliff point: red and white bands, a gallery and the lamp room.
  function lighthouse() {
    const cx = 1004, base = cliffTop(1004) - 6, h = 74;
    const [c, x] = onCanvas(cx - 20, base - h - 18, cx + 21, base + 4);
    for (let y = base - h; y < base; y++) {
      const v = (y - (base - h)) / h, hw = Math.round(6 + v * 4), band = Math.floor((y - (base - h)) / 12) % 2;
      for (let px = cx - hw; px <= cx + hw; px++) {
        const lit = px < cx - hw + 3, shade = px > cx + hw - 3;
        D(x, px, y, band ? (lit ? 'roofR0' : shade ? 'roofR3' : 'red') : lit ? 'white' : shade ? 'stone2' : 'cream0');
      }
      D(x, cx - hw - 1, y, band ? 'roofR4' : 'stone3'); D(x, cx + hw + 1, y, band ? 'roofR4' : 'stone4');
    }
    for (const wy of [base - 56, base - 30]) { R(x, cx - 2, wy, 4, 6, 'ink2'); R(x, cx - 1, wy + 1, 2, 4, 'sky2'); }
    R(x, cx - 3, base - 12, 7, 12, 'wood4'); R(x, cx - 2, base - 11, 5, 11, 'wood2'); D(x, cx + 1, base - 6, 'brass1');
    // gallery, lamp room and dome
    R(x, cx - 10, base - h - 2, 21, 3, 'iron3'); R(x, cx - 10, base - h - 2, 21, 1, 'iron1');
    for (let px = cx - 9; px <= cx + 9; px += 3) R(x, px, base - h - 7, 1, 5, 'iron3'); R(x, cx - 10, base - h - 7, 21, 1, 'iron2');
    R(x, cx - 5, base - h - 13, 11, 11, 'iron4'); R(x, cx - 4, base - h - 12, 9, 9, 'sky2'); R(x, cx - 4, base - h - 12, 2, 9, 'sky1'); R(x, cx, base - h - 12, 1, 9, 'iron3');
    E(x, cx, base - h - 14, 6, 3, 'roofR3'); E(x, cx - 1, base - h - 15, 4, 2, 'roofR1'); R(x, cx, base - h - 18, 1, 3, 'iron3');
    // rocks at its foot
    for (const [rx, ry, w] of [[cx - 13, base, 7], [cx + 10, base + 1, 8], [cx - 4, base + 2, 5]]) { E(x, rx, ry, w, 3, 'stone3'); E(x, rx - 1, ry - 1, w - 2, 2, 'stone1'); }
    return { img: c, ox: cx - 20, oy: base - h - 18, y: base, wins: [{ gx: cx - 4, gy: base - h - 12, gw: 9, gh: 9 }], foot: 6, keep: [cx - 18, base - 10, 38, 14], shadow: [[cx + 3, base + 1, 12, 3]], name: 'lighthouse', beam: [cx, base - h - 8] };
  }
  // Arlo's salt store on the beach: a plank shed, sacks of salt and a heap of crystals.
  function saltStore() {
    const x0 = 550, x1 = 626, base = 1030, top = 1000;
    const [c, x] = onCanvas(536, 950, 640, 1036);
    R(x, x0, top, x1 - x0, base - top, 'wood2');
    for (let px = x0; px < x1; px += 6) { R(x, px, top, 1, base - top, 'wood3'); D(x, px + 3, top + 6 + (px % 11), 'wood3'); }
    R(x, x0, top, 2, base - top, 'wood1'); R(x, x0 - 1, top, 1, base - top, 'wood5'); R(x, x1, top, 1, base - top, 'wood5'); R(x, x0, base - 1, x1 - x0, 1, 'wood5');
    for (let px = x0; px < x1; px++) { const s = vnoise(px / 3, 1, 121); if (s > 0.5) R(x, px, top + 18, 1, Math.round((s - 0.5) * 10), 'cream1'); }
    doorAt(x, 578, base, 18, 24, { ramp: ['wood1', 'wood2', 'wood3', 'wood4'] });
    const wins = [windowAt(x, 606, 1006, 12, 9, { box: false })];
    roof(x, x0 - 6, x1 + 6, 964, top + 2, 'S', 'slate', 5, 131);
    bracketSign(x, x0 - 1, 1004, -1, 11, 9, ICON.salt);
    for (const [sx, sy] of [[538, 1028], [546, 1030], [541, 1022]]) { R(x, sx - 3, sy - 6, 8, 7, 'cream1'); R(x, sx - 2, sy - 7, 6, 1, 'cream0'); R(x, sx + 4, sy - 5, 1, 6, 'cream2'); D(x, sx, sy - 8, 'dirt3'); }
    for (let k = 0; k < 7; k++) R(x, 628 + k, 1030 - (k < 4 ? k * 2 : (6 - k) * 2), 1, (k < 4 ? k * 2 : (6 - k) * 2) + 1, k < 3 ? 'white' : 'stone1');
    return { img: c, ox: 536, oy: 950, y: base, wins, foot: 26, base: [x0, x1], keep: [538, 964, 100, 72], shadow: SHADOW(x0, x1, top, base), name: 'salt_store' };
  }
  // Arlo's boat beside the jetty head, bobbing (four frames).
  function boat() {
    const ox = 728, oy = 1084, frames = [];
    for (let f = 0; f < 4; f++) {
      const [c, x] = canvas(48, 32), b = [0, 1, 1, 0][f];
      R(x, 20, 1 + b, 2, 18, 'wood3'); R(x, 20, 1 + b, 1, 18, 'wood2'); poly(x, [[22, 2 + b], [36, 14 + b], [22, 14 + b]], 'cream0'); poly(x, [[22, 3 + b], [33, 13 + b], [22, 13 + b]], 'white');
      poly(x, [[2, 18 + b], [46, 18 + b], [40, 27 + b], [8, 27 + b]], 'wood4');
      poly(x, [[3, 18 + b], [45, 18 + b], [40, 25 + b], [8, 25 + b]], 'wood2');
      R(x, 4, 18 + b, 41, 2, 'wood1'); R(x, 6, 21 + b, 37, 2, 'roofB2'); R(x, 6, 21 + b, 37, 1, 'roofB1');
      for (let px = 8; px < 41; px += 6) D(x, px, 22 + b, 'cream0');
      R(x, 9, 26 + b, 31, 1, 'water5'); R(x, 6, 28, 37, 1, (f % 2) ? 'water1' : 'water0'); R(x, 4, 29, 4, 1, 'water1'); R(x, 41, 29, 4, 1, 'water1');
      frames.push(c);
    }
    return { frames, ox, oy, y: oy + 27, foot: 0, keep: [ox, oy, 48, 32], name: 'boat' };
  }

  /* ---------- small builds for this world ---------- */
  // The tunnel mouth at the west edge: a grassy hillock with a stone portal over the line.
  function tunnel() {
    const [c, x] = onCanvas(0, 506, 56, 626), ry = RAILS.y0, rb = RAILS.y1, cx = 22;
    const mound = (px, py) => ((px + 4) / 50) ** 2 + ((py - 566) / 50) ** 2 < 1 && py < 592;
    for (let py = 510; py < 592; py++) for (let px = 0; px < 56; px++) if (mound(px, py)) {
      const edge = !mound(px + 1, py) || !mound(px, py + 1) || !mound(px, py - 1), lit = !mound(px - 3, py - 3) || !mound(px, py - 4);
      D(x, px, py, edge ? 'grass4' : lit ? 'grass1' : vnoise(px / 5, py / 4, 141) > 0.6 ? 'grass3' : 'grass2');
    }
    for (const [bx, by, s] of [[10, 540, 5], [30, 556, 6], [6, 574, 7]]) { const bu = K.makeBush({ rx: 8, ry: 6, seed: 140 + s, pal: K.PAL_LEAF, still: true }); x.drawImage(bu.frames[0], bx - bu.ax, by - bu.ay); }
    // masonry face and the dark bore with the rails running in
    for (let py = 586; py < rb; py++) for (let px = 0; px < 46; px++) D(x, px, py, (py - 586) % 6 === 5 || (px + ((py - 586) / 6 | 0) * 5) % 10 === 9 ? 'stone3' : py % 6 === 0 ? 'stone0' : 'stone1');
    for (let py = 594; py < rb; py++) { const hw = py < 606 ? Math.round(Math.sqrt(Math.max(0, 144 - (606 - py) ** 2))) : 12; R(x, cx - hw, py, hw * 2 + 1, 1, py < 600 ? 'ink2' : 'ink'); }
    for (const rr of [ry + 6, rb - 8]) R(x, cx - 12, rr, 25, 1, 'iron4');
    for (let k = -5; k <= 5; k++) { const a = (k / 6) * (Math.PI / 2), px = Math.round(cx + Math.sin(a) * 15), py = Math.round(606 - Math.cos(a) * 14); R(x, px - 2, py - 2, 5, 4, k % 2 ? 'stone0' : 'stone1'); R(x, px - 2, py + 1, 5, 1, 'stone3'); }
    R(x, cx - 2, 590, 5, 4, 'stone0'); R(x, cx - 2, 593, 5, 1, 'stone3');
    R(x, 0, 586, 47, 1, 'grass3'); R(x, 46, 586, 1, rb - 586, 'stone4');
    return { img: c, ox: 0, oy: 506, y: rb, foot: 0, name: 'tunnel' };
  }
  // Where the line once crossed the river: the abutment, a twisted stub of the iron span and a lone pier in the water.
  function railBridge() {
    const [c, x] = onCanvas(408, 590, 500, 642), top = 600;
    R(x, 412, top, 22, 24, 'stone2');
    for (let y = top + 3, r = 0; y < 624; y += 5, r++) for (let px = 412 + (r % 2) * 4; px < 432; px += 8) K.stoneBlock_c(x, px, y, 7, 4);
    R(x, 412, top, 22, 3, 'stone1'); R(x, 412, top, 22, 1, 'stone0'); R(x, 433, top, 1, 24, 'stone4'); R(x, 411, top, 1, 24, 'stone4');
    for (let px = 432; px < 452; px++) {
      const sag = Math.max(0, px - 440) >> 1, a = top + 1 + sag, b = top + 8 + sag;
      D(x, px, a, 'iron1'); D(x, px, a + 1, 'iron3'); if (px < 448) { D(x, px, b, 'iron2'); D(x, px, b + 1, 'iron4'); }
      if ((px - 432) % 5 === 0 && px < 448) L(x, px, a + 2, px + 4, b - 1, 'iron3');
    }
    S(x, 451, top + 9, ['1..', '.1.', '1.1'], { 1: 'iron3' });
    // the pier: a stone column with a cutwater, the river breaking white around it
    R(x, 470, 610, 14, 22, 'stone2'); R(x, 470, 610, 3, 22, 'stone1'); R(x, 481, 610, 3, 22, 'stone3'); R(x, 470, 610, 14, 2, 'stone0');
    for (let y = 614; y < 632; y += 5) R(x, 470, y, 14, 1, 'stone4');
    poly(x, [[470, 610], [477, 604], [484, 610]], 'stone1'); D(x, 477, 605, 'stone0');
    D(x, 472, 609, 'grass2'); D(x, 473, 609, 'grass1'); D(x, 480, 609, 'grass3');
    R(x, 467, 631, 20, 2, 'water0'); R(x, 469, 633, 16, 1, 'water1'); D(x, 466, 632, 'white'); D(x, 487, 632, 'white');
    return { img: c, ox: 408, oy: 590, y: 624, foot: 0, name: 'rail_bridge' };
  }
  // Nets drying on poles by the jetty, floats strung along the top.
  function nets() {
    const x0 = 776, x1 = 832, base = 1036, [c, x] = onCanvas(x0 - 2, base - 26, x1 + 3, base + 2);
    for (const px of [x0, (x0 + x1) >> 1, x1]) { R(x, px, base - 24, 2, 24, 'wood3'); D(x, px, base - 24, 'wood1'); R(x, px + 1, base - 24, 1, 24, 'wood4'); }
    for (let px = x0 + 2; px < x1; px++) {
      const m = ((x0 + x1) >> 1), seg = px < m ? [x0, m] : [m, x1], sag = Math.round(3 * Math.sin((Math.PI * (px - seg[0])) / (seg[1] - seg[0])));
      D(x, px, base - 21 + sag, 'dirt3');
      for (let py = base - 20 + sag; py < base - 6 + sag; py++) if ((px + py) % 4 === 0 || (px - py + 400) % 4 === 0) D(x, px, py, py < base - 12 ? 'stone2' : 'stone3');
      if ((px - x0) % 7 === 3) { D(x, px, base - 22 + sag, (px >> 3) % 2 ? 'red' : 'white'); D(x, px + 1, base - 22 + sag, (px >> 3) % 2 ? 'red' : 'white'); }
    }
    return { img: c, ox: x0 - 2, oy: base - 26, y: base, foot: 2, name: 'nets' };
  }
  // A scarecrow minding the wheat, its sleeves lifting in the gust (two frames).
  function scarecrow() {
    const cx = 868, base = 694, frames = [];
    for (let f = 0; f < 2; f++) {
      const [c, x] = canvas(24, 34);
      R(x, 11, 8, 2, 26, 'wood3'); R(x, 11, 8, 1, 26, 'wood2'); R(x, 2, 14, 20, 2, 'wood3');
      R(x, 7, 13, 10, 11, 'roofB2'); R(x, 7, 13, 2, 11, 'roofB1'); R(x, 9, 17, 3, 3, 'red'); R(x, 7, 23, 10, 1, 'roofB3');
      R(x, 2 - f, 14 - f, 6, 4, 'roofB2'); R(x, 16, 14 - f, 6 + f, 4, 'roofB2'); D(x, 1 - f, 17, 'yellow'); D(x, 22 + f, 17 - f, 'yellow');
      E(x, 12, 9, 4, 4, 'cream1'); D(x, 11, 9, 'ink2'); D(x, 14, 9, 'ink2'); R(x, 12, 11, 2, 1, 'wood4');
      R(x, 5, 4, 15, 2, 'brass1'); R(x, 8, 1, 9, 4, 'brass1'); R(x, 8, 1, 9, 1, 'brass0'); R(x, 8, 4, 9, 1, 'red');
      frames.push(c);
    }
    return { frames, ox: cx - 12, oy: base - 33, y: base, foot: 3, name: 'scarecrow' };
  }
  function hayBale() {
    const [c, x] = canvas(16, 12);
    E(x, 8, 6, 7, 5, 'brass3'); E(x, 7, 5, 6, 4, 'brass1'); E(x, 6, 4, 3, 2, 'brass0'); for (let k = 2; k < 14; k += 3) D(x, k, 6 + (k % 2), 'brass2');
    R(x, 2, 10, 12, 1, 'wood4');
    return { img: c, ax: 8, ay: 10 };
  }
  // The posts of the 1952 rope bridge across the west river at the cliff, a frayed rope trailing into the water.
  function ropeBridge() {
    const y0 = cliffTop(424) - 16, [c, x] = onCanvas(414, y0 - 22, 494, y0 + 26);
    for (const px of [418, 482]) { R(x, px, y0 - 16, 4, 20, 'wood3'); R(x, px, y0 - 16, 1, 20, 'wood2'); R(x, px + 3, y0 - 16, 1, 20, 'wood4'); R(x, px - 1, y0 - 17, 6, 2, 'wood4'); R(x, px - 1, y0 + 3, 6, 1, 'wood5'); }
    for (let k = 0; k < 18; k++) D(x, 422 + k, y0 - 12 + Math.round(k * k * 0.06), k % 2 ? 'dirt3' : 'dirt2');
    for (let k = 0; k < 10; k++) D(x, 481 - k, y0 - 12 + Math.round(k * 1.4), k % 2 ? 'dirt3' : 'dirt2');
    for (let k = 0; k < 6; k++) { R(x, 432 + k * 3, y0 - 6 + k * 3, 3, 1, 'wood3'); }
    R(x, 428, y0 + 6, 9, 6, 'wood4'); R(x, 429, y0 + 7, 7, 4, 'cream1'); TX(x, '1952', 427, y0 + 14, 'wood4');
    return { img: c, ox: 414, oy: y0 - 22, y: y0 + 4, foot: 4, name: 'rope_bridge' };
  }
  function infoBoard() { const s = K.noticeBoard(); return { ...s, name: 'info_board' }; }
  // A dark round bush hedge row: static decor drawn straight into the ground.
  function decorTrees(ctx, list) {
    for (const [o, x, y] of list.sort((p, q) => p[2] - q[2])) {
      const tr = o.pine ? K.makePine(o) : o.bush ? K.makeBush({ ...o, still: true }) : K.makeTree({ ...o, still: true });
      ctx.drawImage(tr.frames[0], Math.round(x - tr.ax), Math.round(y - tr.ay));
    }
  }
  function forestDecor() {
    const r = rng(501), list = [];
    for (let row = 0; row < 3; row++) for (let x = -20 + row * 17; x < W + 30; x += 30 + r() * 26) {
      if (Math.abs(x - 446) < 22 + row * 2 || Math.abs(x - 1082) < 22 + row * 2) continue; // the rivers run out of the wood
      const y = forestY(x) - 34 + row * 16 + r() * 6, k = r();
      list.push([k < 0.22 ? { pine: 1, hgt: 54 + r() * 24, wid: 28 + r() * 10, seed: 900 + list.length } : { rx: 20 + r() * 12, ry: 17 + r() * 8, th: 8, seed: 900 + list.length, pal: k < 0.55 ? K.PAL_DEEP : K.PAL_LEAF, rMin: 6, rMax: 10 }, x, y]);
    }
    for (let x = -12; x < W + 12;) { // undergrowth along the wood's edge
      const rx = 9 + ((r() * 9) | 0), ry = 7 + ((r() * 6) | 0), k = r();
      if (Math.abs(x - 446) < 24 || Math.abs(x - 1082) < 24) { x += 26; continue; }
      list.push([{ bush: 1, rx, ry, seed: 600 + x, pal: k < 0.2 ? K.PAL_DEEP : k < 0.55 ? K.PAL_LIME : K.PAL_LEAF, flowers: r() < 0.2 ? ['white', 'pink'] : null }, x, forestY(x) + 6 + ((r() * 5) | 0)]);
      x += rx * (1 + r() * 0.5);
    }
    // The woods south of the old line (no path leads in), the west and east edges.
    for (const [x, y] of scatter(503, 34, [0, 700, 420, 210], (x, y) => !water(x, y) && !water(x + 12, y) && !water(x - 12, y) && y < cliffTop(x) - 18, 3))
      list.push([hash(x, y, 1) < 0.25 ? { pine: 1, hgt: 50 + hash(x, y, 2) * 20, wid: 28, seed: x + y } : { rx: 18 + hash(x, y, 3) * 10, ry: 15 + hash(x, y, 4) * 6, th: 10, seed: x * 3 + y, pal: hash(x, y, 5) < 0.4 ? K.PAL_DEEP : K.PAL_LEAF }, x, y]);
    for (let y = forestY(0) + 30; y < 520; y += 30 + r() * 20) list.push([{ rx: 16 + r() * 8, ry: 14 + r() * 5, th: 10, seed: 700 + y, pal: K.PAL_DEEP }, 4 + r() * 10, y]);
    for (let y = 320; y < 900; y += 26 + r() * 18) if (Math.abs(y - 496) > 26) list.push([{ rx: 16 + r() * 8, ry: 14 + r() * 5, th: 10, seed: 800 + y, pal: r() < 0.5 ? K.PAL_DEEP : K.PAL_LEAF }, W - 6 - r() * 10, y]);
    return list;
  }

  /* ---------- life (deterministic from t, repeating within the 24 s loop) ---------- */
  // Water glints on a fixed lattice: river glints drift downstream 4 px per step (8 steps, 2 s), sea glints drift
  // sideways 3 px per step. Positions repeat on the lattice, so baked water tiles share frames.
  const GLINT = { river: [], sea: [] };
  function buildGlints() {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!water(x, y) || onCliff(x, y) || onDeck(x, y) || onDeck(x, y - 6)) continue;
      if (sea(x, y)) {
        const d = y - seaTop(x); if (d < 7) continue;
        const row = Math.floor(y / 6); if (y % 6) continue;
        const k = (x + row * 11) % 24; if (k !== 0) continue;
        if (!water(x + 4, y) || !water(x - 1, y)) continue;
        GLINT.sea.push([x, y, H01(x, y) < 0.3 ? 1 : 0]);
      } else {
        if (!water(x - 3, y) || !water(x + 5, y) || !water(x, y - 3) || !water(x, y + 3)) continue;
        if ((x + Math.floor(y / 32) * 7) % 13 !== 0) continue;
        GLINT.river.push([x, y, H01(x, y) < 0.35 ? 1 : 0]);
      }
    }
  }
  function waterLife(ctx, t, v) {
    const f = step(t, 4) % 8, x1 = v.x + v.w, y1 = v.y + v.h;
    for (const [x, y0, bright] of GLINT.river) {
      if (x < v.x - 4 || x > x1) continue;
      if ((y0 % 32) !== 0) continue;
      for (let k = 0; k < 2; k++) {
        const y = y0 + ((f * 4 + k * 16 + (x % 3) * 5) % 32);
        if (y < v.y || y > y1 || !water(x, y) || !water(x + 3, y) || onDeck(x, y) || onCliff(x, y)) continue;
        R(ctx, x, y, 3, 1, bright && k === 0 ? 'water0' : 'water1');
      }
    }
    for (const [x0, y, bright] of GLINT.sea) {
      const x = x0 + ((f * 3) % 24) - 12;
      if (x < v.x - 6 || x > x1 || y < v.y || y > y1 || !water(x, y) || !water(x + 4, y) || onDeck(x, y) || onDeck(x + 4, y)) continue;
      R(ctx, x, y, 4, 1, bright ? 'water0' : 'water2');
      if (bright && f % 4 === 1) D(ctx, x + 1, y - 1, 'white');
    }
    // the surf: a foam line that runs up the sand and back
    const off = [0, 1, 2, 3, 3, 2, 1, 0][f];
    for (let x = Math.max(0, v.x); x < Math.min(W, x1); x++) {
      const y = seaTop(x) - off; if (y < v.y - 2 || y > y1) continue;
      if (onJetty(x, y)) continue;
      D(ctx, x, y, (x + f) % 7 < 2 ? 'water0' : 'white'); D(ctx, x, y + 1, 'water1');
      if ((x >> 2) % 5 === f % 5) D(ctx, x, y + 3, 'water0');
    }
    // falls: streaks pouring off the cliff, foam boiling at the foot
    const g = step(t, 8) % 8;
    for (const fx of FALLS) for (let x = fx.x0; x <= fx.x1; x++) {
      const off2 = (hash(x, 1, 3) * 16) | 0;
      for (let y = cliffTop(x) - 1; y < cliffBot(x) + 2; y++) {
        if (!water(x, y) || y < v.y || y > y1) continue;
        const m = (y - g * 2 + off2 + 1600) % 16;
        if (m < 2) D(ctx, x, y, m === 0 ? 'white' : 'water0'); else if (m < 4 && (x & 1)) D(ctx, x, y, 'water1');
      }
      const yb = cliffBot(x); if ((x + g) % 3) D(ctx, x, yb + 1 + ((x * 3 + g) % 3 ? 0 : 1), (x + g) % 3 === 1 ? 'white' : 'water0');
    }
    for (const fx of FALLS) for (let i = 0; i < 6; i++) {
      const x = fx.x0 - 2 + ((H01(i, g) * (fx.x1 - fx.x0 + 4)) | 0), y = cliffBot(x) + 2 + ((H01(i + 40, g) * 5) | 0), r = 1 + ((H01(i + 80, g) * 2) | 0);
      if (y < v.y || y > y1) continue;
      E(ctx, x, y, r + 1, r, i % 3 ? 'white' : 'water0');
    }
  }
  const FALLS = [];
  function findFalls() {
    for (const pts of [RIVER_W, RIVER_E]) {
      let x0 = W, x1 = 0;
      for (let x = 0; x < W; x++) { const y = cliffTop(x) + 20; if (water(x, y) && Math.abs(x - pts[8][0]) < 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }
      FALLS.push({ x0, x1 });
    }
  }
  // Swaying tufts and nodding flowers: two states each, on the ground's 2 s beat.
  function groundLife(ctx, t, v, tuftSpots, nodSpots) {
    const x1 = v.x + v.w, y1 = v.y + v.h, beat = step(t, 4);
    for (const [x, y, ph] of tuftSpots) {
      if (x < v.x - 6 || x > x1 || y < v.y - 6 || y > y1 + 2) continue;
      const lean = (beat + ph) % 8 < 2 ? 1 : 0;
      D(ctx, x, y - 1, 'grass3'); D(ctx, x + 2, y - 1, 'grass3'); D(ctx, x + 1, y, 'grass3');
      D(ctx, x + lean, y - 2, 'grass1'); D(ctx, x + 2 + lean, y - 3, 'grass1'); D(ctx, x + 1 + lean, y - 2, 'grass3');
    }
    for (const [x, y, [pc, cc], ph] of nodSpots) {
      if (x < v.x - 4 || x > x1 + 4 || y < v.y - 6 || y > y1 + 2) continue;
      const n = (beat + ph + 4) % 8 < 3 ? 1 : 0;
      D(ctx, x, y, 'grass3'); D(ctx, x, y - 1, 'grass3'); D(ctx, x + n, y - 2, 'grass3'); D(ctx, x - 1, y, 'grass2');
      D(ctx, x + n - 1, y - 4, pc); D(ctx, x + n + 1, y - 4, pc); D(ctx, x + n, y - 5, pc); D(ctx, x + n, y - 3, pc); D(ctx, x + n, y - 4, cc);
    }
  }
  function lilyPads(list, ctx, t) {
    list.forEach(([x, y, fl], i) => {
      const yy = y + ((step(t, 2) + i) % 4 === 0 ? 1 : 0);
      R(ctx, x - 3, yy - 1, 7, 3, 'leaf2'); R(ctx, x - 2, yy - 2, 5, 1, 'leaf2'); R(ctx, x - 2, yy + 2, 5, 1, 'leaf3'); R(ctx, x - 3, yy + 1, 7, 1, 'leaf3');
      D(ctx, x - 2, yy - 1, 'leaf1'); D(ctx, x - 1, yy - 2, 'leaf1'); D(ctx, x + 2, yy, 'water3'); D(ctx, x + 3, yy, 'water3');
      if (fl) { R(ctx, x - 1, yy - 2, 2, 2, fl); D(ctx, x, yy - 3, 'white'); D(ctx, x - 1, yy - 1, 'yellow'); }
    });
  }
  function reeds(list, ctx, t) {
    list.forEach(([x, y, n], i) => {
      const sw = (step(t, 4) + i) % 8 < 2 ? 1 : 0;
      for (let k = 0; k < n; k++) {
        const bx = x + k * 2 - n, h = 5 + ((H01(i, k) * 5) | 0);
        R(ctx, bx, y - h + 2, 1, h - 2, k % 2 ? 'leaf3' : 'leaf4'); R(ctx, bx + sw, y - h, 1, 2, 'leaf2');
        if (k === 1 && n > 2) { R(ctx, bx + sw, y - h - 3, 1, 3, 'wood3'); D(ctx, bx + sw, y - h - 3, 'wood2'); }
      }
      R(ctx, x - n - 1, y + 1, n * 2 + 2, 1, 'leaf4');
    });
  }
  function smoke(ctx, t, chimneys) {
    for (const [cx, cy] of chimneys) for (let k = 0; k < 6; k++) {
      const age = (t + k * (4 / 6) + cx * 0.01) % 4;
      if (age > 3.6) continue;
      const q = Math.floor(age * 6) / 6, x = Math.round(cx + q * 3.5 + Math.sin(q * 2 + k) * 1.2), y = Math.round(cy - q * 8), r = age < 0.4 ? 1 : age < 1.4 ? 2 : age < 2.9 ? 3 : 2;
      E(ctx, x + 1, y + 1, r, r, 'cloud2'); E(ctx, x, y, r, r, age > 2.9 ? 'cloud1' : 'white');
    }
  }
  // A butterfly's loop: 24 stepped positions over 4 s, wings flapping every step.
  function butterfly(ctx, t, [cx, cy, c], i) {
    {
      const k = step(t, 6) % 24, a = (k / 24) * TAU, x = Math.round(cx + 12 * Math.sin(a + i) + 4 * Math.sin(3 * a + i)), y = Math.round(cy + 5 * Math.sin(2 * a + i) + 2 * Math.cos(3 * a));
      const open = k % 2 === 0;
      D(ctx, x, y, 'ink2');
      if (open) { R(ctx, x - 2, y - 1, 2, 2, c); R(ctx, x + 1, y - 1, 2, 2, c); D(ctx, x - 2, y + 1, c); D(ctx, x + 2, y + 1, c); }
      else { D(ctx, x - 1, y - 1, c); D(ctx, x + 1, y - 1, c); D(ctx, x - 1, y - 2, c); D(ctx, x + 1, y - 2, c); }
    }
  }
  function leaves(ctx, t, trees) {
    for (let s = 0; s < 4; s++) {
      const Pp = [3, 4, 6, 8][s], k = Math.floor(t / Pp), a = t - k * Pp, tr0 = trees[(H01(k, 11 + s) * trees.length) | 0];
      if (!tr0 || a > 3) continue;
      const x0 = tr0.x + (H01(k, 12 + s) - 0.5) * tr0.cw, y0 = tr0.y - tr0.ch * (0.2 + H01(k, 13) * 0.3), q = Math.floor(a * 8) / 8;
      const x = Math.round(x0 + 4 * Math.sin(q * 2.8)), y = Math.round(y0 + q * 11), c = ['leaf1', 'grass0', 'yellow'][k % 3];
      if (step(t, 6) % 2) R(ctx, x, y, 2, 1, c); else R(ctx, x, y, 1, 2, c);
    }
  }
  // Gulls over the coast and sparrows over the village, their shadows on the ground.
  function birds(ctx, t, v) {
    const fly = (period, y0, span, dir, speed, i, c, sh) => {
      const a = t % period, x = dir > 0 ? Math.round(span[0] + a * speed) : Math.round(span[1] - a * speed), y = Math.round(y0 + Math.sin(wv(LOOP / period) * t + i) * 6);
      if (x < v.x - 10 || x > v.x + v.w + 10 || y < v.y - 40 || y > v.y + v.h + 10) return;
      if (sh) { ctx.fillStyle = P.shadow; ctx.fillRect(x + 1, y + 30, 5, 1); ctx.fillRect(x + 3, y + 31, 1, 1); }
      K.bird(ctx, x, y, (step(t, 7) + i) % 3, c);
    };
    for (let i = 0; i < 3; i++) fly(12, 1010 + i * 9, [300, 1300], i % 2 ? 1 : -1, 90, i, 'white', false);
    for (let i = 0; i < 2; i++) fly(24, 260 + i * 260, [-20, W + 20], 1, 66, i, 'stone5', true);
    fly(8, 700, [380, 1180], -1, 100, 7, 'stone5', true);
  }
  // A firefly over the meadow: it drifts between two spots and pulses, on a 4 s loop. A light of its own.
  function firefly(ctx, t, [bx, by], i) {
    const k = (step(t, 3) + i * 5) % 12, x = bx + (k < 6 ? 0 : 2), y = by - (k >= 3 && k < 9 ? 1 : 0);
    if (k === 5 || k === 11) return;
    D(ctx, x, y, 'light0');
    if (k % 6 > 1 && k % 6 < 4) { D(ctx, x - 1, y, 'light2'); D(ctx, x + 1, y, 'light2'); D(ctx, x, y - 1, 'light2'); D(ctx, x, y + 1, 'light2'); }
  }
  // Stepped warm light: the lit glass and its hard-edged halo; never graded.
  function glow(ctx, gx, gy, gw, gh, t, seed) {
    const fl = (step(t, 9) + seed * 3) % 7 === 0 || hash(step(t, 5), seed, 4) < 0.12;
    const cx = gx + (gw >> 1), cy = gy + (gh >> 1);
    PX.ellipse(ctx, cx, cy, gw + 4, gh + 3, 'rgba(255,236,160,0.2)'); PX.ellipse(ctx, cx, cy, gw + 1, gh, 'rgba(255,244,190,0.28)');
    R(ctx, gx, gy, gw, gh, 'light1'); R(ctx, gx + (gw > 3 ? 1 : 0), gy + (gh > 3 ? 1 : 0), Math.max(1, gw - 2), Math.max(1, gh - 2), fl ? 'light2' : 'light0'); R(ctx, gx, gy + gh - 1, gw, 1, 'light3');
  }

  // A pool of lamplight on the ground, in hard-edged steps. It is an entry of its own sorted under everyone.
  function pool(ctx, px, py, rx) {
    PX.ellipse(ctx, px, py, rx + 6, Math.max(3, (rx >> 2) + 2), 'rgba(255,214,110,0.1)');
    PX.ellipse(ctx, px, py, rx, Math.max(2, rx >> 2), 'rgba(255,214,110,0.16)');
    PX.ellipse(ctx, px, py, Math.round(rx * 0.62), Math.max(1, rx >> 3) + 1, 'rgba(255,232,150,0.2)');
  }

  /* ---------- critters ---------- */
  const CRAB = [['r...r', '.rrr.', 'rkrkr', '.r.r.'], ['.r.r.', '.rrr.', 'rkrkr', 'r...r']];
  const GULL = [['..ww...', '.wwwk..', 'wwwwwo.', '.ggww..', '..o.o..'], ['..ww...', '.wwwk..', 'wwwwwo.', '.ggww..', '..o.o..'], ['.......', '.wwwk..', 'wwwwwo.', '.ggww..', '..o.o..']];

  /* ---------- the scene ---------- */
  // Trees near paths sway (two frames); [x, y, options]. Lamps: [kind, x, y]. Bushes: [x, y, rx, ry, flowers].
  const TREES = [
    [236, 330, { rx: 26, ry: 22, th: 12 }], [168, 308, { rx: 22, ry: 18, th: 10, pal: K.PAL_LIME }], [40, 360, { pine: 1, hgt: 62, wid: 30 }],
    [420, 360, { rx: 22, ry: 18, th: 10 }], [390, 216, { rx: 26, ry: 20, th: 12, pal: K.PAL_DEEP }], [44, 470, { rx: 24, ry: 20, th: 12 }],
    [520, 300, { rx: 28, ry: 24, th: 14 }], [592, 360, { rx: 20, ry: 17, th: 10, blossom: ['pink', 'white'] }], [640, 280, { pine: 1, hgt: 70, wid: 34 }],
    [904, 330, { rx: 28, ry: 24, th: 14, pal: K.PAL_DEEP }], [960, 420, { rx: 20, ry: 17, th: 10, blossom: ['white', 'pink'] }], [1000, 300, { rx: 22, ry: 19, th: 10 }],
    [968, 650, { rx: 22, ry: 19, th: 12 }], [572, 690, { rx: 16, ry: 14, th: 10, blossom: ['red', 'rose'] }], [632, 696, { rx: 16, ry: 14, th: 10, blossom: ['red', 'rose'] }],
    [692, 690, { rx: 16, ry: 14, th: 10, blossom: ['red', 'rose'] }], [566, 772, { rx: 16, ry: 14, th: 10, blossom: ['red', 'rose'] }], [626, 778, { rx: 16, ry: 14, th: 10, blossom: ['red', 'rose'] }],
    [686, 772, { rx: 16, ry: 14, th: 10, blossom: ['red', 'rose'] }], [520, 860, { rx: 24, ry: 20, th: 12 }],
    [980, 760, { pine: 1, hgt: 64, wid: 32 }], [880, 800, { rx: 20, ry: 17, th: 10, blossom: ['red', 'rose'] }], [620, 870, { rx: 22, ry: 18, th: 10 }],
    [1150, 330, { rx: 24, ry: 20, th: 12 }], [1262, 452, { rx: 30, ry: 24, th: 16 }], [1340, 260, { rx: 22, ry: 18, th: 10, pal: K.PAL_DEEP }],
    [1440, 400, { rx: 26, ry: 22, th: 12 }], [1150, 600, { rx: 22, ry: 19, th: 10, blossom: ['pink', 'white'] }], [1440, 700, { rx: 26, ry: 22, th: 12, pal: K.PAL_DEEP }],
    [1230, 760, { rx: 24, ry: 20, th: 12 }], [1460, 820, { pine: 1, hgt: 60, wid: 30 }], [1180, 860, { rx: 22, ry: 18, th: 10, pal: K.PAL_LIME }],
    [1490, 210, { rx: 18, ry: 15, th: 8 }], [1416, 196, { pine: 1, hgt: 54, wid: 28 }], [1110, 700, { rx: 20, ry: 17, th: 10 }],
  ];
  const BUSHES = [
    [70, 430, 12, 9, 1], [190, 440, 10, 8], [276, 452, 9, 7, 1], [412, 440, 11, 8], [470, 540, 10, 8, 1], [430, 580, 9, 7],
    [530, 440, 12, 9, 1], [660, 420, 11, 8], [880, 420, 12, 9, 1], [988, 470, 10, 8], [1010, 560, 12, 9, 1], [620, 560, 11, 8],
    [730, 624, 10, 8, 1], [840, 600, 10, 8], [720, 830, 12, 9], [960, 748, 11, 8, 1], [690, 840, 10, 7, 1], [850, 850, 12, 9],
    [1130, 450, 11, 8, 1], [1350, 420, 12, 9], [1160, 520, 10, 8], [1460, 560, 11, 8, 1], [1430, 664, 12, 9], [1180, 690, 10, 8, 1],
    [1250, 842, 12, 9, 1], [1410, 860, 11, 8], [1500, 560, 10, 8, 1], [1200, 250, 12, 9], [1448, 310, 9, 7, 1], [1000, 860, 10, 8],
  ];
  const LAMPS = [['iron', 112, 566], ['iron', 290, 566], ['wood', 414, 492], ['wood', 538, 500], ['iron', 690, 556], ['iron', 854, 556],
    ['iron', 712, 470], ['iron', 832, 470], ['wood', 1012, 506], ['wood', 1130, 492], ['wood', 1240, 482], ['wood', 1430, 500],
    ['wood', 786, 760], ['wood', 794, 906], ['wood', 1318, 744], ['wood', 1366, 868], ['wood', 640, 1010], ['wood', 1420, 300]];

  function createWorld() {
    keep.length = 0;
    buildMasks(); K.critterSprites(); findFalls(); buildGlints(); if (!STALKS.length) buildWheat();
    const props = [], shadows = [], trees = [], lights = [];
    const add = p => { const im = p.img || (p.frames && p.frames[0]); if (im) { p.w = im.width; p.h = im.height; } props.push(p); return p; };
    const put = (s, x, y, o = {}) => add({ img: s.img, frames: s.frames, ox: Math.round(x - s.ax), oy: Math.round(y - s.ay), x, y, ...o });
    // buildings
    const ST = station(), FG = forge(), houses = [ST, teaStall(), FG, hall(), bakery(), shed(), busStop(), home(), leoHut(), studio(), saltStore(),
      stiltHouse({ x0: 1164, x1: 1234, floor: 356, ground: 384, name: 'nora_house', rampKey: 'B', tiles: 'slate', seed: 141, stair: [1191, 14], windows: [[1170, 14], [1212, 16]], shutters: ['roofB1', 'roofB3'], flowers: ['lilac', 'white', 'pink'], gable: 1198, chimney: 1224, posts: [1184, 1209], sign: ICON.scissors, doorRamp: ['roofB0', 'roofB1', 'roofB2', 'roofB3'] }),
      stiltHouse({ x0: 1278, x1: 1336, floor: 336, ground: 364, name: 'stilt_house', rampKey: 'R', seed: 151, stair: [1299, 14], windows: [[1284, 12], [1318, 12]], flowers: ['yellow', 'white', 'orange'], chimney: 1328, plaster: 'wall0' })];
    for (const h of houses) {
      for (const g of h.wins) g.lit = K.litSprite(h.img, h.ox, h.oy, g);
      add({ img: h.img, ox: h.ox, oy: h.oy, y: h.y, name: h.name, foot: h.foot, base: h.base });
      keep.push(h.keep); shadows.push(...h.shadow);
      if (!h.wins.length) continue;
      lights.push({ name: h.name + '_light', y: h.y, still: true, box: [h.ox, h.oy, h.img.width, h.img.height], draw: ctx => { for (const g of h.wins) ctx.drawImage(g.lit, g.gx, g.gy); } });
      lights.push({ name: h.name + '_spill', y: 0, still: true, box: [h.ox - 8, h.y, h.img.width + 16, 10],
        draw: ctx => { for (const g of h.wins) if (g.gy > h.y - 40) PX.ellipse(ctx, g.gx + (g.gw >> 1), h.y + 4, Math.round(g.gw * 0.7), 2, 'rgba(255,214,110,0.16)'); } });
    }
    lights.push({ name: 'forge_hearth', y: FG.y, box: [FG.hearth[0] - 12, FG.hearth[1] - 10, FG.hearth[2] + 24, FG.hearth[3] + 20], draw: (ctx, t) => glow(ctx, ...FG.hearth, t, 31) });
    lights.push({ name: 'forge_pool', y: 0, still: true, box: [FG.hearth[0] - 20, FG.y - 4, 50, 14], draw: ctx => pool(ctx, FG.hearth[0] + 5, FG.y + 3, 12) });
    const LH = lighthouse(); add({ img: LH.img, ox: LH.ox, oy: LH.oy, y: LH.y, name: LH.name, foot: LH.foot }); keep.push(LH.keep); shadows.push(...LH.shadow);
    lights.push({ name: 'lighthouse_lamp', y: LH.y, box: [LH.beam[0] - 60, LH.beam[1] - 20, 121, 40], draw: (ctx, t) => {
      const [bx, by] = LH.beam, k = step(t, 3) % 8, s = [1, 2, 3, 2, 1, -1, -2, -3][k] * 0;
      glow(ctx, bx - 4, by - 4, 9, 9, t, 41);
      if (k < 5) { const dir = k < 3 ? 1 : -1, len = [56, 44, 30, 18, 8][k]; ctx.globalAlpha = 0.35; poly(ctx, [[bx, by - 2], [bx + dir * len, by - 8 - s], [bx + dir * len, by + 6], [bx, by + 2]], 'light1'); ctx.globalAlpha = 1; }
    } });
    // the banyan, its lanterns and the shop's door
    const BY = banyan(), byX = 334, byY = 366;
    put(BY, byX, byY, { pick: t => Math.floor(t / 2) & 1, name: 'banyan', foot: 6 });
    keep.push([byX - 40, byY - 30, 80, 34]); shadows.push([byX + 4, byY, 60, 12]);
    trees.push({ x: byX, y: byY, cw: 140, ch: BY.h });
    lights.push({ name: 'shop_door', y: byY, box: [byX - 16, byY - 26, 33, 34], draw: (ctx, t) => shopDoor(ctx, byX, byY - 1, t) });
    LANTERNS.forEach(([lx, ly], i) => lights.push({ name: 'shop_lantern_' + i, y: byY, box: [lx - 8, ly - 10, 17, 22], draw: (ctx, t) => lantern(ctx, i, t, true) }));
    // the market and the square
    const MS = stalls(); add({ frames: MS.frames, ox: MS.ox, oy: MS.oy, y: MS.y, pick: t => ((step(t, 5) % 10) < 4 ? step(t, 5) % 2 : 0), name: MS.name, foot: MS.foot }); keep.push(MS.keep); shadows.push(...MS.shadow);
    lights.push({ name: 'mia_stalls_light', y: MS.y, box: [MS.lamp[0] - 8, MS.lamp[1] - 6, 16, 14], draw: (ctx, t) => glow(ctx, MS.lamp[0] - 1, MS.lamp[1], 3, 3, t, 9) });
    const FT = fountain(); add({ frames: FT.frames, ox: FT.ox, oy: FT.oy, y: FT.y, pick: t => step(t, 6) % 4, name: FT.name, foot: FT.foot }); keep.push(FT.keep); shadows.push(...FT.shadow);
    put(K.noticeBoard(), 690, 474, { name: 'notice_board' }); shadows.push([692, 474, 11, 2]); keep.push([676, 448, 28, 28]);
    put(infoBoard(), A.infoBoard[0], A.infoBoard[1] - 9, { name: 'info_board' }); shadows.push([A.infoBoard[0] + 2, A.infoBoard[1] - 8, 11, 2]);
    const ban = K.banner(); for (const [bx, by] of [[734, 432], [810, 432]]) put(ban, bx, by, { pick: t => [0, 1, 0, 2][(step(t, 6) + bx) & 3], name: 'banner' });
    put(K.planter(5, ['pink', 'rose', 'white']), 700, 520, { name: 'planter' }); put(K.planter(6, ['yellow', 'orange', 'white']), 846, 520, { name: 'planter' });
    shadows.push([702, 520, 11, 3], [848, 520, 11, 3]);
    for (const [x, y] of [[724, 574], [822, 574]]) { put(K.bench(), x, y, { y: y - 6, name: 'bench' }); shadows.push([x + 1, y + 1, 12, 2]); keep.push([x - 14, y - 16, 28, 18]); }
    // the station platform and the old line
    for (const [x, y] of [[150, 562], [258, 562]]) { put(K.bench(), x, y, { y: y - 6, name: 'bench' }); keep.push([x - 14, y - 16, 28, 18]); }
    for (const [x, y] of [[300, 560], [310, 562]]) { put(K.barrel(), x, y, { name: 'barrel' }); shadows.push([x + 2, y, 6, 2]); }
    put(K.crate('bread'), 92, 562, { name: 'crate' });
    add({ ...tunnel() }); add({ ...railBridge() }); add({ ...ropeBridge() });
    // east: the garden's fence and gate, the swing, the hens by Satria's home
    const { x0: gx0, x1: gx1, y0: gy0, y1: gy1 } = GARDEN;
    add({ ...K.fenceH(gx0 - 2, gx1 + 2, gy0 - 2), name: 'garden_fence' });
    add({ ...K.fenceH(gx0 - 2, 1258, gy1 + 2), name: 'garden_fence' }); add({ ...K.fenceH(1280, gx1 + 2, gy1 + 2), name: 'garden_fence' });
    for (let y = gy0 + 6; y < gy1 + 2; y += 8) { add({ ...K.fencePost(gx0 - 2, y), name: 'garden_post' }); add({ ...K.fencePost(gx1 + 2, y), name: 'garden_post' }); }
    for (const [x, h] of [[1180, 15], [1188, 12], [1352, 14]]) put(K.sunflower(h), x, gy0 - 4, { name: 'sunflower' });
    const SW = swing(); add({ frames: SW.frames, ox: SW.ox, oy: SW.oy, y: SW.y, pick: t => step(t, 4) % 6, name: SW.name, foot: SW.foot }); keep.push(SW.keep); shadows.push(...SW.shadow);
    put(K.tulipBed(40), 1290, 870, { name: 'tulip_bed' }); add({ ...K.vegPatch(1404, 812, 1456, 846), name: 'veg_patch' }); keep.push([1402, 806, 56, 42]);
    put(K.signpost(), 1420, 514, { name: 'signpost' }); shadows.push([1424, 514, 6, 2]);
    // the coast: the jetty posts, the boat and a bench looking out to sea
    const BT = boat(); add({ frames: BT.frames, ox: BT.ox, oy: BT.oy, y: BT.y, pick: t => step(t, 2) % 4, name: BT.name, foot: 0 });
    for (const [px, py] of [[JETTY.head[0] - 1, JETTY.head[2] - 4], [JETTY.head[1] - 2, JETTY.head[2] - 4]]) add({ img: (() => { const [c, x] = canvas(4, 12); R(x, 0, 0, 4, 12, 'wood3'); R(x, 0, 0, 1, 12, 'wood2'); R(x, 3, 0, 1, 12, 'wood4'); R(x, 0, 0, 4, 1, 'wood1'); return c; })(), ox: px, oy: py - 6, y: py + 6, name: 'jetty_post', foot: 0 });
    put(K.bench(), 812, cliffTop(812) - 10, { y: cliffTop(812) - 16, name: 'bench' }); keep.push([798, cliffTop(812) - 26, 28, 18]);
    add({ ...nets() });
    const SC = scarecrow(); add({ frames: SC.frames, ox: SC.ox, oy: SC.oy, y: SC.y, pick: t => ((step(t, 4) % 8) < 2 ? 1 : 0), name: SC.name, foot: SC.foot });
    for (const [x, y] of [[958, 714], [952, 728], [790, 742]]) { put(hayBale(), x, y, { name: 'hay' }); shadows.push([x + 2, y, 8, 2]); keep.push([x - 8, y - 10, 16, 12]); }
    put(K.basket(), 650, 712, { name: 'basket' });
    put(K.barrel(), 636, 1028, { name: 'barrel' }); put(K.crate('greens'), 646, 1030, { name: 'crate' });
    // trees, bushes, rocks, lamps
    TREES.forEach(([x, y, o], i) => {
      const seed = 30 + i, tr0 = o.pine ? K.makePine({ ...o, seed }) : K.makeTree({ ...o, seed, pal: o.pal || K.PAL_LEAF });
      const per = [1, 1.5, 2, 3][(hash(seed, 2, 9) * 4) | 0], ph = (hash(seed, 1, 9) * 4) | 0;
      put(tr0, x, y, { pick: t => (Math.floor(t / per) + ph) & 1, name: 'tree' });
      const cw = o.pine ? o.wid : o.rx * 2;
      trees.push({ x, y, cw, ch: tr0.h }); shadows.push([x + 3, y, Math.round(cw * 0.42), Math.round(cw * 0.15)]); keep.push([x - 6, y - 8, 12, 10]);
    });
    for (const [x, y, rx, ry, fl] of BUSHES) {
      const b = K.makeBush({ rx, ry, seed: x * 3 + y, pal: (x + y) % 3 ? K.PAL_LEAF : K.PAL_LIME, flowers: fl ? [['pink', 'white', 'rose'], ['white', 'yellow'], ['lilac', 'white']][(x + y) % 3] : null });
      const ph = (hash(x, y, 3) * 5) | 0;
      put(b, x, y, { pick: t => ((step(t, 1.5) + ph) % 5 === 0 ? 1 : 0), name: 'bush' });
      shadows.push([x + 2, y - 1, rx + 1, 3]); keep.push([x - rx, y - ry * 2, rx * 2, ry * 2 + 2]);
    }
    for (const [x, y, w, h, s] of [[492, 640, 12, 8, 1], [560, 620, 9, 6, 2], [1000, 640, 10, 7, 3], [1120, 560, 8, 5, 4], [470, 1040, 14, 9, 5], [880, 1000, 12, 8, 6], [1060, 1040, 10, 7, 7], [1180, 1010, 16, 10, 8], [380, 1030, 12, 8, 9], [210, 1050, 14, 9, 10], [1360, 1040, 11, 7, 11], [1470, 1000, 13, 8, 12], [1500, 284, 9, 6, 13]]) {
      put(K.rock(w, h, s, y < 900), x, y, { name: 'rock' }); shadows.push([x + 2, y, (w >> 1) + 1, 2]);
    }
    LAMPS.forEach(([k, x, y], i) => {
      const s = k === 'iron' ? K.ironLamp() : K.woodLamp(), p = put(s, x, y, { name: 'lamp' });
      keep.push([x - 5, y - 6, 12, 8]); shadows.push([x + 2, y, 5, 2]);
      const gx = p.ox + s.glass[0], gy = p.oy + s.glass[1], px = p.ox + s.head[0];
      lights.push({ name: 'lamp_light', y, box: [gx - 10, gy - 8, s.glass[2] + 20, s.glass[3] + 16], draw: (ctx, t) => glow(ctx, gx, gy, s.glass[2], s.glass[3], t, i + 1) });
      lights.push({ name: 'lamp_pool', y: 0, still: true, box: [px - 26, y - 4, 53, 14], draw: ctx => pool(ctx, px, y + 2, 18) });
    });
    // Unique names for the exporter: a kind placed more than once is numbered in placing order.
    const number = list => { const kinds = {}, seen = {}; for (const p of list) kinds[p.name] = (kinds[p.name] || 0) + 1; for (const p of list) if (kinds[p.name] > 1) { const k = p.name; seen[k] = (seen[k] ?? -1) + 1; p.name = k + '_' + seen[k]; } };
    number(props); number(lights.filter(l => !/^shop_lantern_/.test(l.name)));

    // the ground: terrain, details, shadows and the static woods
    const b = new Buf(W, H);
    groundBase(b); square(b); platform(b); rails(b); garden(b); wheatBase(b); waterBase(b); beachBase(b); cliffFace(b); hillFace(b);
    for (const BR of BRIDGES) bridgeDeck(b, BR);
    jettyDeck(b); tufts(b); flowers(b);
    const ground = b.canvas(), gx = ground.getContext('2d');
    K.paintShadows(gx, W, H, shadows);
    decorTrees(gx, forestDecor());

    // life, positions picked once
    const lily = scatter(301, 26, [0, 140, W, 800], (x, y) => water(x - 6, y) && water(x + 6, y) && water(x, y - 6) && water(x, y + 5) && !sea(x, y) && !onCliff(x, y + 8) && !onDeck(x, y) && !onDeck(x, y + 8) && !onDeck(x, y - 8))
      .filter((_, i) => i % 2 === 0).map(([x, y, q]) => [x, y, q < 0.3 ? 'pink' : q > 0.8 ? 'white' : 0]);
    const reedList = scatter(311, 15, [0, 140, W, 780], (x, y) => !water(x, y) && (water(x + 3, y) || water(x - 3, y)) && !sand(x, y) && !blocked(x, y) && !onDeck(x, y) && !onDeck(x + 4, y) && !onDeck(x - 4, y) && !inForest(x, y - 8)).map(([x, y], i) => [x, y, 2 + (i % 3)]);
    const near2 = (x, y) => sand(x, y + 7) || sand(x + 8, y) || sand(x - 8, y) || water(x, y + 9) || water(x + 9, y) || water(x - 9, y) || gravel(x, y + 7);
    const nodSpots = scatter(315, 15, [0, 0, W, H], (x, y) => grass(x, y) && grass(x, y + 4) && grass(x, y - 6) && !blocked(x, y) && !blocked(x, y - 5) && near2(x, y))
      .map(([x, y, q]) => [x, y, K.FCOL[(q * K.FCOL.length) | 0], (q * 97) | 0]);
    const tuftSpots = scatter(314, 13, [0, 0, W, H], (x, y) => grass(x, y) && grass(x, y + 3) && grass(x + 4, y + 2) && !blocked(x, y)).filter((_, i) => i % 2 === 0).map(([x, y, q]) => [x, y, (q * 97) | 0]);
    const fireSpots = scatter(313, 60, [0, 160, W, 760], (x, y) => grass(x, y) && !blocked(x, y)).filter((_, i) => i % 2 === 0).slice(0, 40);
    const flies = [[1220, 560, 'white'], [1300, 600, 'yellow'], [1330, 540, 'pink'], [700, 700, 'white'], [520, 560, 'lilac'], [240, 470, 'yellow'], [980, 600, 'white'], [1240, 820, 'pink'], [860, 880, 'blue']];
    const crab = { x: 840, y: 1030 }, gull = [JETTY.head[1] - 1, JETTY.head[2] - 10];
    const critters = [
      { name: 'hen_0', y: 866, box: [1376, 852, 34, 16], draw: (ctx, t) => { const q = K.henState(t, 0, false); K.drawSpriteAt(ctx, K.spr['hen_' + q.pose], 1392 + q.dx, 866, q.dir); } },
      { name: 'hen_1', y: 872, box: [1404, 858, 34, 16], draw: (ctx, t) => { const q = K.henState(t, 1, false); K.drawSpriteAt(ctx, K.spr['hen_' + q.pose], 1426 - q.dx, 872, q.dir); } },
      { name: 'chick', y: 874, box: [1404, 864, 18, 12], draw: (ctx, t) => { const q = K.henState(t + 1.5, 2, false); K.drawSpriteAt(ctx, K.spr[q.pose === 'peck' ? 'chick_peck' : 'chick_stand'], 1410 + (q.dx >> 1), 874, q.dir); } },
      { name: 'cat', y: 494, box: [652, 478, 18, 18], draw: (ctx, t) => { const f = [0, 1, 2, 1, 0, 0, 0, 0, 0, 0][step(t, 6) % 10], bl = (t % 4) < 0.18 ? 1 : 0; K.drawSpriteAt(ctx, K.spr[`cat_${f}_${bl}`], 660, 494, 1); } },
      { name: 'crab', y: crab.y, box: [crab.x - 24, crab.y - 6, 48, 8], draw: (ctx, t) => { const a = t % 12, dx = a < 3 ? Math.floor(a * 6) : a < 6 ? 18 : a < 9 ? 18 - Math.floor((a - 6) * 6) : 0; S(ctx, crab.x - 2 + dx - 9, crab.y - 4, CRAB[step(t, 6) % 2], { r: 'red', k: 'ink' }); } },
      { name: 'gull', y: gull[1] + 4, box: [gull[0] - 4, gull[1] - 6, 10, 10], draw: (ctx, t) => S(ctx, gull[0] - 3, gull[1] - 5, GULL[(step(t, 3) % 12) < 2 ? 2 : 0], { w: 'white', k: 'ink', o: 'orange', g: 'stone1' }) },
    ];
    fireSpots.forEach(([x, y], i) => lights.push({ name: 'firefly_' + i, y: y + 8, box: [x - 2, y - 3, 6, 5], draw: (ctx, t) => firefly(ctx, t, [x, y], i) }));
    const day = flies.map(([x, y, c], i) => ({ name: 'butterfly_' + i, y: y + 12, day: true, box: [x - 20, y - 10, 41, 18], draw: (ctx, t) => butterfly(ctx, t, [x, y, c], i) }));
    const chimneys = houses.flatMap(h => h.smoke || []).filter(Boolean);

    // For the exporter: every depth-sorted entry in draw order with the world box it can ever touch, plus the
    // data its walk mask comes from.
    for (const l of lights) l.light = true;
    const entries = [...props, ...critters, ...lights, ...day].sort((a, b) => a.y - b.y), pad = 0;
    const byName = new Map(entries.map(e => [e.name, e]));
    if (byName.size !== entries.length) throw new Error('bellwood: duplicate entry names');
    const bake = {
      items: entries.map(e => ({ name: e.name, x: e.x, y: e.y, box: e.box || [e.ox - pad, e.oy - pad, e.w + 2 * pad, e.h + 2 * pad], animated: !e.img && !e.still, light: !!e.light, day: !!e.day, foot: e.foot ?? 4, base: e.base })),
      water, onDeck, onCliff, onSteps, onHillFace, onHillSteps, onRails, onPlatformFace, onHillSide, inForest, inGarden, inWheat, gardenGate: [1258, 1280, gy1],
    };

    function draw(ctx, view, actors = []) {
      const st0 = view.state || {}, still = !!st0.still, t = still ? 0 : Math.max(0, +view.t || 0);
      // Exporter opt-in: state.part 'below' | 'item' | 'above' draws only what lies under the depth-sorted entries,
      // the one entry named state.item (see scene.bake), or the air above them. Without it, everything is drawn,
      // lights included when state.lights is set.
      const part = st0.part, below = !part || part === 'below', above = !part || part === 'above', one = part === 'item' && byName.get(st0.item);
      const vx = view.x, vy = view.y, x1 = vx + view.w, y1 = vy + view.h;
      if (below) {
        ctx.drawImage(ground, vx, vy, view.w, view.h, vx, vy, view.w, view.h);
        waterLife(ctx, t, view);
        lilyPads(lily, ctx, t); reeds(reedList, ctx, t);
        groundLife(ctx, t, view, tuftSpots, nodSpots); wheat(ctx, t, view);
      }
      const list = [];
      if (!part) {
        for (const p of props) if (p.ox < x1 && p.ox + p.w > vx && p.oy < y1 && p.oy + p.h > vy) list.push(p);
        list.push(...critters, ...(st0.lights ? lights : day));
        for (const a of actors) list.push({ y: a.y, actor: a });
        list.sort((a, b) => a.y - b.y);
      }
      for (const it of one ? [one] : list) {
        if (it.actor) { it.actor.draw(ctx); continue; }
        if (it.draw) { it.draw(ctx, t); continue; }
        ctx.drawImage(it.frames ? it.frames[still ? 0 : it.pick(t)] : it.img, it.ox, it.oy);
      }
      if (above) { smoke(ctx, t, chimneys); leaves(ctx, t, trees); birds(ctx, t, view); }
    }
    return { w: W, h: H, bg: P.leaf5, anchors: A, paths: Object.fromEntries(PATHS_SAND.map(([pts], i) => ['path_' + i, pts.map(([x, y]) => [Math.min(x, W - 12), y])])), draw, bake, ground };
  }

  window.BELLWOOD = { createWorld, W, H };
})();
