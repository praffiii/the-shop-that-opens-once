'use strict';
/* The West of Bellwood: the old gate, stopped in time. Grey stone, rust-brown iron, deep moss and dark bark, with
   brass and Helen's rose for accents. It is drawn at its final size and place in the world's frame (the world's
   north-west corner); while it is reviewed, it is the whole playable world (design: 2026-10-18 overhaul).

   The tunnel hill in the north-west, the rails curving out of it past the station and its platform, Helen's tea
   kiosk on the platform and her stump cottage beyond it, the cooper by the walnut house, the rail yard with the old
   locomotive, Kapten Bram's wagon home, Mender's forge and acorn house, and the great banyan in its dell, reached by
   stone steps. The river runs down the east side, crossed by the foot bridge; the rail bridge is a broken stub.

   window.WEST.create() returns the world in the form export-world.js bakes:
   { w, h, bg, ground: canvas, clips: { name: { w, h, draw(g, t) } }, decals: { below: [[clip, x, y, offset]] },
     items: [{ name, y, box, draw(g, t), animated, light, day, foot, base, walk }], anchors, paths, blocked(x, y) }
   Everything is drawn at midday and every motion repeats within the 24 s loop. */
(() => {
  const K = KIT, A = ANT, F = FLORA, { Buf, u32, vnoise, scatter, lineDist, hash } = K, rng = PX.rng;
  const W = 1560, H = 1800, idx = (x, y) => y * W + x, inW = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const TAU = Math.PI * 2;

  /* ---------- layout (art px; y is the feet line) ---------- */
  const RIVER = [[1424, -30, 44], [1404, 200, 46], [1440, 420, 48], [1404, 640, 50], [1432, 860, 50], [1458, 1000, 52], [1424, 1250, 52], [1452, 1500, 50], [1434, 1830, 50]];
  const HILL = [[-10, 110], [210, 110], [286, 170], [300, 300], [268, 392], [180, 418], [-10, 424]];      // the tunnel hill's top (level 1)
  const DELL = [[392, 1110], [560, 1086], [720, 1080], [900, 1096], [1030, 1140], [1066, 1300], [1010, 1500], [840, 1572], [620, 1578], [440, 1500], [366, 1320]]; // the banyan's dell (level -1)
  const FACE = 40;                                                                                     // rock face height per level
  const PORTAL = [150, 424 + FACE];                                                                    // the tunnel mouth's foot centre
  const STEPS = [[686, 724, 1080, 1124]];                                                              // [x0, x1, y0, y1] cut into faces
  const PLATFORM = { x0: 440, x1: 1084, y0: 604, y1: 668, face: 6 };
  const MAIN = [[150, PORTAL[1] - 6], [150, 540], [164, 610], [214, 668], [290, 690], [1388, 690]];   // the main line's centre
  const SIDING = [[996, 690], [940, 712], [870, 744], [800, 760], [196, 760]];
  const BRIDGE = { x0: 1366, x1: 1516, y0: 986, y1: 1014 };                                             // the foot bridge's deck
  const POND = { cx: 760, cy: 282, rx: 74, ry: 34 };
  const WOOD_POND = { cx: 196, cy: 1300, rx: 58, ry: 28 };
  // Paths: polylines with a half width.
  const PATHS = {
    main: [[[1560, 1000], [1360, 1000], [1250, 994], [1150, 990], [960, 994], [820, 1020], [744, 1060], [705, 1080], [705, 1140], [700, 1240], [806, 1310], [800, 1440], [700, 1440]], 13],
    crossing: [[[1146, 990], [1140, 860], [1136, 700], [1100, 650]], 10],
    helen: [[[890, 640], [892, 560], [900, 500], [1000, 480], [1084, 482]], 9],
    north: [[[892, 520], [860, 420], [820, 330]], 8],
    west: [[[480, 650], [470, 560], [430, 486], [380, 480]], 9],
    yard: [[[960, 994], [800, 930], [600, 880], [400, 900], [340, 944]], 10],
    woods: [[[340, 944], [290, 1000], [232, 1050], [216, 1180], [208, 1260]], 8],
    meadow: [[[1250, 994], [1230, 1120], [1260, 1260], [1330, 1420]], 8],
    shed: [[[480, 650], [400, 626], [310, 616]], 8],
  };
  const forestN = x => 150 + 34 * vnoise(x / 80, 0, 3) + 14 * vnoise(x / 23, 1, 4) - (x > 600 && x < 960 ? 50 : 0);   // the north forest's edge
  const forestS = x => 1640 + 30 * vnoise(x / 70, 3, 5);
  const forestW = y => (y > 470 && y < 1060 ? 118 + 16 * vnoise(y / 40, 7, 6) : -1);                         // the strip west of the rails
  const woodsSW = (x, y) => x < 372 && y > 1010 && Math.hypot((x - WOOD_POND.cx) / 1.6, y - WOOD_POND.cy) > 76 + 10 * vnoise(x / 20, y / 20, 8) && !(lineDist(x, y, [[340, 944], [290, 1000], [232, 1050], [216, 1180], [208, 1250]])[0] < 26);
  const meadow = (x, y) => vnoise(x / 150, y / 130, 501) > 0.6, grove = (x, y) => vnoise(x / 110, y / 110, 502) > 0.68;
  const eastBank = (x, y) => x > 1500 && !(y > 976 && y < 1024);

  /* ---------- geometry helpers ---------- */
  const inPoly = A.inPoly;
  const inHill = inPoly(HILL), inDell = inPoly(DELL);
  const level = (x, y) => (inHill(x, y) ? 1 : inDell(x, y) ? -1 : 0);
  const halfW = (pts, i, t) => pts[i][2] + (pts[i + 1][2] - pts[i][2]) * t;
  function riverD(x, y) {
    if (x < 1300) return 99;
    const [d, i, t] = lineDist(x, y, RIVER);
    return d - halfW(RIVER, i, t) - (vnoise(x / 9, y / 9, 5) - 0.5) * 4;
  }
  const inEllipse = (e, x, y, wob = 0) => ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 < 1 - wob;
  const PATHBOX = Object.values(PATHS).map(([pts, hw]) => {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), m = hw + 160;   // beyond it every caller reads "far" (the widest footprint is ~150)
    return [pts, hw, Math.min(...xs) - m, Math.max(...xs) + m, Math.min(...ys) - m, Math.max(...ys) + m];
  });
  function pathD(x, y) {
    let d = 99;
    for (const [pts, hw, x0, x1, y0, y1] of PATHBOX) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) d = Math.min(d, lineDist(x, y, pts)[0] - hw);
    return d > 6 ? d : d + (vnoise(x / 7, y / 6, 11) - 0.5) * 4;
  }
  const onPlatform = (x, y) => x >= PLATFORM.x0 && x < PLATFORM.x1 && y >= PLATFORM.y0 && y < PLATFORM.y1;
  const onPlatformFace = (x, y) => x >= PLATFORM.x0 && x < PLATFORM.x1 && y >= PLATFORM.y1 && y < PLATFORM.y1 + PLATFORM.face && !(x >= PLATFORM.x1 - 26);
  const onBridge = (x, y) => x >= BRIDGE.x0 && x < BRIDGE.x1 && y >= BRIDGE.y0 && y < BRIDGE.y1;
  const railD = (x, y) => Math.min(lineDist(x, y, MAIN)[0], x < 1010 && y > 680 && y < 780 ? lineDist(x, y, SIDING)[0] : 99);
  const onSteps = (x, y) => STEPS.some(([x0, x1, y0, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1);

  /* ---------- the material map ---------- */
  const G = { grass: 0, path: 1, pave: 2, ballast: 3, water: 4, face: 5, forest: 6, yard: 7, dell: 8, steps: 9, deck: 10, hilltop: 11, pond: 12, rim: 13 };
  const MAT = new Uint8Array(W * H), FACEV = new Uint8Array(W * H), RIMV = new Int8Array(W * H);   // RIMV: -3..-1 west side, 1..3 east side, 4..6 south lip     // FACEV: row within a rock face (1..FACE*2)
  function buildMap() {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y), lv = level(x, y);
      let m = G.grass;
      if (lv === 1) m = G.hilltop;
      else if (y < forestN(x) || y > forestS(x) || x < forestW(y) || woodsSW(x, y) || eastBank(x, y)) m = G.forest;
      else if (onBridge(x, y)) m = G.deck;
      else if (riverD(x, y) < 0) m = G.water;
      else if (inEllipse(POND, x, y, (vnoise(x / 9, y / 7, 21) - 0.5) * 0.2) || inEllipse(WOOD_POND, x, y, (vnoise(x / 9, y / 7, 22) - 0.5) * 0.2)) m = G.pond;
      else if (onPlatform(x, y)) m = G.pave;
      else if (railD(x, y) < 13) m = G.ballast;
      else if (x > 870 && x < 1160 && y > 900 && y < 996 && pathD(x, y) > 0) m = G.yard;
      else if (pathD(x, y) < 0) m = G.path;
      else if (lv === -1) m = G.dell;
      MAT[i] = m;
    }
    // rock faces: below every drop in level, FACE rows per level, over whatever lies there
    for (let x = 0; x < W; x++) {
      let left = 0, row = 0;
      for (let y = 1; y < H; y++) {
        const a = level(x, y - 1), b = level(x, y);
        if (b < a) { left = FACE * (a - b); row = 0; }
        if (left > 0) { const i = idx(x, y); FACEV[i] = ++row; MAT[i] = onSteps(x, y) ? G.steps : G.face; left--; }
      }
    }
    // rims: a low pixel beside higher ground is a side wall; a high pixel below lower ground is a lip
    for (let y = 3; y < H; y++) for (let x = 3; x < W - 3; x++) {
      const i = idx(x, y); if (FACEV[i] || MAT[i] === G.forest) continue;
      const lv = level(x, y);
      for (let k = 1; k <= 3 && !RIMV[i]; k++) {
        if (level(x - k, y) > lv && !FACEV[idx(x - k, y)]) RIMV[i] = -k;
        else if (level(x + k, y) > lv && !FACEV[idx(x + k, y)]) RIMV[i] = k;
        else if (level(x, y - k) < lv) RIMV[i] = 3 + k;
      }
      if (RIMV[i]) MAT[i] = G.rim;
    }
  }
  const mat = (x, y) => (inW(x, y) ? MAT[idx(x | 0, y | 0)] : G.forest);
  const is = (x, y, ...ms) => ms.includes(mat(x, y));
  // Where feet may not go (the walk mask adds the props' footprints).
  const blocked = (x, y) => is(x, y, G.forest, G.water, G.face, G.hilltop, G.pond, G.rim) || onPlatformFace(x, y);

  /* ---------- painting the ground ---------- */
  const GR = ['#e7f59a', '#b6e36b', '#86cc55', '#5aac4c', '#3d8a4a', '#2c6448'].map(K.hex);
  const DELLG = ['#c9ecb0', '#97d39a', '#6fb98a', '#4f9a7c', '#3a7a6c', '#2a5a58'];
  const DIRT = ['#fff1d2', '#f5dcaa', '#e6c286', '#c99f66', '#9c774e'];
  const YARD = ['#d9c2a8', '#bfa58c', '#9c8370', '#7a6358', '#56443f'];
  const WATER = ['#f2feff', '#b3f1f5', '#6fd8ea', '#3db3e0', '#2c86c7', '#255fa3'];
  const ST = A.M.stone, DB = A.M.darkBark, BK = A.M.bark;
  function paintGround(b) {
    const rnd = rng(5);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y), m = MAT[i];
      let c;
      switch (m) {
        case G.grass: case G.dell: {
          const P = m === G.dell ? DELLG : GR, n = vnoise(x / 26, y / 15, 23) * 0.7 + vnoise(x / 6, y / 5, 24) * 0.3;
          c = n > 0.66 ? P[n > 0.78 ? 0 : 1] : n < 0.24 ? P[3] : P[2]; break;
        }
        case G.path: { const n = vnoise(x / 9, y / 7, 31); c = n > 0.7 ? DIRT[0] : n < 0.25 ? DIRT[2] : DIRT[1]; break; }
        case G.yard: { const n = vnoise(x / 7, y / 6, 32); c = n > 0.68 ? YARD[0] : n < 0.3 ? YARD[2] : YARD[1]; break; }
        case G.ballast: { const n = hash(x >> 1, y >> 1, 33); c = n < 0.3 ? ST[1] : n < 0.7 ? ST[2] : ST[3]; break; }
        case G.forest: case G.hilltop: { const n = vnoise(x / 8, y / 6, 34); c = n > 0.55 ? '#347647' : '#255443'; break; }
        case G.water: case G.pond: c = WATER[3]; break;
        default: c = GR[2];
      }
      b.d[i] = u32(c);
    }
    // no lone pixels on grass
    for (let pass = 0; pass < 2; pass++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = idx(x, y), v = b.d[i];
      if (MAT[i] !== G.grass && MAT[i] !== G.dell) continue;
      const same = (b.d[i - 1] === v) + (b.d[i + 1] === v) + (b.d[i - W] === v) + (b.d[i + W] === v);
      if (same <= 1) b.d[i] = b.d[i - 1];
    }
    paintWater(b); paintPaths(b); paintPlatform(b); paintRails(b); paintFaces(b); paintBridge(b);
  }
  function paintWater(b) {
    const water = (x, y) => is(x, y, G.water, G.pond);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!water(x, y)) continue;
      const pond = is(x, y, G.pond), d = pond ? 99 : -riverD(x, y), n = vnoise(x / 8, y / 9, 61);
      let c = pond ? (n > 0.5 ? WATER[3] : WATER[4]) : d > 22 + n * 10 ? WATER[4] : WATER[3];
      if (!water(x - 2, y) || !water(x + 2, y) || !water(x, y - 2)) c = WATER[2];
      if (!water(x - 1, y) || !water(x + 1, y) || !water(x, y - 1)) c = WATER[1];
      b.set(x, y, c);
    }
    // banks: a dark lip on the land, stones where they lie
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (water(x, y) || is(x, y, G.forest, G.deck, G.face)) continue;
      if (water(x + 1, y) || water(x - 1, y) || water(x, y + 1)) b.set(x, y, GR[4]);
      else if (water(x + 2, y) || water(x - 2, y) || water(x, y + 2)) b.set(x, y, GR[3]);
    }
    for (const [x, y, q] of scatter(64, 10, [300, 0, W - 300, H], (x, y) => !water(x, y) && (water(x + 3, y) || water(x - 3, y)) && !is(x, y, G.forest, G.deck))) if (q < 0.5) K.stone(b, x, y, 2 + (q > 0.2 ? 1 : 0), 2, K.STONES[3], GR[4]);
  }
  function paintPaths(b) {
    // a darker rim where path meets grass, a lit lip below it, and pebbles
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const m = mat(x, y);
      if (m !== G.path && m !== G.yard) continue;
      const P = m === G.path ? DIRT : YARD;
      if (!is(x, y - 1, m) && is(x, y - 1, G.grass, G.dell)) b.set(x, y, P[2]);
      else if (!is(x - 1, y, m, G.path, G.yard) || !is(x + 1, y, m, G.path, G.yard)) b.set(x, y, P[2]);
    }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!is(x, y, G.grass, G.dell)) continue;
      if (is(x, y + 1, G.path, G.yard)) b.set(x, y, GR[4]);
      else if (is(x, y - 1, G.path, G.yard)) b.set(x, y, GR[1]);
    }
    for (const [x, y, q] of scatter(71, 9, [0, 0, W, H], (x, y) => is(x, y, G.path) && is(x + 3, y, G.path) && is(x, y - 2, G.path) && is(x, y + 2, G.path))) {
      if (q < 0.3) K.stone(b, x, y, 2, 1, K.STONES[q < 0.15 ? 0 : 3], DIRT[3]);
      else if (q < 0.6) { b.set(x, y, DIRT[0]); b.set(x + 1, y, DIRT[0]); b.set(x + 2, y + 1, DIRT[2]); }
    }
    for (const [x, y, q] of scatter(72, 7, [860, 880, 320, 130], (x, y) => is(x, y, G.yard) && is(x + 3, y + 2, G.yard))) {
      if (q < 0.35) { b.set(x, y, '#3d2a2e'); b.set(x + 1, y, '#56443f'); }                     // soot and filings
      else if (q < 0.5) { b.set(x, y, '#aab3c5'); }
    }
  }
  function paintPlatform(b) {
    const { x0, x1, y0, y1, face } = PLATFORM, r = rng(91), P = [['#f4f3f7', '#d9d8e6', '#b3b3cb'], ['#e2d8cc', '#c4b6a8', '#9c8d86'], ['#d9d8e6', '#b3b3cb', '#8b8aa8']];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) b.set(x, y, '#9c8d86');
    for (let y = y0 + 1, row = 0; y < y1 - 6; y += 9, row++) for (let x = x0 + 1 - (row % 2) * 7; x < x1; x += 14) {
      const w = 13, h = 8, p = P[(r() * 3) | 0];
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const px = x + i, py = y + j; if (px < x0 || px >= x1) continue; b.set(px, py, j === h - 1 || i === w - 1 ? p[2] : j === 0 || i === 0 ? p[0] : p[1]); }
      if (r() < 0.12) for (let k = 0; k < 4; k++) b.set(x + 3 + k, y + 2 + (k >> 1), A.M.moss[2 + (k & 1)]);    // moss in a crack
    }
    // the kerb along the edge, a pale safety line, and the face down to the track bed
    for (let x = x0; x < x1; x++) {
      for (let j = 0; j < 6; j++) b.set(x, y1 - 6 + j, j === 0 ? '#f4f3f7' : j === 1 ? '#fff0b3' : j < 4 ? '#d9d8e6' : '#b3b3cb');
      if (!onPlatformFace(x, y1)) continue;
      for (let j = 0; j < face; j++) b.set(x, y1 + j, j === 0 ? '#8b8aa8' : j === face - 1 ? '#46425a' : (x + (j > 2 ? 4 : 0)) % 9 === 0 ? '#65627f' : '#8b8aa8');
    }
    for (let y = y0; y < y1; y++) { b.set(x0, y, '#8b8aa8'); b.set(x1 - 1, y, '#65627f'); }
    // the east ramp down to the crossing
    for (let y = y1; y < y1 + face + 6; y++) for (let x = x1 - 26; x < x1; x++) b.set(x, y, (y - y1) % 3 === 0 ? '#b3b3cb' : '#d9d8e6');
  }
  function paintRails(b) {
    const track = (pts, x0, x1) => {
      // sleepers every 9 px along the line, then two rails 14 px apart
      let acc = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L;
        for (let s = 0; s < L; s++, acc++) {
          const cx = ax + ux * s, cy = ay + uy * s;
          if (cx < x0 || cx > x1) continue;
          if (acc % 9 < 4) for (let k = -11; k <= 11; k++) { const px = Math.round(cx - uy * k), py = Math.round(cy + ux * k), mossy = hash(acc >> 3, k >> 2, 7) < 0.25; b.set(px, py, mossy ? A.M.moss[acc % 9 === 0 ? 2 : 3] : acc % 9 === 0 ? BK[1] : acc % 9 === 3 ? BK[4] : BK[2]); }
          for (const k of [-7, 7]) { const px = Math.round(cx - uy * k), py = Math.round(cy + ux * k); b.set(px, py, '#aab3c5'); b.set(Math.round(cx - uy * (k + 1)), Math.round(cy + ux * (k + 1)), A.M.rust[2]); }
        }
      }
    };
    track(MAIN, 0, 1388); track(SIDING, 196, 1000);
    // the buffer at the siding's end: a log across the rails
    for (let y = 750; y < 772; y++) for (let x = 188; x < 196; x++) b.set(x, y, x === 188 ? BK[1] : x === 195 ? BK[4] : BK[2]);
  }
  // Grey rock faces in layers: lit ledges, shaded lips, cracks and a mossy top; steps cut into them.
  function paintFaces(b) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y), v = FACEV[i]; if (!v) continue;
      if (MAT[i] === G.steps) { const s = (v + 60) % 7; b.set(x, y, s === 0 ? ST[0] : s < 3 ? ST[1] : s < 6 ? ST[2] : ST[3]); continue; }
      const w = v + 5 * (vnoise(x / 21, 0, 81) - 0.5), layer = Math.max(0, Math.min(2, Math.floor((w / FACE) * 3))), lv = w - (layer * FACE) / 3;
      let c = layer === 1 ? ST[3] : ST[2];
      if (lv < 2) c = ST[1]; else if (lv > FACE / 3 - 2) c = ST[4];
      if (v <= 2) c = v === 1 ? A.M.moss[2] : A.M.moss[3];
      if (v >= FACE - 1 && !FACEV[idx(x, Math.min(H - 1, y + 1))]) c = ST[5];
      if (hash(x >> 2, (v / 6) | 0, 82) < 0.06 && v > 3) c = ST[4];
      b.set(x, y, c);
    }
    // boulders on the faces and moss runs hanging down
    for (const [x, y, q] of scatter(83, 24, [0, 0, W, H], (x, y) => FACEV[idx(x, y)] > 6 && FACEV[idx(x, y)] < FACE - 6 && MAT[idx(x, y)] === G.face)) {
      if (q > 0.6) continue;
      const rx = 5 + ((q * 12) | 0), ry = 3 + ((q * 5) | 0);
      for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) { if ((i / rx) ** 2 + (j / ry) ** 2 > 1 || MAT[idx(x + i, y + j)] !== G.face) continue; const tl = (i - 1) ** 2 / rx ** 2 + (j - 1) ** 2 / ry ** 2 > 1, br = (i + 1) ** 2 / rx ** 2 + (j + 1) ** 2 / ry ** 2 > 1; b.set(x + i, y + j, br ? ST[4] : tl ? ST[0] : ST[1]); }
    }
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
      if (FACEV[idx(x, y)] !== 1 || MAT[idx(x, y)] !== G.face || vnoise(x / 5, y, 84) < 0.6) continue;
      const n = 3 + ((vnoise(x / 3, y, 85) * 14) | 0);
      for (let j = 0; j < n; j++) if (MAT[idx(x, y + j)] === G.face) b.set(x, y + j, j === n - 1 ? A.M.moss[4] : A.M.moss[2 + (j & 1)]);
    }
    // the rims: a stone side wall lit from the left, a mossy lip on the south edge
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const r = RIMV[idx(x, y)]; if (!r) continue;
      b.set(x, y, r > 3 ? [A.M.moss[3], ST[1], ST[3]][r - 4] : Math.abs(r) === 3 ? ST[4] : r < 0 ? (r === -1 ? ST[3] : ST[2]) : r === 1 ? ST[1] : ST[2]);
    }
    // stone cheeks beside the steps
    for (const [x0, x1, y0, y1] of STEPS) for (const cx of [x0 - 4, x1]) for (let y = y0; y < y1; y++) for (let x = cx; x < cx + 4; x++) if (FACEV[idx(x, y)]) b.set(x, y, (y + 1) % 7 === 0 ? ST[4] : x === cx ? ST[1] : x === cx + 3 ? ST[3] : ST[2]);
  }
  function paintBridge(b) {
    const { x0, x1, y0, y1 } = BRIDGE;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const u = (x - x0) % 6; b.set(x, y, y === y0 || y === y1 - 1 ? BK[4] : u === 5 ? BK[4] : u === 0 ? BK[1] : (x >> 3) % 2 ? BK[2] : BK[1]); }
    for (let x = x0; x < x1; x++) { b.set(x, y1, '#255fa3'); b.set(x, y1 + 1, '#2c86c7'); }
  }

  /* ---------- clips: small loops placed many times ---------- */
  const R2 = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const CLIPS = {
    glint: { w: 7, h: 3, draw: (g, t) => { const f = Math.floor(t * 4) % 8; if (f < 3) { R2(g, 1 + f, 1, 3, 1, '#f2feff'); if (f === 1) R2(g, 3, 0, 1, 1, '#ffffff'); } } },
    flow: { w: 16, h: 2, draw: (g, t) => { const x = Math.floor(t * 8) % 16; R2(g, x, 0, 4, 1, '#b3f1f5'); if (x > 12) R2(g, 0, 0, x - 12, 1, '#b3f1f5'); } },
    ripple: { w: 12, h: 3, draw: (g, t) => { const f = Math.floor(t * 3) % 6; if (f < 4) { R2(g, 5 - f, 1, 2 + f * 2, 1, '#b3f1f5'); } } },
    tuft: { w: 7, h: 7, draw: (g, t) => { const s = [0, 0, 1, 1, 0, -1][Math.floor(t * 4 + 0) % 6]; R2(g, 1, 4, 1, 3, '#5aac4c'); R2(g, 3, 3, 1, 4, '#5aac4c'); R2(g, 5, 4, 1, 3, '#5aac4c'); R2(g, 1 + s, 2, 1, 2, '#b6e36b'); R2(g, 3 + s, 1, 1, 2, '#b6e36b'); R2(g, 5 + s, 2, 1, 2, '#86cc55'); } },
    reed: { w: 9, h: 14, draw: (g, t) => { const s = [0, 1, 1, 0, -1, -1][Math.floor(t * 3) % 6]; for (const [x, h] of [[2, 12], [5, 10], [7, 8]]) { R2(g, x, 14 - h + 4, 1, h - 4, '#57a148'); R2(g, x + s, 14 - h, 1, 4, '#a8dc63'); } R2(g, 5 + s, 3, 1, 3, '#8a5233'); } },
    daisy: { w: 5, h: 7, draw: (g, t) => { const s = Math.floor(t * 2) % 4 === 1 ? 1 : 0; R2(g, 2, 3, 1, 4, '#57a148'); R2(g, 1 + s, 0, 3, 3, '#ffffff'); R2(g, 2 + s, 1, 1, 1, '#ffe066'); } },
    buttercup: { w: 5, h: 7, draw: (g, t) => { const s = Math.floor(t * 2 + 1) % 4 === 1 ? 1 : 0; R2(g, 2, 3, 1, 4, '#57a148'); R2(g, 1 + s, 0, 3, 3, '#ffe066'); R2(g, 2 + s, 0, 1, 1, '#fff7b0'); } },
    // Mist: soft translucent wisps drifting slowly through the dell.
    mist: { w: 64, h: 7, draw: (g, t) => { const x = Math.floor(t * 2) % 64; g.globalAlpha = 0.22; for (const [dx, w, y] of [[0, 22, 2], [30, 14, 3], [46, 10, 1]]) for (const [o, r] of [[0, 0], [3, 1], [-2, 2]]) { const px = (x + dx + o + 64) % 64, ww = Math.max(4, w - r * 6); R2(g, px, y + r, Math.min(ww, 64 - px), 1, '#f1f4ff'); if (px + ww > 64) R2(g, 0, y + r, px + ww - 64, 1, '#f1f4ff'); } g.globalAlpha = 1; } },
  };

  /* ---------- the world ---------- */
  function create() {
    buildMap();
    const items = [], below = [], shadows = [], ground = [];    // ground: [y, draw(g)] baked into the ground in y order
    const add = (name, s, x, y, more = {}) => {
      const ox = x - s.ax, oy = y - s.ay, img = s.img;
      const fr = s.frames && s.frames.length > 1 ? s.frames : null, ph = hash(x, y, 1) * 8;
      items.push({ name, y, box: [ox, oy, img.width, img.height], draw: fr ? (g, t) => g.drawImage(fr[Math.floor(t * 1.25 + ph) % fr.length], ox, oy) : g => g.drawImage(img, ox, oy), animated: !!fr, foot: s.foot, base: s.half ? [x - s.half, x + s.half] : null, ...more });
      return { ox, oy };
    };
    const lit = (name, s, at, g) => { const img = K.litSprite(s.img, 0, 0, g), x = at.ox + g.gx, y = at.oy + g.gy; items.push({ name, y: at.oy + s.ay, box: [x, y, g.gw, g.gh], draw: gg => gg.drawImage(img, x, y), light: true }); };
    const shadow = (cx, cy, rx, ry) => shadows.push([cx + 3, cy + 1, rx, ry]);
    // a plant or prop: baked into the ground when nobody can ever walk behind it, an item otherwise
    const plant = (name, s, x, y) => {
      if (pathD(x, y) < footSpan(s) + 12) return;                // its footprint stays off every path
      const behind = [];
      for (let dy = 2; dy < s.img.height - (s.img.height - s.ay) && dy < 90; dy += 6) for (const dx of [-s.img.width / 3, 0, s.img.width / 3]) behind.push([x + dx, y - dy]);
      if (!(s.frames && s.frames.length > 1) && behind.every(([px, py]) => blocked(px | 0, py | 0) || !inW(px | 0, py | 0)) && blocked(x, y)) ground.push([y, g => g.drawImage(s.img, x - s.ax, y - s.ay)]);
      else add(name, s, x, y, { walk: false });
      const span = footSpan(s); shadow(x, y, Math.max(6, span), Math.max(3, Math.round(span / 6)));
    };

    /* the station, its platform and Helen's kiosk */
    const st = A.station(), stAt = add('station', st, 700, PLATFORM.y0);
    st.wins.forEach((g, i) => lit('station_window_' + i, st, stAt, g));
    shadows.push(['r', stAt.ox + 290, stAt.oy + 170, 8, 56]);
    const ts = A.teaStall(), tsX = 990, tsAt = add('tea_stall', ts, tsX, PLATFORM.y0 + 24);
    ts.wins.forEach((g, i) => lit('tea_stall_window_' + i, ts, tsAt, g)); lit('tea_stall_hatch', ts, tsAt, ts.hatch);
    items.push({ name: 'tea_steam', y: PLATFORM.y0 + 24, box: [tsAt.ox + ts.steam[0] - 10, tsAt.oy + ts.steam[1] - 40, 24, 42], animated: true, draw: (g, t) => K.smoke(g, t, [[tsAt.ox + ts.steam[0], tsAt.oy + ts.steam[1]]]) });
    for (const [x, kind] of [[540, 'lamp'], [612, 'bench'], [860, 'lamp'], [1060, 'lamp']]) {
      const y = PLATFORM.y0 + 34;
      if (kind === 'bench') add('bench', A.bench(), x, y);
      else if (kind === 'barrel') add('crate', A.clutter('crate', x), x, y);
      else { const s = A.ironLamp(), at = add('iron_lamp', s, x, y); lit('iron_lamp_light_' + x, s, at, s.glass); lampGlow(items, x, y - 52); }
    }
    add('info_board', A.signpost(['STATION', 'FORGE', 'BANYAN']), 790, PLATFORM.y0 + 18);
    add('luggage', A.clutter('sack', 3), 806, PLATFORM.y0 + 30); add('luggage', A.clutter('rope', 4), 826, PLATFORM.y0 + 32);
    const sg = A.signal(), sgAt = add('signal', sg, 1184, 672); lit('signal_light', sg, sgAt, sg.glass);

    /* Helen's home: the stump cottage with its garden */
    const hs = A.stumpHouse({ x: 1090, y: 470, name: 'helen_house', seed: 33 });
    items.push({ name: 'helen_house', y: hs.y, box: [hs.ox, hs.oy, hs.img.width, hs.img.height], draw: g => g.drawImage(hs.img, hs.ox, hs.oy), foot: hs.foot, base: hs.base });
    hs.wins.forEach((g, i) => { const img = K.litSprite(hs.img, hs.ox, hs.oy, g); items.push({ name: 'helen_house_window_' + i, y: hs.y, box: [g.gx, g.gy, g.gw, g.gh], draw: gg => gg.drawImage(img, g.gx, g.gy), light: true }); });
    shadows.push(...hs.shadow);
    for (const [x, y] of [[1010, 520], [1024, 520], [1038, 520], [1160, 520], [1174, 520]]) add('fence', A.fence(1), x, y);
    for (const [x, y, k] of [[1150, 494, 'gold'], [1000, 470, 'red']]) { const s = A.mushroomLamp({ kind: k }); add('mushroom_lamp', s, x, y); mushroomGlow(items, s, x, y); }
    for (const [x, y, s] of [[1150, 440, 1], [1180, 470, 2], [1020, 440, 3]]) plant('flowers', F.mushrooms({ seed: s, kind: s === 2 ? 'red' : 'brown', n: 3, h: 14 }), x, y);

    /* the cooper's shed and the walnut house */
    const cs = A.cooperShed(), csAt = add('cooper_shed', cs, 330, 600); cs.wins.forEach((g, i) => lit('cooper_window_' + i, cs, csAt, g));
    add('barrel', A.clutter('crate', 9), 250, 612);
    const wn = A.walnutHouse({ x: 430, y: 470, name: 'walnut_house', seed: 5 });
    items.push({ name: 'walnut_house', y: wn.y, box: [wn.ox, wn.oy, wn.img.width, wn.img.height], draw: g => g.drawImage(wn.img, wn.ox, wn.oy), foot: wn.foot, base: wn.base });
    wn.wins.forEach((g, i) => { const img = K.litSprite(wn.img, wn.ox, wn.oy, g); items.push({ name: 'walnut_window_' + i, y: wn.y, box: [g.gx, g.gy, g.gw, g.gh], draw: gg => gg.drawImage(img, g.gx, g.gy), light: true }); });
    shadows.push(...wn.shadow);

    /* the rail yard: the old locomotive, its wagons, the water tower, Kapten Bram's wagon home */
    add('locomotive', A.locomotive(), 500, 776); add('wagon', A.wagon(), 690, 776); add('wagon', A.wagon({ kind: 'cover' }), 820, 776);
    add('water_tower', A.waterTower(), 390, 836); shadow(390, 836, 26, 5);
    const bh = A.wagonHome(), bhAt = add('bram_home', bh, 240, 920); bh.wins.forEach((g, i) => lit('bram_window_' + i, bh, bhAt, g));
    smokeFrom(items, 'bram_smoke', bhAt.ox + bh.chimney[0], bhAt.oy + bh.chimney[1], 920);
    add('bench', A.bench(), 410, 966); add('rope', A.clutter('rope', 2), 160, 942); add('twigs', A.clutter('twigs', 5), 150, 966);
    { const s = A.ironLamp(), at = add('iron_lamp', s, 120, 936); lit('bram_lamp', s, at, s.glass); lampGlow(items, 120, 884); }

    /* Mender's forge and acorn house */
    const fg = A.forge(), fgAt = add('forge', fg, 1010, 904); fg.wins.forEach((g, i) => lit('forge_window_' + i, fg, fgAt, g)); lit('forge_hearth', fg, fgAt, fg.hearth);
    smokeFrom(items, 'forge_smoke', fgAt.ox + fg.chimney[0], fgAt.oy + fg.chimney[1], 904);
    items.push({ name: 'forge_sparks', y: 905, box: [fgAt.ox + 70, fgAt.oy + 100, 40, 60], animated: true, draw: (g, t) => sparks(g, t, fgAt.ox + 86, fgAt.oy + 140) });
    add('anvil', A.anvil(), 960, 950); add('scrap', A.scrap(3), 1100, 940); add('barrel', A.clutter('crate', 6), 900, 930); add('pebbles', A.clutter('pebbles', 2), 1060, 966);
    const ah = A.acornHouse(), ahAt = add('mender_house', ah, 1250, 908); ah.wins.forEach((g, i) => lit('mender_window_' + i, ah, ahAt, g));
    smokeFrom(items, 'mender_smoke', ahAt.ox + ah.chimney[0], ahAt.oy + ah.chimney[1], 908);
    add('scrap', A.scrap(9), 1320, 930);

    /* the banyan in its dell, Marlow's door, the lanterns */
    const bn = A.banyan(), bnX = 700, bnY = 1418, bnAt = add('banyan', bn, bnX, bnY);
    shadow(bnX, bnY, 90, 10);
    items.push({ name: 'shop_door', y: bnY, box: [bnX - 24, bnY - 50, 49, 60], light: true, animated: true, draw: (g, t) => A.shopDoor(g, bnX, bnY - 1, t) });
    bn.lanterns.forEach(([lx, ly], i) => { const x = bnAt.ox + lx, y = bnAt.oy + ly; items.push({ name: 'shop_lantern_' + i, y: bnY, box: [x - 8, y - 2, 17, 20], light: true, animated: true, draw: (g, t) => A.lantern(g, x, y - 8, t, true, i) }); });
    for (const [x, y, s] of [[560, 1300, 1], [860, 1290, 2], [600, 1470, 3], [830, 1480, 4], [470, 1380, 5]]) plant('mushrooms', F.mushrooms({ seed: s, kind: s % 2 ? 'lilac' : 'gold', n: 3 + (s % 2), h: 16 + s * 2 }), x, y);
    for (const [x, y, s] of [[440, 1220, 6], [980, 1230, 7], [520, 1520, 8], [920, 1520, 9]]) plant('fern', F.fern({ seed: s, size: 60 + s * 3 }), x, y);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, x = Math.round(bnX + Math.cos(a) * 200), y = Math.round(1330 + Math.sin(a) * 140); items.push({ name: 'firefly_' + i, y, box: [x - 16, y - 10, 33, 21], light: true, animated: true, walk: true, draw: (g, t) => A.firefly(g, x, y, t, i) }); }

    /* the tunnel portal and the broken rail bridge */
    portal(items, PORTAL[0], PORTAL[1]);
    railStub(items, 1392, 690);
    bridgeRails(items);

    /* plants, by area, all at ant scale: no tree fits on screen, only the feet of giant ones at the woods' edges */
    const pool = list => list.map(f => f());
    const TRUNKS = pool([() => F.giantTrunk({ seed: 2 }), () => F.giantTrunk({ seed: 5, w: 120, h: 210 }), () => F.giantTrunk({ seed: 8, w: 180, h: 250 })]);
    const UNDER = pool([
      () => F.fern({ seed: 11, size: 64 }), () => F.fern({ seed: 12, size: 48 }), () => F.horsetail({ seed: 13, h: 120 }), () => F.horsetail({ seed: 14, h: 84 }),
      () => F.mossMound({ seed: 15, rx: 30, ry: 20 }), () => F.mossMound({ seed: 16, rx: 22, ry: 15 }), () => F.blades({ seed: 17, h: 80 }), () => F.blades({ seed: 18, h: 64, tone: 'gold' }),
      () => F.mushrooms({ seed: 20, kind: 'brown', n: 3, h: 22 }), () => F.fern({ seed: 31, size: 72 }),
    ]);
    const GROVE = pool([
      () => F.horsetail({ seed: 21, h: 130 }), () => F.horsetail({ seed: 22, h: 96 }), () => F.horsetail({ seed: 23, h: 70 }), () => F.mossMound({ seed: 24, rx: 34, ry: 22 }),
      () => F.mossMound({ seed: 25, rx: 18, ry: 12 }), () => F.sprout({ seed: 26, h: 76 }), () => F.sprout({ seed: 27, h: 46 }), () => F.pebble({ seed: 28, rx: 26, ry: 16 }),
      () => F.pebble({ seed: 29, rx: 16, ry: 10, tone: 'warm' }), () => F.fern({ seed: 30, size: 56 }),
    ]);
    const pick = (list, q) => list[Math.floor(q * list.length) % list.length];
    // the woods (north band, the tunnel hill, the west strip, the south woods and band, the far bank): the feet of
    // giant trees standing apart, and thick undergrowth between them
    const woods = (x, y) => is(x, y, G.forest, G.hilltop) && pathD(x, y) > 14;
    for (const [x, y, q] of scatter(301, 96, [0, 0, W, H], (x, y) => woods(x, y) && woods(x, y - 30) && woods(x - 60, y) && woods(x + 60, y))) plant('giant_tree', pick(TRUNKS, q), x, y);
    for (const [x, y, q] of scatter(305, 24, [0, 0, W, H], (x, y) => woods(x, y) && is(x, y + 6, G.forest, G.hilltop, G.face, G.grass))) plant('undergrowth', pick(UNDER, q), x, y);
    // at the woods' edges: towering plants and undergrowth spilling into the open
    for (const [x, y, q] of scatter(302, 46, [0, 0, W, H], (x, y) => is(x, y, G.grass) && is(x, y - 14, G.forest) && pathD(x, y) > 10)) {
      if (q < 0.25) plant('clover', F.clover({ seed: x, h: Math.round(120 + q * 160), flower: q < 0.1 }), x, y);
      else if (q < 0.45) plant('dandelion', F.dandelion({ seed: x, h: Math.round(150 + q * 100), clock: q > 0.38 }), x, y);
      else plant('undergrowth', pick(UNDER, (q - 0.45) / 0.55), x, y);
    }
    // the pond's reeds and the open ground's own plants: groves of horsetail, moss and seedlings; meadows of clover
    // and dandelions; here and there a pebble, mushrooms or a tuft of blades
    for (const [x, y] of scatter(303, 22, [POND.cx - POND.rx - 10, POND.cy - POND.ry - 10, POND.rx * 2 + 20, POND.ry * 2 + 20], (x, y) => is(x, y, G.grass) && (is(x + 4, y, G.pond) || is(x - 4, y, G.pond) || is(x, y - 4, G.pond)))) plant('reeds', F.reeds({ seed: x + y }), x, y);
    for (const [x, y, q] of scatter(304, 40, [0, 0, W, H], (x, y) => is(x, y, G.grass, G.dell) && pathD(x, y) > 14 && railD(x, y) > 20 && !nearItem(items, x, y))) {
      if (grove(x, y)) plant('grove', pick(GROVE, q), x, y);
      else if (meadow(x, y)) {
        if (q < 0.45) plant('clover', F.clover({ seed: x + 1, h: Math.round(100 + q * 300), flower: q < 0.15 }), x, y);
        else if (q < 0.8) plant('dandelion', F.dandelion({ seed: x + 2, h: Math.round(140 + q * 100), clock: q > 0.7 }), x, y);
        else plant('blades', F.blades({ seed: x + 4, h: Math.round(50 + q * 30) }), x, y);
      }
      else if (q < 0.07) plant('mushrooms', F.mushrooms({ seed: x + 3, kind: ['red', 'brown', 'lilac', 'gold'][(q * 40) & 3], n: 3, h: Math.round(12 + q * 60) }), x, y);
      else if (q < 0.13) plant('pebble', pick(GROVE.slice(7, 9), q * 9), x, y);
      else if (q < 0.18) plant('blades', F.blades({ seed: x + 4, h: Math.round(50 + q * 120) }), x, y);
    }
    // the river's west bank: reeds and horsetails
    for (const [x, y, q] of scatter(306, 30, [1280, 0, 200, H], (x, y) => is(x, y, G.grass) && riverD(x + 10, y) < 0 && pathD(x, y) > 10 && !nearItem(items, x, y))) plant(q < 0.5 ? 'reeds' : 'horsetail', q < 0.5 ? F.reeds({ seed: x + y, h: 60 }) : pick(GROVE.slice(0, 3), q), x, y);

    /* decals: water glints and flow, swaying tufts, nodding flowers, mist in the dell */
    for (const [x, y, q] of scatter(401, 9, [0, 0, W, H], (x, y) => is(x, y, G.water, G.pond) && is(x + 16, y, G.water, G.pond) && is(x, y + 3, G.water, G.pond))) below.push([q < 0.45 ? 'glint' : q < 0.8 ? 'flow' : 'ripple', x, y, (q * 997) | 0]);
    for (const [x, y, q] of scatter(402, 12, [0, 0, W, H], (x, y) => is(x, y, G.grass, G.dell) && is(x + 7, y + 7, G.grass, G.dell) && pathD(x, y) > 4)) below.push([!meadow(x, y) || q < 0.5 ? 'tuft' : q < 0.75 ? 'daisy' : 'buttercup', x, y, (q * 1009) | 0]);
    for (const [x, y, q] of scatter(403, 16, [POND.cx - POND.rx - 12, POND.cy - POND.ry - 16, POND.rx * 2 + 24, POND.ry * 2 + 32], (x, y) => is(x, y + 13, G.grass) && is(x, y + 16, G.pond))) below.push(['reed', x, y, (q * 113) | 0]);
    for (const [x, y, q] of scatter(404, 34, [DELL[10][0], 1150, 700, 420], (x, y) => is(x, y, G.dell) && is(x + 64, y, G.dell))) below.push(['mist', x, y, (q * 719) | 0]);

    /* butterflies by day */
    for (const [x, y, c] of [[780, 360, ['#ffe066', '#f5a623']], [1180, 560, ['#c3a2ff', '#7ab8ff']], [300, 1050, ['#ff9fd0', '#ffffff']], [1220, 1300, ['#ffe066', '#ffffff']], [560, 520, ['#7ab8ff', '#ffffff']]])
      items.push({ name: 'butterfly', y: y + 20, box: [x - 26, y - 12, 53, 25], day: true, animated: true, walk: true, draw: (g, t) => A.butterfly(g, x, y, t, c, x) });
    // bugs at rest
    for (const [k, x, y, f] of [['snail', 836, 1010, 0], ['ladybug', 1046, 486, 1], ['beetle', 640, 1060, 0], ['cricket', 420, 712, 1], ['snail', 1200, 1210, 1], ['aphid', 1092, 526, 0], ['aphid', 1100, 528, 1]]) {
      const img = A.bugImg(k, f), s = { img, ax: img.width >> 1, ay: img.height - 1, foot: 1 }; add(k, s, x, y, { walk: true });
    }

    /* the ground image */
    const gb = new Buf(W, H); paintGround(gb);
    for (const [x, y, q, q2] of scatter(307, 70, [0, 0, W, H], (x, y) => is(x, y, G.grass, G.dell) && pathD(x, y) > 10 && railD(x, y) > 18 && !nearItem(items, x, y)))
      F.fallenLeaf(gb, x, y, { seed: x, L: Math.round(26 + q * 34), a: q2 * TAU, tone: q < 0.45 ? 'brown' : q < 0.8 ? 'autumn' : 'green' });
    const [gc, gx] = K.canvas(W, H); gx.drawImage(gb.canvas(), 0, 0);
    K.paintShadows(gx, W, H, shadows);
    ground.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => draw(gx));
    shadeWoods(gx);

    const anchors = {
      start: [660, 640], from_shop: [bnX, bnY + 14], helen: [976, 650], clock_spot: [700, 640], info_spot: [790, 640], bridge: [1440, 1000],
    };
    const paths = Object.fromEntries(Object.entries(PATHS).map(([k, [pts]]) => [k, pts.filter(([x, y]) => inW(x, y))]));
    return { w: W, h: H, bg: '#255443', ground: gc, clips: CLIPS, decals: { below }, items, anchors, paths, blocked };
  }

  // The woods lie in the shade of the giant crowns: deep and cool, one step lighter along their edge, so the open
  // ground and what stands at the edge read against them.
  function shadeWoods(g) {
    const d = g.getImageData(0, 0, W, H), p = d.data, woods = (x, y) => is(x, y, G.forest, G.hilltop), DEEP = [0.5, 0.6, 0.62], EDGE = [0.74, 0.8, 0.8];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!woods(x, y)) continue;
      const edge = !(woods(x - 8, y) && woods(x + 8, y) && woods(x, y - 8) && woods(x, y + 8)), f = edge ? EDGE : DEEP, i = idx(x, y) * 4;
      for (let k = 0; k < 3; k++) p[i + k] = Math.round(p[i + k] * f[k]);
    }
    g.putImageData(d, 0, 0);
  }

  /* ---------- small animated things ---------- */
  // How far a sprite's footprint (its opaque pixels in the bottom `foot` rows) reaches either side of its foot centre.
  const SPANS = new WeakMap();
  function footSpan(s) {
    if (SPANS.has(s.img)) return SPANS.get(s.img);
    const f = s.foot || 4, y0 = Math.max(0, s.ay - f), d = s.img.getContext('2d').getImageData(0, y0, s.img.width, s.ay - y0 + 1).data;
    let span = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i]) span = Math.max(span, Math.abs(((i >> 2) % s.img.width) - s.ax));
    SPANS.set(s.img, span); return span;
  }
  function nearItem(items, x, y) { return items.some(it => it.base && y > it.y - 50 && y < it.y + 30 && x > it.base[0] - 30 && x < it.base[1] + 30); }
  function smokeFrom(items, name, x, y, sortY) { items.push({ name, y: sortY, box: [x - 14, y - 46, 30, 48], animated: true, walk: true, draw: (g, t) => K.smoke(g, t, [[x, y]]) }); }
  function lampGlow(items, x, y) { items.push({ name: 'lamp_glow', y: y + 60, box: [x - 12, y - 6, 25, 22], light: true, walk: true, draw: g => { g.globalAlpha = 0.28; PX.ellipse(g, x, y + 4, 11, 9, '#fff0a8'); g.globalAlpha = 1; } }); }
  function mushroomGlow(items, s, x, y) {
    const gx = x - s.ax + s.glow[0], gy = y - s.ay + s.glow[1];
    items.push({ name: 'mushroom_glow', y: y + 1, box: [gx - 16, gy - 10, 33, 30], light: true, walk: true, draw: g => { g.globalAlpha = 0.3; PX.ellipse(g, gx, gy + 6, 15, 9, '#fff0a8'); g.globalAlpha = 0.55; PX.ellipse(g, gx, gy - 2, 12, 6, '#ffd86a'); g.globalAlpha = 1; } });
  }
  function sparks(g, t, x, y) {
    const f = Math.floor(t * 12);
    for (let k = 0; k < 6; k++) {
      const life = (f + k * 7) % 18; if (life > 10) continue;
      const a = hash(k, Math.floor((f + k * 7) / 18), 9), px = Math.round(x + (a - 0.5) * 30 * (life / 10)), py = Math.round(y - life * 3 + life * life * 0.25);
      g.fillStyle = life < 4 ? '#fffbe6' : life < 7 ? '#ffd86a' : '#f28c38'; g.fillRect(px, py, 1, 1);
    }
  }
  // The tunnel mouth: a stone arch in the hill's face, dark inside, its keystone carved with a leaf.
  function portal(items, cx, base) {
    const w = 64, h = 52, W2 = w + 24, H2 = h + 14, b = new Buf(W2, H2), ox = cx - (W2 >> 1), oy = base - H2 + 2, c0 = W2 >> 1, by = H2 - 2;
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const dx = x + 0.5 - c0, dy = y + 0.5 - (by - h + w / 2), r = Math.hypot(dx, Math.min(0, dy));
      const inner = Math.abs(dx) < w / 2 - 6 && (dy >= 0 || r < w / 2 - 6), outer = Math.abs(dx) < w / 2 + 6 && (dy >= 0 || r < w / 2 + 6);
      if (y > by) continue;
      if (inner) b.set(x, y, y > by - 4 ? '#3a2b28' : r > w / 2 - 9 && dy < 0 ? '#271d1d' : '#1f1a1f');
      else if (outer) { const k = Math.floor((Math.atan2(dy, dx) + Math.PI) / 0.22); b.set(x, y, dy < 0 ? (k % 2 ? ST[1] : ST[2]) : (Math.floor(y / 7) % 2 ? ST[2] : ST[3])); if (dy < 0 && Math.abs(r - (w / 2 - 6)) < 1) b.set(x, y, ST[4]); }
    }
    for (let j = 0; j < 8; j++) for (let i = -4; i <= 4; i++) b.set(c0 + i, by - h + j - 2, j === 0 ? ST[0] : Math.abs(i) === 4 ? ST[3] : ST[1]);
    b.set(c0, by - h + 2, A.M.moss[2]); b.set(c0 - 1, by - h + 3, A.M.moss[3]); b.set(c0 + 1, by - h + 3, A.M.moss[2]);
    const img = b.canvas();
    items.push({ name: 'tunnel', y: base - 1, box: [ox, oy, W2, H2], draw: g => g.drawImage(img, ox, oy), walk: true });
  }
  // The rail bridge's stub: a stone pier at the bank and a broken timber trestle reaching into the river.
  function railStub(items, x, y) {
    const W2 = 70, H2 = 60, b = new Buf(W2, H2), ox = x - 8, oy = y - 30;
    for (let j = 22; j < 60; j++) for (let i = 0; i < 18; i++) b.set(i, j, j === 22 ? ST[0] : i === 0 ? ST[1] : i === 17 ? ST[4] : (Math.floor(j / 6) + (i > 8 ? 1 : 0)) % 2 ? ST[2] : ST[3]);
    for (let i = 0; i < 52; i++) { const j = 24 + (i > 34 ? (i - 34) * 0.7 : 0); for (let k = 0; k < 5; k++) b.set(14 + i, Math.round(j) + k, k === 0 ? BK[1] : k === 4 ? BK[4] : BK[2]); }
    for (const px of [30, 48]) for (let j = 29; j < 60; j++) { b.set(px, j, BK[2]); b.set(px + 1, j, BK[3]); b.set(px + 2, j, BK[4]); }
    for (let k = 0; k < 6; k++) { b.set(62 + k, 38 + k + (k & 1), BK[3]); }
    for (const yy of [16, 30]) for (let i = 0; i < 40; i++) { b.set(i, yy - 2, '#aab3c5'); b.set(i, yy - 1, A.M.rust[2]); }
    const img = b.canvas();
    items.push({ name: 'rail_bridge', y: y + 28, box: [ox, oy, W2, H2], draw: g => g.drawImage(img, ox, oy), walk: true });
  }
  // The foot bridge's rope rails, drawn over the deck (north rail behind, south rail in front of walkers).
  function bridgeRails(items) {
    const { x0, x1, y0, y1 } = BRIDGE;
    for (const [y, name] of [[y0, 'bridge_rail_n'], [y1, 'bridge_rail_s']]) {
      const W2 = x1 - x0 + 4, b = new Buf(W2, 16);
      for (let x = 0; x < W2; x += 24) for (let j = 0; j < 14; j++) { b.set(x, j, BK[1]); b.set(x + 1, j, BK[3]); }
      for (let x = 0; x < W2; x++) { const sag = Math.round(Math.sin(((x % 24) / 24) * Math.PI) * 3); b.set(x, 3 + sag, '#e3dcd0'); b.set(x, 4 + sag, '#b8ad9c'); }
      const img = b.canvas();
      items.push({ name, y: y + (name === 'bridge_rail_s' ? 2 : 0), box: [x0 - 2, y - 14, W2, 16], draw: g => g.drawImage(img, x0 - 2, y - 14), walk: true });
    }
  }

  window.WEST = { create, W, H };
})();
