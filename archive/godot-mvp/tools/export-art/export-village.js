'use strict';
/* Bellwood village -> places/village/dusk/ and places/village/walk.png.
   Renders presentation/world.js through its exporter opt-in: view.state.part draws only the layer below the
   depth-sorted entries, one entry, or the air above them, and scene.bake lists the entries and the walk-mask data. */
(() => {
  PARTS.village = () => {
    const V = WORLD.createVillage(), W = V.w, H = V.h;
    // Dusk as the presentation's journey ends: the shop fully there and every window lit. The shop's lanterns stay
    // off in the shop item; each lit lantern glow is its own item (shop_lantern_0..6), since one goes out per night.
    const DUSK = { tod: 1, shop: 1, windows: 1 };
    const draw = (g, t, more) => V.draw(g, { x: 0, y: 0, w: W, h: H, t, state: { ...DUSK, ...more } });
    const CELL = 8; // animated tiles: 8 px keeps the flowing water's many frames small (16 px needs 2.5x the atlas)
    const below = BAKE.layer(W, H, (g, t) => draw(g, t, { part: 'below' }), { cell: CELL });
    const above = BAKE.layer(W, H, (g, t) => draw(g, t, { part: 'above' }), { cell: CELL });
    const items = V.bake.items.map(it => ({
      name: it.name, y: it.y,
      track: BAKE.item((g, t) => draw(g, t, { part: 'item', item: it.name }), it.box, { n: it.animated ? BAKE.N : 1 }),
    }));
    const sign = V.bake.items.find(it => it.name === 'signpost');
    BAKE.place('village', 'dusk', {
      size: [W, H], bg: V.bg, below, above, items, anchors: V.anchors, paths: V.paths,
      extra: { signpost: [sign.x, sign.y] }, // the bottom-left exit is the road to the old station
    });
    const walk = walkMask(V, items);
    BAKE.png('places/village/walk.png', walk.canvas);
    if (walk.missing.length) throw new Error('village walk mask: not walkable or not connected: ' + walk.missing.join(', '));
  };

  /* Walk mask: opaque white where a character's feet may stand, opaque black elsewhere. It comes from the village's
     own data and art: water, the waterfall ledge, the terrace walls and stair cheeks, and each prop's footprint (its
     lowest pixels; roofs and canopies above never block). Solids grow by the room an ant's feet need: 8 px sideways
     (its legs span about 14 px) and 3 px in front and behind, where depth sorting already keeps its body in front of
     or behind the prop. Rows above the shop door are off-limits. Only what arrivalStart can reach is kept, and every
     path and every spot a character walks to must be in it. */
  function walkMask(V, items) {
    const W = V.w, H = V.h, { water, TER, ST, BR, ledge } = V.bake, A = V.anchors, top = A.shopDoor[1];
    const solid = new Uint8Array(W * H), at = (x, y) => y * W + x, inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const fill = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x, y)) solid[at(x, y)] = 1; };
    const onDeck = (x, y) => x >= BR.x0 && x <= BR.x1 && y >= BR.y0 && y <= BR.y1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((water[at(x, y)] && !onDeck(x, y)) || ledge(x, y)) solid[at(x, y)] = 1;
    const wallBot = TER.front + TER.wallH;
    fill(TER.x0, TER.front, ST.x0 - 1, wallBot); fill(ST.x1, TER.front, TER.x1, wallBot); // terrace front wall, open at the stairs
    fill(TER.x0, top, TER.x0, wallBot); fill(TER.x1, top, TER.x1, wallBot);             // its sides: the stairs are the only way up
    fill(ST.x0 - 6, ST.top - 4, ST.x0 - 1, ST.bot - 1); fill(ST.x1, ST.top - 4, ST.x1 + 5, ST.bot - 1); // stair cheek walls
    // Prop footprints: a prop's pixels in its lowest 5 rows (a track is cropped to what was drawn, so its last row is
    // the prop's lowest), the well's whole rim, and a house's walls from its base back about their height (not the step).
    const house = /^(bakery|tailor|cottage)$/;
    for (const { name, y, track } of items) {
      if (!track || /^(shop|hen_|chick$|cat$)/.test(name)) continue; // the shop's forecourt stays open; critters and glows never block
      const [ax, ay] = track.at, [w, h] = track.size, bot = house.test(name) ? y - 1 : ay + h - 1;
      const y0 = bot - (house.test(name) ? 38 : name === 'well' ? 14 : 4);
      for (const im of track.frames) for (let j = Math.max(0, y0 - ay); j <= bot - ay; j++) for (let i = 0; i < w; i++)
        if (im.data[(j * w + i) * 4 + 3] && inside(ax + i, ay + j)) solid[at(ax + i, ay + j)] = 1;
    }
    // Grow every solid edge pixel by the clearance ellipse; what is left below the top line is open.
    const RX = 8, RY = 3, ring = [], side = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let dy = -RY; dy <= RY; dy++) for (let dx = -RX; dx <= RX; dx++) if ((dx / RX) ** 2 + (dy / RY) ** 2 <= 1) ring.push([dx, dy]);
    const blocked = solid.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!solid[at(x, y)] || side.every(([dx, dy]) => !inside(x + dx, y + dy) || solid[at(x + dx, y + dy)])) continue;
      for (const [dx, dy] of ring) if (inside(x + dx, y + dy)) blocked[at(x + dx, y + dy)] = 1;
    }
    const open = (x, y) => y >= top && y < H - 2 && x >= RX && x < W - RX && !blocked[at(x, y)];
    // Keep the region reachable from arrivalStart (4-connected flood fill).
    const walk = new Uint8Array(W * H), stack = [A.arrivalStart];
    while (stack.length) {
      const [x, y] = stack.pop();
      if (!inside(x, y) || walk[at(x, y)] || !open(x, y)) continue;
      walk[at(x, y)] = 1; stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    // Required: every path, the anchors a character walks to, and the spot in front of the bench (its anchor is the seat).
    const missing = [], ok = (x, y) => walk[at(Math.round(x), Math.round(y))] === 1;
    for (const [name, pts] of Object.entries(V.paths)) for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let s = 0; s <= n; s++) if (!ok(x0 + ((x1 - x0) * s) / n, y0 + ((y1 - y0) * s) / n)) { missing.push(`path ${name} near ${pts[k]}`); break; }
    }
    for (const k of ['shopDoor', 'stairsTop', 'stairsBottom', 'square', 'well', 'bakeryDoor', 'tailorDoor', 'stall', 'bridge', 'arrivalStart', 'cottageDoor'])
      if (!ok(...A[k])) missing.push(k);
    if (![...Array(12).keys()].some(d => ok(A.bench[0], A.bench[1] + d))) missing.push('bench');
    const [canvas, g] = BAKE.canvas(W, H), im = g.createImageData(W, H), px = new Uint32Array(im.data.buffer);
    for (let i = 0; i < W * H; i++) px[i] = walk[i] ? 0xffffffff : 0xff000000;
    g.putImageData(im, 0, 0);
    return { canvas, missing };
  }
})();
